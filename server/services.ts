// 后端业务服务层：所有业务操作的唯一入口（校验 + 调用数据层/Agent）。
// 两种运行模式共用同一张 op 表：
//  - 分离模式：server/index.ts 起独立进程，只监听内网，Next 侧经 HTTP 转发到这里
//  - 单体模式（Vercel 演示）：Next 的 API 路由经 lib/gateway.ts 直接进程内调用
import { prisma } from './db/prisma';
import { store, avatarUrlOf } from './db/store';
import { runAgent } from './agent/runAgent';
import { sendLoginCode, verifyLoginCode, loginWithPhone, smsConfigured } from './auth';
import { petSnapshot, birthdayFromAgeMonths } from './pets';
import { tokenMeter } from './tokenMeter';
import { findViolationIn } from './moderation';

// 业务错误：带 HTTP 状态码，网关层据此返回给前端
export class RpcError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 游客首次写数据时补建 User 行（cookie 里的 id 由前端层生成，不再依赖数据库发号）
async function ensureUser(id: string) {
  await prisma.user.upsert({ where: { id }, update: {}, create: { id } });
}

const POST_TOPICS = ['晒宠', '好物', '求助', '日常'];

// AI 助手每日额度：游客 5 次/天；手机号登录即为 Pawly Club 会员，30 次/天。
// 后续如分免费/付费会员，在 chatQuota 里按用户等级细分即可。
// 额度按 token 计（仅后台记录，不在前端展示）：游客每日 10 万，会员每日 100 万
const GUEST_CHAT_LIMIT = Number(process.env.GUEST_CHAT_TOKEN_LIMIT || 100_000);
const MEMBER_CHAT_LIMIT = Number(process.env.MEMBER_CHAT_TOKEN_LIMIT || 1_000_000);

const today = () => new Date().toISOString().slice(0, 10);

// 额度查询失败（如数据库尚未同步 ChatUsage 表）时放行而非拒绝服务：
// 计费/额度是增值能力，绝不能反过来把核心的 AI 客服打死。
async function chatQuota(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const member = !!user?.phone;
  const limit = member ? MEMBER_CHAT_LIMIT : GUEST_CHAT_LIMIT;
  try {
    const used = await store.getChatUsage(userId, today());
    return { member, limit, used, degraded: false };
  } catch (e: any) {
    console.error('[quota] 额度查询失败（放行处理）:', e?.message || e);
    return { member, limit, used: 0, degraded: true };
  }
}

type Handler = (userId: string, payload: any) => Promise<any>;

