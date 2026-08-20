// 校验站内用到的 emoji 都有对应图片。
//
// 为什么需要这个检查：Emoji 组件在映射表里找不到时会回退成「直接渲染原生字符」，
// 而原生 emoji 在部分 Windows / 安卓 / 微信内置浏览器上会变成空白或方框——
// 在我们自己的机器上一切正常，别人打开却发现图标、物种筛选、商品封面成片消失，
// 而且没有任何报错，极难定位。所以把「漏图」变成一次可见的失败。
//
// 用法：npm run emoji:check
// 补图：从 Microsoft Fluent Emoji 3D（MIT）导出 256×256 PNG 放进 public/emoji/，
//       文件名用去掉变体选择符（FE0F）后的码点，再往 lib/emoji-map.json 加一条。
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = join(__dirname, '..');
const MAP_PATH = join(ROOT, 'lib/emoji-map.json');
const ASSET_DIR = join(ROOT, 'public/emoji');

const emojiMap: Record<string, string> = JSON.parse(readFileSync(MAP_PATH, 'utf8'));

// 只认真正会走 Emoji 组件的写法，避免把箭头、圆圈数字、★ 这类普通排版符号也算进来
const EMOJI_SHAPE = /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{231A}-\u{23F3}\u{2B50}\u{2B55}](?:\u{FE0F})?(?:\u{200D}[\u{1F000}-\u{1FAFF}](?:\u{FE0F})?)*$/u;
const PATTERNS = [
  /<Emoji[^>]*?text=\{?['"]([^'"]+)['"]/g,   // <Emoji text="🐰" />
  /"?emoji"?:\s*['"]([^'"]+)['"]/g,          // { emoji: '🐰' } —— 数据记录最终也交给 Emoji 渲染
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?|json)$/.test(entry.name) && entry.name !== 'emoji-map.json') out.push(full);
  }
  return out;
}

const used = new Map<string, Set<string>>();
for (const file of ['components', 'lib', 'server', 'content'].flatMap((d) => walk(join(ROOT, d)))) {
  const src = readFileSync(file, 'utf8');
  for (const pattern of PATTERNS) {
    for (const match of src.matchAll(pattern)) {
      const value = match[1].trim();
      if (!EMOJI_SHAPE.test(value)) continue;
      if (!used.has(value)) used.set(value, new Set());
      used.get(value)!.add(basename(file));
    }
  }
}

const missingImage = [...used.keys()].filter((e) => !emojiMap[e]);
const brokenMap = Object.entries(emojiMap).filter(([, code]) => !existsSync(join(ASSET_DIR, `${code}.png`)));

console.log(`站内用到 ${used.size} 个 emoji · 映射表 ${Object.keys(emojiMap).length} 条 · 图片 ${readdirSync(ASSET_DIR).filter((f) => f.endsWith('.png')).length} 张`);

if (missingImage.length) {
  console.error(`\n✗ ${missingImage.length} 个 emoji 没有图片，会回退成原生字符（部分设备上显示为空白）：`);
  for (const e of missingImage) {
    const code = [...e].filter((c) => c !== '️').map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0')).join('-');
    console.error(`   ${e}  ${code}  ← ${[...used.get(e)!].slice(0, 3).join(', ')}`);
  }
}
if (brokenMap.length) {
  console.error(`\n✗ ${brokenMap.length} 条映射指向不存在的图片：`);
  for (const [e, code] of brokenMap) console.error(`   ${e} → ${code}.png`);
}

if (missingImage.length || brokenMap.length) process.exit(1);
console.log('✓ 全部 emoji 都有图片');
