// 商品种子数据（首次访问由 store.ts 自动灌入数据库）。
// 宠物不再写死——改为每个真实用户自己录入。
import type { Product } from '../types';

export const PRODUCTS: Product[] = [
  { id: 'p1', cat: 'food', pet: '狗', emoji: '🥣', bg: '#F4D7B0', name: '冷压低温烘焙鲜粮 · 鸡肉口味', sub: '1.5kg | 全年龄段', price: 168, was: 198, rating: 4.9, sold: 12480, tag: '畅销', desc: '85% 高鲜肉占比，低温慢烤锁住营养。无谷物、无诱食剂。', badges: ['85% 鲜肉', '无谷物', '小颗粒'], stock: 320 },
  { id: 'p2', cat: 'food', pet: '猫', emoji: '🐟', bg: '#C8DDE2', name: '深海鱼冻干生骨肉主食粮', sub: '500g | 成猫', price: 138, was: 158, rating: 4.8, sold: 8932, tag: '新品', desc: '80% 深海鱼+鸡肉，添加牛磺酸与卵磷脂。', badges: ['冻干生骨肉', '高蛋白', '化毛'], stock: 210 },
  { id: 'p3', cat: 'snack', pet: '狗', emoji: '🦴', bg: '#E8C39E', name: '低温慢烤鸡胸肉条', sub: '120g × 3 包', price: 39, was: 49, rating: 4.9, sold: 23105, tag: '回购王', desc: '只有鸡胸肉和一点点海盐。训练奖励首选。', badges: ['单一原料', '无添加', '高蛋白'], stock: 540 },
  { id: 'p4', cat: 'snack', pet: '猫', emoji: '🍤', bg: '#F7CDB5', name: '冻干虾仁猫零食', sub: '40g × 2 罐', price: 49, was: 59, rating: 4.7, sold: 6712, tag: null, desc: '一整只虾仁直接冻干，咬下去咔嚓响。', badges: ['整虾冻干', '低钠', '0 添加'], stock: 180 },
  { id: 'p5', cat: 'toy', pet: '狗', emoji: '🎾', bg: '#D6E4D0', name: '弹跳浮水训练球 · 三只装', sub: 'M 号 | 中型犬', price: 35, was: 45, rating: 4.8, sold: 15420, tag: null, desc: '天然橡胶，咬不烂；浮水材质，游泳必备。', badges: ['天然橡胶', '浮水', '耐咬'], stock: 260 },
  { id: 'p6', cat: 'toy', pet: '猫', emoji: '🪶', bg: '#E2D5E4', name: '逗猫棒大套装（含 7 替换头）', sub: '伸缩 1.2m', price: 29, was: 39, rating: 4.9, sold: 19833, tag: '热销', desc: '碳纤维杆轻，鱼/羽毛/铃铛全配齐。', badges: ['7 替换头', '伸缩杆', '静音'], stock: 400 },
  { id: 'p7', cat: 'wash', pet: '狗', emoji: '🫧', bg: '#CCE0E5', name: '氨基酸温和洗护沐浴露', sub: '500ml | 全犬通用', price: 79, was: 99, rating: 4.7, sold: 5430, tag: null, desc: '弱酸性配方，敏感肌也能用。', badges: ['氨基酸', '低敏', '易冲洗'], stock: 150 },
  { id: 'p8', cat: 'wash', pet: '猫', emoji: '🧴', bg: '#F0E4CB', name: '免洗干洗泡沫慕斯', sub: '180ml | 猫狗通用', price: 59, was: 69, rating: 4.6, sold: 4221, tag: null, desc: '搓揉自然蒸发，无酒精、无香精。', badges: ['免水洗', '无酒精', '婴儿级'], stock: 130 },
  { id: 'p9', cat: 'out', pet: '狗', emoji: '🎒', bg: '#D9C5B0', name: '通勤外出胸背带 · 反光款', sub: 'S / M / L', price: 89, was: 119, rating: 4.8, sold: 9120, tag: null, desc: '人体工学剪裁，胸背不勒；夜跑反光条。', badges: ['反光', '透气', '防爆冲'], stock: 90 },
  { id: 'p10', cat: 'out', pet: '猫', emoji: '🧳', bg: '#D3DEE2', name: '太空舱外出猫包', sub: '<8kg | 透气网窗', price: 199, was: 259, rating: 4.7, sold: 3812, tag: null, desc: '360° 大视野透气窗；可拆洗内垫。', badges: ['航空认证', '可拆洗', '透气'], stock: 60 },
  { id: 'p11', cat: 'home', pet: '狗', emoji: '🛏️', bg: '#E4D2BD', name: '记忆棉骨头形态狗窝', sub: 'M 60×45cm', price: 159, was: 219, rating: 4.9, sold: 7345, tag: '编辑推荐', desc: '慢回弹记忆棉，老年犬关节友好。', badges: ['记忆棉', '可水洗', '防滑底'], stock: 70 },
  { id: 'p12', cat: 'home', pet: '猫', emoji: '🏠', bg: '#E1DED4', name: '猫抓板沙发 · 双层瓦楞', sub: '50×25×18cm', price: 119, was: 149, rating: 4.8, sold: 6611, tag: null, desc: '双层加密瓦楞纸，能磨爪也能睡。', badges: ['加密瓦楞', '送猫薄荷', '少木屑'], stock: 110 },
  { id: 'p13', cat: 'health', pet: '狗', emoji: '💊', bg: '#D9E2E9', name: '关节守护片 · 氨糖软骨素', sub: '60 片', price: 128, was: 168, rating: 4.7, sold: 4520, tag: null, desc: '7 岁以上老年犬必备，髋/膝关节双重养护。', badges: ['氨糖', '软骨素', '老犬专用'], stock: 140 },
  { id: 'p14', cat: 'health', pet: '猫', emoji: '🌿', bg: '#D5E0CC', name: '化毛膏 · 三文鱼味', sub: '120g', price: 49, was: 69, rating: 4.8, sold: 8210, tag: null, desc: '麦芽天然纤维，温和促排毛球。', badges: ['天然麦芽', '三文鱼味', '不添加色素'], stock: 230 },
  { id: 'p15', cat: 'snack', pet: '狗', emoji: '🥩', bg: '#E8BCA8', name: '牦牛奶酪磨牙棒', sub: 'L 号 | 中大型犬', price: 58, was: 78, rating: 4.7, sold: 5621, tag: null, desc: '高原牦牛奶天然发酵，硬到磨牙、香到上头。', badges: ['天然牦牛奶', '高蛋白', '清洁牙齿'], stock: 0 },
  { id: 'p16', cat: 'toy', pet: '狗', emoji: '🦆', bg: '#EBDDC4', name: '发声鸭子毛绒玩具', sub: '25cm', price: 29, was: 39, rating: 4.9, sold: 18712, tag: null, desc: '捏一下嘎一下，藏耳朵/抛接/磨牙三合一。', badges: ['静音橡胶哨', '可机洗', '抗撕咬'], stock: 300 },
];
