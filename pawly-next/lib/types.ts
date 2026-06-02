// 全站共用的数据类型

export interface Product {
  id: string;
  cat: string;
  pet: '狗' | '猫';
  emoji: string;
  bg: string;
  name: string;
  sub: string;
  price: number;
  was: number;
  rating: number;
  sold: number;
  tag: string | null;
  desc: string;
  badges: string[];
  stock: number; // 库存：决策时要校验，避免推荐缺货商品
}

export interface Pet {
  id: string;
  name: string;
  species: '狗' | '猫';
  breed: string;
  sex: '男' | '女';
  emoji: string;
  // ⭐ 关键：存"出生日期"而不是"年龄"。年龄永远靠它实时算，用户无需维护。
  birthday: string; // ISO 日期，如 '2023-06-01'
  weightKg: number;
  weightUpdatedAt: string; // 体重这种算不出来的字段，记录更新时间以判断是否过期
  notes: string;
}

export interface Proposal {
  title: string;
  badge: string;
  productIds: string[];
  reason: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResult {
  reply: string;
  proposals: Proposal[];
}
