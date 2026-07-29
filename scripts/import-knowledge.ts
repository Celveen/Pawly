import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import { deepseekChat } from '../server/deepseek';
import { getAutoPublishDecision, getSourcePolicy, type OpenLicenseType } from '../server/agent/knowledge/sourceRegistry';
import { inferSpeciesScopesFromText } from '../server/agent/knowledge/taxonomy';

type ArticleCategory = 'nutri' | 'train' | 'health' | 'groom' | 'breed' | 'puppy';
type SpeciesScope = 'dog' | 'cat' | 'rabbit' | 'bird' | 'hamster' | 'guinea_pig' | 'aquatic' | 'reptile' | 'mini_pig';
type GeneratedDraft = { cat: string; species?: string[]; title: string; excerpt: string; body: string[]; confidence: number; risk: string };
type ImportSource = { url: string; sourceId?: string; expectedSpecies?: SpeciesScope[]; expectedCategories?: ArticleCategory[]; licenseType?: OpenLicenseType; licenseUrl?: string; author?: string };
type ImportedArticle = {
  id: string;
  cat: ArticleCategory;
  species?: string[];
  emoji: string;
  bg: string;
  title: string;
  excerpt: string;
  read: string;
  author: string;
  date: string;
  body: string[];
  refs: Array<{ org: string; title: string; url: string }>;
  sourceUrl: string;
  importedAt: string;
  sourceContentHash: string;
  sourceLicense?: { type: OpenLicenseType; url: string; author?: string; changes: string };
};
type ImportLog = {
  url: string;
  checkedAt: string;
  status: 'published' | 'hold' | 'blocked' | 'error';
  reason: string;
  sourcePolicyStatus?: string;
  sourceOrg?: string;
  articleId?: string;
  title?: string;
};

const root = process.cwd();
loadEnvConfig(root);
const sourceFile = path.join(root, 'content/knowledge-sources.json');
const articleFile = path.join(root, 'content/auto-articles.json');
const logFile = path.join(root, 'content/knowledge-import-log.json');

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function pageTitle(html: string, url: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripHtml(match?.[1] || '') || new URL(url).hostname;
}

function detectOpenLicense(html: string): OpenLicenseType | null {
  const normalized = html.toLowerCase().replace(/\s+/g, ' ');
  if (normalized.includes('creativecommons.org/publicdomain/zero/1.0') || normalized.includes('cc0 1.0')) return 'CC0-1.0';
  if (normalized.includes('creativecommons.org/licenses/by/4.0') || normalized.includes('cc by 4.0')) return 'CC-BY-4.0';
  return null;
}

function normalizeArticleCategory(value: unknown): ArticleCategory | null {
  const normalized = String(value || '').trim().toLowerCase();
  const aliases: Record<string, ArticleCategory> = {
    nutri: 'nutri', nutrition: 'nutri', '饮食': 'nutri', '营养': 'nutri',
    train: 'train', behavior: 'train', behaviour: 'train', '训练': 'train', '行为': 'train',
    health: 'health', '健康': 'health', '疾病': 'health',
    groom: 'groom', grooming: 'groom', '护理': 'groom', '美容': 'groom',
    breed: 'breed', '品种': 'breed',
    puppy: 'puppy', '幼宠': 'puppy', '幼年': 'puppy',
  };
  if (aliases[normalized]) return aliases[normalized];
  for (const part of normalized.split(/[|/,，、&]+/).map((item) => item.trim())) {
    if (aliases[part]) return aliases[part];
  }
  return null;
}

function parseModelJson(raw: string) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('模型未返回完整 JSON');
  return JSON.parse(raw.slice(start, end + 1));
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; } catch { return fallback; }
}

async function fetchSource(url: string) {
  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Pawly-KnowledgeImporter/1.0 (+source-attribution)' } });
      if (!response.ok) throw new Error(`来源返回 HTTP ${response.status}`);
      const html = await response.text();
      const text = stripHtml(html);
      if (text.length < 300) throw new Error('正文过短，未提取到可靠内容');
      return { title: pageTitle(html, url), text: text.slice(0, 16_000), licenseType: detectOpenLicense(html) };
    } catch (error: any) {
      lastError = error?.message || String(error);
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(lastError || '来源抓取失败');
}

