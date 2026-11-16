import { constants } from 'node:fs';
import { lstat, mkdir, open, opendir, realpath, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import { imageMime } from './files.js';
import { LibraryError, libraryRoot } from './library.js';
import type { Avatar, AvatarLibrary } from './avatar-catalog.js';

const imageName = (name: string) => !name.startsWith('.') && !/[/\\\0]/u.test(name) && /\.(png|jpe?g|webp)$/iu.test(name);
export const avatarId = z.string().min(1).max(180).refine(imageName);
export const avatarDetails = z.object({ name: z.string().trim().min(1).max(80), imagePrompt: z.string().trim().max(4000).default(''), favorite: z.boolean().default(true) }).strict();
const storedAvatar = avatarDetails.extend({ updatedAt: z.string().datetime() });
export const avatarUpload = avatarDetails.extend({ image: z.string().max(14 * 1024 * 1024) });
const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const;
const readFlags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
const metadataName = (id: string) => `.${id}.koubo.json`;

/** 直接扫描人物图目录；生图工具保存的普通图片无需登记即可显示。 */
export async function avatarRoot(cwd: string | undefined, create = false): Promise<string | null> {
  const library = await libraryRoot(cwd);
  if (!library) return null;
  const root = join(library, 'avatars');
  if (create) await mkdir(root).catch(error => { if (error.code !== 'EEXIST') throw error; });
  try {
    const info = await lstat(root);
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(root) !== root) throw new LibraryError(403, '形象目录不能是链接。');
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  return root;
}

async function readSafe(root: string, name: string, limit: number, headerOnly = false) {
  const path = join(root, name), before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size < 1 || before.size > limit || await realpath(path) !== path) throw new LibraryError(403, '形象文件无效。');
  const file = await open(path, readFlags);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.ino !== before.ino || info.dev !== before.dev || info.size !== before.size) throw new LibraryError(409, '素材已变化，请刷新重试。');
    const bytes = Buffer.alloc(headerOnly ? Math.min(16, info.size) : info.size + 1); let offset = 0;
    while (offset < bytes.length) { const read = await file.read(bytes, offset, bytes.length - offset, offset); if (!read.bytesRead) break; offset += read.bytesRead; }
    const after = await file.stat();
    if (offset !== (headerOnly ? bytes.length : info.size) || after.size !== info.size || after.mtimeMs !== info.mtimeMs) throw new LibraryError(409, '素材已变化，请刷新重试。');
    return { bytes: bytes.subarray(0, offset), info };
  } finally { await file.close(); }
}

export async function readAvatar(root: string, id: string): Promise<Avatar> {
  avatarId.parse(id);
  const image = await readSafe(root, id, 10 * 1024 * 1024, true), mime = imageMime(image.bytes) as Avatar['mime'];
  let details = { name: id.replace(/\.[^.]+$/u, '').slice(0, 80), imagePrompt: '', favorite: false, updatedAt: image.info.mtime.toISOString() };
  try { details = storedAvatar.parse(JSON.parse((await readSafe(root, metadataName(id), 64 * 1024)).bytes.toString('utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return { ...details, id, mime, imagePath: `video/koubo/avatars/${id}`, bytes: image.info.size, createdAt: image.info.birthtime.toISOString(), updatedAt: new Date(Math.max(Date.parse(details.updatedAt), image.info.mtimeMs)).toISOString() };
}

export async function readAvatars(cwd: string | undefined, signal: AbortSignal): Promise<AvatarLibrary> {
  signal.throwIfAborted();
  const root = await avatarRoot(cwd), result: AvatarLibrary = { items: [], truncated: false };
  if (!root) return result;
  let visited = 0;
  for await (const entry of await opendir(root)) {
    signal.throwIfAborted();
    if (++visited > 2000 || result.items.length >= 200) { result.truncated = true; break; }
    if (!entry.isFile() || !avatarId.safeParse(entry.name).success) continue;
    try { result.items.push(await readAvatar(root, entry.name)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new LibraryError(409, '部分形象素材已变化或损坏，请检查形象目录后刷新。'); }
  }
  result.items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  return result;
}

export async function importAvatar(root: string, value: unknown, signal: AbortSignal): Promise<Avatar> {
  const { image, ...details } = avatarUpload.parse(value);
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/u.exec(image);
  if (!match || match[2]!.length % 4 !== 0) throw new LibraryError(400, '请选择 PNG、JPEG 或 WebP 人物图。');
  const bytes = Buffer.from(match[2]!, 'base64'); let mime: Avatar['mime'];
  try { mime = imageMime(bytes) as Avatar['mime']; } catch { throw new LibraryError(400, '人物图须为不超过 10 MB 的 PNG、JPEG 或 WebP。'); }
  if (mime !== match[1]) throw new LibraryError(400, '人物图格式与内容不一致。');
  const id = `${randomUUID()}.${extension[mime]}`, path = join(root, id);
  signal.throwIfAborted();
  const file = await open(path, 'wx', 0o600);
  try {
    await file.writeFile(bytes, { signal }); await file.close();
    await writeFile(join(root, metadataName(id)), JSON.stringify({ ...details, updatedAt: new Date().toISOString() }, null, 2), { flag: 'wx', mode: 0o600, signal });
  } catch (error) { await file.close().catch(() => undefined); await unlink(path); await unlink(join(root, metadataName(id))).catch(() => undefined); throw error; }
  return readAvatar(root, id);
}

export async function avatarImage(root: string, id: string): Promise<{ mime: Avatar['mime']; bytes: Buffer }> {
  avatarId.parse(id);
  const { bytes } = await readSafe(root, id, 10 * 1024 * 1024);
  return { mime: imageMime(bytes) as Avatar['mime'], bytes };
}
