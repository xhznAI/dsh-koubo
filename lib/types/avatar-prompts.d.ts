import type { Avatar } from './avatar-catalog.js';
export declare const avatarPresets: readonly [{
    readonly name: "知识讲解";
    readonly description: "一位亲切、专注的成年知识讲解者，穿简洁的纯色衬衫，背景是整洁明亮的书房，柔和自然光。";
}, {
    readonly name: "生活分享";
    readonly description: "一位自然、有亲和力的成年内容创作者，穿素色休闲上衣，背景是干净温馨的生活空间，明亮柔和的光线。";
}, {
    readonly name: "商务介绍";
    readonly description: "一位沉稳、自信的成年产品讲解者，穿简洁的商务休闲服装，背景是现代工作室，柔和均匀布光。";
}];
export declare function avatarCreationPrompt(description: string, ratio: string): string;
export declare function useAvatarPrompt(item: Avatar): string;
