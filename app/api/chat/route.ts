// AI 导购接口（BFF 代理）：Agent 编排与模型 Key 都在后端层
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await rpc('chat.run', getOrCreateUserId(), body);
  if (!r.ok) {
    // 对话场景保持友好兜底，不把内部错误暴露给用户
    return NextResponse.json({ reply: '抱歉，AI 暂时不可用，请稍后再试。', proposals: [] }, { status: 200 });
  }
  return NextResponse.json(r.data);
}
