// 数据访问层（Prisma + Postgres）。商品共享；宠物/订单按用户隔离。
import { prisma } from './prisma';
import { PRODUCTS } from '@/lib/catalog';

// 把商品种子同步进数据库（幂等）：已存在的按 id 跳过，新增的自动插入。
// 用 skipDuplicates 而非"表为空才插"，这样以后新增商品也会自动补进已有的库。
let productsReady: Promise<void> | null = null;
function ensureProducts(): Promise<void> {
  if (!productsReady) {
    productsReady = (async () => {
      await prisma.product.createMany({
        // detail 仅前端展示用，不入库，这里剔除
        data: PRODUCTS.map(({ detail, ...p }) => ({ ...p, badges: JSON.stringify(p.badges) })),
        skipDuplicates: true,
      });
    })();
  }
  return productsReady;
}

function deserialize(p: any) {
  return { ...p, badges: JSON.parse(p.badges || '[]') as string[] };
}

// 早期版本发帖封面存的是手绘插画 id（'dog'/'cat'/'paw' 等纯文字），
// 后改为直接存 emoji 字符（图片渲染，跨平台一致）。这里把历史数据一次性转换，
// 避免已经跑过旧版本的环境里，老帖子封面显示成英文单词而不是图案。
const LEGACY_ILLO_TO_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', paw: '🐾', bone: '🦴', yarn: '🧶', bath: '🛁',
  food: '🥣', ball: '🎾', vet: '🩺', camera: '📷', heart: '🎁', home: '🏠',
};

