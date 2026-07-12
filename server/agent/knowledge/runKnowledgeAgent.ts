import { deepseekChat } from '../../deepseek';
import { logAgentDebug } from '../debug';
import { buildKnowledgeSystemPrompt, buildKnowledgeUserPrompt } from './prompt';
import { retrieveKnowledgeEvidence } from './retrieval';
import { resolveKnowledgeResponsePolicy } from './responsePolicy';
import { inferRiskLevel, inferRiskTags, needsVetByRisk } from './risk';
import { summarizeKnowledgeResult } from './summarize';
import {
  extractBreedScopes,
  filterTopicDomainsBySpecies,
  inferTopicDomainScopesFromText,
  inferTopicDomainScopesFromTopics,
  inferTopicScopesFromText,
  isBreedCompatible,
  isSpeciesCompatible,
  isTopicCompatible,
  normalizeScopeLabel,
  normalizeScopeList,
  normalizeSpeciesScope,
  resolveBreedContext,
} from './taxonomy';
import type { KnowledgeAgentInput, KnowledgeAgentOutput, KnowledgeTopicDomainScope, KnowledgeTopicScope } from './types';

// #知识Agent主执行流程
export async function runKnowledgeAgent(input: KnowledgeAgentInput): Promise<KnowledgeAgentOutput> {
  const targetSpecies = normalizeSpeciesScope(input.petProfile?.species);
  const breedResolution = resolveBreedContext(input.petProfile?.breed, input.petProfile?.species);
  const targetBreeds = breedResolution.matchedBreedScopes;
  const targetTopics = inferQuestionTopics(input);
  const targetTopicDomains = inferQuestionTopicDomains(input, targetTopics);
  const retrievedEvidence = await retrieveKnowledgeEvidence({
    question: input.question,
    petProfile: input.petProfile,
    conversationContext: input.conversationContext,
    limit: 3,
  });
  const compatibleEvidence = filterEvidenceByContext(
    retrievedEvidence,
    targetSpecies,
    targetBreeds,
    targetTopics,
    targetTopicDomains,
    input.intent,
  );
  const evidence = mergeEvidence(input.evidence, compatibleEvidence);
  const riskTags = inferRiskTags(input);
  const riskLevel = inferRiskLevel(riskTags);

  logAgentDebug({
    scope: 'knowledge-agent',
    event: 'retrieval_complete',
    details: {
      question: input.question,
      intent: input.intent,
      inferredRiskLevel: riskLevel,
      inferredRiskTags: riskTags,
      manualEvidenceCount: input.evidence.length,
      retrievedEvidenceCount: retrievedEvidence.length,
      compatibleEvidenceCount: compatibleEvidence.length,
      breedResolution,
      targetTopics,
      targetTopicDomains,
      mergedEvidenceCount: evidence.length,
      evidenceSources: evidence.map((item) => ({
        source: item.source,
        title: item.title,
        articleId: item.metadata?.articleId,
        speciesScope: item.metadata?.speciesScope,
        topicScope: item.metadata?.topicScope,
      })).slice(0, 5),
    },
  });

  if (!evidence.length) {
    logAgentDebug({
      scope: 'knowledge-agent',
      event: 'refusal_no_evidence',
      details: {
        question: input.question,
        targetSpecies,
        targetBreeds,
        breedResolution,
        targetTopics,
        targetTopicDomains,
        inferredRiskLevel: riskLevel,
        inferredRiskTags: riskTags,
      },
    });
    return buildRefusal(
      riskLevel,
      riskTags,
      targetSpecies
        ? `当前缺少针对该物种的可靠内部知识证据，不能给出稳妥的明确结论。`
        : '当前没有可用的内部知识或白名单来源证据，不能给出可靠回答。',
    );
  }

  // 模型调用/解析失败一律走保守拒答：高风险问题的安全兜底不能随异常丢失
  let parsed: Partial<KnowledgeAgentOutput> | null = null;
  try {
    const res = await deepseekChat({
      messages: [
        { role: 'system', content: buildKnowledgeSystemPrompt() },
        { role: 'user', content: buildKnowledgeUserPrompt({ ...input, evidence }, riskTags, riskLevel) },
      ],
      temperature: 0,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });
    parsed = parseOutput(res.choices?.[0]?.message?.content || '');
  } catch (e: any) {
    console.error('[knowledge] 模型调用失败:', e?.message || e);
  }
  if (!parsed) {
    return buildRefusal(riskLevel, riskTags, '知识 Agent 生成回答失败，保守拒答。');
  }
  const normalizedEvidence = pickAllowedEvidence(
    Array.isArray(parsed.evidence) ? parsed.evidence : [],
    evidence,
    targetSpecies,
    targetBreeds,
    targetTopics,
    targetTopicDomains,
    input.intent,
  );
  const contextualizedEvidence = attachTargetContextToEvidence(normalizedEvidence, {
    targetSpecies,
    targetBreedScopes: targetBreeds,
    targetBreedMatchMode: breedResolution.matchMode,
  });
  const output: KnowledgeAgentOutput = {
    canAnswer: parsed.canAnswer ?? true,
    answer: parsed.answer || '',
    summary: parsed.summary || '',
    evidence: contextualizedEvidence,
    confidence: parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low' ? parsed.confidence : 'low',
    riskLevel,
    riskTags,
    needsVet: needsVetByRisk(riskLevel),
    needsHumanHandoff: riskLevel === 'high',
    followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions.map(String) : [],
    refusalReason: typeof parsed.refusalReason === 'string' ? parsed.refusalReason : undefined,
  };

  // #模型未采用证据时不向主Agent传递来源
  if (!output.canAnswer) output.evidence = [];
  const articleSourceLine = buildArticleSourceLine(output.evidence);
  output.followUpQuestions = normalizeFollowUpQuestions(output);
  output.answer = stabilizeKnowledgeAnswer(output.answer, output.evidence, {
    sourceLine: articleSourceLine,
    needsVet: output.needsVet,
    riskLevel: output.riskLevel,
    petProfile: input.petProfile,
    question: input.question,
    targetTopics,
    targetTopicDomains,
  });
  output.summary = stabilizeKnowledgeSummary(output.summary, {
    sourceLine: articleSourceLine,
    needsVet: output.needsVet,
    riskLevel: output.riskLevel,
  });

  logAgentDebug({
    scope: 'knowledge-agent',
    event: 'response_ready',
    details: summarizeKnowledgeResult(output),
  });

  return output;
}

