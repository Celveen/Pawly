/**
 * 启动路径回归测试：未读数的广播行为。
 * 'unread' 有 4 个订阅者（tabBar + 三个 tab 页），每次广播都连带 setData，
 * 所以「合并成一次」「值没变不发」「接口失败不误清」这三条都要守住。
 */
const ROOT = require('path').resolve(__dirname, '..');
const store = {};
global.wx = {
  getStorageSync: (k) => store[k],
  setStorageSync: (k, v) => { store[k] = v; },
  removeStorageSync: (k) => { delete store[k]; },
  request: () => {},
  getWindowInfo: () => ({ statusBarHeight: 47, windowWidth: 375 }),
  getMenuButtonBoundingClientRect: () => ({ top: 55, height: 32, right: 368 }),
  getUpdateManager: null,
};
let captured = null;
global.App = (o) => { captured = o; };

// 用桩替掉网络层
let stub = { dm: 0, notify: 0, dmFail: false, notifyFail: false };
const apiPath = require.resolve(`${ROOT}/api/index.js`);
require.cache[apiPath] = { id: apiPath, loaded: true, exports: {
  unreadDm: () => (stub.dmFail ? Promise.reject(new Error('x')) : Promise.resolve({ count: stub.dm })),
  unreadNotifications: () => (stub.notifyFail ? Promise.reject(new Error('x')) : Promise.resolve({ count: stub.notify })),
  me: () => Promise.resolve({ guest: true }),
} };

require(`${ROOT}/app.js`);
const app = captured;

let emits = 0;
const orig = app.emit;
app.emit = function (...a) { emits++; return orig.apply(this, a); };

const g = app.globalData;
let pass = 0; let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name} ${extra}`); fail++; }
};

(async () => {
  console.log('起始 unreadDm=%d unreadNotify=%d\n', g.unreadDm, g.unreadNotify);

  emits = 0;
  await app.refreshUnread();
  check('都是 0、与现值一致 → 不广播', emits === 0, `实际广播 ${emits} 次`);

  stub.dm = 3; stub.notify = 5;
  emits = 0;
  await app.refreshUnread();
  check('两个值都变 → 只广播 1 次（而非 2 次）', emits === 1, `实际广播 ${emits} 次`);
  check('  数值已更新', g.unreadDm === 3 && g.unreadNotify === 5, `得到 ${g.unreadDm}/${g.unreadNotify}`);

  emits = 0;
  await app.refreshUnread();
  check('重复拉取、值未变 → 不广播', emits === 0, `实际广播 ${emits} 次`);

  stub.dmFail = true; stub.notify = 5;
  emits = 0;
  await app.refreshUnread();
  check('私信接口失败 → 保留原值 3，不误清成 0', g.unreadDm === 3, `得到 ${g.unreadDm}`);
  check('  且不产生无谓广播', emits === 0, `实际广播 ${emits} 次`);

  stub.dmFail = false; stub.dm = 0; stub.notify = 0;
  emits = 0;
  await app.refreshUnread();
  check('读完消息、归零 → 广播 1 次让角标消失', emits === 1 && g.unreadDm === 0 && g.unreadNotify === 0,
    `广播 ${emits} 次，值 ${g.unreadDm}/${g.unreadNotify}`);

  console.log(`\n通过 ${pass}，失败 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
