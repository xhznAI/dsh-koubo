import { type Library } from './catalog.js';
export declare class LibraryError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare const videoType: (path: string) => "video/mp4" | "video/webm" | "video/quicktime" | undefined;
/** 只读取本地口播目录；拒绝文件及任意祖先目录的符号链接。 */
export declare function libraryRoot(cwd: string | undefined): Promise<string | null>;
export declare function resolveVideo(root: string, path: string): Promise<string>;
export declare function readLibrary(cwd: string | undefined, signal: AbortSignal): Promise<Library>;
/** 单段 Range 支持拖动视频进度与尾部索引读取。 */
export declare function byteRange(header: string | undefined, size: number): {
    start: number;
    end: number;
    partial: boolean;
};