// #证据合并与去重
function mergeEvidence(primary: KnowledgeAgentInput['evidence'], fallback: KnowledgeAgentInput['evidence']) {
  const all = [...primary, ...fallback];
  const deduped = new Map<string, KnowledgeAgentInput['evidence'][number]>();
  for (const item of all) {
    const key = `${item.source}::${item.title}::${item.snippet || ''}`;
    if (!deduped.has(key)) deduped.set(key, item);
  }
  return Array.from(deduped.values());
}

// #证据附加目标上下文
function attachTargetContextToEvidence(
  evidence: KnowledgeAgentInput['evidence'],
  context: {
    targetSpecies: string | null;
    targetBreedScopes: string[];
    targetBreedMatchMode: 'matched_breed' | 'fallback_species' | 'unknown';
  },
) {
  return evidence.map((item) => ({
    ...item,
    metadata: {
      ...(item.metadata || {}),
      targetSpecies: context.targetSpecies,
      targetBreedScopes: context.targetBreedScopes.join('|') || null,
      targetBreedMatchMode: context.targetBreedMatchMode,
    },
  }));
}

// #模型证据白名单收口
function pickAllowedEvidence(
  parsedEvidence: KnowledgeAgentInput['evidence'],
  allowedEvidence: KnowledgeAgentInput['evidence'],
  targetSpecies: string | null,
  targetBreeds: string[],
  targetTopics: KnowledgeTopicScope[],
  targetTopicDomains: KnowledgeTopicDomainScope[],
  intent: KnowledgeAgentInput['intent'],
) {
  const compatibleAllowed = filterEvidenceByContext(
    allowedEvidence,
    targetSpecies,
    targetBreeds,
    targetTopics,
    targetTopicDomains,
    intent,
  );
  if (!parsedEvidence.length) return compatibleAllowed;

  const allowedMap = new Map<string, KnowledgeAgentInput['evidence'][number]>();
  for (const item of compatibleAllowed) {
    allowedMap.set(buildEvidenceKey(item), item);
  }

  const picked = parsedEvidence
    .map((item) => allowedMap.get(buildEvidenceKey(item)))
    .filter(Boolean) as KnowledgeAgentInput['evidence'];

  return picked.length ? picked : compatibleAllowed;
}

// #证据键生成
function buildEvidenceKey(item: KnowledgeAgentInput['evidence'][number]) {
  return [
    item.source || '',
    item.title || '',
    item.url || '',
    item.evidenceType || '',
    item.snippet || '',
  ].join('::');
}

