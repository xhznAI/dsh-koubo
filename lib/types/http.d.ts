export type Fetch = typeof globalThis.fetch;
export declare function apiBase(value: string): URL;
export declare function videoUrl(value: string): URL;
export declare function readBounded(response: Response, limit: number): Promise<Uint8Array>;
export declare function jsonRequest(fetcher: Fetch, url: URL, key: string, signal: AbortSignal, body?: unknown): Promise<unknown>;
