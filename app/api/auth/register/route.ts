// 注册（BFF 代理）：账号为手机号或邮箱 + 密码
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId, setUserCookie } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await rpc<{ userId: string; account: string; kind: string }>('auth.register', getOrCreateUserId(), body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  setUserCookie(r.data.userId);
  return NextResponse.json({ ok: true, account: r.data.account, kind: r.data.kind });
}
