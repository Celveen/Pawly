// 数据访问层（Prisma + Postgres）。商品共享；宠物/订单按用户隔离。
import { prisma } from './prisma';
import { PRODUCTS } from './seed';

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

// 社区首次访问：没有任何帖子时，用一个官方账号灌入几条示例帖，避免空荡荡的首屏。
// 与 ensureProducts 同样的"惰性初始化 + 幂等"思路（按官方昵称判存在）。
let communityReady: Promise<void> | null = null;
function ensureCommunitySeed(): Promise<void> {
  if (!communityReady) {
    communityReady = (async () => {
      const count = await prisma.post.count();
      if (count > 0) return;
      const official = await prisma.user.upsert({
        where: { id: 'pawly-official' },
        update: {},
        create: { id: 'pawly-official', nickname: 'Pawly 官方' },
      });
      await prisma.post.createMany({
        data: [
          { userId: official.id, topic: '日常', emoji: '👋', bg: '#F4D7B0', title: '欢迎来到 Pawly 社区！', content: '这里是铲屎官们的分享角落：晒宠、好物安利、养宠求助都可以发。发帖时可以选一个 emoji 和底色做封面，图片上传功能在路上啦～' },
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
