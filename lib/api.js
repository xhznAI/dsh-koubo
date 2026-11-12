import { z } from "zod";
//#region src/api/index.ts
const modelSchema = z.object({
	id: z.string().min(1).max(200),
	name: z.string().min(1).max(200),
	inputModes: z.array(z.enum(["text_to_video", "image_to_video"])).min(1),
	nativeAudio: z.boolean(),
	minSeconds: z.number().int().min(1),
	maxSeconds: z.number().int().min(1).max(300),
	resolutions: z.array(z.string().min(1)).min(1),
	aspectRatios: z.array(z.string().min(1)).min(1)
}).refine((value) => value.minSeconds <= value.maxSeconds);
const generationSchema = z.object({
	model: z.string().min(1).max(200),
	prompt: z.string().trim().min(1).max(16e3),
	duration: z.number().int().min(1).max(300),
	resolution: z.string().min(1).max(30),
	aspectRatio: z.string().min(1).max(20),
	image: z.string().max(15 * 1024 * 1024).optional()
}).strict();
const taskSchema = z.discriminatedUnion("status", [
	z.object({
		id: z.string().min(1).max(500),
		status: z.enum(["queued", "running"])
	}),
	z.object({
		id: z.string().min(1).max(500),
		status: z.literal("succeeded"),
		video: z.object({
			url: z.string().url(),
			duration: z.number().positive(),
			format: z.literal("mp4")
		})
	}),
	z.object({
		id: z.string().min(1).max(500),
		status: z.enum(["failed", "expired"])
	})
]);
var SourceRegistry = class {
	sources = /* @__PURE__ */ new Map();
	register(source) {
		if (!/^[a-z][a-z0-9-]{0,63}$/.test(source.id) || !source.label.trim()) throw new Error("视频来源标识无效。");
		if (this.sources.has(source.id)) throw new Error("视频来源已注册。");
		this.sources.set(source.id, source);
		return () => {
			if (this.sources.get(source.id) === source) this.sources.delete(source.id);
		};
	}
	list() {
		return [...this.sources.values()];
	}
	get(id) {
		return this.sources.get(id);
	}
};
function validateGeneration(model, input) {
	if (input.model !== model.id || !model.nativeAudio) throw new Error("请选择支持原生音频的视频模型。");
	if (!model.inputModes.includes(input.image ? "image_to_video" : "text_to_video")) throw new Error("所选模型不支持此输入方式。");
	if (input.duration < model.minSeconds || input.duration > model.maxSeconds) throw new Error("片段时长超出所选模型范围，请重新分段。");
	if (!model.resolutions.includes(input.resolution) || !model.aspectRatios.includes(input.aspectRatio)) throw new Error("所选模型不支持此分辨率或比例。");
}
//#endregion
export { SourceRegistry, generationSchema, modelSchema, taskSchema, validateGeneration };
