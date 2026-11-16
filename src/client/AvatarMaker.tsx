import { useEffect, useRef, useState } from 'react';
import { avatarCreationPrompt, avatarPresets } from '../avatar-prompts.js';

export function AvatarMaker({ close, prompt }: { close(): void; prompt(text: string): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [description, setDescription] = useState<string>(avatarPresets[0].description), [ratio, setRatio] = useState('9:16'), [message, setMessage] = useState('');
  const base = avatarCreationPrompt(description, ratio), [edited, setEdited] = useState<{ base: string; text: string }>();
  const text = edited?.base === base ? edited.text : base;
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="kb-avatar-dialog kb-avatar-maker" aria-labelledby="kb-avatar-maker-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <div className="kb-dialog-heading"><h2 id="kb-avatar-maker-title">制作形象</h2><button aria-label="关闭形象制作" onClick={close}>×</button></div>
    <div className="kb-avatar-fields"><label>想要什么形象？<textarea rows={4} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} placeholder="描述人物、服装、背景和光线…"/></label><div className="kb-preset-row" aria-label="人物提示词示例">{avatarPresets.map(item => <button key={item.name} aria-pressed={description === item.description} onClick={() => { setDescription(item.description); setMessage(''); }}>{item.name}</button>)}</div><label>图片比例<select aria-label="图片比例" value={ratio} onChange={event => setRatio(event.target.value)}><option value="9:16">9:16 竖屏</option><option value="16:9">16:9 横屏</option><option value="1:1">1:1 方形</option></select></label>
      <p className="kb-help">会补上正面构图、嘴部清晰和保存目录，生成后刷新形象页即可查看。</p>
      <details className="kb-avatar-prompt-detail"><summary>查看完整提示词</summary><textarea aria-label="生图提示词" rows={8} value={text} onChange={event => setEdited({ base, text: event.target.value })}/></details>
    </div><p role="status" className="kb-help">{message}</p><div className="kb-dialog-actions"><button disabled={!text.trim()} onClick={async () => { try { await navigator.clipboard.writeText(text); setMessage('已复制'); } catch { setMessage('无法自动复制，可展开提示词手动复制。'); } }}>复制提示词</button><button className="kb-primary" disabled={!description.trim() || !text.trim()} onClick={() => { close(); prompt(text); }}>去对话生图 ↗</button></div>
  </dialog>;
}