async function summarize(sourceUrl: string, sourceTitle: string, sourceText: string, sourceContentHash: string, source: ImportSource): Promise<ImportedArticle> {
  const expectedSpecies = source.expectedSpecies || [];
  const expectedCategories = source.expectedCategories || [];
  const prompt = `你是 Pawly 的宠物科普编辑自动化器。请基于下面的真实来源，写一篇完全用中文独立表达的短科普，不复制原文句子，不逐句翻译，不复用原文段落结构。只保留可验证的养宠知识；不要给药物剂量、诊断结论或替代兽医的治疗方案。必须输出严格 JSON，不要 Markdown。
来源预设物种范围：${expectedSpecies.join(', ') || '请根据来源内容判断'}
来源预设文章分类：${expectedCategories.join(', ') || '请根据来源内容判断'}
{
  "cat": "nutri|train|health|groom|breed|puppy",
  "species": ["dog|cat|rabbit|bird|hamster|guinea_pig|aquatic|reptile|mini_pig"],
  "title": "中文标题",
  "excerpt": "不超过60字摘要",
  "body": ["3到4段，每段60到120字"],
  "confidence": 0.0,
  "risk": "low|medium|high"
}

来源标题：${sourceTitle}
来源 URL：${sourceUrl}
来源正文：${sourceText}`;

  let draft: GeneratedDraft | null = null;
  let normalizedCategory: ArticleCategory | null = null;
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await deepseekChat({
        messages: [{ role: 'user', content: `${prompt}\n第 ${attempt} 次生成：字段必须完整；cat 只填一个标签。` }],
        temperature: 0,
        max_tokens: 1600,
      });
      const raw = String(result?.choices?.[0]?.message?.content || '').replace(/^```json\s*|\s*```$/g, '').trim();
      const candidate = parseModelJson(raw) as GeneratedDraft;
      const category = normalizeArticleCategory(candidate?.cat) || expectedCategories[0] || null;
      if (!category) throw new Error(`模型返回了无效科普分类：${candidate?.cat || '(空)'}`);
      if (!candidate?.title || !candidate.excerpt || !Array.isArray(candidate.body) || candidate.body.length < 3) throw new Error('模型返回内容不完整');
      draft = candidate;
      normalizedCategory = category;
      break;
    } catch (error: any) {
      lastError = error?.message || String(error);
    }
  }
  if (!draft || !normalizedCategory) throw new Error(lastError || '模型未返回可用科普内容');
  if (!draft.title || !draft.excerpt || !Array.isArray(draft.body) || draft.body.length < 3) throw new Error('模型返回内容不完整');
  const allowedSpecies = ['dog', 'cat', 'rabbit', 'bird', 'hamster', 'guinea_pig', 'aquatic', 'reptile', 'mini_pig'];
  const normalizedSpecies = Array.isArray(draft.species) ? draft.species.filter((item) => allowedSpecies.includes(item)) : [];
  const articleSpecies = normalizedSpecies.length ? normalizedSpecies : expectedSpecies;
  if (!articleSpecies.length) throw new Error('模型返回了无效物种分类');
  if (expectedSpecies.length && normalizedSpecies.length && !normalizedSpecies.some((item) => expectedSpecies.includes(item as SpeciesScope))) throw new Error(`文章物种与预设范围不匹配：${normalizedSpecies.join(', ')}`);
  if (expectedCategories.length && !expectedCategories.includes(normalizedCategory)) throw new Error(`文章分类与预设范围不匹配：${normalizedCategory}`);
  if (draft.body.some((paragraph) => typeof paragraph !== 'string' || paragraph.trim().length < 40 || paragraph.trim().length > 500)) throw new Error('正文段落长度不符合质量门槛');
  const draftText = `${draft.title} ${draft.excerpt} ${draft.body.join(' ')}`;
  if (/(\d+(?:\.\d+)?\s*(?:mg|毫克|克|片|滴)\s*\/?\s*(?:kg|公斤|天|次)?)/i.test(draftText) || /用药剂量|药物剂量|计算用药|治疗方案|自行诊断|抗生素监测/i.test(draftText)) throw new Error('内容包含具体用药、诊断或治疗表述');
  if (draft.risk !== 'low') throw new Error(`内容未达到自动发布门槛 risk=${draft.risk}`);

  const hash = crypto.createHash('sha256').update(sourceUrl).digest('hex').slice(0, 10);
  return {
    id: `auto-${hash}`,
    cat: normalizedCategory,
    species: articleSpecies,
    emoji: '📚',
    bg: '#DCE5D4',
    title: draft.title,
    excerpt: draft.excerpt,
    read: '5 分钟',
    author: 'Pawly 自动科普整理',
    date: new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }),
    body: draft.body,
    refs: [{ org: getSourcePolicy(sourceUrl)?.org || '来源机构', title: sourceTitle, url: sourceUrl }],
    sourceUrl,
    importedAt: new Date().toISOString(),
    sourceContentHash,
    sourceLicense: source.licenseType && source.licenseUrl
      ? { type: source.licenseType, url: source.licenseUrl, author: source.author, changes: 'Pawly 独立中文改写，未转载原文全文。' }
      : undefined,
  };
}

