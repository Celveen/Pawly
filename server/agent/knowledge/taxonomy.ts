import type { KnowledgeRiskTag, KnowledgeSpeciesScope, KnowledgeTopicDomainScope, KnowledgeTopicScope } from './types';

// #物种注册项结构
type SpeciesRegistryItem = {
  scope: KnowledgeSpeciesScope;
  category: 'mammal' | 'bird' | 'reptile' | 'aquatic' | 'other';
  aliases: string[];
  breedAliases: Array<{ scope: string; aliases: string[] }>;
  supportedTopicDomains: KnowledgeTopicDomainScope[];
  guidanceCategories: string[];
  profileEnabled: boolean;
};

// #品种解析结果
export type BreedResolution = {
  rawBreed: string | null;
  matchedBreedScopes: string[];
  matchedSpeciesScope: string | null;
  fallbackSpeciesScope: string | null;
  matchMode: 'matched_breed' | 'fallback_species' | 'unknown';
};

// #物种注册表
const SPECIES_REGISTRY: SpeciesRegistryItem[] = [
  {
    scope: 'dog',
    category: 'mammal',
    aliases: ['狗', '犬', '狗狗', '幼犬'],
    breedAliases: [
      { scope: '泰迪', aliases: ['泰迪', '贵宾', '玩具贵宾'] },
      { scope: '边牧', aliases: ['边牧', '边境牧羊犬'] },
      { scope: '金毛', aliases: ['金毛', '金毛寻回犬'] },
      { scope: '拉布拉多', aliases: ['拉布拉多', '拉布拉多犬'] },
      { scope: '柴犬', aliases: ['柴犬'] },
      { scope: '比熊', aliases: ['比熊', '比熊犬'] },
      { scope: '博美', aliases: ['博美', '博美犬'] },
      { scope: '萨摩耶', aliases: ['萨摩耶'] },
      { scope: '法斗', aliases: ['法斗', '法国斗牛犬'] },
      { scope: '约克夏', aliases: ['约克夏'] },
      { scope: '柯基', aliases: ['柯基'] },
      { scope: '垂耳犬', aliases: ['垂耳犬'] },
    ],
    supportedTopicDomains: ['digestive', 'urinary', 'respiratory', 'skin', 'eye', 'oral', 'ear', 'behavior', 'nutrition', 'senior_care', 'preventive_care'],
    guidanceCategories: ['主粮', '零食', '保健', '洗护', '玩具', '外出', '家居'],
    profileEnabled: true,
  },
  {
    scope: 'cat',
    category: 'mammal',
    aliases: ['猫', '猫咪', '幼猫'],
    breedAliases: [
      { scope: '布偶', aliases: ['布偶'] },
      { scope: '美短', aliases: ['美短', '美国短毛猫'] },
      { scope: '英短', aliases: ['英短', '英国短毛猫', '蓝猫'] },
      { scope: '暹罗', aliases: ['暹罗', '暹罗猫'] },
      { scope: '缅因', aliases: ['缅因', '缅因猫'] },
      { scope: '德文卷毛猫', aliases: ['德文', '德文卷毛猫'] },
      { scope: '奶牛猫', aliases: ['奶牛猫', '黑白猫'] },
    ],
    supportedTopicDomains: ['digestive', 'urinary', 'respiratory', 'skin', 'eye', 'oral', 'ear', 'behavior', 'nutrition', 'senior_care', 'preventive_care'],
    guidanceCategories: ['主粮', '零食', '保健', '猫砂', '洗护', '玩具', '家居'],
    profileEnabled: true,
  },
  // {
  //   scope: 'rabbit',
  //   category: 'mammal',
  //   aliases: ['兔', '兔子', '垂耳兔', '侏儒兔'],
  //   breedAliases: [
  //     { scope: '垂耳兔', aliases: ['垂耳兔'] },
  //     { scope: '侏儒兔', aliases: ['侏儒兔'] },
  //   ],
  //   supportedTopicDomains: ['digestive', 'urinary', 'respiratory', 'eye', 'oral', 'behavior', 'nutrition', 'preventive_care'],
  //   guidanceCategories: ['主粮', '零食', '保健', '垫料', '玩具', '家居'],
  // },
  // {
  //   scope: 'hamster',
  //   category: 'mammal',
  //   aliases: ['仓鼠', '金丝熊', '侏儒仓鼠'],
  //   breedAliases: [
  //     { scope: '金丝熊', aliases: ['金丝熊', '熊类仓鼠'] },
  //     { scope: '侏儒仓鼠', aliases: ['侏儒仓鼠', '三线', '一线'] },
  //   ],
  //   supportedTopicDomains: ['digestive', 'respiratory', 'skin', 'eye', 'behavior', 'nutrition', 'preventive_care'],
  //   guidanceCategories: ['主粮', '零食', '垫料', '玩具', '家居'],
  // },
  // {
  //   scope: 'bird',
  //   category: 'bird',
  //   aliases: ['鸟', '鹦鹉', '文鸟', '虎皮', '玄凤'],
  //   breedAliases: [
  //     { scope: '虎皮鹦鹉', aliases: ['虎皮', '虎皮鹦鹉'] },
  //     { scope: '玄凤鹦鹉', aliases: ['玄凤', '玄凤鹦鹉'] },
  //   ],
  //   supportedTopicDomains: ['digestive', 'respiratory', 'skin', 'eye', 'behavior', 'nutrition', 'preventive_care'],
  //   guidanceCategories: ['主粮', '零食', '保健', '玩具', '家居'],
  // },
  // {
  //   scope: 'reptile',
  //   category: 'reptile',
  //   aliases: ['爬宠', '爬行动物', '乌龟', '守宫', '蜥蜴'],
  //   breedAliases: [
  //     { scope: '乌龟', aliases: ['乌龟', '龟'] },
  //     { scope: '守宫', aliases: ['守宫'] },
  //   ],
  //   supportedTopicDomains: ['digestive', 'skin', 'eye', 'behavior', 'nutrition', 'preventive_care'],
  //   guidanceCategories: ['主粮', '保健', '环境', '家居'],
  // },
];

