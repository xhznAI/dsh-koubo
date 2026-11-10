import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, readdir, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import { expect, it } from 'vitest';
import { assembleClips } from '../src/assemble.js';

const run = promisify(execFile);
const canRender = spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;

it.skipIf(!canRender)('真实 FFmpeg 合成不同规格的片段，保留音轨并清理临时文件', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'koubo-assemble-')));
  try {
    const inputs = [join(root, 'first.mp4'), join(root, 'second.mp4')];
    for (const [index, path] of inputs.entries()) {
      await run('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', `color=c=${index ? 'blue' : 'red'}:s=${index ? '160x240' : '320x180'}:r=${index ? 25 : 24}`,
        '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '0.4', '-c:v', 'libx264', '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path]);
    }
    const ctx = { workingDirectory: { get: () => root },
      fs: { processPathFromHostPath: (value: string) => value, resolve: async (path: string) => resolve(root, path),
        stat: async (path: string) => { const file = await stat(path); return { type: 'file', size: file.size, version: `${file.mtimeMs}-${file.size}` }; },
        readBytes: async (path: string) => readFile(path) },
      sandboxPolicy: { resolve: () => ({ mode: 'workspace-write', workspaceRoot: root }) } } as unknown as Context;
    const exec = { signal: new AbortController().signal, agent: { session: { id: 'render' } } } as ToolExecution;
    const result = await assembleClips(ctx, exec, inputs, '9:16');
    const info = JSON.parse((await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', result.path])).stdout);
    expect(info.streams.some((stream: { codec_type: string; width: number; height: number }) => stream.codec_type === 'video' && stream.width === 720 && stream.height === 1280)).toBe(true);
    expect(info.streams.some((stream: { codec_type: string }) => stream.codec_type === 'audio')).toBe(true);
    expect(Number(info.format.duration)).toBeGreaterThanOrEqual(0.7);
    expect(await readdir(join(root, 'video', 'koubo'))).toEqual([result.path.split('/').at(-1)]);
  } finally { await rm(root, { recursive: true, force: true }); }
}, 30_000);
