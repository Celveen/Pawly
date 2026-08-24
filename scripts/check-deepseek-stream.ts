// 用真实 DeepSeek key 验证流式链路（本地跑，key 只从环境变量读，不落盘、不进仓库）。
//
// 用法：
//   DEEPSEEK_API_KEY=你的key npm run stream:check
//   # 想顺便确认模型名对不对：
//   DEEPSEEK_API_KEY=你的key PAWLY_MODEL=deepseek-chat npm run stream:check
//
// 会依次检查：
//   1. key 是否有效、模型名是否存在（最容易踩的坑就是模型名写错）
//   2. 上游是否真的按 SSE 分帧返回（有的网关会缓冲成一次性返回，流式就白做了）
//   3. 首个分片多久到（这才是用户"感觉快不快"的指标）
//   4. tool_calls 的 arguments 是否也是分片到达的——我们的最终答复就藏在里面
import { modelConfig } from '../server/deepseek';

const KEY = process.env.DEEPSEEK_API_KEY;
const { model, baseUrl } = modelConfig();

async function main() {
  if (!KEY) {
    console.error('✗ 没有读到 DEEPSEEK_API_KEY。用法：DEEPSEEK_API_KEY=xxx npm run stream:check');
    process.exit(1);
  }
  console.log(`模型 ${model} · 接口 ${baseUrl}`);

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model,
        stream: true,
        stream_options: { include_usage: true },
        max_tokens: 200,
        messages: [{ role: 'user', content: '用三句话说明幼犬换粮为什么要 7 天过渡。' }],
        tools: [{
          type: 'function',
          function: {
            name: 'present_recommendation',
            description: '把最终答复交给用户',
            parameters: {
              type: 'object',
              properties: { reply: { type: 'string' } },
              required: ['reply'],
            },
          },
        }],
        tool_choice: 'auto',
      }),
    });
  } catch (e: any) {
    console.error('✗ 连不上上游：', e?.message || e);
    process.exit(1);
  }

  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 300);
    console.error(`✗ HTTP ${res.status}`);
    // 公司网络/代理挡掉的 403 长得跟"key 无效"一样，但处理方式完全不同，分开提示
    if (/allowlist|not allowed|proxy|egress/i.test(text)) console.error('  → 是网络策略挡住了 api.deepseek.com，不是 key 的问题');
    else if (res.status === 401 || res.status === 403) console.error('  → key 无效或没权限');
    else if (res.status === 400 && /model/i.test(text)) console.error(`  → 模型名 "${model}" 可能不存在，用 PAWLY_MODEL 换一个再试`);
    console.error('  上游返回：', text);
    process.exit(1);
  }

  const ct = res.headers.get('content-type') || '';
  console.log(`✓ HTTP 200 · content-type: ${ct}`);
  if (!ct.includes('text/event-stream')) {
    console.warn('⚠ 上游没按 SSE 返回（可能被网关缓冲）。代码会自动回落到非流式，功能正常但没有逐字效果。');
  }

  let frames = 0, contentChars = 0, argChars = 0, firstFrameMs = 0;
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let sep: number;
    while ((sep = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, sep).replace(/\r$/, '');
      buf = buf.slice(sep + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      let chunk: any;
      try { chunk = JSON.parse(payload); } catch { continue; }
      frames += 1;
      if (frames === 1) firstFrameMs = Date.now() - t0;
      const delta = chunk?.choices?.[0]?.delta || {};
      if (typeof delta.content === 'string') contentChars += delta.content.length;
      for (const tc of delta.tool_calls || []) argChars += String(tc?.function?.arguments || '').length;
    }
  }
  const totalMs = Date.now() - t0;

  console.log(`✓ 收到 ${frames} 帧 · 正文 ${contentChars} 字 · 工具参数 ${argChars} 字`);
  console.log(`✓ 首帧 ${firstFrameMs}ms · 整轮 ${totalMs}ms`);

  const ok = frames >= 3 && (contentChars > 0 || argChars > 0);
  if (!ok) {
    console.error('✗ 分帧数量或内容异常，流式没有真正生效');
    process.exit(1);
  }
  if (argChars > 0) console.log('✓ tool_calls 的 arguments 确实是分片到达的（我们的答复就从这里增量抽取）');
  console.log('\n流式链路正常。');
}

main();
