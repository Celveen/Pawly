import type { KnowledgeAgentOutput, KnowledgeEvidence } from './types';
import {
  resolveKnowledgePresentationPolicy,
  type KnowledgeNextAction,
  type KnowledgePresentationTemplateId,
  type KnowledgeReplyStyle,
} from './presentationPolicy';

// #知识结果呈现提示结构
export interface KnowledgePresentationHints {
  shouldCiteSources: boolean;
  shouldAvoidProposals: boolean;
  shouldSuggestVet: boolean;
  shouldSuggestHumanHandoff: boolean;
  sourceLabels: string[];
  suggestedReplyStyle: KnowledgeReplyStyle;
  nextAction: KnowledgeNextAction;
  templateId: KnowledgePresentationTemplateId;
  policySummary: string[];
}

// #知识工具返回结构
export interface KnowledgeToolPayload {
  knowledge: KnowledgeAgentOutput;
  presentationHints: KnowledgePresentationHints;
}

// #知识结果转主Agent展示提示
export function buildKnowledgeToolPayload(result: KnowledgeAgentOutput): KnowledgeToolPayload {
  const sourceLabels = extractEvidenceSourceLabels(result.evidence);
  const presentationPolicy = resolveKnowledgePresentationPolicy(result, sourceLabels);

  return {
    knowledge: result,
    presentationHints: {
      shouldCiteSources: presentationPolicy.shouldCiteSources,
      shouldAvoidProposals: presentationPolicy.shouldAvoidProposals,
      shouldSuggestVet: presentationPolicy.shouldSuggestVet,
      shouldSuggestHumanHandoff: presentationPolicy.shouldSuggestHumanHandoff,
      sourceLabels,
      suggestedReplyStyle: presentationPolicy.suggestedReplyStyle,
      nextAction: presentationPolicy.nextAction,
      templateId: presentationPolicy.templateId,
      policySummary: presentationPolicy.policySummary,
    },
  };
}

// #已使用证据来源标签提取
function extractEvidenceSourceLabels(evidence: KnowledgeEvidence[]): string[] {
  const labels = new Set<string>();

  for (const item of evidence) {
    if (item.title) {
      labels.add(`${item.source}《${item.title}》`);
    }
  }

  return Array.from(labels).slice(0, 3);
}
