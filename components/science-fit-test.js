// “我适合养什么”测试的题库与匹配模型。
// 数据、计算和界面分离：调整题目或增加候选品种时，不需要改动答题组件。

export const FIT_CATEGORIES = [
  { id: 'cat', label: '猫', emoji: '🐱' },
  { id: 'dog', label: '狗', emoji: '🐶' },
  { id: 'rabbit', label: '兔', emoji: '🐰' },
  { id: 'bird', label: '鸟', emoji: '🦜' },
  { id: 'hamster', label: '鼠', emoji: '🐹' },
  { id: 'reptile', label: '爬宠', emoji: '🦎' },
];

const option = (label, values) => ({ label, values });

// 通用题只评估生活条件和偏好；答案保存在本次测试中，不写入账号或宠物档案。
export const FIT_COMMON_QUESTIONS = [
  { id: 'time', title: '你每天能稳定投入多少时间？', hint: '包括喂养、清洁、互动、训练和外出。', options: [option('30 分钟以内', { time: 0 }), option('约 1 小时', { time: 1 }), option('1～2 小时', { time: 3 }), option('2 小时以上', { time: 4 })] },
  { id: 'budget', title: '每月可接受的基础预算大约是？', hint: '不包含重大疾病和突发急诊。', options: [option('300 元以内', { budget: 0 }), option('300～600 元', { budget: 1 }), option('600～1,200 元', { budget: 3 }), option('1,200 元以上', { budget: 4 })] },
  { id: 'space', title: '你的居住和活动空间如何？', hint: '还要考虑租房规定、邻里和安全活动区域。', options: [option('空间较小，活动区域有限', { space: 0 }), option('普通公寓，可安排固定区域', { space: 2 }), option('空间较充足，附近方便活动', { space: 3 }), option('有较大室内或安全户外空间', { space: 4 })] },
  { id: 'interaction', title: '你希望和宠物有多强的互动？', hint: '没有高低好坏，关键是与你期待的陪伴方式一致。', options: [option('主要观察，互动少一些', { interaction: 0 }), option('偶尔互动，各自独处', { interaction: 1 }), option('每天主动陪伴和玩耍', { interaction: 3 }), option('希望高互动，也愿意训练', { interaction: 4 })] },
  { id: 'noise', title: '你对叫声和夜间活动的接受程度？', hint: '鸟类鸣叫、犬吠和仓鼠夜行都可能影响生活。', options: [option('非常敏感，需要安静', { noise: 0 }), option('偶尔可以接受', { noise: 1 }), option('能接受一定叫声或夜间声音', { noise: 3 }), option('对声音影响不太介意', { noise: 4 })] },
  { id: 'cleaning', title: '你能接受多大的清洁和护理量？', hint: '包括掉毛、垫料、猫砂、笼舍和定期美容。', options: [option('希望尽量简单', { cleaning: 0 }), option('每周规律清洁可以接受', { cleaning: 2 }), option('愿意每天处理基础清洁', { cleaning: 3 }), option('高频清洁和美容都能接受', { cleaning: 4 })] },
  { id: 'stability', title: '你的日常作息稳定吗？', hint: '经常加班、出差时，需要提前安排可靠照护人。', options: [option('经常出差或临时变化', { stability: 0 }), option('偶尔出差，能提前安排', { stability: 2 }), option('作息较稳定，大部分时间在本地', { stability: 3 }), option('非常稳定，家中经常有人', { stability: 4 })] },
  { id: 'commitment', title: '你对长期照护的心理准备如何？', hint: '部分猫狗、鹦鹉和爬宠可能陪伴十几年甚至更久。', options: [option('先体验一段时间再决定', { commitment: 0 }), option('能承担几年照护', { commitment: 1 }), option('已考虑十年左右的变化', { commitment: 3 }), option('愿意承担完整寿命周期', { commitment: 4 })] },
  { id: 'special-care', title: '你能接受异宠医疗和特殊饲料吗？', hint: '兔、鸟、仓鼠和爬宠可能需要异宠兽医，部分爬宠还需要活体或冷冻饲料。', options: [option('都不能接受', { exoticVet: 0, liveFeed: 0 }), option('能找异宠兽医，但不能接受特殊饲料', { exoticVet: 1, liveFeed: 0 }), option('可以提前确认医疗和饲料资源', { exoticVet: 1, liveFeed: 1 })] },
];

