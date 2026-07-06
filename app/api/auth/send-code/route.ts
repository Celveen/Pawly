// 发送登录验证码（BFF 代理）。开发模式下验证码随响应返回（devCode）。
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await rpc('auth.sendCode', getOrCreateUserId(), body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
