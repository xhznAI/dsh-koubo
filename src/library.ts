import { lstat, opendir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import { templates, type Library, type LibraryItem } from './catalog.js';

export class LibraryError extends Error { constructor(public status: number, message: string) { super(message); } }
const inside = (root: string, path: string) => { const value = relative(root, path); return value !== '..' && !value.startsWith(`..${sep}`) && !isAbsolute(value); };
export const videoType = (path: string) => /\.mp4$/iu.test(path) ? 'video/mp4' : /\.webm$/iu.test(path) ? 'video/webm' : /\.mov$/iu.test(path) ? 'video/quicktime' : undefined;

/** 只读取本地口播目录；拒绝文件及任意祖先目录的符号链接。 */
export async function libraryRoot(cwd: string | undefined): Promise<string | null> {
  if (!cwd || !isAbsolute(cwd)) return null;
  let directory = await realpath(cwd);
  for (const part of ['video', 'koubo']) {
    directory = join(directory, part);
    try { const info = await lstat(directory); if (!info.isDirectory() || info.isSymbolicLink()) throw new LibraryError(403, '口播目录不能是链接。'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  return directory;
}
export async function resolveVideo(root: string, path: string): Promise<string> {
  if (!path || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.')) || isAbsolute(path) || !videoType(path)) throw new LibraryError(400, '视频路径无效。');
  let target = root;
  for (const part of path.split('/')) {
    target = join(target, part);
    if ((await lstat(target)).isSymbolicLink()) throw new LibraryError(403, '不能读取链接。');
  }
  const resolved = await realpath(target);
  if (!inside(root, resolved) || !(await lstat(resolved)).isFile()) throw new LibraryError(403, '视频不在口播目录内。');
  return resolved;
}

export async function readLibrary(cwd: string | undefined, signal: AbortSignal): Promise<Library> {
  const root = await libraryRoot(cwd);
  const result: Library = { directory: root, items: [], truncated: false };
  if (!root) return result;
  let visited = 0;
  const walk = async (directory: string, depth: number, project: string | null, templateId: string | null): Promise<void> => {
    const entries = await opendir(directory);
    for await (const entry of entries) {
      signal.throwIfAborted();
      if (++visited > 5000 || result.items.length >= 500) { result.truncated = true; break; }
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'koubo' || entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      const rel = relative(root, path).split(sep).join('/');
      if (entry.isDirectory()) {
        if (depth >= 5) { result.truncated = true; continue; }
        const template = templates.find(item => entry.name.startsWith(`edit-${item.id.replaceAll('/', '-')}-`));
        await walk(path, depth + 1, template ? rel : project, template?.id ?? templateId);
      } else if (entry.isFile() && videoType(entry.name)) {
        try {
          const safe = await resolveVideo(root, rel), info = await lstat(safe);
          if (!info.size) continue;
          const item: LibraryItem = { path: rel, name: entry.name, bytes: info.size, modifiedAt: info.mtime.toISOString(),
            kind: /^clip-/u.test(entry.name) || /(^|\/)(public|media|clips|assets)(\/|$)/u.test(rel) ? 'clip' : 'finished', project, templateId };
          result.items.push(item);
        } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      }
    }
  };
  await walk(root, 0, null, null);
  result.items.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt) || a.path.localeCompare(b.path));
  return result;
}

/** 单段 Range 支持拖动视频进度与尾部索引读取。 */
export function byteRange(header: string | undefined, size: number): { start: number; end: number; partial: boolean } {
  if (!header) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header);
  if (!match || (!match[1] && !match[2])) throw new LibraryError(416, '范围无效');
  const first = match[1] ? Number(match[1]) : undefined, last = match[2] ? Number(match[2]) : undefined;
  if ((first !== undefined && !Number.isSafeInteger(first)) || (last !== undefined && !Number.isSafeInteger(last))) throw new LibraryError(416, '范围无效');
  const start = first ?? Math.max(0, size - (last ?? 0));
  const end = first === undefined ? size - 1 : Math.min(last ?? size - 1, size - 1);
  if (start < 0 || start > end || start >= size) throw new LibraryError(416, '范围无效');
  return { start, end, partial: true };
}
