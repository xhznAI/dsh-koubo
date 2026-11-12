import { createRoot } from 'react-dom/client';
import { Studio } from '../../src/client/Studio.js';
import { STYLES } from '../../src/client/styles.js';
import type { Context } from '@deepseek-ai/cordis';
const style = document.createElement('style'); style.textContent = STYLES; document.head.append(style);
let state = { byId: { demo: { id: 'demo', cwd: '/demo/口播工作区', retainedBy: { mainView: 1 } } } };
const listeners = new Set<() => void>();
const output = (value: string) => { document.querySelector('#output')!.textContent = value; };
const ctx = {
  sessions: { list: { subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); }, getSnapshot: () => state }, binding: () => ({}), scope: () => ({}) },
  layout: { selectPanel: () => {}, panelInfo: { getSnapshot: () => ({ activePanelId: 'dsh-koubo' }) } },
  uiWorkspace: { startSession: (_: unknown, options: { prompt: string }) => output(options.prompt) },
  conversation: { input: { requestDraftInitialization: (_: unknown, options: { prompt: string }) => { output(options.prompt); return 'applied'; } } },
  sidebarRight: { openResource: (value: string) => output(value) },
} as unknown as Context;
document.querySelector('#empty')!.addEventListener('click', () => { state = { byId: {} } as typeof state; listeners.forEach(listener => listener()); });
createRoot(document.querySelector('#root')!).render(<Studio ctx={ctx}/>);
