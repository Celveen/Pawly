import type { KnowledgeToolPayload } from '../knowledge/presentation';
import type { AgentEvidencePacket } from './types';

// #工具结果转中间结构协议
export function buildEvidencePacketFromToolResult(
  toolName: string,
  result: unknown,
): AgentEvidencePacket | null {
  if (toolName === 'ask_knowledge_agent' && isKnowledgeToolPayload(result)) {
    const highRisk = result.knowledge.riskLevel === 'high';
    return {
      kind: 'knowledge',
      sourceTool: toolName,
      priority: highRisk ? 'high' : result.knowledge.riskLevel === 'medium' ? 'medium' : 'low',
      canDirectAnswer: result.knowledge.canAnswer,
      shouldBlockRecommendation: result.presentationHints.shouldAvoidProposals,
      summary: result.knowledge.summary || result.knowledge.answer,
      details: result.knowledge.followUpQuestions,
      sources: result.presentationHints.sourceLabels,
      cautions: result.presentationHints.policySummary,
      metadata: {
        riskLevel: result.knowledge.riskLevel,
        needsVet: result.knowledge.needsVet,
        nextAction: result.presentationHints.nextAction,
        replyStyle: result.presentationHints.suggestedReplyStyle,
        templateId: result.presentationHints.templateId,
        breedMatchMode: result.knowledge.evidence[0]?.metadata?.targetBreedMatchMode || null,
        targetBreedScopes: result.knowledge.evidence[0]?.metadata?.targetBreedScopes || null,
      },
    };
  }

  if (toolName === 'community_summarize' && isCommunitySummaryResult(result)) {
    return {
      kind: 'community',
      sourceTool: toolName,
      priority: result.suggestedUse === 'reference_after_knowledge' ? 'low' : 'medium',
      canDirectAnswer: false,
      shouldBlockRecommendation: false,
      summary: result.summary,
      details: result.commonPatterns,
      cautions: [result.caution],
      metadata: {
        suggestedUse: result.suggestedUse,
      },
    };
  }

  if (toolName === 'guidance_rank_products' && isGuidanceRankingResult(result)) {
    return {
      kind: 'guidance',
      sourceTool: toolName,
      priority: 'medium',
      canDirectAnswer: false,
      shouldBlockRecommendation: false,
      summary: result.summary,
      details: result.rankedCandidates.slice(0, 3).map((item) => `${item.id}: ${item.reasonTags.join('、')}`),
      cards: result.rankedCandidates.slice(0, 3).map((item) => ({
        id: item.id,
        score: item.score,
        reasonTags: item.reasonTags,
        cautionTags: item.cautionTags,
        metadata: item.metadata,
      })),
      cautions: result.caution ? [result.caution] : [],
      metadata: {
        targetSpecies: result.metadata?.targetSpecies,
        targetBreedScopes: result.metadata?.targetBreedScopes,
        breedMatchMode: result.metadata?.breedMatchMode,
        requestedCategories: result.metadata?.requestedCategories,
        supportedCategories: result.metadata?.supportedCategories,
        appliedPolicyId: result.metadata?.appliedPolicyId,
      },
    };
  }

  if (toolName === 'get_order_history' && isOrderHistoryResult(result)) {
    return {
      kind: 'context',
      sourceTool: toolName,
      priority: 'low',
      canDirectAnswer: false,
      shouldBlockRecommendation: false,
      summary: result.orderCount > 0 ? `已读取最近 ${result.orderCount} 条订单历史。` : '当前没有可用订单历史。',
      details: result.purchasedCategories || [],
      metadata: {
        orderCount: result.orderCount,
        purchasedCategories: result.purchasedCategories,
        purchasedSpecies: result.purchasedSpecies,
      },
    };
  }

  return null;
}

// #知识工具结果识别
function isKnowledgeToolPayload(value: unknown): value is KnowledgeToolPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return !!candidate.knowledge && !!candidate.presentationHints;
}

// #社区摘要结果识别
function isCommunitySummaryResult(value: unknown): value is {
  summary: string;
  caution: string;
  commonPatterns: string[];
  suggestedUse: string;
} {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.summary === 'string' && Array.isArray(candidate.commonPatterns);
}

// #导购排序结果识别
function isGuidanceRankingResult(value: unknown): value is {
  summary: string;
  caution?: string;
  rankedCandidates: Array<{
    id: string;
    score: number;
    reasonTags: string[];
    cautionTags: string[];
    metadata?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
} {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.summary === 'string' && Array.isArray(candidate.rankedCandidates);
}

// #订单历史结果识别
function isOrderHistoryResult(value: unknown): value is {
  orderCount: number;
  purchasedCategories?: string[];
  purchasedSpecies?: string[];
} {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.orderCount === 'number';
}
