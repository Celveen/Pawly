// 我的收藏 / 我赞过（BFF 代理，仅本人可见）
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const kind = new URL(req.url).searchParams.get('kind');
  const r = await rpc('profile.collection', getOrCreateUserId(), { kind });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
