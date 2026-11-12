import { bundle } from '@remotion/bundler';
import { getCompositions, openBrowser, renderStill } from '@remotion/renderer';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { prepareGallery } from './prepare-gallery.mjs';
await prepareGallery();
await mkdir('assets/gallery/posters',{recursive:true});
const serveUrl = await bundle({entryPoint:resolve('preview/root.tsx'),outDir:resolve('.cache/gallery-render'),publicDir:null,webpackOverride:config=>({...config,resolve:{...config.resolve,extensionAlias:{'.js':['.js','.ts','.tsx']}}})});
const browser = await openBrowser('chrome');
const failures=[];
try {
  const compositions=await getCompositions(serveUrl,{puppeteerInstance:browser});
  let next=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(next<compositions.length){
      const composition=compositions[next++];
      const frame=composition.id==='pack-GlitchInterstitial'?44:composition.id==='pack-BarCompare'?106:composition.id==='pack-Aside'?92:composition.id==='scene-curve'?150:60;
      try{await renderStill({serveUrl,composition,frame,output:resolve(`assets/gallery/posters/${composition.id}.jpg`),imageFormat:'jpeg',jpegQuality:86,scale:composition.width===1080?.35:.3,puppeteerInstance:browser});console.log(`OK ${composition.id}`);}
      catch(error){failures.push({id:composition.id,error:error.message});console.error(`FAIL ${composition.id}: ${error.message}`);}
    }
  }));
  await writeFile('.cache/gallery-render-result.json',JSON.stringify({total:compositions.length,failures},null,2));
}finally{await browser.close({silent:true});}
if(failures.length)process.exitCode=1;
