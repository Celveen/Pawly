// 宠物年龄/生命阶段计算 —— 解决"用户不会每次更新数据"的核心模块
import type { Pet } from './types';

/** 由出生日期实时计算月龄（每次调用都是最新的，无需用户维护） */
export function ageInMonths(birthday: string, now: Date = new Date()): number {
  const b = new Date(birthday);
  let m = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) m -= 1;
  return Math.max(0, m);
}

/** 人类可读年龄，如 "2 个月" / "3 岁 4 个月" */
export function formatAge(birthday: string, now: Date = new Date()): string {
  const m = ageInMonths(birthday, now);
  if (m < 12) return `${m} 个月`;
  const y = Math.floor(m / 12);
  const rm = m % 12;
  return rm ? `${y} 岁 ${rm} 个月` : `${y} 岁`;
}

/** 生命阶段（影响选粮）。狗猫阈值略有差异，这里给通用版。 */
export function lifeStage(species: '狗' | '猫', ageMonths: number): '幼年' | '成年' | '老年' {
  if (ageMonths < 12) return '幼年';
  const seniorAt = species === '狗' ? 7 * 12 : 10 * 12;
  return ageMonths >= seniorAt ? '老年' : '成年';
}

/** 由"用户口述的年龄"反推出生日期，存进档案。例：填"2 个月" → birthday = 今天 - 2 个月 */
export function birthdayFromAgeMonths(ageMonths: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setMonth(d.getMonth() - ageMonths);
  return d.toISOString().slice(0, 10);
}

/** 字段是否过期（默认 60 天没更新就算过期，用于提醒用户） */
export function isStale(updatedAt: string, days = 60, now: Date = new Date()): boolean {
  const diff = (now.getTime() - new Date(updatedAt).getTime()) / 86400000;
  return diff > days;
}

/** 给 Agent 用的"档案快照"：把实时年龄、阶段、过期标记都算好 */
export function petSnapshot(pet: Pet, now: Date = new Date()) {
  const ageMonths = ageInMonths(pet.birthday, now);
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    ageText: formatAge(pet.birthday, now),
    ageMonths,
    lifeStage: lifeStage(pet.species, ageMonths),
    weightKg: pet.weightKg,
    weightUpdatedAt: pet.weightUpdatedAt,
    weightStale: isStale(pet.weightUpdatedAt, 60, now), // true => Agent 应主动询问体重是否有变
    notes: pet.notes,
  };
}
