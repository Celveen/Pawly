// 社区帖子接口（BFF 代理）：业务逻辑与校验在 server/services.ts
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const id = sp.get('id');
  // 带 id：取单帖详情（含全部图片）；否则取列表（只带封面图，省流量）
  const r = id
    ? await rpc('posts.get', getOrCreateUserId(), { id })
    : await rpc('posts.list', getOrCreateUserId(), { topic: sp.get('topic') });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await rpc('posts.create', getOrCreateUserId(), body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  const r = await rpc('posts.delete', getOrCreateUserId(), { id });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
