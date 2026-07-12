// 退出登录：清 cookie，下次请求自动生成新的游客身份
import { NextResponse } from 'next/server';
import { clearUserCookie } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  clearUserCookie();
  return NextResponse.json({ ok: true });
}
