import { useEffect, useRef, useState } from 'react';
import { avatarImageUrl, emptyAvatarDetails, type Avatar, type AvatarDetails } from '../avatar-catalog.js';
import { useAvatarPrompt } from '../avatar-prompts.js';
import type { AvatarStore } from './avatar-store.js';
import { AvatarMaker } from './AvatarMaker.js';

const detailsOf = ({ name, imagePrompt, favorite }: Avatar): AvatarDetails => ({ name, imagePrompt, favorite });
function AvatarEditor({ item, store, close }: { item?: Avatar; store: AvatarStore; close(): void }) {
  const dialog = useRef<HTMLDialogElement>(null), active = useRef(true);
  const [details, setDetails] = useState<AvatarDetails>(item ? detailsOf(item) : emptyAvatarDetails), [path, setPath] = useState(''), [file, setFile] = useState<File>(), [preview, setPreview] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [removing, setRemoving] = useState(false);
  useEffect(() => { active.current = true; const element = dialog.current; element?.showModal(); return () => { active.current = false; element?.close(); }; }, []);
  useEffect(() => { if (!file) return; const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const field = (key: keyof AvatarDetails, value: string | boolean) => { setDetails(current => ({ ...current, [key]: value })); setError(''); };
  const save = async () => {
    setSaving(true); setError('');
    try {
      if (item) await store.mutate('PATCH', { ...details, id: item.id, updatedAt: item.updatedAt });
      else if (path.trim()) await store.mutate('POST', { ...details, imagePath: path.trim() });
      else {
        if (!file || !file.size || file.size > 10 * 1024 * 1024) throw new Error('请选择不超过 10 MB 的人物图。');
        const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('无法读取人物图，请重新选择。')); reader.readAsDataURL(file); });
        if (!active.current) return;
        await store.mutate('POST', { ...details, image });
      }
      if (active.current) close();
    } catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : '保存失败，请重试。'); }
    finally { if (active.current) setSaving(false); }
  };
  const source = item ? item.available === false ? '' : avatarImageUrl(item) : preview;
  return <dialog ref={dialog} className="kb-avatar-dialog" aria-labelledby="kb-avatar-editor-title" onCancel={event => { event.preventDefault(); if (!saving) close(); }} onClick={event => { if (event.target === event.currentTarget && !saving) close(); }}>
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <div className="kb-dialog-heading"><h2 id="kb-avatar-editor-title">{item ? '形象资料' : '添加形象引用'}</h2><button type="button" aria-label="关闭形象编辑" disabled={saving} onClick={close}>×</button></div>
      <div className="kb-avatar-editor">
        <div className="kb-avatar-upload">{source ? <img src={source} alt="人物图预览"/> : <span>添加你的常用人物图</span>}{!item && <><label>本机图片路径<input aria-label="本机图片路径" value={path} disabled={saving} onChange={event => setPath(event.target.value)} onBlur={() => { if (!details.name.trim()) field('name', path.split(/[/\\]/u).at(-1)?.replace(/\.[^.]+$/u, '').slice(0, 80) ?? ''); }} placeholder="可粘贴多媒体中的图片位置"/></label><label>或选择图片<input aria-label="人物图片" required={!path.trim()} type="file" accept="image/png,image/jpeg,image/webp" disabled={saving} onChange={event => {
          const selected = event.target.files?.[0]; if (!selected) return;
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(selected.type) || !selected.size || selected.size > 10 * 1024 * 1024) { event.target.value = ''; setError('请选择不超过 10 MB 的 PNG、JPEG 或 WebP 图片。'); return; }
          setFile(selected); setError(''); if (!details.name.trim()) field('name', selected.name.replace(/\.[^.]+$/u, '').slice(0, 80));
        }}/></label></>}<p className="kb-help">PNG、JPEG、WebP，最大 10 MB。粘贴路径会直接引用；选择上传会先保存到当前工作区。</p></div>
        <div className="kb-avatar-fields"><label>人物名称<input required maxLength={80} value={details.name} disabled={saving} onChange={event => field('name', event.target.value)} placeholder="例如：我的知识讲解形象"/></label>
          <label>生图提示词（可选）<textarea rows={5} maxLength={4000} value={details.imagePrompt} disabled={saving} onChange={event => field('imagePrompt', event.target.value)} placeholder="记录人物、服装、场景和构图，方便以后延续形象。"/></label>
          <label className="kb-checkbox"><input type="checkbox" checked={details.favorite} disabled={saving} onChange={event => field('favorite', event.target.checked)}/>加入收藏</label>
        </div>
      </div>
      {error && <p className="kb-form-error" role="alert">{error}</p>}
      <div className="kb-dialog-actions">{item && <div className="kb-remove-actions">{removing ? <><span>移除这个形象引用？原图片会保留。</span><button type="button" disabled={saving} onClick={() => setRemoving(false)}>保留</button><button type="button" disabled={saving} onClick={async () => { setSaving(true); setError(''); try { await store.mutate('DELETE', { id: item.id, updatedAt: item.updatedAt }); if (active.current) close(); } catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : '移除失败。'); } finally { if (active.current) setSaving(false); } }}>确认移除</button></> : <button type="button" disabled={saving} onClick={() => setRemoving(true)}>移除形象</button>}</div>}<button type="button" disabled={saving} onClick={close}>取消</button><button className="kb-primary" type="submit" disabled={saving || store.busy}>{saving ? '保存中…' : '保存形象'}</button></div>
    </form>
  </dialog>;
}

