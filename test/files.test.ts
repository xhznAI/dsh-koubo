import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, realpath, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import { imageData, outputDirectory, saveVideo } from '../src/files.js';

const roots: string[] = [];
async function fixture(mode = 'workspace-write') {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'koubo-files-'))); roots.push(root);
  const ctx = { workingDirectory: { get: () => root }, fs: { processPathFromHostPath: (value: string) => value },
    sandboxPolicy: { resolve: () => ({ mode, workspaceRoot: root }) } } as unknown as Context;
  const exec = { signal: new AbortController().signal, agent: { session: { id: 'session' } } } as ToolExecution;
  return { ctx, exec, root };
}
afterEach(async () => { await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

describe('工作区文件边界', () => {
  it('只读策略阻止创建输出目录', async () => {
    const { ctx, exec, root } = await fixture('read-only');
    await expect(outputDirectory(ctx, exec)).rejects.toThrow('只读');
    expect(await readdir(root)).toEqual([]);
  });
  it('拒绝符号链接输出目录', async () => {
    const { ctx, exec, root } = await fixture(), other = await fixture();
    await symlink(other.root, join(root, 'video'));
    await expect(outputDirectory(ctx, exec)).rejects.toThrow('链接');
    expect(await readdir(other.root)).toEqual([]);
  });
  it('保存成品，不产生任务 JSON、数据库或账单文件', async () => {
    const { ctx, exec, root } = await fixture();
    const bytes = Buffer.alloc(32); bytes.writeUInt32BE(24); bytes.write('ftyp', 4); bytes.write('isom', 8);
    const video = await saveVideo(ctx, exec, bytes);
    expect(video.path.startsWith(join(root, 'video', 'koubo'))).toBe(true);
    const files = await readdir(root, { recursive: true });
    expect(files).toHaveLength(3);
    expect(files.filter(path => path.endsWith('.mp4'))).toHaveLength(1);
  });
  it('拒绝伪装图片而保留受支持的图片类型', () => {
    expect(() => imageData(Buffer.from('<html>image.png</html>'))).toThrow('参考图');
    expect(imageData(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]))).toMatch(/^data:image\/png;base64,/);
  });
});
