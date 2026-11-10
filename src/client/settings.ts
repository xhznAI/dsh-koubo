import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import { apiBase } from '../http.js';

export interface Settings { baseUrl: string }

/** 只写入用户编辑的字段，空密钥保留原值。 */
export async function saveSettings(form: ConfigForm<Settings>, baseUrl: string, apiKey: string): Promise<boolean> {
  const url = baseUrl.trim();
  apiBase(url);
  const snapshot = form.getSnapshot();
  if (snapshot.status !== 'ready' || !snapshot.writable) return false;
  return form.mutate([
    { op: 'set', path: ['baseUrl'], value: url },
    ...(apiKey.trim() ? [{ op: 'set' as const, path: ['apiKey'], value: apiKey.trim() }] : []),
  ], snapshot.revision);
}
