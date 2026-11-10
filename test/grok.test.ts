import { describe, expect, it, vi } from 'vitest';
import { createGrokSource, GROK_MODEL } from '../src/grok.js';
import { apiBase, readBounded } from '../src/http.js';
import { fetchVideo } from '../src/files.js';

const signal = () => new AbortController().signal;
const input = { model: GROK_MODEL.id, prompt: '你好，欢迎收看。', duration: 5, resolution: '720p', aspectRatio: '9:16' };
const config = { baseUrl: 'https://video.example/api', apiKey: 'test-private-key' };

describe('Grok 异步协议', () => {
  it('使用 Base URL、Bearer 和原生配音，返回任务编号而非本地账单', async () => {
    const send = vi.fn().mockResolvedValue(Response.json({ request_id: 'job/01', usage: { cost: 500 } }));
    const source = createGrokSource(config, send);
    expect(await source.create(input, signal())).toEqual({ id: 'job/01', status: 'queued' });
    const [url, request] = send.mock.calls[0]!;
    expect(String(url)).toBe('https://video.example/api/v1/videos/generations');
    expect(request.headers.authorization).toBe('Bearer test-private-key');
    expect(request.redirect).toBe('error');
    expect(JSON.parse(request.body)).toEqual({ model: input.model, prompt: input.prompt, duration: 5, resolution: '720p', aspect_ratio: '9:16', generate_audio: true });
  });

  it('图生视频使用 image.url，比例由参考图决定', async () => {
    const send = vi.fn().mockResolvedValue(Response.json({ request_id: 'image-job' }));
    const source = createGrokSource(config, send);
    await source.create({ ...input, image: 'data:image/png;base64,aW1hZ2U=' }, signal());
    const body = JSON.parse(send.mock.calls[0]![1].body);
    expect(body.image).toEqual({ url: 'data:image/png;base64,aW1hZ2U=' });
    expect(body).not.toHaveProperty('aspect_ratio');
  });

  it.each(['pending', 'queued', 'running', 'failed', 'expired'] as const)('解析 %s 状态', async status => {
    const send = vi.fn().mockResolvedValue(Response.json({ status }));
    expect(await createGrokSource(config, send).get('job/01', signal())).toEqual({ id: 'job/01', status: status === 'pending' ? 'running' : status });
    expect(String(send.mock.calls[0]![0])).toBe('https://video.example/api/v1/videos/job%2F01');
  });

  it('成功结果只返回视频，不将后台 usage 变成本地调用记录', async () => {
    const source = createGrokSource(config, vi.fn().mockResolvedValue(Response.json({ status: 'done',
      video: { url: 'https://cdn.example/clip.mp4', duration: 5, respect_moderation: true }, usage: { cost_in_usd_ticks: 5000 }, model: input.model })));
    expect(await source.get('job', signal())).toEqual({ id: 'job', status: 'succeeded', video: { url: 'https://cdn.example/clip.mp4', duration: 5, format: 'mp4' } });
  });

  it('兼容渠道的根相对视频路径，下载请求仍不携带密钥', async () => {
    const source = createGrokSource(config, vi.fn().mockResolvedValue(Response.json({ status: 'done',
      video: { url: '/v1/videos/job/content', duration: 6, respect_moderation: true } })));
    const task = await source.get('job', signal());
    expect(task).toEqual({ id: 'job', status: 'succeeded', video: { url: 'https://video.example/v1/videos/job/content', duration: 6, format: 'mp4' } });
    if (task.status !== 'succeeded') throw new Error('任务未完成');
    const bytes = Buffer.alloc(32); bytes.writeUInt32BE(24); bytes.write('ftyp', 4);
    const download = vi.fn().mockResolvedValue(new Response(bytes));
    await fetchVideo(task.video.url, signal(), download);
    expect(download.mock.calls[0]![1]).not.toHaveProperty('headers');
    expect(JSON.stringify(task)).not.toContain(config.apiKey);
  });

  it.each(['//other.example/video.mp4', '/\\other.example/video.mp4', 'http://cdn.example/a.mp4',
    'https://user:secret@cdn.example/a.mp4', 'video.mp4'])('拒绝不安全或不明确的视频路径 %s', async url => {
    const source = createGrokSource(config, vi.fn().mockResolvedValue(Response.json({ status: 'done', video: { url, duration: 6 } })));
    await expect(source.get('job', signal())).rejects.toThrow('视频下载地址');
  });

  it('审核未通过、未知状态与缺失结果均不误报成功', async () => {
    const send = vi.fn().mockResolvedValueOnce(Response.json({ status: 'done', video: { url: 'https://cdn.example/clip.mp4', duration: 5, respect_moderation: false } }))
      .mockResolvedValueOnce(Response.json({ status: 'surprise' })).mockResolvedValueOnce(Response.json({ status: 'done' }));
    const source = createGrokSource(config, send);
    expect((await source.get('job', signal())).status).toBe('failed');
    await expect(source.get('job', signal())).rejects.toThrow('未知状态');
    await expect(source.get('job', signal())).rejects.toThrow('缺少下载信息');
  });

  it('提交失败不自动重试、不泄露响应中的密钥', async () => {
    const send = vi.fn().mockResolvedValue(new Response(config.apiKey, { status: 502 }));
    const error = await createGrokSource(config, send).create(input, signal()).catch(error => error);
    expect(error.message).toContain('不要重复生成');
    expect(error.message).not.toContain(config.apiKey);
    expect(send).toHaveBeenCalledTimes(1);
    const disconnected = vi.fn().mockRejectedValue(new Error(`Network error: ${config.apiKey}`));
    await expect(createGrokSource(config, disconnected).create(input, signal())).rejects.toThrow('提交结果未知');
    expect(disconnected).toHaveBeenCalledTimes(1);
  });

  it('无效能力与缺少密钥在网络调用前阻止提交', async () => {
    const send = vi.fn(), source = createGrokSource(config, send);
    await expect(source.create({ ...input, duration: 16 }, signal())).rejects.toThrow('时长');
    await expect(source.create({ ...input, resolution: '4k' }, signal())).rejects.toThrow('分辨率');
    const empty = createGrokSource({ ...config, apiKey: '' }, send);
    expect(empty.available).toBe(false);
    await expect(empty.create(input, signal())).rejects.toThrow('API Key');
    expect(send).not.toHaveBeenCalled();
  });
});

