import { applyGuidancePolicies } from './policy';
import type {
  GuidanceProductCandidate,
  GuidanceRankingInput,
  GuidanceRankingResult,
} from './types';

// #导购候选排序执行
export function rankGuidanceCandidates(input: GuidanceRankingInput): GuidanceRankingResult {
  const ranked = input.products
    .map((product) => scoreProduct(product, input))
    .sort((a, b) => b.score - a.score);

  const selected = ranked.slice(0, 3);
  const selectedIds = selected.map((item) => item.id);
  const summary = buildRankingSummary(input.query, selected);
  const caution = buildRankingCaution(input, selected);
  const rankingMetadata = ranked[0];

  return {
    query: input.query,
    selectedIds,
    rankedCandidates: ranked,
    summary,
    caution,
    metadata: {
      targetSpecies: rankingMetadata?.metadata?.targetSpecies || undefined,
      targetBreedScopes: rankingMetadata?.metadata?.targetBreedScopes || [],
      breedMatchMode: rankingMetadata?.metadata?.breedMatchMode,
      requestedCategories: rankingMetadata?.metadata?.requestedCategories || [],
      supportedCategories: rankingMetadata?.metadata?.supportedCategories || [],
      appliedPolicyId: rankingMetadata?.metadata?.appliedPolicyId,
    },
  };
}

// #单个商品评分
function scoreProduct(product: GuidanceProductCandidate, input: GuidanceRankingInput) {
  const policyEffect = applyGuidancePolicies(product, input);
  const score = policyEffect.scoreDelta;
  const reasonTags = policyEffect.reasonTags || [];
  const cautionTags = policyEffect.cautionTags || [];

  return {
    id: product.id,
    score,
    reasonTags: uniqueTags(reasonTags),
    cautionTags: uniqueTags(cautionTags),
    metadata: {
      appliedPolicyId: policyEffect.appliedPolicyId,
      requestedCategories: policyEffect.requestedCategories,
      supportedCategories: policyEffect.supportedCategories,
      targetSpecies: policyEffect.targetSpecies,
      targetBreedScopes: policyEffect.targetBreedScopes,
      breedMatchMode: policyEffect.breedMatchMode,
    },
  };
}

// #导购排序摘要
function buildRankingSummary(
  query: string,
  selected: Array<{
    id: string;
    reasonTags: string[];
    metadata?: {
      appliedPolicyId?: string;
      requestedCategories?: string[];
      breedMatchMode?: string;
      targetSpecies?: string | null;
    };
  }>,
): string {
  if (!selected.length) return '暂时没有筛出足够合适的候选商品。';
  const topReasons = selected[0]?.reasonTags.slice(0, 2).join('、') || '更贴近当前需求';
  const policyHint = selected[0]?.metadata?.appliedPolicyId ? `当前使用 ${selected[0].metadata.appliedPolicyId} 导购策略` : '已使用当前物种导购策略';
  const breedHint = selected[0]?.metadata?.breedMatchMode !== 'matched_breed' && selected[0]?.metadata?.targetSpecies
    ? `当前未稳定命中具体品种，以下推荐理由按${selected[0].metadata.targetSpecies}物种层成立。`
    : '';
  return `已按“${query}”筛出更靠前的候选，优先依据是：${topReasons}。${policyHint}。${breedHint}`.trim();
}

// #导购排序提醒
function buildRankingCaution(
  input: GuidanceRankingInput,
  selected: Array<{ cautionTags: string[] }>,
): string | undefined {
  const cautionSet = new Set(selected.flatMap((item) => item.cautionTags));
  if (/呕吐|腹泻|便血|抽搐|中毒|发烧|呼吸/.test(input.query)) {
    cautionSet.add('当前问题可能涉及健康风险，导购建议必须服从知识判断，不应替代就医建议');
  }
  const cautionList = Array.from(cautionSet);
  return cautionList.length ? cautionList.join('；') : undefined;
}

// #标签去重
function uniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags));
}
