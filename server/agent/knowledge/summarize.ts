import type { KnowledgeAgentOutput } from './types';
import type { KnowledgeToolPayload } from './presentation';

// #知识结果摘要结构
export interface KnowledgeSummary {
  canAnswer: boolean;
  confidence: KnowledgeAgentOutput['confidence'];
  riskLevel: KnowledgeAgentOutput['riskLevel'];
  needsVet: boolean;
  needsHumanHandoff: boolean;
  sourceTitles: string[];
  followUpCount: number;
  answerPreview: string;
  nextAction?: KnowledgeToolPayload['presentationHints']['nextAction'];
  templateId?: KnowledgeToolPayload['presentationHints']['templateId'];
}

// #知识结果摘要生成
export function summarizeKnowledgeResult(result: KnowledgeAgentOutput): KnowledgeSummary {
  return {
    canAnswer: result.canAnswer,
    confidence: result.confidence,
    riskLevel: result.riskLevel,
    needsVet: result.needsVet,
    needsHumanHandoff: result.needsHumanHandoff,
    sourceTitles: result.evidence.map((item) => item.title).filter(Boolean).slice(0, 3),
    followUpCount: result.followUpQuestions.length,
    answerPreview: compactText(result.answer, 140),
  };
}

// #知识工具返回摘要生成
export function summarizeKnowledgePayload(payload: KnowledgeToolPayload): KnowledgeSummary {
  const base = summarizeKnowledgeResult(payload.knowledge);
  return {
    ...base,
    nextAction: payload.presentationHints.nextAction,
    templateId: payload.presentationHints.templateId,
  };
}

// #长文本压缩预览
function compactText(text: string, maxLength: number): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength) + '...';
}