// 已确定类型时追加专项题，用于在该类型内部推荐更具体的品种或饲养方向。
export const FIT_SPECIAL_QUESTIONS = {
  dog: [
    { id: 'dog-activity', title: '你希望每天安排多大的运动量？', options: [option('短时散步即可', { activity: 0 }), option('每天约 1 小时', { activity: 2 }), option('每天 1～2 小时', { activity: 3 }), option('高强度运动和训练都可以', { activity: 4 })] },
    { id: 'dog-grooming', title: '你能接受掉毛和美容吗？', options: [option('希望掉毛和美容需求都低', { grooming: 0 }), option('能接受掉毛，但不想频繁美容', { grooming: 1 }), option('愿意规律梳毛或美容', { grooming: 3 }), option('高频梳理和美容都没问题', { grooming: 4 })] },
    { id: 'dog-experience', title: '你愿意投入多少训练精力？', options: [option('希望训练要求低', { training: 0 }), option('愿意学习基础训练', { training: 2 }), option('愿意持续训练和社会化', { training: 3 }), option('有经验，喜欢高挑战训练', { training: 4 })] },
  ],
  cat: [
    { id: 'cat-energy', title: '你偏好怎样的猫咪活动水平？', options: [option('安静陪伴型', { activity: 0 }), option('适度玩耍', { activity: 2 }), option('活泼好奇', { activity: 3 }), option('高互动、高探索需求', { activity: 4 })] },
    { id: 'cat-grooming', title: '你能接受多少毛发护理？', options: [option('偏好短毛、低护理', { grooming: 0 }), option('每周梳理可以接受', { grooming: 2 }), option('愿意高频梳毛和清洁', { grooming: 4 })] },
    { id: 'cat-vocal', title: '你对猫咪频繁表达和叫声的偏好？', options: [option('偏好安静', { vocal: 0 }), option('偶尔交流可以', { vocal: 2 }), option('喜欢爱表达、互动强的猫', { vocal: 4 })] },
  ],
  rabbit: [
    { id: 'rabbit-space', title: '能否提供每天安全活动的地面空间？', options: [option('只能提供较小笼舍', { activity: 0 }), option('能安排固定围栏区', { activity: 2 }), option('能提供较大防滑活动区', { activity: 4 })] },
    { id: 'rabbit-grooming', title: '你能接受多少毛发护理？', options: [option('偏好短毛低护理', { grooming: 0 }), option('愿意每周梳理', { grooming: 2 }), option('长毛高频护理也可以', { grooming: 4 })] },
  ],
  bird: [
    { id: 'bird-vocal', title: '你对鸟类鸣叫的接受程度？', options: [option('只能接受较安静的鸟', { vocal: 0 }), option('日常鸣叫可以接受', { vocal: 2 }), option('能接受明显鸣叫和表达', { vocal: 4 })] },
    { id: 'bird-interaction', title: '每天能否安排互动或安全活动？', options: [option('主要观察', { training: 0 }), option('可以短时互动', { training: 2 }), option('愿意持续互动和训练', { training: 4 })] },
  ],
  hamster: [
    { id: 'hamster-contact', title: '你期待怎样的互动方式？', options: [option('以观察为主', { handling: 0 }), option('希望偶尔上手互动', { handling: 2 }), option('希望频繁拥抱和玩耍', { handling: 4 })] },
    { id: 'hamster-night', title: '夜间跑轮和活动声音可以接受吗？', options: [option('不太能接受', { vocal: 0 }), option('轻微声音可以', { vocal: 2 }), option('夜间活动不影响我', { vocal: 4 })] },
  ],
  reptile: [
    { id: 'reptile-feed', title: '你能接受哪种饲料形式？', options: [option('只能接受植物或商业粮', { feedFlex: 0 }), option('可以接受昆虫', { feedFlex: 2 }), option('昆虫、冷冻饲料都可以', { feedFlex: 4 })] },
    { id: 'reptile-equipment', title: '你愿意投入多少设备维护精力？', options: [option('希望设备尽量简单', { equipment: 0 }), option('能维护温湿度设备', { equipment: 2 }), option('愿意长期维护 UVB、温控等系统', { equipment: 4 })] },
  ],
};

