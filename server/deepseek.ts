// DeepSeek 调用封装（OpenAI 兼容接口）。Key 只在服务端，前端永远拿不到。
import { addTokens } from './tokenMeter';

const BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/chat/completions';
const MODEL = process.env.PAWLY_MODEL || 'deepseek-v4-flash';

// 上游/配置类错误单独标记：这类问题不是"答案没组织好"，
// 需要让上层给出不同的用户提示，也方便运维一眼看出是 key、模型名还是网络的问题。
export class UpstreamError extends Error {
  code: 'no_key' | 'auth' | 'bad_request' | 'rate_limit' | 'server' | 'network';
  status?: number;
  detail?: string;
  constructor(code: UpstreamError['code'], message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'UpstreamError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export const modelConfig = () => ({
  model: MODEL,
  baseUrl: BASE,
  hasKey: !!process.env.DEEPSEEK_API_KEY,
});

function classify(status: number): UpstreamError['code'] {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'bad_request';
}

export async function deepseekChat(body: Record<string, unknown>): Promise<any> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new UpstreamError('no_key', '缺少 DEEPSEEK_API_KEY，请在部署环境变量里配置');

  let r: Response;
  try {
    r = await fetch(BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: MODEL, ...body }),
    });
  } catch (e: any) {
    throw new UpstreamError('network', `连接 ${BASE} 失败`, undefined, e?.message || String(e));
  }

  if (!r.ok) {
    const text = (await r.text().catch(() => '')).slice(0, 400);
    throw new UpstreamError(classify(r.status), `DeepSeek API ${r.status}`, r.status, text);
  }
  const data = await r.json();
  // 累计本次请求消耗的 token（用于每日额度计量，见 server/tokenMeter.ts）
  addTokens(Number(data?.usage?.total_tokens) || 0);
  return data;
}

// #流式增量回调
// contentDelta：模型直接说的话；replyDelta：present_recommendation 的 reply 字段增量
export type DeepseekDelta =
  | { kind: 'content'; text: string }
  | { kind: 'reply'; text: string };

// #流式调用
// 返回值刻意和 deepseekChat 保持一致（choices[0].message 里带 content 与 tool_calls），
// 这样主循环那一大段编排逻辑一行都不用改，只是在生成过程中多了增量回调。
export async function deepseekChatStream(
  body: Record<string, unknown>,
  onDelta?: (delta: DeepseekDelta) => void,
): Promise<any> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new UpstreamError('no_key', '缺少 DEEPSEEK_API_KEY，请在部署环境变量里配置');

  let r: Response;
  try {
    r = await fetch(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, ...body, stream: true, stream_options: { include_usage: true } }),
    });
  } catch (e: any) {
    throw new UpstreamError('network', `连接 ${BASE} 失败`, undefined, e?.message || String(e));
  }
  if (!r.ok) {
    const text = (await r.text().catch(() => '')).slice(0, 400);
    throw new UpstreamError(classify(r.status), `DeepSeek API ${r.status}`, r.status, text);
  }
  if (!r.body) throw new UpstreamError('server', 'DeepSeek 未返回流式响应体');

  // 上游没按流式返回（忽略了 stream:true、被网关改写、或换了兼容性不完整的服务）时，
  // 按普通 JSON 解析。不做这层判断的话，我们会把一段 JSON 当 SSE 扫，一个 data: 行都
  // 找不到，于是每一步都以为模型什么都没说，一路空转到步数上限——实测会跑满 9 次往返。
  const contentType = r.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const data = await r.json().catch(() => null);
    if (!data) throw new UpstreamError('server', 'DeepSeek 返回了无法解析的响应');
    addTokens(Number(data?.usage?.total_tokens) || 0);
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text === 'string' && text) onDelta?.({ kind: 'content', text });
    return data;
  }

  let content = '';
  let finishReason: string | null = null;
  let usageTotal = 0;
  // tool_calls 的参数是分片到达的，按 index 累积后再拼回完整结构
  const toolAcc = new Map<number, { id: string; name: string; args: string }>();
  const replyScanners = new Map<number, ReplyFieldScanner>();

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE 以空行分隔事件；只处理 data: 行，其余（注释、event:）忽略
      let sep: number;
      while ((sep = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, sep).replace(/\r$/, '');
        buffer = buffer.slice(sep + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let chunk: any;
        try { chunk = JSON.parse(payload); } catch { continue; }

        if (chunk?.usage?.total_tokens) usageTotal = Number(chunk.usage.total_tokens) || usageTotal;
        const choice = chunk?.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const delta = choice.delta || {};

        if (typeof delta.content === 'string' && delta.content) {
          content += delta.content;
          onDelta?.({ kind: 'content', text: delta.content });
        }

        for (const tc of delta.tool_calls || []) {
          const index = Number(tc.index) || 0;
          const acc = toolAcc.get(index) || { id: '', name: '', args: '' };
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name += tc.function.name;
          const argsDelta = tc.function?.arguments;
          if (typeof argsDelta === 'string' && argsDelta) {
            acc.args += argsDelta;
            // 最终答复藏在 present_recommendation 的 reply 字段里，边到边抽出来推给前端
            if (acc.name === 'present_recommendation') {
              let scanner = replyScanners.get(index);
              if (!scanner) { scanner = new ReplyFieldScanner(); replyScanners.set(index, scanner); }
              const text = scanner.push(argsDelta);
              if (text) onDelta?.({ kind: 'reply', text });
            }
          }
          toolAcc.set(index, acc);
        }
      }
    }
  } finally {
    reader.releaseLock?.();
  }

  addTokens(usageTotal);
  const tool_calls = Array.from(toolAcc.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, acc]) => ({ id: acc.id, type: 'function', function: { name: acc.name, arguments: acc.args } }));

  return {
    choices: [{
      message: {
        role: 'assistant',
        content: content || null,
        ...(tool_calls.length ? { tool_calls } : {}),
      },
      finish_reason: finishReason,
    }],
    usage: { total_tokens: usageTotal },
  };
}

