import { createRoot } from 'react-dom/client';
import { Studio } from '../../src/client/Studio.js';
import { STYLES } from '../../src/client/styles.js';
import type { Context } from '@deepseek-ai/cordis';
const style = document.createElement('style'); style.textContent = STYLES; document.head.append(style);
let state = { byId: { demo: { id: 'demo', cwd: '/demo/口播工作区', retainedBy: { mainView: 1 } } } };
const listeners = new Set<() => void>();
const output = (value: string) => { document.querySelector('#output')!.textContent = value; };
const ctx = {
  sessions: { list: { subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); }, getSnapshot: () => state }, binding: (sessionId: string) => ({ sessionId }), scope: () => ({}) },
  layout: { selectPanel: () => {}, panelInfo: { getSnapshot: () => ({ activePanelId: 'dsh-koubo' }) } },
  uiWorkspace: { startSession: (_: unknown, options: { prompt: string }) => output(options.prompt) },
  conversation: { input: { requestDraftInitialization: (binding: { sessionId: string }, options: { prompt: string }) => { document.querySelector('#draft-session')!.textContent = `当前草稿会话：${binding.sessionId}`; output(options.prompt); return 'applied'; } } },
  sidebarRight: { openResource: (value: string) => output(value) },
} as unknown as Context;
document.querySelector('#empty')!.addEventListener('click', () => { state = { byId: {} } as typeof state; listeners.forEach(listener => listener()); });
document.querySelector('#workspace-a')!.addEventListener('click', () => { state = { byId: { demo: { id: 'demo', cwd: '/demo/口播工作区', retainedBy: { mainView: 1 } } } }; listeners.forEach(listener => listener()); });
document.querySelector('#workspace-b')!.addEventListener('click', () => { state = { byId: { other: { id: 'other', cwd: '/demo/另一个工作区', retainedBy: { mainView: 1 } } } } as unknown as typeof state; listeners.forEach(listener => listener()); });
createRoot(document.querySelector('#root')!).render(<Studio ctx={ctx}/>);
