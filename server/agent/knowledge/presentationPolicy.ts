import type { KnowledgeAgentOutput } from './types';

// #知识展示回复风格
export type KnowledgeReplyStyle =
  | 'knowledge_only'
  | 'knowledge_with_caution'
  | 'knowledge_then_guidance';

// #知识展示下一步动作
export type KnowledgeNextAction =
  | 'answer_only'
  | 'answer_then_clarify'
  | 'answer_then_guidance'
  | 'handoff_or_vet';

// #知识展示模板标识
export type KnowledgePresentationTemplateId =
  | 'knowledge_plain'
  | 'knowledge_caution'
  | 'knowledge_guided'
  | 'knowledge_clarify'
  | 'knowledge_vet';

// #知识展示策略结果
export interface KnowledgePresentationPolicy {
  shouldCiteSources: boolean;
  shouldAvoidProposals: boolean;
  shouldSuggestVet: boolean;
  shouldSuggestHumanHandoff: boolean;
  suggestedReplyStyle: KnowledgeReplyStyle;
  nextAction: KnowledgeNextAction;
  templateId: KnowledgePresentationTemplateId;
  policySummary: string[];
}

// #知识展示策略中心
const KNOWLEDGE_PRESENTATION_POLICY_CENTER = {
  rules: [
    {
      id: 'high_risk_or_refusal',
      match: (result: KnowledgeAgentOutput) => result.riskLevel === 'high' || !result.canAnswer,
      resolve: (result: KnowledgeAgentOutput, hasSources: boolean): KnowledgePresentationPolicy => ({
        shouldCiteSources: hasSources,
        shouldAvoidProposals: true,
        shouldSuggestVet: result.needsVet,
        shouldSuggestHumanHandoff: result.needsHumanHandoff,
        suggestedReplyStyle: 'knowledge_with_caution',
        nextAction: result.needsVet ? 'handoff_or_vet' : 'answer_only',
        templateId: result.needsVet ? 'knowledge_vet' : !result.canAnswer ? 'knowledge_clarify' : 'knowledge_caution',
        policySummary: buildPolicySummary(result, hasSources),
      }),
    },
    {
      id: 'medium_risk',
      match: (result: KnowledgeAgentOutput) => result.riskLevel === 'medium',
      resolve: (result: KnowledgeAgentOutput, hasSources: boolean): KnowledgePresentationPolicy => ({
        shouldCiteSources: hasSources,
        shouldAvoidProposals: false,
        shouldSuggestVet: result.needsVet,
        shouldSuggestHumanHandoff: false,
        suggestedReplyStyle: 'knowledge_then_guidance',
        nextAction: 'answer_then_guidance',
        templateId: 'knowledge_guided',
        policySummary: buildPolicySummary(result, hasSources),
      }),
    },
    {
      id: 'default_low_risk',
      match: () => true,
      resolve: (result: KnowledgeAgentOutput, hasSources: boolean): KnowledgePresentationPolicy => ({
        shouldCiteSources: hasSources,
        shouldAvoidProposals: false,
        shouldSuggestVet: result.needsVet,
        shouldSuggestHumanHandoff: false,
        suggestedReplyStyle: 'knowledge_only',
        nextAction: 'answer_only',
        templateId: 'knowledge_plain',
        policySummary: buildPolicySummary(result, hasSources),
      }),
    },
  ],
} as const;

// #知识展示策略解析
export function resolveKnowledgePresentationPolicy(
  result: KnowledgeAgentOutput,
  sourceLabels: string[],
): KnowledgePresentationPolicy {
  const hasSources = sourceLabels.length > 0;
  const matchedRule = KNOWLEDGE_PRESENTATION_POLICY_CENTER.rules.find((rule) => rule.match(result));
  return matchedRule
    ? matchedRule.resolve(result, hasSources)
    : {
      shouldCiteSources: hasSources,
      shouldAvoidProposals: result.riskLevel === 'high' || !result.canAnswer,
      shouldSuggestVet: result.needsVet,
      shouldSuggestHumanHandoff: false,
      suggestedReplyStyle: 'knowledge_only',
      nextAction: 'answer_only',
      templateId: 'knowledge_plain',
      policySummary: buildPolicySummary(result, hasSources),
    };
}

// #知识展示策略摘要
function buildPolicySummary(result: KnowledgeAgentOutput, hasSources: boolean): string[] {
  const rules: string[] = [];

  if (hasSources) {
    rules.push('只允许引用本轮真实命中的具体来源，不要补写未使用来源。');
  } else {
    rules.push('当前没有可引用来源时，不要假装有证据支持。');
  }

  if (result.needsVet) {
    rules.push('需要明确建议用户尽快联系线下兽医或正规医院。');
    rules.push('不要继续追问用户，把需补充的信息改写成“就医时告诉医生：xxx”。');
  }

  if (!result.canAnswer) {
    rules.push('当前证据不足，优先保守回答；如有 followUpQuestions，可先补充关键信息。');
  }

  if (result.riskLevel === 'medium') {
    rules.push('可以先给知识结论，再补充轻量 guidance，但不要强推商品。');
  }

  if (result.riskLevel === 'low') {
    rules.push('以知识答复为主，若用户明确有购买意图，再进入 guidance。');
  }

  if (result.riskLevel === 'high') {
    rules.push('高风险时优先完整保留风险说明结构，不要把就医建议压缩成一句话。');
  }

  return rules;
}