// #品种注册表
const BREED_REGISTRY = SPECIES_REGISTRY.flatMap((species) =>
  species.breedAliases.map((breed) => ({
    ...breed,
    scope: breed.scope.toLowerCase(),
    speciesScope: species.scope,
  })),
);

// #知识分类中心配置
export const KNOWLEDGE_TAXONOMY = {
  species: SPECIES_REGISTRY.map((item) => ({
    scope: item.scope,
    category: item.category,
    aliases: item.aliases,
    breeds: item.breedAliases.map((breed) => ({
      scope: breed.scope,
      aliases: breed.aliases,
    })),
    supportedTopicDomains: item.supportedTopicDomains,
    guidanceCategories: item.guidanceCategories,
    profileEnabled: item.profileEnabled,
  })),
  topicDomains: [
    { scope: 'digestive', aliases: ['消化', '肠胃', '胃肠', '胃', '肠'] },
    { scope: 'urinary', aliases: ['泌尿', '尿路', '膀胱', '排尿', '尿尿'] },
    { scope: 'respiratory', aliases: ['呼吸', '鼻子', '咳嗽', '打喷嚏'] },
    { scope: 'skin', aliases: ['皮肤', '毛发', '掉毛', '瘙痒', '皮屑'] },
    { scope: 'eye', aliases: ['眼睛', '眼部', '流泪', '眼屎'] },
    { scope: 'oral', aliases: ['口腔', '牙', '牙龈', '口臭', '牙结石'] },
    { scope: 'ear', aliases: ['耳朵', '耳道', '耳螨', '甩头'] },
    { scope: 'behavior', aliases: ['行为', '情绪', '应激', '训练'] },
    { scope: 'nutrition', aliases: ['营养', '喂养', '主粮', '零食', '配方'] },
    { scope: 'senior_care', aliases: ['老年', '高龄', '关节', '行动'] },
    { scope: 'preventive_care', aliases: ['疫苗', '驱虫', '预防', '体检'] },
  ],
  topics: [
    { scope: 'vomit', domain: 'digestive', aliases: ['呕吐', '吐了', '吐毛球', '毛球', '咖啡渣', '反胃', '干呕'] },
    { scope: 'diarrhea', domain: 'digestive', aliases: ['软便', '拉稀', '腹泻', '便血', '稀便', '拉肚子'] },
    { scope: 'constipation', domain: 'digestive', aliases: ['便秘', '拉不出', '不排便', '大便困难'] },
    { scope: 'appetite_loss', domain: 'digestive', aliases: ['不吃', '不吃东西', '突然不吃', '不肯吃', '没胃口', '食欲差', '食欲不好', '食欲不振', '厌食', '挑食', '挑食了'] },
    { scope: 'feeding', domain: 'nutrition', aliases: ['喂', '吃什么', '吃啥', '吃什么好', '主粮', '猫粮', '狗粮', '断奶', '水果', '配方粮', '处方粮'] },
    { scope: 'weight', domain: 'nutrition', aliases: ['胖', '减重', '体重', 'BCS', '体况', '超重', '偏瘦'] },
    { scope: 'vaccination', domain: 'preventive_care', aliases: ['疫苗', '驱虫', '狂犬', '免疫'] },
    { scope: 'grooming', domain: 'preventive_care', aliases: ['梳毛', '剪指甲', '洗澡', '护理', '洗护'] },
    { scope: 'behavior', domain: 'behavior', aliases: ['训练', '护食', '乱抓', '行为问题', '乱尿', '应激', '焦虑', '攻击'] },
    { scope: 'ear', domain: 'ear', aliases: ['耳朵', '耳螨', '洁耳', '甩头', '耳道', '挠耳朵'] },
    { scope: 'eye', domain: 'eye', aliases: ['眼睛', '眼屎', '流泪', '红眼', '结膜炎', '眯眼'] },
    { scope: 'skin', domain: 'skin', aliases: ['皮肤', '皮屑', '瘙痒', '掉毛', '脱毛', '红疹', '皮炎'] },
    { scope: 'oral', domain: 'oral', aliases: ['口腔', '口臭', '牙结石', '牙龈', '牙龈炎', '流口水'] },
    { scope: 'urinary', domain: 'urinary', aliases: ['尿频', '血尿', '排尿', '尿路', '膀胱炎', '泌尿'] },
    { scope: 'mobility', domain: 'senior_care', aliases: ['关节', '跛行', '走路', '站不起来', '行动慢', '关节炎'] },
    { scope: 'respiratory_support', domain: 'respiratory', aliases: ['咳嗽', '打喷嚏', '流鼻涕', '鼻塞', '喘'] },
    { scope: 'general_health', domain: 'preventive_care', aliases: ['健康', '疾病', '炎症', '发烧', '感染', '疼痛', '精神差'] },
  ],
  riskTopicRules: [
    { tag: 'vomit_diarrhea', topicScopes: ['vomit', 'diarrhea'] },
    { tag: 'disease', topicScopes: ['appetite_loss', 'constipation', 'urinary', 'skin', 'eye', 'oral', 'mobility'] },
  ],
  riskTopicDomainRules: [
    { tag: 'disease', topicDomains: ['urinary', 'respiratory', 'skin', 'eye', 'oral', 'ear'] },
  ],
  riskSignals: [
    { tag: 'poison', aliases: ['中毒', '误食', '巧克力', '葡萄', '洋葱', '木糖醇', '百合', '杀虫剂', '清洁剂'] },
    { tag: 'neurological', aliases: ['抽搐', '癫痫', '昏迷', '站不稳', '瘫', '歪头', '意识不清', '发抖', '抖个不停', '震颤'] },
    { tag: 'respiratory', aliases: ['呼吸困难', '喘不过气', '张口呼吸', '呼吸急促', '发绀', '喘鸣'] },
    { tag: 'urinary_block', aliases: ['不尿', '尿不出', '排尿困难', '尿闭', '频繁蹲厕所', '滴尿'] },
    { tag: 'bleeding', aliases: ['吐血', '便血', '拉血', '咖啡渣', '出血', '黑便', '血尿'] },
    { tag: 'drug', aliases: ['用药', '喂药', '吃药', '药量', '剂量', '阿莫西林', '消炎药', '止痛药', '吃什么药', '布洛芬', '对乙酰氨基酚', '人用药'] },
    { tag: 'emergency', aliases: ['急诊', '快不行', '立刻送医', '马上去医院', '紧急', '救命', '抽搐', '昏迷', '休克'] },
    { tag: 'post_op', aliases: ['手术后', '术后', '拆线', '绝育后', '麻醉后'] },
    { tag: 'disease', aliases: ['疾病', '炎症', '感染', '发烧', '疼痛', '没精神', '精神差'] },
  ],
  intentSignals: {
    guidance: ['推荐', '挑选', '帮我挑', '想挑', '购买', '选购', '哪个', '哪款', '预算', '组合', '下单', '狗粮', '猫粮', '猫砂', '玩具', '洗护', '主食', '零食'],
    community: ['社区', '帖子', '经验', '大家都怎么说', '别人怎么说', '种草', '晒宠', '求助', '大家都怎么选', '都怎么选', '都用什么', '用哪款'],
    communityPreference: ['大家都怎么选', '都怎么选', '别人怎么选', '都用什么', '大家都用什么', '用哪款比较多', '社区里怎么选'],
    service: ['地址', '收货', '登录', '订单', '帖子', '社区', '点赞', '发帖'],
    orderHistory: ['买过', '之前买', '历史订单', '订单记录', '下过单', '以前买的'],
    petProfile: ['我家', '名字叫', '几个月', '几岁', '体重', '品种'],
    knowledge: ['能不能吃', '可以吃吗', '怎么喂', '喂几次', '怎么判断', '营养', '吃什么', '吃啥', '不吃东西', '突然不吃', '肠胃不好'],
  },
} as const;

