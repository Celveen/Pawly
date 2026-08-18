// 已养宠的轻量定制化数据。
// 这里只保存用户主动选择的“物种 + 生命周期”所需文案，不创建宠物档案，也不写入账号或数据库。

export const OWNED_CARE_SPECIES = [
  { id: 'dog', label: '狗', emoji: '🐶', focus: { problem: '食欲、排便、步态与外出后的反应', daily: '外出、足垫、毛发和口腔', health: '疫苗、驱虫、体重与关节', feeding: '体况、零食和饮水', behavior: '牵引、独处与环境刺激' } },
  { id: 'cat', label: '猫', emoji: '🐱', focus: { problem: '进食、排尿、躲藏与呼吸状态', daily: '猫砂、抓挠、毛发和口腔', health: '疫苗、驱虫、体重与泌尿健康', feeding: '饮水、湿粮比例和体况', behavior: '安全感、垂直空间与资源分布' } },
  { id: 'rabbit', label: '兔', emoji: '🐰', focus: { problem: '牧草摄入、粪便数量和精神状态', daily: '牧草、地面活动、毛发和牙齿', health: '体重、牙口和异宠医疗资源', feeding: '牧草、饮水和突然换粮风险', behavior: '躲避空间、地面探索与同伴互动' } },
  { id: 'bird', label: '鸟', emoji: '🦜', focus: { problem: '进食、粪便、姿势与呼吸', daily: '笼舍、清洁饮水、栖木和作息', health: '体重、羽毛和异宠体检', feeding: '颗粒粮、蔬果与单一种子风险', behavior: '鸣叫、社交需求和环境丰富化' } },
  { id: 'hamster', label: '仓鼠', emoji: '🐹', focus: { problem: '夜间活动、进食、体重与排泄', daily: '跑轮、深垫料、躲避与笼舍安全', health: '体重、皮肤和异常安静', feeding: '完整主粮、饮水和零食比例', behavior: '夜行作息、独居和防逃逸' } },
  { id: 'guinea-pig', label: '豚鼠', emoji: '🐹', focus: { problem: '牧草摄入、体重、粪便与同伴状态', daily: '牧草、平面空间、清洁与称重', health: '维生素 C、体重和异宠医疗', feeding: '持续牧草、维生素 C 来源和饮水', behavior: '同伴关系、抢食与躲避空间' } },
  { id: 'aquatic', label: '水族', emoji: '🐠', focus: { problem: '水温、水质、游姿与呼吸', daily: '过滤、温度、水质与小幅维护', health: '水质基线、隔离与疾病扩散', feeding: '少量投喂、残饵和物种差异', behavior: '群游、攻击性与混养兼容性' } },
  { id: 'reptile', label: '爬宠', emoji: '🦎', focus: { problem: '温湿度、进食、排泄与蜕皮', daily: '温湿度、光照、躲避与设备运行', health: '环境参数、体重和异宠检查', feeding: '物种食性、补充剂和投喂节奏', behavior: '躲避、活动节律与减少上手' } },
  { id: 'mini-pig', label: '猪', emoji: '🐷', focus: { problem: '食量、排泄、步态与精神', daily: '空间、清洁、蹄部和活动', health: '体重、皮肤、蹄部和医疗资源', feeding: '体重管理、主食和零食边界', behavior: '一致训练、探索需求和边界' } },
];

export const OWNED_CARE_LIFE_STAGES = [
  { id: 'young', label: '幼年 / 成长期', note: '重点是适应、发育与建立稳定习惯' },
  { id: 'adult', label: '成年期', note: '重点是维持体况、规律预防和生活质量' },
  { id: 'senior', label: '老年期', note: '重点是变化监测、舒适度与更及时的检查' },
];

const GROUP_GUIDANCE = {
  problem: { title: '异常观察', action: '先建立记录，再判断是否需要就医', caution: '明显恶化、持续拒食、呼吸异常、意识或活动能力变化时，不应只依赖线上内容。' },
  daily: { title: '日常照护', action: '把高频事项做成可重复的日常节奏', caution: '不确定用品、清洁方法或频率是否适用时，优先确认物种需求，不要套用猫狗经验。' },
  health: { title: '健康管理', action: '以预防和健康基线为主，而非出现问题才处理', caution: '疫苗、驱虫、绝育和用药均需结合物种、个体和当地医疗建议。' },
  feeding: { title: '饮食喂养', action: '先确保物种适配，再调整数量与节奏', caution: '拒食、体重骤变或饮水明显变化需要结合实际情况及时咨询兽医。' },
  behavior: { title: '行为与环境', action: '先满足环境与安全感，再训练具体行为', caution: '恐惧、攻击或突然行为改变需优先排查健康与环境压力，避免惩罚。' },
};

// 统一产出“定制卡片”协议；将来接入真实档案时只需将参数换成档案字段。
export function getOwnedCareGuidance({ speciesId, lifeStageId, groupId }) {
  const species = OWNED_CARE_SPECIES.find((item) => item.id === speciesId) || OWNED_CARE_SPECIES[0];
  const lifeStage = OWNED_CARE_LIFE_STAGES.find((item) => item.id === lifeStageId) || OWNED_CARE_LIFE_STAGES[1];
  const group = GROUP_GUIDANCE[groupId] || GROUP_GUIDANCE.daily;
  const focus = species.focus[groupId] || species.focus.daily;

  return {
    eyebrow: `我的${species.label} · ${lifeStage.label}`,
    title: `${species.label}${lifeStage.label}的${group.title}重点`,
    summary: `${lifeStage.note}。当前模块优先关注：${focus}。`,
    steps: [`每天或每次操作时记录 ${focus}`, `围绕${species.label}的实际环境与作息调整，不照搬其他物种的做法`, `出现与平时基线不同的变化时，保留时间、照片或数值再寻求帮助`],
    caution: group.caution,
    keywords: [species.label, ...focus.split('、')],
    cats: groupId === 'behavior' ? ['train', 'health'] : groupId === 'feeding' ? ['nutri', 'health'] : groupId === 'daily' ? ['groom', 'health'] : ['health'],
  };
}
