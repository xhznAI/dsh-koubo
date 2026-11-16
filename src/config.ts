import z from '@deepseek-ai/schemastery';
import type { Volatile } from '@deepseek-ai/cordis';
import type { AvatarReference } from './avatar-catalog.js';

export interface Config { baseUrl: Volatile<string>; apiKey: Volatile<string>; avatarReferences: Volatile<AvatarReference[]> }
export const Config: z = z.object({
  baseUrl: z.string().default('https://api.x.ai').description('Grok API 地址（Base URL）').volatile(),
  apiKey: z.string().role('secret').default('').description('Grok API Key').volatile(),
  avatarReferences: z.array(z.object({ id: z.string(), imagePath: z.string(), name: z.string(), imagePrompt: z.string(), favorite: z.boolean(),
    mime: z.union(['image/png', 'image/jpeg', 'image/webp']), bytes: z.number(), createdAt: z.string(), updatedAt: z.string(), removed: z.boolean().default(false),
  })).default([]).volatile(),
});
