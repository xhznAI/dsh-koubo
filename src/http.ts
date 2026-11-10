export type Fetch = typeof globalThis.fetch;

export function apiBase(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('请填写有效的 API 地址。'); }
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    || url.username || url.password || url.search || url.hash) throw new Error('API 地址须使用 HTTPS，本机调试可使用 HTTP。');
  const path = url.pathname.replace(/\/+$/, '');
  url.pathname = `${path.endsWith('/v1') ? path : `${path}/v1`}/`;
  return url;
}

export function videoUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('视频下载地址无效。'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('视频下载地址须使用 HTTPS。');
  return url;
}

export async function readBounded(response: Response, limit: number): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel(); throw new Error('响应内容过大。');
  }
  if (!response.body) throw new Error('响应内容为空。');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > limit) throw new Error('响应内容过大。');
      chunks.push(chunk.value);
    }
  } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function jsonRequest(fetcher: Fetch, url: URL, key: string, signal: AbortSignal, body?: unknown): Promise<unknown> {
  let response: Response;
  try {
    signal.throwIfAborted();
    response = await fetcher(url, { method: body ? 'POST' : 'GET', redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)]),
      headers: { authorization: `Bearer ${key}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(body ? '提交结果未知，请先在服务后台核实；不要重复生成。' : '暂时无法查询视频，请稍后查询同一任务。');
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`视频服务返回 HTTP ${response.status}。${body ? '请先核实提交结果，不要重复生成。' : '请稍后查询同一任务。'}`);
  }
  try { return JSON.parse(new TextDecoder().decode(await readBounded(response, 1024 * 1024))); }
  catch { throw new Error(body ? '提交响应无效，请先在服务后台核实；不要重复生成。' : '视频服务响应无效，请稍后查询同一任务。'); }
}
