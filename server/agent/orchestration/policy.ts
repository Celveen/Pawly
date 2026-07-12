import type { ChatMessage } from '@/lib/types';
import type { RouteIntentResult } from '../routeIntent';
import type { AgentEvidencePacket, OrchestrationDecision } from './types';
import type { AgentResult } from '@/lib/types';
import { runFinalResultGuards, type FinalResultRuntimeContext, type FinalResultValidation } from './guards';

// #主Agent路由提示生成
export function buildRoutingSystemHints(routed: RouteIntentResult, history: ChatMessage[]): string {
  const latestUser = [...history].reverse().find((msg) => msg.role === 'user')?.content || '';
  const intentAdvice = buildIntentAdvice(routed.intent, routed.highRisk);

  return [
    `【本轮路由提示】`,
    `- 预测意图：${routed.intent}`,
    `- 风险级别：${routed.highRisk ? 'high_risk' : 'normal'}`,
    `- 置信度：${routed.confidence}`,
    `- 原因：${routed.reason}`,
    `- 推断物种：${routed.petContext.inferredSpeciesScope || 'unknown'}`,
    `- 品种命中模式：${routed.petContext.breedMatchMode}`,
    `- 命中品种范围：${routed.petContext.targetBreedScopes.join('、') || 'none'}`,
    `- 推荐工具：${routed.recommendedTools.join('、')}`,
    `- 编排策略：${routed.strategy}`,
    `- 当前用户最新问题：${latestUser}`,
    `- 编排建议：${intentAdvice}`,
    routed.petContext.breedMatchMode !== 'matched_breed'
      ? `- 品种约束：当前没有稳定命中具体品种，后续回答与推荐优先按物种层处理，不要扩写品种特性。`
      : `- 品种约束：当前已命中具体品种，可在不超出证据边界的前提下使用品种上下文。`,
    `- 要求：这只是前置提示，不是最终结论；若涉及知识或高风险，应优先走 ask_knowledge_agent。`,
  ].join('\n');
}

// #工具结果后的编排策略决策
export function decideOrchestrationPolicy(
  routed: RouteIntentResult,
  packets: AgentEvidencePacket[],
): OrchestrationDecision {
  const knowledgePacket = packets.find((packet) => packet.kind === 'knowledge');
  const communityPacket = packets.find((packet) => packet.kind === 'community');
  const guidancePacket = packets.find((packet) => packet.kind === 'guidance');
  // #仅医疗高风险或明确需就医时阻断导购，不能把“证据不足”误判为高风险
  const highRiskKnowledge = knowledgePacket?.priority === 'high' || knowledgePacket?.metadata?.needsVet === true;

  if (routed.highRisk || highRiskKnowledge) {
    return {
      allowKnowledge: true,
      allowCommunity: false,
      allowGuidance: false,
      mustIncludeGuidanceWhenRequested: false,
      requiresProductToolEvidence: false,
      shouldAvoidProposals: true,
      responseOrder: ['knowledge'],
      reason: '高风险或知识结果明确要求收口时，先知识后其他，并阻断社区与导购。',
    };
  }

  if (routed.intent === 'knowledge') {
    return {
      allowKnowledge: true,
      allowCommunity: !!communityPacket,
      allowGuidance: !!guidancePacket && knowledgePacket?.priority !== 'medium',
      mustIncludeGuidanceWhenRequested: false,
      requiresProductToolEvidence: false,
      shouldAvoidProposals: false,
      responseOrder: communityPacket ? ['knowledge', 'community'] : ['knowledge'],
      reason: '知识问题以专业结论为主，社区只能补充；导购只有在知识风险不高时才允许补充。',
    };
  }

  if (routed.intent === 'guidance') {
    return {
      allowKnowledge: !!knowledgePacket,
      allowCommunity: false,
      allowGuidance: true,
      mustIncludeGuidanceWhenRequested: true,
      requiresProductToolEvidence: true,
      shouldAvoidProposals: false,
      responseOrder: knowledgePacket ? ['knowledge', 'guidance'] : ['guidance'],
      reason: '只要用户明确要推荐商品，且当前不属于高风险阻断场景，最终就不应停在知识解释；若已拿到知识约束，则必须先输出知识边界，再继续给出商品推荐。',
    };
  }

  if (routed.intent === 'community_or_service') {
    return {
      allowKnowledge: !!knowledgePacket,
      allowCommunity: !!communityPacket,
      allowGuidance: false,
      mustIncludeGuidanceWhenRequested: false,
      requiresProductToolEvidence: false,
      shouldAvoidProposals: true,
      responseOrder: knowledgePacket && communityPacket ? ['knowledge', 'community'] : communityPacket ? ['community'] : ['context'],
      reason: '社区/服务问题优先工具结果，不主动扩展成导购；若同时出现知识结果，仍先知识后社区。',
    };
  }

  return {
    allowKnowledge: !!knowledgePacket,
    allowCommunity: !!communityPacket,
    allowGuidance: !!guidancePacket,
    mustIncludeGuidanceWhenRequested: false,
    requiresProductToolEvidence: false,
    shouldAvoidProposals: !!knowledgePacket?.shouldBlockRecommendation,
    responseOrder: buildDefaultResponseOrder(packets),
    reason: '按当前已拿到的工具结果做最小组合，不额外放大能力边界。',
  };
}

