import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-skill';
import type {} from '@deepseek-ai/dsh-settings';
import { SourceRegistry, type KouboSources } from './api/index.js';
import { Config } from './config.js';
import { createGrokSource } from './grok.js';
import { TaskRuntime } from './runtime.js';
import { kouboTools } from './tools.js';
import { kouboSkill } from './skills.js';

export { Config };
export const name = 'koubo';
export const inject = ['tools', 'skills', 'fs', 'workingDirectory', 'sandboxPolicy', 'settings'];
declare module '@deepseek-ai/cordis' { interface Context { kouboSources: KouboSources } }

export function apply(ctx: Context, config: Config): void {
  const registry = new SourceRegistry();
  let current: { baseUrl: string; apiKey: string } | undefined;
  let unregister: (() => void) | undefined;
  // 读取当前设置；连接变化时替换来源实例，避免旧任务被送到新渠道。
  const refresh = () => {
    const next = { baseUrl: config.baseUrl.get(), apiKey: config.apiKey.get() };
    if (current?.baseUrl === next.baseUrl && current.apiKey === next.apiKey) return;
    const source = createGrokSource(next);
    unregister?.();
    unregister = registry.register(source);
    current = next;
  };
  const sources: KouboSources = {
    register: source => registry.register(source),
    list: () => { refresh(); return registry.list(); },
    get: id => { refresh(); return registry.get(id); },
  };
  refresh();
  const runtime = new TaskRuntime(sources);
  const lifetime = new AbortController();
  ctx.provide('kouboSources', sources);
  ctx.effect(() => () => { lifetime.abort(); runtime.clear(); });
  ctx.skills.registerProvider(kouboSkill);
  for (const tool of kouboTools(ctx, sources, runtime)) ctx.tools.register({ ...tool,
    execute: (args, exec) => tool.execute(args, { ...exec, signal: AbortSignal.any([exec.signal, lifetime.signal]) }),
  });
}