async function verifyArticle(article: ImportedArticle, sourceTitle: string, sourceText: string): Promise<void> {
  const prompt = `你是 Pawly 的独立质量校验器。请检查下面的自动生成科普是否被来源内容支持、物种和板块是否合理、是否存在未经来源支持的新增事实、诊断结论、治疗方案、具体剂量或危险操作。只输出严格 JSON，不要 Markdown：
{
  "supported": true,
  "classificationMatch": true,
  "unsupportedClaims": 0,
  "risk": "low|medium|high",
  "confidence": 0.0,
  "reason": "简短原因"
}

来源标题：${sourceTitle}
来源内容：${sourceText}
待校验文章：${JSON.stringify({ cat: article.cat, species: article.species, title: article.title, excerpt: article.excerpt, body: article.body })}`;
  const result = await deepseekChat({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 700,
  });
  const raw = String(result?.choices?.[0]?.message?.content || '').replace(/^```json\s*|\s*```$/g, '').trim();
  const review = JSON.parse(raw) as { supported: boolean; classificationMatch: boolean; unsupportedClaims: number; risk: string; confidence: number; reason?: string };
  if (!review.supported || !review.classificationMatch || Number(review.unsupportedClaims) > 0 || review.risk !== 'low' || Number(review.confidence) < 0.9) {
    throw new Error(`独立质量校验未通过：${review.reason || '来源支持度、分类或风险未达门槛'}`);
  }
}