// #编排策略结果转系统提示
export function buildPolicySystemHint(
  decision: OrchestrationDecision,
  context?: {
    routed?: RouteIntentResult;
    packets?: AgentEvidencePacket[];
  },
): string {
  const guidancePacket = context?.packets?.find((packet) => packet.kind === 'guidance');
  const knowledgePacket = context?.packets?.find((packet) => packet.kind === 'knowledge');
  const guidanceBreedMatchMode = guidancePacket?.metadata?.breedMatchMode;
  const guidanceTargetSpecies = typeof guidancePacket?.metadata?.targetSpecies === 'string'
    ? guidancePacket.metadata.targetSpecies
    : null;

  return [
    `【编排策略收口】`,
    `- 允许知识：${decision.allowKnowledge ? 'yes' : 'no'}`,
    `- 允许社区：${decision.allowCommunity ? 'yes' : 'no'}`,
    `- 允许导购：${decision.allowGuidance ? 'yes' : 'no'}`,
    `- 用户若已明确要推荐，是否必须继续导购：${decision.mustIncludeGuidanceWhenRequested ? 'yes' : 'no'}`,
    `- 推荐是否必须先经过商品工具链：${decision.requiresProductToolEvidence ? 'yes' : 'no'}`,
    `- 是否避免 proposals：${decision.shouldAvoidProposals ? 'yes' : 'no'}`,
    `- 推荐输出顺序：${decision.responseOrder.join(' -> ')}`,
    `- 原因：${decision.reason}`,
    guidanceBreedMatchMode && guidanceBreedMatchMode !== 'matched_breed'
      ? `- 导购话术约束：当前导购链没有稳定命中具体品种，推荐理由只能按${guidanceTargetSpecies || '当前物种'}层表达，不要写成具体品种特性。`
      : null,
    context?.routed?.petContext.breedMatchMode && context.routed.petContext.breedMatchMode !== 'matched_breed'
      ? `- 通用品种约束：当前问题只能稳定落到物种层，若没有新证据，不要把结论写成“适合某个具体品种”。`
      : null,
    knowledgePacket && !knowledgePacket.canDirectAnswer && knowledgePacket.metadata?.needsVet !== true
      ? `- 普通无证据边界：当前没有可引用的对应资料。可以给出低风险、非诊断、非处方的通用处理思路和观察重点；不得猜测、排序或断言具体病因（避免“大概率就是/通常是某病”），不得给出用药剂量、伪造来源或把普通问题直接升级为急诊。`
      : null,
    decision.mustIncludeGuidanceWhenRequested
      ? `- 强约束：如果用户明确要你挑/推荐商品，在风险未被判定为高危且未明确禁止 proposals 的前提下，不要停在知识解释，必须继续调商品相关工具并给出推荐。`
      : `- 强约束：若策略未要求继续导购，就不要为了凑方案而硬推商品。`,
  ].filter(Boolean).join('\n');
}

// #最终输出校验
export function validateFinalResult(
  decision: OrchestrationDecision,
  result: AgentResult,
  runtime: FinalResultRuntimeContext,
): FinalResultValidation {
  return runFinalResultGuards(decision, result, runtime);
}

// #主Agent意图建议
function buildIntentAdvice(intent: RouteIntentResult['intent'], highRisk: boolean): string {
  if (highRisk) {
    return '先知识后其他：先读档案并调用知识 Agent；没有完成风险判断前，不要先给社区经验或导购方案。';
  }

  switch (intent) {
    case 'knowledge':
      return '知识优先：先知识判断，再决定是否补社区参考或轻量导购。';
    case 'guidance':
      return '导购优先：先读档案、查商品、必要时补订单历史；如果问题夹带健康限制，再补知识 Agent，但不要只停在知识解释。';
    case 'community_or_service':
      return '工具优先：把社区/订单相关内容当作数据检索任务处理，不要误走成知识回答。';
    case 'pet_profile':
      return '建档优先：先确认已有档案，再增量更新。';
    default:
      return '先按普通对话处理，必要时补读档案或追问具体诉求。';
  }
}

// #默认输出顺序推断
function buildDefaultResponseOrder(packets: AgentEvidencePacket[]): AgentEvidencePacket['kind'][] {
  const kinds = packets.map((packet) => packet.kind);
  const order: AgentEvidencePacket['kind'][] = [];
  if (kinds.includes('knowledge')) order.push('knowledge');
  if (kinds.includes('community')) order.push('community');
  if (kinds.includes('guidance')) order.push('guidance');
  if (!order.length && kinds.includes('context')) order.push('context');
  return order.length ? order : ['context'];
}
