import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, dirname, join } from 'node:path';
import ts from 'typescript';

export async function prepareGallery() {
  const root = resolve('.'), stage = resolve('.cache/gallery-source');
  await mkdir(stage, { recursive: true });
  await writeFile(join(stage,'avatar.ts'), `export default ${JSON.stringify('data:image/png;base64,' + (await readFile('assets/gallery/avatar.png')).toString('base64'))};`);
  await cp('skills/koubo/templates', stage, { recursive: true, filter: path => !path.includes('node_modules') && !path.includes('/public/') });
  async function patch(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { await patch(path); continue; }
      if (!/\.[jt]sx?$/.test(entry.name)) continue;
      const target = relative(dirname(path), resolve('preview/media')).replaceAll('\\', '/');
      let source = (await readFile(path, 'utf8')).replace(/from ["']remotion["']/g, `from ${JSON.stringify(target.startsWith('.') ? target : './' + target)}`);
      if (entry.name === 'NotoEmoji.tsx') source = `import React from 'react'; export const NotoEmoji = ({char,size=128,style}:any) => <div style={{fontSize:size,lineHeight:1,width:size,height:size,...style}}>{char}</div>;`;
      if (entry.name === 'Huazi.tsx') source += '\nexport {CardView};\n';
      await writeFile(path, source);
    }
  }
  await patch(stage);
  // 示例字幕与强度复用同一份原版实现，仅替换编辑数据。
  const text = '让重点被看见，让故事更好懂。';
  const tl = { total: 6, segs: [{i:1,start:0,end:6,text,chars:Object.fromEntries([...text].map((_,i)=>[i,.2+i*.3]))}] };
  await writeFile(join(stage, 'huazi-916/src/tl.json'), JSON.stringify(tl));
  const edit = {preset:'标准',video:'portrait.mp4',tail:0,title:{left:'KOUBO',right:'让表达更生动'},keys:['重点','故事'],chapters:[{at:0,t:'把故事讲清楚'}],cards:[],emojis:[],badge:'示例素材',credits:''};
  await writeFile(join(stage,'huazi-916/src/edit.json'),JSON.stringify(edit));
  const huazi = await readFile(join(stage,'huazi-916/src/Huazi.tsx'),'utf8');
  for(const [key,preset] of [['restrained','克制'],['standard','标准'],['lively','热闹']]) {
    await writeFile(join(stage,`huazi-916/src/edit-${key}.json`),JSON.stringify({...edit,preset}));
    await writeFile(join(stage,`huazi-916/src/Huazi-${key}.tsx`),huazi.replace('"./edit.json"',`"./edit-${key}.json"`));
  }
  // 从原版示例提取每个组件的独立用法，拆开原来合并的演示。
  const path = 'skills/koubo/templates/packaging/src/demos/Demos.tsx';
  const file = ts.createSourceFile(path, await readFile(path,'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const elements = {};
  function visit(node) {
    if(ts.isJsxSelfClosingElement(node)||ts.isJsxElement(node)) {
      const tag = (ts.isJsxElement(node)?node.openingElement.tagName:node.tagName).getText(file);
      elements[tag] ??= node.getText(file);
    }
    ts.forEachChild(node,visit);
  }
  visit(file);
  elements.GhostWord = '<GhostWord text="STORY" opacity={0.3} />';
  elements.Highlight = '<div style={{position:"absolute",left:260,top:460,fontSize:72,color:"#fff"}}><Highlight at={0.5}>让重点被看见</Highlight></div>';
  const rows = JSON.parse(await readFile('src/packaging-catalog.json','utf8'));
  const clean = source => source.replaceAll('Berryxia','示例主播').replaceAll('renoise.ai 官网，2026-10','中性示例截图').replaceAll('renoise.ai','示例窗口').replaceAll('Renoise estimate_cost 实测 · 2026-10','示例数据，仅演示效果').replaceAll('实测报价','示例数据');
  const cases = rows.map(({value})=> { if(!elements[value]) throw new Error(`缺少预览：${value}`); return `${JSON.stringify(value)}: () => (${clean(elements[value])}),`; }).join('\n');
  await writeFile(join(stage,'pack-demos.tsx'),`import React from 'react';\nimport {PACK} from './packaging/src/kit/registry';\nimport {C} from './packaging/src/kit/core';\nconst {${rows.map(r=>r.value).join(',')}} = PACK;\nexport const packDemos = {\n${cases}\n};\n`);
  return { root, stage };
}
if (process.argv[1] === new URL(import.meta.url).pathname) await prepareGallery();
