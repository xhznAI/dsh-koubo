import React from 'react';
import {AbsoluteFill,Audio,OffthreadVideo,staticFile,useCurrentFrame} from 'remotion';
import {NumberSpike,ProgressTracker} from './kit/Beast';
import {GlassPanel,KeywordStack} from './kit/Polish';
import data from './case.json';
import cues from './cues.json';
import timeline from './tl.json';
// 文件复制到原版包装工程后使用，全部组件直接来自随包原版。
const at=(text:string)=>{const seg=timeline.segs[0],i=seg.text.indexOf(text),key=Object.keys(seg.chars).map(Number).sort((a,b)=>a-b).find(k=>k>=i);return (seg.chars as Record<string,number>)[String(key)];};
export const DataCase:React.FC=()=>{
  const f=useCurrentFrame(),t=f/30,caption=cues.subs.find(c=>t>=c.a&&t<c.b);
  return <AbsoluteFill style={{background:'#1e3737',fontFamily:'PingFang SC, sans-serif'}}>
    <OffthreadVideo src={staticFile('main.mp4')} muted style={{width:'100%',height:'100%',objectFit:'cover'}}/>
    <Audio src={staticFile('main.mp4')}/>
    <NumberSpike at={at('九十项')} until={at('先看动效')} text="90" label="样式与组件" pinAt={at('人物小窗')} color="#DDF27C"/>
    <style>{'.readme-data-panel > div > div:last-child {font-size:24px !important;color:rgba(255,255,255,.85) !important}'}</style>
    <div className="readme-data-panel"><GlassPanel at={at('人物小窗')} until={at('先看动效')} title="按表达方式找到样式" unit=" 项" x={85} y={260} w={910} rows={[{label:'小林场景与画面包装',value:20},{label:'竖屏花字与强度',value:12},{label:'包装组件与文字高亮',value:49,highlight:true}]} note="另有 5 种整体风格、4 种人物布局，共 90 项" color="#DDF27C"/></div>
    <ProgressTracker at={at('先看动效')} until={data.total} mode="steps" steps={['看动效','选样式','做作品']} stepAt={[at('先看动效'),at('再选样式'),at('做好的视频')]} y={75}/>
    <KeywordStack items={[{t:'播放',at:at('做好的视频'),color:'#C9ECD9'},{t:'下载',at:at('还能回到'),color:'#E5DAFF'},{t:'继续编辑',at:at('作品库继续编辑'),color:'#DDF27C'}]} until={data.total} x={130} y={330}/>
    <div style={{position:'absolute',right:36,top:30,fontSize:20,color:'#ffffffd9',background:'#0005',padding:'5px 12px',borderRadius:8}}>AI 生成数字人 · DSH Koubo</div>
    {caption&&<div style={{position:'absolute',left:0,right:0,bottom:56,display:'flex',justifyContent:'center'}}><div style={{fontSize:52,fontWeight:600,color:'#fff',padding:'4px 20px',textShadow:'0 0 3px #000, 0 2px 6px #000, 0 0 18px #0007'}}>{caption.t}</div></div>}
  </AbsoluteFill>;
};
