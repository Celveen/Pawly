#!/usr/bin/env node
/**
 * 小程序工程自检：把「开发者工具打开才会炸」的问题提前到命令行。
 *
 * 起因：小程序的 require 不支持目录索引（`require('../data')` 不会补成
 * `../data/index.js`），而 Node 支持 —— 所以纯 Node 的单测全绿、一进开发者
 * 工具却整个 app.js 挂掉。这类「宿主差异」靠跑代码测不出来，只能静态查。
 *
 *   node scripts/check-project.js     （等价于 npm run check）
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const errors = [];
const SKIP = /(^|\/)(miniprogram_npm|node_modules|\.git)(\/|$)/;

function walk(dir, ext, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(ROOT, full);
    if (SKIP.test(rel)) continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, ext, out);
    else if (full.endsWith(ext)) out.push(rel);
  }
  return out;
}

const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const isFile = (f) => fs.existsSync(f) && fs.statSync(f).isFile();
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
// 扫 JS 前先去掉注释，否则注释里举例用的 require 会被误报
const stripJsComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');

/* 1) require 路径：小程序不做目录索引，必须落到具体文件 */
for (const f of walk(ROOT, '.js')) {
  const src = stripJsComments(fs.readFileSync(f, 'utf8'));
  const re = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1];
    const base = path.normalize(path.join(path.dirname(f), spec));
    if (isFile(base) || isFile(`${base}.js`)) continue;
    const line = src.slice(0, m.index).split('\n').length;
    const hint = fs.existsSync(base) && fs.statSync(base).isDirectory()
      ? `目录引用，小程序不会自动补 /index.js —— 改成 '${spec}/index'`
      : '路径不存在';
    errors.push(`${f}:${line}  require("${spec}")  ← ${hint}`);
  }
}

/* 2) app.json：页面三件套、tabBar、分包预载 */
const app = readJson('app.json');
const pages = [...(app.pages || [])];
for (const sp of app.subpackages || []) for (const p of sp.pages) pages.push(`${sp.root}/${p}`);
for (const p of pages) {
  for (const ext of ['.js', '.json', '.wxml']) {
    if (!isFile(p + ext)) errors.push(`app.json 声明了页面 ${p}，但缺少 ${p}${ext}`);
  }
}
for (const t of (app.tabBar && app.tabBar.list) || []) {
  if (!(app.pages || []).includes(t.pagePath)) {
    errors.push(`tabBar 的 ${t.pagePath} 必须是主包 pages 中的页面`);
  }
}
const pkgNames = new Set((app.subpackages || []).map((s) => s.name));
for (const [page, rule] of Object.entries(app.preloadRule || {})) {
  if (!pages.includes(page)) errors.push(`preloadRule 里的 ${page} 不是已声明的页面`);
  for (const pkg of rule.packages || []) {
    if (!pkgNames.has(pkg)) errors.push(`preloadRule 引用了不存在的分包 ${pkg}`);
  }
}

/* 3) usingComponents 指向的组件是否齐全 */
const SKIP_JSON = new Set(['package.json', 'package-lock.json', 'project.config.json',
  'project.private.config.json', 'sitemap.json', 'app.json']);
for (const f of walk(ROOT, '.json')) {
  if (SKIP_JSON.has(path.basename(f))) continue;
  let cfg;
  try { cfg = readJson(f); } catch (e) { errors.push(`${f} 不是合法 JSON：${e.message}`); continue; }
  for (const [tag, p] of Object.entries(cfg.usingComponents || {})) {
    const base = p.startsWith('/') ? p.slice(1) : path.normalize(path.join(path.dirname(f), p));
    for (const ext of ['.js', '.json', '.wxml']) {
      if (!isFile(base + ext)) errors.push(`${f}：组件 ${tag} → ${p} 缺少 ${base}${ext}`);
    }
  }
}

/* 4) wxml 用到的自定义组件必须在同名 json 里声明 */
const NATIVE = new Set(['view', 'text', 'image', 'button', 'input', 'textarea', 'scroll-view', 'swiper',
  'swiper-item', 'block', 'navigator', 'icon', 'checkbox', 'checkbox-group', 'radio', 'radio-group',
  'switch', 'slider', 'picker', 'picker-view', 'picker-view-column', 'form', 'label', 'video', 'audio',
  'canvas', 'map', 'web-view', 'slot', 'camera', 'movable-view', 'movable-area', 'cover-view',
  'cover-image', 'rich-text', 'progress', 'open-data', 'ad', 'official-account', 'page-container',
  'share-element', 'match-media', 'root-portal', 'template', 'import', 'include', 'wxs', 'editor',
  'navigation-bar', 'page-meta', 'functional-page-navigator', 'keyboard-accessory']);
for (const f of walk(ROOT, '.wxml')) {
  const src = stripComments(fs.readFileSync(f, 'utf8'));
  const jf = `${f.slice(0, -5)}.json`;
  let declared = new Set();
  if (isFile(jf)) {
    try { declared = new Set(Object.keys(readJson(jf).usingComponents || {})); } catch (e) { /* 上面已报 */ }
  }
  const tags = new Set([...src.matchAll(/<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)[\s/>]/g)].map((m) => m[1]));
  for (const tag of tags) {
    if (NATIVE.has(tag) || declared.has(tag)) continue;
    errors.push(`${f}：用到 <${tag}> 但 ${path.basename(jf)} 的 usingComponents 里没有声明`);
  }
}

if (errors.length) {
  console.error('\n工程自检未通过：\n');
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  console.error(`\n共 ${errors.length} 个问题\n`);
  process.exit(1);
}
console.log(`工程自检通过：${pages.length} 个页面，未发现结构性问题。`);
