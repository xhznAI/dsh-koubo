import type { Context } from '@deepseek-ai/cordis';
import { type KouboSources } from './api/index.js';
import { Config } from './config.js';
export { Config };
export declare const name = "koubo";
export declare const inject: string[];
declare module '@deepseek-ai/cordis' {
    interface Context {
        kouboSources: KouboSources;
    }
}
export declare function apply(ctx: Context, config: Config): void;
