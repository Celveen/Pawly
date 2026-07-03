// 帖子点赞：一人一帖只能赞一次，再点取消
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/db/store';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const b = await req.json().catch(() => ({}));
  if (!b?.postId) return NextResponse.json({ error: '缺少 postId' }, { status: 400 });
  try {
    const r = await store.togglePostLike(userId, String(b.postId));
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: '帖子不存在' }, { status: 404 });
  }
}
