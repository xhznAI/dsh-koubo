import { mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { avatarImage, avatarRoot, importAvatar, readAvatar, readAvatars } from '../src/avatars.js';
import { emptyAvatarDetails } from '../src/avatar-catalog.js';
const roots: string[] = [];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const input = () => ({ ...emptyAvatarDetails, name: '知识讲解员', imagePrompt: '自然光，纯色衬衫', image: `data:image/png;base64,${png.toString('base64')}` });
async function fixture() {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), 'koubo-avatars-'))); roots.push(cwd);
  await mkdir(join(cwd, 'video/koubo'), { recursive: true });
  return { cwd, root: (await avatarRoot(cwd, true))!, signal: new AbortController().signal };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

it('添加图片保留名称与提示词，原图不受影响', async () => {
  const { cwd, root, signal } = await fixture(), original = join(cwd, 'original.png'); await writeFile(original, png);
  const item = await importAvatar(root, input(), signal);
  expect(item.imagePath).toBe(`video/koubo/avatars/${item.id}`);
  expect((await readAvatars(cwd, signal)).items).toEqual([item]);
  expect((await avatarImage(root, item.id)).bytes).toEqual(png);
  expect(item).toMatchObject({ name: '知识讲解员', favorite: true, imagePrompt: '自然光，纯色衬衫' });
  expect(await readFile(original)).toEqual(png);
});

it('拒绝目录穿越、图片及元数据链接和数字人目录链接，不读取其他文件', async () => {
  const { cwd, root, signal } = await fixture(), item = await importAvatar(root, input(), signal);
  await expect(readAvatar(root, '../private')).rejects.toThrow();
  const original = join(cwd, 'private.png'); await writeFile(original, png);
  await rm(join(root, item.id)); await symlink(original, join(root, item.id));
  await expect(avatarImage(root, item.id)).rejects.toThrow();
  await rm(join(root, item.id)); await writeFile(join(root, item.id), png);
  await rm(join(root, `.${item.id}.koubo.json`)); await writeFile(join(cwd, 'private.json'), '{}'); await symlink(join(cwd, 'private.json'), join(root, `.${item.id}.koubo.json`));
  await expect(readAvatar(root, item.id)).rejects.toThrow();
  await rm(root, { recursive: true }); await symlink(cwd, root);
  await expect(readAvatars(cwd, signal)).rejects.toThrow('链接');
  await expect(avatarRoot(cwd, true)).rejects.toThrow('链接');
});

it('伪装图片、过大图片和取消的导入不会保存素材', async () => {
  const { root, signal } = await fixture();
  for (const image of ['data:image/png;base64,PHN2Zz48L3N2Zz4=', `data:image/jpeg;base64,${png.toString('base64')}`, 'https://example.invalid/a.png']) await expect(importAvatar(root, { ...input(), image }, signal)).rejects.toThrow();
  await expect(importAvatar(root, input(), AbortSignal.abort())).rejects.toThrow();
  const huge = Buffer.alloc(10 * 1024 * 1024 + 1); png.copy(huge);
  await expect(importAvatar(root, { ...input(), image: `data:image/png;base64,${huge.toString('base64')}` }, signal)).rejects.toThrow('10 MB');
  expect(await readdir(root)).toEqual([]);
});

it('损坏的元数据明确报错，空工作区正常返回空库', async () => {
  const { cwd, root, signal } = await fixture();
  expect(await readAvatars(undefined, signal)).toEqual({ items: [], truncated: false });
  const item = await importAvatar(root, input(), signal); await writeFile(join(root, `.${item.id}.koubo.json`), '{');
  await expect(readAvatars(cwd, signal)).rejects.toThrow('损坏');
});

it('生图工具直接保存的图片无需元数据就能显示，并可立即收藏和选用', async () => {
  const { cwd, root, signal } = await fixture();
  await writeFile(join(root, '新制作的人物.png'), png);
  const first = await readAvatars(cwd, signal); expect(first.items).toHaveLength(1);
  const item = first.items[0]!;
  expect(item).toMatchObject({ name: '新制作的人物', id: '新制作的人物.png', imagePath: 'video/koubo/avatars/新制作的人物.png', favorite: false });
  expect(await readdir(root)).toEqual(['新制作的人物.png']);

});
