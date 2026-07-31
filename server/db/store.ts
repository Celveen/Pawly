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

// 社区首次访问：灌入官方账号 + 一批示例用户/帖子/评论/点赞，避免空荡荡的首屏。
// 幂等：以 demo-momo 示例用户是否存在为标记，只灌一次（老库升级也会补灌新示例内容）。
import { SEED_USERS, SEED_OFFICIAL_POSTS, SEED_DEMO_POSTS, SEED_COMMENTS, SEED_LIKES } from './community-seed';

let communityReady: Promise<void> | null = null;
function ensureCommunitySeed(): Promise<void> {
  if (!communityReady) {
    communityReady = (async () => {
      await Promise.all(
        Object.entries(LEGACY_ILLO_TO_EMOJI).map(([illoId, emoji]) =>
          prisma.post.updateMany({ where: { emoji: illoId }, data: { emoji } }),
        ),
      );

      const marker = await prisma.user.findUnique({ where: { id: 'demo-momo' } });
      if (marker) return;

      const official = await prisma.user.upsert({
        where: { id: 'pawly-official' },
        update: { avatarEmoji: '🐾', bio: 'Pawly 小编，分享靠谱养宠知识' },
        create: { id: 'pawly-official', nickname: 'Pawly 官方', avatarEmoji: '🐾', bio: 'Pawly 小编，分享靠谱养宠知识' },
      });
      for (const u of SEED_USERS) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: { nickname: u.nickname, avatarEmoji: u.avatarEmoji, bio: u.bio },
          create: { id: u.id, nickname: u.nickname, avatarEmoji: u.avatarEmoji, bio: u.bio },
        });
      }

      // 老库可能已有旧版官方 3 帖（无 id 标记）：官方还没有帖子时才补官方帖
      const officialPostCount = await prisma.post.count({ where: { userId: official.id } });
      const now = Date.now();
      const toRow = (p: (typeof SEED_DEMO_POSTS)[number]) => ({
        id: p.id, userId: p.userId, topic: p.topic, title: p.title, content: p.content,
        emoji: p.emoji, bg: p.bg, petName: p.petName ?? null,
        topics: p.topics ? JSON.stringify(p.topics) : null,
        images: p.images ? JSON.stringify(p.images) : null,
        createdAt: new Date(now - p.hoursAgo * 3600_000),
      });
      const rows = [...(officialPostCount === 0 ? SEED_OFFICIAL_POSTS : []), ...SEED_DEMO_POSTS].map(toRow);
      await prisma.post.createMany({ data: rows, skipDuplicates: true });
      await prisma.comment.createMany({
        data: SEED_COMMENTS.map((c, i) => ({
          postId: c.postId, userId: c.userId, content: c.content,
          createdAt: new Date(now - 3600_000 + i * 60_000),
        })),
        skipDuplicates: true,
      });
      await prisma.postLike.createMany({
        data: SEED_LIKES.flatMap((l) => l.userIds.map((uid) => ({ userId: uid, postId: l.postId }))),
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
      where: { status: 'visible', ...(topic ? { topic } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, nickname: true, avatarEmoji: true } },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });
    return posts.map((p) => serializePost(p, viewerId, true));
  },

  // 单帖详情（带全部图片；列表为省流量只带封面）
  async getPost(postId: string, viewerId: string) {
    const p = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, nickname: true, avatarEmoji: true } },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });
    return p ? serializePost(p, viewerId) : null;
  },

  // 关键词检索帖子（标题/正文/话题），供全站搜索使用
  async searchPosts(viewerId: string, keyword: string) {
    await ensureCommunitySeed();
    const posts = await prisma.post.findMany({
      where: {
        status: 'visible',
        OR: [
          { title: { contains: keyword } },
          { content: { contains: keyword } },
          { topics: { contains: keyword } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        user: { select: { id: true, nickname: true, avatarEmoji: true } },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });
    return posts.map((p) => serializePost(p, viewerId, true));
  },

  // 某用户的帖子（对外主页）
  async listUserPosts(targetUserId: string, viewerId: string) {
    const posts = await prisma.post.findMany({
      where: { userId: targetUserId, status: 'visible' },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        user: { select: { id: true, nickname: true, avatarEmoji: true } },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });
    return posts.map((p) => serializePost(p, viewerId, true));
  },

  async createPost(userId: string, data: { title: string; content: string; topic: string; emoji: string; bg: string; petName?: string | null; nickname?: string | null; images?: string[]; topics?: string[] }) {
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
        images: data.images?.length ? JSON.stringify(data.images) : null,
        topics: data.topics?.length ? JSON.stringify(data.topics) : null,
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

  async incrChatUsage(userId: string, date: string, by = 1) {
    const row = await prisma.chatUsage.upsert({
      where: { userId_date: { userId, date } },
      update: { count: { increment: by } },
      create: { userId, date, count: by },
    });
    return row.count;
  },

  // —— 评论（一层回复）——
  async listComments(postId: string, viewerId: string) {
    const rows = await prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, nickname: true, avatarEmoji: true } } },
    });
    return rows.map((c) => ({
      id: c.id,
      content: c.content,
      parentId: c.parentId,
      replyTo: c.replyTo,
      createdAt: c.createdAt,
      authorId: c.user.id,
      author: c.user.nickname || '铲屎官' + c.user.id.slice(-4),
      authorAvatar: c.user.avatarEmoji || '👤',
      mine: c.user.id === viewerId,
    }));
  },

  async createComment(userId: string, data: { postId: string; content: string; parentId?: string | null; replyTo?: string | null }) {
    return prisma.comment.create({
      data: { userId, postId: data.postId, content: data.content, parentId: data.parentId || null, replyTo: data.replyTo || null },
      include: { post: { select: { userId: true, title: true } } },
    });
  },

  async deleteComment(userId: string, id: string) {
    // 作者本人可删；顶层评论删除时连带其回复
    const c = await prisma.comment.findUnique({ where: { id } });
    if (!c || c.userId !== userId) return { count: 0 };
    await prisma.comment.deleteMany({ where: { OR: [{ id }, { parentId: id }] } });
    return { count: 1 };
  },

  // —— 关注 ——
  async toggleFollow(followerId: string, followeeId: string) {
    const key = { followerId_followeeId: { followerId, followeeId } };
    const existing = await prisma.follow.findUnique({ where: key });
    if (existing) await prisma.follow.delete({ where: key });
    else await prisma.follow.create({ data: { followerId, followeeId } });
    const followers = await prisma.follow.count({ where: { followeeId } });
    return { following: !existing, followers };
  },

  async getProfile(targetUserId: string, viewerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, nickname: true, avatarEmoji: true, bio: true, createdAt: true },
    });
    if (!user) return null;
    const [followers, following, postCount, isFollowing] = await Promise.all([
      prisma.follow.count({ where: { followeeId: targetUserId } }),
      prisma.follow.count({ where: { followerId: targetUserId } }),
      prisma.post.count({ where: { userId: targetUserId, status: 'visible' } }),
      prisma.follow.findUnique({ where: { followerId_followeeId: { followerId: viewerId, followeeId: targetUserId } } }),
    ]);
    return {
      id: user.id,
      nickname: user.nickname || '铲屎官' + user.id.slice(-4),
      avatarEmoji: user.avatarEmoji || '👤',
      bio: user.bio || '',
      joinedAt: user.createdAt,
      followers,
      following,
      postCount,
      isFollowing: !!isFollowing,
      isSelf: targetUserId === viewerId,
    };
  },

  async updateProfile(userId: string, data: { nickname?: string; avatarEmoji?: string; bio?: string }) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.nickname !== undefined ? { nickname: data.nickname || null } : {}),
        ...(data.avatarEmoji !== undefined ? { avatarEmoji: data.avatarEmoji || null } : {}),
        ...(data.bio !== undefined ? { bio: data.bio || null } : {}),
      },
      select: { nickname: true, avatarEmoji: true, bio: true },
    });
  },

  // —— 通知 ——
  async createNotification(data: { userId: string; type: string; actorId?: string | null; actorName?: string | null; postId?: string | null; content?: string | null }) {
    // 自己触发给自己的动作不生成通知
    if (data.actorId && data.actorId === data.userId) return null;
    return prisma.notification.create({ data: { ...data, actorId: data.actorId || null } });
  },

  async listNotifications(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 30 });
  },

  async unreadNotificationCount(userId: string) {
    return prisma.notification.count({ where: { userId, read: false } });
  },

  async markNotificationsRead(userId: string) {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { ok: true };
  },

  // —— 商品评价 ——
  async listReviews(productId: string, viewerId: string) {
    const rows = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { id: true, nickname: true, avatarEmoji: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      images: r.images ? JSON.parse(r.images) : [],
      createdAt: r.createdAt,
      authorId: r.user.id,
      author: r.user.nickname || '铲屎官' + r.user.id.slice(-4),
      authorAvatar: r.user.avatarEmoji || '👤',
      mine: r.user.id === viewerId,
    }));
  },

  async createReview(userId: string, data: { productId: string; rating: number; content: string; images?: string[]; postId?: string | null }) {
    return prisma.review.create({
      data: {
        userId,
        productId: data.productId,
        rating: data.rating,
        content: data.content,
        images: data.images?.length ? JSON.stringify(data.images) : null,
        postId: data.postId || null,
      },
    });
  },

  // —— 签到与积分 ——
  async getCheckinStatus(userId: string, today: string) {
    const [todayRow, user, recent] = await Promise.all([
      prisma.checkIn.findUnique({ where: { userId_date: { userId, date: today } } }),
      prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
      prisma.checkIn.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 30 }),
    ]);
    // 连续天数：从今天（或昨天）往前数连续的日期
    let streak = 0;
    const dates = new Set(recent.map((r) => r.date));
    const d = new Date();
    if (!dates.has(today)) d.setDate(d.getDate() - 1); // 今天没签，从昨天起算
    for (let i = 0; i < 30; i++) {
      const key = d.toISOString().slice(0, 10);
      if (dates.has(key)) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return { done: !!todayRow, streak, points: user?.points || 0 };
  },

  async doCheckin(userId: string, today: string, reward: number) {
    try {
      await prisma.checkIn.create({ data: { userId, date: today } });
    } catch {
      return null; // 已签过（主键冲突）
    }
    const user = await prisma.user.update({ where: { id: userId }, data: { points: { increment: reward } }, select: { points: true } });
    return { points: user.points };
  },

  // —— AI 对话历史 ——
  async listChatMessages(userId: string, take = 60) {
    const rows = await prisma.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take });
    return rows.reverse().map((m) => ({ role: m.role, text: m.content }));
  },

  async appendChatMessages(userId: string, msgs: Array<{ role: string; content: string }>) {
    if (!msgs.length) return;
    await prisma.chatMessage.createMany({ data: msgs.map((m) => ({ userId, role: m.role, content: m.content })) });
  },

  // —— 健康提醒完成标记 ——
  async listReminderDone(userId: string) {
    const rows = await prisma.reminderDone.findMany({ where: { userId } });
    return new Set(rows.map((r) => r.key));
  },

  async toggleReminderDone(userId: string, key: string) {
    const pk = { userId_key: { userId, key } };
    const existing = await prisma.reminderDone.findUnique({ where: pk });
    if (existing) { await prisma.reminderDone.delete({ where: pk }); return { done: false }; }
    await prisma.reminderDone.create({ data: { userId, key } });
    return { done: true };
  },
};

// 帖子序列化（列表/搜索/主页共用）。light=true 时 images 只保留封面首图，
// 避免列表接口把整组 dataURL 图片全量下发（页面体积会成倍膨胀）。
function serializePost(p: any, viewerId: string, light = false) {
  const allImages = p.images ? JSON.parse(p.images) : [];
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    topic: p.topic,
    topics: p.topics ? JSON.parse(p.topics) : [],
    images: light ? allImages.slice(0, 1) : allImages,
    imagesCount: allImages.length,
    emoji: p.emoji,
    bg: p.bg,
    petName: p.petName,
    createdAt: p.createdAt,
    authorId: p.user.id,
    author: p.user.nickname || '铲屎官' + p.user.id.slice(-4),
    authorAvatar: p.user.avatarEmoji || '👤',
    mine: p.user.id === viewerId,
    likeCount: p.likes.length,
    likedByMe: p.likes.some((l: any) => l.userId === viewerId),
    commentCount: p._count?.comments ?? 0,
  };
}
