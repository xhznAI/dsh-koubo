import { z } from 'zod';
import type { Avatar, AvatarLibrary } from './avatar-catalog.js';
export declare const avatarId: z.ZodEffects<z.ZodString, string, string>;
export declare const avatarDetails: z.ZodObject<{
    name: z.ZodString;
    imagePrompt: z.ZodDefault<z.ZodString>;
    favorite: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    name: string;
    imagePrompt: string;
    favorite: boolean;
}, {
    name: string;
    imagePrompt?: string | undefined;
    favorite?: boolean | undefined;
}>;
export declare const avatarUpload: z.ZodObject<{
    name: z.ZodString;
    imagePrompt: z.ZodDefault<z.ZodString>;
    favorite: z.ZodDefault<z.ZodBoolean>;
} & {
    image: z.ZodString;
}, "strict", z.ZodTypeAny, {
    name: string;
    imagePrompt: string;
    favorite: boolean;
    image: string;
}, {
    name: string;
    image: string;
    imagePrompt?: string | undefined;
    favorite?: boolean | undefined;
}>;
/** 直接扫描人物图目录；生图工具保存的普通图片无需登记即可显示。 */
export declare function avatarRoot(cwd: string | undefined, create?: boolean): Promise<string | null>;
export declare function readAvatar(root: string, id: string): Promise<Avatar>;
export declare function readAvatars(cwd: string | undefined, signal: AbortSignal): Promise<AvatarLibrary>;
export declare function importAvatar(root: string, value: unknown, signal: AbortSignal): Promise<Avatar>;
export declare function avatarImage(root: string, id: string): Promise<{
    mime: Avatar['mime'];
    bytes: Buffer;
}>;
