import z from '@deepseek-ai/schemastery';
import type { Volatile } from '@deepseek-ai/cordis';
import type { AvatarReference } from './avatar-catalog.js';
export interface Config {
    baseUrl: Volatile<string>;
    apiKey: Volatile<string>;
    avatarReferences: Volatile<AvatarReference[]>;
}
export declare const Config: z;
