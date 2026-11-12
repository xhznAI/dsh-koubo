import {bundle} from '@remotion/bundler';
import {getCompositions,openBrowser,renderMedia,renderStill} from '@remotion/renderer';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
const root=resolve('.'),brief=JSON.parse(await readFile('examples/readme-cases/brief.json','utf8'));
async function run(cmd,args){await new Promise((ok,fail)=>{const p=spawn(cmd,args,{stdio:'inherit'});p.on('error',fail);p.on('exit',code=>code===0?ok():fail(new Error(`${cmd}: ${code}`)));});}
await mkdir('assets/readme-cases',{recursive:true});
const browser=await openBrowser('chrome'),report=[];
try{
  for(const item of brief.cases.filter(c=>!process.argv[2]||c.id===process.argv[2])){
    const project=join(root,'video/readme-cases/projects',item.id),output=join(root,'assets/readme-cases',item.id),stage=join(root,'.cache/readme-cases/render',item.id);
    const serveUrl=await bundle({entryPoint:join(project,'src/index.ts'),publicDir:join(project,'public'),outDir:stage,enableCaching:true});
    const [composition]=await getCompositions(serveUrl,{puppeteerInstance:browser});
    const raw=join(project,'render.mp4');
    await renderMedia({serveUrl,composition,codec:'h264',outputLocation:raw,scale:2/3,crf:19,concurrency:4,puppeteerInstance:browser,onProgress:p=>{if(p.renderedFrames%120===0)console.log(`${item.id}: ${p.renderedFrames}/${composition.durationInFrames}`);}});
    await run('ffmpeg',['-nostdin','-v','error','-y','-i',raw,'-map','0:v:0','-map','0:a:0','-c:v','copy','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-c:a','aac','-b:a','160k','-t',String(composition.durationInFrames/composition.fps),'-movflags','+faststart',`${output}.mp4`]);
    const posterSeconds={'lin-explainer':9,'huazi-short':9.3,'data-packaging':6.2};
    const posterFrame=Math.min(composition.durationInFrames-1,Math.round(posterSeconds[item.id]*composition.fps));
    await renderStill({serveUrl,composition,frame:posterFrame,output:`${output}.jpg`,imageFormat:'jpeg',jpegQuality:90,scale:item.aspectRatio==='9:16'?.4:.5,puppeteerInstance:browser});
    const width=item.aspectRatio==='9:16'?240:480;
    await run('ffmpeg',['-nostdin','-v','error','-y','-i',`${output}.mp4`,'-filter_complex',`fps=10,scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3`,'-loop','0',`${output}.gif`]);
    await run('ffmpeg',['-nostdin','-v','error','-i',`${output}.mp4`,'-f','null','-']);
    report.push({id:item.id,frames:composition.durationInFrames,fps:composition.fps,duration:composition.durationInFrames/composition.fps,width:Math.round(composition.width*2/3),height:Math.round(composition.height*2/3)});
    console.log(`DONE ${item.id}`);
  }
}finally{await browser.close({silent:true});}
await writeFile('.cache/readme-cases/render-report.json',JSON.stringify(report,null,2));
