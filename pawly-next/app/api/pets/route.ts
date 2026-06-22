// 宠物档案接口：每个访客只看到/操作自己的宠物（按 cookie 身份隔离）
import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/db/store';
import { getOrCreateUserId } from '@/lib/session';
import { petSnapshot, birthdayFromAgeMonths } from '@/lib/pets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getOrCreateUserId();
  const pets = await store.listPets(userId);
  return NextResponse.json(pets.map((p) => petSnapshot(p)));
}

export async function POST(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const b = await req.json();
  if (!b?.name || !b?.species) {
    return NextResponse.json({ error: '缺少 name 或 species' }, { status: 400 });
  }
  const data: any = { name: b.name, species: b.species };
  if (b.breed) data.breed = b.breed;
  if (b.sex) data.sex = b.sex;
  if (b.notes) data.notes = b.notes;
  if (typeof b.weightKg === 'number') {
    data.weightKg = b.weightKg;
    data.weightUpdatedAt = new Date();
  }
  if (b.birthday) data.birthday = new Date(b.birthday);
  else if (typeof b.ageMonths === 'number') data.birthday = new Date(birthdayFromAgeMonths(b.ageMonths));

  const saved = await store.upsertPet(userId, data);
  return NextResponse.json(petSnapshot(saved));
}

export async function DELETE(req: NextRequest) {
  const userId = await getOrCreateUserId();
  const name = new URL(req.url).searchParams.get('name');
  if (!name) return NextResponse.json({ error: '缺少 name' }, { status: 400 });
  await store.deletePet(userId, name);
  return NextResponse.json({ ok: true });
}
