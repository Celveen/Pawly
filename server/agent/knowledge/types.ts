// #主Agent意图类型
export type MainAgentIntent =
  | 'small_talk'
  | 'pet_profile'
  | 'guidance'
  | 'knowledge'
  | 'high_risk_knowledge'
  | 'community_or_service';

// #知识Agent风险等级
export type KnowledgeRiskLevel = 'low' | 'medium' | 'high';

// #知识Agent风险标签
export type KnowledgeRiskTag =
  | 'disease'
  | 'drug'
  | 'emergency'
  | 'poison'
  | 'post_op'
  | 'vomit_diarrhea'
  | 'bleeding'
  | 'neurological'
  | 'respiratory'
  | 'urinary_block'
  | 'young_or_senior';

// #知识证据来源类型
export type KnowledgeEvidenceType =
  | 'internal_kb'
  | 'guideline'
  | 'association'
  | 'hospital_reference';

// #知识Agent宠物画像
export interface KnowledgePetProfile {
  species?: string;
  breed?: string;
  ageMonths?: number;
  sex?: string;
  weightKg?: number;
  notes?: string;
}

// #知识证据结构
export interface KnowledgeEvidence {
  source: string;
  title: string;
  url?: string;
  evidenceType: KnowledgeEvidenceType;
  snippet?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

// #知识Agent输入结构
export interface KnowledgeAgentInput {
  question: string;
  petProfile?: KnowledgePetProfile;
  conversationContext?: string[];
  intent: Extract<MainAgentIntent, 'knowledge' | 'high_risk_knowledge'>;
  suspectedRiskTags?: KnowledgeRiskTag[];
  evidence: KnowledgeEvidence[];
}

// #知识Agent输出结构
export interface KnowledgeAgentOutput {
  canAnswer: boolean;
  answer: string;
  summary: string;
  evidence: KnowledgeEvidence[];
  confidence: 'high' | 'medium' | 'low';
  riskLevel: KnowledgeRiskLevel;
  riskTags: KnowledgeRiskTag[];
  needsVet: boolean;
  needsHumanHandoff: boolean;
  followUpQuestions: string[];
  refusalReason?: string;
}

// #知识检索查询结构
export interface KnowledgeRetrievalQuery {
  question: string;
  petProfile?: KnowledgePetProfile;
  conversationContext?: string[];
  limit?: number;
}

// #知识主题范围
export type KnowledgeTopicScope = string;

// #知识主题域范围
export type KnowledgeTopicDomainScope = string;

// #知识物种范围
export type KnowledgeSpeciesScope = string;
