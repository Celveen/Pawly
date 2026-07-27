import { ARTICLES } from '../components/data';
import { validateSourceReference } from '../server/agent/knowledge/sourceRegistry';

let failed = 0;
let checked = 0;
let warnings = 0;
const ids = new Set<string>();
const titles = new Set<string>();
const categories = new Set(['nutri', 'train', 'health', 'groom', 'breed', 'puppy']);
const species = new Set(['dog', 'cat', 'rabbit', 'bird', 'hamster', 'guinea_pig', 'aquatic', 'reptile', 'mini_pig']);

function fail(article: any, message: string) {
  console.error(`[FAIL] ${article.id || '(无ID)'} ${article.title || '(无标题)'}: ${message}`);
  failed += 1;
}

function warn(article: any, message: string) {
  console.warn(`[WARN] ${article.id || '(无ID)'} ${article.title || '(无标题)'}: ${message}`);
  warnings += 1;
}

for (const article of ARTICLES as any[]) {
  if (!article.id || ids.has(article.id)) fail(article, '缺少或重复文章 ID');
  if (article.id) ids.add(article.id);
  if (!article.title || titles.has(article.title.trim())) fail(article, '缺少或重复文章标题');
  if (article.title) titles.add(article.title.trim());
  const isAuto = typeof article.id === 'string' && article.id.startsWith('auto-');
  if (!categories.has(article.cat)) fail(article, `无效科普分类 ${article.cat || '(空)'}`);
  if (!Array.isArray(article.body) || article.body.length < 3) {
    (isAuto ? fail : warn)(article, '正文至少需要 3 段');
  }
  if (Array.isArray(article.body)) {
    const hasShortParagraph = article.body.some((paragraph: unknown) => typeof paragraph !== 'string' || paragraph.trim().length < 30);
    if (hasShortParagraph) (isAuto ? fail : warn)(article, '存在过短或无效正文段落');
  }
  if (article.species !== undefined) {
    if (!Array.isArray(article.species) || article.species.length < 1 || article.species.some((item: string) => !species.has(item))) {
      fail(article, '物种分类缺失或不在物种词典中');
    }
  }
  const text = `${article.title || ''} ${article.excerpt || ''} ${(article.body || []).join(' ')}`;
  if (/(\d+(?:\.\d+)?\s*(?:mg|毫克|克|片|滴)\s*\/?\s*(?:kg|公斤|天|次)?)/i.test(text)) warn(article, '包含具体剂量表达，需人工复核');
  if (article.sourceUrl && !/^https:\/\//i.test(article.sourceUrl)) fail(article, 'sourceUrl 必须使用 HTTPS');
  if (!article.refs?.length) {
    fail(article, '没有参考来源');
    continue;
  }
  const refUrls = new Set<string>();
  for (const ref of article.refs) {
    checked += 1;
    const result = validateSourceReference(ref);
    if (!result.valid) {
      fail(article, result.errors.join('；'));
    }
    if (ref.url && refUrls.has(ref.url)) warn(article, `重复来源链接 ${ref.url}`);
    if (ref.url) refUrls.add(ref.url);
  }
}

console.log(`Checked ${ARTICLES.length} articles and ${checked} source references; ${failed} failed, ${warnings} warnings.`);
if (failed > 0) process.exit(1);