const category = (id, requirements, ideals, constraints, traits) => ({ id, kind: 'category', requirements, ideals, constraints, traits });
const breed = (id, categoryId, label, requirements, ideals, traits) => ({ id, categoryId, label, kind: 'breed', requirements, ideals, traits });

export const FIT_CATEGORY_PROFILES = [
  category('cat', { time: 1, budget: 2, space: 1, cleaning: 2, stability: 2, commitment: 3 }, { interaction: 2, noise: 1 }, {}, ['室内环境管理', '猫砂与抓挠空间', '每天互动游戏']),
  category('dog', { time: 3, budget: 3, space: 2, cleaning: 2, stability: 3, commitment: 4 }, { interaction: 4, noise: 2 }, {}, ['规律外出运动', '持续训练与社会化', '长期陪伴需求']),
  category('rabbit', { time: 2, budget: 2, space: 2, cleaning: 3, stability: 2, commitment: 3 }, { interaction: 1, noise: 0 }, { exoticVet: true }, ['持续牧草与饮水', '安全地面活动区', '异宠医疗资源']),
  category('bird', { time: 2, budget: 2, space: 2, cleaning: 3, stability: 3, commitment: 4 }, { interaction: 3, noise: 3 }, { exoticVet: true }, ['鸣叫与羽粉', '安全活动和互动', '部分品种寿命很长']),
  category('hamster', { time: 1, budget: 1, space: 1, cleaning: 2, stability: 1, commitment: 1 }, { interaction: 0, noise: 2 }, { exoticVet: true }, ['夜间活动', '深垫料和合适跑轮', '以观察为主']),
  category('reptile', { time: 1, budget: 2, space: 2, cleaning: 1, stability: 2, commitment: 3 }, { interaction: 0, noise: 0 }, { exoticVet: true, liveFeed: true }, ['按物种维护环境参数', '异宠医疗资源', '可能需要特殊饲料']),
];