// #高风险信号导出
export const HIGH_RISK_SIGNAL_RULES = KNOWLEDGE_TAXONOMY.riskSignals.map((item) => ({
  tag: item.tag,
  aliases: item.aliases.map(createPattern),
}));

// #主题到主题域映射表
const TOPIC_TO_DOMAIN_MAP = new Map<string, string>(
  KNOWLEDGE_TAXONOMY.topics.map((item) => [item.scope, item.domain]),
);

// #物种查询索引
const SPECIES_BY_SCOPE = new Map<KnowledgeSpeciesScope, SpeciesRegistryItem>(
  SPECIES_REGISTRY.map((item) => [item.scope, item]),
);

// #标签归一化
export function normalizeScopeLabel(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  for (const species of SPECIES_REGISTRY) {
    if (species.aliases.some((alias) => normalized.includes(alias.toLowerCase()))) return species.scope;
  }

  for (const breed of BREED_REGISTRY) {
    if (breed.aliases.some((alias) => normalized.includes(alias.toLowerCase()))) {
      return breed.scope;
    }
  }

  return normalized;
}

// #物种归一化
export function normalizeSpeciesScope(species?: string | null): string | null {
  return normalizeScopeLabel(species);
}

// #标准化范围数组
export function normalizeScopeList(values?: readonly (string | null | undefined)[] | null): string[] {
  if (!values?.length) return [];
  const found = new Set<string>();
  for (const value of values) {
    const normalized = normalizeScopeLabel(value);
    if (normalized) found.add(normalized);
  }
  return Array.from(found);
}