describe('HTTP 与下载边界', () => {
  it.each(['https://example.com', 'https://example.com/v1', 'https://example.com/v1/'])('兼容 API 地址 %s', value => {
    expect(apiBase(value).href).toBe('https://example.com/v1/');
  });
  it.each(['http://remote.example', 'https://name:secret@example.com', 'https://example.com?key=secret', 'invalid'])('拒绝无效或含凭据的地址 %s', value => {
    expect(() => apiBase(value)).toThrow();
  });
  it('流式和声明的过大响应均有上限', async () => {
    await expect(readBounded(new Response('123456'), 5)).rejects.toThrow('过大');
    await expect(readBounded(new Response('x', { headers: { 'content-length': '10' } }), 5)).rejects.toThrow('过大');
  });
  it('下载不转发认证头，且拒绝 HTML 错误页', async () => {
    const bytes = Buffer.alloc(32); bytes.writeUInt32BE(24); bytes.write('ftyp', 4); bytes.write('isom', 8);
    const send = vi.fn().mockResolvedValueOnce(new Response(bytes)).mockResolvedValueOnce(new Response('<html>failed</html>'));
    expect(await fetchVideo('https://cdn.example/video.mp4', signal(), send)).toEqual(bytes);
    expect(send.mock.calls[0]![1]).not.toHaveProperty('headers');
    expect(send.mock.calls[0]![1].redirect).toBe('error');
    await expect(fetchVideo('https://cdn.example/video.mp4', signal(), send)).rejects.toThrow('不要重新生成');
  });
});
