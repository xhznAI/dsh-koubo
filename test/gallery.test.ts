import { readFile, stat } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { galleryPrompt, galleryStyles } from '../src/gallery.js';
const original = (path:string) => readFile(new URL(`../skills/koubo/templates/${path}`,import.meta.url),'utf8');

it('覆盖原版全部场景、花字卡片和包装组件，没有重复标识', async()=>{
  const lin=await original('lin-169/src/Lin.tsx'), huazi=await original('huazi-916/src/Huazi.tsx'), pack=await original('packaging/src/kit/registry.tsx');
  const map=lin.match(/export const MAP[^=]+=[^{]+\{([^}]+)\}/)![1]!;
  const scenes=[...map.matchAll(/(\w+):/g)].map(m=>m[1]);
  const cards=[...huazi.matchAll(/case "(\w+)":/g)].map(m=>m[1]);
  const registry=pack.match(/export const PACK[^=]+=[^{]+\{([^}]+)\}/)![1]!.split(',').map(s=>s.trim()).filter(Boolean);
  for(const [kind,values] of [['scene',scenes],['card',cards],['pack',registry]] as const) expect(galleryStyles.filter(s=>s.kind===kind).map(s=>s.value).sort()).toEqual([...values].sort());
  expect(new Set(galleryStyles.map(s=>s.id)).size).toBe(galleryStyles.length);
  for(const item of galleryStyles){expect(item.id).toMatch(/^[a-zA-Z0-9-]+$/);expect((await stat(new URL(`../assets/gallery/posters/${item.id}.jpg`,import.meta.url))).size).toBeGreaterThan(1000);}
});
it('选用具体样式带入准确编辑字段，文字高亮不会生成无效 pack 项',()=>{
  for(const kind of ['scene','card','pip','broll','preset','pack'] as const){const item=galleryStyles.find(s=>s.kind===kind)!;const prompt=galleryPrompt(item);expect(prompt).toContain(item.template);expect(prompt).toContain('确认讲稿');}
  expect(galleryPrompt(galleryStyles.find(s=>s.id==='pack-Highlight')!)).toContain('不能作为独立 pack 项');
  expect(galleryPrompt(galleryStyles.find(s=>s.id==='pip-circle-bl')!)).toContain('pip="circle-bl"');
  expect(galleryPrompt(galleryStyles.find(s=>s.id==='card-stamp')!)).toContain('type="stamp"');
  expect(galleryPrompt(galleryStyles.find(s=>s.id==='preset-lively')!)).toContain('preset="热闹"');
});