// #品种归一化
export function extractBreedScopes(breed?: string | null): string[] {
  return resolveBreedContext(breed).matchedBreedScopes;
}

// #文本物种识别
export function inferSpeciesScopesFromText(text: string): string[] {
  return matchScopes(text, SPECIES_REGISTRY.map((item) => ({
    scope: item.scope,
    patterns: item.aliases.map(createPattern),
  })));
}

// #文本品种识别
export function inferBreedScopesFromText(text: string): string[] {
  const definitions = BREED_REGISTRY.map((breed) => ({
    scope: breed.scope,
    patterns: breed.aliases.map(createPattern),
  }));
  return matchScopes(text, definitions);
}

// #文本主题识别
export function inferTopicScopesFromText(text: string): string[] {
  return matchScopes(text, KNOWLEDGE_TAXONOMY.topics.map((item) => ({
    scope: item.scope,
    patterns: item.aliases.map(createPattern),
  })));
}

// #文本主题域识别
export function inferTopicDomainScopesFromText(text: string): string[] {
  const directMatches = matchScopes(text, KNOWLEDGE_TAXONOMY.topicDomains.map((item) => ({
    scope: item.scope,
    patterns: item.aliases.map(createPattern),
  })));
  return mergeScopes(directMatches, inferTopicDomainScopesFromTopics(inferTopicScopesFromText(text)));
}

// #分段主物种识别
export function inferPrimarySpeciesScope(...segments: string[]): string {
  return inferPrimaryScope(segments, inferSpeciesScopesFromText);
}

