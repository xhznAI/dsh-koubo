import type {} from '@deepseek-ai/dsh-client-ui-session/client';
import type { Context } from '@deepseek-ai/cordis';
import type { ISessions, SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client';
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client';
import type {} from '@deepseek-ai/dsh-client-ui-layout/client';
export const currentConversation = (state: SessionListState) => Object.values(state.byId).find(session => (session.retainedBy.mainView ?? 0) > 0);

/** 只填入草稿，保留已有输入与附件，由用户确认后发送。 */
export function preparePrompt(ctx: Context, prompt: string): void {
  const sessions = ctx.sessions as unknown as ISessions;
  const session = currentConversation(sessions.list.getSnapshot());
  if (!session) { ctx.uiWorkspace.startSession(undefined, { prompt, whenDraftExists: 'append' }); return; }
  const binding = sessions.binding(session.id);
  if (!binding) throw new Error('请重新打开工作区对话。');
  if (ctx.conversation.input.requestDraftInitialization(binding, { prompt, whenDraftExists: 'append' }) === 'blocked') throw new Error('正在发送消息，请稍后再试。');
  ctx.layout.selectPanel(null);
  requestAnimationFrame(() => {
    if (ctx.layout.panelInfo.getSnapshot().activePanelId !== null || currentConversation(sessions.list.getSnapshot())?.id !== session.id) return;
    const scope = sessions.scope(session.id); if (scope) ctx.conversation.input.for(scope).focus();
  });
}
