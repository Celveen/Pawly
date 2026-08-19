// Pawly 支持的一级宠物类别。前端档案、商品筛选和服务端知识分类共用这份配置。
export const PET_SPECIES = [
  { id: 'dog', name: '狗', label: '狗', aliases: ['狗', '犬', '狗狗', '幼犬'], emoji: '🐶', group: 'mammal' },
  { id: 'cat', name: '猫', label: '猫', aliases: ['猫', '猫咪', '幼猫'], emoji: '🐱', group: 'mammal' },
  { id: 'rabbit', name: '兔子', label: '兔', aliases: ['兔', '兔子'], emoji: '🐰', group: 'mammal' },
  { id: 'bird', name: '宠物鸟', label: '鸟', aliases: ['鸟', '宠物鸟', '鹦鹉', '文鸟', '虎皮', '玄凤'], emoji: '🦜', group: 'bird' },
  { id: 'hamster', name: '仓鼠', label: '仓鼠', aliases: ['仓鼠', '金丝熊', '侏儒仓鼠'], emoji: '🐹', group: 'mammal' },
  { id: 'guinea_pig', name: '豚鼠', label: '豚鼠', aliases: ['豚鼠', '荷兰猪', '天竺鼠'], emoji: '🐹', group: 'mammal' },
  { id: 'aquatic', name: '水族宠物', label: '水族', aliases: ['水族', '鱼', '观赏鱼', '金鱼', '锦鲤', '虾', '螺'], emoji: '🐟', group: 'aquatic' },
  { id: 'reptile', name: '爬宠', label: '爬宠', aliases: ['爬宠', '爬行动物', '乌龟', '守宫', '蜥蜴', '蛇', '蛙'], emoji: '🦎', group: 'reptile' },
  { id: 'mini_pig', name: '小香猪', label: '猪', aliases: ['小香猪', '迷你猪', '宠物猪'], emoji: '🐷', group: 'other' },
] as const;

export type PetSpeciesName = (typeof PET_SPECIES)[number]['name'];

export const PET_FILTERS = [
  { id: 'all', label: '全部', speciesIds: PET_SPECIES.map((item) => item.id), emoji: '✨' },
  { id: 'dog', label: '狗', speciesIds: ['dog'], emoji: '🐶' },
  { id: 'cat', label: '猫', speciesIds: ['cat'], emoji: '🐱' },
  { id: 'rabbit', label: '兔', speciesIds: ['rabbit'], emoji: '🐰' },
  { id: 'bird', label: '鸟', speciesIds: ['bird'], emoji: '🦜' },
  { id: 'hamster', label: '仓鼠', speciesIds: ['hamster'], emoji: '🐹' },
  { id: 'guinea_pig', label: '豚鼠', speciesIds: ['guinea_pig'], emoji: '🐹' },
  { id: 'aquatic', label: '水族', speciesIds: ['aquatic'], emoji: '🐟' },
  { id: 'reptile', label: '爬宠', speciesIds: ['reptile'], emoji: '🦎' },
  { id: 'mini_pig', label: '猪', speciesIds: ['mini_pig'], emoji: '🐷' },
] as const;

// 科普页与商品页共用分类：把仓鼠、豚鼠及其他“鼠类”统一收纳到“鼠”。
// 具体文章和商品仍可继续使用“豚鼠”作为适用对象，聚合只发生在入口筛选层。
export const PET_CONTENT_FILTERS = [
  PET_FILTERS[0],
  PET_FILTERS[1],
  PET_FILTERS[2],
  PET_FILTERS[3],
  { id: 'rodent', label: '鼠', speciesIds: ['rodent', 'hamster', 'guinea_pig', 'chinchilla', 'gerbil', 'rat', 'mouse', 'degu'], emoji: '🐹' },
  PET_FILTERS[7],
  PET_FILTERS[8],
  PET_FILTERS[9],
];

// 兼容科普页现有命名；商品页与科普页统一使用 PET_CONTENT_FILTERS。
export const ARTICLE_PET_FILTERS = PET_CONTENT_FILTERS;

export const RODENT_ALIASES = [
  '鼠', '鼠类', '仓鼠', '金丝熊', '侏儒仓鼠', '豚鼠', '荷兰猪', '天竺鼠', '龙猫', '毛丝鼠',
  '沙鼠', '蒙古沙鼠', '花枝鼠', '宠物大鼠', '宠物鼠', '小鼠', '八齿鼠', '松鼠',
];

export function getPetSpecies(name?: string | null) {
  return PET_SPECIES.find((item) => item.id === name || item.name === name || item.aliases.some((alias) => alias === name)) || PET_SPECIES[0];
}
