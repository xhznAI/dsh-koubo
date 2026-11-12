import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { galleryStyles } from '../src/gallery';
import { MAP } from '../.cache/gallery-source/lin-169/src/Lin';
import { CardView, Huazi } from '../.cache/gallery-source/huazi-916/src/Huazi';
import { Huazi as Restrained } from '../.cache/gallery-source/huazi-916/src/Huazi-restrained';
import { Huazi as Lively } from '../.cache/gallery-source/huazi-916/src/Huazi-lively';
import { Film } from '../.cache/gallery-source/reference/launch-169/src/Film';
import { Tutorial } from '../.cache/gallery-source/reference/tutorial-169/src/Tutorial';
import { Tutorial as Multihost } from '../.cache/gallery-source/reference/multihost-169/src/Tutorial';
import { packDemos } from '../.cache/gallery-source/pack-demos';
import { OffthreadVideo } from './media';

const base = {a:0,b:6,pip:'rect-r'};
const scenes: Record<string, any> = {
  host: {depth:{src:'cut/host.webm',lines:['看见'],at:.3},lower:['每一个观点','都值得讲清楚']},
  board: {tag:'STORY / 01',title:'把复杂的事讲清楚',big:['一个好问题'],sub:'从这里开始'},
  broll:{clip:'B01'}, rates:{cards:[['方案 A','3','%'],['方案 B','6','%']],cardsAt:[.2,1]},
  assume:{boxes:[{label:'总量',v:'8%'},{label:'扣除',v:'2%'}],reveal:.3,result:{label:'结果',v:'6%'},resultAt:2.7},
  formula:{title:'一步一步，拆解原理',lines:['收入 − 成本','100 − 40','= 60'],linesAt:[.2,1,2]},
  big:{top:'72 ÷ 6',bottom:'12',bottomAt:1.2},
  formula2:{title:'每一项，都有来由',terms:[{t:'100',label:'起点',at:.2},{t:'20',label:'增长',at:1},{t:'8',label:'新增',at:2}]},
  calc:{tag:'代入一组示例数值',row:['72','÷ 6'],rowAt:[.4,1],res:'≈ 12',resAt:2},
  bars:{title:'让数据更直观',bars:[['方案 A',36],['方案 B',72]],barsAt:[.3,1.1],highlight:1,unit:'分'},
  fall:{steps:[['起点','100'],['扣除','−40'],['结果','60']],stepsAt:[.2,1,1.8]},
  curve:{title:'长期变化 · 示例数据',label:'持续增长',labelAt:2.4},
  stickers:{items:[{t:'构思',at:.2},{t:'讲述',at:.7},{t:'制作',at:1.2},{t:'分享',at:1.7}]},
};
const broll: Record<string, any> = {
  card:{card:['关键数据','72%','示例数据'],cardAt:.3},stat:{stat:[['完成度','72%'],['参与人数','128']],statAt:[.3,1.2]},
  chips:{chips:['先提出一个问题','再讲清楚答案'],chipsAt:.3},banner:{banner:['让','重点','被看见'],bannerAt:.3},
  doc:{doc:['示例文档','在这句话中','突出最重要的内容'],docAt:.3},slam:{slam:'看见重点',slamAt:.3},float:{float:['想法','故事','表达']},
};
const cardData: Record<string, any> = {
  stamp:{text:'值得一试'},slam:{text:'抓住重点'},big:{text:'把故事讲清楚'},number:{value:128,unit:'个',label:'示例数量'},
  vs:{left:{t:'方案 A',at:.2},right:{t:'方案 B',at:1}},tags:{title:'创作四步',items:['构思','讲述','制作','分享'].map((t,i)=>({t,at:.2+i*.5}))},
  bars:{title:'示例对比',items:[{t:'方案 A',v:.55,label:'55%'},{t:'方案 B',v:.8,label:'80%',color:'green'}],note:'示例数据'},
  list:{title:'一眼看清楚',items:[{t:'重点突出',tone:'good',at:.2},{t:'信息过载',tone:'bad',at:.9}]},image:{src:'screen.png',label:'示例截图'},
};
export const posterFrame = (id: string) => id === 'pack-GlitchInterstitial' ? 44 : id === 'pack-BarCompare' ? 106 : id === 'pack-Aside' ? 92 : id === 'scene-curve' ? 150 : 60;
export function GalleryScene({id}: {id:string}) {
  const item = galleryStyles.find(s=>s.id===id);
  if(!item) throw new Error('未找到样式');
  let content: React.ReactNode;
  if(item.kind==='pack') { const Demo = packDemos[item.value as keyof typeof packDemos]; content=<Demo/>; }
  else if(item.kind==='card') content=<><OffthreadVideo src="portrait.mp4" style={{width:'100%',height:'100%'}}/><CardView c={{type:item.value,at:.2,a:.2,b:6,...cardData[item.value]}}/></>;
  else if(item.kind==='preset'||item.template==='huazi-916') {const Demo=item.value==='restrained'?Restrained:item.value==='lively'?Lively:Huazi;content=<Demo/>;}
  else if(item.kind==='template'&&item.template.startsWith('reference/')) {
    const [Demo, start] = item.template.includes('launch') ? [Film, 10] : item.template.includes('multihost') ? [Multihost, 144] : [Tutorial, 80];
    content=<Sequence from={-(start as number)*30}><Demo/></Sequence>;
  } else {
    const type=item.kind==='pip'||item.kind==='template'?'board':item.kind==='broll'?'broll':item.value;
    const Demo=MAP[type];
    const data={...base,...scenes[type],...(item.kind==='broll'?broll[item.value]:{}),...(item.kind==='pip'?{pip:item.value}:{})};
    content=<Demo s={data}/>;
  }
  return <AbsoluteFill style={{background:'#182d32',overflow:'hidden',fontFamily:'PingFang SC, sans-serif'}}><OffthreadVideo src={item.kind==='pack'?'host.mp4':'main.mp4'} style={{position:'absolute',width:'100%',height:'100%',objectFit:'cover'}}/><AbsoluteFill>{content}</AbsoluteFill></AbsoluteFill>;
}
