import { useEffect, useRef, useState } from 'react';
import { galleryGroups, galleryPrompt, galleryStyles, type GalleryStyle } from '../gallery.js';

function Preview({item, close, choose}: {item:GalleryStyle; close():void; choose():void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(()=>{dialog.current?.showModal();return ()=>dialog.current?.close();},[]);
  useEffect(()=>{
    // 只接收当前同源播放器的关闭请求，跨 frame 的 Escape 不会冒泡到外层弹窗。
    const onMessage=(event:MessageEvent)=>{if(event.origin===location.origin&&event.source===frame.current?.contentWindow&&event.data?.type==='dsh-koubo:preview-close')close();};
    window.addEventListener('message',onMessage);return ()=>window.removeEventListener('message',onMessage);
  },[close]);
  return <dialog ref={dialog} className="kb-gallery-dialog" aria-labelledby="kb-style-title" onCancel={event=>{event.preventDefault();close();}} onClick={event=>{if(event.target===event.currentTarget)close();}}>
    <div className="kb-gallery-dialog-head"><span>样式预览</span><button aria-label="关闭样式预览" onClick={close}>×</button></div>
    <div className="kb-gallery-dialog-content"><div className="kb-motion"><iframe ref={frame} key={item.id} src={`/dsh-koubo/gallery/index.html?id=${encodeURIComponent(item.id)}`} title={`${item.name}动效预览`} allow="fullscreen"/></div>
      <div className="kb-gallery-info"><span className="kb-eyebrow">{item.group} · {item.portrait?'9:16':'16:9'}</span><h2 id="kb-style-title">{item.name}</h2><p>{item.description}</p><span className="kb-source-name">{item.value}</span><p className="kb-gallery-note">点击播放查看原版动效。人物为 AI 生成的示例形象，截图与数据仅用于演示；预览不含口播和音效。</p><button className="kb-primary" onClick={choose}>选用这个样式 ↗</button><p className="kb-help">带入当前对话，确认内容后再制作。</p></div>
    </div>
  </dialog>;
}
export function Gallery({prompt}: {prompt(text:string):void}) {
  const [group,setGroup]=useState('全部'),[query,setQuery]=useState(''),[category,setCategory]=useState('全部'),[selected,setSelected]=useState<GalleryStyle>();
  const previewTrigger=useRef<HTMLButtonElement|null>(null);
  const closePreview=()=>{const trigger=previewTrigger.current;setSelected(undefined);requestAnimationFrame(()=>{if(trigger?.isConnected)trigger.focus({preventScroll:true});});};
  const categories=[...new Set(galleryStyles.filter(item=>item.group==='包装组件').map(item=>item.category))];
  const items=galleryStyles.filter(item=>(group==='全部'||item.group===group)&&(group!=='包装组件'||category==='全部'||item.category===category)&&`${item.name} ${item.value} ${item.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const choose=(item:GalleryStyle)=>{setSelected(undefined);prompt(galleryPrompt(item));};
  return <div className="kb-gallery"><div className="kb-gallery-heading"><div><span className="kb-eyebrow">STYLE COLLECTION</span><h2>找到你的表达方式</h2><p>先看看效果，再选一个开始创作。</p></div><span className="kb-gallery-total"><b>{galleryStyles.length}</b> 种样式与组件</span></div>
    <div className="kb-gallery-toolbar"><div className="kb-gallery-tabs" aria-label="样式分类">{galleryGroups.map(value=><button key={value} aria-pressed={group===value} onClick={()=>{setGroup(value);setCategory('全部');}}>{value}<small>{value==='全部'?galleryStyles.length:galleryStyles.filter(item=>item.group===value).length}</small></button>)}</div><input aria-label="搜索样式" placeholder="搜索样式…" value={query} onChange={event=>setQuery(event.target.value)}/></div>
    {group==='包装组件'&&<div className="kb-filters kb-gallery-subfilters" aria-label="包装用途">{['全部',...categories].map(value=><button key={value} aria-pressed={category===value} onClick={()=>setCategory(value)}>{value}</button>)}</div>}
    <div className="kb-gallery-results"><span>{group==='全部'?'全部样式':group}</span><span>{items.length} 个结果</span></div>
    <div className="kb-gallery-grid">{items.map(item=><article className="kb-style-tile" key={item.id}><button className={`kb-tile-image ${item.portrait?'kb-tile-portrait':''}`} aria-label={`预览${item.name}`} onClick={event=>{previewTrigger.current=event.currentTarget;setSelected(item);}}><img src={`/dsh-koubo/gallery/posters/${item.id}.jpg`} alt={`${item.name}效果预览`} loading="lazy"/><span className="kb-tile-ratio">{item.portrait?'9:16':'16:9'}</span><span className="kb-tile-play" aria-hidden="true">▶</span></button><div className="kb-tile-caption"><div><h3 title={item.name}>{item.name}</h3><small>{item.group==='包装组件'?item.category:item.group}</small></div><button aria-label={`选用${item.name}`} onClick={()=>choose(item)}>选用 ↗</button></div></article>)}</div>
    {!items.length&&<div className="kb-empty"><h3>没有找到这个样式</h3><p>试试名称、组件名，或清除筛选。</p><button onClick={()=>{setGroup('全部');setCategory('全部');setQuery('');}}>显示全部</button></div>}
    {selected&&<Preview item={selected} close={closePreview} choose={()=>choose(selected)}/>}
  </div>;
}
