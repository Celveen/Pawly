// 宠物档案接口（BFF 代理）：业务逻辑与校验在 server/services.ts
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await rpc('pets.list', getOrCreateUserId());
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await rpc('pets.upsert', getOrCreateUserId(), body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}

export async function DELETE(req: NextRequest) {
  const name = new URL(req.url).searchParams.get('name');
  const r = await rpc('pets.delete', getOrCreateUserId(), { name });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r.data);
}
