// 内容安全（最小闭环）：本地敏感词过滤，发布前拦截明显违规/广告内容。
// 正式接入云端机审（如阿里云内容安全）前的兜底方案；词表可按运营情况随时扩充。
// 命中即拒绝发布并提示，不做静默修改，避免"发出去的和写的不一样"。

const BANNED_WORDS = [
  // 广告导流 / 诈骗常见话术
  '加微信', '加v信', '加qq', '加Q群', '代开发票', '刷单', '兼职日结', '博彩', '赌博',
  '一夜暴富', '稳赚不赔', '点击链接领取', '免费领红包',
  // 违禁交易
  '出售个人信息', '代考', '办证', '枪支', '毒品', '迷药',
  // 宠物场景高风险（活体非法交易/虐待内容）
  '虐猫', '虐狗', '毒狗', '药狗', '野生保护动物出售',
];

// 返回命中的词；未命中返回 null
export function findViolation(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/\s+/g, '');
  for (const w of BANNED_WORDS) {
    if (t.includes(w.toLowerCase())) return w;
  }
  return null;
}

// 组合多个字段一次检查
export function findViolationIn(...fields: Array<string | null | undefined>): string | null {
  for (const f of fields) {
    const hit = findViolation(f || '');
    if (hit) return hit;
  }
  return null;
}
