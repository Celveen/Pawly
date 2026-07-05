// 验证码登录：校验通过后，把当前游客数据升级/合并到手机号账号，并切换 cookie
import { NextRequest, NextResponse } from 'next/server';
import { verifyLoginCode, loginWithPhone } from '@/lib/auth';
import { getOrCreateUserId, setUserCookie } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const phone = String(b?.phone || '');
  const check = await verifyLoginCode(phone, String(b?.code || ''));
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const currentUserId = await getOrCreateUserId();
  const userId = await loginWithPhone(phone, currentUserId);
  setUserCookie(userId);
  return NextResponse.json({ ok: true, phone });
}
