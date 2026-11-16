import type { Avatar } from './avatar-catalog.js';

export const avatarPresets = [
  { name: '知识讲解', description: '一位亲切、专注的成年知识讲解者，穿简洁的纯色衬衫，背景是整洁明亮的书房，柔和自然光。' },
  { name: '生活分享', description: '一位自然、有亲和力的成年内容创作者，穿素色休闲上衣，背景是干净温馨的生活空间，明亮柔和的光线。' },
  { name: '商务介绍', description: '一位沉稳、自信的成年产品讲解者，穿简洁的商务休闲服装，背景是现代工作室，柔和均匀布光。' },
] as const;

export function avatarCreationPrompt(description: string, ratio: string): string {
  return [
    `请用图片生成工具制作一张用于数字人口播的人物图，画面比例 ${ratio}。`,
    description.trim(),
    '单人正面中景，目视镜头，完整呈现头部与肩膀，嘴部无遮挡、自然闭合，表情放松。给头顶、双肩和下方保留裁切与字幕空间。人物清晰、细节自然，不添加文字、水印、分屏或拼贴。',
    '请将最终图片保存到当前工作区的 video/koubo/avatars/ 文件夹，使用新的 PNG、JPEG 或 WebP 文件名，不覆盖已有图片。完成后告诉我保存路径，我会在口播工作室的形象页刷新，将图片保存为可跨工作区使用的本机引用。',
  ].join('\n\n');
}
export function useAvatarPrompt(item: Avatar): string {
  return `请用该形象制作口播视频，人物使用 ${JSON.stringify(item.name)}，本机图片引用 imagePath=${JSON.stringify(item.imagePath)}。请使用这张图片的实际路径，即使图片来自其他工作区也沿用此形象；在当前工作区保存本次工程和成片。请沿用我的样式选择，先确认讲稿和时长，再制作一个代表片段检查人物、声音和口型。`;
}
