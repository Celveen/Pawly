/** 金额格式化：与网页端 fmt 一致 */
function fmt(n) {
  return `¥${Number(n || 0).toFixed(0)}`;
}

/** 相对时间：刚刚 / n 分钟前 / n 小时前 / n 天前 / 日期 */
function timeAgo(iso) {
  if (!iso) return '';
  const t = new Date(String(iso).replace(/-/g, '/').replace('T', ' ').replace(/\.\d+Z?$/, '')).getTime();
  const s = Math.floor((Date.now() - t) / 1000);
  if (!isFinite(s)) return '';
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} 天前`;
  const d = new Date(t);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** HH:mm */
function clock(iso) {
  const d = new Date(String(iso).replace(/-/g, '/').replace('T', ' ').replace(/\.\d+Z?$/, ''));
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** YYYY-MM-DD */
function ymd(d) {
  const x = d instanceof Date ? d : new Date(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

/** 小程序没有 crypto.randomUUID，手搓一个够用的 v4 */
function uuid() {
  /* eslint-disable no-bitwise -- v4 UUID 的标准位运算写法 */
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  /* eslint-enable no-bitwise */
}

/** 轻提示 */
function toast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 1600 });
}

/** 数字缩写：12480 → 1.2万 */
function abbr(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  return String(v);
}

/** 防抖 */
function debounce(fn, wait = 300) {
  let t = null;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

module.exports = { fmt, timeAgo, clock, ymd, uuid, toast, abbr, debounce };