// #分段主主题识别
export function inferPrimaryTopicScope(...segments: string[]): string {
  return inferPrimaryScope(segments, inferTopicScopesFromText);
}

// #高风险信号识别
export function inferHighRiskSignalTags(text: string): string[] {
  return matchScopes(text, HIGH_RISK_SIGNAL_RULES.map((item) => ({
    scope: item.tag,
    patterns: item.aliases,
  })));
}

// #主题转主题域
export function inferTopicDomainScopesFromTopics(topics: readonly string[]): string[] {
  const domains = topics
    .map((topic) => TOPIC_TO_DOMAIN_MAP.get(topic))
    .filter(Boolean) as string[];
  return Array.from(new Set(domains));
}

// #主题域是否匹配
export function hasTopicDomainOverlap(
  sourceDomains: readonly string[] | null | undefined,
  targetDomains: readonly string[] | null | undefined,
): boolean {
  if (!sourceDomains?.length || !targetDomains?.length) return false;
  return sourceDomains.some((domain) => targetDomains.includes(domain));
}

// #主题是否匹配
export function hasTopicOverlap(
  sourceTopics: readonly string[] | null | undefined,
  targetTopics: readonly string[] | null | undefined,
): boolean {
  if (!sourceTopics?.length || !targetTopics?.length) return false;
  return sourceTopics.some((topic) => targetTopics.includes(topic));
}

// #物种是否兼容
export function isSpeciesCompatible(
  sourceSpecies: string | null | undefined,
  targetSpecies: string | null | undefined,
): boolean {
  if (!targetSpecies) return true;
  const normalizedSource = normalizeSpeciesScope(sourceSpecies);
  return !normalizedSource || normalizedSource === 'generic' || normalizedSource === targetSpecies;
}

// #物种配置查询
export function getSpeciesDefinition(scope?: string | null): SpeciesRegistryItem | null {
  const normalizedScope = normalizeSpeciesScope(scope);
  if (!normalizedScope) return null;
  return SPECIES_BY_SCOPE.get(normalizedScope) || null;
}

// #品种配置查询
export function getBreedDefinition(scope?: string | null): (typeof BREED_REGISTRY)[number] | null {
  const normalizedScope = normalizeScopeLabel(scope);
  if (!normalizedScope) return null;
  return BREED_REGISTRY.find((item) => item.scope === normalizedScope) || null;
}

// #按物种获取已注册品种别名
export function getRegisteredBreedAliases(speciesScope?: string | null): string[] {
  const normalizedSpeciesScope = normalizeSpeciesScope(speciesScope);
  const breeds = normalizedSpeciesScope
    ? BREED_REGISTRY.filter((item) => item.speciesScope === normalizedSpeciesScope)
    : BREED_REGISTRY;
  return Array.from(new Set(breeds.flatMap((item) => item.aliases))).sort((a, b) => b.length - a.length);
}

// #文本中的已注册品种命中
export function detectRegisteredBreedMentions(text: string, speciesScope?: string | null): string[] {
  if (!text) return [];
  const aliases = getRegisteredBreedAliases(speciesScope);
  const found = new Set<string>();
  for (const alias of aliases) {
    if (createPattern(alias).test(text)) found.add(alias);
  }
  return Array.from(found);
}

// #品种上下文解析
export function resolveBreedContext(
  breed?: string | null,
  species?: string | null,
): BreedResolution {
  const rawBreed = typeof breed === 'string' ? breed.trim() : '';
  const fallbackSpeciesScope = normalizeSpeciesScope(species);

  if (!rawBreed) {
    return {
      rawBreed: null,
      matchedBreedScopes: [],
      matchedSpeciesScope: null,
      fallbackSpeciesScope,
      matchMode: fallbackSpeciesScope ? 'fallback_species' : 'unknown',
    };
  }

  const normalizedBreed = rawBreed.toLowerCase();
  const matchedBreeds = BREED_REGISTRY.filter((item) =>
    item.aliases.some((alias) => normalizedBreed.includes(alias.toLowerCase())),
  );

  if (matchedBreeds.length) {
    const matchedBreedScopes = Array.from(new Set(matchedBreeds.map((item) => item.scope)));
    const matchedSpeciesScope = matchedBreeds[0]?.speciesScope || null;
    return {
      rawBreed,
      matchedBreedScopes,
      matchedSpeciesScope,
      fallbackSpeciesScope,
      matchMode: 'matched_breed',
    };
  }

  return {
    rawBreed,
    matchedBreedScopes: [],
    matchedSpeciesScope: null,
    fallbackSpeciesScope,
    matchMode: fallbackSpeciesScope ? 'fallback_species' : 'unknown',
  };
}

