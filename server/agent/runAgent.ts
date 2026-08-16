// 主 Agent 编排循环：调模型 → 执行工具 → 把结果回灌 → 直到给出最终答复
import { deepseekChat, UpstreamError } from '../deepseek';
import { logAgentDebug } from './debug';
import { summarizeKnowledgePayload } from './knowledge/summarize';
import { buildEvidencePacketFromToolResult } from './orchestration/normalize';
import { buildPolicySystemHint, buildRoutingSystemHints, decideOrchestrationPolicy, validateFinalResult } from './orchestration/policy';
import { chunkReplyText, createAgentStreamEvent } from './stream';
import { buildSystemPrompt } from './systemPrompt';
import { toolDefs, runTool } from './tools';
import { inferExplicitProductRequestTerms, matchesExplicitProductTerms } from './guidance/request';
import { routeIntent } from './routeIntent';
import type { AgentEvidencePacket, OrchestrationDecision } from './orchestration/types';
import type { AgentResult, ChatMessage } from '@/lib/types';
import type { AgentStreamEvent } from './stream';

// #主Agent执行步数上限
const MAX_STEPS = 8; // 防止工具调用死循环

// #主Agent运行配置
interface RunAgentOptions {
  onEvent?: (event: AgentStreamEvent) => void | Promise<void>;
}

// #主Agent编排循环
export async function runAgent(userId: string, history: ChatMessage[]): Promise<AgentResult> {
  return runAgentCore(userId, history);
}

// #主Agent流式执行入口
export async function* runAgentStream(userId: string, history: ChatMessage[]): AsyncGenerator<AgentStreamEvent, AgentResult, void> {
  const events: AgentStreamEvent[] = [];
  const result = await runAgentCore(userId, history, {
    onEvent(event) {
      events.push(event);
    },
  });

  for (const event of events) yield event;
  for (const chunk of chunkReplyText(result.reply)) {
    yield createAgentStreamEvent('reply.delta', { chunk, done: false });
  }
  yield createAgentStreamEvent('reply.delta', { chunk: '', done: true });
  yield createAgentStreamEvent('run.complete', result);
  return result;
}

