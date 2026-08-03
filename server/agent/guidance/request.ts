// #明确商品诉求解析
export function inferExplicitProductRequestTerms(text: string): string[] {
  if (!text) return [];
  const patterns = [
    /(?:推荐|想买|要买|找|选购|想要|需要)\s*(?:一?(?:款|个|种|盒|袋|包))?\s*([\u4e00-\u9fa5A-Za-z0-9]{2,16})/gu,
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
};

// 大类词不参与商品文本精确匹配，由搜索工具转成 category 过滤。
export function getBroadProductCategory(term?: string): string | null {
  return term ? BROAD_PRODUCT_CATEGORY_ALIASES[term.trim().toLowerCase()] || null : null;
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
function normalizeProductTerm(value?: string): string | null {
  const normalized = value?.trim().replace(/^(?:宠物|狗狗|猫咪|狗|猫)/u, '') || '';
  if (normalized.length < 2) return null;
  return normalized;
}
