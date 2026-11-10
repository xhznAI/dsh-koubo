import { Context } from '@deepseek-ai/cordis';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { SkillProvider } from '@deepseek-ai/dsh-skill';
import { expect, it, vi } from 'vitest';
import * as plugin from '../src/index.js';
import { GROK_MODEL } from '../src/grok.js';

it('可由公开 Cordis 装载，提供原版技能和六个工具，并允许独立官方来源注册', async () => {
  const ctx = new Context(), tools: ToolDefinition[] = [], providers: (() => SkillProvider)[] = [];
  ctx.provide('tools', { register: (tool: ToolDefinition) => { tools.push(tool); } });
  ctx.provide('skills', { registerProvider: (provider: () => SkillProvider) => { providers.push(provider); } });
  for (const name of ['fs', 'workingDirectory', 'sandboxPolicy', 'settings']) ctx.provide(name, {});
  const fiber = ctx.plugin(plugin, { baseUrl: 'https://video.example', apiKey: '' });
  try {
    await expect.poll(() => tools.length).toBe(6);
    expect(ctx.kouboSources.list().map(source => [source.id, source.available])).toEqual([['grok', false]]);
    const unregister = ctx.kouboSources.register({ id: 'nex', label: 'Nex 视频', available: true,
      listModels: async () => [GROK_MODEL], create: async () => ({ id: 'nex-job', status: 'queued' }), get: async id => ({ id, status: 'running' }) });
    expect(ctx.kouboSources.list()).toHaveLength(2);
    unregister(); expect(ctx.kouboSources.list()).toHaveLength(1);
    const provider = providers[0]!(), candidates = await provider.list({} as never);
    expect(candidates[0]!.name).toBe('koubo');
    const content = await provider.get(candidates[0]!, {} as never);
    expect(content!.content).toContain('koubo_generate');
    expect(content!.content).toContain('koubo_template');
    expect(content!.content).toContain('lin-169');
    expect(tools.map(tool => tool.name)).not.toContain('koubo_render');
  } finally { await fiber.dispose(); await ctx.fiber.dispose(); }
});

it('在 DSH 中修改渠道后立即生效，换来源不复用旧连接，也不输出密钥', async () => {
  const send = vi.fn().mockResolvedValue(Response.json({ request_id: 'settings-test' }));
  vi.stubGlobal('fetch', send);
  const ctx = new Context();
  ctx.provide('tools', { register: () => undefined });
  ctx.provide('skills', { registerProvider: () => undefined });
  for (const name of ['fs', 'workingDirectory', 'sandboxPolicy', 'settings']) ctx.provide(name, {});
  let values = { baseUrl: 'https://first.example', apiKey: '' };
  // 宿主保存表单后保留配置引用，下一次读取返回新值。
  const fiber = ctx.plugin({ inject: plugin.inject, apply: (child: Context) => plugin.apply(child, {
    baseUrl: { get: () => values.baseUrl }, apiKey: { get: () => values.apiKey },
  }) });
  try {
    await fiber.await();
    const sources = ctx.kouboSources;
    expect(sources.get('grok')!.available).toBe(false);
    values = { baseUrl: 'https://second.example/v1', apiKey: 'test-configured-key' };
    expect(ctx.kouboSources).toBe(sources);
    const configured = sources.get('grok')!;
    expect(configured.available).toBe(true);
    await configured.create({ model: GROK_MODEL.id, prompt: '测试', duration: 5, resolution: '720p', aspectRatio: '9:16' }, new AbortController().signal);
    expect(String(send.mock.calls[0]![0])).toBe('https://second.example/v1/videos/generations');
    expect(send.mock.calls[0]![1].headers.authorization).toBe('Bearer test-configured-key');
    expect(JSON.stringify(sources.list())).not.toContain('test-configured-key');
    values = { baseUrl: 'https://third.example', apiKey: '' };
    expect(sources.get('grok')).not.toBe(configured);
    expect(sources.get('grok')!.available).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  } finally { await fiber.dispose(); await ctx.fiber.dispose(); vi.unstubAllGlobals(); }
});
