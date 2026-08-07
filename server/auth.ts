// 手机号验证码登录。
// 短信通道可插拔：配置了 SMS_* 环境变量则走真实短信（接入阿里云/腾讯云时实现 sendSms），
// 未配置时为开发模式——验证码直接随接口返回（devCode），方便本地与演示环境联调。
import { createHash, randomInt, randomBytes } from 'crypto';
import { prisma } from './db/prisma';

const CODE_TTL_MS = 5 * 60 * 1000; // 5 分钟有效
const RESEND_GAP_MS = 60 * 1000; // 60 秒内不重发
const MAX_TRIES = 5;

const isValidPhone = (p: string) => /^1\d{10}$/.test(p);

function hashCode(phone: string, code: string) {
  // 加入 AUTH_SECRET 防止拿到库也能离线枚举 6 位数字
  const secret = process.env.AUTH_SECRET || 'pawly-dev-secret';
  return createHash('sha256').update(`${phone}:${code}:${secret}`).digest('hex');
}

export const smsConfigured = () => !!process.env.SMS_ACCESS_KEY_ID;

async function sendSms(phone: string, code: string) {
  // TODO: 接入真实短信服务商（阿里云短信/腾讯云 SMS），需要已备案签名与模板。
  // 当前项目尚未申请短信签名，先抛错提醒配置问题。
  throw new Error('短信服务商尚未接入，请先移除 SMS_ACCESS_KEY_ID 使用开发模式');
}

export async function sendLoginCode(phone: string): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  if (!isValidPhone(phone)) return { ok: false, error: '手机号格式不正确' };

  const existing = await prisma.phoneCode.findUnique({ where: { phone } });
  if (existing && Date.now() - existing.sentAt.getTime() < RESEND_GAP_MS) {
    return { ok: false, error: '发送太频繁，请稍后再试' };
  }

  const code = String(randomInt(100000, 1000000));
  await prisma.phoneCode.upsert({
    where: { phone },
    update: { codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + CODE_TTL_MS), sentAt: new Date(), tries: 0 },
    create: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  if (smsConfigured()) {
    await sendSms(phone, code);
    return { ok: true };
  }
  // 开发模式：验证码随响应返回，由前端展示
  return { ok: true, devCode: code };
}

export async function verifyLoginCode(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidPhone(phone)) return { ok: false, error: '手机号格式不正确' };
  const rec = await prisma.phoneCode.findUnique({ where: { phone } });
  if (!rec) return { ok: false, error: '请先获取验证码' };
  if (rec.expiresAt.getTime() < Date.now()) return { ok: false, error: '验证码已过期，请重新获取' };
  if (rec.tries >= MAX_TRIES) return { ok: false, error: '错误次数过多，请重新获取验证码' };
  if (rec.codeHash !== hashCode(phone, code.trim())) {
    await prisma.phoneCode.update({ where: { phone }, data: { tries: { increment: 1 } } });
    return { ok: false, error: '验证码不正确' };
  }
  await prisma.phoneCode.delete({ where: { phone } });
  return { ok: true };
}

// 宝狸号：8 位可读短码。去掉容易看混的 0/O/1/I/l，方便口头报号与手输。
const PAWLY_ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function randomPawlyId() {
  const bytes = randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i++) out += PAWLY_ID_ALPHABET[bytes[i] % PAWLY_ID_ALPHABET.length];
  return out;
}

// 生成并占用一个未被使用的宝狸号（撞了就重试，几乎不会发生）
export async function assignPawlyId(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { pawlyId: true } });
  if (existing?.pawlyId) return existing.pawlyId;
  for (let i = 0; i < 8; i++) {
    const candidate = randomPawlyId();
    const taken = await prisma.user.findUnique({ where: { pawlyId: candidate }, select: { id: true } });
    if (taken) continue;
    try {
      await prisma.user.update({ where: { id: userId }, data: { pawlyId: candidate } });
      return candidate;
    } catch { /* 并发下撞唯一键：换一个再来 */ }
  }
  throw new Error('宝狸号生成失败，请重试');
}

// 判断某个用户记录是否只是"游客"（没有绑定任何账号）
const isGuest = (u: { phone?: string | null; email?: string | null } | null) => !!u && !u.phone && !u.email;

