// 粉丝 / 关注 名单（BFF 代理）
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const r = await rpc('profile.follows', getOrCreateUserId(), { userId: sp.get('userId'), kind: sp.get('kind') });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
