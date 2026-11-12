import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
export declare function mediaCommand(binary: string, args: string[], signal: AbortSignal): Promise<string>;
/** 只做本地规范化与拼接；不改写口播、不生成字幕时间轴、不再次调用模型。 */
export declare function assembleClips(ctx: Context, exec: ToolExecution, paths: string[], aspectRatio: '16:9' | '9:16' | '1:1'): Promise<{
    path: string;
    bytes: number;
    format: string;
    width: number;
    height: number;
    clips: number;
}>;