// 把游客产生的数据并入正式账号，然后删除游客记录
async function mergeGuestInto(guestId: string, accountId: string) {
  const guest = await prisma.user.findUnique({ where: { id: guestId } });
  const account = await prisma.user.findUnique({ where: { id: accountId } });
  if (!guest || !account || !isGuest(guest)) return;

  await prisma.$transaction(async (tx) => {
    await tx.pet.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.order.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.post.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.address.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.comment.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.review.updateMany({ where: { userId: guestId }, data: { userId: accountId } });
    await tx.chatMessage.updateMany({ where: { userId: guestId }, data: { userId: accountId } });

    // 复合主键的表直接 updateMany 会撞键：先按新用户补写，再清掉游客残留
    const likes = await tx.postLike.findMany({ where: { userId: guestId } });
    if (likes.length) {
      await tx.postLike.createMany({ data: likes.map((l) => ({ userId: accountId, postId: l.postId })), skipDuplicates: true });
      await tx.postLike.deleteMany({ where: { userId: guestId } });
    }
    const favs = await tx.postFavorite.findMany({ where: { userId: guestId } });
    if (favs.length) {
      await tx.postFavorite.createMany({ data: favs.map((f) => ({ userId: accountId, postId: f.postId })), skipDuplicates: true });
      await tx.postFavorite.deleteMany({ where: { userId: guestId } });
    }

    // 昵称等资料：账号侧为空时才用游客的补上，不覆盖已有资料
    const patch: Record<string, unknown> = {};
    if (!account.nickname && guest.nickname) patch.nickname = guest.nickname;
    if (!account.avatarEmoji && guest.avatarEmoji) patch.avatarEmoji = guest.avatarEmoji;
    if (!account.bio && guest.bio) patch.bio = guest.bio;
    if (Object.keys(patch).length) await tx.user.update({ where: { id: accountId }, data: patch });

    await tx.user.delete({ where: { id: guestId } });
  });
}

// 注册：账号（手机号或邮箱）+ 密码。当前是游客则就地升级，保留其已产生的数据。
export async function registerAccount(
  account: { kind: 'phone' | 'email'; value: string },
  passwordHash: string,
  currentUserId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const where = account.kind === 'phone' ? { phone: account.value } : { email: account.value };
  const existing = await prisma.user.findUnique({ where: where as any });
  if (existing) {
    // 老账号是"只填手机号即可登录"时代创建的，没有密码。那时任何人知道手机号就能登进去，
    // 因此允许本人在此补设密码来认领，不算安全性降级；补设后同样并入当前游客数据。
    if (!existing.passwordHash) {
      await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
      if (existing.id !== currentUserId) await mergeGuestInto(currentUserId, existing.id);
      await assignPawlyId(existing.id);
      return { ok: true, userId: existing.id };
    }
    return { ok: false, error: account.kind === 'phone' ? '该手机号已注册，请直接登录' : '该邮箱已注册，请直接登录' };
  }

  const current = await prisma.user.findUnique({ where: { id: currentUserId } });
  if (isGuest(current)) {
    await prisma.user.update({ where: { id: currentUserId }, data: { ...where, passwordHash } });
    await assignPawlyId(currentUserId);
    return { ok: true, userId: currentUserId };
  }
  const fresh = await prisma.user.create({ data: { ...where, passwordHash } });
  await assignPawlyId(fresh.id);
  return { ok: true, userId: fresh.id };
}

// 登录：校验密码，成功后把当前游客的数据并入该账号
export async function loginWithPassword(
  account: { kind: 'phone' | 'email'; value: string },
  verify: (hash: string | null) => Promise<boolean>,
  currentUserId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const where = account.kind === 'phone' ? { phone: account.value } : { email: account.value };
  const user = await prisma.user.findUnique({ where: where as any });
  // 账号不存在与密码错误返回同一句提示，避免被用来枚举已注册账号
  if (!user || !(await verify(user.passwordHash))) return { ok: false, error: '账号或密码不正确' };
  if (user.id !== currentUserId) await mergeGuestInto(currentUserId, user.id);
  await assignPawlyId(user.id); // 老账号首次登录时补发
  return { ok: true, userId: user.id };
}

// 修改密码：需验证原密码
export async function changePassword(
  userId: string,
  verify: (hash: string | null) => Promise<boolean>,
  newHash: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (!user.phone && !user.email)) return { ok: false, error: '请先登录' };
  if (!(await verify(user.passwordHash))) return { ok: false, error: '原密码不正确' };
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  return { ok: true };
}

// 兼容旧的验证码登录路径（当前未启用，短信接入后可恢复）
export async function loginWithPhone(phone: string, currentUserId: string): Promise<string> {
  const account = await prisma.user.findUnique({ where: { phone } });
  const current = await prisma.user.findUnique({ where: { id: currentUserId } });

  if (!account) {
    if (isGuest(current)) {
      await prisma.user.update({ where: { id: currentUserId }, data: { phone } });
      return currentUserId;
    }
    const fresh = await prisma.user.create({ data: { phone } });
    return fresh.id;
  }
  if (account.id === currentUserId) return account.id;
  await mergeGuestInto(currentUserId, account.id);
  return account.id;
}
