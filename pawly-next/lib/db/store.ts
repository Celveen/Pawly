// 数据访问层（Prisma + SQLite）。商品共享；宠物/订单按用户隔离。
import { prisma } from './prisma';
import { PRODUCTS } from './seed';

// 首次访问时把商品种子灌入数据库（幂等）
let productsReady: Promise<void> | null = null;
function ensureProducts(): Promise<void> {
  if (!productsReady) {
    productsReady = (async () => {
      const count = await prisma.product.count();
      if (count === 0) {
        await prisma.product.createMany({
          data: PRODUCTS.map((p) => ({ ...p, badges: JSON.stringify(p.badges) })),
        });
      }
    })();
  }
  return productsReady;
}

function deserialize(p: any) {
  return { ...p, badges: JSON.parse(p.badges || '[]') as string[] };
}

export interface PetInput {
  name: string;
  species: string;
  breed?: string | null;
  sex?: string | null;
  birthday?: Date | null;
  weightKg?: number | null;
  weightUpdatedAt?: Date | null;
  notes?: string | null;
}

export const store = {
  async listProducts() {
    await ensureProducts();
    return (await prisma.product.findMany()).map(deserialize);
  },

  async searchProducts(opts: { keyword?: string; species?: string; category?: string; maxPrice?: number; inStockOnly?: boolean } = {}) {
    await ensureProducts();
    const where: any = {};
    if (opts.species) where.pet = opts.species;
    if (opts.category) where.cat = opts.category;
    if (typeof opts.maxPrice === 'number') where.price = { lte: opts.maxPrice };
    if (opts.inStockOnly) where.stock = { gt: 0 };
    let list = (await prisma.product.findMany({ where })).map(deserialize);
    const kw = opts.keyword?.trim();
    if (kw) {
      list = list.filter((p) => `${p.name} ${p.desc} ${p.badges.join(' ')} ${p.cat}`.includes(kw));
    }
    return list;
  },

  async getProductsByIds(ids: string[]) {
    await ensureProducts();
    const list = (await prisma.product.findMany({ where: { id: { in: ids } } })).map(deserialize);
    return ids.map((id) => list.find((p) => p.id === id)).filter(Boolean) as ReturnType<typeof deserialize>[];
  },

  // —— 宠物：按用户隔离 ——
  async listPets(userId: string) {
    return prisma.pet.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  },

  async getPet(userId: string, name?: string) {
    return prisma.pet.findMany({ where: { userId, ...(name ? { name } : {}) } });
  },

  // 同名则更新，否则新建（Agent 与表单都用它）
  async upsertPet(userId: string, data: PetInput) {
    const existing = await prisma.pet.findFirst({ where: { userId, name: data.name } });
    if (existing) {
      return prisma.pet.update({ where: { id: existing.id }, data });
    }
    return prisma.pet.create({ data: { ...data, userId } });
  },

  async deletePet(userId: string, name: string) {
    return prisma.pet.deleteMany({ where: { userId, name } });
  },

  // —— 订单：按用户隔离 ——
  async createOrder(userId: string, productIds: string[]) {
    const items = await store.getProductsByIds(productIds);
    const total = items.reduce((s, p) => s + p.price, 0);
    const order = await prisma.order.create({
      data: { userId, items: JSON.stringify(items.map((i) => ({ id: i.id, name: i.name, price: i.price }))), total },
    });
    return { orderId: order.id, total: order.total, status: order.status, items };
  },
};