export function Avatars({ sessionId, store, prompt }: { sessionId?: string; store: AvatarStore; prompt(text: string): void }) {
  const [query, setQuery] = useState(''), [favorites, setFavorites] = useState(false), [editor, setEditor] = useState<Avatar | 'new' | 'make'>(), [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement | null>(null);
  const close = () => { setEditor(undefined); requestAnimationFrame(() => { if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true }); }); };
  const make = (button: HTMLButtonElement) => { trigger.current = button; setEditor('make'); };
  const items = (store.data?.items ?? []).filter(item => (!favorites || item.favorite) && `${item.name} ${item.imagePrompt}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <div className="kb-avatars"><div className="kb-heading"><div><span className="kb-eyebrow">YOUR PRESENTERS</span><h2>我的形象</h2><p>本机形象引用，切换工作区也能继续使用。</p></div><div className="kb-heading-actions"><button disabled={!sessionId} onClick={event => { trigger.current = event.currentTarget; setEditor('new'); }}>添加引用</button><button className="kb-primary" disabled={!sessionId} onClick={event => make(event.currentTarget)}>制作形象</button></div></div>
    <div className="kb-library-tools"><div className="kb-filters" aria-label="形象分类"><button aria-pressed={!favorites} onClick={() => setFavorites(false)}>全部人物</button><button aria-pressed={favorites} onClick={() => setFavorites(true)}>我的收藏</button></div><div className="kb-search"><input aria-label="搜索形象" placeholder="搜索名称或人物特征…" value={query} onChange={event => setQuery(event.target.value)}/><button disabled={store.loading || store.busy} onClick={store.refresh}>刷新</button></div></div>
    {(error || store.error) && <p role="alert" className="kb-form-error">{error || store.error}<button disabled={store.loading} onClick={() => { setError(''); store.refresh(); }}>重试</button></p>}
    {!sessionId && !store.data?.items.length ? <div className="kb-empty"><h3>先打开一个工作区对话</h3><p>添加图片后，形象引用可在不同工作区继续使用。</p></div> : store.loading ? <div className="kb-empty" role="status">正在读取形象…</div> : !store.error && !items.length ? <div className="kb-empty"><span className="kb-avatar-empty" aria-hidden="true">☆</span><h3>{query ? '没有找到匹配的形象' : favorites ? '还没有收藏的人物' : '把常用的人物形象放在这里'}</h3><p>{query ? '试试人物名称、服装或背景特征。' : favorites ? '点击人物卡片上的星标，方便下次找到。' : '添加已有图片，或描述一个形象去对话生图。'}</p>{!query && !favorites && <button onClick={event => make(event.currentTarget)}>制作形象 ↗</button>}</div> : <div className="kb-avatar-grid">{items.map(item => <article className="kb-avatar-card" key={item.id}><div className="kb-avatar-picture"><>{item.available === false ? <span className="kb-avatar-unavailable">原图片已移动或删除</span> : <img src={avatarImageUrl(item)} alt={item.name} loading="lazy"/>}</><button className="kb-avatar-star" aria-label={`${item.favorite ? '取消收藏' : '收藏'} ${item.name}`} aria-pressed={item.favorite} disabled={store.busy} onClick={async () => { setError(''); try { await store.mutate('PATCH', { ...detailsOf(item), favorite: !item.favorite, id: item.id, updatedAt: item.updatedAt }); } catch (failure) { setError(failure instanceof Error ? failure.message : '收藏失败。'); } }}>{item.favorite ? '★' : '☆'}</button></div><div className="kb-avatar-caption"><h3 title={item.name}>{item.name}</h3><p>{item.imagePrompt || '选用这张人物图，开始你的下一条口播。'}</p><div><button onClick={event => { trigger.current = event.currentTarget; setEditor(item); }}>编辑资料</button><button className="kb-primary" disabled={store.busy || item.available === false} onClick={async () => { setError(''); try { prompt(useAvatarPrompt(await store.use(item.id))); } catch (failure) { setError(failure instanceof Error ? failure.message : '形象引用不可用。'); } }}>使用该形象制作 ↗</button></div></div></article>)}</div>}
    <p className="kb-help">生成图片后点击刷新保存引用；移除引用会保留原图片。</p>
    {store.data?.truncated && <p className="kb-help" role="status">素材较多，当前只显示部分人物。请整理形象目录后刷新。</p>}
    {editor === 'make' ? <AvatarMaker close={close} prompt={prompt}/> : editor && <AvatarEditor item={editor === 'new' ? undefined : editor} store={store} close={close}/>}
  </div>;
}
