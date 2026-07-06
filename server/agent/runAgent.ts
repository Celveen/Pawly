// 主 Agent 编排循环：调模型 → 执行工具 → 把结果回灌 → 直到给出最终答复
import { deepseekChat } from '../deepseek';
import { buildSystemPrompt } from './systemPrompt';
import { toolDefs, runTool } from './tools';
import type { AgentResult, ChatMessage } from '@/lib/types';

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

    if (msg.tool_calls?.length) {
      // 终结性输出工具：模型在这里给出最终回复，直接返回（参数由模型按 schema 生成，比手写 JSON 可靠）
      const present = msg.tool_calls.find((tc: any) => tc.function.name === 'present_recommendation');
      if (present) return parseArgs(present.function.arguments);

      // 普通工具：执行并把结果回灌后继续循环
      for (const tc of msg.tool_calls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
        const result = await runTool(tc.function.name, args, ctx);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }

    // 兜底：模型没用工具、直接写了文字
    return parseFinal(msg.content || '');
  }

  return { reply: '这个问题有点复杂，帮你转人工客服好吗？', proposals: [] };
}

// 解析 present_recommendation 的参数（工具参数通常是合法 JSON；仍做容错）
function parseArgs(argStr: string): AgentResult {
  let obj: any = null;
  try { obj = JSON.parse(argStr || '{}'); } catch {
    const a = (argStr || '').indexOf('{'), b = (argStr || '').lastIndexOf('}');
    if (a >= 0 && b > a) { try { obj = JSON.parse(argStr.slice(a, b + 1)); } catch {} }
  }
  if (!obj || typeof obj !== 'object') return { reply: '抱歉，我刚没整理好，再说一次？', proposals: [] };
  const proposals = Array.isArray(obj.proposals) ? obj.proposals : [];
  for (const p of proposals) if (Array.isArray(p.productIds)) p.productIds = Array.from(new Set(p.productIds));
  return { reply: obj.reply || '好的~', proposals };
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
