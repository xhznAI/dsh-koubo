import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import { type Fetch } from './http.js';
/** 文件只写入会话工作区，遵守只读策略；输出目录不能借助链接跳出工作区。 */
export declare function outputDirectory(ctx: Context, exec: ToolExecution): Promise<string>;
export declare function readLocal(ctx: Context, exec: ToolExecution, path: string, maxBytes: number): Promise<Buffer>;
export declare function imageMime(bytes: Buffer): string;
export declare function imageData(bytes: Buffer): string;
export declare function validateMp4(bytes: Buffer): void;
export declare function fetchVideo(url: string, signal: AbortSignal, fetcher?: Fetch): Promise<Buffer>;
export declare function saveVideo(ctx: Context, exec: ToolExecution, bytes: Buffer): Promise<{
    path: string;
    bytes: number;
    format: "mp4";
}>;
