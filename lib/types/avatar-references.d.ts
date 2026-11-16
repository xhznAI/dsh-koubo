import { z } from 'zod';
import type { Avatar, AvatarLibrary, AvatarReference } from './avatar-catalog.js';
export declare const avatarReferenceId: z.ZodString;
export declare const avatarReferenceUpdate: z.ZodObject<{
    name: z.ZodString;
    imagePrompt: z.ZodDefault<z.ZodString>;
    favorite: z.ZodDefault<z.ZodBoolean>;
} & {
    id: z.ZodString;
    updatedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    id: string;
    updatedAt: string;
    name: string;
    imagePrompt: string;
    favorite: boolean;
}, {
    id: string;
    updatedAt: string;
    name: string;
    imagePrompt?: string | undefined;
    favorite?: boolean | undefined;
}>;
export declare const avatarReferenceRemove: z.ZodObject<{
    id: z.ZodString;
    updatedAt: z.ZodString;
}, "strict", z.ZodTypeAny, {
    id: string;
    updatedAt: string;
}, {
    id: string;
    updatedAt: string;
}>;
export declare const avatarReferenceLink: z.ZodObject<{
    name: z.ZodString;
    imagePrompt: z.ZodDefault<z.ZodString>;
    favorite: z.ZodDefault<z.ZodBoolean>;
} & {
    imagePath: z.ZodString;
}, "strict", z.ZodTypeAny, {
    imagePath: string;
    name: string;
    imagePrompt: string;
    favorite: boolean;
}, {
    imagePath: string;
    name: string;
    imagePrompt?: string | undefined;
    favorite?: boolean | undefined;
}>;
/** 仅保存本机图片引用与收藏偏好，切换工作区不会复制或移动原图。 */
export declare class AvatarReferences {
    private readonly current;
    private readonly save;
    private queue;
    constructor(current: () => readonly AvatarReference[], save: (items: AvatarReference[]) => Promise<unknown>);
    private serial;
    private resolve;
    refresh(cwd: string | undefined, signal: AbortSignal): Promise<AvatarLibrary>;
    get(id: string): Promise<Avatar>;
    add(root: string, item: Avatar, signal: AbortSignal): Promise<Avatar>;
    link(value: unknown, cwd: string | undefined, signal: AbortSignal): Promise<Avatar>;
    update(value: unknown, signal: AbortSignal): Promise<Avatar>;
    remove(value: unknown, signal: AbortSignal): Promise<void>;
}
