import { randomUUID } from 'node:crypto';
import { lstat, mkdir, open, realpath, unlink } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import type {} from '@deepseek-ai/dsh-working-directory';
import type {} from '@deepseek-ai/dsh-fs';
import type {} from '@deepseek-ai/dsh-sandbox-policy';
import { readBounded, videoUrl, type Fetch } from './http.js';

const inside = (root: string, path: string) => { const part = relative(root, path); return !isAbsolute(part) && part !== '..' && !part.startsWith(`..${sep}`); };

/** 文件只写入会话工作区，遵守只读策略；输出目录不能借助链接跳出工作区。 */
export async function outputDirectory(ctx: Context, exec: ToolExecution): Promise<string> {
  exec.signal.throwIfAborted();
  if (!exec.agent) throw new Error('请在本地工作区中生成口播视频。');
  const cwd = ctx.workingDirectory.get(exec.agent.session);
  if (!cwd || !isAbsolute(cwd) || ctx.fs.processPathFromHostPath(cwd) !== cwd) throw new Error('口播输出需要本地工作区。');
  const policy = ctx.sandboxPolicy.resolve({ session: exec.agent.session });
  if (policy.mode === 'read-only') throw new Error('当前工作区只读，无法生成口播视频。');
  const root = await realpath(cwd);
  if (policy.mode === 'workspace-write' && (!policy.workspaceRoot || !inside(await realpath(policy.workspaceRoot), root))) throw new Error('视频输出不在允许的工作区内。');
  let directory = root;
  for (const name of ['video', 'koubo']) {
    directory = join(directory, name);
    await mkdir(directory).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory) throw new Error('视频输出目录不能是链接。');
  }
  return directory;
}

export async function readLocal(ctx: Context, exec: ToolExecution, path: string, maxBytes: number): Promise<Buffer> {
  if (!exec.agent || (/^[a-z][a-z\d+.-]*:/iu.test(path) && !/^[a-z]:[\\/]/iu.test(path))) throw new Error('请选择会话可访问的本地文件。');
  const target = await ctx.fs.resolve(path, { cwd: ctx.workingDirectory.get(exec.agent.session), signal: exec.signal });
  const before = await ctx.fs.stat(target, exec.signal);
  if (before?.type !== 'file' || !before.size || before.size > maxBytes) throw new Error('文件为空、过大或不是普通文件。');
  const bytes = Buffer.from(await ctx.fs.readBytes(target, exec.signal, maxBytes));
  const after = await ctx.fs.stat(target, exec.signal);
  if (before.version !== after?.version || bytes.length !== before.size) throw new Error('文件在读取时发生变化，请重试。');
  return bytes;
}

export function imageMime(bytes: Buffer): string {
  let mime = '';
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) mime = 'image/png';
  else if (bytes.length > 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) mime = 'image/jpeg';
  else if (bytes.length > 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') mime = 'image/webp';
  if (!mime || bytes.length > 10 * 1024 * 1024) throw new Error('参考图须为不超过 10 MB 的 PNG、JPEG 或 WebP。');
  return mime;
}

export function imageData(bytes: Buffer): string { return `data:${imageMime(bytes)};base64,${bytes.toString('base64')}`; }

export function validateMp4(bytes: Buffer): void {
  if (bytes.length < 24 || bytes.toString('ascii', 4, 8) !== 'ftyp' || bytes.readUInt32BE(0) < 16 || bytes.readUInt32BE(0) > bytes.length) throw new Error('视频内容不是有效的 MP4 文件。');
}

export async function fetchVideo(url: string, signal: AbortSignal, fetcher: Fetch = fetch): Promise<Buffer> {
  try {
    // 下载地址独立授权，不能向它发送模型服务的 API Key。
    const response = await fetcher(videoUrl(url), { redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(180_000)]) });
    if (!response.ok) { await response.body?.cancel(); throw new Error(); }
    const bytes = Buffer.from(await readBounded(response, 256 * 1024 * 1024));
    validateMp4(bytes);
    return bytes;
  } catch { throw new Error('视频尚未成功下载，请查询同一任务重新下载，不要重新生成。'); }
}

export async function saveVideo(ctx: Context, exec: ToolExecution, bytes: Buffer) {
  validateMp4(bytes);
  const directory = await outputDirectory(ctx, exec);
  const path = join(directory, `clip-${randomUUID()}.mp4`);
  const file = await open(path, 'wx');
  try {
    await file.writeFile(bytes, { signal: exec.signal });
    if ((await file.stat()).size !== bytes.length) throw new Error('视频保存不完整。');
  } catch (error) { await file.close(); await unlink(path).catch(() => undefined); throw error; }
  await file.close();
  return { path, bytes: bytes.length, format: 'mp4' as const };
}
