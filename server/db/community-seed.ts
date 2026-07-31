// 社区示例内容：首次部署（或升级部署）时灌入的官方/示例账号与帖子。
// 目的：新用户进社区不是空荡荡的，而是能看到"别人怎么用"的真实感内容。
// 幂等：store.ts 以 demo-momo 用户是否存在作为标记，只灌一次。
// 图片是仓库内静态插画（public/images/community/），不占数据库体积。

export interface SeedUser {
  id: string;
  nickname: string;
  avatarEmoji: string;
  bio: string;
}

export interface SeedPost {
  id: string;
  userId: string;
  topic: string; // 分区：晒宠 | 好物 | 求助 | 日常
  title: string;
  content: string;
  emoji: string;
  bg: string;
  topics?: string[];
  images?: string[];
  petName?: string;
  hoursAgo: number; // 相对 seed 时刻的发帖时间
}

export interface SeedComment {
  postId: string;
  userId: string;
  content: string;
}

export const SEED_USERS: SeedUser[] = [
  { id: 'demo-momo', nickname: '糯米麻麻', avatarEmoji: '🐱', bio: '两只布偶的全职铲屎官，记录接猫后的每一天' },
  { id: 'demo-doudou', nickname: '豆豆爸', avatarEmoji: '🐶', bio: '金毛豆豆 3 岁，风雨无阻遛弯选手' },
  { id: 'demo-xiaolu', nickname: '铲屎官小鹿', avatarEmoji: '✨', bio: '新手养猫第 89 天，边学边养' },
  { id: 'demo-tuantuan', nickname: '团团与圆圆', avatarEmoji: '🧶', bio: '双猫家庭，常年掉毛预警' },
  { id: 'demo-hui', nickname: '灰灰的仓库', avatarEmoji: '📦', bio: '爱拆快递箱的英短灰，箱子比玩具受欢迎' },
];

export const SEED_OFFICIAL_POSTS: SeedPost[] = [
  { id: 'seed-welcome', userId: 'pawly-official', topic: '日常', emoji: '🐾', bg: '#F4D7B0', hoursAgo: 150, title: '欢迎来到 Pawly 社区！', content: '这里是铲屎官们的分享角落：晒宠、好物安利、养宠求助都可以发。发帖可以传图（最多 9 张），也可以选一个表情封面。期待看到你家毛孩子～' },
  { id: 'seed-tips-buy', userId: 'pawly-official', topic: '好物', emoji: '🧶', bg: '#D3DEE2', hoursAgo: 128, title: '新手养猫最容易买错的三样东西', content: '1. 太小的猫窝——猫更爱纸箱；2. 带铃铛的项圈——大多数猫会应激；3. 劣质猫砂——粉尘大伤呼吸道。先从基础款买起，观察主子偏好再升级。', topics: ['新手养猫', '避坑'] },
  { id: 'seed-tips-help', userId: 'pawly-official', topic: '求助', emoji: '🩺', bg: '#E8D8C3', hoursAgo: 120, title: '发求助帖小提示', content: '描述症状时尽量写清：年龄、品种、持续时间、饮食变化。社区经验仅供参考，紧急情况请第一时间联系兽医！' },
];