// #从流式 JSON 参数里增量抽取 reply 字段
// 参数是一段边生成边到达的 JSON 文本，等它完整再解析就失去了流式的意义。
// 这里只做一件事：找到 "reply" 的字符串值，把它的字符边到边吐出来。
// 处理转义（\" \\ \n \uXXXX）与跨分片截断；遇到收尾引号后就不再输出。
class ReplyFieldScanner {
  private raw = '';
  private state: 'seeking' | 'reading' | 'done' = 'seeking';
  private cursor = 0;   // 已扫描到 raw 的位置
  private pending = ''; // 半个转义序列跨分片时先存着

  push(fragment: string): string {
    if (this.state === 'done') return '';
    this.raw += fragment;

    if (this.state === 'seeking') {
      const match = /"reply"\s*:\s*"/.exec(this.raw);
      if (!match) return '';
      this.cursor = match.index + match[0].length;
      this.state = 'reading';
    }

    let out = '';
    while (this.cursor < this.raw.length) {
      const ch = this.raw[this.cursor];
      if (this.pending) {
        // 上一片结尾是反斜杠（或半截 \u），补齐后再解释
        this.pending += ch;
        this.cursor += 1;
        const decoded = decodeEscape(this.pending);
        if (decoded === null) { if (this.pending.length >= 6) this.pending = ''; continue; }
        out += decoded;
        this.pending = '';
        continue;
      }
      if (ch === '\\') { this.pending = ch; this.cursor += 1; continue; }
      if (ch === '"') { this.state = 'done'; this.cursor += 1; break; }
      out += ch;
      this.cursor += 1;
    }
    return out;
  }
}

// #解码单个 JSON 转义序列；序列还没收齐时返回 null
function decodeEscape(seq: string): string | null {
  const c = seq[1];
  if (c === undefined) return null;
  if (c === 'u') {
    if (seq.length < 6) return null;
    const code = parseInt(seq.slice(2, 6), 16);
    return Number.isNaN(code) ? '' : String.fromCharCode(code);
  }
  const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };
  return map[c] ?? c;
}