// #来源说明拼接
// 措辞区分证据类型："参考"只用于真正读过内容的内部知识库文章；
// 白名单权威站点只是静态目录映射（并未抓取原文），只能写"可进一步查阅"，
// 否则等于给回答打上从未读取过内容的权威背书（引用关系造假）。
function buildArticleSourceLine(allEvidence: KnowledgeAgentInput['evidence']): string {
  const internal = Array.from(new Set(
    allEvidence.filter((i) => i.evidenceType === 'internal_kb').map((i) => formatEvidenceLabel(i)).filter(Boolean),
  )).slice(0, 3);
  const external = Array.from(new Set(
    allEvidence.filter((i) => i.evidenceType !== 'internal_kb').map((i) => formatEvidenceLabel(i)).filter(Boolean),
  )).slice(0, 2);

  const parts: string[] = [];
  if (internal.length) parts.push(`参考：${internal.join('；')}。`);
  if (external.length) parts.push(`可进一步查阅：${external.join('；')}。`);
  return parts.join(' ');
}

// #证据标签格式化
function formatEvidenceLabel(item: KnowledgeAgentInput['evidence'][number]): string {
  if (item.title) return `${item.source}《${item.title.trim()}》`;
  return '';
}


// #知识文本基础规范化
function normalizeKnowledgeText(text: string, sourceLine: string, needsVet: boolean): string {
  const trimmed = sanitizeSourceMentions(text.trim(), sourceLine);
  const warningLine = needsVet ? '⚠️线上建议不能替代面诊！' : '';
  const lines: string[] = [];

  if (trimmed) lines.push(trimmed);
  if (sourceLine && !trimmed.includes(sourceLine)) lines.push(sourceLine);
  if (warningLine && !trimmed.includes('⚠️线上建议不能替代面诊！')) lines.push(warningLine);

  return lines.filter(Boolean).join('\n\n');
}

// #知识回答稳定化
function stabilizeKnowledgeAnswer(
  text: string,
  evidence: KnowledgeAgentInput['evidence'],
  opts: {
    sourceLine: string;
    needsVet: boolean;
    riskLevel: KnowledgeAgentOutput['riskLevel'];
    petProfile?: KnowledgeAgentInput['petProfile'];
    question: string;
    targetTopics: KnowledgeTopicScope[];
    targetTopicDomains: KnowledgeTopicDomainScope[];
  },
): string {
  const normalized = normalizeKnowledgeText(text, opts.sourceLine, opts.needsVet);
  if (opts.riskLevel !== 'high') return normalized;

  return formatHighRiskStructuredAnswer(normalized, evidence, opts);
}

// #高风险回答模板化收口
function formatHighRiskStructuredAnswer(
  normalized: string,
  evidence: KnowledgeAgentInput['evidence'],
  opts: {
    sourceLine: string;
    needsVet: boolean;
    riskLevel: KnowledgeAgentOutput['riskLevel'];
    petProfile?: KnowledgeAgentInput['petProfile'];
    question: string;
    targetTopics: KnowledgeTopicScope[];
    targetTopicDomains: KnowledgeTopicDomainScope[];
  },
): string {
  const responsePolicy = resolveKnowledgeResponsePolicy(opts.targetTopics);
  const title = '⚠️ 建议尽快就医';
  const urgency = buildUrgencyParagraph(opts.petProfile, opts.question, responsePolicy);
  const possibleRisks = buildPossibleRiskParagraph(normalized, evidence, responsePolicy.possibleRisks);
  const nextSteps = responsePolicy.immediateAction;
  const doctorBrief = buildVetBrief(opts.petProfile, opts.question);
  const disclaimer = buildDisclaimerSection(opts.sourceLine);

  return [
    title,
    urgency,
    '可能风险',
    possibleRisks,
    '现在可以做什么',
    nextSteps,
    '就医时告诉医生',
    doctorBrief,
    '说明',
    disclaimer,
  ].filter(Boolean).join('\n');
}

// #知识摘要稳定化
function stabilizeKnowledgeSummary(
  text: string,
  opts: {
    sourceLine: string;
    needsVet: boolean;
    riskLevel: KnowledgeAgentOutput['riskLevel'];
  },
): string {
  const normalized = normalizeKnowledgeText(text, opts.sourceLine, opts.needsVet);
  return normalized;
}