export const SEED_DEMO_POSTS: SeedPost[] = [
  {
    id: 'seed-cat-day30', userId: 'demo-momo', topic: '晒宠', emoji: '🐱', bg: '#F7E2D4', hoursAgo: 96,
    title: '接猫第 30 天：从躲桌底到睡我枕头边',
    content: '刚接回来那周，糯米全天躲在书桌底下，喂冻干都要扔过去才肯吃。第二周开始肯在我看书的时候出来巡逻，第三周主动蹭腿，昨晚第一次跳上床睡在我枕头边。原来信任真的是一点点攒出来的，各位刚接猫的别急，给它时间。',
    topics: ['新手养猫', '布偶'], petName: '糯米',
    images: ['/images/community/cat-day30-1.jpg', '/images/community/cat-day30-2.jpg', '/images/community/cat-day30-3.jpg'],
  },
  {
    id: 'seed-dog-hike', userId: 'demo-doudou', topic: '日常', emoji: '🐕', bg: '#D6E4D0', hoursAgo: 72,
    title: '周末带豆豆去河边撒欢，捡球捡到不想回家',
    content: '天气好到犯规，带豆豆去了郊野公园的河滩。球扔出去二十多次，捡回来二十多次，最后趴在草地上不肯走，回家路上在后座睡成一滩。提醒大家：玩水后记得把耳朵擦干，金毛耳道闷容易发炎。',
    topics: ['遛狗日记', '金毛'], petName: '豆豆',
    images: ['/images/community/dog-hike-1.jpg', '/images/community/dog-hike-2.jpg'],
  },
  {
    id: 'seed-nail-trim', userId: 'demo-xiaolu', topic: '日常', emoji: '😺', bg: '#E3EAE0', hoursAgo: 68,
    title: '第一次独立给猫剪指甲成功！三个小心得',
    content: '之前每次剪指甲都是人猫大战，这次居然安静剪完了。心得：① 挑它刚睡醒迷糊的时候；② 用毛巾轻轻裹住只露一只爪；③ 每剪一根喂一小粒冻干，正向联想很重要。剪到血线前 2mm 就停，宁可剪短一点分几次剪。',
    topics: ['新手养猫', '日常护理'],
  },
  {
    id: 'seed-food-switch', userId: 'demo-tuantuan', topic: '好物', emoji: '🥣', bg: '#F4D7B0', hoursAgo: 50,
    title: '换粮 7 天过渡表，肠胃敏感猫亲测有效',
    content: '团团肠胃弱，直接换粮必拉稀，这套过渡节奏用了两次都平稳：D1-2 新粮 25%，D3-4 新粮 50%，D5-6 新粮 75%，D7 全新粮。中间任何一天软便就退回上一档多待两天。搭配益生菌更稳，换粮期间别再加新零食，变量太多查不出原因。',
    topics: ['喂养', '换粮'],
  },
  {
    id: 'seed-box-castle', userId: 'demo-hui', topic: '晒宠', emoji: '📦', bg: '#E7E0CB', hoursAgo: 44,
    title: '用三个快递箱给灰灰搭了个双层城堡',
    content: '买的猫窝闲置第 180 天，快递箱城堡开业第 1 天入住率 100%。做法很简单：两个大箱叠起来割个洞当楼梯，侧面开两个瞭望窗，胶带全部贴在外侧防止啃食。成本 0 元，主子满意度五颗星。',
    topics: ['低成本快乐', '英短'],
    images: ['/images/community/box-castle-1.jpg', '/images/community/box-castle-2.jpg'],
  },
  {
    id: 'seed-snack-diy', userId: 'demo-momo', topic: '好物', emoji: '🍗', bg: '#F2DDC1', hoursAgo: 26,
    title: '自制烘干鸡胸肉：翻车一次后的成功配方',
    content: '第一次 180 度烤 20 分钟，硬得能敲桌子……第二次改成 90 度低温烘 3 小时，成品干而不柴，撕开有肉香。只用鸡胸肉，不加任何调料，冷藏 3 天内吃完。省钱是真省钱，就是有点费人。',
    topics: ['自制零食'],
    images: ['/images/community/snack-diy-1.jpg'],
  },
  {
    id: 'seed-night-run', userId: 'demo-xiaolu', topic: '求助', emoji: '🐱', bg: '#C8DDE2', hoursAgo: 20,
    title: '猫咪半夜三点跑酷怎么办，在线等，挺急的',
    content: '每天凌晨三点准时开始满屋狂奔，从床头柜跳到窗帘再跳到我肚子上。白天看起来睡得挺多。有没有前辈支支招，人已经三天没睡好了。',
    topics: ['行为', '新手养猫'],
  },
  {
    id: 'seed-first-vet', userId: 'demo-doudou', topic: '日常', emoji: '🩺', bg: '#E8D8C3', hoursAgo: 8,
    title: '第一次带豆豆体检，流程和费用记录给大家参考',
    content: '常规体检项目：基础触诊+血常规+生化+耳道检查，全程约 40 分钟。建议提前预约避开周末高峰，空腹 8 小时抽血数值更准。医生说 3 岁以上建议每年一次体检，老年犬半年一次。费用因城市和项目差异较大，去之前先电话问清楚。',
    topics: ['体检', '宠物医院'], petName: '豆豆',
  },
  {
    id: 'seed-cat-daily', userId: 'demo-tuantuan', topic: '晒宠', emoji: '😺', bg: '#F7E2D4', hoursAgo: 3,
    title: '今日份猫片请查收，第三张是圆圆的毛线大战',
    content: '晴天的窗台是团团的专属工位，圆圆负责拆家。毛线球是新买的，寿命预计不超过一周。',
    topics: ['猫片'],
    images: ['/images/community/cat-daily-1.jpg', '/images/community/cat-daily-2.jpg', '/images/community/cat-daily-3.jpg', '/images/community/cat-daily-4.jpg'],
  },
];

export const SEED_COMMENTS: SeedComment[] = [
  { postId: 'seed-cat-day30', userId: 'demo-xiaolu', content: '太治愈了吧，我家的还在桌底阶段，看到希望了' },
  { postId: 'seed-cat-day30', userId: 'demo-tuantuan', content: '布偶真的黏人，恭喜转正成为合格猫奴' },
  { postId: 'seed-dog-hike', userId: 'demo-momo', content: '豆豆笑得好开心，河滩这段求定位！' },
  { postId: 'seed-night-run', userId: 'demo-momo', content: '白天多陪玩消耗精力，睡前喂一顿罐头，亲测有效' },
  { postId: 'seed-night-run', userId: 'demo-tuantuan', content: '我家也这样，一岁半之后自己就收敛了，熬过去就好' },
  { postId: 'seed-night-run', userId: 'pawly-official', content: '可以看看科普区「猫咪夜间活跃」相关文章，把喂食时间调到睡前也有帮助～' },
  { postId: 'seed-cat-daily', userId: 'pawly-official', content: '第三张毛线大战的抓拍绝了' },
];

// 点赞分布：谁赞了哪些帖（数字小而真实，符合新社区的量级）
export const SEED_LIKES: Array<{ postId: string; userIds: string[] }> = [
  { postId: 'seed-cat-day30', userIds: ['demo-doudou', 'demo-xiaolu', 'demo-tuantuan', 'pawly-official'] },
  { postId: 'seed-cat-daily', userIds: ['demo-momo', 'demo-doudou', 'demo-xiaolu', 'demo-hui', 'pawly-official'] },
  { postId: 'seed-dog-hike', userIds: ['demo-momo', 'demo-hui', 'pawly-official'] },
  { postId: 'seed-box-castle', userIds: ['demo-momo', 'demo-tuantuan', 'demo-xiaolu'] },
  { postId: 'seed-snack-diy', userIds: ['demo-doudou', 'demo-tuantuan'] },
  { postId: 'seed-food-switch', userIds: ['demo-xiaolu', 'demo-hui'] },
  { postId: 'seed-nail-trim', userIds: ['demo-momo'] },
  { postId: 'seed-night-run', userIds: ['demo-hui'] },
];
