// 商品接口（BFF 代理）：业务逻辑在 server/services.ts
import { NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await rpc('products.list', getOrCreateUserId());
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
