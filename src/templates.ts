import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import { outputDirectory } from './files.js';

const skillRoot = fileURLToPath(new URL('../skills/koubo/', import.meta.url));
export const templates = [
  { id: 'lin-169', name: '小林式解说', aspectRatio: '16:9', composition: 'Lin' },
  { id: 'huazi-916', name: '网红花字口播', aspectRatio: '9:16', composition: 'Huazi' },
  { id: 'reference/launch-169', name: '发布解读', aspectRatio: '16:9', composition: 'Film' },
  { id: 'reference/tutorial-169', name: '保姆级教程', aspectRatio: '16:9', composition: 'Tutorial' },
  { id: 'reference/multihost-169', name: '多主播多语言', aspectRatio: '16:9', composition: 'Tutorial' },
  { id: 'packaging', name: '包装组件库', aspectRatio: '16:9', composition: 'Gallery' },
] as const;

/** 将原版工程与剪辑脚本放入新目录，保留原有布局、组件及依赖版本。 */
export async function createTemplate(ctx: Context, exec: ToolExecution, id: string) {
  const template = templates.find(item => item.id === id);
  if (!template) throw new Error('请选择 koubo_template 列出的模板。');
  const directory = await outputDirectory(ctx, exec);
  const project = await mkdtemp(join(directory, `edit-${id.replaceAll('/', '-')}-`));
  let completed = false;
  try {
    const source = join(skillRoot, 'templates', id);
    for (const entry of await readdir(source)) {
      exec.signal.throwIfAborted();
      await cp(join(source, entry), join(project, entry), { recursive: true, force: false, errorOnExist: true });
    }
    for (const resource of ['scripts', 'references', 'upstream.json', 'UPSTREAM-LICENSE', 'UPSTREAM-NOTICE.md', 'UPSTREAM-THIRD_PARTY.md']) {
      exec.signal.throwIfAborted();
      await cp(join(skillRoot, resource), join(project, 'koubo', resource), { recursive: true, force: false, errorOnExist: true });
    }
    const manifestPath = join(project, 'package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.packageManager = 'pnpm@11.25.0';
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { signal: exec.signal });
    await writeFile(join(project, '.nvmrc'), '24\n', { flag: 'wx', signal: exec.signal });
    exec.signal.throwIfAborted();
    completed = true;
    return { ...template, project, entryPoint: 'src/index.ts',
      install: 'corepack pnpm install', preview: 'corepack pnpm exec remotion studio src/index.ts',
      render: `corepack pnpm exec remotion render src/index.ts ${template.composition} out/film.mp4`,
      guide: join(project, 'koubo', 'references', 'workflow.md'),
      message: '原版模板已放入新工程。按本期内容编辑时间轴并准备素材，然后安装工程依赖、预览和渲染。' };
  } finally {
    if (!completed) await rm(project, { recursive: true, force: true });
  }
}
