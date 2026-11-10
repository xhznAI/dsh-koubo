import { z } from 'zod';

export const modelSchema = z.object({
  id: z.string().min(1).max(200), name: z.string().min(1).max(200),
  inputModes: z.array(z.enum(['text_to_video', 'image_to_video'])).min(1),
  nativeAudio: z.boolean(), minSeconds: z.number().int().min(1), maxSeconds: z.number().int().min(1).max(300),
  resolutions: z.array(z.string().min(1)).min(1), aspectRatios: z.array(z.string().min(1)).min(1),
}).refine(value => value.minSeconds <= value.maxSeconds);
export type KouboModel = z.infer<typeof modelSchema>;
export const generationSchema = z.object({
  model: z.string().min(1).max(200), prompt: z.string().trim().min(1).max(16000),
  duration: z.number().int().min(1).max(300), resolution: z.string().min(1).max(30),
  aspectRatio: z.string().min(1).max(20), image: z.string().max(15 * 1024 * 1024).optional(),
}).strict();
export type KouboGeneration = z.infer<typeof generationSchema>;
export const taskSchema = z.discriminatedUnion('status', [
  z.object({ id: z.string().min(1).max(500), status: z.enum(['queued', 'running']) }),
  z.object({ id: z.string().min(1).max(500), status: z.literal('succeeded'),
    video: z.object({ url: z.string().url(), duration: z.number().positive(), format: z.literal('mp4') }) }),
  z.object({ id: z.string().min(1).max(500), status: z.enum(['failed', 'expired']) }),
]);
export type KouboTask = z.infer<typeof taskSchema>;

/** 来源由宿主持有凭据；实例绑定一个身份，切换身份时注销旧实例再注册新实例。 */
export interface KouboModelSource {
  readonly id: string;
  readonly label: string;
  readonly available: boolean;
  listModels(signal: AbortSignal): Promise<KouboModel[]>;
  create(input: KouboGeneration, signal: AbortSignal): Promise<KouboTask>;
  get(taskId: string, signal: AbortSignal): Promise<KouboTask>;
}
export interface KouboSources {
  register(source: KouboModelSource): () => void;
  list(): readonly KouboModelSource[];
  get(id: string): KouboModelSource | undefined;
}

export class SourceRegistry implements KouboSources {
  private readonly sources = new Map<string, KouboModelSource>();
  register(source: KouboModelSource): () => void {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(source.id) || !source.label.trim()) throw new Error('视频来源标识无效。');
    if (this.sources.has(source.id)) throw new Error('视频来源已注册。');
    this.sources.set(source.id, source);
    return () => { if (this.sources.get(source.id) === source) this.sources.delete(source.id); };
  }
  list(): readonly KouboModelSource[] { return [...this.sources.values()]; }
  get(id: string): KouboModelSource | undefined { return this.sources.get(id); }
}

export function validateGeneration(model: KouboModel, input: KouboGeneration): void {
  if (input.model !== model.id || !model.nativeAudio) throw new Error('请选择支持原生音频的视频模型。');
  if (!model.inputModes.includes(input.image ? 'image_to_video' : 'text_to_video')) throw new Error('所选模型不支持此输入方式。');
  if (input.duration < model.minSeconds || input.duration > model.maxSeconds) throw new Error('片段时长超出所选模型范围，请重新分段。');
  if (!model.resolutions.includes(input.resolution) || !model.aspectRatios.includes(input.aspectRatio)) throw new Error('所选模型不支持此分辨率或比例。');
}
