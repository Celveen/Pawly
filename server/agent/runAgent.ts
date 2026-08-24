// 主 Agent 编排循环：调模型 → 执行工具 → 把结果回灌 → 直到给出最终答复
import { deepseekChat, deepseekChatStream, UpstreamError } from '../deepseek';
import { logAgentDebug } from './debug';
import { summarizeKnowledgePayload } from './knowledge/summarize';
import { buildEvidencePacketFromToolResult } from './orchestration/normalize';
import { buildPolicySystemHint, buildRoutingSystemHints, decideOrchestrationPolicy, validateFinalResult } from './orchestration/policy';
import { chunkReplyText, createAgentStreamEvent } from './stream';
import { buildSystemPrompt } from './systemPrompt';
import { toolDefs, runTool } from './tools';
import type { KnowledgePrefetch, ToolContext } from './tools';
import { runKnowledgeAgent } from './knowledge/runKnowledgeAgent';
import { inferPrimarySpeciesScope, normalizeSpeciesScope } from './knowledge/taxonomy';
import { inferExplicitProductRequestTerms, matchesExplicitProductTerms } from './guidance/request';
import { routeIntent } from './routeIntent';
import type { AgentEvidencePacket, OrchestrationDecision } from './orchestration/types';
import type { AgentResult, ChatMessage } from '@/lib/types';
import type { AgentStreamEvent } from './stream';

// #主Agent执行步数上限
const MAX_STEPS = 8; // 防止工具调用死循环
// 守门拒绝后的最大重试次数。每次重试 = 一次完整模型往返，放任它吃满 MAX_STEPS
// 会让导购类问题多等好几秒，收益却很低（模型改不对的，第三次通常也改不对）。
const MAX_GUARD_RETRIES = 2;

// #主Agent运行配置
interface RunAgentOptions {
  onEvent?: (event: AgentStreamEvent) => void | Promise<void>;
}

// #主Agent编排循环
export async function runAgent(userId: string, history: ChatMessage[]): Promise<AgentResult> {
  return runAgentCore(userId, history);
}