// 社区首次访问：没有任何帖子时，用一个官方账号灌入几条示例帖，避免空荡荡的首屏。
// 与 ensureProducts 同样的"惰性初始化 + 幂等"思路（按官方昵称判存在）。
let communityReady: Promise<void> | null = null;
function ensureCommunitySeed(): Promise<void> {
  if (!communityReady) {
    communityReady = (async () => {
      await Promise.all(
        Object.entries(LEGACY_ILLO_TO_EMOJI).map(([illoId, emoji]) =>
          prisma.post.updateMany({ where: { emoji: illoId }, data: { emoji } }),
        ),
      );

      const count = await prisma.post.count();
      if (count > 0) return;
      const official = await prisma.user.upsert({
        where: { id: 'pawly-official' },
        update: {},
        create: { id: 'pawly-official', nickname: 'Pawly 官方' },
      });
      await prisma.post.createMany({
        data: [
          { userId: official.id, topic: '日常', emoji: '🐾', bg: '#F4D7B0', title: '欢迎来到 Pawly 社区！', content: '这里是铲屎官们的分享角落：晒宠、好物安利、养宠求助都可以发。发帖时可以选一个表情封面和底色，图片上传功能在路上啦～' },
          { userId: official.id, topic: '好物', emoji: '🧶', bg: '#D3DEE2', title: '新手养猫最容易买错的三样东西', content: '1. 太小的猫窝——猫更爱纸箱；2. 带铃铛的项圈——大多数猫会应激；3. 劣质猫砂——粉尘大伤呼吸道。先从基础款买起，观察主子偏好再升级。' },
          { userId: official.id, topic: '求助', emoji: '🩺', bg: '#E8D8C3', title: '发求助帖小提示', content: '描述症状时尽量写清：年龄、品种、持续时间、饮食变化。社区经验仅供参考，紧急情况请第一时间联系兽医！' },
        ],
        skipDuplicates: true,
      });
    })();
  }
  return communityReady;
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

export interface AddressInput {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
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

  // —— 社区：帖子全站共享，点赞/删除按用户隔离 ——
  async listPosts(viewerId: string, topic?: string) {
    await ensureCommunitySeed();
    const posts = await prisma.post.findMany({
      where: topic ? { topic } : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, nickname: true } },
        likes: { select: { userId: true } },
      },
    });
    return posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      topic: p.topic,
      emoji: p.emoji,
      bg: p.bg,
      petName: p.petName,
      createdAt: p.createdAt,
      author: p.user.nickname || '铲屎官' + p.user.id.slice(-4),
      mine: p.user.id === viewerId,
      likeCount: p.likes.length,
      likedByMe: p.likes.some((l) => l.userId === viewerId),
    }));
  },

  async createPost(userId: string, data: { title: string; content: string; topic: string; emoji: string; bg: string; petName?: string | null; nickname?: string | null }) {
    if (data.nickname?.trim()) {
      await prisma.user.update({ where: { id: userId }, data: { nickname: data.nickname.trim() } });
    }
    return prisma.post.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        topic: data.topic,
        emoji: data.emoji,
        bg: data.bg,
        petName: data.petName || null,
      },
    });
  },

  async deletePost(userId: string, postId: string) {
    // 只允许删自己的帖子
    return prisma.post.deleteMany({ where: { id: postId, userId } });
  },

  async togglePostLike(userId: string, postId: string) {
    const key = { userId_postId: { userId, postId } };
    const existing = await prisma.postLike.findUnique({ where: key });
    if (existing) {
      await prisma.postLike.delete({ where: key });
    } else {
      await prisma.postLike.create({ data: { userId, postId } });
    }
    const likeCount = await prisma.postLike.count({ where: { postId } });
    return { liked: !existing, likeCount };
  },

  // —— 收货地址：按用户隔离 ——
  async listAddresses(userId: string) {
    return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  },

  async upsertAddress(userId: string, data: AddressInput & { id?: string }) {
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      }
      const fields = {
        name: data.name, phone: data.phone, province: data.province, city: data.city,
        district: data.district, detail: data.detail, isDefault: !!data.isDefault,
      };
      if (data.id) {
        const existing = await tx.address.findFirst({ where: { id: data.id, userId } });
        if (!existing) throw new Error('地址不存在');
        return tx.address.update({ where: { id: data.id }, data: fields });
      }
      const created = await tx.address.create({ data: { ...fields, userId } });
      // 用户的第一条地址自动设为默认，省去手动勾选
      const count = await tx.address.count({ where: { userId } });
      if (count === 1 && !created.isDefault) {
        return tx.address.update({ where: { id: created.id }, data: { isDefault: true } });
      }
      return created;
    });
  },

  async deleteAddress(userId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const target = await tx.address.findFirst({ where: { id, userId } });
      if (!target) return { count: 0 };
      await tx.address.delete({ where: { id } });
      // 删掉的是默认地址且还有其他地址时，把最新的一条提升为默认
      if (target.isDefault) {
        const next = await tx.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
      return { count: 1 };
    });
  },

  async setDefaultAddress(userId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const target = await tx.address.findFirst({ where: { id, userId } });
      if (!target) throw new Error('地址不存在');
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: { isDefault: true } });
    });
  },

  // —— 订单：按用户隔离 ——
  // lines: [{id, qty}]；address 为下单时的收货信息快照
  async createOrder(
    userId: string,
    lines: { id: string; qty?: number }[],
    opts: { address?: object | null; delivery?: string | null; shipping?: number } = {},
  ) {
    const products = await store.getProductsByIds(lines.map((l) => l.id));
    const items = products.map((p) => {
      const qty = Math.max(1, Math.min(99, lines.find((l) => l.id === p.id)?.qty || 1));
      return { id: p.id, name: p.name, price: p.price, qty, emoji: p.emoji, bg: p.bg };
    });
    const total = items.reduce((s, i) => s + i.price * i.qty, 0) + (opts.shipping || 0);
    const order = await prisma.order.create({
      data: {
        userId,
        items: JSON.stringify(items),
        total,
        address: opts.address ? JSON.stringify(opts.address) : null,
        delivery: opts.delivery || null,
      },
    });
    return { orderId: order.id, total: order.total, status: order.status, items };
  },

  async listOrders(userId: string) {
    const orders = await prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return orders.map((o) => ({
      id: o.id,
      items: JSON.parse(o.items || '[]'),
      total: o.total,
      status: o.status,
      address: o.address ? JSON.parse(o.address) : null,
      delivery: o.delivery,
      createdAt: o.createdAt,
    }));
  },

  // —— AI 助手每日用量（会员额度）——
  async getChatUsage(userId: string, date: string) {
    const row = await prisma.chatUsage.findUnique({ where: { userId_date: { userId, date } } });
    return row?.count || 0;
  },

  async incrChatUsage(userId: string, date: string) {
    const row = await prisma.chatUsage.upsert({
      where: { userId_date: { userId, date } },
      update: { count: { increment: 1 } },
      create: { userId, date, count: 1 },
    });
    return row.count;
  },
};
