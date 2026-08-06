// 站内通知（BFF 代理）：GET 列表 / GET?unread=1 未读数 / POST 全部已读
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const unread = sp.get('unread');
  const op = unread ? 'notifications.unread' : 'notifications.list';
  const r = await rpc(op, getOrCreateUserId(), { kind: sp.get('kind') });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}

export async function POST() {
  const r = await rpc('notifications.read', getOrCreateUserId(), {});
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
