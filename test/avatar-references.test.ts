import { mkdtemp, mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { AvatarReferences } from '../src/avatar-references.js';
import type { AvatarReference } from '../src/avatar-catalog.js';
import { useAvatarPrompt } from '../src/avatar-prompts.js';
const roots: string[] = [];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'koubo-references-'))); roots.push(root);
  const a = join(root, 'A'), b = join(root, 'B');
  await mkdir(join(a, 'video/koubo/avatars'), { recursive: true }); await mkdir(b);
  const path = join(a, 'video/koubo/avatars/人物.png'); await writeFile(path, png);
  let saved: AvatarReference[] = [];
  const store = () => new AvatarReferences(() => saved, async items => { saved = JSON.parse(JSON.stringify(items)); });
  return { a, b, path, references: store(), restart: store, signal: new AbortController().signal };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

it('形象引用在切换工作区与重建实例后保留，选用路径始终指向原图片', async () => {
  const { a, b, path, references, restart, signal } = await fixture();
  const first = (await references.refresh(a, signal)).items[0]!;
  const saved = await references.update({ id: first.id, updatedAt: first.updatedAt, name: '常用形象', imagePrompt: '蓝色衬衫', favorite: true }, signal);
  const next = restart();
  expect((await next.refresh(b, signal)).items).toEqual([saved]);
  expect((await next.refresh(undefined, signal)).items[0]).toMatchObject({ imagePath: path, name: '常用形象', favorite: true, available: true });
  const prompt = useAvatarPrompt(await next.get(saved.id));
  expect(prompt).toContain(JSON.stringify(path)); expect(prompt).toContain('当前工作区保存');
  expect(await readFile(path)).toEqual(png);
});

it('移除只隐藏引用，再次扫描原工作区也不重新添加，原图片完整保留', async () => {
  const { a, path, references, signal } = await fixture(), item = (await references.refresh(a, signal)).items[0]!;
  await references.remove({ id: item.id, updatedAt: item.updatedAt }, signal);
  expect((await references.refresh(a, signal)).items).toEqual([]);
  await expect(references.get(item.id)).rejects.toThrow('不存在');
  expect(await readFile(path)).toEqual(png);
});

it('原图片移动后保留失效引用，恢复原位置后可以继续使用', async () => {
  const { a, b, path, references, signal } = await fixture(), item = (await references.refresh(a, signal)).items[0]!;
  await rename(path, path + '.moved');
  expect((await references.refresh(b, signal)).items[0]).toMatchObject({ id: item.id, available: false });
  await rename(path + '.moved', path);
  expect((await references.get(item.id)).available).toBe(true);
});

it('不同工作区的同名图片使用不同引用，并发收藏修改不会覆盖新版本', async () => {
  const { a, b, references, signal } = await fixture();
  await mkdir(join(b, 'video/koubo/avatars'), { recursive: true }); await writeFile(join(b, 'video/koubo/avatars/人物.png'), png);
  const original = (await references.refresh(a, signal)).items[0]!;
  const both = (await references.refresh(b, signal)).items;
  expect(new Set(both.map(item => item.id)).size).toBe(2);
  const patch = { id: original.id, updatedAt: original.updatedAt, name: original.name, imagePrompt: '', favorite: true };
  const results = await Promise.allSettled([references.update(patch, signal), references.update({ ...patch, favorite: false }, signal)]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect((await references.get(original.id)).favorite).toBe(true);
});