// #主Agent核心执行器
async function runAgentCore(userId: string, rawHistory: ChatMessage[], options: RunAgentOptions = {}): Promise<AgentResult> {
  const emit = async (event: AgentStreamEvent) => {
    await options.onEvent?.(event);
  };

  // 角色白名单：history 来自客户端请求体，剔除伪造的 system/tool 角色，防提示注入
  const history = (rawHistory || []).filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string');

  try {
    const currentUserQuestion = [...history].reverse().find((message) => message.role === 'user')?.content || '';
    const explicitProductTerms = inferExplicitProductRequestTerms(currentUserQuestion);
    const ctx: {
      userId: string;
      currentUserQuestion: string;
      currentPetSpecies?: string;
      explicitProductTerms: string[];
    } = { userId, currentUserQuestion, explicitProductTerms };
    const routed = routeIntent(history);
    const evidencePackets: AgentEvidencePacket[] = [];
    let currentDecision: OrchestrationDecision = decideOrchestrationPolicy(routed, evidencePackets);
    let productToolsUsed = false;
    let productSearchExecuted = false;
    const searchedProducts = new Map<string, { id: string; name?: string; sub?: string; badges?: string[]; pet?: string; cat?: string }>();
    logAgentDebug({
      scope: 'main-agent',
      event: 'route_intent',
      details: {
        userId,
        predictedIntent: routed.intent,
        confidence: routed.confidence,
        highRisk: routed.highRisk,
        reason: routed.reason,
        historySize: history.length,
      },
    });
    await emit(createAgentStreamEvent('run.start', { userId, historySize: history.length }));
    await emit(createAgentStreamEvent('route.ready', {
      predictedIntent: routed.intent,
      confidence: routed.confidence,
      highRisk: routed.highRisk,
      petContext: routed.petContext ?? null,
    }));

    const messages: any[] = [
      { role: 'system', content: buildSystemPrompt() },
      {
        role: 'system',
        content: buildRoutingSystemHints(routed, history),
      },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    for (let step = 0; step < MAX_STEPS; step++) {
      logAgentDebug({
        scope: 'main-agent',
        event: 'model_step_start',
        details: {
          userId,
          step: step + 1,
          maxSteps: MAX_STEPS,
          messageCount: messages.length,
        },
      });
      await emit(createAgentStreamEvent('step.start', { step: step + 1, maxSteps: MAX_STEPS }));
      const res = await deepseekChat({
        messages,
        tools: toolDefs,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 2048,
      });

      const msg = res.choices?.[0]?.message;
      if (!msg) {
        logAgentDebug({
          scope: 'main-agent',
          event: 'model_empty_message',
          details: { userId, step: step + 1 },
        });
        return buildSafeFallbackResult();
      }

      messages.push(msg);

      if (msg.tool_calls?.length) {
        logAgentDebug({
          scope: 'main-agent',
          event: 'tool_calls_detected',
          details: {
            userId,
            step: step + 1,
            toolNames: msg.tool_calls.map((tc: any) => tc.function?.name || 'unknown'),
          },
        });
        const present = msg.tool_calls.find((tc: any) => tc.function.name === 'present_recommendation');
        if (present) {
          const parsedPresentation = parsePresentationArgs(present.function.arguments);
          if (!parsedPresentation.ok) {
            logAgentDebug({
              scope: 'main-agent',
              event: 'final_presentation_invalid',
              details: {
                userId,
                step: step + 1,
                reason: parsedPresentation.reason,
              },
            });
            appendRejectedToolResponses(messages, msg.tool_calls, present.id, parsedPresentation.reason);
            messages.push({
              role: 'system',
              content: `present_recommendation 参数无效，请重新调用该工具。\n修正要求：${parsedPresentation.reason}`,
            });
            continue;
          }
          const finalResult = parsedPresentation.result;
          const validation = validateFinalResult(currentDecision, finalResult, {
            productToolsUsed,
            routed,
            packets: evidencePackets,
            explicitProductTerms,
            searchedProducts: Array.from(searchedProducts.values()),
            explicitProductRequestUnavailable: isExplicitProductRequestUnavailable(
              explicitProductTerms,
              productSearchExecuted,
              searchedProducts,
              ctx.currentPetSpecies,
            ),
          });
          if (!validation.ok) {
            logAgentDebug({
              scope: 'main-agent',
              event: 'final_presentation_rejected',
              details: {
                userId,
                step: step + 1,
                guardId: validation.guardId,
                proposalCount: finalResult.proposals.length,
                productToolsUsed,
                retryHint: validation.retryHint,
              },
            });
            await emit(createAgentStreamEvent('guard.reject', {
              step: step + 1,
              guardId: validation.guardId,
            }));
            appendRejectedToolResponses(messages, msg.tool_calls, present.id, validation.retryHint);
            messages.push({
              role: 'system',
              content: `请修正最终输出并重试。\n约束原因：${validation.retryHint}`,
            });
            continue;
          }
          logAgentDebug({
            scope: 'main-agent',
            event: 'final_presentation',
            details: {
              userId,
              step: step + 1,
              replyPreview: finalResult.reply.slice(0, 120),
              proposalCount: finalResult.proposals.length,
            },
          });
          return finalResult;
        }

        for (const tc of msg.tool_calls) {
          await emit(createAgentStreamEvent('tool.call', {
            step: step + 1,
            toolName: tc.function.name,
          }));
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
          const execution = await executeToolSafely(tc.function.name, args, ctx);
          if (execution.ok && isProductTool(tc.function.name)) productToolsUsed = true;
          const result = execution.ok ? execution.result : execution.fallbackResult;
          if (execution.ok && tc.function.name === 'get_pet_profile') {
            ctx.currentPetSpecies = extractPetSpecies(result) || ctx.currentPetSpecies;
          }
          if (execution.ok && tc.function.name === 'search_products') {
            productSearchExecuted = true;
            collectSearchedProducts(result, searchedProducts);
          }
          const resultPreview = stringifyToolPreview(previewToolResult(tc.function.name, result));
          logAgentDebug({
            scope: 'main-agent',
            event: execution.ok ? 'tool_result' : 'tool_failed',
            details: {
              userId,
              step: step + 1,
              toolName: tc.function.name,
              resultPreview,
              error: execution.ok ? null : execution.error,
            },
          });
          await emit(createAgentStreamEvent('tool.result', {
            step: step + 1,
            toolName: tc.function.name,
            preview: resultPreview,
          }));
          messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });

          const packet = execution.ok ? buildEvidencePacketFromToolResult(tc.function.name, result) : null;
          if (packet) {
            evidencePackets.push(packet);
            currentDecision = decideOrchestrationPolicy(routed, evidencePackets);
            logAgentDebug({
              scope: 'main-agent',
              event: 'orchestration_policy_updated',
              details: {
                userId,
                step: step + 1,
                sourceTool: tc.function.name,
                packetKind: packet.kind,
                responseOrder: currentDecision.responseOrder,
                allowKnowledge: currentDecision.allowKnowledge,
                allowCommunity: currentDecision.allowCommunity,
                allowGuidance: currentDecision.allowGuidance,
                requiresProductToolEvidence: currentDecision.requiresProductToolEvidence,
                shouldAvoidProposals: currentDecision.shouldAvoidProposals,
                mustIncludeGuidanceWhenRequested: currentDecision.mustIncludeGuidanceWhenRequested,
              },
            });
            messages.push({
              role: 'system',
              content: buildPolicySystemHint(currentDecision, {
                routed,
                packets: evidencePackets,
              }),
            });
            const fastPathResult = buildKnowledgeFastPathResult(routed, result, evidencePackets);
            if (fastPathResult) return fastPathResult;
          }
        }
        continue;
      }

      const fallbackResult = parseFinal(msg.content || '');
      const directReplyValidation = validateFinalResult(currentDecision, fallbackResult, {
        productToolsUsed,
        routed,
        packets: evidencePackets,
        explicitProductTerms,
        searchedProducts: Array.from(searchedProducts.values()),
        explicitProductRequestUnavailable: isExplicitProductRequestUnavailable(
          explicitProductTerms,
          productSearchExecuted,
          searchedProducts,
          ctx.currentPetSpecies,
        ),
      });
      if (!directReplyValidation.ok) {
        logAgentDebug({
          scope: 'main-agent',
          event: 'direct_reply_rejected',
          details: {
            userId,
            step: step + 1,
            guardId: directReplyValidation.guardId,
          },
        });
        messages.push({
          role: 'system',
          content: `当前直接答复不满足运行时约束，请继续调用所需工具后再输出最终结果。\n约束原因：${directReplyValidation.retryHint}`,
        });
        continue;
      }
      logAgentDebug({
        scope: 'main-agent',
        event: 'model_direct_reply',
        details: {
          userId,
          step: step + 1,
          replyPreview: fallbackResult.reply.slice(0, 120),
          proposalCount: fallbackResult.proposals.length,
        },
      });
      return fallbackResult;
    }

    logAgentDebug({
      scope: 'main-agent',
      event: 'max_steps_reached',
      details: { userId, maxSteps: MAX_STEPS },
    });
    return {
      reply: '这个问题我先保守一点回答：当前信息还不够完整。你可以补充一下毛孩子的物种、年龄、症状持续时间或具体需求，我再继续帮你判断。',
      proposals: [],
    };
  } catch (error) {
    logAgentDebug({
      scope: 'main-agent',
      event: 'run_failed',
      details: {
        userId,
        error: formatAgentError(error),
      },
    });
    await emit(createAgentStreamEvent('run.error', {
      message: 'agent 内部异常已记录日志',
    }));
    return buildSafeFallbackResult(error);
  }
}

