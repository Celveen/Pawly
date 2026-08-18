// AI 服务自检（BFF 代理）：登录后访问，可确认 key / 模型名 / 网络哪一环有问题。
// 不返回 key 本身，只返回是否配置、模型名与上游原始报错。
import { NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await rpc('chat.diagnose', getOrCreateUserId(), {});
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