// #高风险就医紧迫性文案
function buildUrgencyParagraph(
  petProfile: KnowledgeAgentInput['petProfile'],
  question: string,
  responsePolicy: ReturnType<typeof resolveKnowledgeResponsePolicy>,
): string {
  const name = extractPetName(question) || '毛孩子';
  const ageText = formatPetAge(petProfile?.ageMonths);
  const breed = petProfile?.breed?.trim();
  const weightText = typeof petProfile?.weightKg === 'number' ? `${petProfile.weightKg}kg` : '';
  const notes = petProfile?.notes?.trim();
  const profileBits = [ageText, breed, weightText, notes].filter(Boolean).slice(0, 3);
  const symptomSummary = responsePolicy.symptomSummary;
  const riskLead = responsePolicy.urgencyRiskLead;

  if (!profileBits.length) {
    return `${name}${symptomSummary}${riskLead}，建议尽快去正规宠物医院就诊。`;
  }

  return `${name}${profileBits.join('、')}，${symptomSummary}${riskLead}，建议尽快去正规宠物医院就诊。`;
}

// #高风险可能风险文案
function buildPossibleRiskParagraph(
  normalized: string,
  evidence: KnowledgeAgentInput['evidence'],
  baseRisks: string[],
): string {
  const references = new Set<string>(baseRisks);

  for (const item of evidence) {
    if (item.evidenceType !== 'internal_kb') continue;
    const snippet = item.snippet || '';
    if (/胰腺/u.test(snippet)) references.add('胰腺炎');
    if (/异物/u.test(snippet)) references.add('误食异物');
    if (/出血|咖啡渣|带血/u.test(snippet)) references.add('消化道出血');
    if (/胃肠/u.test(snippet)) references.add('胃肠炎');
    if (/脱水/u.test(snippet)) references.add('脱水');
  }

  const risks = Array.from(references).slice(0, 4);
  if (!risks.length) {
    return '持续症状可能与胃肠道问题、炎症反应、误食刺激物或其他需要线下检查的情况有关，需要兽医进一步判断。';
  }

  return `当前情况可能与${risks.join('、')}等问题有关，需要兽医结合体检、影像或化验进一步判断。`;
}

// #就医摘要文案
function buildVetBrief(
  petProfile: KnowledgeAgentInput['petProfile'],
  question: string,
): string {
  const name = extractPetName(question) || '宠物';
  const parts = [
    name,
    formatPetAge(petProfile?.ageMonths),
    petProfile?.breed?.trim(),
    typeof petProfile?.weightKg === 'number' ? `${petProfile.weightKg}kg` : '',
    petProfile?.notes?.trim(),
  ].filter(Boolean);

  const symptomSummary = extractSymptomSummary(question);
  const summary = [parts.join('，'), symptomSummary].filter(Boolean).join('，');

  return `${summary || '请把症状发生时间、频率、精神食欲和是否误食一并告诉医生'}。就医时可一并告诉医生：发作开始时间、症状频率、颜色性状、是否腹泻、是否误食，以及精神和食欲变化。`;
}

// #免责声明文案
function buildDisclaimerSection(sourceLine: string): string {
  const base = '本回复为 Pawly 健康科普建议，不替代兽医诊断。';
  return sourceLine ? `${sourceLine}\n${base}` : base;
}

// #来源话术清洗
function sanitizeSourceMentions(text: string, sourceLine: string): string {
  if (!text) return text;

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const sanitizedLines = lines.filter((line) => {
    if (line === sourceLine) return false;

    if (!sourceLine) {
      return !/^(根据|参考)[:：]?\s*(Pawly|Merck|AAHA|WSAVA|VCA|Veterinary Partner|兽医手册|科普)/u.test(line);
    }

    if (/^(根据|参考)[:：]?\s*/u.test(line) && !line.includes('《')) {
      return false;
    }

    return true;
  });

  return sanitizedLines.join('\n');
}

// #年龄文本格式化
function formatPetAge(ageMonths?: number): string {
  if (typeof ageMonths !== 'number' || ageMonths < 0) return '';
  if (ageMonths < 12) return `${ageMonths}个月`;
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return months ? `${years}岁${months}个月` : `${years}岁`;
}

// #问题中的宠物名提取
function extractPetName(question: string): string | null {
  const match = question.match(/([\u4e00-\u9fa5A-Za-z0-9]{1,12})(?:连续|一直|这两天|今天|昨天|呕吐|吐了)/u);
  if (!match) return null;
  const candidate = match[1];
  if (/我家|狗狗|猫咪|狗子|猫子/u.test(candidate)) return null;
  return candidate;
}

// #症状摘要提取
function extractSymptomSummary(question: string): string {
  const trimmed = question.replace(/[？?。！!]+$/u, '').trim();
  if (!trimmed) return '';
  return trimmed;
}

