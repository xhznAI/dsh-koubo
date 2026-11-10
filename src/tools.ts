import type { Context } from '@deepseek-ai/cordis';
import type { ToolDefinition, ToolExecution } from '@deepseek-ai/dsh-tools';
import { z } from 'zod';
import { modelSchema, type KouboSources } from './api/index.js';
import { TaskRuntime } from './runtime.js';
import { planNarration, talkingPrompt } from './planner.js';
import { fetchVideo, imageData, outputDirectory, readLocal, saveVideo } from './files.js';
import { assembleClips } from './assemble.js';
import { createTemplate, templates } from './templates.js';

const selection = { source: z.string().default('grok'), model: z.string().default('grok-imagine-video-1.5') };
const planInput = z.object({ ...selection, narration: z.string().trim().min(1).max(12000), targetSeconds: z.number().int().optional() }).strict();
const createInput = z.object({ ...selection, operationId: z.string().uuid(), narration: z.string().trim().min(1).max(2000),
  language: z.string().max(80).default('普通话'), visual: z.string().max(3000).default(''), voice: z.string().max(1000).default(''),
  duration: z.number().int().min(1).max(300), resolution: z.string().default('720p'), aspectRatio: z.string().default('9:16'),
  imagePath: z.string().min(1).optional(),
}).strict();
const statusInput = z.object({ taskId: z.string().uuid(), download: z.boolean().default(true) }).strict();
const assemblyInput = z.object({ clips: z.array(z.string().min(1)).min(1).max(24), aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('9:16') }).strict();
const templateInput = z.object({ template: z.enum(['lin-169', 'huazi-916', 'reference/launch-169', 'reference/tutorial-169', 'reference/multihost-169', 'packaging']).optional() }).strict();
const output: ToolDefinition['output'] = { schema: { type: 'object', additionalProperties: true }, render: (_args, result) => [{ type: 'text', text: JSON.stringify(result) }] };
const sourceProps = { source: { type: 'string', description: '模型来源 ID；默认 grok，先通过 koubo_models 获取可用来源。' }, model: { type: 'string', description: '该来源下的模型 ID。' } };
const owner = (exec: ToolExecution) => { if (!exec.agent) throw new Error('请在会话中使用口播工具。'); return String(exec.agent.session.id); };

