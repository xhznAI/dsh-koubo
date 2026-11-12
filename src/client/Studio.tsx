import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Context } from '@deepseek-ai/cordis';
import type { ISessions, SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client';
import { templates, type Library, type LibraryItem } from '../catalog.js';
import { Gallery } from './Gallery.js';
import { currentConversation, preparePrompt } from './navigation.js';

export function StudioIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="m10 9 5 3-5 3Z"/><path d="M7 4v3m10-3v3M7 17v3m10-3v3"/></svg>;
}
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const mediaUrl = (sessionId: string, item: LibraryItem, download = false) => `/dsh-koubo/media?${new URLSearchParams({ sessionId, path: item.path, version: item.modifiedAt, ...(download ? { download: '1' } : {}) })}`;
function WorkCover({ sessionId, item }: { sessionId: string; item: LibraryItem }) {
  const element = useRef<HTMLSpanElement>(null), [visible, setVisible] = useState(false), [ready, setReady] = useState(false);
  useEffect(() => {
    if (!element.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: '100px' });
    observer.observe(element.current); return () => observer.disconnect();
  }, []);
  return <span className="kb-thumbnail" ref={element}><StudioIcon size={38}/>{visible && <video muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} src={`${mediaUrl(sessionId, item)}#t=0.1`} onLoadedData={() => setReady(true)} onError={() => setReady(false)} style={{ opacity: ready ? 1 : 0 }}/>}</span>;
}
function VideoPlayer({ sessionId, item }: { sessionId: string; item: LibraryItem }) {
  const [failed, setFailed] = useState(false);
  return <><video controls playsInline preload="metadata" src={mediaUrl(sessionId, item)} onError={() => setFailed(true)} aria-label={`播放 ${item.name}`}/>{failed && <p role="alert">此视频无法在浏览器播放，请下载后使用本地播放器打开。</p>}</>;
}
function LibraryView({ ctx, sessionId, cwd, prompt }: { ctx: Context; sessionId?: string; cwd?: string; prompt(text: string): void }) {
  const [result, setResult] = useState<{ sessionId: string; cwd?: string; data: Library }>(), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [revision, setRevision] = useState(0), [query, setQuery] = useState(''), [kind, setKind] = useState('finished'), [sort, setSort] = useState('recent'), [selected, setSelected] = useState('');
  useEffect(() => {
    const abort = new AbortController(); setError(''); setSelected('');
    if (!sessionId) { setLoading(false); return () => abort.abort(); }
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch(`/dsh-koubo/library?${new URLSearchParams({ sessionId })}`, { credentials: 'same-origin', signal: abort.signal });
        if (!response.ok) throw new Error('无法读取作品，请确认工作区可用后重试。');
        const data = await response.json() as Library;
        if (!abort.signal.aborted) setResult({ sessionId, cwd, data });
      } catch (failure) { if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : '无法读取作品。'); }
      finally { if (!abort.signal.aborted) setLoading(false); }
    })();
    return () => abort.abort();
  }, [sessionId, cwd, revision]);
  const data = result?.sessionId === sessionId && result?.cwd === cwd ? result?.data : undefined;
  const items = (data?.items ?? []).filter(item => (kind === 'all' || item.kind === kind) && `${item.name} ${item.path} ${templates.find(t => t.id === item.templateId)?.name ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'zh') : b.modifiedAt.localeCompare(a.modifiedAt));
  const active = items.find(item => item.path === selected);
  const resource = (path: string) => {
    if (!sessionId) return;
    ctx.layout.selectPanel(null);
    ctx.sidebarRight.openResource(`dsh-resource://file/session/${encodeURIComponent(sessionId)}/video/koubo/${path.split('/').map(encodeURIComponent).join('/')}`);
  };
  return <><div className="kb-heading"><div><h2>我的作品库</h2><p title={cwd}>{cwd ? `当前工作区 · ${cwd.split(/[/\\]/u).filter(Boolean).at(-1)}` : '打开工作区，找回你的口播作品。'}</p></div><button disabled={loading || !sessionId} onClick={() => setRevision(v => v + 1)}>刷新作品</button></div>
    <div className="kb-library-tools"><div className="kb-filters" aria-label="作品分类">{[['finished', '成片'], ['clip', '生成片段'], ['all', '全部视频']].map(([value, label]) => <button key={value} aria-pressed={kind === value} onClick={() => { setKind(value!); setSelected(''); }}>{label}</button>)}</div><div className="kb-search"><input aria-label="搜索作品" placeholder="搜索作品或样式…" value={query} onChange={event => setQuery(event.target.value)}/><select aria-label="作品排序" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">最近修改</option><option value="name">名称排序</option></select></div></div>
    {!sessionId ? <div className="kb-empty"><StudioIcon size={38}/><h3>先打开一个工作区对话</h3><p>该工作区的口播视频会集中显示在这里。</p></div> : loading ? <div className="kb-empty" role="status">正在读取作品…</div> : error ? <div className="kb-empty" role="alert"><p>{error}</p><button onClick={() => setRevision(v => v + 1)}>重试</button></div> : !items.length ? <div className="kb-empty"><StudioIcon size={38}/><h3>{query ? '没有找到匹配的作品' : kind === 'clip' ? '还没有生成片段' : '这里将收藏你的创作'}</h3><p>{query ? '换个关键词，或查看全部视频。' : '保存在工作区 video/koubo 文件夹中的 MP4、WebM、MOV 视频会出现在这里。'}</p>{!query && <button onClick={() => prompt('请用口播技能帮我制作一条视频，先和我确认讲稿、人物素材与样式。')}>开始创作 ↗</button>}</div> :
      <div className="kb-works"><div className="kb-grid">{items.map(item => <article className={`kb-card ${active?.path === item.path ? 'kb-selected' : ''}`} key={item.path}><button className="kb-work-cover" aria-label={`预览 ${item.name}`} aria-pressed={active?.path === item.path} onClick={() => setSelected(item.path)}><WorkCover sessionId={sessionId} item={item}/><span>{item.kind === 'clip' ? '生成片段' : '口播作品'}</span><b>▶</b></button><div className="kb-card-body"><h3 title={item.name}>{item.name}</h3><p>{templates.find(t => t.id === item.templateId)?.name ?? '口播视频'} · {size(item.bytes)}</p><small>{new Date(item.modifiedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</small><div className="kb-card-actions"><button onClick={() => setSelected(item.path)}>播放</button><a href={mediaUrl(sessionId, item, true)} download={item.name}>下载 ↓</a></div></div></article>)}</div>
        {active && <aside className="kb-player" aria-label="作品详情"><div className="kb-player-header"><h3>{active.name}</h3><button aria-label="关闭作品预览" onClick={() => setSelected('')}>×</button></div><VideoPlayer key={`${sessionId}:${active.path}:${active.modifiedAt}`} sessionId={sessionId} item={active}/><p className="kb-file-path">video/koubo/{active.path}</p><div className="kb-player-actions"><a href={mediaUrl(sessionId, active, true)} download={active.name}>下载成品 ↓</a><button onClick={() => resource(active.project ? `${active.project}/package.json` : active.path)}>{active.project ? '查看工程' : '查看文件'}</button><button className="kb-primary" onClick={() => prompt(`请继续编辑口播作品 ${JSON.stringify(`video/koubo/${active.path}`)}。${active.project ? `对应工程是 ${JSON.stringify(`video/koubo/${active.project}`)}，请沿用该工程。` : '先检查现有视频与素材。'}请先问我需要修改什么，保留原成片，把新版本另存。`)}>继续编辑 ↗</button></div></aside>}
      </div>}
    {data?.truncated && <p role="status" className="kb-help">文件较多，当前只显示部分作品。请整理口播目录后刷新。</p>}
  </>;
}
export function Studio({ ctx }: { ctx: Context }) {
  const sessions = ctx.sessions as unknown as ISessions;
  const state = useSyncExternalStore<SessionListState>(sessions.list.subscribe, sessions.list.getSnapshot), session = currentConversation(state);
  const [tab, setTab] = useState<'styles' | 'library'>('styles'), [notice, setNotice] = useState('');
  const prompt = (text: string) => { try { preparePrompt(ctx, text); setNotice(''); } catch (error) { setNotice(error instanceof Error ? error.message : '无法打开对话。'); } };
  return <section className="kb-studio"><header data-window-drag><div className="kb-brand"><span><StudioIcon size={25}/></span><div><h1>口播工作室</h1><p>从灵感样式，到你的下一部作品</p></div></div><button onClick={() => ctx.layout.selectPanel(null)}>返回对话 ↗</button></header><nav aria-label="口播工作室"><button aria-current={tab === 'styles' ? 'page' : undefined} onClick={() => { setTab('styles'); setNotice(''); }}>样式馆</button><button aria-current={tab === 'library' ? 'page' : undefined} onClick={() => { setTab('library'); setNotice(''); }}>作品库</button></nav><main>{notice && <p role="alert">{notice}</p>}{tab === 'styles' ? <Gallery prompt={prompt}/> : <LibraryView ctx={ctx} sessionId={session?.id} cwd={session?.cwd} prompt={prompt}/>}</main></section>;
}
