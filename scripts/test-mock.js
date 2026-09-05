/**
 * mock 层回归测试：用假的 wx 把所有路由跑一遍，确认返回结构与真接口一致。
 * 注意它只能验证 mock 自身的逻辑 —— 宿主差异（如 require 目录索引）
 * 这里测不出来，那部分交给 scripts/check-project.js。
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const store = {};
global.wx = {
  getStorageSync: (k) => store[k],
  setStorageSync: (k, v) => { store[k] = v; },
  removeStorageSync: (k) => { delete store[k]; },
  request: () => { throw new Error('未被 mock 拦截'); },
};

require(path.join(ROOT, 'mock/index.js'))();

const call = (method, url, data) => new Promise((resolve) => {
  wx.request({ url, method, data, success: resolve });
});

let pass = 0;
let fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass += 1; } else { fail += 1; console.error(`  ✗ ${name} ${extra}`); }
}

const READS = [
  ['/api/auth/me', (d) => 'guest' in d],
  ['/api/products', (d) => Array.isArray(d) && d.length === 59],
  ['/api/posts', (d) => Array.isArray(d) && d.length > 0 && 'likedByMe' in d[0]],
  ['/api/posts?id=seed-cat-day30', (d) => d.id === 'seed-cat-day30' && Array.isArray(d.topics)],
  ['/api/comments?postId=seed-cat-day30', (d) => Array.isArray(d)],
  ['/api/notifications', (d) => Array.isArray(d)],
  ['/api/notifications?unread=1', (d) => typeof d.count === 'number'],
  ['/api/dm', (d) => Array.isArray(d)],
  ['/api/dm/unread', (d) => typeof d.count === 'number'],
  ['/api/pets', (d) => Array.isArray(d)],
  ['/api/reminders', (d) => Array.isArray(d)],
  ['/api/addresses', (d) => Array.isArray(d)],
  ['/api/orders', (d) => Array.isArray(d)],
  ['/api/checkin', (d) => 'done' in d && 'streak' in d],
  ['/api/chat/history', (d) => Array.isArray(d)],
  ['/api/profile', (d) => 'postCount' in d && Array.isArray(d.posts)],
  ['/api/reviews?productId=p1', (d) => Array.isArray(d)],
  ['/api/posts/search?q=猫', (d) => Array.isArray(d)],
  ['/api/users/search?q=糯米', (d) => Array.isArray(d) && d.length === 1],
  ['/api/profile/collection?kind=favorites', (d) => Array.isArray(d)],
  ['/api/profile/follows?userId=me&kind=following', (d) => Array.isArray(d)],
];

(async () => {
  for (const [url, ok] of READS) {
    const r = await call('GET', url);
    check(`GET ${url}`, r.statusCode === 200 && ok(r.data), `→ ${r.statusCode} ${JSON.stringify(r.data).slice(0, 80)}`);
  }

  let r = await call('POST', '/api/auth/login', { account: '13800138000', password: 'abc123' });
  check('登录返回 userId（小程序靠它换身份）', r.statusCode === 200 && r.data.userId, JSON.stringify(r.data));

  r = await call('POST', '/api/auth/login', { account: '13800138000', password: '123' });
  check('弱密码被拒', r.statusCode === 400, `→ ${r.statusCode}`);

  r = await call('POST', '/api/pets', { name: '糯米', species: '猫', birthday: '2023-06-01', weightKg: 4.2 });
  check('建档并算出年龄', r.statusCode === 200 && /岁|个月/.test(r.data.ageText), JSON.stringify(r.data.ageText));

  r = await call('GET', '/api/reminders');
  check('有档案后自动排出提醒', r.statusCode === 200 && r.data.length === 4, `→ ${r.data.length} 条`);

  r = await call('POST', '/api/posts', { title: '测试笔记', content: '正文', topic: '日常' });
  const postId = r.data.id;
  check('发帖', r.statusCode === 200 && postId, JSON.stringify(r.data).slice(0, 60));

  r = await call('POST', '/api/posts', { title: '', content: '' });
  check('空标题被拒', r.statusCode === 400, `→ ${r.statusCode}`);

  r = await call('POST', '/api/posts/like', { postId: 'seed-cat-day30' });
  check('点赞', r.statusCode === 200 && r.data.on === true, JSON.stringify(r.data));

  r = await call('POST', '/api/addresses', { name: '林', phone: '138', province: '上海市', city: '上海市', district: '徐汇区', detail: 'x' });
  check('手机号格式校验', r.statusCode === 400, `→ ${r.statusCode}`);

  r = await call('POST', '/api/addresses', { name: '林', phone: '13800138000', province: '上海市', city: '上海市', district: '徐汇区', detail: 'x 路 1 号' });
  check('首个地址自动设为默认', r.statusCode === 200 && r.data.isDefault === true, JSON.stringify(r.data));

  r = await call('POST', '/api/orders', { items: [{ id: 'p1', qty: 2 }], addressId: r.data.id, shipping: 0 });
  check('下单金额 = 168 × 2', r.statusCode === 200 && r.data.total === 336, `→ ${r.data.total}`);

  r = await call('POST', '/api/chat', { messages: [{ role: 'user', content: '帮我家猫挑款主食' }] });
  check('AI 返回带商品的方案', r.statusCode === 200 && r.data.proposals[0] && r.data.proposals[0].productIds.length === 3,
    JSON.stringify(r.data.proposals).slice(0, 80));

  r = await call('POST', '/api/comments', { postId, content: '很有用' });
  check('评论', r.statusCode === 200 && r.data.mine === true, JSON.stringify(r.data).slice(0, 60));

  r = await call('DELETE', `/api/posts?id=${postId}`);
  check('删除自己的帖子', r.statusCode === 200, `→ ${r.statusCode}`);

  r = await call('GET', '/api/posts?id=不存在');
  check('不存在的帖子返回 404', r.statusCode === 404 && r.data.error, JSON.stringify(r.data));

  console.log(`mock 层回归：通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
