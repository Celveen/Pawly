// 当前身份：游客返回 { guest: true }，已登录返回脱敏手机号
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getOrCreateUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.phone) return NextResponse.json({ guest: true, nickname: user?.nickname || null });
  return NextResponse.json({
    guest: false,
    nickname: user.nickname || null,
    phoneMasked: user.phone.slice(0, 3) + '****' + user.phone.slice(7),
  });
}
