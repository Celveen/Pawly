// AI 导购 Agent 接口：前端把对话历史发来，返回 {reply, proposals}
import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent/runAgent';
import type { ChatMessage } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    const result = await runAgent(messages || []);
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('[chat] error:', e?.message || e);
    return NextResponse.json(
      { reply: '抱歉，AI 暂时不可用，请稍后再试。', proposals: [] },
      { status: 200 },
    );
  }
}
