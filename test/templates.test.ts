import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import { afterEach, expect, it } from 'vitest';
import { createTemplate, templates } from '../src/templates.js';

const skillRoot = fileURLToPath(new URL('../skills/koubo/', import.meta.url));
const roots: string[] = [];
async function fixture(mode = 'workspace-write') {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'koubo-templates-'))); roots.push(root);
  const ctx = { workingDirectory: { get: () => root }, fs: { processPathFromHostPath: (path: string) => path },
    sandboxPolicy: { resolve: () => ({ mode, workspaceRoot: root }) } } as unknown as Context;
  const exec = { signal: new AbortController().signal, agent: { session: { id: 'templates' } } } as ToolExecution;
  return { root, ctx, exec };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

it('随包模板与所记录的原版源码一致，包括圆窗、花字和包装组件', async () => {
  const upstream = JSON.parse(await readFile(join(skillRoot, 'upstream.json'), 'utf8'));
  expect(upstream.commit).toBe('f661a6c047bb74ea306ef58aeb1d461a52c01871');
  expect(Object.keys(upstream.templates)).toHaveLength(747);
  for (const [file, hash] of Object.entries(upstream.templates)) {
    expect(createHash('sha256').update(await readFile(join(skillRoot, file))).digest('hex'), file).toBe(hash);
  }
});

it('从公开模板创建独立工作区工程，保留原版依赖与布局，并附带剪辑脚本', async () => {
  const { ctx, exec, root } = await fixture();
  for (const template of templates) {
    const result = await createTemplate(ctx, exec, template.id);
    expect(result.project.startsWith(join(root, 'video', 'koubo'))).toBe(true);
    expect(await readFile(join(result.project, 'src/Root.tsx'), 'utf8')).toBe(await readFile(join(skillRoot, 'templates', template.id, 'src/Root.tsx'), 'utf8'));
    const manifest = JSON.parse(await readFile(join(result.project, 'package.json'), 'utf8'));
    const original = JSON.parse(await readFile(join(skillRoot, 'templates', template.id, 'package.json'), 'utf8'));
    expect(manifest.dependencies).toEqual(original.dependencies);
    expect(manifest.packageManager).toBe('pnpm@11.25.0');
    expect(await readFile(result.guide, 'utf8')).toContain('clips.json');
    expect(await readFile(join(result.project, 'koubo/scripts/assemble.py'), 'utf8')).toContain('CLIP_ROOT / CLIPS[sid]');
  }
});

it('只读策略或无效模板不能写入工程，重复创建不覆盖旧工程', async () => {
  const readOnly = await fixture('read-only');
  await expect(createTemplate(readOnly.ctx, readOnly.exec, 'lin-169')).rejects.toThrow('只读');
  expect(await readdir(readOnly.root)).toEqual([]);
  const { ctx, exec, root } = await fixture();
  await expect(createTemplate(ctx, exec, '../../elsewhere')).rejects.toThrow('模板');
  expect(await readdir(root)).toEqual([]);
  const one = await createTemplate(ctx, exec, 'lin-169'), two = await createTemplate(ctx, exec, 'lin-169');
  expect(one.project).not.toBe(two.project);
  expect(await readFile(join(one.project, 'src/Lin.tsx'), 'utf8')).toBe(await readFile(join(two.project, 'src/Lin.tsx'), 'utf8'));
});
