import { type KouboModel, type KouboModelSource } from './api/index.js';
import { type Fetch } from './http.js';
export declare const GROK_MODEL: KouboModel;
/** 只发送官方异步协议；费用和调用统计由 API 服务端维护。 */
export declare function createGrokSource(config: {
    baseUrl: string;
    apiKey: string;
}, fetcher?: Fetch): KouboModelSource;
