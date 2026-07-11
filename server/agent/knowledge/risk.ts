import type { KnowledgeAgentInput, KnowledgeRiskLevel, KnowledgeRiskTag } from './types';
import {
  HIGH_RISK_SIGNAL_RULES,
  inferConfiguredRiskTagsFromTopicDomains,
  inferConfiguredRiskTagsFromTopics,
  inferHighRiskSignalTags,
  inferTopicDomainScopesFromText,
  inferTopicDomainScopesFromTopics,
  inferTopicScopesFromText,
} from './taxonomy';

// #知识风险规则库
const HIGH_RISK_PATTERNS = HIGH_RISK_SIGNAL_RULES;

// #风险标签推断
export function inferRiskTags(input: KnowledgeAgentInput): KnowledgeRiskTag[] {
  // #当前症状风险边界
  const merged = input.question;

  const found = new Set<KnowledgeRiskTag>(input.suspectedRiskTags || []);
  for (const tag of inferHighRiskSignalTags(merged)) found.add(tag as KnowledgeRiskTag);
  const topics = inferTopicScopesFromText(merged);
  const topicDomains = Array.from(new Set([
    ...inferTopicDomainScopesFromText(merged),
    ...inferTopicDomainScopesFromTopics(topics),
  ]));
  for (const tag of inferConfiguredRiskTagsFromTopics(topics)) found.add(tag);
  for (const tag of inferConfiguredRiskTagsFromTopicDomains(topicDomains)) found.add(tag);

  if (input.petProfile?.ageMonths != null && (input.petProfile.ageMonths <= 6 || input.petProfile.ageMonths >= 120)) {
    found.add('young_or_senior');
  }

  return Array.from(found);
}

// #风险等级推断
export function inferRiskLevel(tags: KnowledgeRiskTag[]): KnowledgeRiskLevel {
  if (
    tags.some((tag) =>
      ['drug', 'emergency', 'poison', 'bleeding', 'neurological', 'respiratory', 'urinary_block', 'post_op'].includes(tag),
    )
  ) return 'high';

  if (tags.some((tag) => ['disease', 'vomit_diarrhea', 'young_or_senior'].includes(tag))) return 'medium';

  return 'low';
}

// #是否需要线下就医
export function needsVetByRisk(level: KnowledgeRiskLevel): boolean {
  return level === 'high';
}
