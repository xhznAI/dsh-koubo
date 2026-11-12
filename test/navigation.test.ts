import { expect, it, vi } from 'vitest';
import type { Context } from '@deepseek-ai/cordis';
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import { currentConversation, preparePrompt } from '../src/client/navigation.js';
import { templates, stylePrompt } from '../src/catalog.js';
it('样式使用已有模板，并只初始化草稿，不触发发送或付费生成', () => {
  const draft = vi.fn().mockReturnValue('applied'), select = vi.fn(), start = vi.fn();
  const state = { byId: { inactive: { id: 'inactive', retainedBy: {} }, active: { id: 'active', retainedBy: { mainView: 1 } } } } as unknown as SessionListState;
  const binding = { sessionId: 'active' };
  const ctx = { sessions: { list: { getSnapshot: () => state }, binding: () => binding }, conversation: { input: { requestDraftInitialization: draft } },
    layout: { selectPanel: select }, uiWorkspace: { startSession: start } } as unknown as Context;
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  try {
    expect(currentConversation(state)?.id).toBe('active');
    for (const template of templates) { const prompt = stylePrompt(template); preparePrompt(ctx, prompt); expect(draft).toHaveBeenLastCalledWith(binding, { prompt, whenDraftExists: 'append' }); expect(prompt).toContain(template.id); }
    expect(start).not.toHaveBeenCalled(); expect(select).toHaveBeenCalledWith(null);
    draft.mockReturnValue('blocked'); expect(() => preparePrompt(ctx, '测试')).toThrow('正在发送');
    state.byId = {}; preparePrompt(ctx, '新创作'); expect(start).toHaveBeenCalledWith(undefined, { prompt: '新创作', whenDraftExists: 'append' });
  } finally { vi.unstubAllGlobals(); }
});
