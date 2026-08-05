// 头像图片：把库里存的 dataURL 解码成真正的图片返回。
// 这样帖子列表/评论只需带一个短 URL，头像本体走浏览器缓存，不进 JSON 载荷。
import { NextRequest, NextResponse } from 'next/server';
import { rpc } from '@/lib/gateway';
import { getOrCreateUserId } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const r = await rpc<{ dataUrl: string | null }>('profile.avatar', getOrCreateUserId(), { userId: params.userId });
  if (!r.ok || !r.data?.dataUrl) return new NextResponse(null, { status: 404 });

  const match = /^data:(image\/[a-z]+);base64,(.+)$/s.exec(r.data.dataUrl);
  if (!match) return new NextResponse(null, { status: 404 });
  const [, mime, base64] = match;

  return new NextResponse(Buffer.from(base64, 'base64'), {
    headers: {
      'Content-Type': mime,
      // URL 上带 ?v=<更新时间戳>，内容变了 URL 就变，可以放心长缓存
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
