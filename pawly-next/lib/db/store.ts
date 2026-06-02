// 数据访问层（骨架：内存实现）
// ⭐ 上线时把这一层换成真实数据库（PostgreSQL/Prisma），上层 API 和 Agent 完全不用改。
import type { Product, Pet } from '../types';
import { PRODUCTS, PETS } from './seed';

let products = [...PRODUCTS];
let pets = [...PETS];
let orderSeq = 1000;

export const store = {
  listProducts(): Product[] {
    return products;
  },

  // 商品检索：替代"把整库塞进上下文"。Agent 通过它按需取数。
  searchProducts(opts: { keyword?: string; species?: '狗' | '猫'; category?: string; maxPrice?: number; inStockOnly?: boolean } = {}): Product[] {
    const kw = opts.keyword?.trim();
    return products.filter((p) => {
      if (opts.species && p.pet !== opts.species) return false;
      if (opts.category && p.cat !== opts.category) return false;
      if (typeof opts.maxPrice === 'number' && p.price > opts.maxPrice) return false;
      if (opts.inStockOnly && p.stock <= 0) return false;
      if (kw) {
        const hay = `${p.name} ${p.desc} ${p.badges.join(' ')} ${p.cat}`;
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  },

  getProductsByIds(ids: string[]): Product[] {
    return ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[];
  },

  listPets(): Pet[] {
    return pets;
  },

  getPet(name?: string): Pet[] {
    if (!name) return pets;
    return pets.filter((p) => p.name === name);
  },

  updatePetWeight(name: string, weightKg: number): Pet | null {
    const pet = pets.find((p) => p.name === name);
    if (!pet) return null;
    pet.weightKg = weightKg;
    pet.weightUpdatedAt = new Date().toISOString().slice(0, 10);
    return pet;
  },

  // 创建待支付订单（不扣款，付款由用户在结算页确认）
  createOrder(productIds: string[]): { orderId: string; items: Product[]; total: number; status: string } {
    const items = store.getProductsByIds(productIds);
    const total = items.reduce((s, p) => s + p.price, 0);
    return { orderId: `PW${Date.now()}-${++orderSeq}`, items, total, status: 'pending_payment' };
  },
};
