import { useState, useSyncExternalStore } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client';
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives';
import { saveSettings, type Settings } from './settings.js';

import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client';
import { Studio, StudioIcon } from './Studio.js';
import { STYLES } from './styles.js';

export const inject = ['slots', 'configForms', 'layout', 'sessions', 'conversation', 'uiWorkspace', 'sidebarRight'];

function GrokSettings({ settings }: { settings: ConfigForm<Settings> }) {
  const state = useSyncExternalStore(listener => settings.subscribe(listener), () => settings.getSnapshot());
  const [draftUrl, setUrl] = useState<string>();
  const [apiKey, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const baseUrl = draftUrl ?? state.value?.baseUrl ?? '';
  const disabled = state.status !== 'ready' || !state.writable || busy;
  return <form aria-label="Grok 视频渠道" style={{ display: 'grid', gap: 16, maxWidth: 580 }} onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (await saveSettings(settings, baseUrl, apiKey)) { setKey(''); setUrl(undefined); setMessage('已保存'); }
      else setMessage('配置已变化，请检查后重新保存。');
    } catch { setMessage('保存失败，请检查 API 地址后重试。'); }
    finally { setBusy(false); }
  }}>
    <label style={{ display: 'grid', gap: 8 }}>Base URL
      <Input aria-label="Grok Base URL" value={baseUrl} onChange={event => { setUrl(event.target.value); setMessage(''); }}
        disabled={disabled} placeholder="https://api.x.ai" autoComplete="off" spellCheck={false} />
    </label>
    <label style={{ display: 'grid', gap: 8 }}>API Key
      <Input aria-label="Grok API Key" type="password" value={apiKey} onChange={event => { setKey(event.target.value); setMessage(''); }}
        disabled={disabled} placeholder="填写 API Key；留空保留已保存密钥" autoComplete="new-password" />
    </label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Button type="submit" variant="primary" disabled={disabled}>{busy ? '保存中…' : '保存'}</Button>
      <span role="status">{state.status === 'loading' ? '正在加载…' : state.status === 'unavailable' ? '请启用口播插件。' : message}</span>
    </div>
  </form>;
}

export function apply(ctx: Context): void {
  ctx.effect(() => { const style = document.createElement('style'); style.textContent = STYLES; document.head.append(style); return () => style.remove(); });
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'dsh-koubo' }, () => <Studio ctx={ctx}/>));
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'dsh-koubo', order: 15, label: () => '口播工作室' }, StudioIcon));
  const settings = ctx.configForms.get<Settings>('koubo');
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
    name: 'plugins.bundle.config', key: 'dsh-koubo', inject: () => ({ settings }),
  }, GrokSettings));
}
