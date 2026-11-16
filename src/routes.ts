import { constants } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage } from 'node:http';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import { ZodError, z } from 'zod';
import type {} from '@deepseek-ai/dsh-host-webserver';
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-api-session-controller';
import { byteRange, LibraryError, libraryRoot, readLibrary, resolveVideo, videoType } from './library.js';
import { galleryStyles } from './gallery.js';
import { avatarImage, avatarRoot, importAvatar } from './avatars.js';
import { outputDirectory } from './files.js';
import { AvatarReferences, avatarReferenceId, avatarReferenceLink } from './avatar-references.js';
import type { AvatarReference } from './avatar-catalog.js';

async function requestJson(req: IncomingMessage, signal: AbortSignal, limit: number): Promise<unknown> {
  if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') throw new LibraryError(415, '请使用 JSON 上传素材。');
  if (Number(req.headers['content-length']) > limit) throw new LibraryError(413, '上传内容过大。');
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of req) {
    signal.throwIfAborted();
    bytes += chunk.length;
    if (bytes > limit) throw new LibraryError(413, '上传内容过大。');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new LibraryError(400, '素材信息无效。'); }
}

export function registerLibraryRoutes(ctx: Context, packageRoot = fileURLToPath(new URL('../', import.meta.url)), savedReferences?: AvatarReferences): void {
  let memory: AvatarReference[] = [];
  const references = savedReferences ?? new AvatarReferences(() => memory, async items => { memory = items; });
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/dsh-koubo', async handler(req, res) {
    const abort = new AbortController();
    const close = () => { if (!res.writableEnded) abort.abort(); };
    res.on('close', close);
    res.setHeader('cache-control', 'no-store'); res.setHeader('x-content-type-options', 'nosniff');
    try {
      const rejection = ctx.connection.requestRejection(req);
      if (rejection !== undefined) { res.statusCode = rejection; res.end(); return; }
      if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) throw new LibraryError(403, '请求来源无效。');
      const url = new URL(req.url ?? '/', 'http://localhost');
      const avatars = url.pathname === '/dsh-koubo/avatars';
      const allowed = avatars ? ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'] : url.pathname === '/dsh-koubo/avatar-use' ? ['POST'] : ['GET', 'HEAD'];
      if (!allowed.includes(req.method ?? '')) { res.setHeader('allow', allowed.join(', ')); throw new LibraryError(405, '请求方法无效。'); }
      if (url.pathname.startsWith('/dsh-koubo/gallery/')) {
        const name = url.pathname.slice('/dsh-koubo/gallery/'.length);
        const poster = galleryStyles.find(item => name === `posters/${item.id}.jpg`);
        const asset = poster ? join(packageRoot, 'assets/gallery', name) : ['index.html', 'player.js'].includes(name) ? join(packageRoot, 'lib/gallery', name) : undefined;
        if (!asset) throw new LibraryError(404, '未找到样式预览。');
        const body = await readFile(asset, { signal: abort.signal });
        res.setHeader('content-type', poster ? 'image/jpeg' : name === 'index.html' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
        res.setHeader('content-length', body.length);
        res.setHeader('content-security-policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self'");
        res.end(req.method === 'HEAD' ? undefined : body); return;
      }
      if (!['/dsh-koubo/library', '/dsh-koubo/media', '/dsh-koubo/avatars', '/dsh-koubo/avatar-image', '/dsh-koubo/avatar-use'].includes(url.pathname)) throw new LibraryError(404, '未找到。');
      if (url.pathname === '/dsh-koubo/avatar-image' || url.pathname === '/dsh-koubo/avatar-use') {
        const id = url.pathname.endsWith('avatar-use') ? z.object({ id: avatarReferenceId }).strict().parse(await requestJson(req, abort.signal, 1024)).id : avatarReferenceId.parse(url.searchParams.get('id'));
        const item = await references.get(id);
        if (!item.available) throw new LibraryError(410, '原图片已移动或删除，请重新添加形象引用。');
        if (url.pathname.endsWith('avatar-use')) { res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(item)); return; }
        const image = await avatarImage(dirname(item.imagePath), basename(item.imagePath));
        res.setHeader('content-type', image.mime); res.setHeader('content-length', image.bytes.length);
        res.setHeader('content-security-policy', "default-src 'none'; sandbox");
        res.end(req.method === 'HEAD' ? undefined : image.bytes); return;
      }
      if (avatars && (req.method === 'PATCH' || req.method === 'DELETE')) {
        const value = await requestJson(req, abort.signal, 32 * 1024);
        if (req.method === 'DELETE') { await references.remove(value, abort.signal); res.statusCode = 204; res.end(); }
        else { res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(await references.update(value, abort.signal))); }
        return;
      }
      const sessionId = url.searchParams.get('sessionId');
      if (avatars && !sessionId && (req.method === 'GET' || req.method === 'HEAD')) {
        const data = await references.refresh(undefined, abort.signal);
        res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data)); return;
      }
      if (!sessionId || sessionId.length > 200) throw new LibraryError(400, '请先打开工作区对话。');
      const { items } = await ctx.sessionController.list({}, abort.signal);
      const session = items.find(item => item.sessionId === sessionId);
      if (!session || !session.cwd || ctx.fs.processPathFromHostPath(session.cwd) !== session.cwd) throw new LibraryError(404, '本地工作区不可用。');
      if (avatars) {
        if (avatars && (req.method === 'GET' || req.method === 'HEAD')) {
          const data = await references.refresh(session.cwd, abort.signal);
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data)); return;
        }
        const value = await requestJson(req, abort.signal, 15 * 1024 * 1024);
        if (avatarReferenceLink.safeParse(value).success) {
          const result = await references.link(value, session.cwd, abort.signal);
          res.statusCode = 201; res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(result)); return;
        }
        const live = await ctx.sessionController.resolveAgent(sessionId as never);
        if ('error' in live || ctx.workingDirectory.get(live.agent.session) !== session.cwd) throw new LibraryError(409, '工作区已变化，请重新打开对话。');
        try { await outputDirectory(ctx, { agent: live.agent, signal: abort.signal } as ToolExecution); }
        catch { throw new LibraryError(403, '当前工作区不允许保存或修改形象。'); }
        const root = await avatarRoot(session.cwd, true);
        if (!root) throw new LibraryError(404, '形象不存在。');
        const result = await references.add(root, await importAvatar(root, value, abort.signal), abort.signal); res.statusCode = 201;
        res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(result)); return;
      }
      if (url.pathname === '/dsh-koubo/library') {
        const library = await readLibrary(session.cwd, abort.signal);
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(req.method === 'HEAD' ? undefined : JSON.stringify(library)); return;
      }
      const root = await libraryRoot(session.cwd);
      if (!root) throw new LibraryError(404, '视频不存在。');
      const path = url.searchParams.get('path') ?? '';
      const file = await open(await resolveVideo(root, path), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        const info = await file.stat();
        if (!info.isFile() || info.size <= 0) throw new LibraryError(404, '视频不存在。');
        res.setHeader('accept-ranges', 'bytes');
        let range;
        try { range = byteRange(req.headers.range, info.size); }
        catch (error) { res.setHeader('content-range', `bytes */${info.size}`); throw error; }
        res.statusCode = range.partial ? 206 : 200;
        if (range.partial) res.setHeader('content-range', `bytes ${range.start}-${range.end}/${info.size}`);
        res.setHeader('content-type', videoType(path)!);
        res.setHeader('content-length', range.end - range.start + 1);
        if (url.searchParams.get('download') === '1') res.setHeader('content-disposition', `attachment; filename="video.${path.split('.').at(-1)}"; filename*=UTF-8''${encodeURIComponent(path.split('/').at(-1)!).replace(/'/gu, '%27')}`);
        if (req.method === 'HEAD') res.end();
        else await pipeline(file.createReadStream({ start: range.start, end: range.end, autoClose: false }), res, { signal: abort.signal });
      } finally { await file.close(); }
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      res.removeHeader('content-length');
      res.statusCode = error instanceof LibraryError ? error.status : error instanceof ZodError ? 400 : (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 503;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ message: error instanceof LibraryError ? error.message : error instanceof ZodError ? '请检查人物名称、提示词和素材信息。' : '无法处理口播素材，请刷新重试。' }));
    } finally { res.off('close', close); }
  } }));
}
