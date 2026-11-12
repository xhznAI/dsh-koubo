import { build } from 'tsdown';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { prepareGallery } from './prepare-gallery.mjs';
await prepareGallery();
await mkdir('lib/gallery', {recursive:true});
await build({config:false,entry:{player:'preview/player.tsx'},outDir:'lib/gallery',format:'esm',platform:'browser',dts:false,clean:false,minify:true,deps:{alwaysBundle:[/./]},define:{'process.env.NODE_ENV':JSON.stringify('production')}});
const output = ts.createSourceFile('player.js',await readFile('lib/gallery/player.js','utf8'),ts.ScriptTarget.Latest,true);
if(output.statements.some(ts.isImportDeclaration)) throw new Error('预览依赖必须完整打包，不能留给宿主解析');
const require = createRequire(import.meta.url), notices=[];
for(const name of ['react','react-dom','scheduler','remotion','@remotion/player','d3-geo','d3-array','internmap','topojson-client','world-atlas','gsap','lucide-react','motion-dom','motion-utils']) {
  const parent = name==='scheduler'?'react-dom':name==='internmap'?'d3-geo':'d3-geo';
  let entry;
  try{entry=require.resolve(name==='world-atlas'?'world-atlas/countries-110m.json':name);}
  catch{entry=createRequire(require.resolve(parent)).resolve(name);}
  let directory=dirname(entry), manifest;
  for(let depth=0;depth<12;depth++) {
    try{manifest=JSON.parse(await readFile(join(directory,'package.json'),'utf8'));if(manifest.name===name)break;}catch{}
    directory=dirname(directory);
  }
  if(manifest?.name!==name)throw new Error(`找不到依赖许可：${name}`);
  const licenseFiles=(await readdir(directory)).filter(file=>/^licen[sc]e|^copying/i.test(file));
  const license = name==='remotion'||name==='@remotion/player' ? await readFile('assets/licenses/remotion-4.0.408.txt','utf8') : (await Promise.all(licenseFiles.map(file=>readFile(join(directory,file),'utf8')))).join('\n');
  notices.push(`${name} ${manifest.version}\nLicense: ${manifest.license ?? 'See package license'}\n${license}`);
}
await writeFile('lib/gallery/THIRD_PARTY_LICENSES.txt',notices.join('\n\n--------------------\n\n'));
await writeFile('lib/gallery/index.html','<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>样式动效预览</title><style>html,body,#root{margin:0;width:100%;height:100%;background:#182d32;color:white;overflow:hidden;font-family:system-ui}p{padding:24px}</style><div id="root"></div><script type="module" src="./player.js"></script></html>');
