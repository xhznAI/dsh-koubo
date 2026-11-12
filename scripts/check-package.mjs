import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const release = join(root, '.cache', 'release');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
async function command(binary, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`${binary} 执行失败：${code}`)));
  });
}

await mkdir(release, { recursive: true });
await command('corepack', ['pnpm', 'pack', '--pack-destination', release], root);
const archive = (await readdir(release)).find(file => file === `dsh-koubo-${manifest.version}.tgz`);
assert(archive, '缺少当前版本发布包');
const consumer = await mkdtemp(join(tmpdir(), 'koubo-consumer-'));
try {
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module', packageManager: manifest.packageManager,
    dependencies: { 'dsh-koubo': `file:${join(release, archive)}`, '@deepseek-ai/cordis': manifest.peerDependencies['@deepseek-ai/cordis'],
      '@deepseek-ai/schemastery': manifest.peerDependencies['@deepseek-ai/schemastery'] } }));
  await writeFile(join(consumer, 'pnpm-workspace.yaml'), 'autoInstallPeers: false\nstrictPeerDependencies: false\n');
  await command('corepack', ['pnpm', 'install', '--ignore-scripts'], consumer);
  await writeFile(join(consumer, 'verify.mjs'), `
import assert from 'node:assert/strict';
import { access, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import * as plugin from 'dsh-koubo';
import { SourceRegistry, modelSchema } from 'dsh-koubo/api';
import { GROK_MODEL, createGrokSource } from 'dsh-koubo/grok';
const packageRoot = dirname(fileURLToPath(import.meta.resolve('dsh-koubo/package.json')));
for (const path of ['assets/icon.svg', 'docs/plugin-detail.md', 'assets/readme-cover.png', 'assets/gallery/avatar.png', 'assets/gallery/posters/pack-Highlight.jpg', 'lib/gallery/index.html', 'lib/gallery/player.js', 'lib/gallery/THIRD_PARTY_LICENSES.txt', 'lib/client.js', 'locale/en.json', 'locale/zh.json', 'skills/koubo/templates/lin-169/src/Lin.tsx', 'skills/koubo/templates/huazi-916/src/Huazi.tsx',
  'skills/koubo/templates/huazi-916/public/emoji/1f60d.json', 'skills/koubo/UPSTREAM-LICENSE',
  'skills/koubo/scripts/assemble.py', 'skills/koubo/references/workflow.md']) await access(join(packageRoot, path));
const registry = new SourceRegistry();
registry.register(createGrokSource({ baseUrl: 'https://api.example', apiKey: '' }));
assert.equal(registry.list().length, 1);
assert.equal(modelSchema.parse(GROK_MODEL).id, 'grok-imagine-video-1.5');
const ctx = new Context(), tools = [], providers = [];
ctx.provide('tools', { register: tool => tools.push(tool) });
ctx.provide('skills', { registerProvider: provider => providers.push(provider) });
const workspace = join(process.cwd(), 'workspace');
await mkdir(workspace);
ctx.provide('fs', { processPathFromHostPath: path => path });
ctx.provide('workingDirectory', { get: () => workspace });
ctx.provide('sandboxPolicy', { resolve: () => ({ mode: 'workspace-write', workspaceRoot: workspace }) });
ctx.provide('settings', {});
const fiber = ctx.plugin(plugin, { baseUrl: 'https://api.example', apiKey: '' });
try {
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(tools.length, 6);
  const provider = providers[0]();
  const candidates = await provider.list();
  assert.equal(candidates[0].name, 'koubo');
  assert.match((await provider.get(candidates[0])).content, /koubo_assemble/);
  const project = await tools.find(tool => tool.name === 'koubo_template').execute({ template: 'lin-169' },
    { signal: new AbortController().signal, agent: { session: { id: 'package-check' } } });
  assert.equal(await readFile(join(project.project, 'src/Lin.tsx'), 'utf8'), await readFile(join(packageRoot, 'skills/koubo/templates/lin-169/src/Lin.tsx'), 'utf8'));
} finally { await fiber.dispose(); await ctx.fiber.dispose(); }
console.log('DSH 独立安装包、公开 API、Host 装载、原版技能与工程创建验证通过。');
`);
  await command(process.execPath, ['verify.mjs'], consumer);
} finally {
  // 所有验证进程退出后，删除本次创建的临时消费项目。
  await rm(consumer, { recursive: true, force: true });
}