async function models(sources: KouboSources, id: string, signal: AbortSignal) {
  const source = sources.get(id);
  if (!source?.available) throw new Error('所选视频来源不可用，请在设置中配置来源。');
  return modelSchema.array().parse(await source.listModels(signal));
}
export function kouboTools(ctx: Context, sources: KouboSources, runtime: TaskRuntime): ToolDefinition[] {
  return [
    { name: 'koubo_models', description: '列出视频来源。传入 source 时查询该来源的视频模型、时长范围、分辨率和原生音频能力；不会生成视频或计费。',
      parameters: { type: 'object', properties: { source: sourceProps.source }, additionalProperties: false }, output, isConcurrencySafe: () => true,
      async execute(args, exec) {
        const input = z.object({ source: z.string().optional() }).strict().parse(args);
        return { sources: sources.list().map(source => ({ id: source.id, name: source.label, available: source.available })),
          ...(input.source ? { models: await models(sources, input.source, exec.signal) } : {}) };
      } },
    { name: 'koubo_plan', description: '按所选视频模型的时长范围整理口播分段，返回逐段台词与估算秒数；仅规划，不创建生成任务。',
      parameters: { type: 'object', properties: { ...sourceProps, narration: { type: 'string' }, targetSeconds: { type: 'integer' } }, required: ['narration'], additionalProperties: false }, output, isConcurrencySafe: () => true,
      async execute(args, exec) {
        const input = planInput.parse(args), model = (await models(sources, input.source, exec.signal)).find(item => item.id === input.model);
        if (!model?.nativeAudio) throw new Error('请选择支持原生音频的视频模型。');
        return { source: input.source, ...planNarration(input.narration, model, input.targetSeconds) };
      } },
    { name: 'koubo_generate', description: '生成一个带原生配音的口播片段。参考图 imagePath 可选：提供时图生视频，否则文生视频。可能由服务端计费，先确认台词与模型；提交后用 koubo_status 查询原 taskId。operationId 为本次操作 UUID，重复调用必须复用。',
      parameters: { type: 'object', properties: { ...sourceProps, operationId: { type: 'string', format: 'uuid' }, narration: { type: 'string' },
        language: { type: 'string' }, visual: { type: 'string' }, voice: { type: 'string' }, duration: { type: 'integer' },
        resolution: { type: 'string' }, aspectRatio: { type: 'string' }, imagePath: { type: 'string' } }, required: ['operationId', 'narration', 'duration'], additionalProperties: false }, output, isConcurrencySafe: () => false,
      async execute(args, exec) {
        const input = createInput.parse(args);
        await outputDirectory(ctx, exec);
        const image = input.imagePath ? imageData(await readLocal(ctx, exec, input.imagePath, 10 * 1024 * 1024)) : undefined;
        const task = await runtime.create(owner(exec), input.operationId, input.source, { model: input.model, prompt: talkingPrompt(input),
          duration: input.duration, resolution: input.resolution, aspectRatio: input.aspectRatio, ...(image ? { image } : {}) }, exec.signal);
        return { taskId: input.operationId, providerTaskId: task.id, source: input.source, status: task.status, message: '请使用 koubo_status 查询此 taskId；费用以服务后台记录为准。' };
      } },
    { name: 'koubo_status', description: '查询当前会话的口播任务，成功后默认下载 MP4 到 video/koubo。download=false 只查状态。每隔约 5 秒查询，下载失败继续查询同一 taskId，不要重新生成。插件重启后请到服务后台查询。',
      parameters: { type: 'object', properties: { taskId: { type: 'string', format: 'uuid' }, download: { type: 'boolean' } }, required: ['taskId'], additionalProperties: false }, output, isConcurrencySafe: () => false,
      async execute(args, exec) {
        const input = statusInput.parse(args);
        if (input.download) await outputDirectory(ctx, exec);
        const task = await runtime.get(owner(exec), input.taskId, exec.signal);
        const result = { taskId: input.taskId, providerTaskId: task.id, status: task.status };
        if (task.status !== 'succeeded') return result;
        if (!input.download) return { ...result, duration: task.video.duration, message: '视频已就绪，可使用同一 taskId 下载。' };
        try { return { ...result, duration: task.video.duration, video: await saveVideo(ctx, exec, await fetchVideo(task.video.url, exec.signal)) }; }
        catch { return { ...result, downloaded: false, message: '视频已生成但尚未保存，请查询同一 taskId 重试下载，不要重新生成。' }; }
      } },
    { name: 'koubo_template', description: '列出原版口播模板。传入 template 时将对应的原版 Remotion 工程、剪辑脚本和用法复制到工作区的新目录，返回预览与渲染入口。包括小林式解说、花字口播、发布解读、教程、多主播和包装组件库。保留原版布局、动效与位置配置。',
      parameters: { type: 'object', properties: { template: { type: 'string', enum: templates.map(item => item.id) } }, additionalProperties: false }, output, isConcurrencySafe: () => false,
      async execute(args, exec) { const input = templateInput.parse(args); return input.template ? createTemplate(ctx, exec, input.template) : { templates }; } },
    { name: 'koubo_assemble', description: '使用本机 FFmpeg 将口播 MP4 按 clips 顺序直接拼接，统一分辨率、帧率和音频格式。完整成片使用 koubo_template 的原版模板与剪辑流程。保存到 video/koubo。',
      parameters: { type: 'object', properties: { clips: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 24 }, aspectRatio: { type: 'string', enum: ['16:9', '9:16', '1:1'] } }, required: ['clips'], additionalProperties: false }, output, isConcurrencySafe: () => false,
      async execute(args, exec) { const input = assemblyInput.parse(args); return assembleClips(ctx, exec, input.clips, input.aspectRatio); } },
  ];
}
