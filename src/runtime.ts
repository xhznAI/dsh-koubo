import { createHash } from 'node:crypto';
import { generationSchema, modelSchema, taskSchema, validateGeneration, type KouboGeneration, type KouboModelSource, type KouboSources, type KouboTask } from './api/index.js';

interface Binding {
  owner: string; source: KouboModelSource; fingerprint: string; expiresAt: number;
  task?: KouboTask; creating?: Promise<KouboTask>;
}
const ACTIVE_TTL = 24 * 60 * 60 * 1000, FINISHED_TTL = 15 * 60 * 1000;

/** 仅保存当前进程的任务路由和防重标识，不写入历史、用量或账单。 */
export class TaskRuntime {
  private readonly bindings = new Map<string, Binding>();
  constructor(private readonly sources: KouboSources, private readonly now = Date.now, private readonly capacity = 128) {}

  private sweep(): void {
    for (const [id, binding] of this.bindings) {
      if (binding.expiresAt <= this.now() || this.sources.get(binding.source.id) !== binding.source) this.bindings.delete(id);
    }
  }
  clear(): void { this.bindings.clear(); }
  private binding(owner: string, id: string): Binding {
    this.sweep();
    const binding = this.bindings.get(id);
    if (!binding || binding.owner !== owner) throw new Error('此会话的临时任务句柄不可用，请到原服务后台查询。');
    return binding;
  }
  async create(owner: string, operationId: string, sourceId: string, raw: KouboGeneration, signal: AbortSignal): Promise<KouboTask> {
    this.sweep(); signal.throwIfAborted();
    const input = generationSchema.parse(raw);
    const source = this.sources.get(sourceId);
    if (!source?.available) throw new Error('所选视频来源尚未可用，请先完成设置。');
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const previous = this.bindings.get(operationId);
    if (previous) {
      if (previous.owner !== owner || previous.source !== source || previous.fingerprint !== fingerprint) throw new Error('同一操作编号不能用于不同会话、来源或参数。');
      if (previous.creating) return previous.creating;
      if (previous.task) return previous.task;
      throw new Error('上次提交结果未知，请到原服务后台核实，不要重新生成。');
    }
    if (this.bindings.size >= this.capacity) throw new Error('正在处理的片段过多，请先完成已有任务。');
    // 验证和网络调用之前占位，避免并行执行重复提交。
    const binding: Binding = { owner, source, fingerprint, expiresAt: this.now() + ACTIVE_TTL };
    this.bindings.set(operationId, binding);
    let submitted = false;
    const run = async (): Promise<KouboTask> => {
      try {
        const models = modelSchema.array().parse(await source.listModels(signal));
        const model = models.find(item => item.id === input.model);
        if (!model) throw new Error('所选视频模型不可用。');
        validateGeneration(model, input);
        signal.throwIfAborted();
        if (this.sources.get(sourceId) !== source) throw new Error('视频来源已变化，请重新选择。');
        submitted = true;
        const task = taskSchema.parse(await source.create(input, signal));
        this.update(binding, task);
        return task;
      } catch (error) {
        if (!submitted) this.bindings.delete(operationId);
        throw error;
      } finally { binding.creating = undefined; }
    };
    binding.creating = run();
    return binding.creating;
  }
  async get(owner: string, id: string, signal: AbortSignal): Promise<KouboTask> {
    const binding = this.binding(owner, id);
    if (binding.creating) return binding.creating;
    if (!binding.task) throw new Error('上次提交结果未知，请到原服务后台核实，不要重新生成。');
    const task = taskSchema.parse(await binding.source.get(binding.task.id, signal));
    if (task.id !== binding.task.id) throw new Error('服务返回的任务编号不匹配。');
    if (this.sources.get(binding.source.id) !== binding.source) throw new Error('视频来源已断开，请到原服务后台查询。');
    this.update(binding, task);
    return task;
  }
  private update(binding: Binding, task: KouboTask): void {
    const wasFinished = binding.task && !['queued', 'running'].includes(binding.task.status);
    binding.task = task;
    if (!wasFinished && !['queued', 'running'].includes(task.status)) binding.expiresAt = this.now() + FINISHED_TTL;
  }
}
