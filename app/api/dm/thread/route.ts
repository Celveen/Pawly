// 单个会话的消息记录（BFF 代理，打开即标记已读）
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const peerId = new URL(req.url).searchParams.get('peerId');
  const r = await rpc('dm.thread', getOrCreateUserId(), { peerId });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
