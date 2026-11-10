import z from '@deepseek-ai/schemastery';
import type { Volatile } from '@deepseek-ai/cordis';

export interface Config { baseUrl: Volatile<string>; apiKey: Volatile<string> }
export const Config = z.object({
  baseUrl: z.string().default('https://api.x.ai').description('Grok API 地址（Base URL）').volatile(),
  apiKey: z.string().role('secret').default('').description('Grok API Key').volatile(),
});
