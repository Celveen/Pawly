// 商品接口（供网页/小程序/App 共用），从数据库读取
import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await store.listProducts());
}
