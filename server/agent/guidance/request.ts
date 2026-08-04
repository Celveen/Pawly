// #明确商品诉求解析
// 动词按"长的排前面"列出，避免「想买」被「想」抢先匹配；允许连用两个动词（需要买 / 帮我挑）。
const REQUEST_VERBS = '(?:推荐|想买|要买|购买|选购|想要|需要|入手|想|要|找|挑(?!食|嘴)|买)';
const REQUEST_QUANTIFIERS = '(?:一?(?:款|个|种|盒|袋|包|瓶|支|条))?';

export function inferExplicitProductRequestTerms(text: string): string[] {
  if (!text) return [];
  const patterns = [
    new RegExp(`${REQUEST_VERBS}\\s*${REQUEST_VERBS}?\\s*${REQUEST_QUANTIFIERS}\\s*([\\u4e00-\\u9fa5A-Za-z0-9]{2,16})`, 'gu'),
    /(?:有没有|有无)\s*([\u4e00-\u9fa5A-Za-z0-9]{2,16})/gu,
  ];
  const terms = new Set<string>();

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const term = normalizeProductTerm(match[1]);
      if (term) terms.add(term);
    }
  }

  return Array.from(terms);
}

// 当前商品库先按大类召回，后续补齐细分类目后再收紧。
const BROAD_PRODUCT_CATEGORY_ALIASES: Record<string, string> = {
  '主粮': 'food', '主食': 'food', '鲜粮': 'food', '狗粮': 'food', '犬粮': 'food',
  '幼犬粮': 'food', '猫粮': 'food', '幼猫粮': 'food', '兔粮': 'food',
  '仓鼠粮': 'food', '鸟粮': 'food', '豚鼠粮': 'food', '龟粮': 'food',
  '口粮': 'food', '粮': 'food',
};

// 别名按长度倒序，优先匹配更具体的词（幼猫粮 先于 猫粮 先于 粮）。
const BROAD_ALIAS_KEYS = Object.keys(BROAD_PRODUCT_CATEGORY_ALIASES).sort((a, b) => b.length - a.length);

// 大类词不参与商品文本精确匹配，由搜索工具转成 category 过滤。
// 既接受整词（"主粮"），也接受包含（"粮推荐"、"猫粮罐头"、整句问题），
// 因为抽词结果常带上下文噪声，严格整词匹配会让大类召回大量落空。
export function getBroadProductCategory(term?: string): string | null {
  const value = term?.trim().toLowerCase();
  if (!value) return null;
  if (BROAD_PRODUCT_CATEGORY_ALIASES[value]) return BROAD_PRODUCT_CATEGORY_ALIASES[value];
  const hit = BROAD_ALIAS_KEYS.find((key) => value.includes(key));
  return hit ? BROAD_PRODUCT_CATEGORY_ALIASES[hit] : null;
}

// #商品候选匹配判断
export function matchesExplicitProductTerms(
  product: { name?: string; sub?: string; badges?: string[]; cat?: string },
  terms: readonly string[],
): boolean {
  if (!terms.length) return true;
  const productText = `${product.name || ''} ${product.sub || ''} ${(product.badges || []).join(' ')}`.toLowerCase();
  return terms.every((term) => {
    const broadCategory = getBroadProductCategory(term);
    return broadCategory ? product.cat === broadCategory : productText.includes(term.toLowerCase());
  });
}

// #商品词规范化
// 抽词常把问句尾巴一起带进来（"食有什么办法"），这类碎片匹配不到任何商品，
// 会让"明确要某商品但没有"的判断误触发。在停用词处截断，截完过短就整词丢弃。
const TERM_STOP_PATTERN = /(?:什么|怎么|怎样|如何|哪些|哪个|哪款|为什么|办法|推荐|可以|吗|呢)/u;

function normalizeProductTerm(value?: string): string | null {
  const raw = (value?.trim() || '').split(TERM_STOP_PATTERN)[0].trim();
  if (!raw) return null;
  // 剥掉"给狗狗买的…"这类物种前缀；但剥完过短就保留原词，
  // 否则「狗粮」会被削成「粮」而丢弃，导致大类召回完全不触发。
  const stripped = raw.replace(/^(?:宠物|狗狗|猫咪|狗|猫)/u, '');
  const normalized = stripped.length >= 2 ? stripped : raw;
  if (normalized.length < 2) return null;
  return normalized;
}
