// 商品种子数据（首次访问由 store.ts 自动灌入数据库）。
// 这是全站唯一的商品数据源：前端展示(components/data.js 再导出)与后端 Agent 都用它。
import type { Product } from '../types';

export const PRODUCTS: Product[] = [
  // —— 主粮 ——
  { id: 'p1', cat: 'food', pet: '狗', emoji: '🥣', bg: '#F4D7B0', name: '冷压低温烘焙鲜粮 · 鸡肉口味', sub: '1.5kg | 全年龄段', price: 168, was: 198, rating: 4.9, sold: 12480, tag: '畅销', desc: '85% 高鲜肉占比，低温慢烤锁住营养。无谷物、无诱食剂，挑嘴狗也愿意吃。', badges: ['85% 鲜肉', '无谷物', '小颗粒'], stock: 320 },
  { id: 'p2', cat: 'food', pet: '猫', emoji: '🐟', bg: '#C8DDE2', name: '深海鱼冻干生骨肉主食粮', sub: '500g | 成猫', price: 138, was: 158, rating: 4.8, sold: 8932, tag: '新品', desc: '80% 深海鱼+鸡肉，添加牛磺酸与卵磷脂，适口性好。', badges: ['冻干生骨肉', '高蛋白', '含牛磺酸'], stock: 210 },
  { id: 'p17', cat: 'food', pet: '狗', emoji: '🍐', bg: '#E7E0CB', name: '鸭肉梨低敏全价犬粮', sub: '2kg | 全犬通用', price: 158, was: 188, rating: 4.7, sold: 3120, tag: null, desc: '单一动物蛋白来源（鸭肉），搭配梨纤维，适合易过敏、挑食的狗狗。', badges: ['单一蛋白', '无谷物', '易消化'], stock: 160 },
  { id: 'p18', cat: 'food', pet: '猫', emoji: '🍗', bg: '#F2DDC1', name: '鸡肉冻干双拼无谷猫粮', sub: '1.5kg | 全猫龄', price: 178, was: 208, rating: 4.8, sold: 5240, tag: '畅销', desc: '膨化粮裹冻干，鸡肉占比高，颗粒小好咀嚼。', badges: ['冻干双拼', '无谷物', '高蛋白'], stock: 190 },
  { id: 'p19', cat: 'food', pet: '狗', emoji: '🐑', bg: '#E4D2BD', name: '羊肉糙米中大型犬粮', sub: '5kg | 中大型犬', price: 235, was: 279, rating: 4.6, sold: 2180, tag: null, desc: '羊肉为主，搭配糙米与南瓜，颗粒偏大适合中大型犬。', badges: ['大颗粒', '含益生元', '控泪痕'], stock: 95 },
  { id: 'p20', cat: 'food', pet: '猫', emoji: '🍼', bg: '#F7E2D4', name: '幼猫奶糕高能成长粮', sub: '1kg | 1岁以下', price: 128, was: 148, rating: 4.9, sold: 4310, tag: '编辑推荐', desc: '高蛋白高能量配方，颗粒细小，可泡软喂食，适合断奶幼猫。', badges: ['幼猫专用', '高能量', '可泡软'], stock: 175 },

  // —— 零食 ——
  { id: 'p3', cat: 'snack', pet: '狗', emoji: '🦴', bg: '#E8C39E', name: '低温慢烤鸡胸肉条', sub: '120g × 3 包', price: 39, was: 49, rating: 4.9, sold: 23105, tag: '回购王', desc: '只有鸡胸肉和一点点海盐，撕开就闻得到香味。训练奖励首选。', badges: ['单一原料', '无添加', '高蛋白'], stock: 540 },
  { id: 'p4', cat: 'snack', pet: '猫', emoji: '🍤', bg: '#F7CDB5', name: '冻干虾仁猫零食', sub: '40g × 2 罐', price: 49, was: 59, rating: 4.7, sold: 6712, tag: null, desc: '一整只虾仁直接冻干，咬下去咔嚓响，开罐就来。', badges: ['整虾冻干', '低钠', '0 添加'], stock: 180 },
  { id: 'p15', cat: 'snack', pet: '狗', emoji: '🥩', bg: '#E8BCA8', name: '牦牛奶酪磨牙棒', sub: 'L 号 | 中大型犬', price: 58, was: 78, rating: 4.7, sold: 5621, tag: null, desc: '高原牦牛奶天然发酵，质地硬实，适合爱啃咬的狗狗。', badges: ['天然牦牛奶', '高蛋白', '耐啃'], stock: 0 },
  { id: 'p21', cat: 'snack', pet: '狗', emoji: '🦆', bg: '#E8D2D2', name: '风干鸭肉条', sub: '100g × 2 包', price: 35, was: 45, rating: 4.8, sold: 9870, tag: null, desc: '低脂鸭肉风干而成，肉质有嚼劲，适合做日常奖励。', badges: ['低脂', '单一原料', '有嚼劲'], stock: 420 },
  { id: 'p22', cat: 'snack', pet: '猫', emoji: '🍗', bg: '#F0E4CB', name: '冻干鸡肉粒', sub: '50g | 全猫龄', price: 42, was: 52, rating: 4.9, sold: 13240, tag: '热销', desc: '纯鸡胸肉冻干切粒，可直接喂或拌粮增加适口性。', badges: ['纯鸡胸', '0 添加', '可拌粮'], stock: 360 },
  { id: 'p23', cat: 'snack', pet: '狗', emoji: '🍪', bg: '#EBDDC4', name: '洁齿磨牙饼干', sub: '200g | 小型犬', price: 32, was: 39, rating: 4.6, sold: 4520, tag: null, desc: '螺旋造型增加摩擦，啃咬时帮助清洁牙齿表面。', badges: ['洁齿造型', '低糖', '酥脆'], stock: 280 },
  { id: 'p24', cat: 'snack', pet: '猫', emoji: '🌿', bg: '#D5E0CC', name: '猫薄荷洁齿球', sub: '6 颗装', price: 26, was: 32, rating: 4.7, sold: 7650, tag: null, desc: '内含猫薄荷，啃咬时帮助清洁牙齿，也能解闷。', badges: ['含猫薄荷', '洁齿', '解闷'], stock: 330 },

  // —— 玩具 ——
  { id: 'p5', cat: 'toy', pet: '狗', emoji: '🎾', bg: '#D6E4D0', name: '弹跳浮水训练球 · 三只装', sub: 'M 号 | 中型犬', price: 35, was: 45, rating: 4.8, sold: 15420, tag: null, desc: '天然橡胶耐咬，浮水材质适合户外捡球，表面颗粒按摩牙龈。', badges: ['天然橡胶', '浮水', '耐咬'], stock: 260 },
  { id: 'p6', cat: 'toy', pet: '猫', emoji: '🪶', bg: '#E2D5E4', name: '逗猫棒大套装（含 7 替换头）', sub: '伸缩 1.2m', price: 29, was: 39, rating: 4.9, sold: 19833, tag: '热销', desc: '碳纤维杆轻便，鱼/羽毛/铃铛替换头齐全。每天陪玩几分钟，消耗精力。', badges: ['7 替换头', '伸缩杆', '静音'], stock: 400 },
  { id: 'p16', cat: 'toy', pet: '狗', emoji: '🦆', bg: '#EBDDC4', name: '发声鸭子毛绒玩具', sub: '25cm', price: 29, was: 39, rating: 4.9, sold: 18712, tag: null, desc: '捏一下响一下，藏耳朵/抛接/磨牙三合一，能玩很久。', badges: ['静音橡胶哨', '可机洗', '抗撕咬'], stock: 300 },
  { id: 'p25', cat: 'toy', pet: '狗', emoji: '🧩', bg: '#D9E2E9', name: '漏食益智慢食球', sub: 'M 号 | 通用', price: 45, was: 59, rating: 4.7, sold: 6230, tag: null, desc: '把零食塞进去让狗狗滚动取食，延缓进食、消耗脑力。', badges: ['益智', '慢食', '可拆洗'], stock: 210 },
  { id: 'p26', cat: 'toy', pet: '猫', emoji: '🎠', bg: '#E1DED4', name: '电动逗猫转盘', sub: 'USB 充电', price: 69, was: 89, rating: 4.6, sold: 5120, tag: null, desc: '羽毛随机转动，自动模式让猫咪独自也能玩，主人不在家也不无聊。', badges: ['自动模式', 'USB 充电', '静音电机'], stock: 140 },
  { id: 'p27', cat: 'toy', pet: '狗', emoji: '🦴', bg: '#E4D2BD', name: '耐咬橡胶骨头', sub: 'L 号 | 中大型犬', price: 38, was: 48, rating: 4.7, sold: 8940, tag: null, desc: '食品级橡胶，软硬适中，可塞零食，适合拆家期的精力释放。', badges: ['食品级橡胶', '可塞零食', '耐咬'], stock: 250 },
  { id: 'p28', cat: 'toy', pet: '猫', emoji: '🕳️', bg: '#D3DEE2', name: '可折叠猫隧道玩具', sub: '三通道 | 可折叠', price: 55, was: 69, rating: 4.8, sold: 4760, tag: null, desc: '三通道设计满足钻洞天性，不用时可折叠收纳，带响纸更带感。', badges: ['三通道', '可折叠', '带响纸'], stock: 170 },

  // —— 洗护 ——
  { id: 'p7', cat: 'wash', pet: '狗', emoji: '🫧', bg: '#CCE0E5', name: '氨基酸温和洗护沐浴露', sub: '500ml | 全犬通用', price: 79, was: 99, rating: 4.7, sold: 5430, tag: null, desc: '弱酸性配方，温和不刺激，淡淡白茶香，易冲洗不残留。', badges: ['氨基酸', '低敏', '易冲洗'], stock: 150 },
  { id: 'p8', cat: 'wash', pet: '猫', emoji: '🧴', bg: '#F0E4CB', name: '免洗干洗泡沫慕斯', sub: '180ml | 猫狗通用', price: 59, was: 69, rating: 4.6, sold: 4221, tag: null, desc: '搓揉后自然蒸发，适合不便水洗的日子。无酒精、无香精。', badges: ['免水洗', '无酒精', '温和'], stock: 130 },
  { id: 'p29', cat: 'wash', pet: '狗', emoji: '🧻', bg: '#E7E0CB', name: '祛味除菌宠物湿巾', sub: '80 抽 × 3 包', price: 36, was: 46, rating: 4.8, sold: 11200, tag: '回购王', desc: '加厚珍珠纹，擦爪子、擦屁屁、清洁眼周都好用，外出常备。', badges: ['加厚', '温和配方', '便携'], stock: 480 },
  { id: 'p30', cat: 'wash', pet: '猫', emoji: '👂', bg: '#D5E0CC', name: '宠物温和洁耳液', sub: '120ml | 猫狗通用', price: 45, was: 55, rating: 4.6, sold: 3980, tag: null, desc: '滴入后轻揉耳根，软化耳垢便于清理，配合棉片日常护理。', badges: ['温和', '易清理', '日常护理'], stock: 200 },
  { id: 'p31', cat: 'wash', pet: '狗', emoji: '✨', bg: '#D9C5B0', name: '蓬松顺滑护毛素', sub: '400ml | 长毛犬', price: 69, was: 85, rating: 4.7, sold: 2640, tag: null, desc: '洗澡后使用，减少打结、梳毛更顺滑，适合长毛犬。', badges: ['顺滑', '减少打结', '长毛适用'], stock: 120 },

  // —— 外出 ——
  { id: 'p9', cat: 'out', pet: '狗', emoji: '🎒', bg: '#D9C5B0', name: '通勤外出胸背带 · 反光款', sub: 'S / M / L', price: 89, was: 119, rating: 4.8, sold: 9120, tag: null, desc: '人体工学剪裁，胸背受力均匀；夜跑反光条，金属扣更稳固。', badges: ['反光', '透气', '受力均匀'], stock: 90 },
  { id: 'p10', cat: 'out', pet: '猫', emoji: '🧳', bg: '#D3DEE2', name: '太空舱外出猫包', sub: '<8kg | 透气网窗', price: 199, was: 259, rating: 4.7, sold: 3812, tag: null, desc: '360° 透气窗，地铁通勤好用；可拆洗内垫，到家变猫窝。', badges: ['航空认证', '可拆洗', '透气'], stock: 60 },
  { id: 'p32', cat: 'out', pet: '狗', emoji: '🥤', bg: '#CCE0E5', name: '便携折叠饮水杯', sub: '350ml | 硅胶', price: 28, was: 36, rating: 4.8, sold: 14300, tag: '畅销', desc: '一键挤水，硅胶折叠不占地，遛弯随时给狗狗补水。', badges: ['可折叠', '食品级硅胶', '一键给水'], stock: 520 },
  { id: 'p33', cat: 'out', pet: '猫', emoji: '🎒', bg: '#E2D5E4', name: '双肩透气宠物背包', sub: '<6kg | 通用', price: 159, was: 199, rating: 4.6, sold: 2870, tag: null, desc: '大网窗通风，可扩展空间，双肩背更省力，适合带猫出门。', badges: ['大网窗', '可扩展', '双肩省力'], stock: 110 },
  { id: 'p34', cat: 'out', pet: '狗', emoji: '🦮', bg: '#E8C39E', name: '自动伸缩牵引绳', sub: '5m | <25kg', price: 49, was: 65, rating: 4.7, sold: 10560, tag: null, desc: '一键刹车锁定，3m/5m 可控，带夜间反光线，遛狗更省心。', badges: ['一键刹车', '反光线', '防缠绕'], stock: 300 },

  // —— 家居 ——
  { id: 'p11', cat: 'home', pet: '狗', emoji: '🛏️', bg: '#E4D2BD', name: '记忆棉骨头形态狗窝', sub: 'M 60×45cm', price: 159, was: 219, rating: 4.9, sold: 7345, tag: '编辑推荐', desc: '慢回弹记忆棉支撑，外罩可机洗，狗毛容易清理。', badges: ['记忆棉', '可水洗', '防滑底'], stock: 70 },
  { id: 'p12', cat: 'home', pet: '猫', emoji: '🏠', bg: '#E1DED4', name: '猫抓板沙发 · 双层瓦楞', sub: '50×25×18cm', price: 119, was: 149, rating: 4.8, sold: 6611, tag: null, desc: '双层加密瓦楞纸，能磨爪也能趴卧，附赠一小包猫薄荷。', badges: ['加密瓦楞', '送猫薄荷', '少木屑'], stock: 110 },
  { id: 'p35', cat: 'home', pet: '猫', emoji: '🚽', bg: '#D3DEE2', name: '半封闭防溅猫砂盆', sub: '大号 | 含猫砂铲', price: 89, was: 115, rating: 4.7, sold: 5430, tag: null, desc: '高围挡减少带砂外溅，入口低方便进出，附磁吸猫砂铲。', badges: ['防外溅', '低入口', '送砂铲'], stock: 130 },
  { id: 'p36', cat: 'home', pet: '狗', emoji: '🧺', bg: '#D6E4D0', name: '可拆洗四季宠物垫', sub: 'M / L 两色', price: 79, was: 99, rating: 4.6, sold: 4120, tag: null, desc: '正反两面四季可用，拉链外罩可拆机洗，防滑底不乱跑。', badges: ['双面四季', '可拆洗', '防滑'], stock: 160 },

  // —— 保健 ——
  { id: 'p13', cat: 'health', pet: '狗', emoji: '💊', bg: '#D9E2E9', name: '关节守护片 · 氨糖软骨素', sub: '60 片', price: 128, was: 168, rating: 4.7, sold: 4520, tag: null, desc: '含氨糖与软骨素，适合 7 岁以上老年犬日常关节养护。具体用量建议咨询兽医。', badges: ['氨糖', '软骨素', '老犬适用'], stock: 140 },
  { id: 'p14', cat: 'health', pet: '猫', emoji: '🌿', bg: '#D5E0CC', name: '化毛膏 · 三文鱼味', sub: '120g', price: 49, was: 69, rating: 4.8, sold: 8210, tag: null, desc: '麦芽天然纤维，帮助猫咪日常排出舔入的毛发。适口性好。', badges: ['天然麦芽', '三文鱼味', '无色素'], stock: 230 },
  { id: 'p37', cat: 'health', pet: '猫', emoji: '🦠', bg: '#CCE0E5', name: '益生菌肠胃调理粉', sub: '2g × 30 包', price: 88, was: 108, rating: 4.7, sold: 6340, tag: '畅销', desc: '复合益生菌，换粮、应激期可拌粮辅助肠胃。如持续软便请就医。', badges: ['复合益生菌', '可拌粮', '独立包装'], stock: 240 },
  { id: 'p38', cat: 'health', pet: '狗', emoji: '🧴', bg: '#E7E0CB', name: '复合维生素营养膏', sub: '120g | 全犬通用', price: 56, was: 72, rating: 4.6, sold: 3760, tag: null, desc: '多种维生素与微量元素，挑食、换毛季可作日常营养补充。', badges: ['多种维生素', '适口性好', '日常补充'], stock: 190 },
];
