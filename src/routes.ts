import { constants } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Context } from '@deepseek-ai/cordis';
import type {} from '@deepseek-ai/dsh-host-webserver';
import type {} from '@deepseek-ai/dsh-client-connection';
import type {} from '@deepseek-ai/dsh-api-session-controller';
import { byteRange, LibraryError, libraryRoot, readLibrary, resolveVideo, videoType } from './library.js';
import { galleryStyles } from './gallery.js';

export function registerLibraryRoutes(ctx: Context, packageRoot = fileURLToPath(new URL('../', import.meta.url))): void {
  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/dsh-koubo', async handler(req, res) {
    const abort = new AbortController();
    const close = () => { if (!res.writableEnded) abort.abort(); };
    res.on('close', close);
    res.setHeader('cache-control', 'no-store'); res.setHeader('x-content-type-options', 'nosniff');
    try {
      const rejection = ctx.connection.requestRejection(req);
      if (rejection !== undefined) { res.statusCode = rejection; res.end(); return; }
      if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) throw new LibraryError(403, '请求来源无效。');
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('allow', 'GET, HEAD'); throw new LibraryError(405, '请求方法无效。'); }
      const url = new URL(req.url ?? '/', 'http://localhost');
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
      if (!['/dsh-koubo/library', '/dsh-koubo/media'].includes(url.pathname)) throw new LibraryError(404, '未找到。');
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId || sessionId.length > 200) throw new LibraryError(400, '请先打开工作区对话。');
      const { items } = await ctx.sessionController.list({}, abort.signal);
      const session = items.find(item => item.sessionId === sessionId);
      if (!session || !session.cwd || ctx.fs.processPathFromHostPath(session.cwd) !== session.cwd) throw new LibraryError(404, '本地工作区不可用。');
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
      res.statusCode = error instanceof LibraryError ? error.status : (error as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 503;
      res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ message: error instanceof LibraryError ? error.message : '无法读取作品，请刷新重试。' }));
    } finally { res.off('close', close); }
  } }));
}