// #主Agent流式执行入口
// 之前这里是"伪流式"：先把整轮跑完、事件全量缓冲，再一次性吐出来，用户等待时间没有任何变化。
// 现在改成真流式——事件产生即入队、即产出，模型边生成边推。
export async function* runAgentStream(userId: string, history: ChatMessage[]): AsyncGenerator<AgentStreamEvent, AgentResult, void> {
  const queue: AgentStreamEvent[] = [];
  let notify: (() => void) | null = null;
  let finished = false;

  // 用标记记录"这一轮到底流出去过没有"。不能去翻 queue——事件被消费后就从队列里
  // 移走了，等跑完再看队列必然是空的，会误判成没流过，把全文又推一遍（实测收到两份答复）。
  let streamedAnyText = false;

  const push = (event: AgentStreamEvent) => {
    if (event.type === 'reply.delta' && event.data.chunk) streamedAnyText = true;
    // 守门让模型重写时前端会清空，这里同步归零：若重写后没有再流出文字，
    // 收尾时要把完整答复补推一次，否则前端只剩一个空气泡
    if (event.type === 'reply.reset') streamedAnyText = false;
    queue.push(event);
    notify?.();
    notify = null;
  };

  const running = runAgentCore(userId, history, { onEvent: push })
    .then((result) => {
      // 模型没走流式（比如上游忽略了 stream:true）时，这里补一次全量文本，
      // 保证前端无论如何都能拿到完整答复
      if (!streamedAnyText) {
        for (const chunk of chunkReplyText(result.reply)) {
          push(createAgentStreamEvent('reply.delta', { chunk, done: false }));
        }
      }
      push(createAgentStreamEvent('reply.delta', { chunk: '', done: true }));
      push(createAgentStreamEvent('run.complete', result));
      return result;
    })
    .catch((e: any) => {
      push(createAgentStreamEvent('run.error', { message: e?.message || String(e) }));
      throw e;
    })
    .finally(() => { finished = true; notify?.(); notify = null; });

  for (;;) {
    while (queue.length) yield queue.shift()!;
    if (finished) break;
    await new Promise<void>((resolve) => { notify = resolve; });
  }
  return running;
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
    const ctx: ToolContext & { currentUserQuestion: string; explicitProductTerms: string[] } =
      { userId, currentUserQuestion, explicitProductTerms };
    const routed = routeIntent(history);
    // 知识类问题：不等模型开口，先把知识 Agent 跑起来，让它和第一次模型调用并行。
    // 原来是"主模型 → 知识模型 → 主模型"三层串行，这一步能砍掉中间那层的等待。
    // 路由是纯规则的，判定为知识问题时准确率足够；万一模型最后没调这个工具，
    // 代价只是一次多余的后台调用，不影响回答。
    if (routed.recommendedTools.includes('ask_knowledge_agent') && currentUserQuestion) {
      ctx.knowledgePrefetch = startKnowledgePrefetch(currentUserQuestion, routed);
    }
    const evidencePackets: AgentEvidencePacket[] = [];
    let currentDecision: OrchestrationDecision = decideOrchestrationPolicy(routed, evidencePackets);
    let productToolsUsed = false;
    let guardRetries = 0;
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
      // 边生成边推给前端：最终答复藏在 present_recommendation 的 reply 字段里，
      // deepseekChatStream 会把它从流式 JSON 参数中抽出来，逐字回调到这里。
      // 返回结构与非流式完全一致，下面的编排逻辑不受影响。
      let streamedChars = 0;
      const res = await deepseekChatStream({
        messages,
        tools: toolDefs,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 2048,
      }, (delta) => {
        if (!delta.text) return;
        streamedChars += delta.text.length;
        void emit(createAgentStreamEvent('reply.delta', { chunk: delta.text, done: false }));
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
            if (streamedChars > 0) await emit(createAgentStreamEvent('reply.reset', { reason: 'invalid_presentation' }));
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
            // 守门重试要封顶。每次拒绝都是一次完整的模型往返，8 步用完用户要多等好几秒，
            // 最后还常常掉到兜底话术——实测"帮我推荐狗粮"这类问题会把 8 步全部耗光。
            // 超过上限就降级收口：去掉不合规的商品方案，保留模型已经写好的文字。
            // 所有安全类守门（无工具证据、策略禁止导购、商品未上架）都是在拦 proposals，
            // 去掉它就满足；只有"用户要推荐却没给方案"这条满足不了，但那属于体验问题，
            // 给一段纯文字回复也远好过兜底话术。
            // 这一步的文字已经流给前端了，但内容被判定不合规，必须让前端清空重来，
            // 否则用户会看到一段将被替换的半成品答复。
            if (streamedChars > 0) await emit(createAgentStreamEvent('reply.reset', { reason: validation.guardId }));
            guardRetries += 1;
            if (guardRetries > MAX_GUARD_RETRIES) {
              logAgentDebug({
                scope: 'main-agent',
                event: 'final_presentation_degraded',
                details: { userId, step: step + 1, guardId: validation.guardId, guardRetries },
              });
              return { reply: finalResult.reply, proposals: [] };
            }
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

        // 工具执行改成并行。原来是 for + await 一个个跑，一步里若同时要宠物档案、商品和
        // 知识 Agent，就得排队；知识 Agent 里还套着一次模型调用，最慢的那个把前面的全拖住。
        // 两个必须守住的点：
        //  ① get_pet_profile 会写 ctx.currentPetSpecies，而 search_products 要读它，
        //     所以档案先单独跑完，剩下的才并行；
        //  ② 结果仍按模型给出的原始顺序逐个处理，副作用与提前返回的行为完全不变。
        const parsedCalls = msg.tool_calls.map((tc: any) => {
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
          return { tc, args };
        });
        const executions = new Array<Awaited<ReturnType<typeof executeToolSafely>>>(parsedCalls.length);
        const deferred: number[] = [];
        for (let i = 0; i < parsedCalls.length; i++) {
          if (parsedCalls[i].tc.function.name !== 'get_pet_profile') { deferred.push(i); continue; }
          const exec = await executeToolSafely('get_pet_profile', parsedCalls[i].args, ctx);
          executions[i] = exec;
          if (exec.ok) ctx.currentPetSpecies = extractPetSpecies(exec.result) || ctx.currentPetSpecies;
        }
        const parallelResults = await Promise.all(
          deferred.map((i) => executeToolSafely(parsedCalls[i].tc.function.name, parsedCalls[i].args, ctx)),
        );
        deferred.forEach((i, k) => { executions[i] = parallelResults[k]; });

        for (let callIndex = 0; callIndex < parsedCalls.length; callIndex++) {
          const { tc } = parsedCalls[callIndex];
          await emit(createAgentStreamEvent('tool.call', {
            step: step + 1,
            toolName: tc.function.name,
          }));
          const execution = executions[callIndex];
          if (execution.ok && isProductTool(tc.function.name)) productToolsUsed = true;
          const result = execution.ok ? execution.result : execution.fallbackResult;
          // currentPetSpecies 已在上面的第一波里写好，这里不必再算一次
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

// #知识 Agent 预取
// 用路由已经推断出来的物种和风险信号先跑一遍。这里刻意不传 petProfile 之外的东西：
// 模型后面若给出更严重的风险标签，canReusePrefetch 会拒绝复用并重跑，安全性不打折。
function startKnowledgePrefetch(question: string, routed: ReturnType<typeof routeIntent>): KnowledgePrefetch {
  const species = normalizeSpeciesScope(inferPrimarySpeciesScope(question)) || undefined;
  const riskTags = routed.highRisk ? ['disease'] : [];
  const promise = runKnowledgeAgent({
    question,
    intent: routed.highRisk ? 'high_risk_knowledge' : 'knowledge',
    petProfile: species ? { species } : undefined,
    conversationContext: [],
    suspectedRiskTags: riskTags as any,
    evidence: [],
  }).catch((e: any) => {
    // 预取失败不能影响主流程：这里吞掉错误，工具真被调到时会正常重跑一次
    logAgentDebug({ scope: 'main-agent', event: 'knowledge_prefetch_failed', details: { error: e?.message || String(e) } });
    return null;
  });
  return { question, species, riskTags, promise: promise as Promise<unknown> };
}
