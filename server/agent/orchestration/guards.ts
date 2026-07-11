import type { AgentResult } from '@/lib/types';
import { detectRegisteredBreedMentions } from '../knowledge/taxonomy';
import { WHITELIST_KNOWLEDGE_SOURCES } from '../knowledge/retrieval/whitelistRegistry';
import type { RouteIntentResult } from '../routeIntent';
import type { AgentEvidencePacket, OrchestrationDecision } from './types';

// #知识来源名称注册
const KNOWN_KNOWLEDGE_SOURCE_NAMES = Array.from(new Set([
  'Pawly 科普',
  ...WHITELIST_KNOWLEDGE_SOURCES.map((item) => item.source),
]));

// #最终输出运行时上下文
export interface FinalResultRuntimeContext {
  productToolsUsed: boolean;
  routed?: RouteIntentResult;
  packets?: AgentEvidencePacket[];
  explicitProductTerms?: string[];
  searchedProducts?: Array<{ id: string; name?: string; sub?: string; badges?: string[]; pet?: string }>;
  explicitProductRequestUnavailable?: boolean;
}

// #最终输出校验结果
export type FinalResultValidation =
  | { ok: true }
  | { ok: false; guardId: FinalResultGuardId; retryHint: string };

// #最终输出守门标识
export type FinalResultGuardId =
  | 'proposal_policy'
  | 'breed_boundary'
  | 'knowledge_source'
  | 'response_quality';

// #最终输出守门执行
export function runFinalResultGuards(
  decision: OrchestrationDecision,
  result: AgentResult,
  runtime: FinalResultRuntimeContext,
): FinalResultValidation {
  const guards = [
    validateResponseQualityGuard,
    validateProposalPolicyGuard,
    validateBreedBoundaryGuard,
    validateKnowledgeSourceGuard,
  ];

  for (const guard of guards) {
    const validation = guard(decision, result, runtime);
    if (!validation.ok) return validation;
  }

  return { ok: true };
}

