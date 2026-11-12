import { mkdtemp, mkdir, writeFile, symlink, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { byteRange, libraryRoot, readLibrary, resolveVideo } from '../src/library.js';
const roots: string[] = [];
async function fixture() {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), 'koubo-library-'))); roots.push(cwd);
  const root = join(cwd, 'video/koubo'); await mkdir(root, { recursive: true });
  return { cwd, root, signal: new AbortController().signal };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
it('只读取口播目录，区分素材与成片并关联原版工程', async () => {
  const { cwd, root, signal } = await fixture();
  await mkdir(join(root, 'edit-lin-169-abc/out'), { recursive: true });
  await mkdir(join(root, 'edit-lin-169-abc/public/media'), { recursive: true });
  await mkdir(join(root, 'node_modules/a'), { recursive: true });
  for (const path of ['clip-abc.mp4', 'edit-lin-169-abc/out/film.mp4', 'edit-lin-169-abc/public/media/host.mov', 'node_modules/a/hidden.mp4', '.temp.mp4']) await writeFile(join(root, path), 'video');
  await writeFile(join(root, 'empty.mp4'), ''); await writeFile(join(cwd, 'private.mp4'), 'private');
  const data = await readLibrary(cwd, signal);
  expect(data.items).toHaveLength(3);
  expect(data.items.find(item => item.name === 'film.mp4')).toMatchObject({ kind: 'finished', project: 'edit-lin-169-abc', templateId: 'lin-169' });
  expect(data.items.filter(item => item.kind === 'clip')).toHaveLength(2);
  expect(data.truncated).toBe(false);
});
it('拒绝目录穿越、非视频与符号链接，包括输出目录链接', async () => {
  const { cwd, root, signal } = await fixture();
  const outside = join(cwd, 'outside'); await mkdir(outside); await writeFile(join(outside, 'private.mp4'), 'private');
  await symlink(outside, join(root, 'linked')); await symlink(join(outside, 'private.mp4'), join(root, 'linked.mp4'));
  expect((await readLibrary(cwd, signal)).items).toEqual([]);
  for (const path of ['../outside/private.mp4', '/private.mp4', 'linked/private.mp4', 'linked.mp4', 'anything.txt', 'a\\b.mp4']) await expect(resolveVideo(root, path)).rejects.toThrow();
  await rm(root, { recursive: true }); await symlink(outside, root); await expect(libraryRoot(cwd)).rejects.toThrow('链接');
});
it('目录不存在返回空库，取消读取立即停止', async () => {
  const { cwd, root } = await fixture(); await writeFile(join(root, 'film.mp4'), 'video');
  await expect(readLibrary(cwd, AbortSignal.abort())).rejects.toThrow();
  expect(await readLibrary(undefined, new AbortController().signal)).toEqual({ directory: null, items: [], truncated: false });
});
it('视频 Range 支持定位与尾部读取并拒绝无效范围', () => {
  expect(byteRange(undefined, 100)).toEqual({ start: 0, end: 99, partial: false });
  expect(byteRange('bytes=20-39', 100)).toEqual({ start: 20, end: 39, partial: true });
  expect(byteRange('bytes=-20', 100)).toEqual({ start: 80, end: 99, partial: true });
  expect(byteRange('bytes=20-', 100)).toEqual({ start: 20, end: 99, partial: true });
  for (const header of ['bytes=-0', 'bytes=100-', 'bytes=50-20', 'bytes=0-1,4-5', 'bytes=-', 'bytes=9007199254740994-']) expect(() => byteRange(header, 100)).toThrow();
});
