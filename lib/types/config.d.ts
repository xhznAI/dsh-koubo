import z from '@deepseek-ai/schemastery';
import type { Volatile } from '@deepseek-ai/cordis';
export interface Config {
    baseUrl: Volatile<string>;
    apiKey: Volatile<string>;
}
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    baseUrl: z<string, string, "volatile-defined">;
    apiKey: z<string, string, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    baseUrl: z<string, string, "volatile-defined">;
    apiKey: z<string, string, "volatile-defined">;
}>>, "plain">;
