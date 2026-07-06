// 后端业务服务层：所有业务操作的唯一入口（校验 + 调用数据层/Agent）。
// 两种运行模式共用同一张 op 表：
//  - 分离模式：server/index.ts 起独立进程，只监听内网，Next 侧经 HTTP 转发到这里
//  - 单体模式（Vercel 演示）：Next 的 API 路由经 lib/gateway.ts 直接进程内调用
import { prisma } from './db/prisma';
import { store } from './db/store';
import { runAgent } from './agent/runAgent';
import { sendLoginCode, verifyLoginCode, loginWithPhone, smsConfigured } from './auth';
import { petSnapshot, birthdayFromAgeMonths } from './pets';

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
    await ensureUser(userId);
    const post = await store.createPost(userId, {
      title,
      content,
      topic: POST_TOPICS.includes(b?.topic) ? b.topic : '日常',
      emoji: String(b?.emoji || 'paw').slice(0, 8),
      bg: /^#[0-9a-fA-F]{6}$/.test(b?.bg || '') ? b.bg : '#F4D7B0',
      petName: b?.petName ? String(b.petName).slice(0, 20) : null,
      nickname: b?.nickname ? String(b.nickname).slice(0, 20) : null,
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
      return await store.togglePostLike(userId, String(b.postId));
    } catch {
      throw new RpcError(404, '帖子不存在');
    }
  },

  // —— AI 客服 ——
  'chat.run': async (userId, b) => {
    await ensureUser(userId); // Agent 工具可能建档/下单，先保证用户行存在
    return runAgent(userId, Array.isArray(b?.messages) ? b.messages : []);
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
    if (!user?.phone) return { guest: true, nickname: user?.nickname || null };
    return {
      guest: false,
      nickname: user.nickname || null,
      phoneMasked: user.phone.slice(0, 3) + '****' + user.phone.slice(7),
    };
  },
};

export async function dispatch(op: string, userId: string, payload: any) {
  const handler = services[op];
  if (!handler) throw new RpcError(404, `未知操作: ${op}`);
  return handler(userId, payload);
}