// #被拒绝最终工具调用回执
function appendRejectedToolResponses(
  messages: any[],
  toolCalls: any[],
  presentToolCallId: string,
  reason: string,
) {
  for (const toolCall of toolCalls) {
    const isPresentation = toolCall.id === presentToolCallId;
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify({
        ok: false,
        retryable: true,
        reason: isPresentation ? reason : '本轮已进入最终呈现校验，请在下一轮重新发起该工具调用。',
      }),
    });
  }
}

// #无证据高风险场景：是否需要在回答里强制带上就医引导
// 注意：这里只判断"要不要加约束"，不再直接用模板顶掉模型的回答——
// 之前那样做会让用户连一条通用建议都拿不到，等于把"资料没覆盖"当成"不能说话"。
export function needsVetGuardrail(
  routed: ReturnType<typeof routeIntent>,
  packets: AgentEvidencePacket[],
): boolean {
  const knowledgePacket = packets.find((packet) => packet.kind === 'knowledge');
  if (!knowledgePacket || knowledgePacket.canDirectAnswer) return false;
  return routed.highRisk
    || knowledgePacket.priority === 'high'
    || knowledgePacket.metadata?.needsVet === true;
}

// #主Agent安全兜底结果
// 上游（模型服务）故障与"答案没组织好"是两回事：前者用户重发多少次都没用，
// 必须给出不同措辞，否则会像在怪用户提问不清楚。
function buildSafeFallbackResult(error?: unknown): AgentResult {
  if (error instanceof UpstreamError) {
    const hint = error.code === 'rate_limit'
      ? 'AI 服务当前请求过多，休息一下再试～'
      : error.code === 'no_key' || error.code === 'auth'
        ? 'AI 服务未正确配置，我们已经收到告警，请稍后再来。'
        : 'AI 服务暂时连不上，请稍后再试。';
    return { reply: `抱歉，${hint}（这不是你的问题，不用改问法）`, proposals: [] };
  }
  return {
    reply: '抱歉，我这次没组织好答案。你可以再发一次问题，或补充一下毛孩子的物种、年龄、症状持续时间或具体需求，我继续帮你判断。',
    proposals: [],
  };
}