export const services: Record<string, Handler> = {
  // —— 商品 ——
  'products.list': async () => store.listProducts(),

  // —— 宠物档案 ——
  'pets.list': async (userId) => (await store.listPets(userId)).map((p) => petSnapshot(p)),

  'pets.upsert': async (userId, b) => {
    if (!b?.name || !b?.species) throw new RpcError(400, '缺少 name 或 species');
    await ensureUser(userId);
    const data: any = { name: b.name, species: b.species };
    if (b.breed) data.breed = b.breed;
    if (b.sex) data.sex = b.sex;
    if (b.notes) data.notes = b.notes;
    if (typeof b.weightKg === 'number') {
      data.weightKg = b.weightKg;
      data.weightUpdatedAt = new Date();
    }
    if (b.birthday) data.birthday = new Date(b.birthday);
    else if (typeof b.ageMonths === 'number') data.birthday = new Date(birthdayFromAgeMonths(b.ageMonths));
    return petSnapshot(await store.upsertPet(userId, data));
  },

  'pets.delete': async (userId, b) => {
    if (!b?.name) throw new RpcError(400, '缺少 name');
    await store.deletePet(userId, b.name);
    return { ok: true };
  },

  // —— 收货地址 ——
  'addresses.list': async (userId) => store.listAddresses(userId),

  'addresses.upsert': async (userId, b) => {
    const name = String(b?.name || '').trim();
    const phone = String(b?.phone || '').trim();
    const province = String(b?.province || '').trim();
    const city = String(b?.city || '').trim();
    const district = String(b?.district || '').trim();
    const detail = String(b?.detail || '').trim();
    if (!name || !phone || !province || !city || !district || !detail) {
      throw new RpcError(400, '请填写完整的收货信息');
    }
    if (!/^1\d{10}$/.test(phone)) throw new RpcError(400, '手机号格式不正确');
    await ensureUser(userId);
    return store.upsertAddress(userId, {
      id: b?.id ? String(b.id) : undefined,
      name, phone, province, city, district, detail,
      isDefault: !!b?.isDefault,
    });
  },

  'addresses.delete': async (userId, b) => {
    if (!b?.id) throw new RpcError(400, '缺少 id');
    const r = await store.deleteAddress(userId, String(b.id));
    if (r.count === 0) throw new RpcError(404, '地址不存在或不属于你');
    return { ok: true };
  },

  'addresses.setDefault': async (userId, b) => {
    if (!b?.id) throw new RpcError(400, '缺少 id');
    try {
      await store.setDefaultAddress(userId, String(b.id));
      return { ok: true };
    } catch {
      throw new RpcError(404, '地址不存在或不属于你');
    }
  },

  // —— 社区 ——
  'posts.list': async (userId, b) => {
    const topic = b?.topic && POST_TOPICS.includes(b.topic) ? b.topic : undefined;
    return store.listPosts(userId, topic);
  },

  'posts.create': async (userId, b) => {
    const title = String(b?.title || '').trim();
    const content = String(b?.content || '').trim();
    if (!title || !content) throw new RpcError(400, '标题和内容都不能为空');
    if (title.length > 40 || content.length > 1000) throw new RpcError(400, '标题最多 40 字，内容最多 1000 字');
    const hit = findViolationIn(title, content);
    if (hit) throw new RpcError(400, `内容包含违规词「${hit}」，请修改后再发布`);
    // 图片：最多 9 张，每张 dataURL 压缩后 ≤ 600KB（客户端已压缩，这里兜底）
    const images = (Array.isArray(b?.images) ? b.images : [])
      .filter((x: any) => typeof x === 'string' && (x.startsWith('data:image/') || x.startsWith('http')))
      .slice(0, 9);
    if (images.some((x: string) => x.length > 600_000)) throw new RpcError(400, '图片过大，请重新选择');
    // 话题标签：最多 5 个，每个 ≤ 16 字
    const topics = (Array.isArray(b?.topics) ? b.topics : [])
      .map((t: any) => String(t).replace(/^#/, '').trim().slice(0, 16))
      .filter(Boolean)
      .slice(0, 5);
    if (findViolationIn(...topics)) throw new RpcError(400, '话题包含违规词，请修改');
    await ensureUser(userId);
    const post = await store.createPost(userId, {
      title,
      content,
      topic: POST_TOPICS.includes(b?.topic) ? b.topic : '日常',
      emoji: String(b?.emoji || '🐾').slice(0, 8),
      bg: /^#[0-9a-fA-F]{6}$/.test(b?.bg || '') ? b.bg : '#F4D7B0',
      petName: b?.petName ? String(b.petName).slice(0, 20) : null,
      nickname: b?.nickname ? String(b.nickname).slice(0, 20) : null,
      images,
      topics,
    });
    return { ok: true, id: post.id };
  },

  'posts.delete': async (userId, b) => {
    if (!b?.id) throw new RpcError(400, '缺少 id');
    const r = await store.deletePost(userId, String(b.id));
    if (r.count === 0) throw new RpcError(404, '帖子不存在或不是你发布的');
    return { ok: true };
  },

  'posts.like': async (userId, b) => {
    if (!b?.postId) throw new RpcError(400, '缺少 postId');
    await ensureUser(userId);
    try {
      const r = await store.togglePostLike(userId, String(b.postId));
      if (r.liked) {
        // 点赞通知（尽力而为，不影响主流程）
        try {
          const post = await prisma.post.findUnique({ where: { id: String(b.postId) }, select: { userId: true, title: true } });
          const actor = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
          if (post) await store.createNotification({
            userId: post.userId, type: 'like', actorId: userId,
            actorName: actor?.nickname || '铲屎官' + userId.slice(-4),
            postId: String(b.postId), content: `赞了你的帖子「${post.title.slice(0, 20)}」`,
          });
        } catch {}
      }
      return r;
    } catch {
      throw new RpcError(404, '帖子不存在');
    }
  },

  'posts.get': async (userId, b) => {
    if (!b?.id) throw new RpcError(400, '缺少 id');
    const post = await store.getPost(String(b.id), userId);
    if (!post) throw new RpcError(404, '帖子不存在');
    return post;
  },

  // —— 帖子检索（全站搜索用）——
  'posts.search': async (userId, b) => {
    const q = String(b?.q || '').trim();
    if (!q) return [];
    return store.searchPosts(userId, q.slice(0, 30));
  },

  // —— 评论 ——
  'comments.list': async (userId, b) => {
    if (!b?.postId) throw new RpcError(400, '缺少 postId');
    return store.listComments(String(b.postId), userId);
  },

  'comments.create': async (userId, b) => {
    const content = String(b?.content || '').trim();
    if (!b?.postId) throw new RpcError(400, '缺少 postId');
    if (!content) throw new RpcError(400, '评论不能为空');
    if (content.length > 500) throw new RpcError(400, '评论最多 500 字');
    const hit = findViolationIn(content);
    if (hit) throw new RpcError(400, `评论包含违规词「${hit}」，请修改后再发送`);
    await ensureUser(userId);
    const c = await store.createComment(userId, {
      postId: String(b.postId), content,
      parentId: b?.parentId ? String(b.parentId) : null,
      replyTo: b?.replyTo ? String(b.replyTo).slice(0, 20) : null,
    });
    // 通知帖主（尽力而为）
    try {
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
      await store.createNotification({
        userId: c.post.userId, type: 'comment', actorId: userId,
        actorName: actor?.nickname || '铲屎官' + userId.slice(-4),
        postId: String(b.postId), content: `评论了「${c.post.title.slice(0, 16)}」：${content.slice(0, 30)}`,
      });
    } catch {}
    return { ok: true, id: c.id };
  },

  'comments.delete': async (userId, b) => {
    if (!b?.id) throw new RpcError(400, '缺少 id');
    const r = await store.deleteComment(userId, String(b.id));
    if (r.count === 0) throw new RpcError(404, '评论不存在或不是你发布的');
    return { ok: true };
  },

  // —— 关注与主页 ——
  'follow.toggle': async (userId, b) => {
    const target = String(b?.userId || '');
    if (!target) throw new RpcError(400, '缺少 userId');
    if (target === userId) throw new RpcError(400, '不能关注自己');
    await ensureUser(userId);
    const r = await store.toggleFollow(userId, target);
    if (r.following) {
      try {
        const actor = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
        await store.createNotification({
          userId: target, type: 'follow', actorId: userId,
          actorName: actor?.nickname || '铲屎官' + userId.slice(-4),
          content: '关注了你',
        });
      } catch {}
    }
    return r;
  },

  'profile.get': async (userId, b) => {
    const target = String(b?.userId || userId);
    const profile = await store.getProfile(target, userId);
    if (!profile) throw new RpcError(404, '用户不存在');
    const posts = await store.listUserPosts(target, userId);
    return { ...profile, posts };
  },

  'profile.update': async (userId, b) => {
    const nickname = b?.nickname !== undefined ? String(b.nickname).trim().slice(0, 20) : undefined;
    const bio = b?.bio !== undefined ? String(b.bio).trim().slice(0, 60) : undefined;
    const avatarEmoji = b?.avatarEmoji !== undefined ? String(b.avatarEmoji).slice(0, 8) : undefined;
    const location = b?.location !== undefined ? String(b.location).trim().slice(0, 20) : undefined;

    // 性别：仅接受三个枚举值，空串表示"不展示"
    let gender: string | null | undefined;
    if (b?.gender !== undefined) {
      const g = String(b.gender || '');
      if (g && !['female', 'male', 'other'].includes(g)) throw new RpcError(400, '性别取值不合法');
      gender = g || null;
    }

    // 生日：YYYY-MM-DD，空串表示清空；限制在合理区间内
    let birthday: Date | null | undefined;
    if (b?.birthday !== undefined) {
      const raw = String(b.birthday || '').trim();
      if (!raw) birthday = null;
      else {
        const d = new Date(raw + 'T00:00:00Z');
        if (Number.isNaN(d.getTime())) throw new RpcError(400, '生日格式不正确');
        const year = d.getUTCFullYear();
        if (year < 1900 || d.getTime() > Date.now()) throw new RpcError(400, '生日超出合理范围');
        birthday = d;
      }
    }

    // 头像照片：压缩后的 dataURL，空串表示改回 emoji 头像
    let avatarUrl: string | null | undefined;
    if (b?.avatarUrl !== undefined) {
      const raw = String(b.avatarUrl || '');
      if (!raw) avatarUrl = null;
      else {
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(raw)) throw new RpcError(400, '头像格式不支持');
        if (raw.length > 400_000) throw new RpcError(400, '头像文件过大，请换一张');
        avatarUrl = raw;
      }
    }

    const hit = findViolationIn(nickname, bio, location);
    if (hit) throw new RpcError(400, `包含违规词「${hit}」，请修改`);
    await ensureUser(userId);
    return store.updateProfile(userId, { nickname, avatarEmoji, bio, gender, birthday, location, avatarUrl });
  },

  // 头像图片本体（由 /api/avatar 解码返回；公开可读，无需登录）
  'profile.avatar': async (_userId, b) => ({ dataUrl: await store.getAvatar(String(b?.userId || '')) }),

  // 粉丝 / 关注 名单
  'profile.follows': async (userId, b) => {
    const target = String(b?.userId || userId);
    const kind = b?.kind === 'following' ? 'following' : 'followers';
    return { users: await store.listFollowUsers(target, userId, kind) };
  },

  // 收藏与赞过：只允许查看自己的（与小红书一致，他人主页不暴露）
  'profile.collection': async (userId, b) => {
    const kind = b?.kind === 'liked' ? 'liked' : 'favorites';
    const posts = kind === 'liked'
      ? await store.listLikedPosts(userId, userId)
      : await store.listFavoritePosts(userId, userId);
    return { posts };
  },

  'posts.favorite': async (userId, b) => {
    const postId = String(b?.postId || '');
    if (!postId) throw new RpcError(400, '缺少 postId');
    await ensureUser(userId);
    return store.toggleFavorite(userId, postId);
  },

  // —— 通知 ——
  'notifications.list': async (userId) => store.listNotifications(userId),
  'notifications.unread': async (userId) => ({ count: await store.unreadNotificationCount(userId) }),
  'notifications.read': async (userId) => store.markNotificationsRead(userId),

  // —— 商品评价 / 晒单 ——
  'reviews.list': async (userId, b) => {
    if (!b?.productId) throw new RpcError(400, '缺少 productId');
    return store.listReviews(String(b.productId), userId);
  },

  'reviews.create': async (userId, b) => {
    const rating = Math.min(5, Math.max(1, Number(b?.rating) || 5));
    const content = String(b?.content || '').trim();
    if (!b?.productId) throw new RpcError(400, '缺少 productId');
    if (!content) throw new RpcError(400, '评价内容不能为空');
    if (content.length > 500) throw new RpcError(400, '评价最多 500 字');
    const hit = findViolationIn(content);
    if (hit) throw new RpcError(400, `评价包含违规词「${hit}」，请修改`);
    const images = (Array.isArray(b?.images) ? b.images : [])
      .filter((x: any) => typeof x === 'string' && (x.startsWith('data:image/') || x.startsWith('http')))
      .slice(0, 9);
    if (images.some((x: string) => x.length > 600_000)) throw new RpcError(400, '图片过大，请重新选择');
    await ensureUser(userId);
    const products = await store.getProductsByIds([String(b.productId)]);
    if (!products.length) throw new RpcError(404, '商品不存在');
    // 勾选"同步到社区"：自动生成一条 #晒单 帖子
    let postId: string | null = null;
    if (b?.syncPost) {
      const post = await store.createPost(userId, {
        title: `${'★'.repeat(rating)} ${products[0].name}`.slice(0, 40),
        content,
        topic: '好物',
        emoji: products[0].emoji,
        bg: products[0].bg,
        images,
        topics: ['晒单'],
      });
      postId = post.id;
    }
    const review = await store.createReview(userId, { productId: String(b.productId), rating, content, images, postId });
    return { ok: true, id: review.id, postId };
  },

  // —— 签到与积分 ——
  'checkin.status': async (userId) => {
    await ensureUser(userId);
    return store.getCheckinStatus(userId, today());
  },

  'checkin.do': async (userId) => {
    await ensureUser(userId);
    const status = await store.getCheckinStatus(userId, today());
    if (status.done) return { ok: false, ...status };
    // 基础 5 分；连续第 7 天起每次 10 分
    const reward = status.streak >= 6 ? 10 : 5;
    const r = await store.doCheckin(userId, today(), reward);
    if (!r) return { ok: false, ...status };
    const after = await store.getCheckinStatus(userId, today());
    return { ok: true, reward, ...after };
  },

  // —— AI 对话历史 ——
  'chat.history': async (userId) => store.listChatMessages(userId),

  // —— 健康提醒：按宠物档案生日推算疫苗/驱虫/体检节奏 ——
  'reminders.list': async (userId) => {
    const pets = await store.listPets(userId);
    const done = await store.listReminderDone(userId);
    const now = new Date();
    const items: any[] = [];
    for (const pet of pets) {
      const isCatDog = pet.species === '狗' || pet.species === '猫';
      // 年度疫苗加强 + 年度体检：按生日周年推算；无生日则按自然年
      const year = now.getFullYear();
      let annualDue: Date;
      if (pet.birthday) {
        annualDue = new Date(pet.birthday);
        annualDue.setFullYear(year);
        if (annualDue < now) annualDue.setFullYear(year + 1);
      } else {
        annualDue = new Date(year, 11, 31);
      }
      if (isCatDog) {
        const vKey = `${pet.id}:vaccine:${annualDue.getFullYear()}`;
        items.push({ petId: pet.id, petName: pet.name, type: 'vaccine', label: '年度疫苗加强（遵医嘱确认针次）', due: annualDue, key: vKey, done: done.has(vKey) });
      }
      const cKey = `${pet.id}:checkup:${annualDue.getFullYear()}`;
      items.push({ petId: pet.id, petName: pet.name, type: 'checkup', label: '年度基础体检', due: annualDue, key: cKey, done: done.has(cKey) });
      if (isCatDog) {
        // 体内驱虫：每 3 个月（按自然季度）；体外驱虫：每月
        const q = Math.floor(now.getMonth() / 3);
        const qDue = new Date(now.getFullYear(), q * 3 + 2, 28);
        const qKey = `${pet.id}:deworm-in:${now.getFullYear()}-Q${q + 1}`;
        items.push({ petId: pet.id, petName: pet.name, type: 'deworm-in', label: `本季度体内驱虫（Q${q + 1}）`, due: qDue, key: qKey, done: done.has(qKey) });
        const mDue = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const mKey = `${pet.id}:deworm-out:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        items.push({ petId: pet.id, petName: pet.name, type: 'deworm-out', label: `本月体外驱虫（${now.getMonth() + 1} 月）`, due: mDue, key: mKey, done: done.has(mKey) });
      }
    }
    // 未完成在前，按到期时间升序
    items.sort((a, b2) => Number(a.done) - Number(b2.done) || +new Date(a.due) - +new Date(b2.due));
    return items;
  },

  'reminders.toggle': async (userId, b) => {
    if (!b?.key) throw new RpcError(400, '缺少 key');
    await ensureUser(userId);
    return store.toggleReminderDone(userId, String(b.key));
  },

  // —— AI 客服（带每日额度）——
  'chat.run': async (userId, b) => {
    await ensureUser(userId); // Agent 工具可能建档/下单，先保证用户行存在
    const q = await chatQuota(userId);
    if (q.used >= q.limit) {
      return {
        reply: q.member
          ? '今天的 AI 使用量已经到上限啦，明天再来找我玩吧 🐾'
          : '今天的免费 AI 使用量用完啦～登录成为 Pawly Club 会员即可继续畅聊（会员页 → 手机号登录）',
        proposals: [],
      };
    }
    // 用 tokenMeter 包住 Agent 执行，精确累计本次消耗的 token（deepseek.ts 上报）；
    // 成功才计量：模型故障时不冤枉扣用户额度；计量失败也不影响回复送达
    const meter = { total: 0 };
    const result = await tokenMeter.run(meter, () => runAgent(userId, Array.isArray(b?.messages) ? b.messages : []));
    try {
      await store.incrChatUsage(userId, today(), Math.max(1, meter.total));
    } catch (e: any) {
      console.error('[quota] 额度计量失败（忽略）:', e?.message || e);
    }
    // 保存对话历史（尽力而为）：最后一条用户消息 + 助手回复
    try {
      const msgs = Array.isArray(b?.messages) ? b.messages : [];
      const lastUser = [...msgs].reverse().find((m: any) => m?.role === 'user');
      const toSave: Array<{ role: string; content: string }> = [];
      if (lastUser?.content) toSave.push({ role: 'user', content: String(lastUser.content).slice(0, 2000) });
      if ((result as any)?.reply) toSave.push({ role: 'assistant', content: String((result as any).reply).slice(0, 4000) });
      await store.appendChatMessages(userId, toSave);
    } catch (e: any) {
      console.error('[chat] 历史保存失败（忽略）:', e?.message || e);
    }
    return result;
  },

  // —— 订单 ——
  'orders.list': async (userId) => store.listOrders(userId),

  'orders.create': async (userId, b) => {
    const lines = Array.isArray(b?.items) ? b.items.filter((l: any) => l?.id) : [];
    if (!lines.length) throw new RpcError(400, '订单里没有商品');
    await ensureUser(userId);
    let address: object | null = null;
    if (b?.addressId) {
      const addr = (await store.listAddresses(userId)).find((a) => a.id === b.addressId);
      if (!addr) throw new RpcError(400, '收货地址不存在');
      address = { name: addr.name, phone: addr.phone, province: addr.province, city: addr.city, district: addr.district, detail: addr.detail };
    }
    return store.createOrder(
      userId,
      lines.map((l: any) => ({ id: String(l.id), qty: Number(l.qty) || 1 })),
      { address, delivery: b?.delivery === 'express' ? 'express' : 'standard', shipping: Number(b?.shipping) || 0 },
    );
  },

  // —— 登录 ——
  'auth.sendCode': async (_userId, b) => {
    const r = await sendLoginCode(String(b?.phone || ''));
    if (!r.ok) throw new RpcError(400, r.error);
    return r;
  },

  'auth.login': async (userId, b) => {
    const phone = String(b?.phone || '');
    if (!/^1\d{10}$/.test(phone)) throw new RpcError(400, '手机号格式不正确');
    // 短信服务商开通前免验证码直登（仅手机号）；配置 SMS_* 后自动恢复验证码校验
    if (smsConfigured()) {
      const check = await verifyLoginCode(phone, String(b?.code || ''));
      if (!check.ok) throw new RpcError(400, check.error);
    }
    const finalUserId = await loginWithPhone(phone, userId);
    return { ok: true, userId: finalUserId, phone };
  },

  'auth.me': async (userId) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // 额度只在后台记录（ChatUsage 表），不向前端透出数字
    const pub = {
      id: userId,
      nickname: user?.nickname || null,
      avatarEmoji: user?.avatarEmoji || null,
      avatarUrl: user ? avatarUrlOf(user) : null,
      bio: user?.bio || null,
      gender: user?.gender || null,
      birthday: user?.birthday || null,
      location: user?.location || null,
      points: user?.points || 0,
    };
    if (!user?.phone) return { guest: true, ...pub };
    return {
      guest: false,
      ...pub,
      phoneMasked: user.phone.slice(0, 3) + '****' + user.phone.slice(7),
    };
  },

};

export async function dispatch(op: string, userId: string, payload: any) {
  const handler = services[op];
  if (!handler) throw new RpcError(404, `未知操作: ${op}`);
  return handler(userId, payload);
}
