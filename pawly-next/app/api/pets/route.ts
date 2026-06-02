// 宠物档案接口：返回的年龄是【实时计算】的，不是存进去的
import { NextResponse } from 'next/server';
import { store } from '@/lib/db/store';
import { petSnapshot } from '@/lib/pets';

export async function GET() {
  return NextResponse.json(store.listPets().map((p) => petSnapshot(p)));
}
