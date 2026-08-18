// 密码哈希：Node 内置 scrypt（无需第三方依赖），每个密码独立随机盐。
// 存储格式：scrypt$<N>$<saltHex>$<hashHex>，校验时按存储参数复算并做定长比较。
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb) as (pw: string | Buffer, salt: Buffer, len: number, opts?: any) => Promise<Buffer>;

const COST = 16384; // 2^14，登录耗时约几十毫秒，兼顾安全与体验
const KEY_LEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LEN, { N: COST, r: 8, p: 1 });
  return `scrypt$${COST}$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored?: string | null): Promise<boolean> {
  if (!stored) return false;
  const [scheme, costStr, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !costStr || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length, { N: Number(costStr), r: 8, p: 1 });
  // 定长比较，避免按字节提前返回带来的时序侧信道
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// —— 账号与密码的格式校验 ——
const PHONE_RE = /^1\d{10}$/;
// 邮箱不做过度严格的校验（RFC 全量正则实际收益很低），够用即可
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type AccountKind = { kind: 'phone'; value: string } | { kind: 'email'; value: string };

// 输入既可能是手机号也可能是邮箱，这里统一识别并规范化（邮箱转小写）
export function parseAccount(raw: string): AccountKind | null {
  const v = String(raw || '').trim();
  if (PHONE_RE.test(v)) return { kind: 'phone', value: v };
  if (EMAIL_RE.test(v)) return { kind: 'email', value: v.toLowerCase() };
  return null;
}

export function checkPasswordStrength(pw: string): string | null {
  const v = String(pw || '');
  if (v.length < 8) return '密码至少 8 位';
  if (v.length > 20) return '密码最长 20 位';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return '密码需同时包含字母和数字';
  if (/^(.)\1+$/.test(v)) return '密码过于简单';
  return null;
}
