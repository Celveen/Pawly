import { getTopicDefinition, inferTopicDomainScopesFromTopics, normalizeScopeList } from './taxonomy';
import type { KnowledgeTopicDomainScope, KnowledgeTopicScope } from './types';

// #知识回答策略项
type KnowledgeResponsePolicy = {
  symptomSummary: string;
  urgencyRiskLead: string;
  possibleRisks: string[];
  immediateAction: string;
};

// #知识回答策略中心
const KNOWLEDGE_RESPONSE_POLICY_CENTER = {
  topicPolicies: {
    vomit: {
      symptomSummary: '连续呕吐一天这个情况不能继续在家观察。',
      urgencyRiskLead: '连续呕吐本身就有脱水和消化系统疾病风险',
      possibleRisks: ['胃肠炎', '胰腺炎', '误食异物', '消化道刺激或出血'],
      immediateAction: '先暂停喂食，不要自行喂药；可以少量多次提供清水。若喝水也吐、精神差、不吃不喝、腹泻或便血，建议立即去急诊。',
    },
    diarrhea: {
      symptomSummary: '持续腹泻或软便加重时，不建议继续在家长期观察。',
      urgencyRiskLead: '持续腹泻本身就有脱水、肠道炎症和电解质紊乱风险',
      possibleRisks: ['胃肠炎', '寄生虫或感染', '饮食刺激', '脱水'],
      immediateAction: '先不要自行用药，注意补水和保暖，密切观察精神状态与排便情况；如果频率增加、带血、精神差或不吃不喝，建议立即就医。',
    },
    urinary: {
      symptomSummary: '排尿异常持续存在时，不建议继续在家观察。',
      urgencyRiskLead: '排尿异常可能提示泌尿系统炎症、结晶或梗阻风险',
      possibleRisks: ['膀胱炎', '尿路结晶或结石', '尿道梗阻', '脱水'],
      immediateAction: '不要自行喂人用药，尽快观察排尿频率、尿量和颜色；如果出现尿不出、频繁蹲厕所或明显疼痛，建议立即急诊。',
    },
    respiratory_support: {
      symptomSummary: '呼吸道症状持续存在时，不建议继续在家观察。',
      urgencyRiskLead: '呼吸系统症状加重时，可能很快影响氧合和整体状态',
      possibleRisks: ['上呼吸道感染', '下呼吸道炎症', '过敏或刺激', '呼吸困难进展'],
      immediateAction: '先减少运动和刺激，保持通风与安静，不要自行喂药；如张口呼吸、喘不过气或精神迅速变差，立即急诊。',
    },
  } satisfies Partial<Record<KnowledgeTopicScope, KnowledgeResponsePolicy>>,
  domainPolicies: {
    digestive: {
      symptomSummary: '当前消化道相关症状存在进一步恶化风险，不建议继续在家观察。',
      urgencyRiskLead: '这类持续消化道症状本身就有脱水、炎症或其他系统性问题风险',
      possibleRisks: ['胃肠炎', '误食刺激物', '脱水'],
      immediateAction: '先不要自行用药，减少额外饮食刺激，少量多次补水；如持续加重、带血或精神差，建议立即就医。',
    },
    urinary: {
      symptomSummary: '当前泌尿相关症状存在进一步恶化风险，不建议继续在家观察。',
      urgencyRiskLead: '这类持续泌尿道症状可能提示炎症、结晶或梗阻问题',
      possibleRisks: ['泌尿道炎症', '结晶或结石', '排尿障碍'],
      immediateAction: '先不要自行用药，记录排尿频率和尿量；如明显尿不出、频繁蹲厕或疼痛，建议立即就医。',
    },
    respiratory: {
      symptomSummary: '当前呼吸道相关症状存在进一步恶化风险，不建议继续在家观察。',
      urgencyRiskLead: '这类持续呼吸道症状可能影响整体状态，严重时进展很快',
      possibleRisks: ['呼吸道感染', '炎症反应', '呼吸困难进展'],
      immediateAction: '先保持安静、减少活动和刺激；如呼吸费力、张口呼吸或精神迅速变差，建议立即急诊。',
    },
    skin: {
      symptomSummary: '当前皮肤相关问题持续加重时，不建议只在家反复观察。',
      urgencyRiskLead: '持续皮肤问题可能伴随感染、炎症或过敏反应风险',
      possibleRisks: ['皮肤炎症', '过敏反应', '继发感染'],
      immediateAction: '先避免继续刺激患处，不要自行叠加药物；如迅速扩散、破溃渗出或精神差，建议尽快就医。',
    },
    eye: {
      symptomSummary: '当前眼部症状持续存在时，不建议继续在家观察。',
      urgencyRiskLead: '眼部问题恶化较快时，可能影响角膜和视力',
      possibleRisks: ['结膜炎', '角膜损伤', '异物刺激'],
      immediateAction: '先不要自行滴人用眼药，避免揉擦；如睁不开眼、疼痛明显或分泌物很多，建议尽快就医。',
    },
    oral: {
      symptomSummary: '当前口腔症状持续存在时，不建议继续在家观察。',
      urgencyRiskLead: '口腔问题可能影响进食、饮水并伴随炎症疼痛',
      possibleRisks: ['口腔炎症', '牙龈问题', '牙齿损伤'],
      immediateAction: '先不要自行喂药或强行处理口腔，观察是否影响进食饮水；如疼痛明显或流血流脓，建议尽快就医。',
    },
    ear: {
      symptomSummary: '当前耳部症状持续存在时，不建议继续在家观察。',
      urgencyRiskLead: '耳部问题可能伴随炎症、感染或持续疼痛风险',
      possibleRisks: ['外耳炎', '耳道感染', '耳部刺激或损伤'],
      immediateAction: '先不要自行频繁掏耳或叠加滴耳药；如持续甩头、疼痛明显或有脓性分泌物，建议尽快就医。',
    },
  } satisfies Partial<Record<KnowledgeTopicDomainScope, KnowledgeResponsePolicy>>,
} as const;

