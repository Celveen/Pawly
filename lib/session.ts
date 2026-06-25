// 匿名会话：访客首次访问自动建一个 User，并把 id 写进 cookie。
// 之后这个浏览器/手机的所有请求都带着这个 cookie => 他只看到、只操作自己的数据。
// 对"扫码即用、各填各的"演示场景最省事（无需注册登录）。
import { cookies } from 'next/headers';
import { prisma } from './db/prisma';

const COOKIE = 'pawly_uid';

export async function getOrCreateUserId(): Promise<string> {
  const jar = cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: existing } });
    if (user) return user.id;
  }
  const user = await prisma.user.create({ data: {} });
  jar.set(COOKIE, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 一年
  });
  return user.id;
}
