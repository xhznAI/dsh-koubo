import { expect, it } from 'vitest';
import { avatarCreationPrompt } from '../src/avatar-prompts.js';
import { useAvatarPrompt } from '../src/avatar-prompts.js';
import type { Avatar } from '../src/avatar-catalog.js';

it('生图指令保留人物要求和比例，并明确保存到可直接发现的数字人目录', () => {
  const text = avatarCreationPrompt('短发，蓝色衬衫，书房背景', '16:9');
  expect(text).toContain('短发，蓝色衬衫，书房背景'); expect(text).toContain('16:9');
  expect(text).toContain('video/koubo/avatars/'); expect(text).toContain('不覆盖已有图片');
  expect(text).not.toContain('koubo_generate');
});

it('使用形象制作带入原文件引用并将新工程留在当前工作区', () => {
  const text = useAvatarPrompt({ name: '形象', imagePath: '/other/workspace/形象.png' } as Avatar);
  expect(text).toContain('imagePath="/other/workspace/形象.png"'); expect(text).toContain('当前工作区保存本次工程和成片');
});
