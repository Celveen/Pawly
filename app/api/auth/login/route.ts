// 验证码登录（BFF 代理）：后端校验并合并数据，前端层只负责切换 cookie
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId, setUserCookie } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await rpc<{ userId: string; phone: string }>('auth.login', getOrCreateUserId(), body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  setUserCookie(r.data.userId);
  return NextResponse.json({ ok: true, phone: r.data.phone });
}
