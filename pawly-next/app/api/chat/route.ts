// AI 导购 Agent 接口：读取当前访客身份(cookie)，让 Agent 操作【他自己的】数据
import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent/runAgent';
import { getOrCreateUserId } from '@/lib/session';
import type { ChatMessage } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getOrCreateUserId();
    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    const result = await runAgent(userId, messages || []);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[chat] error:', e?.message || e);
    return NextResponse.json({ reply: '抱歉，AI 暂时不可用，请稍后再试。', proposals: [] }, { status: 200 });
  }
}
