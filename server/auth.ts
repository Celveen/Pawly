// 手机号验证码登录。
// 短信通道可插拔：配置了 SMS_* 环境变量则走真实短信（接入阿里云/腾讯云时实现 sendSms），
// 未配置时为开发模式——验证码直接随接口返回（devCode），方便本地与演示环境联调。
import { createHash, randomInt } from 'crypto';
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

// 登录落账：把"当前游客身份"升级或合并到手机号账号，返回最终的 userId。
// - 手机号没注册过 + 当前游客未绑定手机 => 直接给游客绑定手机号（数据零迁移）
// - 手机号已有账号 => 把游客的宠物/订单/帖子/点赞并入该账号，删除游客
export async function loginWithPhone(phone: string, currentUserId: string): Promise<string> {
  const account = await prisma.user.findUnique({ where: { phone } });
  const current = await prisma.user.findUnique({ where: { id: currentUserId } });

  if (!account) {
    if (current && !current.phone) {
      await prisma.user.update({ where: { id: currentUserId }, data: { phone } });
      return currentUserId;
    }
    const fresh = await prisma.user.create({ data: { phone } });
    return fresh.id;
  }

  if (account.id === currentUserId) return account.id;

  // 合并游客数据（游客本身已绑定别的手机号时不合并，直接切换账号）
  if (current && !current.phone) {
    await prisma.$transaction(async (tx) => {
      await tx.pet.updateMany({ where: { userId: currentUserId }, data: { userId: account.id } });
      await tx.order.updateMany({ where: { userId: currentUserId }, data: { userId: account.id } });
      await tx.post.updateMany({ where: { userId: currentUserId }, data: { userId: account.id } });
      // 点赞有复合主键，直接 updateMany 可能撞键：先搬能搬的，再清残留
      const likes = await tx.postLike.findMany({ where: { userId: currentUserId } });
      if (likes.length) {
        await tx.postLike.createMany({
          data: likes.map((l) => ({ userId: account.id, postId: l.postId })),
          skipDuplicates: true,
        });
        await tx.postLike.deleteMany({ where: { userId: currentUserId } });
      }
      if (!account.nickname && current.nickname) {
        await tx.user.update({ where: { id: account.id }, data: { nickname: current.nickname } });
      }
      await tx.user.delete({ where: { id: currentUserId } });
    });
  }
  return account.id;
}
