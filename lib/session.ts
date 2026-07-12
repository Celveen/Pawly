// 匿名会话（前端层，零数据库依赖）：
// 首次访问生成随机 id 写入 cookie，作为用户身份透传给后端；
// 后端在用户第一次产生数据时才落 User 行（见 server/services.ts 的 ensureUser）。
// 登录后 cookie 切换为手机号账号的 userId。
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const COOKIE = 'pawly_uid';

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 一年
};

export function getOrCreateUserId(): string {
  const jar = cookies();
  const existing = jar.get(COOKIE)?.value;
  // 兼容两代 id：旧版是数据库 cuid（字母数字），新版是 UUID
  if (existing && /^[\w-]{20,40}$/.test(existing)) return existing;
  const id = randomUUID();
  jar.set(COOKIE, id, cookieOpts);
  return id;
}

// 登录成功后把 cookie 切到手机号账号
export function setUserCookie(userId: string) {
  cookies().set(COOKIE, userId, cookieOpts);
}

// 退出登录：清 cookie，下次请求自动回到全新游客身份
export function clearUserCookie() {
  cookies().delete(COOKIE);
}