// #物种支持主题域查询
export function getSupportedTopicDomainsForSpecies(scope?: string | null): KnowledgeTopicDomainScope[] {
  return getSpeciesDefinition(scope)?.supportedTopicDomains || [];
}

// #物种支持导购类目查询
export function getGuidanceCategoriesForSpecies(scope?: string | null): string[] {
  return getSpeciesDefinition(scope)?.guidanceCategories || [];
}

// #主动建档物种范围
export function getProfileEnabledSpeciesScopes(): string[] {
  return SPECIES_REGISTRY.filter((item) => item.profileEnabled).map((item) => item.scope);
}

// #物种分类查询
export function getSpeciesCategory(scope?: string | null): SpeciesRegistryItem['category'] | null {
  return getSpeciesDefinition(scope)?.category || null;
}

// #按物种过滤主题域
export function filterTopicDomainsBySpecies(
  domains: readonly string[] | null | undefined,
  speciesScope?: string | null,
): KnowledgeTopicDomainScope[] {
  const normalizedDomains = normalizeScopeList(domains) as KnowledgeTopicDomainScope[];
  if (!normalizedDomains.length) return [];
  const supportedDomains = getSupportedTopicDomainsForSpecies(speciesScope);
  if (!supportedDomains.length) return normalizedDomains;
  return normalizedDomains.filter((domain) => supportedDomains.includes(domain));
}

// #品种是否兼容
export function isBreedCompatible(
  sourceBreeds: readonly string[] | null | undefined,
  targetBreeds: readonly string[] | null | undefined,
): boolean {
  if (!targetBreeds?.length) return true;
  const normalizedSourceBreeds = normalizeScopeList(sourceBreeds);
  if (!normalizedSourceBreeds.length) return true;
  return normalizedSourceBreeds.some((breed) => targetBreeds.includes(breed));
}

// #知识主题兼容判断
export function isTopicCompatible(
  sourceTopics: readonly string[] | null | undefined,
  sourceTopicDomains: readonly string[] | null | undefined,
  targetTopics: readonly string[] | null | undefined,
  targetTopicDomains: readonly string[] | null | undefined,
): boolean {
  const normalizedSourceTopics = normalizeScopeList(sourceTopics);
  const normalizedSourceDomains = normalizeScopeList(sourceTopicDomains);
  const normalizedTargetTopics = normalizeScopeList(targetTopics);
  const normalizedTargetDomains = normalizeScopeList(targetTopicDomains);

  // #具体病症必须命中同一主题，不能用泛主题或同一器官系统替代
  if (normalizedTargetTopics.length) {
    return hasTopicOverlap(normalizedSourceTopics, normalizedTargetTopics);
  }

  // #仅识别到器官系统时允许按主题域匹配，未识别主题时不返回知识证据
  if (normalizedTargetDomains.length) {
    return hasTopicDomainOverlap(normalizedSourceDomains, normalizedTargetDomains);
  }

  return false;
}

// #知识主题匹配评分
export function scoreTopicCompatibility(
  sourceTopics: readonly string[] | null | undefined,
  sourceTopicDomains: readonly string[] | null | undefined,
  targetTopics: readonly string[] | null | undefined,
  targetTopicDomains: readonly string[] | null | undefined,
): number {
  const normalizedSourceTopics = normalizeScopeList(sourceTopics);
  const normalizedSourceDomains = normalizeScopeList(sourceTopicDomains);
  const normalizedTargetTopics = normalizeScopeList(targetTopics);
  const normalizedTargetDomains = normalizeScopeList(targetTopicDomains);

  let score = 0;
  if (hasTopicOverlap(normalizedSourceTopics, normalizedTargetTopics)) {
    score += normalizedSourceTopics.filter((topic) => normalizedTargetTopics.includes(topic)).length * 4;
  }
  if (hasTopicDomainOverlap(normalizedSourceDomains, normalizedTargetDomains)) {
    score += normalizedSourceDomains.filter((domain) => normalizedTargetDomains.includes(domain)).length * 2;
  }
  if (normalizedSourceTopics.includes('generic')) score += 1;
  return score;
}

