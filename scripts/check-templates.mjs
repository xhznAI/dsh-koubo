import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Context } from '@deepseek-ai/cordis';
import * as plugin from '../lib/index.js';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = await realpath(await mkdtemp(join(tmpdir(), 'koubo-original-')));
const cache = join(root, '.cache/original-template-deps'), evidence = join(root, '.cache/template-preview');
const ctx = new Context(), tools = new Map();
ctx.provide('tools', { register: tool => tools.set(tool.name, tool) });
ctx.provide('skills', { registerProvider() {} });
ctx.provide('settings', {});
ctx.provide('workingDirectory', { get: () => workspace });
ctx.provide('fs', { processPathFromHostPath: path => path });
ctx.provide('sandboxPolicy', { resolve: () => ({ mode: 'workspace-write', workspaceRoot: workspace }) });
const fiber = ctx.plugin(plugin, { baseUrl: 'https://example.invalid', apiKey: '' });
const execution = { signal: new AbortController().signal, agent: { session: { id: 'original-templates-check' } } };
let browser;
const json = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);

async function media(path, vertical = false) {
  await run('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', `color=c=0x405971:s=${vertical ? '360x640' : '640x360'}:r=30`,
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-vf', vertical
      ? 'drawbox=x=120:y=100:w=120:h=140:color=0xe5c6a6:t=fill,drawbox=x=70:y=255:w=220:h=385:color=0x26354c:t=fill'
      : 'drawbox=x=270:y=80:w=100:h=100:color=0xe5c6a6:t=fill,drawbox=x=230:y=190:w=180:h=170:color=0x26354c:t=fill',
    '-t', '4', '-c:v', 'libx264', '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path]);
}

try {
  await new Promise(resolve => setTimeout(resolve, 20));
  const templateTool = tools.get('koubo_template'); assert(templateTool);
  const { templates } = await templateTool.execute({}, execution);
  const projects = new Map();
  for (const template of templates) {
    const result = await templateTool.execute({ template: template.id }, execution);
    projects.set(template.id, result.project);
    await mkdir(join(result.project, 'public'), { recursive: true });
  }
  console.log('正在安装原版模板的公开依赖（保留为可复用缓存）。');
  await mkdir(cache, { recursive: true });
  const manifest = JSON.parse(await readFile(join(projects.get('lin-169'), 'package.json'), 'utf8'));
  // 多套原版工程使用同一依赖集合，测试时共用下载缓存，模板源码不改写。
  for (const project of projects.values()) {
    const pkg = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
    assert.deepEqual(pkg.dependencies, manifest.dependencies);
  }
  await json(join(cache, 'package.json'), manifest);
  await writeFile(join(cache, 'pnpm-workspace.yaml'), 'packages: []\nautoInstallPeers: true\n');
  await run('corepack', ['pnpm', 'install', '--ignore-scripts', '--reporter=append-only'], { cwd: cache, maxBuffer: 8 * 1024 * 1024, timeout: 900_000 });
  for (const project of projects.values()) await symlink(join(cache, 'node_modules'), join(project, 'node_modules'), 'junction');
  const require = createRequire(await realpath(join(cache, 'node_modules/@remotion/cli/package.json')));
  const { bundle } = require('@remotion/bundler');
  const { openBrowser, selectComposition, renderStill, renderMedia } = require('@remotion/renderer');

  const lin = projects.get('lin-169'), huazi = projects.get('huazi-916');
  await media(join(lin, 'public/main.mp4'));
  await mkdir(join(lin, 'public/broll'), { recursive: true });
  await run('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:r=30', '-t', '4',
    '-c:v', 'libx264', '-threads', '2', '-pix_fmt', 'yuv420p', join(lin, 'public/broll/B01.mp4')]);
  await json(join(lin, 'src/scenes.json'), { total: 4, config: { face: [960, 390], audio: 'main.mp4' }, scenes: [
    { type: 'host', a: 0, b: 0.8, lower: ['原版模板', '人物全屏'] },
    { type: 'board', a: 0.8, b: 1.8, tag: '原版题板', title: '人物位置由分镜选择', big: ['左上圆形小窗'], pip: 'circle-tl' },
    { type: 'board', a: 1.8, b: 2.8, tag: '原版题板', title: '相同布局与动效', big: ['左下圆形小窗'], pip: 'circle-bl' },
    { type: 'broll', a: 2.8, b: 4, clip: 'B01', pip: 'rect-r', chips: ['演示画面 + 人物讲解'], chipsAt: 2.9 },
  ] });
  await json(join(lin, 'src/cues.json'), { total: 4, subs: [] });
  await media(join(huazi, 'public/main.mp4'), true);
  await copyFile(join(lin, 'public/broll/B01.mp4'), join(huazi, 'public/demo.mp4'));
  await run('ffmpeg', ['-nostdin', '-v', 'error', '-i', join(huazi, 'public/main.mp4'), '-vn', join(huazi, 'public/voice.wav')]);
  await run('uv', ['run', '--with', 'numpy', 'python', join(huazi, 'koubo/scripts/make_assets.py'), join(huazi, 'public')], { maxBuffer: 2 * 1024 * 1024, timeout: 120_000 });
  const narration = '数字人讲解配合内容画面';
  await json(join(huazi, 'src/tl.json'), { total: 4, segs: [{ i: 1, start: 0, end: 4, text: narration,
    chars: Object.fromEntries([...narration].map((_, index) => [index, index * 4 / narration.length])) }] });
  await json(join(huazi, 'src/edit.json'), { preset: '标准', tail: 0, title: { left: '原版花字', right: '数字人口播' },
    keys: ['数字人', '内容画面'], emojis: [{ at: 0.3, e: '😍', side: 'r' }],
    cards: [{ type: 'stamp', at: 0.2, until: 1.1, text: '原版动效', color: 'green' }],
    showcase: [{ from: 1.4, to: 3.6, items: [{ src: 'demo.mp4', label: '作品展示' }] }],
    credits: 'Animated emoji: Google Noto',
  });

  const bundles = new Map();
  for (const [id, project] of projects) {
    console.log(`正在构建原版模板：${id}`);
    bundles.set(id, await bundle({ entryPoint: join(project, 'src/index.ts'), outDir: join(project, 'bundle'), rootDir: project,
      publicDir: join(project, 'public'), gitSource: null, enableCaching: true }));
  }
  // 仅控制本测试创建的无头浏览器；可复用已下载的浏览器可执行文件。
  process.chdir(cache);
  browser = await openBrowser('chrome', { browserExecutable: process.env.KOUBO_TEST_BROWSER ?? null, logLevel: 'error' });
  await mkdir(evidence, { recursive: true });
  for (const [id, compositionId, frames] of [['lin-169', 'Lin', [18, 48, 78, 108]], ['huazi-916', 'Huazi', [24, 72]]]) {
    console.log(`正在验证原版预览与成片：${id}`);
    const common = { serveUrl: bundles.get(id), puppeteerInstance: browser, logLevel: 'error' };
    const composition = await selectComposition({ ...common, id: compositionId });
    for (const [index, frame] of frames.entries()) await renderStill({ ...common, composition, frame, imageFormat: 'png',
      output: join(evidence, `${id}-${index + 1}.png`), overwrite: true });
    const output = join(evidence, `${id}.mp4`);
    await renderMedia({ ...common, composition, outputLocation: output, codec: 'h264', audioCodec: 'aac', crf: 24,
      x264Preset: 'veryfast', concurrency: 2, overwrite: true });
    const info = JSON.parse((await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output])).stdout);
    assert(info.streams.some(stream => stream.codec_type === 'audio'));
    assert(info.streams.some(stream => stream.codec_type === 'video' && stream.width === composition.width && stream.height === composition.height));
    assert(Math.abs(Number(info.format.duration) - 4) < 0.2);
  }
  console.log(JSON.stringify({ result: '通过', originalTemplatesBuilt: bundles.size, rendered: ['Lin', 'Huazi'], evidence }));
} finally {
  if (browser) await browser.close({ silent: true });
  await fiber.dispose(); await ctx.fiber.dispose();
  process.chdir(root);
  await rm(workspace, { recursive: true, force: true });
}