// #最终回复质量守门
function validateResponseQualityGuard(
  _: OrchestrationDecision,
  result: AgentResult,
  __: FinalResultRuntimeContext,
): FinalResultValidation {
  const reply = result.reply.trim();
  const meaningfulText = reply.replace(/[\s<>{}\[\]()`'"|\\/,:：;；.!！？?。…-]/gu, '');

  if (reply.length >= 12 && meaningfulText.length >= 4) return { ok: true };

  return {
    ok: false,
    guardId: 'response_quality',
    retryHint: '当前回复是空白、结构残片或内容过短，不能直接展示。请基于本轮已获得的工具结果重新生成完整、自然的中文答复，不要只输出符号、JSON 或 Markdown 片段。',
  };
}

// #商品方案守门
function validateProposalPolicyGuard(
  decision: OrchestrationDecision,
  result: AgentResult,
  runtime: FinalResultRuntimeContext,
): FinalResultValidation {
  if (runtime.explicitProductRequestUnavailable) {
    if (result.proposals.length === 0) return { ok: true };
    return {
      ok: false,
      guardId: 'proposal_policy',
      retryHint: `当前商品库没有与用户明确请求“${(runtime.explicitProductTerms || []).join('、')}”匹配的在售候选。不要用其它品类替代，也不要输出 proposals；请如实说明暂未上架。`,
    };
  }

  if (decision.shouldAvoidProposals && result.proposals.length > 0) {
    return {
      ok: false,
      guardId: 'proposal_policy',
      retryHint: '当前策略要求不要输出商品方案（proposals 应为空）。请保留知识/风险说明，去掉商品推荐后重新调用 present_recommendation。',
    };
  }

  if (decision.mustIncludeGuidanceWhenRequested && !decision.shouldAvoidProposals && result.proposals.length === 0) {
    return {
      ok: false,
      guardId: 'proposal_policy',
      retryHint: '用户已经明确要推荐商品，且当前策略允许导购。不要只停在知识解释，请继续调用商品相关工具并输出至少 1 个 proposals 后再调用 present_recommendation。',
    };
  }

  if (decision.requiresProductToolEvidence && result.proposals.length > 0 && !runtime.productToolsUsed) {
    return {
      ok: false,
      guardId: 'proposal_policy',
      retryHint: '当前输出了商品方案，但本轮还没有经过商品工具链。请至少先调用 search_products 或 guidance_rank_products，再基于真实候选商品重新调用 present_recommendation。',
    };
  }

  if (!decision.allowGuidance && result.proposals.length > 0) {
    return {
      ok: false,
      guardId: 'proposal_policy',
      retryHint: '当前策略不允许进入导购，请去掉商品方案，仅保留允许的知识/社区/上下文答复后重新调用 present_recommendation。',
    };
  }

  return { ok: true };
}

// #品种边界守门
function validateBreedBoundaryGuard(
  _: OrchestrationDecision,
  result: AgentResult,
  runtime: FinalResultRuntimeContext,
): FinalResultValidation {
  const routedBreedMatchMode = runtime.routed?.petContext.breedMatchMode;
  const routedSpecies = runtime.routed?.petContext.inferredSpeciesScope || null;
  const guidancePacket = runtime.packets?.find((packet) => packet.kind === 'guidance');
  const guidanceBreedMatchMode = typeof guidancePacket?.metadata?.breedMatchMode === 'string'
    ? guidancePacket.metadata.breedMatchMode
    : null;
  const guidanceSpecies = typeof guidancePacket?.metadata?.targetSpecies === 'string'
    ? guidancePacket.metadata.targetSpecies
    : routedSpecies;
  const shouldGuardBreedSpecificReply = (
    routedBreedMatchMode === 'fallback_species'
    || guidanceBreedMatchMode === 'fallback_species'
  );

  if (!shouldGuardBreedSpecificReply) return { ok: true };

  const mentionedBreeds = detectRegisteredBreedMentions(result.reply, guidanceSpecies);
  if (!mentionedBreeds.length) return { ok: true };

  return {
    ok: false,
    guardId: 'breed_boundary',
    retryHint: `当前只稳定命中到物种层，不能在最终回复里写具体品种名（如：${mentionedBreeds.slice(0, 3).join('、')}）。请改写成物种层表达，例如“适合老年狗/肠胃敏感猫”，再重新调用 present_recommendation。`,
  };
}

// #知识来源边界守门
function validateKnowledgeSourceGuard(
  _: OrchestrationDecision,
  result: AgentResult,
  runtime: FinalResultRuntimeContext,
): FinalResultValidation {
  const knowledgePacket = runtime.packets?.find((packet) => packet.kind === 'knowledge');
  const allowedSources = (knowledgePacket?.sources || []).map(normalizeSourceLabel);
  const citedSources = extractCitedSourceLabels(result.reply).map(normalizeSourceLabel);
  const genericSourceMentions = findGenericSourceMentions(result.reply, allowedSources);

  if (genericSourceMentions.length) {
    const sourceHint = allowedSources.length
      ? `只能引用本轮真实命中的完整标题：${allowedSources.slice(0, 3).join('；')}。`
      : '当前没有命中可引用来源，请去掉所有来源名。';
    return {
      ok: false,
      guardId: 'knowledge_source',
      retryHint: `最终回复提到了来源但没有写具体标题（如：${genericSourceMentions.join('、')}）。${sourceHint}`,
    };
  }

  if (!citedSources.length) return { ok: true };

  if (!allowedSources.length) {
    return {
      ok: false,
      guardId: 'knowledge_source',
      retryHint: '当前这轮没有可引用的具体来源标题。请去掉 reply 里的具体来源引用，只保留结论或风险说明后重新调用 present_recommendation。',
    };
  }

  const invalidSources = citedSources.filter((label) => !allowedSources.includes(label));
  if (!invalidSources.length) return { ok: true };

  return {
    ok: false,
    guardId: 'knowledge_source',
    retryHint: `最终回复里出现了本轮未命中的来源标题（如：${invalidSources.slice(0, 3).join('、')}）。请只引用当前知识结果里真实命中的 sourceLabels，或去掉这些来源后重新调用 present_recommendation。`,
  };
}

// #泛化来源提及识别
function findGenericSourceMentions(text: string, allowedSources: string[]): string[] {
  if (!text) return [];
  const sourceNames = Array.from(new Set([
    ...KNOWN_KNOWLEDGE_SOURCE_NAMES,
    ...allowedSources.map(extractSourceName).filter(Boolean),
  ]));

  return sourceNames.filter((sourceName) => (
    text.includes(sourceName) && !hasSpecificSourceTitle(text, sourceName)
  ));
}

// #来源标题完整性判断
function hasSpecificSourceTitle(text: string, sourceName: string): boolean {
  return new RegExp(`${escapeRegExp(sourceName)}\\s*《[^》]+》`, 'u').test(text);
}

// #来源标签名称提取
function extractSourceName(label: string): string {
  return label.split('《')[0]?.trim() || '';
}

// #来源引用提取
function extractCitedSourceLabels(text: string): string[] {
  if (!text) return [];
  const matches = text.matchAll(/(?:参考[:：]\s*)?([A-Za-z\u4e00-\u9fa5\s]+?)《([^》]+)》/gu);
  const labels = new Set<string>();

  for (const match of matches) {
    const source = match[1]?.trim();
    const title = match[2]?.trim();
    if (!source || !title) continue;
    labels.add(`${source}《${title}》`);
  }

  return Array.from(labels);
}

// #来源标签归一化
function normalizeSourceLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim();
}

// #正则安全转义
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
