// 找人（BFF 代理）：按宝狸号 / 手机号 / 邮箱 / 昵称查找，用于发起私信
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const keyword = new URL(req.url).searchParams.get('q');
  const r = await rpc('users.search', getOrCreateUserId(), { keyword });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
