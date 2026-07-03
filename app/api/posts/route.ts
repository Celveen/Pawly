// 社区帖子接口：列表全站共享；发帖/删帖按 cookie 身份归属
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/db/store';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOPICS = ['晒宠', '好物', '求助', '日常'];

export async function GET(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const topic = new URL(req.url).searchParams.get('topic') || undefined;
  const posts = await store.listPosts(userId, topic && TOPICS.includes(topic) ? topic : undefined);
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const b = await req.json();
  const title = String(b?.title || '').trim();
  const content = String(b?.content || '').trim();
  if (!title || !content) {
    return NextResponse.json({ error: '标题和内容都不能为空' }, { status: 400 });
  }
  if (title.length > 40 || content.length > 1000) {
    return NextResponse.json({ error: '标题最多 40 字，内容最多 1000 字' }, { status: 400 });
  }
  const post = await store.createPost(userId, {
    title,
    content,
    topic: TOPICS.includes(b?.topic) ? b.topic : '日常',
    emoji: String(b?.emoji || '🐾').slice(0, 8),
    bg: /^#[0-9a-fA-F]{6}$/.test(b?.bg || '') ? b.bg : '#F4D7B0',
    petName: b?.petName ? String(b.petName).slice(0, 20) : null,
    nickname: b?.nickname ? String(b.nickname).slice(0, 20) : null,
  });
  return NextResponse.json({ ok: true, id: post.id });
}

export async function DELETE(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const r = await store.deletePost(userId, id);
  if (r.count === 0) return NextResponse.json({ error: '帖子不存在或不是你发布的' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
