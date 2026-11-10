import type { KouboModel } from './api/index.js';

const words = new Intl.Segmenter('zh', { granularity: 'word' });
function spokenSeconds(text: string): number {
  let seconds = 0;
  for (const part of words.segment(text)) {
    if (!part.isWordLike) continue;
    const cjk = part.segment.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length ?? 0;
    seconds += cjk ? cjk / 4.5 : 1 / 2.4;
  }
  return seconds;
}

/** 时长仅用于分段，实际语速须检查生成结果；不据此推算或记录费用。 */
export function planNarration(text: string, model: KouboModel, targetSeconds = Math.max(model.minSeconds, Math.min(12, model.maxSeconds))) {
  const narration = text.trim();
  if (!narration || narration.length > 12000) throw new Error('口播稿须为 1 至 12000 个字符。');
  if (!Number.isInteger(targetSeconds) || targetSeconds < Math.max(2, model.minSeconds) || targetSeconds > model.maxSeconds) throw new Error('目标片段时长超出模型范围。');
  const segments: { id: string; narration: string; duration: number }[] = [];
  let buffer = '';
  const flush = () => {
    if (!buffer.trim()) return;
    segments.push({ id: `clip-${String(segments.length + 1).padStart(2, '0')}`, narration: buffer.trim(),
      duration: Math.max(model.minSeconds, Math.ceil(spokenSeconds(buffer) + 1)) });
    buffer = '';
  };
  for (const token of words.segment(narration)) {
    if (buffer.trim() && Math.ceil(spokenSeconds(buffer + token.segment) + 1) > targetSeconds) flush();
    buffer += token.segment;
    if (/[。！？!?；;\n]$/u.test(token.segment) && spokenSeconds(buffer) >= (targetSeconds - 1) * 0.5) flush();
  }
  flush();
  if (segments.some(segment => segment.duration > targetSeconds)) throw new Error('存在过长片段，请在口播稿中补充分句。');
  return { model: model.id, segments, estimatedSeconds: segments.reduce((sum, segment) => sum + segment.duration, 0),
    message: '时长为语速估算；先检查一个片段的人物、发音和口型，再继续生成。' };
}

export function talkingPrompt(input: { narration: string; language: string; visual: string; voice: string }): string {
  return [
    'Create one continuous talking-presenter shot. Keep the same presenter identity, clothing and camera framing as the supplied first-frame image when present.',
    `Visual direction: ${input.visual || 'A presenter facing the camera, subtle natural gestures, clean uncluttered background.'}`,
    `Speech language: ${input.language}. Voice direction: ${input.voice || 'Natural, clear, conversational delivery at a steady pace.'}`,
    `Speak exactly this narration, with synchronized lips: ${JSON.stringify(input.narration)}`,
    'No extra spoken introduction, no added words, no background music, no burned-in subtitles. Keep a short natural pause at the end.',
  ].join('\n');
}
