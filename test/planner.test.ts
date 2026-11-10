import { expect, it } from 'vitest';
import { planNarration, talkingPrompt } from '../src/planner.js';
import { GROK_MODEL } from '../src/grok.js';

it('长中文脚本按模型时长分段，保留台词内容', () => {
  const text = '今天我们介绍数字人口播。先准备自己的参考图片，然后整理完整的讲解稿。'.repeat(8);
  const plan = planNarration(text, GROK_MODEL);
  expect(plan.segments.length).toBeGreaterThan(1);
  expect(plan.segments.map(item => item.narration).join('')).toBe(text);
  expect(plan.segments.every(item => item.duration <= 12 && item.duration >= GROK_MODEL.minSeconds)).toBe(true);
});
it('英文和混合文本按语速估算，分段不丢词', () => {
  const text = 'This is a practical introduction to video generation. 可以使用 Grok 生成视频，版本是 1.5。'.repeat(5);
  const plan = planNarration(text, GROK_MODEL, 8);
  expect(plan.segments.map(item => item.narration).join('').replace(/\s/g, '')).toBe(text.replace(/\s/g, ''));
  expect(plan.segments.every(item => item.duration <= 8)).toBe(true);
});
it('以外部来源的时长能力为准，拒绝超限目标', () => {
  const model = { ...GROK_MODEL, id: 'custom', minSeconds: 4, maxSeconds: 6 };
  expect(planNarration('你好，欢迎收看今天的讲解。', model).segments[0]!.duration).toBeLessThanOrEqual(6);
  expect(() => planNarration('测试', model, 7)).toThrow('超出');
});
it('提示词包含用户台词和声音要求，不含预设人物或计费描述', () => {
  const prompt = talkingPrompt({ narration: '他说：“你好”。', language: '普通话', visual: '书房', voice: '轻松自然' });
  expect(prompt).toContain(JSON.stringify('他说：“你好”。'));
  expect(prompt).toContain('轻松自然');
  expect(prompt).not.toMatch(/credits|renoise|tank|berryxia/i);
});
