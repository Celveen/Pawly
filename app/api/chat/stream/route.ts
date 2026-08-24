// AI 客服的流式接口（SSE）。回复边生成边推，用户不用等整条编排链跑完才看到字。
// 两种部署形态都走得通：
//  - 配了 BACKEND_URL（前后端分离）：把后端进程的 SSE 原样透传出去；
//  - 没配（单体 / Vercel）：进程内直调 chatRunStream。
// 出错一律以 SSE 事件收口而不是抛 HTTP 错误码，否则前端已经开始渲染的半截答复会突然断掉。
import { NextRequest } from 'next/server';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SSE_HEADERS = {
  'content-type': 'text/event-stream; charset=utf-8',
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  // Nginx 等反代默认会缓冲，流式必须显式关掉，否则又变回"一次性吐出来"
  'x-accel-buffering': 'no',
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = getOrCreateUserId();
  const backend = process.env.BACKEND_URL;

  if (backend) {
    try {
      const upstream = await fetch(`${backend}/chat/stream`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY || '',
          'x-user-id': userId,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      if (!upstream.ok || !upstream.body) return errorStream('后端服务不可用');
      return new Response(upstream.body, { headers: SSE_HEADERS });
    } catch (e: any) {
      console.error('[chat/stream] 转发失败:', e?.message || e);
      return errorStream('后端服务不可用');
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // 用户关掉页面时控制器已经关闭，忽略即可
        }
      };
      try {
        const { chatRunStream } = await import('@/server/services');
        await chatRunStream(userId, body, send);
      } catch (e: any) {
        console.error('[chat/stream] 执行失败:', e?.message || e);
        send({ type: 'run.error', at: new Date().toISOString(), data: { message: 'AI 暂时不可用' } });
      } finally {
        try { controller.enqueue(encoder.encode('data: [DONE]\n\n')); } catch {}
        try { controller.close(); } catch {}
      }
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}

// #以 SSE 形式返回错误，保证前端始终按同一套协议处理
function errorStream(message: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'run.error', at: new Date().toISOString(), data: { message },
      })}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
