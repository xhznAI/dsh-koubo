import { z } from 'zod';
import { generationSchema, validateGeneration, type KouboModel, type KouboModelSource } from './api/index.js';
import { apiBase, jsonRequest, videoUrl, type Fetch } from './http.js';

export const GROK_MODEL: KouboModel = {
  id: 'grok-imagine-video-1.5', name: 'Grok Imagine Video 1.5', inputModes: ['text_to_video', 'image_to_video'],
  nativeAudio: true, minSeconds: 1, maxSeconds: 15, resolutions: ['480p', '720p', '1080p'],
  aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '3:2', '2:3', '21:9', '5:2'],
};
const created = z.object({ request_id: z.string().min(1).max(500) });
const polled = z.object({ status: z.enum(['pending', 'queued', 'running', 'done', 'failed', 'expired']),
  video: z.object({ url: z.string().min(1).max(8192), duration: z.number().positive(), respect_moderation: z.boolean().optional() }).optional(),
});

function resultUrl(value: string, base: URL): string {
  // 兼容渠道返回的根相对路径；禁止协议相对地址和反斜杠改变下载来源。
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) {
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin) throw new Error('视频下载地址无效。');
    return videoUrl(resolved.href).href;
  }
  return videoUrl(value).href;
}

/** 只发送官方异步协议；费用和调用统计由 API 服务端维护。 */
export function createGrokSource(config: { baseUrl: string; apiKey: string }, fetcher: Fetch = fetch): KouboModelSource {
  const base = apiBase(config.baseUrl), key = config.apiKey.trim();
  const ready = () => { if (!key) throw new Error('请先在口播插件设置中填写 Grok API Key。'); };
  return {
    id: 'grok', label: 'Grok', available: Boolean(key),
    async listModels(signal) { signal.throwIfAborted(); ready(); return [structuredClone(GROK_MODEL)]; },
    async create(raw, signal) {
      ready();
      const input = generationSchema.parse(raw);
      validateGeneration(GROK_MODEL, input);
      if (input.image && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(input.image)) {
        const url = videoUrl(input.image);
        if (url.hash) throw new Error('参考图地址无效。');
      }
      const response = created.safeParse(await jsonRequest(fetcher, new URL('videos/generations', base), key, signal, {
        model: input.model, prompt: input.prompt, duration: input.duration, resolution: input.resolution,
        generate_audio: true, ...(input.image ? { image: { url: input.image } } : { aspect_ratio: input.aspectRatio }),
      }));
      if (!response.success) throw new Error('提交响应缺少任务编号，请先在服务后台核实；不要重复生成。');
      return { id: response.data.request_id, status: 'queued' };
    },
    async get(id, signal) {
      ready();
      if (!id || id.length > 500 || id === '.' || id === '..') throw new Error('任务编号无效。');
      const result = polled.safeParse(await jsonRequest(fetcher, new URL(`videos/${encodeURIComponent(id)}`, base), key, signal));
      if (!result.success) throw new Error('视频服务返回未知状态，请查询原任务，不要重新生成。');
      const task = result.data;
      if (task.status === 'done') {
        if (!task.video) throw new Error('视频结果缺少下载信息，请查询原任务。');
        if (task.video.respect_moderation === false) return { id, status: 'failed' };
        return { id, status: 'succeeded', video: { url: resultUrl(task.video.url, base), duration: task.video.duration, format: 'mp4' } };
      }
      if (task.status === 'failed' || task.status === 'expired') return { id, status: task.status };
      return { id, status: task.status === 'queued' ? 'queued' : 'running' };
    },
  };
}
