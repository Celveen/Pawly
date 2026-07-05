// 发送登录验证码。未配置短信服务商时为开发模式：验证码随响应返回（devCode）。
import { NextRequest, NextResponse } from 'next/server';
import { sendLoginCode } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const r = await sendLoginCode(String(b?.phone || ''));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(r);
}