export const FIT_BREED_PROFILES = {
  dog: [
    breed('golden', 'dog', '金毛寻回犬', { time: 3, budget: 3, space: 3, cleaning: 4, stability: 3, commitment: 4 }, { interaction: 4, noise: 2, activity: 3, grooming: 3, training: 2 }, ['亲人友好', '运动量较高', '掉毛明显']),
    breed('labrador', 'dog', '拉布拉多', { time: 3, budget: 3, space: 3, cleaning: 3, stability: 3, commitment: 4 }, { interaction: 4, noise: 2, activity: 4, grooming: 2, training: 2 }, ['外向亲人', '食欲旺盛', '需要体重管理']),
    breed('poodle', 'dog', '贵宾犬', { time: 2, budget: 3, space: 1, cleaning: 2, stability: 3, commitment: 4 }, { interaction: 4, noise: 2, activity: 2, grooming: 4, training: 3 }, ['聪明易训练', '掉毛相对少', '需要定期美容']),
    breed('shiba', 'dog', '柴犬', { time: 3, budget: 2, space: 2, cleaning: 3, stability: 3, commitment: 4 }, { interaction: 2, noise: 2, activity: 3, grooming: 2, training: 3 }, ['独立有主见', '需要一致训练', '换毛期明显']),
    breed('corgi', 'dog', '柯基', { time: 3, budget: 3, space: 2, cleaning: 4, stability: 3, commitment: 4 }, { interaction: 4, noise: 3, activity: 3, grooming: 2, training: 2 }, ['活泼亲人', '掉毛较多', '需要控制体重']),
    breed('border-collie', 'dog', '边境牧羊犬', { time: 4, budget: 3, space: 3, cleaning: 3, stability: 4, commitment: 4 }, { interaction: 4, noise: 2, activity: 4, grooming: 2, training: 4 }, ['学习能力强', '精力极高', '需要持续任务感']),
  ],
  cat: [
    breed('british-shorthair', 'cat', '英国短毛猫', { time: 1, budget: 2, space: 1, cleaning: 2, stability: 2, commitment: 3 }, { interaction: 2, noise: 0, activity: 1, grooming: 1, vocal: 0 }, ['相对沉稳', '短毛护理', '注意体重']),
    breed('american-shorthair', 'cat', '美国短毛猫', { time: 2, budget: 2, space: 1, cleaning: 2, stability: 2, commitment: 3 }, { interaction: 3, noise: 1, activity: 3, grooming: 1, vocal: 1 }, ['适应力较强', '活泼好奇', '需要游戏']),
    breed('ragdoll', 'cat', '布偶猫', { time: 2, budget: 3, space: 2, cleaning: 4, stability: 3, commitment: 4 }, { interaction: 4, noise: 1, activity: 1, grooming: 4, vocal: 1 }, ['温和亲人', '长毛护理', '陪伴需求较高']),
    breed('siamese', 'cat', '暹罗猫', { time: 3, budget: 2, space: 1, cleaning: 2, stability: 3, commitment: 4 }, { interaction: 4, noise: 4, activity: 4, grooming: 1, vocal: 4 }, ['聪明爱互动', '表达欲强', '不宜长期独处']),
    breed('maine-coon', 'cat', '缅因猫', { time: 2, budget: 4, space: 3, cleaning: 4, stability: 3, commitment: 4 }, { interaction: 3, noise: 1, activity: 2, grooming: 4, vocal: 1 }, ['体型较大', '通常温和', '用品和医疗成本高']),
  ],
  rabbit: [
    breed('rabbit-shorthair', 'rabbit', '短毛家兔', { time: 2, budget: 2, space: 3, cleaning: 3, stability: 2, commitment: 3 }, { interaction: 1, noise: 0, activity: 3, grooming: 1 }, ['护理相对基础', '需要持续牧草', '需要地面活动']),
    breed('holland-lop', 'rabbit', '荷兰垂耳兔', { time: 2, budget: 3, space: 3, cleaning: 3, stability: 2, commitment: 3 }, { interaction: 2, noise: 0, activity: 3, grooming: 2 }, ['体型较小', '性格通常温和', '注意耳部护理']),
    breed('lionhead', 'rabbit', '狮子兔', { time: 3, budget: 3, space: 3, cleaning: 4, stability: 2, commitment: 3 }, { interaction: 2, noise: 0, activity: 3, grooming: 4 }, ['毛发有辨识度', '需要高频梳理', '注意毛结']),
  ],
  bird: [
    breed('budgie', 'bird', '虎皮鹦鹉', { time: 2, budget: 1, space: 2, cleaning: 3, stability: 2, commitment: 2 }, { interaction: 3, noise: 2, vocal: 2, training: 2 }, ['体型小', '适合互动', '日常鸣叫']),
    breed('cockatiel', 'bird', '玄凤鹦鹉', { time: 3, budget: 2, space: 3, cleaning: 4, stability: 3, commitment: 3 }, { interaction: 4, noise: 3, vocal: 3, training: 3 }, ['相对温和', '需要互动', '羽粉较多']),
    breed('canary', 'bird', '金丝雀', { time: 1, budget: 1, space: 2, cleaning: 3, stability: 2, commitment: 2 }, { interaction: 1, noise: 2, vocal: 2, training: 0 }, ['以观察为主', '鸣声清脆', '上手互动较少']),
  ],
  hamster: [
    breed('syrian', 'hamster', '金丝熊', { time: 1, budget: 1, space: 2, cleaning: 2, stability: 1, commitment: 1 }, { interaction: 1, noise: 3, handling: 2, vocal: 3 }, ['体型相对较大', '通常独居', '夜间活动']),
    breed('winter-white', 'hamster', '冬白三线仓鼠', { time: 1, budget: 1, space: 1, cleaning: 2, stability: 1, commitment: 1 }, { interaction: 1, noise: 3, handling: 2, vocal: 3 }, ['体型小', '行动灵活', '需要安全笼舍']),
    breed('roborovski', 'hamster', '罗布罗夫斯基仓鼠', { time: 1, budget: 1, space: 1, cleaning: 2, stability: 1, commitment: 1 }, { interaction: 0, noise: 3, handling: 0, vocal: 3 }, ['速度很快', '更适合观察', '防逃逸要求高']),
  ],
  reptile: [
    breed('leopard-gecko', 'reptile', '豹纹守宫', { time: 1, budget: 2, space: 1, cleaning: 1, stability: 2, commitment: 3 }, { interaction: 0, noise: 0, feedFlex: 2, equipment: 2 }, ['相对安静', '需要温度梯度', '需要昆虫饲料']),
    breed('bearded-dragon', 'reptile', '鬃狮蜥', { time: 2, budget: 3, space: 3, cleaning: 2, stability: 3, commitment: 3 }, { interaction: 1, noise: 0, feedFlex: 3, equipment: 4 }, ['日行可观察', '需要 UVB', '设备要求较高']),
    breed('corn-snake', 'reptile', '玉米蛇', { time: 1, budget: 2, space: 2, cleaning: 1, stability: 2, commitment: 3 }, { interaction: 0, noise: 0, feedFlex: 4, equipment: 2 }, ['安静', '需要防逃逸', '需接受冷冻鼠饲料']),
  ],
};

