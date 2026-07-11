import {
  getGuidanceCategoriesForSpecies,
  getSpeciesCategory,
  normalizeScopeList,
  normalizeSpeciesScope,
  resolveBreedContext,
} from '../knowledge/taxonomy';
import type { GuidanceProductCandidate, GuidanceRankingInput } from './types';

// #导购策略上下文
export interface GuidancePolicyContext {
  targetSpecies: string | null;
  targetSpeciesCategory: string | null;
  targetBreedScopes: string[];
  breedMatchMode: 'matched_breed' | 'fallback_species' | 'unknown';
  requestedCategories: string[];
  supportedCategories: string[];
  queryText: string;
  productText: string;
  badges: string[];
  notes: string;
}

// #导购单项策略结果
export interface GuidancePolicyEffect {
  scoreDelta: number;
  reasonTags?: string[];
  cautionTags?: string[];
}

// #导购策略规则
type GuidancePolicyRule = {
  id: string;
  apply: (product: GuidanceProductCandidate, input: GuidanceRankingInput, ctx: GuidancePolicyContext) => GuidancePolicyEffect | null;
};

// #导购类目别名配置
const GUIDANCE_CATEGORY_ALIAS_REGISTRY = {
  '主粮': ['主粮', '粮', '猫粮', '狗粮', '兔粮', '鸟粮', '仓鼠粮', '龟粮', 'food'],
  '零食': ['零食', '冻干', '罐头', '磨牙', 'snack'],
  '保健': ['保健', '营养', '营养补充', 'health'],
  '洗护': ['洗护', '洗澡', '护理', '香波', 'wash'],
  '玩具': ['玩具', '逗猫棒', '磨牙玩具', 'toy'],
  '外出': ['外出', '牵引', '航空箱', '背包', 'out'],
  '家居': ['家居', '窝', '垫子', '猫砂', '厕所', '笼', 'house', 'home'],
  '猫砂': ['猫砂'],
  '垫料': ['垫料', '木屑', '纸棉'],
  '环境': ['环境', '加热', '灯', '造景'],
} as const;

// #导购策略中心
const GUIDANCE_POLICY_CENTER: Record<string, GuidancePolicyRule[]> = {
  generic: [
    {
      id: 'stock',
      apply: (product) => product.inStock
        ? { scoreDelta: 3, reasonTags: ['有库存'] }
        : { scoreDelta: 0, cautionTags: ['可能缺货'] },
    },
    {
      id: 'budget',
      apply: (product, input) => {
        if (typeof input.maxPrice !== 'number' || typeof product.price !== 'number') return null;
        if (product.price <= input.maxPrice) return { scoreDelta: 2, reasonTags: ['符合预算'] };
        return { scoreDelta: -1, cautionTags: ['超出预算'] };
      },
    },
    {
      id: 'rating',
      apply: (product) => typeof product.rating === 'number'
        ? { scoreDelta: Math.min(product.rating, 5) * 0.2 }
        : null,
    },
    {
      id: 'query_keyword',
      apply: (_, __, ctx) => ctx.queryText && ctx.productText.includes(ctx.queryText)
        ? { scoreDelta: 2, reasonTags: ['命中当前需求词'] }
        : null,
    },
    {
      id: 'requested_category',
      apply: (_, input, ctx) => {
        if (!ctx.requestedCategories.length) return null;
        const hitCount = ctx.requestedCategories.filter((category) => containsCategoryAlias(ctx.productText, category)).length;
        if (!hitCount) return null;
        return {
          scoreDelta: hitCount * 1.5,
          reasonTags: ['命中目标品类标签'],
        };
      },
    },
    {
      id: 'species_match',
      apply: (product, _, ctx) => {
        const productSpecies = normalizeSpeciesScope(product.pet);
        if (!ctx.targetSpecies || !productSpecies || productSpecies !== ctx.targetSpecies) return null;
        return { scoreDelta: 3, reasonTags: [`适配${ctx.targetSpecies}`] };
      },
    },
    {
      id: 'order_history_species',
      apply: (product, input) => {
        if (!(input.orderHistory?.purchasedSpecies || []).includes(product.pet || '')) return null;
        return { scoreDelta: 1, reasonTags: ['和历史购买物种一致'] };
      },
    },
  ],
  mammal: [
    {
      id: 'sensitive_digestive',
      apply: (_, __, ctx) => /肠胃|敏感|玻璃胃/u.test(ctx.notes) && /低敏|易消化|温和/u.test(ctx.productText)
        ? { scoreDelta: 2, reasonTags: ['更贴合敏感体质'] }
        : null,
    },
    {
      id: 'senior_support',
      apply: (_, input, ctx) => typeof input.petProfile?.ageMonths === 'number'
        && input.petProfile.ageMonths >= 84
        && /老年|关节|呵护/u.test(ctx.productText)
        ? { scoreDelta: 1.5, reasonTags: ['更贴合高龄阶段'] }
        : null,
    },
  ],
  bird: [
    {
      id: 'bird_habitat_or_feed',
      apply: (_, __, ctx) => (
        containsCategoryAlias(ctx.productText, '主粮') || containsCategoryAlias(ctx.productText, '环境')
      )
        ? { scoreDelta: 1, reasonTags: ['更贴合鸟类常见用品方向'] }
        : null,
    },
  ],
  reptile: [
    {
      id: 'reptile_environment',
      apply: (_, __, ctx) => containsCategoryAlias(ctx.productText, '环境')
        ? { scoreDelta: 1.5, reasonTags: ['更贴合爬宠环境需求'] }
        : null,
    },
  ],
};

