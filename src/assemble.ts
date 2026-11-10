import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import type { ToolExecution } from '@deepseek-ai/dsh-tools';
import { outputDirectory, readLocal, validateMp4 } from './files.js';

export async function mediaCommand(binary: string, args: string[], signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { signal, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', failedToStart = false;
    child.stdout.on('data', chunk => { output = (output + String(chunk)).slice(-65536); });
    // 不向工具返回进程日志，避免本地路径或文件元数据进入错误提示。
    child.stderr.resume();
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => { killTimer = setTimeout(() => child.kill('SIGKILL'), 2000); killTimer.unref(); };
    signal.addEventListener('abort', abort, { once: true });
    child.once('error', () => { failedToStart = true; });
    // 等待子进程真正关闭后再清理临时目录。
    child.once('close', code => {
      signal.removeEventListener('abort', abort);
      if (killTimer) clearTimeout(killTimer);
      if (signal.aborted) reject(new Error('视频合成已停止。'));
      else if (failedToStart) reject(new Error('无法启动视频合成，请确认 FFmpeg 和 ffprobe 已安装。'));
      else if (code === 0) resolve(output);
      else reject(new Error('视频合成未完成，请检查片段包含视频和音轨。'));
    });
  });
}

/** 只做本地规范化与拼接；不改写口播、不生成字幕时间轴、不再次调用模型。 */
export async function assembleClips(ctx: Context, exec: ToolExecution, paths: string[], aspectRatio: '16:9' | '9:16' | '1:1') {
  if (paths.length < 1 || paths.length > 24) throw new Error('每次可合成 1 至 24 个片段。');
  const directory = await outputDirectory(ctx, exec);
  const signal = AbortSignal.any([exec.signal, AbortSignal.timeout(20 * 60 * 1000)]);
  await mediaCommand('ffmpeg', ['-version'], signal);
  await mediaCommand('ffprobe', ['-version'], signal);
  const stage = await mkdtemp(join(directory, '.assemble-'));
  const output = join(directory, `koubo-${randomUUID()}.mp4`);
  let completed = false, totalBytes = 0, totalSeconds = 0;
  const [width, height] = aspectRatio === '16:9' ? [1280, 720] : aspectRatio === '9:16' ? [720, 1280] : [720, 720];
  try {
    for (let index = 0; index < paths.length; index++) {
      const bytes = await readLocal(ctx, exec, paths[index]!, 256 * 1024 * 1024);
      validateMp4(bytes); totalBytes += bytes.length;
      if (totalBytes > 1024 * 1024 * 1024) throw new Error('单次合成的片段总大小不能超过 1 GB。');
      const input = join(stage, `input-${index}.mp4`), normalized = join(stage, `clip-${index}.mp4`);
      await writeFile(input, bytes, { signal, flag: 'wx' });
      const info = JSON.parse(await mediaCommand('ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_streams', '-show_format', '-of', 'json', input], signal));
      const duration = Number(info.format?.duration);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 300 || !Array.isArray(info.streams)
        || !info.streams.some((stream: { codec_type: string }) => stream.codec_type === 'video')
        || !info.streams.some((stream: { codec_type: string }) => stream.codec_type === 'audio')) throw new Error('每个口播片段须包含视频和音轨，且不超过 5 分钟。');
      totalSeconds += duration;
      if (totalSeconds > 600) throw new Error('单次合成总时长不能超过 10 分钟。');
      await mediaCommand('ffmpeg', ['-nostdin', '-v', 'error', '-n', '-protocol_whitelist', 'file,pipe', '-i', input,
        '-map', '0:v:0', '-map', '0:a:0', '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30`,
        '-af', 'aresample=48000:async=1:first_pts=0,apad', '-t', String(duration),
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ac', '2', '-ar', '48000', '-map_metadata', '-1', normalized], signal);
    }
    const list = join(stage, 'clips.txt');
    await writeFile(list, paths.map((_, index) => `file 'clip-${index}.mp4'`).join('\n'), { signal, flag: 'wx' });
    await mediaCommand('ffmpeg', ['-nostdin', '-v', 'error', '-n', '-protocol_whitelist', 'file,pipe', '-f', 'concat', '-safe', '1', '-i', list,
      '-c', 'copy', '-movflags', '+faststart', '-map_metadata', '-1', output], signal);
    const size = (await stat(output)).size;
    if (!size) throw new Error('合成结果为空。');
    completed = true;
    return { path: output, bytes: size, format: 'mp4', width, height, clips: paths.length };
  } finally {
    await rm(stage, { recursive: true, force: true });
    if (!completed) await rm(output, { force: true });
  }
}
