// DeepSeek 调用封装（OpenAI 兼容接口）。Key 只在服务端，前端永远拿不到。

const BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/chat/completions';
const MODEL = process.env.PAWLY_MODEL || 'deepseek-v4-pro';

export async function deepseekChat(body: Record<string, unknown>): Promise<any> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('缺少 DEEPSEEK_API_KEY，请在 .env.local 填入');

  const r = await fetch(BASE, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });

  if (!r.ok) {
    throw new Error(`DeepSeek API ${r.status}: ${await r.text()}`);
  }
  return r.json();
}
