// 商品接口（供网页/小程序/App 共用）
import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';

export async function GET() {
  return NextResponse.json(store.listProducts());
}
