// 主 Agent 编排循环：调模型 → 执行工具 → 把结果回灌 → 直到给出最终答复
import { deepseekChat } from '../deepseek';
import { buildSystemPrompt } from './systemPrompt';
import { toolDefs, runTool } from './tools';
import type { AgentResult, ChatMessage } from '../types';

const MAX_STEPS = 6; // 防止工具调用死循环

export async function runAgent(userId: string, history: ChatMessage[]): Promise<AgentResult> {
  const ctx = { userId };
  const messages: any[] = [
    { role: 'system', content: buildSystemPrompt() },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await deepseekChat({
      messages,
      tools: toolDefs,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1024,
    });

    const msg = res.choices?.[0]?.message;
    if (!msg) return { reply: '抱歉，我刚走神了，再说一次？', proposals: [] };

    messages.push(msg);

    // 有工具调用 → 逐个执行，把结果回灌后继续循环
    if (msg.tool_calls?.length) {
      for (const tc of msg.tool_calls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
        const result = await runTool(tc.function.name, args, ctx);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }

    // 没有工具调用 → 这就是最终答复，解析成 {reply, proposals}
    return parseFinal(msg.content || '');
  }

  return { reply: '这个问题有点复杂，帮你转人工客服好吗？', proposals: [] };
}

// 宽松解析模型输出的 JSON（容忍 ``` 包裹或前后多余文字）
function parseFinal(raw: string): AgentResult {
  const cleaned = String(raw).replace(/```json|```/g, '').trim();
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
  let obj = tryParse(cleaned);
  if (!obj) {
    const a = cleaned.indexOf('{');
    const b = cleaned.lastIndexOf('}');
    if (a >= 0 && b > a) obj = tryParse(cleaned.slice(a, b + 1));
  }
  if (obj && typeof obj === 'object') {
    const proposals = Array.isArray(obj.proposals) ? obj.proposals : [];
    // 去重每个方案里的商品 id（模型偶尔会重复列同一件）
    for (const p of proposals) {
      if (Array.isArray(p.productIds)) p.productIds = Array.from(new Set(p.productIds));
    }
    return { reply: obj.reply || '', proposals };
  }
  return { reply: raw || '', proposals: [] };
}