// #高风险追问收口
function normalizeFollowUpQuestions(output: KnowledgeAgentOutput): string[] {
  if (output.riskLevel === 'high' || output.needsVet) return [];
  return output.followUpQuestions;
}

// #证据物种过滤
function filterEvidenceBySpecies(
  evidence: KnowledgeAgentInput['evidence'],
  targetSpecies: string | null,
) {
  if (!targetSpecies) return evidence;
  return evidence.filter((item) => {
    const scope = normalizeScopeLabel(String(item.metadata?.speciesScope || ''));
    return isSpeciesCompatible(scope, targetSpecies);
  });
}

// #证据上下文过滤
function filterEvidenceByContext(
  evidence: KnowledgeAgentInput['evidence'],
  targetSpecies: string | null,
  targetBreeds: string[],
  targetTopics: KnowledgeTopicScope[],
  targetTopicDomains: KnowledgeTopicDomainScope[],
  intent: KnowledgeAgentInput['intent'],
) {
  const speciesFiltered = filterEvidenceBySpecies(evidence, targetSpecies);
  const breedFiltered = filterEvidenceByBreed(speciesFiltered, targetBreeds);
  // #没有可识别主题时不返回泛化证据，避免无关文章被当成参考来源
  if (!targetTopics.length && !targetTopicDomains.length) return [];

  return breedFiltered.filter((item) => {
    const topicScopes = normalizeScopeList([item.metadata?.topicScope as string | undefined]);
    const topicDomainScopes = typeof item.metadata?.topicDomainScopes === 'string'
      ? normalizeScopeList(item.metadata.topicDomainScopes.split('|'))
      : [];
    if (!topicScopes.length && !topicDomainScopes.length) return false;
    return isTopicCompatible(topicScopes, topicDomainScopes, targetTopics, targetTopicDomains);
  });
}

// #证据品种过滤
function filterEvidenceByBreed(
  evidence: KnowledgeAgentInput['evidence'],
  targetBreeds: string[],
) {
  if (!targetBreeds.length) return evidence;
  return evidence.filter((item) => {
    const rawScope = item.metadata?.breedScopes;
    if (!rawScope || typeof rawScope !== 'string') return true;
    const scopes = normalizeScopeList(rawScope.split('|'));
    return isBreedCompatible(scopes, targetBreeds);
  });
}

// #问题主题推断
function inferQuestionTopics(input: KnowledgeAgentInput): KnowledgeTopicScope[] {
  return inferTopicScopesFromText(input.question);
}

// #问题主题域推断
function inferQuestionTopicDomains(
  input: KnowledgeAgentInput,
  topicScopes: KnowledgeTopicScope[],
): KnowledgeTopicDomainScope[] {
  const merged = input.question;
  return filterTopicDomainsBySpecies(
    normalizeScopeList([
      ...inferTopicDomainScopesFromText(merged),
      ...inferTopicDomainScopesFromTopics(topicScopes),
    ]),
    input.petProfile?.species,
  );
}

// #模型JSON结果解析（彻底失败返回 null，调用方走保守拒答，绝不默认"可回答"）
function parseOutput(raw: string): Partial<KnowledgeAgentOutput> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {}
    }
  }
  return null;
}

// #无证据场景保守回复
function buildRefusal(
  riskLevel: KnowledgeAgentOutput['riskLevel'],
  riskTags: KnowledgeAgentOutput['riskTags'],
  refusalReason: string,
): KnowledgeAgentOutput {
  const highRisk = riskLevel === 'high';
  const warningLine = highRisk ? '⚠️线上建议不能替代面诊！' : '';
  // 高风险且无证据时绝不给任何具体处置建议（此前硬编码的"补水观察"对尿闭/中毒等急症是危险指引），
  // 只做就医引导——具体处置必须由面诊兽医判断。
  const answer = highRisk
    ? `这个问题涉及健康风险，当前证据不足，我不能给出居家处置建议。请尽快联系兽医或就近的宠物医院面诊，并把症状开始的时间、频率和宠物的精神食欲状况告诉医生。\n\n${warningLine}`
    : '当前证据不足，暂不建议给出明确结论。';
  return {
    canAnswer: false,
    answer,
    summary: highRisk ? '当前证据不足，但这是高风险问题，建议尽快联系兽医。' : '当前证据不足，暂不建议给出明确结论。',
    evidence: [],
    confidence: 'low',
    riskLevel,
    riskTags,
    needsVet: highRisk,
    needsHumanHandoff: highRisk,
    followUpQuestions: [],
    refusalReason,
  };
}