// #导购策略上下文构建
export function buildGuidancePolicyContext(
  input: GuidanceRankingInput,
  product: GuidanceProductCandidate,
): GuidancePolicyContext {
  const targetSpecies = normalizeSpeciesScope(input.petProfile?.species);
  const breedResolution = resolveBreedContext(input.petProfile?.breed, input.petProfile?.species);
  const targetSpeciesCategory = getSpeciesCategory(targetSpecies);
  const requestedCategories = inferRequestedGuidanceCategories(input);
  const supportedCategories = getGuidanceCategoriesForSpecies(targetSpecies);
  const badges = product.badges || [];

  return {
    targetSpecies,
    targetSpeciesCategory,
    targetBreedScopes: breedResolution.matchedBreedScopes,
    breedMatchMode: breedResolution.matchMode,
    requestedCategories,
    supportedCategories,
    queryText: input.query.trim(),
    productText: `${product.name} ${product.sub || ''} ${badges.join(' ')}`.trim(),
    badges,
    notes: input.petProfile?.notes || '',
  };
}

// #导购策略执行
export function applyGuidancePolicies(
  product: GuidanceProductCandidate,
  input: GuidanceRankingInput,
): GuidancePolicyEffect & {
  appliedPolicyId: string;
  requestedCategories: string[];
  supportedCategories: string[];
  targetSpecies: string | null;
  targetBreedScopes: string[];
  breedMatchMode: 'matched_breed' | 'fallback_species' | 'unknown';
} {
  const ctx = buildGuidancePolicyContext(input, product);
  const policyId = ctx.targetSpeciesCategory || 'generic';
  const rules = [
    ...GUIDANCE_POLICY_CENTER.generic,
    ...(GUIDANCE_POLICY_CENTER[policyId] || []),
  ];

  let scoreDelta = 0;
  const reasonTags: string[] = [];
  const cautionTags: string[] = [];

  if (ctx.breedMatchMode !== 'matched_breed' && ctx.targetSpecies) {
    cautionTags.push('当前未稳定命中具体品种，导购理由仅按物种层成立');
  }

  if (ctx.requestedCategories.length && ctx.supportedCategories.length) {
    const unsupportedCategories = ctx.requestedCategories.filter((category) => !ctx.supportedCategories.includes(category));
    if (unsupportedCategories.length) {
      cautionTags.push(`当前物种未显式配置这些导购类目：${unsupportedCategories.join('、')}`);
    }
  }

  for (const rule of rules) {
    const effect = rule.apply(product, input, ctx);
    if (!effect) continue;
    scoreDelta += effect.scoreDelta;
    if (effect.reasonTags?.length) reasonTags.push(...effect.reasonTags);
    if (effect.cautionTags?.length) cautionTags.push(...effect.cautionTags);
  }

  return {
    scoreDelta,
    reasonTags: Array.from(new Set(reasonTags)),
    cautionTags: Array.from(new Set(cautionTags)),
    appliedPolicyId: policyId,
    requestedCategories: ctx.requestedCategories,
    supportedCategories: ctx.supportedCategories,
    targetSpecies: ctx.targetSpecies,
    targetBreedScopes: ctx.targetBreedScopes,
    breedMatchMode: ctx.breedMatchMode,
  };
}

// #导购请求类目推断
export function inferRequestedGuidanceCategories(input: GuidanceRankingInput): string[] {
  const merged = `${input.category || ''} ${input.query} ${input.petProfile?.notes || ''}`.trim();
  const found: string[] = [];

  for (const category of Object.keys(GUIDANCE_CATEGORY_ALIAS_REGISTRY)) {
    if (containsCategoryAlias(merged, category)) found.push(category);
  }

  return normalizeScopeList(found);
}

// #类目别名命中判断
function containsCategoryAlias(text: string, category: string): boolean {
  const normalized = text.toLowerCase();
  const aliases = GUIDANCE_CATEGORY_ALIAS_REGISTRY[category as keyof typeof GUIDANCE_CATEGORY_ALIAS_REGISTRY] || [];
  return aliases.some((alias) => normalized.includes(alias.toLowerCase()));
}
