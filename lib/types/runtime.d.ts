import { type KouboGeneration, type KouboSources, type KouboTask } from './api/index.js';
/** 仅保存当前进程的任务路由和防重标识，不写入历史、用量或账单。 */
export declare class TaskRuntime {
    private readonly sources;
    private readonly now;
    private readonly capacity;
    private readonly bindings;
    constructor(sources: KouboSources, now?: () => number, capacity?: number);
    private sweep;
    clear(): void;
    private binding;
    create(owner: string, operationId: string, sourceId: string, raw: KouboGeneration, signal: AbortSignal): Promise<KouboTask>;
    get(owner: string, id: string, signal: AbortSignal): Promise<KouboTask>;
    private update;
}
