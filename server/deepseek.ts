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
