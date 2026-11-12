import { build } from 'tsdown';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url)), out = join(root, '.cache/studio-preview');
await mkdir(out, { recursive: true });
await build({ config: false, entry: { app: join(root, 'scripts/fixtures/studio.tsx') }, outDir: out, format: 'esm', platform: 'browser', dts: false, clean: false, deps: { alwaysBundle: [/./] }, define: { 'process.env.NODE_ENV': JSON.stringify('development') } });
await build({ config: false, entry: { routes: join(root, 'src/routes.ts') }, outDir: out, format: 'esm', platform: 'node', dts: false, clean: false });
await writeFile(join(out, 'package.json'), '{"type":"module"}');
const cwd = join(out, 'workspace'), directory = join(cwd, 'video/koubo/edit-lin-169-demo/out'); await mkdir(directory, { recursive: true });
const video = join(directory, '预览验证.mp4');
const render = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x396b55:s=640x360:d=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video]);
if (render.status !== 0) throw new Error('无法创建预览测试视频');
let handler;
const { registerLibraryRoutes } = await import(new URL('../.cache/studio-preview/routes.mjs', import.meta.url));
registerLibraryRoutes({ effect: run => run(), webServer: { register: route => { handler = route.handler; } }, connection: { requestRejection: () => undefined }, fs: { processPathFromHostPath: path => path }, sessionController: { list: async () => ({ items: [{ sessionId: 'demo', cwd }] }) } }, root);
if (process.argv.includes('--build-only')) process.exit(0);
const server = createServer(async (req, res) => {
  if (req.url?.startsWith('/dsh-koubo/')) return handler(req, res);
  if (req.url === '/app.mjs') { res.setHeader('content-type', 'text/javascript'); res.end(await readFile(join(out, 'app.js'))); return; }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width,initial-scale=1"><title>口播工作室预览</title><style>html,body,#root{height:100%;margin:0;font-family:system-ui}#fixture{position:fixed;bottom:0;right:0;z-index:10;font-size:11px;background:#fff;color:#222;max-width:420px}#output{max-height:90px;overflow:auto;white-space:pre-wrap}</style><div id="root"></div><aside id="fixture"><button id="empty">测试无会话</button><div id="output"></div></aside><script type="module" src="/app.mjs"></script></html>');
});
server.listen(4178, '127.0.0.1', () => console.log('Studio preview: http://127.0.0.1:4178'));
