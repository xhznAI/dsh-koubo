import { useEffect, useRef, useState } from 'react';
import type { Avatar, AvatarLibrary } from '../avatar-catalog.js';

export function useAvatars(sessionId?: string, cwd?: string) {
  const scope = JSON.stringify([sessionId, cwd]);
  const [result, setResult] = useState<{ scope: string; data: AvatarLibrary }>();
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false);
  const lifetime = useRef<{ scope: string; abort: AbortController }>();
  useEffect(() => {
    const abort = new AbortController(); lifetime.current = { scope, abort }; setBusy(false);
    return () => abort.abort();
  }, [scope]);
  useEffect(() => {
    const abort = new AbortController(); setError('');
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(`/dsh-koubo/avatars${sessionId ? `?${new URLSearchParams({ sessionId })}` : ''}`, { credentials: 'same-origin', signal: abort.signal });
        if (!response.ok) throw new Error('无法读取形象引用，请重试。');
        const data = await response.json() as AvatarLibrary;
        if (!abort.signal.aborted) setResult({ scope, data });
      } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : '无法读取形象。'); }
      finally { if (!abort.signal.aborted) setLoading(false); }
    })();
    return () => abort.abort();
  }, [scope, sessionId, revision]);
  const refresh = () => setRevision(value => value + 1);
  const mutate = async (method: 'POST' | 'PATCH' | 'DELETE', value: unknown): Promise<Avatar | undefined> => {
    const active = lifetime.current;
    if ((!sessionId && method === 'POST') || !active || active.scope !== scope || active.abort.signal.aborted) throw new Error('请先打开工作区对话。');
    if (busy) throw new Error('正在保存，请稍候。');
    setBusy(true); setError('');
    try {
      const response = await fetch(`/dsh-koubo/avatars${sessionId ? `?${new URLSearchParams({ sessionId })}` : ''}`, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value), signal: active.abort.signal });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(detail.message ?? '保存失败，请刷新后重试。');
      }
      const data = response.status === 204 ? undefined : await response.json() as Avatar;
      active.abort.signal.throwIfAborted(); refresh(); return data;
    } finally { if (!active.abort.signal.aborted) setBusy(false); }
  };
  const use = async (id: string): Promise<Avatar> => {
    const active = lifetime.current;
    if (!active || active.scope !== scope || active.abort.signal.aborted) throw new Error('对话已变化，请重新选用形象。');
    setBusy(true);
    try {
      const response = await fetch('/dsh-koubo/avatar-use', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }), signal: active.abort.signal });
      if (!response.ok) { const detail = await response.json().catch(() => ({})) as { message?: string }; refresh(); throw new Error(detail.message ?? '形象引用不可用，请刷新后重试。'); }
      const item = await response.json() as Avatar;
      active.abort.signal.throwIfAborted(); return item;
    } finally { if (!active.abort.signal.aborted) setBusy(false); }
  };
  return { data: result?.scope === scope ? result.data : undefined, loading, error, busy, refresh, mutate, use };
}
export type AvatarStore = ReturnType<typeof useAvatars>;
