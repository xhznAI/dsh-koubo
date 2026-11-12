import { generationSchema, validateGeneration } from "./api.js";
import { z } from "zod";
//#region src/http.ts
function apiBase(value) {
	let url;
	try {
		url = new URL(value);
	} catch {
		throw new Error("请填写有效的 API 地址。");
	}
	if (url.protocol !== "https:" && !(url.protocol === "http:" && [
		"localhost",
		"127.0.0.1",
		"[::1]"
	].includes(url.hostname)) || url.username || url.password || url.search || url.hash) throw new Error("API 地址须使用 HTTPS，本机调试可使用 HTTP。");
	const path = url.pathname.replace(/\/+$/, "");
	url.pathname = `${path.endsWith("/v1") ? path : `${path}/v1`}/`;
	return url;
}
function videoUrl(value) {
	let url;
	try {
		url = new URL(value);
	} catch {
		throw new Error("视频下载地址无效。");
	}
	if (url.protocol !== "https:" || url.username || url.password) throw new Error("视频下载地址须使用 HTTPS。");
	return url;
}
async function readBounded(response, limit) {
	if (Number(response.headers.get("content-length")) > limit) {
		await response.body?.cancel();
		throw new Error("响应内容过大。");
	}
	if (!response.body) throw new Error("响应内容为空。");
	const reader = response.body.getReader();
	const chunks = [];
	let length = 0;
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			length += chunk.value.byteLength;
			if (length > limit) throw new Error("响应内容过大。");
			chunks.push(chunk.value);
		}
	} catch (error) {
		await reader.cancel().catch(() => void 0);
		throw error;
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}
async function jsonRequest(fetcher, url, key, signal, body) {
	let response;
	try {
		signal.throwIfAborted();
		response = await fetcher(url, {
			method: body ? "POST" : "GET",
			redirect: "error",
			signal: AbortSignal.any([signal, AbortSignal.timeout(6e4)]),
			headers: {
				authorization: `Bearer ${key}`,
				accept: "application/json",
				...body ? { "content-type": "application/json" } : {}
			},
			...body ? { body: JSON.stringify(body) } : {}
		});
	} catch {
		throw new Error(body ? "提交结果未知，请先在服务后台核实；不要重复生成。" : "暂时无法查询视频，请稍后查询同一任务。");
	}
	if (!response.ok) {
		await response.body?.cancel();
		throw new Error(`视频服务返回 HTTP ${response.status}。${body ? "请先核实提交结果，不要重复生成。" : "请稍后查询同一任务。"}`);
	}
	try {
		return JSON.parse(new TextDecoder().decode(await readBounded(response, 1024 * 1024)));
	} catch {
		throw new Error(body ? "提交响应无效，请先在服务后台核实；不要重复生成。" : "视频服务响应无效，请稍后查询同一任务。");
	}
}
//#endregion
//#region src/grok.ts
const GROK_MODEL = {
	id: "grok-imagine-video-1.5",
	name: "Grok Imagine Video 1.5",
	inputModes: ["text_to_video", "image_to_video"],
	nativeAudio: true,
	minSeconds: 1,
	maxSeconds: 15,
	resolutions: [
		"480p",
		"720p",
		"1080p"
	],
	aspectRatios: [
		"16:9",
		"9:16",
		"1:1",
		"4:3",
		"3:4",
		"3:2",
		"2:3",
		"21:9",
		"5:2"
	]
};
const created = z.object({ request_id: z.string().min(1).max(500) });
const polled = z.object({
	status: z.enum([
		"pending",
		"queued",
		"running",
		"done",
		"failed",
		"expired"
	]),
	video: z.object({
		url: z.string().min(1).max(8192),
		duration: z.number().positive(),
		respect_moderation: z.boolean().optional()
	}).optional()
});
function resultUrl(value, base) {
	if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) {
		const resolved = new URL(value, base);
		if (resolved.origin !== base.origin) throw new Error("视频下载地址无效。");
		return videoUrl(resolved.href).href;
	}
	return videoUrl(value).href;
}
/** 只发送官方异步协议；费用和调用统计由 API 服务端维护。 */
function createGrokSource(config, fetcher = fetch) {
	const base = apiBase(config.baseUrl), key = config.apiKey.trim();
	const ready = () => {
		if (!key) throw new Error("请先在口播插件设置中填写 Grok API Key。");
	};
	return {
		id: "grok",
		label: "Grok",
		available: Boolean(key),
		async listModels(signal) {
			signal.throwIfAborted();
			ready();
			return [structuredClone(GROK_MODEL)];
		},
		async create(raw, signal) {
			ready();
			const input = generationSchema.parse(raw);
			validateGeneration(GROK_MODEL, input);
			if (input.image && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(input.image)) {
				if (videoUrl(input.image).hash) throw new Error("参考图地址无效。");
			}
			const response = created.safeParse(await jsonRequest(fetcher, new URL("videos/generations", base), key, signal, {
				model: input.model,
				prompt: input.prompt,
				duration: input.duration,
				resolution: input.resolution,
				generate_audio: true,
				...input.image ? { image: { url: input.image } } : { aspect_ratio: input.aspectRatio }
			}));
			if (!response.success) throw new Error("提交响应缺少任务编号，请先在服务后台核实；不要重复生成。");
			return {
				id: response.data.request_id,
				status: "queued"
			};
		},
		async get(id, signal) {
			ready();
			if (!id || id.length > 500 || id === "." || id === "..") throw new Error("任务编号无效。");
			const result = polled.safeParse(await jsonRequest(fetcher, new URL(`videos/${encodeURIComponent(id)}`, base), key, signal));
			if (!result.success) throw new Error("视频服务返回未知状态，请查询原任务，不要重新生成。");
			const task = result.data;
			if (task.status === "done") {
				if (!task.video) throw new Error("视频结果缺少下载信息，请查询原任务。");
				if (task.video.respect_moderation === false) return {
					id,
					status: "failed"
				};
				return {
					id,
					status: "succeeded",
					video: {
						url: resultUrl(task.video.url, base),
						duration: task.video.duration,
						format: "mp4"
					}
				};
			}
			if (task.status === "failed" || task.status === "expired") return {
				id,
				status: task.status
			};
			return {
				id,
				status: task.status === "queued" ? "queued" : "running"
			};
		}
	};
}
//#endregion
export { videoUrl as i, createGrokSource as n, readBounded as r, GROK_MODEL as t };
