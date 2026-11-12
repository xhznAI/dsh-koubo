import type { Context } from '@deepseek-ai/cordis';
import type { ToolDefinition } from '@deepseek-ai/dsh-tools';
import { type KouboSources } from './api/index.js';
import { TaskRuntime } from './runtime.js';
export declare function kouboTools(ctx: Context, sources: KouboSources, runtime: TaskRuntime): ToolDefinition[];
