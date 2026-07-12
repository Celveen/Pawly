import type { ChatMessage } from '@/lib/types';
import {
  hasCommunitySignal,
  hasCommunityPreferenceSignal,
  hasGuidanceSignal,
  hasHighRiskSignal,
  hasKnowledgeSignal,
  hasOrderHistorySignal,
  hasPetProfileSignal,
  hasServiceSignal,
  inferPrimarySpeciesScope,
  resolveBreedContext,
} from './knowledge/taxonomy';
import type { MainAgentIntent } from './knowledge/types';

// #主Agent推荐工具名
export type RecommendedToolName =
  | 'get_pet_profile'
  | 'upsert_pet'
  | 'search_products'
  | 'guidance_rank_products'
  | 'community_search'
  | 'community_summarize'
  | 'get_order_history'
  | 'ask_knowledge_agent';

// #主Agent路由结果结构
export interface RouteIntentResult {
  intent: MainAgentIntent;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  highRisk: boolean;
  strategy: string;
  recommendedTools: RecommendedToolName[];
  petContext: {
    inferredSpeciesScope: string | null;
    targetBreedScopes: string[];
    breedMatchMode: 'matched_breed' | 'fallback_species' | 'unknown';
  };
}

// #主Agent意图路由
export function routeIntent(history: ChatMessage[]): RouteIntentResult {
  const latestUser = [...history].reverse().find((msg) => msg.role === 'user')?.content || '';
  // #当前问题路由边界
  const currentText = latestUser;
  const inferredSpeciesScope = normalizePrimarySpecies(inferPrimarySpeciesScope(currentText));
  const breedResolution = resolveBreedContext(currentText, inferredSpeciesScope);
  const communitySignal = hasCommunitySignal(currentText);
  const communityPreferenceSignal = hasCommunityPreferenceSignal(latestUser);
  const orderHistorySignal = hasOrderHistorySignal(currentText);
  const guidanceSignal = hasGuidanceSignal(latestUser);
  const knowledgeSignal = hasKnowledgeSignal(currentText);
  const shouldPreferCommunityRoute = communityPreferenceSignal && !hasServiceSignal(latestUser) && !hasHighRiskSignal(currentText);

  if (hasHighRiskSignal(currentText)) {
    return {
      intent: 'high_risk_knowledge',
      confidence: 'high',
      reason: '命中高风险医疗/中毒/药物相关关键词，优先走知识与安全路径。',
      highRisk: true,
      strategy: '先读取宠物档案，再优先调用 ask_knowledge_agent；如用户同时提到推荐诉求，也先完成高风险知识答复，再决定是否进入轻量导购。',
      recommendedTools: ['get_pet_profile', 'ask_knowledge_agent'],
      petContext: {
        inferredSpeciesScope,
        targetBreedScopes: breedResolution.matchedBreedScopes,
        breedMatchMode: breedResolution.matchMode,
      },
    };
  }

  if (hasServiceSignal(latestUser)) {
    const recommendedTools: RecommendedToolName[] = [];
    if (communitySignal) recommendedTools.push('community_search', 'community_summarize');
    if (orderHistorySignal) recommendedTools.push('get_order_history');
    return {
      intent: 'community_or_service',
      confidence: 'medium',
      reason: '命中社区、登录、地址、订单等服务类关键词。',
      highRisk: false,
      strategy: communitySignal
        ? '优先把社区相关诉求当作工具检索任务处理：先 community_search，再按需 community_summarize，由主 Agent 做最终总结。'
        : '优先识别是否需要订单历史、地址或社区类工具，不要误走知识 Agent。',
      recommendedTools: recommendedTools.length ? recommendedTools : ['get_order_history'],
      petContext: {
        inferredSpeciesScope,
        targetBreedScopes: breedResolution.matchedBreedScopes,
        breedMatchMode: breedResolution.matchMode,
      },
    };
  }

  if (shouldPreferCommunityRoute) {
    return {
      intent: 'community_or_service',
      confidence: 'high',
      reason: '命中“大家都怎么选/别人怎么说”这类社区经验偏好表达，优先走社区工具链。',
      highRisk: false,
      strategy: guidanceSignal
        ? '这是社区经验 + 选购混合诉求：先 community_search，再按需 community_summarize；若用户还要具体商品，再补导购工具。'
        : '优先把问题当作社区经验检索任务处理：先 community_search，再按需 community_summarize。',
      recommendedTools: ['community_search', 'community_summarize'],
      petContext: {
        inferredSpeciesScope,
        targetBreedScopes: breedResolution.matchedBreedScopes,
        breedMatchMode: breedResolution.matchMode,
      },
    };
  }

  if (guidanceSignal) {
    const recommendedTools: RecommendedToolName[] = ['get_pet_profile', 'search_products', 'guidance_rank_products'];
    if (orderHistorySignal) recommendedTools.push('get_order_history');
    if (knowledgeSignal) recommendedTools.push('ask_knowledge_agent');
    return {
      intent: 'guidance',
      confidence: 'medium',
      reason: '命中商品挑选、推荐、预算或购买意图关键词。',
      highRisk: false,
      strategy: knowledgeSignal
        ? '这是混合问题：先判断是否需要知识约束，再用搜索/订单历史/导购排序工具组织轻导购。'
        : '优先读取宠物档案和商品候选；若用户问到历史购买偏好，再补充调用 get_order_history，并用 guidance_rank_products 统一排序。',
      recommendedTools,
      petContext: {
        inferredSpeciesScope,
        targetBreedScopes: breedResolution.matchedBreedScopes,
        breedMatchMode: breedResolution.matchMode,
      },
    };
  }

  if (knowledgeSignal) {
    return {
      intent: 'knowledge',
      confidence: 'medium',
      reason: '命中养宠知识、护理、训练、营养或一般健康问题关键词。',
      highRisk: false,
      strategy: communitySignal
        ? '优先完成知识答复；若用户还想看经验分享，再补 community_search 和 community_summarize，不要让社区内容替代专业结论。'
        : '优先读取宠物档案并调用 ask_knowledge_agent，按证据化问答处理。',
      recommendedTools: communitySignal
        ? ['get_pet_profile', 'ask_knowledge_agent', 'community_search', 'community_summarize']
        : ['get_pet_profile', 'ask_knowledge_agent'],
      petContext: {
        inferredSpeciesScope,
        targetBreedScopes: breedResolution.matchedBreedScopes,
        breedMatchMode: breedResolution.matchMode,
      },
    };
  }

  if (hasPetProfileSignal(latestUser)) {
    return {
      intent: 'pet_profile',
      confidence: 'low',
      reason: '检测到宠物基本信息补充，适合继续收集档案。',
      highRisk: false,
      strategy: '优先读取现有档案，确认新增信息后调用 upsert_pet 增量更新。',
      recommendedTools: ['get_pet_profile', 'upsert_pet'],
      petContext: {
        inferredSpeciesScope,
        targetBreedScopes: breedResolution.matchedBreedScopes,
        breedMatchMode: breedResolution.matchMode,
      },
    };
  }

  return {
    intent: 'small_talk',
    confidence: 'low',
    reason: '未命中明确业务或知识信号，按普通对话处理。',
    highRisk: false,
    strategy: communitySignal ? '若用户其实在问社区经验，可尝试 community_search 和 community_summarize；否则按普通对话处理。' : '先按普通对话处理，必要时再补读档案或追问。',
    recommendedTools: communitySignal ? ['community_search', 'community_summarize'] : ['get_pet_profile'],
    petContext: {
      inferredSpeciesScope,
      targetBreedScopes: breedResolution.matchedBreedScopes,
      breedMatchMode: breedResolution.matchMode,
    },
  };
}

// #主物种兜底规范化
function normalizePrimarySpecies(scope: string): string | null {
  return scope === 'generic' ? null : scope;
}
