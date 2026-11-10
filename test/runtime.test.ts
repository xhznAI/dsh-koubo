import { describe, expect, it, vi } from 'vitest';
import { SourceRegistry, type KouboModelSource } from '../src/api/index.js';
import { GROK_MODEL } from '../src/grok.js';
import { TaskRuntime } from '../src/runtime.js';

const signal = () => new AbortController().signal;
const input = { model: GROK_MODEL.id, prompt: '欢迎收看。', duration: 4, resolution: '720p', aspectRatio: '16:9' };
function source(id = 'grok'): KouboModelSource {
  return { id, label: id, available: true, listModels: vi.fn(async () => [GROK_MODEL]),
    create: vi.fn(async () => ({ id: `${id}-job`, status: 'queued' })),
    get: vi.fn(async task => ({ id: task, status: 'running' })) };
}

describe('只存在于内存的任务路由', () => {
  it('并发或重复提交同一操作只调用一次服务', async () => {
    const registry = new SourceRegistry(), grok = source(); registry.register(grok);
    const runtime = new TaskRuntime(registry);
    await Promise.all(Array.from({ length: 8 }, () => runtime.create('session-a', 'op', 'grok', input, signal())));
    expect(grok.create).toHaveBeenCalledTimes(1);
    await runtime.create('session-a', 'op', 'grok', input, signal());
    expect(grok.create).toHaveBeenCalledTimes(1);
    await expect(runtime.create('session-a', 'op', 'grok', { ...input, prompt: '新内容' }, signal())).rejects.toThrow('参数');
  });

  it('来源和会话隔离，选择另一来源不改变已有任务', async () => {
    const registry = new SourceRegistry(), grok = source(), nex = source('nex'); registry.register(grok); registry.register(nex);
    const runtime = new TaskRuntime(registry);
    await runtime.create('session-a', 'one', 'grok', input, signal());
    await runtime.create('session-a', 'two', 'nex', input, signal());
    await runtime.get('session-a', 'one', signal());
    expect(grok.get).toHaveBeenCalledWith('grok-job', expect.any(AbortSignal));
    expect(nex.get).not.toHaveBeenCalled();
    await expect(runtime.get('session-b', 'one', signal())).rejects.toThrow('不可用');
    await expect(runtime.create('session-b', 'one', 'grok', input, signal())).rejects.toThrow('不同会话');
  });

  it('注销旧账号来源后不能将旧任务提交给新账号', async () => {
    const registry = new SourceRegistry(), old = source('nex'), unregister = registry.register(old);
    const runtime = new TaskRuntime(registry);
    await runtime.create('session', 'op', 'nex', input, signal());
    unregister(); const next = source('nex'); registry.register(next);
    await expect(runtime.get('session', 'op', signal())).rejects.toThrow('不可用');
    expect(next.get).not.toHaveBeenCalled();
  });

  it('未知提交结果不会因重试再次扣费', async () => {
    const registry = new SourceRegistry(), grok = source();
    vi.mocked(grok.create).mockRejectedValue(new Error('服务断开')); registry.register(grok);
    const runtime = new TaskRuntime(registry);
    await expect(runtime.create('session', 'op', 'grok', input, signal())).rejects.toThrow('断开');
    await expect(runtime.create('session', 'op', 'grok', input, signal())).rejects.toThrow('结果未知');
    await expect(runtime.get('session', 'op', signal())).rejects.toThrow('结果未知');
    expect(grok.create).toHaveBeenCalledTimes(1);
  });

  it('提交前验证失败可修正参数再调用，不占用生成额度', async () => {
    const registry = new SourceRegistry(), grok = source(); registry.register(grok);
    const runtime = new TaskRuntime(registry);
    await expect(runtime.create('session', 'op', 'grok', { ...input, duration: 99 }, signal())).rejects.toThrow('时长');
    await runtime.create('session', 'op', 'grok', input, signal());
    expect(grok.create).toHaveBeenCalledTimes(1);
  });

  it('完成句柄会过期，清理与重启不恢复历史', async () => {
    let now = 1;
    const registry = new SourceRegistry(), grok = source(); registry.register(grok);
    vi.mocked(grok.get).mockResolvedValue({ id: 'grok-job', status: 'succeeded', video: { url: 'https://cdn.example/a.mp4', duration: 4, format: 'mp4' } });
    const runtime = new TaskRuntime(registry, () => now);
    await runtime.create('session', 'op', 'grok', input, signal());
    await runtime.get('session', 'op', signal());
    now += 15 * 60 * 1000;
    await expect(runtime.get('session', 'op', signal())).rejects.toThrow('不可用');
    await runtime.create('session', 'next', 'grok', input, signal());
    await expect(new TaskRuntime(registry).get('session', 'next', signal())).rejects.toThrow('不可用');
    runtime.clear();
    await expect(runtime.get('session', 'next', signal())).rejects.toThrow('不可用');
  });

  it('容量限制与任务编号校验阻止无限积累和错配', async () => {
    const registry = new SourceRegistry(), grok = source(); registry.register(grok);
    const runtime = new TaskRuntime(registry, Date.now, 1);
    await runtime.create('session', 'one', 'grok', input, signal());
    await expect(runtime.create('session', 'two', 'grok', input, signal())).rejects.toThrow('过多');
    vi.mocked(grok.get).mockResolvedValue({ id: 'different', status: 'running' });
    await expect(runtime.get('session', 'one', signal())).rejects.toThrow('不匹配');
  });

  it('同名来源不能覆盖已经注册的实例', () => {
    const registry = new SourceRegistry(); registry.register(source());
    expect(() => registry.register(source())).toThrow('已注册');
  });
});