const CAPACITY_LABELS = {
  time: '时间投入', budget: '预算能力', space: '居住空间', cleaning: '清洁护理', stability: '稳定作息', commitment: '长期承诺',
};

function scoreCandidate(candidate, answers) {
  let score = 100;
  const strengths = [];
  const cautions = [];

  Object.entries(candidate.requirements).forEach(([key, required]) => {
    const actual = answers[key] ?? 0;
    const gap = required - actual;
    if (gap > 0) { score -= gap * 9; cautions.push(`${CAPACITY_LABELS[key]}可能低于日常需求`); }
    else if (required >= 2) strengths.push(`${CAPACITY_LABELS[key]}较匹配`);
  });
  Object.entries(candidate.ideals).forEach(([key, ideal]) => {
    if (answers[key] == null) return;
    score -= Math.abs(ideal - answers[key]) * 3;
  });
  if (candidate.constraints?.exoticVet && !answers.exoticVet) { score -= 24; cautions.push('需要先确认附近的异宠医疗资源'); }
  if (candidate.constraints?.liveFeed && !answers.liveFeed) { score -= 22; cautions.push('部分物种可能需要昆虫或冷冻饲料'); }

  return { ...candidate, score: Math.max(0, Math.round(score)), strengths: [...new Set(strengths)].slice(0, 3), cautions: [...new Set(cautions)].slice(0, 3) };
}

export function evaluateFitTest({ intent, selectedCategories, answerMap }) {
  const answers = Object.values(answerMap).reduce((profile, values) => ({ ...profile, ...values }), {});
  const isBreedResult = intent === 'fixed' && selectedCategories.length === 1;
  const candidates = isBreedResult
    ? FIT_BREED_PROFILES[selectedCategories[0]] || []
    : FIT_CATEGORY_PROFILES.filter((item) => intent !== 'compare' || selectedCategories.includes(item.id));

  return candidates
    .map((candidate) => scoreCandidate(candidate, answers))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((candidate) => ({
      ...candidate,
      label: candidate.label || FIT_CATEGORIES.find((item) => item.id === candidate.id)?.label,
      emoji: FIT_CATEGORIES.find((item) => item.id === (candidate.categoryId || candidate.id))?.emoji,
      level: candidate.score >= 82 ? '较匹配' : candidate.score >= 65 ? '可以考虑' : '需要谨慎',
    }));
}