// #Agent错误摘要格式化
function formatAgentError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

// #工具结果调试摘要
function previewToolResult(toolName: string, result: unknown) {
  if (toolName === 'ask_knowledge_agent' && isKnowledgePayload(result)) {
    return summarizeKnowledgePayload(result);
  }

  if (toolName === 'community_summarize' && result && typeof result === 'object') {
    const candidate = result as Record<string, unknown>;
    return JSON.stringify({
      summary: candidate.summary,
      commonPatterns: candidate.commonPatterns,
      suggestedUse: candidate.suggestedUse,
    });
  }

  try {
    const text = JSON.stringify(result);
    return text.length > 300 ? text.slice(0, 300) + '...' : text;
  } catch {
    return '[unserializable tool result]';
  }
}

// #工具安全执行
async function executeToolSafely(name: string, args: any, ctx: { userId: string; currentUserQuestion?: string }) {
  try {
    const result = await runTool(name, args, ctx);
    return { ok: true as const, result };
  } catch (error) {
    const formattedError = formatAgentError(error);
    return {
      ok: false as const,
      error: formattedError,
      fallbackResult: {
        error: true,
        toolName: name,
        message: formattedError.message || 'tool execution failed',
      },
    };
  }
}

// #知识结果快速收口
function buildKnowledgeFastPathResult(
  routed: ReturnType<typeof routeIntent>,
  result: unknown,
  packets: AgentEvidencePacket[],
): AgentResult | null {
  if (!isKnowledgePayload(result)) return null;

  const answer = result.knowledge.answer.trim();
  if (routed.intent === 'knowledge' && isKnowledgeAnswerReady(answer)) {
    return { reply: answer, proposals: [] };
  }

  if (!routed.highRisk && !result.knowledge.needsVet) return null;
  if (answer.length >= 12) return { reply: answer, proposals: [] };

  // 走到这里说明模型这一轮几乎没产出文字，只能给最保守的收口
  return {
    reply: [
      '⚠️ 这种情况建议尽快让兽医当面看一下',
      '站内暂时没有完全对应的资料，我不方便在线判断具体原因。',
      '在就医前可以先做的：保持环境安静温暖、记录症状出现的时间与频率、拍一段短视频给医生看、不要自行喂药。',
      '',
      '⚠️ 线上建议不能替代面诊',
    ].join('\n'),
    proposals: [],
  };
}

// #知识答案快速返回质量判断
function isKnowledgeAnswerReady(answer: string): boolean {
  const content = answer
    .split('\n')
    .filter((line) => !line.trim().startsWith('参考：'))
    .join('')
    .replace(/\s/g, '');
  return content.length >= 24;
}

