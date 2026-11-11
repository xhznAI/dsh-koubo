import type { Context } from '@deepseek-ai/cordis';
import type { KouboGeneration, KouboModel, KouboSources, KouboTask } from 'dsh-koubo/api';

declare module '@deepseek-ai/cordis' { interface Context { kouboSources: KouboSources } }

/** 此类型由官方库连接其真实客户端；示例不假设尚未实现的服务路由。 */
interface NexVideoClient {
  listModels(signal: AbortSignal): Promise<KouboModel[]>;
  create(input: KouboGeneration, signal: AbortSignal): Promise<KouboTask>;
  get(taskId: string, signal: AbortSignal): Promise<KouboTask>;
}

/** 放在官方库中，绑定当前账号客户端；登出时销毁对应作用域。 */
export function installNexKouboSource(ctx: Context, client: NexVideoClient): void {
  ctx.inject(['kouboSources'], scope => {
    scope.effect(() => scope.kouboSources.register({
      id: 'nex', label: 'Nex 视频', available: true,
      listModels: signal => client.listModels(signal),
      create: (input, signal) => client.create(input, signal),
      get: (taskId, signal) => client.get(taskId, signal),
    }));
  });
}