// #主题驱动风险标签补充
export function inferConfiguredRiskTagsFromTopics(topics: readonly string[]): KnowledgeRiskTag[] {
  const normalizedTopics = normalizeScopeList(topics);
  const found = new Set<KnowledgeRiskTag>();

  for (const rule of KNOWLEDGE_TAXONOMY.riskTopicRules) {
    if (rule.topicScopes.some((topic) => normalizedTopics.includes(topic))) {
      found.add(rule.tag as KnowledgeRiskTag);
    }
  }

  return Array.from(found);
}

// #主题域驱动风险标签补充
export function inferConfiguredRiskTagsFromTopicDomains(domains: readonly string[]): KnowledgeRiskTag[] {
  const normalizedDomains = normalizeScopeList(domains);
  const found = new Set<KnowledgeRiskTag>();

  for (const rule of KNOWLEDGE_TAXONOMY.riskTopicDomainRules) {
    if (rule.topicDomains.some((domain) => normalizedDomains.includes(domain))) {
      found.add(rule.tag as KnowledgeRiskTag);
    }
  }

  return Array.from(found);
}

// #主题配置查询
export function getTopicDefinition(scope: string): { scope: KnowledgeTopicScope; domain: KnowledgeTopicDomainScope } | null {
  const topic = KNOWLEDGE_TAXONOMY.topics.find((item) => item.scope === scope);
  if (!topic) return null;
  return { scope: topic.scope, domain: topic.domain };
}

// #是否命中导购信号
export function hasGuidanceSignal(text: string): boolean {
  return hasIntentSignal(text, KNOWLEDGE_TAXONOMY.intentSignals.guidance);
}

// #是否命中服务信号
export function hasServiceSignal(text: string): boolean {
  return hasIntentSignal(text, KNOWLEDGE_TAXONOMY.intentSignals.service);
}

// #是否命中社区信号
export function hasCommunitySignal(text: string): boolean {
  return hasIntentSignal(text, KNOWLEDGE_TAXONOMY.intentSignals.community);
}

// #是否命中社区偏好信号
export function hasCommunityPreferenceSignal(text: string): boolean {
  return hasIntentSignal(text, KNOWLEDGE_TAXONOMY.intentSignals.communityPreference);
}

// #是否命中订单历史信号
export function hasOrderHistorySignal(text: string): boolean {
  return hasIntentSignal(text, KNOWLEDGE_TAXONOMY.intentSignals.orderHistory);
}

// #是否命中档案信号
export function hasPetProfileSignal(text: string): boolean {
  return hasIntentSignal(text, KNOWLEDGE_TAXONOMY.intentSignals.petProfile);
}

// #是否命中知识信号
export function hasKnowledgeSignal(text: string): boolean {
  return hasIntentSignal(text, KNOWLEDGE_TAXONOMY.intentSignals.knowledge) || inferTopicScopesFromText(text).length > 0;
}

// #是否命中高风险信号
export function hasHighRiskSignal(text: string): boolean {
  return inferHighRiskSignalTags(text).length > 0;
}

// #意图信号匹配
function hasIntentSignal(text: string, aliases: readonly string[]): boolean {
  return aliases.some((alias) => createPattern(alias).test(text));
}

// #范围匹配
function matchScopes(
  text: string,
  definitions: Array<{ scope: string; patterns: RegExp[] }>,
): string[] {
  const found = new Set<string>();

  for (const item of definitions) {
    if (item.patterns.some((pattern) => pattern.test(text))) found.add(item.scope);
  }

  return Array.from(found);
}

// #主范围推断
function inferPrimaryScope(
  segments: string[],
  inferScopes: (text: string) => string[],
): string {
  for (const segment of segments) {
    const scopes = inferScopes(segment);
    if (scopes.length === 1) return scopes[0];
    if (scopes.length > 1) return scopes[0];
  }
  return 'generic';
}

// #范围集合合并
function mergeScopes(...scopeLists: Array<readonly string[]>): string[] {
  return Array.from(new Set(scopeLists.flat()));
}

// #正则构造
function createPattern(alias: string): RegExp {
  return new RegExp(escapeRegExp(alias), 'u');
}

// #正则转义
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