// #工具摘要转字符串
function stringifyToolPreview(preview: unknown): string {
  if (typeof preview === 'string') return preview;
  try {
    return JSON.stringify(preview);
  } catch {
    return String(preview);
  }
}

// #知识Agent工具结果识别
function isKnowledgePayload(value: unknown): value is Parameters<typeof summarizeKnowledgePayload>[0] {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return !!candidate.knowledge && !!candidate.presentationHints;
}

// #商品工具识别
function isProductTool(toolName: string): boolean {
  return toolName === 'search_products' || toolName === 'guidance_rank_products';
}

// #宠物物种上下文提取
// 只有档案里全是同一个物种时才敢当作"当前物种"用。
// 之前取的是第一只宠物的物种：同时养猫和狗的用户，档案顺序决定了搜商品被锁在哪个物种上，
// 问"我想买狗粮"却只搜出猫粮，Agent 于是回答"狗粮还没上架"。物种不唯一时返回
// undefined，交给问题本身或模型参数去定。
function extractPetSpecies(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const speciesList = value
    .map((item) => (item && typeof item === 'object' ? (item as Record<string, unknown>).species : undefined))
    .filter((s): s is string => typeof s === 'string' && s.trim() !== '');
  const unique = Array.from(new Set(speciesList));
  return unique.length === 1 ? unique[0] : undefined;
}

// #已检索商品记录
function collectSearchedProducts(
  value: unknown,
  target: Map<string, { id: string; name?: string; sub?: string; badges?: string[]; pet?: string; cat?: string }>,
) {
  if (!Array.isArray(value)) return;
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.id !== 'string') continue;
    target.set(candidate.id, {
      id: candidate.id,
      name: typeof candidate.name === 'string' ? candidate.name : undefined,
      cat: typeof candidate.cat === 'string' ? candidate.cat : undefined,
      sub: typeof candidate.sub === 'string' ? candidate.sub : undefined,
      badges: Array.isArray(candidate.badges) ? candidate.badges.map(String) : [],
      pet: typeof candidate.pet === 'string' ? candidate.pet : undefined,
    });
  }
}

// #明确商品请求缺货判断
function isExplicitProductRequestUnavailable(
  terms: string[],
  productSearchExecuted: boolean,
  products: Map<string, { id: string; name?: string; sub?: string; badges?: string[]; pet?: string; cat?: string }>,
  targetSpecies?: string,
): boolean {
  if (!terms.length || !productSearchExecuted) return false;
  return !Array.from(products.values()).some((product) => (
    (!targetSpecies || product.pet === targetSpecies)
    && matchesExplicitProductTerms(product, terms)
  ));
}

// 解析 present_recommendation 的参数（工具参数通常是合法 JSON；仍做容错）
// #最终展示工具参数解析
function parseArgs(argStr: string): AgentResult | null {
  let obj: any = null;
  try { obj = JSON.parse(argStr || '{}'); } catch {
    const a = (argStr || '').indexOf('{'), b = (argStr || '').lastIndexOf('}');
    if (a >= 0 && b > a) { try { obj = JSON.parse(argStr.slice(a, b + 1)); } catch {} }
  }
  if (!obj || typeof obj !== 'object') return null;
  const proposals = Array.isArray(obj.proposals) ? obj.proposals : [];
  for (const p of proposals) if (Array.isArray(p.productIds)) p.productIds = Array.from(new Set(p.productIds));
  return { reply: obj.reply || '好的~', proposals };
}

// #最终展示参数校验收口
function parsePresentationArgs(argStr: string):
  | { ok: true; result: AgentResult }
  | { ok: false; reason: string } {
  const parsed = parseArgs(argStr);
  if (!parsed) {
    return {
      ok: false,
      reason: '没有解析出合法 JSON 对象。reply 必填，proposals 需为数组。',
    };
  }

  if (!parsed.reply || !parsed.reply.trim()) {
    return {
      ok: false,
      reason: 'reply 不能为空，请给出面向用户的自然语言答复。',
    };
  }

  return { ok: true, result: parsed };
}

// 宽松解析模型输出的 JSON（容忍 ``` 包裹或前后多余文字）
// #模型直出结果兜底解析
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