// #知识回答策略解析
export function resolveKnowledgeResponsePolicy(targetTopics: KnowledgeTopicScope[]): {
  topicScopes: KnowledgeTopicScope[];
  topicDomains: KnowledgeTopicDomainScope[];
  primaryPolicy: KnowledgeResponsePolicy | null;
  possibleRisks: string[];
  immediateAction: string;
  symptomSummary: string;
  urgencyRiskLead: string;
} {
  const normalizedTopics = normalizeScopeList(targetTopics);
  const topicDomains = normalizeScopeList([
    ...inferTopicDomainScopesFromTopics(normalizedTopics),
    ...normalizedTopics.map((topic) => getTopicDefinition(topic)?.domain || null),
  ]) as KnowledgeTopicDomainScope[];

  const matchedTopicPolicies = normalizedTopics
    .map((topic) => KNOWLEDGE_RESPONSE_POLICY_CENTER.topicPolicies[topic as keyof typeof KNOWLEDGE_RESPONSE_POLICY_CENTER.topicPolicies])
    .filter(Boolean) as KnowledgeResponsePolicy[];

  const matchedDomainPolicies = topicDomains
    .map((domain) => KNOWLEDGE_RESPONSE_POLICY_CENTER.domainPolicies[domain as keyof typeof KNOWLEDGE_RESPONSE_POLICY_CENTER.domainPolicies])
    .filter(Boolean) as KnowledgeResponsePolicy[];

  const primaryPolicy = matchedTopicPolicies[0] || matchedDomainPolicies[0] || null;

  return {
    topicScopes: normalizedTopics as KnowledgeTopicScope[],
    topicDomains,
    primaryPolicy,
    possibleRisks: Array.from(new Set([
      ...matchedTopicPolicies.flatMap((item) => item.possibleRisks),
      ...matchedDomainPolicies.flatMap((item) => item.possibleRisks),
    ])).slice(0, 4),
    immediateAction: primaryPolicy?.immediateAction
      || '先不要自行用药，尽量减少额外刺激，密切观察精神、食欲、饮水和排泄情况；如继续加重，建议立即就医。',
    symptomSummary: primaryPolicy?.symptomSummary
      || '当前这个情况存在进一步恶化风险，不建议继续在家观察。',
    urgencyRiskLead: primaryPolicy?.urgencyRiskLead
      || '这类持续症状本身就有脱水、炎症或其他系统性问题风险',
  };
}
