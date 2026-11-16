import { createHash } from 'node:crypto';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { z } from 'zod';
import { avatarDetails, avatarRoot, readAvatar, readAvatars } from './avatars.js';
import { LibraryError } from './library.js';
import type { Avatar, AvatarLibrary, AvatarReference } from './avatar-catalog.js';

export const avatarReferenceId = z.string().regex(/^[a-f\d]{64}$/u);
export const avatarReferenceUpdate = avatarDetails.extend({ id: avatarReferenceId, updatedAt: z.string().datetime() });
export const avatarReferenceRemove = z.object({ id: avatarReferenceId, updatedAt: z.string().datetime() }).strict();
export const avatarReferenceLink = avatarDetails.extend({ imagePath: z.string().trim().min(1).max(4096) });
const referenceId = (path: string) => createHash('sha256').update(path).digest('hex');

/** 仅保存本机图片引用与收藏偏好，切换工作区不会复制或移动原图。 */
export class AvatarReferences {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly current: () => readonly AvatarReference[], private readonly save: (items: AvatarReference[]) => Promise<unknown>) {}
  private serial<T>(run: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(run); this.queue = next; return next;
  }
  private async resolve(record: AvatarReference): Promise<Avatar> {
    const { removed: _removed, ...item } = record;
    try {
      if (!isAbsolute(item.imagePath)) throw new Error('无效引用');
      const local = await readAvatar(dirname(item.imagePath), basename(item.imagePath));
      return { ...item, bytes: local.bytes, mime: local.mime, available: true, updatedAt: new Date(Math.max(Date.parse(item.updatedAt), Date.parse(local.updatedAt))).toISOString() };
    } catch { return { ...item, available: false }; }
  }
  async refresh(cwd: string | undefined, signal: AbortSignal): Promise<AvatarLibrary> {
    const local = await readAvatars(cwd, signal), root = await avatarRoot(cwd);
    if (root && local.items.length) await this.serial(async () => {
      signal.throwIfAborted();
      const items = [...this.current()], known = new Set(items.map(item => item.id)); let changed = false;
      for (const item of local.items) {
        const imagePath = join(root, item.id), id = referenceId(imagePath);
        if (known.has(id)) continue;
        items.push({ ...item, id, imagePath, removed: false }); known.add(id); changed = true;
      }
      if (changed) await this.save(items);
    });
    const items: Avatar[] = [];
    for (const record of this.current()) {
      signal.throwIfAborted();
      if (!record.removed) items.push(await this.resolve(record));
    }
    return { items: items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)), truncated: local.truncated };
  }
  async get(id: string): Promise<Avatar> {
    avatarReferenceId.parse(id);
    const record = this.current().find(item => item.id === id && !item.removed);
    if (!record) throw new LibraryError(404, '形象引用不存在。');
    return this.resolve(record);
  }
  async add(root: string, item: Avatar, signal: AbortSignal): Promise<Avatar> {
    const imagePath = join(root, item.id), id = referenceId(imagePath);
    return this.serial(async () => {
      signal.throwIfAborted();
      const record = { ...item, id, imagePath, removed: false };
      await this.save([...this.current().filter(item => item.id !== id), record]);
      return { ...record, available: true };
    });
  }
  async link(value: unknown, cwd: string | undefined, signal: AbortSignal): Promise<Avatar> {
    const { imagePath, ...details } = avatarReferenceLink.parse(value);
    if (!isAbsolute(imagePath) && !cwd) throw new LibraryError(400, '相对图片路径需要先打开工作区。');
    const path = isAbsolute(imagePath) ? imagePath : resolve(cwd!, imagePath);
    let item: Avatar;
    try { item = await readAvatar(dirname(path), basename(path)); }
    catch { throw new LibraryError(400, '图片路径不可用，请选择有效的 PNG、JPEG 或 WebP 本机文件。'); }
    return this.add(dirname(path), { ...item, ...details, updatedAt: new Date(Math.max(Date.now(), Date.parse(item.updatedAt) + 1)).toISOString() }, signal);
  }
  async update(value: unknown, signal: AbortSignal): Promise<Avatar> {
    const { id, updatedAt, ...details } = avatarReferenceUpdate.parse(value);
    return this.serial(async () => {
      const current = await this.get(id);
      if (current.updatedAt !== updatedAt) throw new LibraryError(409, '此形象已变化，请刷新后重试。');
      signal.throwIfAborted();
      const { available, ...record } = { ...current, ...details, updatedAt: new Date(Math.max(Date.now(), Date.parse(updatedAt) + 1)).toISOString() };
      await this.save(this.current().map(item => item.id === id ? { ...record, removed: false } : item));
      return { ...record, available };
    });
  }
  async remove(value: unknown, signal: AbortSignal): Promise<void> {
    const { id, updatedAt } = avatarReferenceRemove.parse(value);
    await this.serial(async () => {
      const current = await this.get(id);
      if (current.updatedAt !== updatedAt) throw new LibraryError(409, '此形象已变化，请刷新后重试。');
      signal.throwIfAborted();
      await this.save(this.current().map(item => item.id === id ? { ...item, removed: true } : item));
    });
  }
}