async function main() {
  const manifest = await readJson<ImportSource[]>(sourceFile, []);
  const logs = await readJson<ImportLog[]>(logFile, []);
  const urls: ImportSource[] = process.argv.slice(2).filter((arg) => arg.startsWith('http')).map((url) => ({ url }));
  const sources = [...manifest, ...urls];
  if (!sources.length) {
    console.log('没有待导入来源。请把 URL 写入 content/knowledge-sources.json，或作为命令行参数传入。');
    await fs.writeFile(logFile, `${JSON.stringify(logs, null, 2)}\n`);
    return;
  }

  const current = await readJson<ImportedArticle[]>(articleFile, []);
  const next = [...current];
  const appendLog = (entry: Omit<ImportLog, 'checkedAt'>) => logs.push({ ...entry, checkedAt: new Date().toISOString() });
  for (const item of sources) {
    const policy = getSourcePolicy(item.url);
    if (!policy) {
      const reason = '来源域名或路径未进入白名单';
      console.error(`[BLOCKED] ${item.url}: ${reason}`);
      appendLog({ url: item.url, status: 'blocked', reason });
      continue;
    }
    if (item.sourceId && item.sourceId !== policy.id) {
      const reason = `sourceId ${item.sourceId} 与白名单来源 ${policy.id} 不匹配`;
      console.error(`[BLOCKED] ${item.url}: ${reason}`);
      appendLog({ url: item.url, status: 'blocked', reason, sourcePolicyStatus: policy.status, sourceOrg: policy.org });
      continue;
    }
    if (!item.licenseType || !item.licenseUrl || !/^https:\/\//i.test(item.licenseUrl) || !['CC0-1.0', 'CC-BY-4.0'].includes(item.licenseType)) {
      const reason = '自动发布来源必须声明逐篇 CC0-1.0 或 CC-BY-4.0 许可证及 HTTPS 许可证链接';
      console.error(`[HOLD] ${item.url}: ${reason}`);
      appendLog({ url: item.url, status: 'hold', reason, sourcePolicyStatus: policy.status, sourceOrg: policy.org });
      continue;
    }
    const validSpecies = ['dog', 'cat', 'rabbit', 'bird', 'hamster', 'guinea_pig', 'aquatic', 'reptile', 'mini_pig'];
    const validCategories = ['nutri', 'train', 'health', 'groom', 'breed', 'puppy'];
    if (item.expectedSpecies?.some((value) => !validSpecies.includes(value)) || item.expectedCategories?.some((value) => !validCategories.includes(value))) {
      const reason = '来源清单中的物种或文章分类字段无效';
      console.error(`[BLOCKED] ${item.url}: ${reason}`);
      appendLog({ url: item.url, status: 'blocked', reason, sourcePolicyStatus: policy.status, sourceOrg: policy.org });
      continue;
    }
    if (!item.expectedSpecies?.length || !item.expectedCategories?.length) {
      const reason = '自动发布来源必须声明 expectedSpecies 和 expectedCategories';
      console.error(`[HOLD] ${item.url}: ${reason}`);
      appendLog({ url: item.url, status: 'hold', reason, sourcePolicyStatus: policy.status, sourceOrg: policy.org });
      continue;
    }
    try {
      const page = await fetchSource(item.url);
      const decision = getAutoPublishDecision(item.url, { type: item.licenseType, url: item.licenseUrl, verifiedAt: new Date().toISOString().slice(0, 10), detectedType: page.licenseType });
      if (!decision.allowed) {
        const reason = page.licenseType ? decision.reasons.join('；') : '原文页面未检测到声明的 CC0 或 CC BY 4.0 许可证';
        console.error(`[HOLD] ${item.url}: ${reason}`);
        appendLog({ url: item.url, status: 'hold', reason, sourcePolicyStatus: policy.status, sourceOrg: policy.org });
        continue;
      }
      const sourceContentHash = crypto.createHash('sha256').update(page.text).digest('hex');
      const duplicate = next.find((old) => old.sourceContentHash === sourceContentHash && old.sourceUrl !== item.url);
      if (duplicate) throw new Error(`与已有文章 ${duplicate.id} 的来源正文重复`);
      const inferredSpecies = inferSpeciesScopesFromText(`${page.title} ${page.text}`);
      if (item.expectedSpecies?.length && inferredSpecies.length && !item.expectedSpecies.some((value) => inferredSpecies.includes(value))) {
        throw new Error(`来源正文与预设物种不匹配：检测到 ${inferredSpecies.join(', ')}`);
      }
      const article = await summarize(item.url, page.title, page.text, sourceContentHash, item);
      await verifyArticle(article, page.title, page.text);
      const duplicateTitle = next.find((old) => old.title.trim() === article.title.trim() && old.sourceUrl !== article.sourceUrl);
      if (duplicateTitle) throw new Error(`与已有文章 ${duplicateTitle.id} 的标题重复`);
      const index = next.findIndex((old) => old.sourceUrl === article.sourceUrl);
      if (index >= 0) next[index] = article; else next.push(article);
      console.log(`[PUBLISHED] ${article.title} <- ${item.url}`);
      appendLog({ url: item.url, status: 'published', reason: '通过来源授权和文章质量门槛', sourcePolicyStatus: policy.status, sourceOrg: policy.org, articleId: article.id, title: article.title });
    } catch (error: any) {
      const reason = error?.message || String(error);
      console.error(`[HOLD] ${item.url}: ${reason}`);
      appendLog({ url: item.url, status: 'error', reason, sourcePolicyStatus: policy.status, sourceOrg: policy.org });
    }
  }
  await fs.writeFile(articleFile, `${JSON.stringify(next, null, 2)}\n`);
  await fs.writeFile(logFile, `${JSON.stringify(logs, null, 2)}\n`);
}

main().catch((error) => { console.error(error); process.exit(1); });
