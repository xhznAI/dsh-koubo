import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
const root=resolve('.'),brief=JSON.parse(await readFile('examples/readme-cases/brief.json','utf8'));
async function run(command,args,cwd=root){await new Promise((ok,fail)=>{const p=spawn(command,args,{cwd,stdio:'inherit'});p.on('error',fail);p.on('exit',code=>code===0?ok():fail(new Error(`${command}: ${code}`)));});}
const json=async(path,value)=>writeFile(path,JSON.stringify(value,null,2)+'\n');
for(const item of brief.cases.filter(c=>!process.argv[2]||c.id===process.argv[2])){
  const project=join(root,'video/readme-cases/projects',item.id),source=join(root,'skills/koubo/templates',item.template);
  await mkdir(join(project,'public'),{recursive:true});
  await cp(join(source,'src'),join(project,'src'),{recursive:true});
  const w=item.aspectRatio==='9:16'?1080:1920,h=item.aspectRatio==='9:16'?1920:1080;
  await json(join(project,'script.json'),[{id:'s01',t:item.narration}]);
  // 去掉渠道附带的封面流，并等比填满目标画幅。
  const input=join(project,'input.mp4');
  // 为竖屏素材预留不透明花字面板，原版卡片与字幕仍在上层正常动画。
  const panel=item.captionPanel;
  const scale=`scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1${panel?`,drawbox=x=0:y=${panel.top}:w=iw:h=ih-${panel.top}:color=0x${panel.color}:t=fill,drawbox=x=0:y=${panel.top}:w=iw:h=5:color=0x${panel.accent}:t=fill`:''}`;
  const filters=item.keepRanges?.flatMap(([a,b],i)=>{
    const range=`start=${a}${b===null?'':`:end=${b}`}`;
    return [`[0:v:0]trim=${range},setpts=PTS-STARTPTS[v${i}]`,`[0:a:0]atrim=${range},asetpts=PTS-STARTPTS[a${i}]`];
  });
  if(filters)filters.push(`${item.keepRanges.map((_,i)=>`[v${i}][a${i}]`).join('')}concat=n=${item.keepRanges.length}:v=1:a=1[v][audio]`,`[v]${scale}[video]`);
  const selection=filters?['-filter_complex',filters.join(';'),'-map','[video]','-map','[audio]']:['-map','0:v:0','-map','0:a:0','-vf',scale];
  if(!process.env.REUSE_CASE_MEDIA)await run('ffmpeg',['-nostdin','-v','error','-y','-i',join(root,'video/readme-cases',`${item.id}.mp4`),...selection,'-c:v','libx264','-crf','18','-preset','fast','-c:a',filters?'aac':'copy',input]);
  await json(join(project,'clips.json'),{s01:'input.mp4'});
  const scripts=join(root,'skills/koubo/scripts');
  if(!process.env.REUSE_CASE_MEDIA)await run('uv',['run','python',join(scripts,'assemble.py'),'script.json','clips.json','--out','public/main.mp4'],project);
  // 只统一繁简字形，不把识别结果改成预期文稿，也不改动原版脚本。
  await run('uv',['run','--with','opencc-python-reimplemented','python','-c',`import json\nfrom pathlib import Path\nfrom opencc import OpenCC\np=Path('cut/s01.json')\nd=json.loads(p.read_text())\nc=OpenCC('t2s')\nfor t in d['transcription']: t['text']=c.convert(t['text'])\np.write_text(json.dumps(d,ensure_ascii=False))`],project);
  await run('uv',['run','python',join(scripts,'align.py'),'script.json','--out','src/tl.json'],project);
  await run('uv',['run','python',join(scripts,'lin_subs.py'),'script.json','--tl','src/tl.json','--out','src/cues.json'],project);
  const timeline=JSON.parse(await readFile(join(project,'src/tl.json'),'utf8'));
  const at=phrase=>{const seg=timeline.segs[0],index=seg.text.indexOf(phrase);if(index<0)throw new Error(`找不到台词：${phrase}`);const char=Object.keys(seg.chars).map(Number).sort((a,b)=>a-b).find(k=>k>=index);if(char===undefined)throw new Error(`缺少时间：${phrase}`);return seg.chars[char];};
  const total=Math.round(timeline.total*30)/30;
  await json(join(project,'src/case.json'),{...item,total,shots:item.shots.map(s=>({...s,at:at(s.atPhrase)}))});
  if(item.template==='lin-169'){
    const a=at('把观点写成讲稿'),b=at('再搭配重点卡片'),c=at('让复杂的内容');
    await json(join(project,'src/scenes.json'),{total,config:{face:[1340,260],audio:'main.mp4',disclosure:'AI 生成数字人 · DSH Koubo'},scenes:[
      {type:'host',a:0,b:a,lower:['一张照片','开始口播创作']},
      {type:'board',a,b,tag:'从想法到成片',title:'把观点写成讲稿',items:['人物照片','讲解稿','口播视频'],itemsAt:[a,a+.4,a+.8],pip:'circle-bl'},
      {type:'board',a:b,b:c,title:'突出要点，留住人物',big:['重点卡片','人物小窗'],pip:'circle-bl'},
      {type:'board',a:c,b:total,title:'让复杂的内容更好懂',big:['把复杂的事','讲清楚'],pip:'rect-r'},
    ]});
  }else if(item.template==='huazi-916'){
    await run('uv',['run','--with','numpy','python',join(scripts,'make_assets.py'),'public'],project);
    await run('ffmpeg',['-nostdin','-v','error','-y','-i',join(project,'public/main.mp4'),'-vn','-ar','48000',join(project,'public/voice.wav')]);
    const end=at('自己的风格');
    await json(join(project,'src/edit.json'),{preset:'标准',tail:0,title:{left:'DSH KOUBO',right:'让重点被看见'},brand:'orange',keys:item.keys,badge:'AI 生成数字人',credits:'',chapters:[{at:0,t:'你的数字人口播'}],emojis:[],cards:[
      {type:'slam',at:at('让重点被看见'),until:at('准备人物和讲稿'),text:'让重点被看见',size:106,y:1220},
      {type:'tags',at:at('准备人物和讲稿'),until:at('加上花字'),title:'准备好这两样',items:[{t:'人物',at:at('人物')},{t:'讲稿',at:at('讲稿')}]},
      {type:'big',at:at('加上花字'),until:at('对比卡片'),text:'关键词花字',y:1220,size:100,color:'orange'},
      {type:'vs',at:at('对比卡片'),until:at('做出'),y:1240,left:{t:'普通讲述',at:at('对比卡片')},right:{t:'重点突出',at:at('节奏包装')}},
      {type:'stamp',at:end,until:total,text:'你的风格',x:230,y:1220,size:120},
    ]});
    await run('uv',['run','python',join(scripts,'check_edit.py'),'src'],project);
  }else{
    await cp(join(root,'examples/readme-cases/DataCase.tsx'),join(project,'src/DataCase.tsx'));
    await writeFile(join(project,'src/Root.tsx'),`import React from 'react';\nimport {Composition} from 'remotion';\nimport {DataCase} from './DataCase';\nimport data from './case.json';\nexport const Root=()=> <Composition id="DataCase" component={DataCase} durationInFrames={Math.round(data.total*30)} fps={30} width={1920} height={1080}/>;\n`);
  }
  await json(join(project,'package.json'),{private:true,type:'module',name:`readme-${item.id}`});
  await json(join(project,'tsconfig.json'),{compilerOptions:{target:'ES2020',jsx:'react-jsx',module:'ESNext',moduleResolution:'Bundler',esModuleInterop:true,resolveJsonModule:true}});
  await json(join(root,'examples/readme-cases',`${item.id}.timeline.json`),timeline);
  console.log(`READY ${item.id} ${total.toFixed(2)}s`);
}
