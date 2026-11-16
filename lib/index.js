import { SourceRegistry, generationSchema, modelSchema, taskSchema, validateGeneration } from "./api.js";
import { i as videoUrl, n as createGrokSource, r as readBounded } from "./shared-grok-C3Mk8C46.js";
import { ZodError, z } from "zod";
import z$1 from "@deepseek-ai/schemastery";
import { createHash, randomUUID } from "node:crypto";
import { cp, lstat, mkdir, mkdtemp, open, opendir, readFile, readdir, realpath, rm, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { constants, readFileSync } from "node:fs";
import { pipeline } from "node:stream/promises";
//#region src/config.ts
const Config = z$1.object({
	baseUrl: z$1.string().default("https://api.x.ai").description("Grok API 地址（Base URL）").volatile(),
	apiKey: z$1.string().role("secret").default("").description("Grok API Key").volatile(),
	avatarReferences: z$1.array(z$1.object({
		id: z$1.string(),
		imagePath: z$1.string(),
		name: z$1.string(),
		imagePrompt: z$1.string(),
		favorite: z$1.boolean(),
		mime: z$1.union([
			"image/png",
			"image/jpeg",
			"image/webp"
		]),
		bytes: z$1.number(),
		createdAt: z$1.string(),
		updatedAt: z$1.string(),
		removed: z$1.boolean().default(false)
	})).default([]).volatile()
});
//#endregion
//#region src/runtime.ts
const ACTIVE_TTL = 1440 * 60 * 1e3;
const FINISHED_TTL = 900 * 1e3;
/** 仅保存当前进程的任务路由和防重标识，不写入历史、用量或账单。 */
var TaskRuntime = class {
	sources;
	now;
	capacity;
	bindings = /* @__PURE__ */ new Map();
	constructor(sources, now = Date.now, capacity = 128) {
		this.sources = sources;
		this.now = now;
		this.capacity = capacity;
	}
	sweep() {
		for (const [id, binding] of this.bindings) if (binding.expiresAt <= this.now() || this.sources.get(binding.source.id) !== binding.source) this.bindings.delete(id);
	}
	clear() {
		this.bindings.clear();
	}
	binding(owner, id) {
		this.sweep();
		const binding = this.bindings.get(id);
		if (!binding || binding.owner !== owner) throw new Error("此会话的临时任务句柄不可用，请到原服务后台查询。");
		return binding;
	}
	async create(owner, operationId, sourceId, raw, signal) {
		this.sweep();
		signal.throwIfAborted();
		const input = generationSchema.parse(raw);
		const source = this.sources.get(sourceId);
		if (!source?.available) throw new Error("所选视频来源尚未可用，请先完成设置。");
		const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
		const previous = this.bindings.get(operationId);
		if (previous) {
			if (previous.owner !== owner || previous.source !== source || previous.fingerprint !== fingerprint) throw new Error("同一操作编号不能用于不同会话、来源或参数。");
			if (previous.creating) return previous.creating;
			if (previous.task) return previous.task;
			throw new Error("上次提交结果未知，请到原服务后台核实，不要重新生成。");
		}
		if (this.bindings.size >= this.capacity) throw new Error("正在处理的片段过多，请先完成已有任务。");
		const binding = {
			owner,
			source,
			fingerprint,
			expiresAt: this.now() + ACTIVE_TTL
		};
		this.bindings.set(operationId, binding);
		let submitted = false;
		const run = async () => {
			try {
				const model = modelSchema.array().parse(await source.listModels(signal)).find((item) => item.id === input.model);
				if (!model) throw new Error("所选视频模型不可用。");
				validateGeneration(model, input);
				signal.throwIfAborted();
				if (this.sources.get(sourceId) !== source) throw new Error("视频来源已变化，请重新选择。");
				submitted = true;
				const task = taskSchema.parse(await source.create(input, signal));
				this.update(binding, task);
				return task;
			} catch (error) {
				if (!submitted) this.bindings.delete(operationId);
				throw error;
			} finally {
				binding.creating = void 0;
			}
		};
		binding.creating = run();
		return binding.creating;
	}
	async get(owner, id, signal) {
		const binding = this.binding(owner, id);
		if (binding.creating) return binding.creating;
		if (!binding.task) throw new Error("上次提交结果未知，请到原服务后台核实，不要重新生成。");
		const task = taskSchema.parse(await binding.source.get(binding.task.id, signal));
		if (task.id !== binding.task.id) throw new Error("服务返回的任务编号不匹配。");
		if (this.sources.get(binding.source.id) !== binding.source) throw new Error("视频来源已断开，请到原服务后台查询。");
		this.update(binding, task);
		return task;
	}
	update(binding, task) {
		const wasFinished = binding.task && !["queued", "running"].includes(binding.task.status);
		binding.task = task;
		if (!wasFinished && !["queued", "running"].includes(task.status)) binding.expiresAt = this.now() + FINISHED_TTL;
	}
};
//#endregion
//#region src/planner.ts
const words = new Intl.Segmenter("zh", { granularity: "word" });
function spokenSeconds(text) {
	let seconds = 0;
	for (const part of words.segment(text)) {
		if (!part.isWordLike) continue;
		const cjk = part.segment.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0;
		seconds += cjk ? cjk / 4.5 : 1 / 2.4;
	}
	return seconds;
}
/** 时长仅用于分段，实际语速须检查生成结果；不据此推算或记录费用。 */
function planNarration(text, model, targetSeconds = Math.max(model.minSeconds, Math.min(12, model.maxSeconds))) {
	const narration = text.trim();
	if (!narration || narration.length > 12e3) throw new Error("口播稿须为 1 至 12000 个字符。");
	if (!Number.isInteger(targetSeconds) || targetSeconds < Math.max(2, model.minSeconds) || targetSeconds > model.maxSeconds) throw new Error("目标片段时长超出模型范围。");
	const segments = [];
	let buffer = "";
	const flush = () => {
		if (!buffer.trim()) return;
		segments.push({
			id: `clip-${String(segments.length + 1).padStart(2, "0")}`,
			narration: buffer.trim(),
			duration: Math.max(model.minSeconds, Math.ceil(spokenSeconds(buffer) + 1))
		});
		buffer = "";
	};
	for (const token of words.segment(narration)) {
		if (buffer.trim() && Math.ceil(spokenSeconds(buffer + token.segment) + 1) > targetSeconds) flush();
		buffer += token.segment;
		if (/[。！？!?；;\n]$/u.test(token.segment) && spokenSeconds(buffer) >= (targetSeconds - 1) * .5) flush();
	}
	flush();
	if (segments.some((segment) => segment.duration > targetSeconds)) throw new Error("存在过长片段，请在口播稿中补充分句。");
	return {
		model: model.id,
		segments,
		estimatedSeconds: segments.reduce((sum, segment) => sum + segment.duration, 0),
		message: "时长为语速估算；先检查一个片段的人物、发音和口型，再继续生成。"
	};
}
function talkingPrompt(input) {
	return [
		"Create one continuous talking-presenter shot. Keep the same presenter identity, clothing and camera framing as the supplied first-frame image when present.",
		`Visual direction: ${input.visual || "A presenter facing the camera, subtle natural gestures, clean uncluttered background."}`,
		`Speech language: ${input.language}. Voice direction: ${input.voice || "Natural, clear, conversational delivery at a steady pace."}`,
		`Speak exactly this narration, with synchronized lips: ${JSON.stringify(input.narration)}`,
		"No extra spoken introduction, no added words, no background music, no burned-in subtitles. Keep a short natural pause at the end."
	].join("\n");
}
//#endregion
//#region src/files.ts
const inside$1 = (root, path) => {
	const part = relative(root, path);
	return !isAbsolute(part) && part !== ".." && !part.startsWith(`..${sep}`);
};
/** 文件只写入会话工作区，遵守只读策略；输出目录不能借助链接跳出工作区。 */
async function outputDirectory(ctx, exec) {
	exec.signal.throwIfAborted();
	if (!exec.agent) throw new Error("请在本地工作区中生成口播视频。");
	const cwd = ctx.workingDirectory.get(exec.agent.session);
	if (!cwd || !isAbsolute(cwd) || ctx.fs.processPathFromHostPath(cwd) !== cwd) throw new Error("口播输出需要本地工作区。");
	const policy = ctx.sandboxPolicy.resolve({ session: exec.agent.session });
	if (policy.mode === "read-only") throw new Error("当前工作区只读，无法生成口播视频。");
	const root = await realpath(cwd);
	if (policy.mode === "workspace-write" && (!policy.workspaceRoot || !inside$1(await realpath(policy.workspaceRoot), root))) throw new Error("视频输出不在允许的工作区内。");
	let directory = root;
	for (const name of ["video", "koubo"]) {
		directory = join(directory, name);
		await mkdir(directory).catch((error) => {
			if (error.code !== "EEXIST") throw error;
		});
		const info = await lstat(directory);
		if (!info.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory) throw new Error("视频输出目录不能是链接。");
	}
	return directory;
}
async function readLocal(ctx, exec, path, maxBytes) {
	if (!exec.agent || /^[a-z][a-z\d+.-]*:/iu.test(path) && !/^[a-z]:[\\/]/iu.test(path)) throw new Error("请选择会话可访问的本地文件。");
	const target = await ctx.fs.resolve(path, {
		cwd: ctx.workingDirectory.get(exec.agent.session),
		signal: exec.signal
	});
	const before = await ctx.fs.stat(target, exec.signal);
	if (before?.type !== "file" || !before.size || before.size > maxBytes) throw new Error("文件为空、过大或不是普通文件。");
	const bytes = Buffer.from(await ctx.fs.readBytes(target, exec.signal, maxBytes));
	const after = await ctx.fs.stat(target, exec.signal);
	if (before.version !== after?.version || bytes.length !== before.size) throw new Error("文件在读取时发生变化，请重试。");
	return bytes;
}
function imageMime(bytes) {
	let mime = "";
	if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	]))) mime = "image/png";
	else if (bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) mime = "image/jpeg";
	else if (bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") mime = "image/webp";
	if (!mime || bytes.length > 10 * 1024 * 1024) throw new Error("参考图须为不超过 10 MB 的 PNG、JPEG 或 WebP。");
	return mime;
}
function imageData(bytes) {
	return `data:${imageMime(bytes)};base64,${bytes.toString("base64")}`;
}
function validateMp4(bytes) {
	if (bytes.length < 24 || bytes.toString("ascii", 4, 8) !== "ftyp" || bytes.readUInt32BE(0) < 16 || bytes.readUInt32BE(0) > bytes.length) throw new Error("视频内容不是有效的 MP4 文件。");
}
async function fetchVideo(url, signal, fetcher = fetch) {
	try {
		const response = await fetcher(videoUrl(url), {
			redirect: "error",
			signal: AbortSignal.any([signal, AbortSignal.timeout(18e4)])
		});
		if (!response.ok) {
			await response.body?.cancel();
			throw new Error();
		}
		const bytes = Buffer.from(await readBounded(response, 256 * 1024 * 1024));
		validateMp4(bytes);
		return bytes;
	} catch {
		throw new Error("视频尚未成功下载，请查询同一任务重新下载，不要重新生成。");
	}
}
async function saveVideo(ctx, exec, bytes) {
	validateMp4(bytes);
	const path = join(await outputDirectory(ctx, exec), `clip-${randomUUID()}.mp4`);
	const file = await open(path, "wx");
	try {
		await file.writeFile(bytes, { signal: exec.signal });
		if ((await file.stat()).size !== bytes.length) throw new Error("视频保存不完整。");
	} catch (error) {
		await file.close();
		await unlink(path).catch(() => void 0);
		throw error;
	}
	await file.close();
	return {
		path,
		bytes: bytes.length,
		format: "mp4"
	};
}
//#endregion
//#region src/assemble.ts
async function mediaCommand(binary, args, signal) {
	signal.throwIfAborted();
	return new Promise((resolve, reject) => {
		const child = spawn(binary, args, {
			signal,
			windowsHide: true,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		});
		let output = "", failedToStart = false;
		child.stdout.on("data", (chunk) => {
			output = (output + String(chunk)).slice(-65536);
		});
		child.stderr.resume();
		let killTimer;
		const abort = () => {
			killTimer = setTimeout(() => child.kill("SIGKILL"), 2e3);
			killTimer.unref();
		};
		signal.addEventListener("abort", abort, { once: true });
		child.once("error", () => {
			failedToStart = true;
		});
		child.once("close", (code) => {
			signal.removeEventListener("abort", abort);
			if (killTimer) clearTimeout(killTimer);
			if (signal.aborted) reject(/* @__PURE__ */ new Error("视频合成已停止。"));
			else if (failedToStart) reject(/* @__PURE__ */ new Error("无法启动视频合成，请确认 FFmpeg 和 ffprobe 已安装。"));
			else if (code === 0) resolve(output);
			else reject(/* @__PURE__ */ new Error("视频合成未完成，请检查片段包含视频和音轨。"));
		});
	});
}
/** 只做本地规范化与拼接；不改写口播、不生成字幕时间轴、不再次调用模型。 */
async function assembleClips(ctx, exec, paths, aspectRatio) {
	if (paths.length < 1 || paths.length > 24) throw new Error("每次可合成 1 至 24 个片段。");
	const directory = await outputDirectory(ctx, exec);
	const signal = AbortSignal.any([exec.signal, AbortSignal.timeout(1200 * 1e3)]);
	await mediaCommand("ffmpeg", ["-version"], signal);
	await mediaCommand("ffprobe", ["-version"], signal);
	const stage = await mkdtemp(join(directory, ".assemble-"));
	const output = join(directory, `koubo-${randomUUID()}.mp4`);
	let completed = false, totalBytes = 0, totalSeconds = 0;
	const [width, height] = aspectRatio === "16:9" ? [1280, 720] : aspectRatio === "9:16" ? [720, 1280] : [720, 720];
	try {
		for (let index = 0; index < paths.length; index++) {
			const bytes = await readLocal(ctx, exec, paths[index], 256 * 1024 * 1024);
			validateMp4(bytes);
			totalBytes += bytes.length;
			if (totalBytes > 1024 * 1024 * 1024) throw new Error("单次合成的片段总大小不能超过 1 GB。");
			const input = join(stage, `input-${index}.mp4`), normalized = join(stage, `clip-${index}.mp4`);
			await writeFile(input, bytes, {
				signal,
				flag: "wx"
			});
			const info = JSON.parse(await mediaCommand("ffprobe", [
				"-v",
				"error",
				"-protocol_whitelist",
				"file,pipe",
				"-show_streams",
				"-show_format",
				"-of",
				"json",
				input
			], signal));
			const duration = Number(info.format?.duration);
			if (!Number.isFinite(duration) || duration <= 0 || duration > 300 || !Array.isArray(info.streams) || !info.streams.some((stream) => stream.codec_type === "video") || !info.streams.some((stream) => stream.codec_type === "audio")) throw new Error("每个口播片段须包含视频和音轨，且不超过 5 分钟。");
			totalSeconds += duration;
			if (totalSeconds > 600) throw new Error("单次合成总时长不能超过 10 分钟。");
			await mediaCommand("ffmpeg", [
				"-nostdin",
				"-v",
				"error",
				"-n",
				"-protocol_whitelist",
				"file,pipe",
				"-i",
				input,
				"-map",
				"0:v:0",
				"-map",
				"0:a:0",
				"-vf",
				`scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`,
				"-af",
				"aresample=48000:async=1:first_pts=0,apad",
				"-t",
				String(duration),
				"-c:v",
				"libx264",
				"-preset",
				"veryfast",
				"-crf",
				"20",
				"-threads",
				"2",
				"-pix_fmt",
				"yuv420p",
				"-c:a",
				"aac",
				"-ac",
				"2",
				"-ar",
				"48000",
				"-map_metadata",
				"-1",
				normalized
			], signal);
		}
		const list = join(stage, "clips.txt");
		await writeFile(list, paths.map((_, index) => `file 'clip-${index}.mp4'`).join("\n"), {
			signal,
			flag: "wx"
		});
		await mediaCommand("ffmpeg", [
			"-nostdin",
			"-v",
			"error",
			"-n",
			"-protocol_whitelist",
			"file,pipe",
			"-f",
			"concat",
			"-safe",
			"1",
			"-i",
			list,
			"-c",
			"copy",
			"-movflags",
			"+faststart",
			"-map_metadata",
			"-1",
			output
		], signal);
		const size = (await stat(output)).size;
		if (!size) throw new Error("合成结果为空。");
		completed = true;
		return {
			path: output,
			bytes: size,
			format: "mp4",
			width,
			height,
			clips: paths.length
		};
	} finally {
		await rm(stage, {
			recursive: true,
			force: true
		});
		if (!completed) await rm(output, { force: true });
	}
}
//#endregion
//#region src/catalog.ts
const templates = [
	{
		id: "lin-169",
		name: "小林式解说",
		aspectRatio: "16:9",
		composition: "Lin",
		category: "讲解",
		description: "人物讲述与题板交替，让复杂内容更容易理解。",
		features: [
			"圆形人物窗",
			"图表与公式",
			"章节题板"
		],
		tone: "mint"
	},
	{
		id: "huazi-916",
		name: "网红花字口播",
		aspectRatio: "9:16",
		composition: "Huazi",
		category: "短视频",
		description: "竖屏人物搭配关键词花字，突出每一句的重点。",
		features: [
			"竖屏人物",
			"关键词花字",
			"节奏包装"
		],
		tone: "pink"
	},
	{
		id: "reference/launch-169",
		name: "发布解读",
		aspectRatio: "16:9",
		composition: "Film",
		category: "讲解",
		description: "用产品画面、参数与人物解读讲清新事物。",
		features: [
			"产品展示",
			"参数信息",
			"横屏解读"
		],
		tone: "blue"
	},
	{
		id: "reference/tutorial-169",
		name: "保姆级教程",
		aspectRatio: "16:9",
		composition: "Tutorial",
		category: "教程",
		description: "围绕操作画面分步讲解，带观众完成整个流程。",
		features: [
			"步骤讲解",
			"操作画面",
			"重点提示"
		],
		tone: "peach"
	},
	{
		id: "reference/multihost-169",
		name: "多主播多语言",
		aspectRatio: "16:9",
		composition: "Tutorial",
		category: "讲解",
		description: "组织多个讲述角色，为不同段落安排人物与语言。",
		features: [
			"多角色",
			"多语言",
			"分段讲述"
		],
		tone: "lavender"
	},
	{
		id: "packaging",
		name: "包装组件库",
		aspectRatio: "16:9",
		composition: "Gallery",
		category: "包装",
		description: "为口播加上文字、标注、数据与章节包装。",
		features: [
			"字幕与人名条",
			"手绘圈注",
			"数字与章节"
		],
		tone: "sand"
	}
];
//#endregion
//#region src/templates.ts
const skillRoot = fileURLToPath(new URL("../skills/koubo/", import.meta.url));
/** 将原版工程与剪辑脚本放入新目录，保留原有布局、组件及依赖版本。 */
async function createTemplate(ctx, exec, id) {
	const template = templates.find((item) => item.id === id);
	if (!template) throw new Error("请选择 koubo_template 列出的模板。");
	const project = await mkdtemp(join(await outputDirectory(ctx, exec), `edit-${id.replaceAll("/", "-")}-`));
	let completed = false;
	try {
		const source = join(skillRoot, "templates", id);
		for (const entry of await readdir(source)) {
			exec.signal.throwIfAborted();
			await cp(join(source, entry), join(project, entry), {
				recursive: true,
				force: false,
				errorOnExist: true
			});
		}
		for (const resource of [
			"scripts",
			"references",
			"upstream.json",
			"UPSTREAM-LICENSE",
			"UPSTREAM-NOTICE.md",
			"UPSTREAM-THIRD_PARTY.md"
		]) {
			exec.signal.throwIfAborted();
			await cp(join(skillRoot, resource), join(project, "koubo", resource), {
				recursive: true,
				force: false,
				errorOnExist: true
			});
		}
		const manifestPath = join(project, "package.json");
		const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
		manifest.packageManager = "pnpm@11.25.0";
		await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { signal: exec.signal });
		await writeFile(join(project, ".nvmrc"), "24\n", {
			flag: "wx",
			signal: exec.signal
		});
		exec.signal.throwIfAborted();
		completed = true;
		return {
			...template,
			project,
			entryPoint: "src/index.ts",
			install: "corepack pnpm install",
			preview: "corepack pnpm exec remotion studio src/index.ts",
			render: `corepack pnpm exec remotion render src/index.ts ${template.composition} out/film.mp4`,
			guide: join(project, "koubo", "references", "workflow.md"),
			message: "原版模板已放入新工程。按本期内容编辑时间轴并准备素材，然后安装工程依赖、预览和渲染。"
		};
	} finally {
		if (!completed) await rm(project, {
			recursive: true,
			force: true
		});
	}
}
//#endregion
//#region src/tools.ts
const selection = {
	source: z.string().default("grok"),
	model: z.string().default("grok-imagine-video-1.5")
};
const planInput = z.object({
	...selection,
	narration: z.string().trim().min(1).max(12e3),
	targetSeconds: z.number().int().optional()
}).strict();
const createInput = z.object({
	...selection,
	operationId: z.string().uuid(),
	narration: z.string().trim().min(1).max(2e3),
	language: z.string().max(80).default("普通话"),
	visual: z.string().max(3e3).default(""),
	voice: z.string().max(1e3).default(""),
	duration: z.number().int().min(1).max(300),
	resolution: z.string().default("720p"),
	aspectRatio: z.string().default("9:16"),
	imagePath: z.string().min(1).optional()
}).strict();
const statusInput = z.object({
	taskId: z.string().uuid(),
	download: z.boolean().default(true)
}).strict();
const assemblyInput = z.object({
	clips: z.array(z.string().min(1)).min(1).max(24),
	aspectRatio: z.enum([
		"16:9",
		"9:16",
		"1:1"
	]).default("9:16")
}).strict();
const templateInput = z.object({ template: z.enum([
	"lin-169",
	"huazi-916",
	"reference/launch-169",
	"reference/tutorial-169",
	"reference/multihost-169",
	"packaging"
]).optional() }).strict();
const output = {
	schema: {
		type: "object",
		additionalProperties: true
	},
	render: (_args, result) => [{
		type: "text",
		text: JSON.stringify(result)
	}]
};
const sourceProps = {
	source: {
		type: "string",
		description: "模型来源 ID；默认 grok，先通过 koubo_models 获取可用来源。"
	},
	model: {
		type: "string",
		description: "该来源下的模型 ID。"
	}
};
const owner = (exec) => {
	if (!exec.agent) throw new Error("请在会话中使用口播工具。");
	return String(exec.agent.session.id);
};
async function models(sources, id, signal) {
	const source = sources.get(id);
	if (!source?.available) throw new Error("所选视频来源不可用，请在设置中配置来源。");
	return modelSchema.array().parse(await source.listModels(signal));
}
function kouboTools(ctx, sources, runtime) {
	return [
		{
			name: "koubo_models",
			description: "列出视频来源。传入 source 时查询该来源的视频模型、时长范围、分辨率和原生音频能力；不会生成视频或计费。",
			parameters: {
				type: "object",
				properties: { source: sourceProps.source },
				additionalProperties: false
			},
			output,
			isConcurrencySafe: () => true,
			async execute(args, exec) {
				const input = z.object({ source: z.string().optional() }).strict().parse(args);
				return {
					sources: sources.list().map((source) => ({
						id: source.id,
						name: source.label,
						available: source.available
					})),
					...input.source ? { models: await models(sources, input.source, exec.signal) } : {}
				};
			}
		},
		{
			name: "koubo_plan",
			description: "按所选视频模型的时长范围整理口播分段，返回逐段台词与估算秒数；仅规划，不创建生成任务。",
			parameters: {
				type: "object",
				properties: {
					...sourceProps,
					narration: { type: "string" },
					targetSeconds: { type: "integer" }
				},
				required: ["narration"],
				additionalProperties: false
			},
			output,
			isConcurrencySafe: () => true,
			async execute(args, exec) {
				const input = planInput.parse(args), model = (await models(sources, input.source, exec.signal)).find((item) => item.id === input.model);
				if (!model?.nativeAudio) throw new Error("请选择支持原生音频的视频模型。");
				return {
					source: input.source,
					...planNarration(input.narration, model, input.targetSeconds)
				};
			}
		},
		{
			name: "koubo_generate",
			description: "生成一个带原生配音的口播片段。参考图 imagePath 可选：提供时图生视频，否则文生视频。可能由服务端计费，先确认台词与模型；提交后用 koubo_status 查询原 taskId。operationId 为本次操作 UUID，重复调用必须复用。",
			parameters: {
				type: "object",
				properties: {
					...sourceProps,
					operationId: {
						type: "string",
						format: "uuid"
					},
					narration: { type: "string" },
					language: { type: "string" },
					visual: { type: "string" },
					voice: { type: "string" },
					duration: { type: "integer" },
					resolution: { type: "string" },
					aspectRatio: { type: "string" },
					imagePath: { type: "string" }
				},
				required: [
					"operationId",
					"narration",
					"duration"
				],
				additionalProperties: false
			},
			output,
			isConcurrencySafe: () => false,
			async execute(args, exec) {
				const input = createInput.parse(args);
				await outputDirectory(ctx, exec);
				const image = input.imagePath ? imageData(await readLocal(ctx, exec, input.imagePath, 10 * 1024 * 1024)) : void 0;
				const task = await runtime.create(owner(exec), input.operationId, input.source, {
					model: input.model,
					prompt: talkingPrompt(input),
					duration: input.duration,
					resolution: input.resolution,
					aspectRatio: input.aspectRatio,
					...image ? { image } : {}
				}, exec.signal);
				return {
					taskId: input.operationId,
					providerTaskId: task.id,
					source: input.source,
					status: task.status,
					message: "请使用 koubo_status 查询此 taskId；费用以服务后台记录为准。"
				};
			}
		},
		{
			name: "koubo_status",
			description: "查询当前会话的口播任务，成功后默认下载 MP4 到 video/koubo。download=false 只查状态。每隔约 5 秒查询，下载失败继续查询同一 taskId，不要重新生成。插件重启后请到服务后台查询。",
			parameters: {
				type: "object",
				properties: {
					taskId: {
						type: "string",
						format: "uuid"
					},
					download: { type: "boolean" }
				},
				required: ["taskId"],
				additionalProperties: false
			},
			output,
			isConcurrencySafe: () => false,
			async execute(args, exec) {
				const input = statusInput.parse(args);
				if (input.download) await outputDirectory(ctx, exec);
				const task = await runtime.get(owner(exec), input.taskId, exec.signal);
				const result = {
					taskId: input.taskId,
					providerTaskId: task.id,
					status: task.status
				};
				if (task.status !== "succeeded") return result;
				if (!input.download) return {
					...result,
					duration: task.video.duration,
					message: "视频已就绪，可使用同一 taskId 下载。"
				};
				try {
					return {
						...result,
						duration: task.video.duration,
						video: await saveVideo(ctx, exec, await fetchVideo(task.video.url, exec.signal))
					};
				} catch {
					return {
						...result,
						downloaded: false,
						message: "视频已生成但尚未保存，请查询同一 taskId 重试下载，不要重新生成。"
					};
				}
			}
		},
		{
			name: "koubo_template",
			description: "列出原版口播模板。传入 template 时将对应的原版 Remotion 工程、剪辑脚本和用法复制到工作区的新目录，返回预览与渲染入口。包括小林式解说、花字口播、发布解读、教程、多主播和包装组件库。保留原版布局、动效与位置配置。",
			parameters: {
				type: "object",
				properties: { template: {
					type: "string",
					enum: templates.map((item) => item.id)
				} },
				additionalProperties: false
			},
			output,
			isConcurrencySafe: () => false,
			async execute(args, exec) {
				const input = templateInput.parse(args);
				return input.template ? createTemplate(ctx, exec, input.template) : { templates };
			}
		},
		{
			name: "koubo_assemble",
			description: "使用本机 FFmpeg 将口播 MP4 按 clips 顺序直接拼接，统一分辨率、帧率和音频格式。完整成片使用 koubo_template 的原版模板与剪辑流程。保存到 video/koubo。",
			parameters: {
				type: "object",
				properties: {
					clips: {
						type: "array",
						items: { type: "string" },
						minItems: 1,
						maxItems: 24
					},
					aspectRatio: {
						type: "string",
						enum: [
							"16:9",
							"9:16",
							"1:1"
						]
					}
				},
				required: ["clips"],
				additionalProperties: false
			},
			output,
			isConcurrencySafe: () => false,
			async execute(args, exec) {
				const input = assemblyInput.parse(args);
				return assembleClips(ctx, exec, input.clips, input.aspectRatio);
			}
		}
	];
}
//#endregion
//#region src/skills.ts
function kouboSkill() {
	const directory = new URL("../skills/koubo/", import.meta.url), file = new URL("SKILL.md", directory);
	const raw = readFileSync(file, "utf8");
	const header = /^---\r?\nname: koubo\r?\ndescription: ([^\r\n]+)\r?\n---\r?\n/u.exec(raw);
	if (!header?.[1]) throw new Error("口播技能元数据无效。");
	const candidate = {
		name: "koubo",
		description: header[1],
		path: fileURLToPath(file),
		invocation: {
			modelInvocable: true,
			userInvocable: true
		},
		source: "bundled",
		provider: "koubo",
		rank: 600,
		resourceBase: {
			kind: "directory",
			path: fileURLToPath(directory)
		},
		locator: "koubo"
	};
	return {
		name: "koubo",
		list: async () => [candidate],
		get: async (entry) => {
			if (entry.locator !== "koubo") return void 0;
			const { rank: _rank, locator: _locator, ...summary } = candidate;
			return {
				...summary,
				content: raw.slice(header[0].length).trim()
			};
		}
	};
}
//#endregion
//#region src/library.ts
var LibraryError = class extends Error {
	status;
	constructor(status, message) {
		super(message);
		this.status = status;
	}
};
const inside = (root, path) => {
	const value = relative(root, path);
	return value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value);
};
const videoType = (path) => /\.mp4$/iu.test(path) ? "video/mp4" : /\.webm$/iu.test(path) ? "video/webm" : /\.mov$/iu.test(path) ? "video/quicktime" : void 0;
/** 只读取本地口播目录；拒绝文件及任意祖先目录的符号链接。 */
async function libraryRoot(cwd) {
	if (!cwd || !isAbsolute(cwd)) return null;
	let directory = await realpath(cwd);
	for (const part of ["video", "koubo"]) {
		directory = join(directory, part);
		try {
			const info = await lstat(directory);
			if (!info.isDirectory() || info.isSymbolicLink()) throw new LibraryError(403, "口播目录不能是链接。");
		} catch (error) {
			if (error.code === "ENOENT") return null;
			throw error;
		}
	}
	return directory;
}
async function resolveVideo(root, path) {
	if (!path || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === ".." || part.startsWith(".")) || isAbsolute(path) || !videoType(path)) throw new LibraryError(400, "视频路径无效。");
	let target = root;
	for (const part of path.split("/")) {
		target = join(target, part);
		if ((await lstat(target)).isSymbolicLink()) throw new LibraryError(403, "不能读取链接。");
	}
	const resolved = await realpath(target);
	if (!inside(root, resolved) || !(await lstat(resolved)).isFile()) throw new LibraryError(403, "视频不在口播目录内。");
	return resolved;
}
async function readLibrary(cwd, signal) {
	const root = await libraryRoot(cwd);
	const result = {
		directory: root,
		items: [],
		truncated: false
	};
	if (!root) return result;
	let visited = 0;
	const walk = async (directory, depth, project, templateId) => {
		const entries = await opendir(directory);
		for await (const entry of entries) {
			signal.throwIfAborted();
			if (++visited > 5e3 || result.items.length >= 500) {
				result.truncated = true;
				break;
			}
			if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "koubo" || entry.isSymbolicLink()) continue;
			const path = join(directory, entry.name);
			const rel = relative(root, path).split(sep).join("/");
			if (entry.isDirectory()) {
				if (depth >= 5) {
					result.truncated = true;
					continue;
				}
				const template = templates.find((item) => entry.name.startsWith(`edit-${item.id.replaceAll("/", "-")}-`));
				await walk(path, depth + 1, template ? rel : project, template?.id ?? templateId);
			} else if (entry.isFile() && videoType(entry.name)) try {
				const info = await lstat(await resolveVideo(root, rel));
				if (!info.size) continue;
				const item = {
					path: rel,
					name: entry.name,
					bytes: info.size,
					modifiedAt: info.mtime.toISOString(),
					kind: /^clip-/u.test(entry.name) || /(^|\/)(public|media|clips|assets)(\/|$)/u.test(rel) ? "clip" : "finished",
					project,
					templateId
				};
				result.items.push(item);
			} catch (error) {
				if (error.code !== "ENOENT") throw error;
			}
		}
	};
	await walk(root, 0, null, null);
	result.items.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt) || a.path.localeCompare(b.path));
	return result;
}
/** 单段 Range 支持拖动视频进度与尾部索引读取。 */
function byteRange(header, size) {
	if (!header) return {
		start: 0,
		end: size - 1,
		partial: false
	};
	const match = /^bytes=(\d*)-(\d*)$/u.exec(header);
	if (!match || !match[1] && !match[2]) throw new LibraryError(416, "范围无效");
	const first = match[1] ? Number(match[1]) : void 0, last = match[2] ? Number(match[2]) : void 0;
	if (first !== void 0 && !Number.isSafeInteger(first) || last !== void 0 && !Number.isSafeInteger(last)) throw new LibraryError(416, "范围无效");
	const start = first ?? Math.max(0, size - (last ?? 0));
	const end = first === void 0 ? size - 1 : Math.min(last ?? size - 1, size - 1);
	if (start < 0 || start > end || start >= size) throw new LibraryError(416, "范围无效");
	return {
		start,
		end,
		partial: true
	};
}
//#endregion
//#region src/packaging-catalog.json
var packaging_catalog_default = [
	{
		"value": "TeaserColdOpen",
		"name": "预告快切",
		"category": "开场 / 钩子",
		"description": "后面最炸的 3–5 个瞬间各闪 0.4–0.8 秒 + 「接下来」角标 → 问题字卡"
	},
	{
		"value": "ColdOpenFreeze",
		"name": "定格冷开场",
		"category": "开场 / 钩子",
		"description": "动作片段 → 定格去色 → 「未完待续」箭头 → 片名卡 → 雪花转场"
	},
	{
		"value": "SearchTyping",
		"name": "搜索打字",
		"category": "开场 / 钩子",
		"description": "中性搜索框逐字打 + 联想词 + 推近 1.6×"
	},
	{
		"value": "NumberSpike",
		"name": "数字钉子",
		"category": "开场 / 钩子",
		"description": "大数字从 3 倍大 0.5 秒缩到顶部 + 同色闪光，可再缩成角标常驻"
	},
	{
		"value": "SlamText",
		"name": "双行砸字",
		"category": "开场 / 钩子",
		"description": "两行大字先后砸进画面上下，可带年份角标"
	},
	{
		"value": "WordStack",
		"name": "逐词堆叠",
		"category": "开场 / 钩子",
		"description": "逐词堆叠，一拍一个词，最后一词换色放大"
	},
	{
		"value": "TornStrip",
		"name": "撕纸标题",
		"category": "开场 / 钩子",
		"description": "撕纸标题条横穿画面（片名 / 章节）"
	},
	{
		"value": "TextBehind",
		"name": "人物景深字",
		"category": "开场 / 钩子",
		"description": "景深字：大字 / 数字在人身后（原视频 → 大字 → 抠出来的人），升起 / 砸入 / 数字滚动 / 滑入"
	},
	{
		"value": "EvidenceCard",
		"name": "证据截图",
		"category": "证据 / 数据",
		"description": "截图飞入 + 品牌色描边 + 鼠标指针 + 推近数值签 + 3D 倾斜"
	},
	{
		"value": "DocFocus",
		"name": "文档聚焦",
		"category": "证据 / 数据",
		"description": "重建文档，非目标句压暗 35%，关键词黄块扫过"
	},
	{
		"value": "SourceDoc",
		"name": "原文与译句",
		"category": "证据 / 数据",
		"description": "官方文档截图慢推 + 中文译句荧光底 + 来源角标"
	},
	{
		"value": "ZoomFocus",
		"name": "截图推近",
		"category": "证据 / 数据",
		"description": "截图 / 录屏推近到目标框 + 压暗 + 标签（不越过原图边缘）"
	},
	{
		"value": "Counter",
		"name": "滚动计数",
		"category": "证据 / 数据",
		"description": "数字滚动，落地弹一下"
	},
	{
		"value": "Odometer",
		"name": "里程表数字",
		"category": "证据 / 数据",
		"description": "里程表逐位滚动，高位先停"
	},
	{
		"value": "GlassPanel",
		"name": "毛玻璃数据",
		"category": "证据 / 数据",
		"description": "毛玻璃数据面板，条形和数字一起滚"
	},
	{
		"value": "SpecCard",
		"name": "参数卡",
		"category": "证据 / 数据",
		"description": "质感参数卡：大数字小单位、留白、逐行淡入"
	},
	{
		"value": "LineDraw",
		"name": "折线生长",
		"category": "证据 / 数据",
		"description": "多条折线画出，末端挂同色标签"
	},
	{
		"value": "BarCompare",
		"name": "横条数据",
		"category": "证据 / 数据",
		"description": "横条对比 + 鬼影大字背景"
	},
	{
		"value": "ReviewCards",
		"name": "评论连弹",
		"category": "证据 / 数据",
		"description": "评论 / 差评卡每 1.1 秒连弹（示意评论要标注）"
	},
	{
		"value": "ArchiveCards",
		"name": "档案快切",
		"category": "证据 / 数据",
		"description": "档案卡 0.6 秒一张快切 + 红色标签"
	},
	{
		"value": "MapRoute",
		"name": "地图航线",
		"category": "证据 / 数据",
		"description": "世界地图推近 + 国家高亮 + 图钉 + 航线生长"
	},
	{
		"value": "CompareWipe",
		"name": "前后擦除",
		"category": "证据 / 数据",
		"description": "前后对比擦除"
	},
	{
		"value": "PaperCollage",
		"name": "纸张拼贴",
		"category": "证据 / 数据",
		"description": "纸纹底 + 白边照片 + 胶带 + 手写批注"
	},
	{
		"value": "HandDraw",
		"name": "手绘圈注",
		"category": "标注 / 人物",
		"description": "手绘圈 / 箭头 / 下划线 / 打叉，描边生长"
	},
	{
		"value": "CalloutPill",
		"name": "指向胶囊",
		"category": "标注 / 人物",
		"description": "实色胶囊 + 小尖指向目标，弹簧弹出"
	},
	{
		"value": "LeaderLabel",
		"name": "引线标签",
		"category": "标注 / 人物",
		"description": "引线 + 中文粗体 + 英文小斜体（+ 牛皮纸小标签）"
	},
	{
		"value": "TypedNameTag",
		"name": "打字姓名",
		"category": "标注 / 人物",
		"description": "手绘箭头指人 + 粗衬线名字逐字打出 + 头衔"
	},
	{
		"value": "LowerThird",
		"name": "双层人名条",
		"category": "标注 / 人物",
		"description": "色条 + 名字 + 身份两层滑出"
	},
	{
		"value": "NamePlate",
		"name": "人物名牌",
		"category": "标注 / 人物",
		"description": "去色人物旁双层名牌 + 语录药丸气泡"
	},
	{
		"value": "SourceTag",
		"name": "来源角标",
		"category": "标注 / 人物",
		"description": "出处角标（每个数据都挂）"
	},
	{
		"value": "FreezeFrame",
		"name": "定格圈注",
		"category": "标注 / 人物",
		"description": "定格 + 去色 + 「等等！」+ 圈注（打断节奏）"
	},
	{
		"value": "PunchInHost",
		"name": "人物跳切",
		"category": "节奏 / 互动 / 结构",
		"description": "同一条口播按句子边界硬切景别（1.0/1.3 或 1.0/1.18/1.32 + 偏置）"
	},
	{
		"value": "KeywordStack",
		"name": "关键词堆叠",
		"category": "节奏 / 互动 / 结构",
		"description": "主播身旁依次弹 图标 + 彩色词，结束一起模糊淡出"
	},
	{
		"value": "RetentionCaption",
		"name": "留存大字幕",
		"category": "节奏 / 互动 / 结构",
		"description": "留存大字幕：1–3 个词一组居中砸出，关键词变色"
	},
	{
		"value": "TiltLine",
		"name": "倾斜金句",
		"category": "节奏 / 互动 / 结构",
		"description": "倾斜 -12° 金句逐字弹出，关键词亮黄"
	},
	{
		"value": "Aside",
		"name": "括号旁白",
		"category": "节奏 / 互动 / 结构",
		"description": "括号旁白吐槽（剪辑师画外音）"
	},
	{
		"value": "Danmaku",
		"name": "飘动弹幕",
		"category": "节奏 / 互动 / 结构",
		"description": "弹幕从右往左飘（替观众说出质疑）"
	},
	{
		"value": "ReactionPop",
		"name": "反应贴纸",
		"category": "节奏 / 互动 / 结构",
		"description": "动态表情 / 原创贴纸 + 吐槽，弹出轻晃"
	},
	{
		"value": "MemeWindow",
		"name": "梗图窗口",
		"category": "节奏 / 互动 / 结构",
		"description": "黑底梗图窗，一句一图硬切（素材用原创表情包）"
	},
	{
		"value": "PollPop",
		"name": "互动投票",
		"category": "节奏 / 互动 / 结构",
		"description": "「评论区打 1 还是 2」，说到哪个哪个大数字弹出"
	},
	{
		"value": "GlitchInterstitial",
		"name": "故障插屏",
		"category": "节奏 / 互动 / 结构",
		"description": "0.5 秒测试卡故障插屏 + 圆形主播 + 「点赞关注」"
	},
	{
		"value": "HostFloaters",
		"name": "漂浮窗口",
		"category": "节奏 / 互动 / 结构",
		"description": "主播旁漂两个浏览器窗口 + 图标小标签"
	},
	{
		"value": "ProgressChapters",
		"name": "章节进度",
		"category": "节奏 / 互动 / 结构",
		"description": "顶部进度条 + 章节刻度 + 当前章节名"
	},
	{
		"value": "ProgressTracker",
		"name": "步骤追踪",
		"category": "节奏 / 互动 / 结构",
		"description": "步骤徽章 / 路线条（起点 → 终点）"
	},
	{
		"value": "ChapterCard",
		"name": "章节大卡",
		"category": "节奏 / 互动 / 结构",
		"description": "色条扫过 + 大序号 + 标题"
	},
	{
		"value": "RecapBoard",
		"name": "两栏复盘",
		"category": "节奏 / 互动 / 结构",
		"description": "两栏复盘板（为什么 / 怎么办），每章亮一条新的"
	},
	{
		"value": "Countdown",
		"name": "倒计时",
		"category": "节奏 / 互动 / 结构",
		"description": "倒计时药丸，最后 3 秒变红跳动"
	},
	{
		"value": "GhostWord",
		"name": "背景鬼影字",
		"category": "节奏 / 互动 / 结构",
		"description": "背景巨大鬼影词缓慢横移"
	},
	{
		"value": "Highlight",
		"name": "荧光文字高亮",
		"category": "标注 / 人物",
		"description": "在文字后扫过荧光底色，用于句内重点。"
	}
];
//#endregion
//#region src/gallery.ts
const entries = (kind, group, template, rows) => rows.map(([value, name, description]) => ({
	id: `${kind}-${value}`,
	name,
	description,
	kind,
	value,
	group,
	category: group,
	template,
	portrait: template === "huazi-916"
}));
const galleryStyles = [
	...templates.filter((t) => t.id !== "packaging").map((t) => ({
		id: `template-${t.id.replaceAll("/", "-")}`,
		name: t.name,
		description: t.description,
		group: "整体风格",
		category: t.category,
		template: t.id,
		kind: "template",
		value: t.id,
		portrait: t.aspectRatio === "9:16"
	})),
	...entries("scene", "小林场景", "lin-169", [
		[
			"host",
			"全屏景深字",
			"大字从人物身后出现，搭配侧边信息卡。"
		],
		[
			"board",
			"紫金题板",
			"主题、问题和选项分步出现。"
		],
		[
			"broll",
			"画面与人物小窗",
			"全屏辅助画面慢推，人物留在圆形小窗。"
		],
		[
			"rates",
			"利率对照",
			"并排展示数字，突出差异。"
		],
		[
			"assume",
			"假设与揭晓",
			"先给出问号，再揭晓条件和结果。"
		],
		[
			"formula",
			"逐行推导",
			"公式逐行出现，最后一行高亮。"
		],
		[
			"big",
			"大字结论",
			"上方命题，下方结果砸入。"
		],
		[
			"formula2",
			"公式逐项生长",
			"公式按项展开，为每个数值附上解释。"
		],
		[
			"calc",
			"算例填数",
			"算式依次填入，再突出最终答案。"
		],
		[
			"bars",
			"横向条形图",
			"条形依次增长，高亮重点数据。"
		],
		[
			"fall",
			"瀑布柱图",
			"用起点、扣除和结果展示变化。"
		],
		[
			"curve",
			"增长曲线",
			"曲线随时间画出，搭配结论标签。"
		],
		[
			"stickers",
			"四宫格贴纸",
			"四组关键词与贴纸逐个亮起。"
		]
	]),
	...entries("broll", "小林场景", "lin-169", [
		[
			"card",
			"画面 · 信息卡",
			"在辅助画面上弹出标题和数字卡。"
		],
		[
			"stat",
			"画面 · 大数字",
			"数据与标签依次出现。"
		],
		[
			"chips",
			"画面 · 胶囊词",
			"用胶囊短句突出两三个要点。"
		],
		[
			"banner",
			"画面 · 横幅",
			"句子横穿画面，重点词使用色块。"
		],
		[
			"doc",
			"画面 · 文档卡",
			"纸张卡片中高亮关键原文。"
		],
		[
			"slam",
			"画面 · 砸字",
			"一句结论快速放大砸入。"
		],
		[
			"float",
			"画面 · 漂浮字",
			"多个关键词在画面中缓缓上浮。"
		]
	]),
	...entries("pip", "人物布局", "lin-169", [
		[
			"circle-tl",
			"左上圆形窗",
			"人物位于左上角，内容面板向右避让。"
		],
		[
			"circle-bl",
			"左下圆形窗",
			"人物位于左下角，保留上方信息空间。"
		],
		[
			"rect-l",
			"左侧方形窗",
			"竖向人物窗位于左侧。"
		],
		[
			"rect-r",
			"右侧方形窗",
			"人物位于右侧，内容面板向左避让。"
		]
	]),
	...entries("card", "竖屏花字", "huazi-916", [
		[
			"stamp",
			"描边印章",
			"倾斜盖下印章式结论。"
		],
		[
			"slam",
			"砸屏大字",
			"带描边的大字快速砸入。"
		],
		[
			"big",
			"渐变大字块",
			"黄色渐变色块突出标签式结论。"
		],
		[
			"number",
			"滚动数字",
			"数量从零滚动到目标数值。"
		],
		[
			"vs",
			"左右对比",
			"两个名牌与 VS 依次出现。"
		],
		[
			"tags",
			"彩色名牌",
			"四张名牌逐个点亮。"
		],
		[
			"bars",
			"横条对比",
			"用横条比较速度、成本或表现。"
		],
		[
			"list",
			"优缺点清单",
			"带勾叉的条目依次滑入。"
		],
		[
			"image",
			"白边截图",
			"展示带白边、标签的截图。"
		]
	]),
	...entries("preset", "竖屏花字", "huazi-916", [
		[
			"restrained",
			"克制花字",
			"较小字幕与轻微推镜，适合知识和品牌。"
		],
		[
			"standard",
			"标准花字",
			"清晰关键词、适度弹跳与镜头推进。"
		],
		[
			"lively",
			"热闹花字",
			"更大字幕、更强弹跳和多色关键词。"
		]
	]),
	...packaging_catalog_default.map((p) => ({
		...p,
		id: `pack-${p.value}`,
		kind: "pack",
		group: "包装组件",
		template: "packaging",
		portrait: false
	}))
];
//#endregion
//#region src/avatars.ts
const imageName = (name) => !name.startsWith(".") && !/[/\\\0]/u.test(name) && /\.(png|jpe?g|webp)$/iu.test(name);
const avatarId = z.string().min(1).max(180).refine(imageName);
const avatarDetails = z.object({
	name: z.string().trim().min(1).max(80),
	imagePrompt: z.string().trim().max(4e3).default(""),
	favorite: z.boolean().default(true)
}).strict();
const storedAvatar = avatarDetails.extend({ updatedAt: z.string().datetime() });
const avatarUpload = avatarDetails.extend({ image: z.string().max(14 * 1024 * 1024) });
const extension = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/webp": "webp"
};
const readFlags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
const metadataName = (id) => `.${id}.koubo.json`;
/** 直接扫描人物图目录；生图工具保存的普通图片无需登记即可显示。 */
async function avatarRoot(cwd, create = false) {
	const library = await libraryRoot(cwd);
	if (!library) return null;
	const root = join(library, "avatars");
	if (create) await mkdir(root).catch((error) => {
		if (error.code !== "EEXIST") throw error;
	});
	try {
		const info = await lstat(root);
		if (!info.isDirectory() || info.isSymbolicLink() || await realpath(root) !== root) throw new LibraryError(403, "形象目录不能是链接。");
	} catch (error) {
		if (error.code === "ENOENT") return null;
		throw error;
	}
	return root;
}
async function readSafe(root, name, limit, headerOnly = false) {
	const path = join(root, name), before = await lstat(path);
	if (!before.isFile() || before.isSymbolicLink() || before.size < 1 || before.size > limit || await realpath(path) !== path) throw new LibraryError(403, "形象文件无效。");
	const file = await open(path, readFlags);
	try {
		const info = await file.stat();
		if (!info.isFile() || info.ino !== before.ino || info.dev !== before.dev || info.size !== before.size) throw new LibraryError(409, "素材已变化，请刷新重试。");
		const bytes = Buffer.alloc(headerOnly ? Math.min(16, info.size) : info.size + 1);
		let offset = 0;
		while (offset < bytes.length) {
			const read = await file.read(bytes, offset, bytes.length - offset, offset);
			if (!read.bytesRead) break;
			offset += read.bytesRead;
		}
		const after = await file.stat();
		if (offset !== (headerOnly ? bytes.length : info.size) || after.size !== info.size || after.mtimeMs !== info.mtimeMs) throw new LibraryError(409, "素材已变化，请刷新重试。");
		return {
			bytes: bytes.subarray(0, offset),
			info
		};
	} finally {
		await file.close();
	}
}
async function readAvatar(root, id) {
	avatarId.parse(id);
	const image = await readSafe(root, id, 10 * 1024 * 1024, true), mime = imageMime(image.bytes);
	let details = {
		name: id.replace(/\.[^.]+$/u, "").slice(0, 80),
		imagePrompt: "",
		favorite: false,
		updatedAt: image.info.mtime.toISOString()
	};
	try {
		details = storedAvatar.parse(JSON.parse((await readSafe(root, metadataName(id), 64 * 1024)).bytes.toString("utf8")));
	} catch (error) {
		if (error.code !== "ENOENT") throw error;
	}
	return {
		...details,
		id,
		mime,
		imagePath: `video/koubo/avatars/${id}`,
		bytes: image.info.size,
		createdAt: image.info.birthtime.toISOString(),
		updatedAt: new Date(Math.max(Date.parse(details.updatedAt), image.info.mtimeMs)).toISOString()
	};
}
async function readAvatars(cwd, signal) {
	signal.throwIfAborted();
	const root = await avatarRoot(cwd), result = {
		items: [],
		truncated: false
	};
	if (!root) return result;
	let visited = 0;
	for await (const entry of await opendir(root)) {
		signal.throwIfAborted();
		if (++visited > 2e3 || result.items.length >= 200) {
			result.truncated = true;
			break;
		}
		if (!entry.isFile() || !avatarId.safeParse(entry.name).success) continue;
		try {
			result.items.push(await readAvatar(root, entry.name));
		} catch (error) {
			if (error.code !== "ENOENT") throw new LibraryError(409, "部分形象素材已变化或损坏，请检查形象目录后刷新。");
		}
	}
	result.items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
	return result;
}
async function importAvatar(root, value, signal) {
	const { image, ...details } = avatarUpload.parse(value);
	const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/u.exec(image);
	if (!match || match[2].length % 4 !== 0) throw new LibraryError(400, "请选择 PNG、JPEG 或 WebP 人物图。");
	const bytes = Buffer.from(match[2], "base64");
	let mime;
	try {
		mime = imageMime(bytes);
	} catch {
		throw new LibraryError(400, "人物图须为不超过 10 MB 的 PNG、JPEG 或 WebP。");
	}
	if (mime !== match[1]) throw new LibraryError(400, "人物图格式与内容不一致。");
	const id = `${randomUUID()}.${extension[mime]}`, path = join(root, id);
	signal.throwIfAborted();
	const file = await open(path, "wx", 384);
	try {
		await file.writeFile(bytes, { signal });
		await file.close();
		await writeFile(join(root, metadataName(id)), JSON.stringify({
			...details,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		}, null, 2), {
			flag: "wx",
			mode: 384,
			signal
		});
	} catch (error) {
		await file.close().catch(() => void 0);
		await unlink(path);
		await unlink(join(root, metadataName(id))).catch(() => void 0);
		throw error;
	}
	return readAvatar(root, id);
}
async function avatarImage(root, id) {
	avatarId.parse(id);
	const { bytes } = await readSafe(root, id, 10 * 1024 * 1024);
	return {
		mime: imageMime(bytes),
		bytes
	};
}
//#endregion
//#region src/avatar-references.ts
const avatarReferenceId = z.string().regex(/^[a-f\d]{64}$/u);
const avatarReferenceUpdate = avatarDetails.extend({
	id: avatarReferenceId,
	updatedAt: z.string().datetime()
});
const avatarReferenceRemove = z.object({
	id: avatarReferenceId,
	updatedAt: z.string().datetime()
}).strict();
const avatarReferenceLink = avatarDetails.extend({ imagePath: z.string().trim().min(1).max(4096) });
const referenceId = (path) => createHash("sha256").update(path).digest("hex");
/** 仅保存本机图片引用与收藏偏好，切换工作区不会复制或移动原图。 */
var AvatarReferences = class {
	current;
	save;
	queue = Promise.resolve();
	constructor(current, save) {
		this.current = current;
		this.save = save;
	}
	serial(run) {
		const next = this.queue.catch(() => void 0).then(run);
		this.queue = next;
		return next;
	}
	async resolve(record) {
		const { removed: _removed, ...item } = record;
		try {
			if (!isAbsolute(item.imagePath)) throw new Error("无效引用");
			const local = await readAvatar(dirname(item.imagePath), basename(item.imagePath));
			return {
				...item,
				bytes: local.bytes,
				mime: local.mime,
				available: true,
				updatedAt: new Date(Math.max(Date.parse(item.updatedAt), Date.parse(local.updatedAt))).toISOString()
			};
		} catch {
			return {
				...item,
				available: false
			};
		}
	}
	async refresh(cwd, signal) {
		const local = await readAvatars(cwd, signal), root = await avatarRoot(cwd);
		if (root && local.items.length) await this.serial(async () => {
			signal.throwIfAborted();
			const items = [...this.current()], known = new Set(items.map((item) => item.id));
			let changed = false;
			for (const item of local.items) {
				const imagePath = join(root, item.id), id = referenceId(imagePath);
				if (known.has(id)) continue;
				items.push({
					...item,
					id,
					imagePath,
					removed: false
				});
				known.add(id);
				changed = true;
			}
			if (changed) await this.save(items);
		});
		const items = [];
		for (const record of this.current()) {
			signal.throwIfAborted();
			if (!record.removed) items.push(await this.resolve(record));
		}
		return {
			items: items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)),
			truncated: local.truncated
		};
	}
	async get(id) {
		avatarReferenceId.parse(id);
		const record = this.current().find((item) => item.id === id && !item.removed);
		if (!record) throw new LibraryError(404, "形象引用不存在。");
		return this.resolve(record);
	}
	async add(root, item, signal) {
		const imagePath = join(root, item.id), id = referenceId(imagePath);
		return this.serial(async () => {
			signal.throwIfAborted();
			const record = {
				...item,
				id,
				imagePath,
				removed: false
			};
			await this.save([...this.current().filter((item) => item.id !== id), record]);
			return {
				...record,
				available: true
			};
		});
	}
	async link(value, cwd, signal) {
		const { imagePath, ...details } = avatarReferenceLink.parse(value);
		if (!isAbsolute(imagePath) && !cwd) throw new LibraryError(400, "相对图片路径需要先打开工作区。");
		const path = isAbsolute(imagePath) ? imagePath : resolve(cwd, imagePath);
		let item;
		try {
			item = await readAvatar(dirname(path), basename(path));
		} catch {
			throw new LibraryError(400, "图片路径不可用，请选择有效的 PNG、JPEG 或 WebP 本机文件。");
		}
		return this.add(dirname(path), {
			...item,
			...details,
			updatedAt: new Date(Math.max(Date.now(), Date.parse(item.updatedAt) + 1)).toISOString()
		}, signal);
	}
	async update(value, signal) {
		const { id, updatedAt, ...details } = avatarReferenceUpdate.parse(value);
		return this.serial(async () => {
			const current = await this.get(id);
			if (current.updatedAt !== updatedAt) throw new LibraryError(409, "此形象已变化，请刷新后重试。");
			signal.throwIfAborted();
			const { available, ...record } = {
				...current,
				...details,
				updatedAt: new Date(Math.max(Date.now(), Date.parse(updatedAt) + 1)).toISOString()
			};
			await this.save(this.current().map((item) => item.id === id ? {
				...record,
				removed: false
			} : item));
			return {
				...record,
				available
			};
		});
	}
	async remove(value, signal) {
		const { id, updatedAt } = avatarReferenceRemove.parse(value);
		await this.serial(async () => {
			if ((await this.get(id)).updatedAt !== updatedAt) throw new LibraryError(409, "此形象已变化，请刷新后重试。");
			signal.throwIfAborted();
			await this.save(this.current().map((item) => item.id === id ? {
				...item,
				removed: true
			} : item));
		});
	}
};
//#endregion
//#region src/routes.ts
async function requestJson(req, signal, limit) {
	if (req.headers["content-type"]?.split(";")[0]?.trim() !== "application/json") throw new LibraryError(415, "请使用 JSON 上传素材。");
	if (Number(req.headers["content-length"]) > limit) throw new LibraryError(413, "上传内容过大。");
	const chunks = [];
	let bytes = 0;
	for await (const chunk of req) {
		signal.throwIfAborted();
		bytes += chunk.length;
		if (bytes > limit) throw new LibraryError(413, "上传内容过大。");
		chunks.push(Buffer.from(chunk));
	}
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch {
		throw new LibraryError(400, "素材信息无效。");
	}
}
function registerLibraryRoutes(ctx, packageRoot = fileURLToPath(new URL("../", import.meta.url)), savedReferences) {
	let memory = [];
	const references = savedReferences ?? new AvatarReferences(() => memory, async (items) => {
		memory = items;
	});
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/dsh-koubo",
		async handler(req, res) {
			const abort = new AbortController();
			const close = () => {
				if (!res.writableEnded) abort.abort();
			};
			res.on("close", close);
			res.setHeader("cache-control", "no-store");
			res.setHeader("x-content-type-options", "nosniff");
			try {
				const rejection = ctx.connection.requestRejection(req);
				if (rejection !== void 0) {
					res.statusCode = rejection;
					res.end();
					return;
				}
				if (req.headers["sec-fetch-site"] === "cross-site" || req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw new LibraryError(403, "请求来源无效。");
				const url = new URL(req.url ?? "/", "http://localhost");
				const avatars = url.pathname === "/dsh-koubo/avatars";
				const allowed = avatars ? [
					"GET",
					"HEAD",
					"POST",
					"PATCH",
					"DELETE"
				] : url.pathname === "/dsh-koubo/avatar-use" ? ["POST"] : ["GET", "HEAD"];
				if (!allowed.includes(req.method ?? "")) {
					res.setHeader("allow", allowed.join(", "));
					throw new LibraryError(405, "请求方法无效。");
				}
				if (url.pathname.startsWith("/dsh-koubo/gallery/")) {
					const name = url.pathname.slice(19);
					const poster = galleryStyles.find((item) => name === `posters/${item.id}.jpg`);
					const asset = poster ? join(packageRoot, "assets/gallery", name) : ["index.html", "player.js"].includes(name) ? join(packageRoot, "lib/gallery", name) : void 0;
					if (!asset) throw new LibraryError(404, "未找到样式预览。");
					const body = await readFile(asset, { signal: abort.signal });
					res.setHeader("content-type", poster ? "image/jpeg" : name === "index.html" ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8");
					res.setHeader("content-length", body.length);
					res.setHeader("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self'");
					res.end(req.method === "HEAD" ? void 0 : body);
					return;
				}
				if (![
					"/dsh-koubo/library",
					"/dsh-koubo/media",
					"/dsh-koubo/avatars",
					"/dsh-koubo/avatar-image",
					"/dsh-koubo/avatar-use"
				].includes(url.pathname)) throw new LibraryError(404, "未找到。");
				if (url.pathname === "/dsh-koubo/avatar-image" || url.pathname === "/dsh-koubo/avatar-use") {
					const id = url.pathname.endsWith("avatar-use") ? z.object({ id: avatarReferenceId }).strict().parse(await requestJson(req, abort.signal, 1024)).id : avatarReferenceId.parse(url.searchParams.get("id"));
					const item = await references.get(id);
					if (!item.available) throw new LibraryError(410, "原图片已移动或删除，请重新添加形象引用。");
					if (url.pathname.endsWith("avatar-use")) {
						res.setHeader("content-type", "application/json; charset=utf-8");
						res.end(JSON.stringify(item));
						return;
					}
					const image = await avatarImage(dirname(item.imagePath), basename(item.imagePath));
					res.setHeader("content-type", image.mime);
					res.setHeader("content-length", image.bytes.length);
					res.setHeader("content-security-policy", "default-src 'none'; sandbox");
					res.end(req.method === "HEAD" ? void 0 : image.bytes);
					return;
				}
				if (avatars && (req.method === "PATCH" || req.method === "DELETE")) {
					const value = await requestJson(req, abort.signal, 32 * 1024);
					if (req.method === "DELETE") {
						await references.remove(value, abort.signal);
						res.statusCode = 204;
						res.end();
					} else {
						res.setHeader("content-type", "application/json; charset=utf-8");
						res.end(JSON.stringify(await references.update(value, abort.signal)));
					}
					return;
				}
				const sessionId = url.searchParams.get("sessionId");
				if (avatars && !sessionId && (req.method === "GET" || req.method === "HEAD")) {
					const data = await references.refresh(void 0, abort.signal);
					res.setHeader("content-type", "application/json; charset=utf-8");
					res.end(req.method === "HEAD" ? void 0 : JSON.stringify(data));
					return;
				}
				if (!sessionId || sessionId.length > 200) throw new LibraryError(400, "请先打开工作区对话。");
				const { items } = await ctx.sessionController.list({}, abort.signal);
				const session = items.find((item) => item.sessionId === sessionId);
				if (!session || !session.cwd || ctx.fs.processPathFromHostPath(session.cwd) !== session.cwd) throw new LibraryError(404, "本地工作区不可用。");
				if (avatars) {
					if (avatars && (req.method === "GET" || req.method === "HEAD")) {
						const data = await references.refresh(session.cwd, abort.signal);
						res.setHeader("content-type", "application/json; charset=utf-8");
						res.end(req.method === "HEAD" ? void 0 : JSON.stringify(data));
						return;
					}
					const value = await requestJson(req, abort.signal, 15 * 1024 * 1024);
					if (avatarReferenceLink.safeParse(value).success) {
						const result = await references.link(value, session.cwd, abort.signal);
						res.statusCode = 201;
						res.setHeader("content-type", "application/json; charset=utf-8");
						res.end(JSON.stringify(result));
						return;
					}
					const live = await ctx.sessionController.resolveAgent(sessionId);
					if ("error" in live || ctx.workingDirectory.get(live.agent.session) !== session.cwd) throw new LibraryError(409, "工作区已变化，请重新打开对话。");
					try {
						await outputDirectory(ctx, {
							agent: live.agent,
							signal: abort.signal
						});
					} catch {
						throw new LibraryError(403, "当前工作区不允许保存或修改形象。");
					}
					const root = await avatarRoot(session.cwd, true);
					if (!root) throw new LibraryError(404, "形象不存在。");
					const result = await references.add(root, await importAvatar(root, value, abort.signal), abort.signal);
					res.statusCode = 201;
					res.setHeader("content-type", "application/json; charset=utf-8");
					res.end(JSON.stringify(result));
					return;
				}
				if (url.pathname === "/dsh-koubo/library") {
					const library = await readLibrary(session.cwd, abort.signal);
					res.setHeader("content-type", "application/json; charset=utf-8");
					res.end(req.method === "HEAD" ? void 0 : JSON.stringify(library));
					return;
				}
				const root = await libraryRoot(session.cwd);
				if (!root) throw new LibraryError(404, "视频不存在。");
				const path = url.searchParams.get("path") ?? "";
				const file = await open(await resolveVideo(root, path), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
				try {
					const info = await file.stat();
					if (!info.isFile() || info.size <= 0) throw new LibraryError(404, "视频不存在。");
					res.setHeader("accept-ranges", "bytes");
					let range;
					try {
						range = byteRange(req.headers.range, info.size);
					} catch (error) {
						res.setHeader("content-range", `bytes */${info.size}`);
						throw error;
					}
					res.statusCode = range.partial ? 206 : 200;
					if (range.partial) res.setHeader("content-range", `bytes ${range.start}-${range.end}/${info.size}`);
					res.setHeader("content-type", videoType(path));
					res.setHeader("content-length", range.end - range.start + 1);
					if (url.searchParams.get("download") === "1") res.setHeader("content-disposition", `attachment; filename="video.${path.split(".").at(-1)}"; filename*=UTF-8''${encodeURIComponent(path.split("/").at(-1)).replace(/'/gu, "%27")}`);
					if (req.method === "HEAD") res.end();
					else await pipeline(file.createReadStream({
						start: range.start,
						end: range.end,
						autoClose: false
					}), res, { signal: abort.signal });
				} finally {
					await file.close();
				}
			} catch (error) {
				if (res.headersSent) {
					res.destroy();
					return;
				}
				res.removeHeader("content-length");
				res.statusCode = error instanceof LibraryError ? error.status : error instanceof ZodError ? 400 : error.code === "ENOENT" ? 404 : 503;
				res.setHeader("content-type", "application/json; charset=utf-8");
				res.end(req.method === "HEAD" ? void 0 : JSON.stringify({ message: error instanceof LibraryError ? error.message : error instanceof ZodError ? "请检查人物名称、提示词和素材信息。" : "无法处理口播素材，请刷新重试。" }));
			} finally {
				res.off("close", close);
			}
		}
	}));
}
//#endregion
//#region src/index.ts
const name = "koubo";
const inject = [
	"tools",
	"skills",
	"fs",
	"workingDirectory",
	"sandboxPolicy",
	"settings"
];
function apply(ctx, config) {
	ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber));
	const avatars = new AvatarReferences(() => config.avatarReferences.get(), (items) => ctx.settings.update("koubo", { avatarReferences: items }));
	ctx.inject([
		"webServer",
		"connection",
		"sessionController"
	], (ctx) => registerLibraryRoutes(ctx, void 0, avatars));
	const registry = new SourceRegistry();
	let current;
	let unregister;
	const refresh = () => {
		const next = {
			baseUrl: config.baseUrl.get(),
			apiKey: config.apiKey.get()
		};
		if (current?.baseUrl === next.baseUrl && current.apiKey === next.apiKey) return;
		const source = createGrokSource(next);
		unregister?.();
		unregister = registry.register(source);
		current = next;
	};
	const sources = {
		register: (source) => registry.register(source),
		list: () => {
			refresh();
			return registry.list();
		},
		get: (id) => {
			refresh();
			return registry.get(id);
		}
	};
	refresh();
	const runtime = new TaskRuntime(sources);
	const lifetime = new AbortController();
	ctx.provide("kouboSources", sources);
	ctx.effect(() => () => {
		lifetime.abort();
		runtime.clear();
	});
	ctx.skills.registerProvider(kouboSkill);
	for (const tool of kouboTools(ctx, sources, runtime)) ctx.tools.register({
		...tool,
		execute: (args, exec) => tool.execute(args, {
			...exec,
			signal: AbortSignal.any([exec.signal, lifetime.signal])
		})
	});
}
//#endregion
export { Config, apply, inject, name };
