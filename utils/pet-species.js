/** 与网页端 lib/pet-species.ts 保持同源，供商品/科普筛选与宠物档案共用 */
const PET_SPECIES = [
  { id: 'dog', name: '狗', label: '狗', aliases: ['狗', '犬', '狗狗', '幼犬'], emoji: '🐶' },
  { id: 'cat', name: '猫', label: '猫', aliases: ['猫', '猫咪', '幼猫'], emoji: '🐱' },
  { id: 'rabbit', name: '兔子', label: '兔', aliases: ['兔', '兔子'], emoji: '🐰' },
  { id: 'bird', name: '宠物鸟', label: '鸟', aliases: ['鸟', '宠物鸟', '鹦鹉', '文鸟', '虎皮', '玄凤'], emoji: '🦜' },
  { id: 'hamster', name: '仓鼠', label: '仓鼠', aliases: ['仓鼠', '金丝熊', '侏儒仓鼠'], emoji: '🐹' },
  { id: 'guinea_pig', name: '豚鼠', label: '豚鼠', aliases: ['豚鼠', '荷兰猪', '天竺鼠'], emoji: '🐹' },
  { id: 'aquatic', name: '水族宠物', label: '水族', aliases: ['水族', '鱼', '观赏鱼', '金鱼', '锦鲤', '虾', '螺'], emoji: '🐟' },
  { id: 'reptile', name: '爬宠', label: '爬宠', aliases: ['爬宠', '爬行动物', '乌龟', '守宫', '蜥蜴', '蛇', '蛙'], emoji: '🦎' },
  { id: 'mini_pig', name: '小香猪', label: '猪', aliases: ['小香猪', '迷你猪', '宠物猪'], emoji: '🐷' },
];

const RODENT_ALIASES = [
  '鼠', '鼠类', '仓鼠', '金丝熊', '侏儒仓鼠', '豚鼠', '荷兰猪', '天竺鼠', '龙猫', '毛丝鼠',
  '沙鼠', '蒙古沙鼠', '花枝鼠', '宠物大鼠', '宠物鼠', '小鼠', '八齿鼠', '松鼠',
];

/** 入口筛选：把仓鼠/豚鼠等统一收成「鼠」 */
const PET_FILTERS = [
  { id: 'all', label: '全部', emoji: '✨', speciesIds: PET_SPECIES.map((s) => s.id) },
  { id: 'dog', label: '狗', emoji: '🐶', speciesIds: ['dog'] },
  { id: 'cat', label: '猫', emoji: '🐱', speciesIds: ['cat'] },
  { id: 'rabbit', label: '兔', emoji: '🐰', speciesIds: ['rabbit'] },
  { id: 'bird', label: '鸟', emoji: '🦜', speciesIds: ['bird'] },
  { id: 'rodent', label: '鼠', emoji: '🐹', speciesIds: ['hamster', 'guinea_pig', 'rodent'] },
  { id: 'aquatic', label: '水族', emoji: '🐟', speciesIds: ['aquatic'] },
  { id: 'reptile', label: '爬宠', emoji: '🦎', speciesIds: ['reptile'] },
  { id: 'mini_pig', label: '猪', emoji: '🐷', speciesIds: ['mini_pig'] },
];

function getPetSpecies(name) {
  return (
    PET_SPECIES.find((s) => s.id === name || s.name === name || s.aliases.indexOf(name) >= 0) ||
    PET_SPECIES[0]
  );
}

/** 商品/文章是否命中某个宠物筛选项 */
function matchPet(filterId, petName) {
  if (!filterId || filterId === 'all') return true;
  const f = PET_FILTERS.find((x) => x.id === filterId);
  if (!f) return true;
  const raw = String(petName || '');
  if (filterId === 'rodent' && RODENT_ALIASES.some((a) => raw.indexOf(a) >= 0)) return true;
  return f.speciesIds.indexOf(getPetSpecies(raw).id) >= 0;
}

module.exports = { PET_SPECIES, PET_FILTERS, RODENT_ALIASES, getPetSpecies, matchPet };

/** 科普文章匹配宠物筛选（与网页端 articleMatchesSpecies 同逻辑） */
function articleMatchesSpecies(article, filterId) {
  if (!filterId || filterId === 'all') return true;
  const f = PET_FILTERS.find((x) => x.id === filterId);
  if (!f) return true;
  if (Array.isArray(article.species) && article.species.length) {
    return f.speciesIds.some((id) => article.species.indexOf(id) >= 0);
  }
  const text = `${article.title} ${article.excerpt}`;
  if (filterId === 'rodent') return RODENT_ALIASES.some((a) => text.indexOf(a) >= 0);
  return f.speciesIds.some((id) => {
    const s = PET_SPECIES.find((x) => x.id === id);
    return s ? s.aliases.some((a) => text.indexOf(a) >= 0) : false;
  });
}

module.exports.articleMatchesSpecies = articleMatchesSpecies;
