/**
 * Mock 层：config.useMock = true 时接管 wx.request，让整个小程序在没有后端的
 * 情况下也能完整跑通（评审、演示、纯前端联调都用它）。
 *
 * 路由表按 `METHOD /path` 匹配，返回结构与网页端 app/api/**\/route.ts 保持一致，
 * 所以从 mock 切到真后端时，页面代码一行都不用改。
 */
const config = require('../config');
const seed = require('./seed');
const { PRODUCTS } = require('../data');
const { uuid, ymd } = require('../utils/util');

const STORE_KEY = 'pawly_mock_db';
const VERSION = 4;
const LATENCY = 240; // 模拟网络延迟，让 loading 态看得见

let db = null;

const nowMinus = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const err = (status, message) => Object.assign(new Error(message), { status });

function initDb() {
  const saved = wx.getStorageSync(STORE_KEY);
  if (saved && saved.version === VERSION) return saved;

  const posts = seed.posts.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    topic: p.topic,
    topics: p.topics || [],
    images: [],
    emoji: p.emoji,
    bg: p.bg,
    petName: p.petName || null,
    createdAt: nowMinus(p.hoursAgo),
    authorId: p.userId,
    likedBy: ((seed.likes.find((l) => l.postId === p.id) || {}).userIds || []).slice(),
    favoritedBy: [],
  }));

  const comments = seed.comments.map((c, i) => ({
    id: `seed-c${i}`,
    postId: c.postId,
    userId: c.userId,
    content: c.content,
    createdAt: nowMinus(20 + i * 3),
  }));

  return {
    version: VERSION,
    me: {
      guest: true, id: 'me', pawlyId: null, nickname: '', avatarEmoji: '🐾', bio: '',
      gender: '', birthday: '', location: '', points: 0,
    },
    users: seed.users.slice(),
    posts,
    comments,
    pets: [],
    orders: [],
    addresses: [],
    reminderDone: [],
    notifications: [
      { id: 'n1', kind: 'interact', actorId: 'demo-momo', postId: 'seed-cat-day30', text: '赞了你的笔记', createdAt: nowMinus(2), read: false },
      { id: 'n2', kind: 'follow', actorId: 'demo-doudou', text: '关注了你', createdAt: nowMinus(9), read: false },
      { id: 'n3', kind: 'comment', actorId: 'demo-xiaolu', postId: 'seed-nail-trim', text: '评论了你的笔记：学到了，今晚就试', createdAt: nowMinus(26), read: true },
    ],
    messages: [],
    follows: [],
    chat: [],
    checkin: { last: '', streak: 0 },
  };
}

function save() {
  try { wx.setStorageSync(STORE_KEY, db); } catch (e) { /* 存储满了忽略，不影响本次会话 */ }
}

/* ——————————————— 序列化 ——————————————— */

function userOf(id) {
  return db.users.find((u) => u.id === id) || { id, nickname: '铲屎官', avatarEmoji: '👤', bio: '' };
}

function meName() {
  return db.me.nickname || `铲屎官${String(db.me.id).slice(-4)}`;
}

function serializePost(p, light) {
  const author = p.authorId === 'me' ? { nickname: meName(), avatarEmoji: db.me.avatarEmoji } : userOf(p.authorId);
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    topic: p.topic,
    topics: p.topics || [],
    images: light ? (p.images || []).slice(0, 1) : (p.images || []),
    imagesCount: (p.images || []).length,
    emoji: p.emoji,
    bg: p.bg,
    petName: p.petName || null,
    createdAt: p.createdAt,
    authorId: p.authorId,
    author: author.nickname || '铲屎官',
    authorAvatar: author.avatarEmoji || '👤',
    authorAvatarUrl: null,
    mine: p.authorId === 'me',
    likeCount: p.likedBy.length,
    likedByMe: p.likedBy.indexOf('me') >= 0,
    favoriteCount: p.favoritedBy.length,
    favoritedByMe: p.favoritedBy.indexOf('me') >= 0,
    commentCount: db.comments.filter((c) => c.postId === p.id).length,
  };
}

function petSnapshot(p) {
  const months = p.birthday ? Math.max(0, Math.floor((Date.now() - new Date(String(p.birthday).replace(/-/g, '/')).getTime()) / (30.44 * 86400000))) : null;
  const ageText = months == null ? '未知（建议补充出生日期）'
    : months < 12 ? `${months} 个月`
      : `${Math.floor(months / 12)} 岁${months % 12 ? ` ${months % 12} 个月` : ''}`;
  return {
    name: p.name, species: p.species, breed: p.breed || null, sex: p.sex || null,
    birthday: p.birthday || null, ageText, ageMonths: months,
    lifeStage: months == null ? null : months < 12 ? '幼年期' : months < 84 ? '成年期' : '老年期',
    weightKg: p.weightKg == null ? null : p.weightKg,
    weightUpdatedAt: p.weightUpdatedAt || null,
    weightStale: false,
    notes: p.notes || null,
  };
}

/* ——————————————— 路由表 ——————————————— */

const routes = {
  /* 账号 */
  'GET /api/auth/me': () => (db.me.guest
    ? { guest: true, id: db.me.id, pawlyId: null, nickname: db.me.nickname, avatarEmoji: db.me.avatarEmoji, avatarUrl: null, bio: db.me.bio, gender: db.me.gender, birthday: db.me.birthday, location: db.me.location, points: db.me.points }
    : Object.assign({ guest: false, avatarUrl: null, phoneMasked: db.me.phoneMasked || null, emailMasked: db.me.emailMasked || null }, db.me)),

  'POST /api/auth/login': (q, b) => {
    if (!b.account || !b.password) throw err(400, '请输入账号和密码');
    if (String(b.password).length < 6) throw err(400, '密码至少 6 位');
    Object.assign(db.me, {
      guest: false, id: 'me', pawlyId: 'PAWLY' + String(Math.random()).slice(2, 5),
      nickname: db.me.nickname || '宝狸用户', points: 120,
      phoneMasked: /^1\d{10}$/.test(b.account) ? `${b.account.slice(0, 3)}****${b.account.slice(7)}` : null,
      emailMasked: b.account.indexOf('@') > 0 ? b.account.replace(/^(.{1,2}).*(@.*)$/, '$1***$2') : null,
    });
    return { ok: true, userId: 'me', account: b.account, kind: b.account.indexOf('@') > 0 ? 'email' : 'phone' };
  },

  'POST /api/auth/register': (q, b) => routes['POST /api/auth/login'](q, b),

  'POST /api/auth/logout': () => {
    db.me = initDb().me;
    return { ok: true };
  },

  'POST /api/auth/password': (q, b) => {
    if (!b.newPassword || String(b.newPassword).length < 6) throw err(400, '新密码至少 6 位');
    return { ok: true };
  },

  /* 个人资料 */
  'GET /api/profile': (q) => {
    const target = q.userId || 'me';
    const u = target === 'me' ? Object.assign({ id: 'me', nickname: meName() }, db.me) : userOf(target);
    const posts = db.posts.filter((p) => p.authorId === target).map((p) => serializePost(p, true));
    return {
      id: target, pawlyId: u.pawlyId || null, nickname: u.nickname || meName(),
      avatarEmoji: u.avatarEmoji || '🐾', avatarUrl: null, bio: u.bio || '', gender: u.gender || '',
      birthday: u.birthday || '', location: u.location || '', points: u.points || 0,
      postCount: posts.length,
      followerCount: db.follows.filter((f) => f.to === target).length,
      followingCount: db.follows.filter((f) => f.from === target).length,
      likeCount: posts.reduce((s, p) => s + p.likeCount, 0),
      followedByMe: db.follows.some((f) => f.from === 'me' && f.to === target),
      isMe: target === 'me',
      posts,
    };
  },

  'POST /api/profile': (q, b) => {
    ['nickname', 'bio', 'avatarEmoji', 'gender', 'birthday', 'location'].forEach((k) => {
      if (b[k] !== undefined) db.me[k] = b[k];
    });
    return { ok: true };
  },

  'GET /api/profile/follows': (q) => {
    const target = q.userId || 'me';
    const ids = q.kind === 'followers'
      ? db.follows.filter((f) => f.to === target).map((f) => f.from)
      : db.follows.filter((f) => f.from === target).map((f) => f.to);
    return ids.map((id) => {
      const u = userOf(id);
      return { id, nickname: u.nickname, avatarEmoji: u.avatarEmoji, avatarUrl: null, bio: u.bio, followedByMe: db.follows.some((f) => f.from === 'me' && f.to === id) };
    });
  },

  'GET /api/profile/collection': (q) => {
    if (q.kind === 'liked') return db.posts.filter((p) => p.likedBy.indexOf('me') >= 0).map((p) => serializePost(p, true));
    return db.posts.filter((p) => p.favoritedBy.indexOf('me') >= 0).map((p) => serializePost(p, true));
  },

  'GET /api/users/search': (q) => {
    const kw = String(q.q || '').trim();
    if (!kw) return [];
    return db.users.filter((u) => (u.nickname || '').indexOf(kw) >= 0 || u.id.indexOf(kw) >= 0)
      .map((u) => ({ id: u.id, nickname: u.nickname, avatarEmoji: u.avatarEmoji, avatarUrl: null, bio: u.bio, pawlyId: u.id.toUpperCase() }));
  },

  'POST /api/follow': (q, b) => {
    const i = db.follows.findIndex((f) => f.from === 'me' && f.to === b.userId);
    if (i >= 0) db.follows.splice(i, 1);
    else db.follows.push({ from: 'me', to: b.userId });
    return { ok: true, following: i < 0 };
  },

  /* 商品与订单 */
  'GET /api/products': () => PRODUCTS,

  'GET /api/reviews': (q) => [
    { id: 'r1', productId: q.productId, user: '糯米麻麻', avatarEmoji: '🐱', rating: 5, content: '主子第一次一口气吃完，回购了。', createdAt: nowMinus(30) },
    { id: 'r2', productId: q.productId, user: '豆豆爸', avatarEmoji: '🐶', rating: 4, content: '包装扎实，颗粒比想象中小一点，狗狗接受度不错。', createdAt: nowMinus(96) },
  ],

  'POST /api/reviews': () => ({ ok: true }),

  'GET /api/orders': () => db.orders,

  'POST /api/orders': (q, b) => {
    const lines = (b.items || []).map((l) => {
      const p = PRODUCTS.find((x) => x.id === l.id);
      return { id: l.id, name: p ? p.name : l.id, emoji: p ? p.emoji : '🎁', bg: p ? p.bg : '#EEE', price: p ? p.price : 0, qty: l.qty || 1 };
    });
    const total = lines.reduce((s, l) => s + l.price * l.qty, 0) + (Number(b.shipping) || 0);
    const order = {
      id: 'PW' + Date.now(),
      items: lines,
      total,
      status: '待发货',
      delivery: b.delivery || 'standard',
      address: b.address || null,
      createdAt: new Date().toISOString(),
    };
    db.orders.unshift(order);
    return order;
  },

  /* 社区 */
  'GET /api/posts': (q) => {
    if (q.id) {
      const p = db.posts.find((x) => x.id === q.id);
      if (!p) throw err(404, '笔记不存在或已删除');
      return serializePost(p, false);
    }
    return db.posts
      .filter((p) => !q.topic || q.topic === 'all' || p.topic === q.topic)
      .sort((a, b2) => new Date(b2.createdAt) - new Date(a.createdAt))
      .map((p) => serializePost(p, true));
  },

  'POST /api/posts': (q, b) => {
    if (!b.title || !b.content) throw err(400, '标题和内容都不能为空');
    const post = {
      id: 'p' + uuid().slice(0, 8),
      title: String(b.title).slice(0, 40),
      content: String(b.content).slice(0, 2000),
      topic: b.topic || '日常',
      topics: b.topics || [],
      images: b.images || [],
      emoji: b.emoji || '🐾',
      bg: b.bg || '#F4D7B0',
      petName: b.petName || null,
      createdAt: new Date().toISOString(),
      authorId: 'me',
      likedBy: [],
      favoritedBy: [],
    };
    db.posts.unshift(post);
    return serializePost(post, false);
  },

  'DELETE /api/posts': (q) => {
    const i = db.posts.findIndex((p) => p.id === q.id && p.authorId === 'me');
    if (i < 0) throw err(404, '笔记不存在或不属于你');
    db.posts.splice(i, 1);
    return { ok: true };
  },

  'POST /api/posts/like': (q, b) => toggle(b.postId, 'likedBy'),
  'POST /api/posts/favorite': (q, b) => toggle(b.postId, 'favoritedBy'),

  'GET /api/posts/search': (q) => {
    const kw = String(q.q || '').trim();
    if (!kw) return [];
    return db.posts
      .filter((p) => p.title.indexOf(kw) >= 0 || p.content.indexOf(kw) >= 0 || (p.topics || []).join(',').indexOf(kw) >= 0)
      .map((p) => serializePost(p, true));
  },

  'GET /api/comments': (q) => db.comments
    .filter((c) => c.postId === q.postId)
    .map((c) => {
      const u = c.userId === 'me' ? { nickname: meName(), avatarEmoji: db.me.avatarEmoji } : userOf(c.userId);
      return { id: c.id, postId: c.postId, userId: c.userId, author: u.nickname, authorAvatar: u.avatarEmoji, authorAvatarUrl: null, content: c.content, createdAt: c.createdAt, mine: c.userId === 'me' };
    }),

  'POST /api/comments': (q, b) => {
    if (!b.content) throw err(400, '说点什么吧');
    const c = { id: 'c' + uuid().slice(0, 8), postId: b.postId, userId: 'me', content: String(b.content).slice(0, 300), createdAt: new Date().toISOString() };
    db.comments.push(c);
    return { id: c.id, postId: c.postId, userId: 'me', author: meName(), authorAvatar: db.me.avatarEmoji, authorAvatarUrl: null, content: c.content, createdAt: c.createdAt, mine: true };
  },

  'DELETE /api/comments': (q) => {
    const i = db.comments.findIndex((c) => c.id === q.id && c.userId === 'me');
    if (i < 0) throw err(404, '评论不存在');
    db.comments.splice(i, 1);
    return { ok: true };
  },

  /* 通知 */
  'GET /api/notifications': (q) => {
    if (q.unread) return { count: db.notifications.filter((n) => !n.read).length };
    return db.notifications
      .filter((n) => !q.kind || q.kind === 'all' || n.kind === q.kind)
      .map((n) => {
        const u = userOf(n.actorId);
        return { id: n.id, kind: n.kind, text: n.text, postId: n.postId || null, createdAt: n.createdAt, read: n.read, actorId: n.actorId, actor: u.nickname, actorAvatar: u.avatarEmoji, actorAvatarUrl: null };
      });
  },

  'POST /api/notifications': () => {
    db.notifications.forEach((n) => { n.read = true; });
    return { ok: true };
  },

  /* 私信 */
  'GET /api/dm': () => {
    const peers = {};
    db.messages.forEach((m) => {
      const peer = m.from === 'me' ? m.to : m.from;
      if (!peers[peer] || new Date(peers[peer].createdAt) < new Date(m.createdAt)) {
        peers[peer] = { createdAt: m.createdAt, text: m.text || (m.images && m.images.length ? '[图片]' : '') };
      }
    });
    return Object.keys(peers).map((id) => {
      const u = userOf(id);
      return { peerId: id, nickname: u.nickname, avatarEmoji: u.avatarEmoji, avatarUrl: null, lastMessage: peers[id].text, lastAt: peers[id].createdAt, unread: db.messages.filter((m) => m.from === id && !m.read).length };
    }).sort((a, b2) => new Date(b2.lastAt) - new Date(a.lastAt));
  },

  'GET /api/dm/thread': (q) => {
    db.messages.forEach((m) => { if (m.from === q.peerId) m.read = true; });
    const u = userOf(q.peerId);
    return {
      peer: { id: q.peerId, nickname: u.nickname, avatarEmoji: u.avatarEmoji, avatarUrl: null },
      messages: db.messages.filter((m) => m.from === q.peerId || m.to === q.peerId),
    };
  },

  'POST /api/dm': (q, b) => {
    if (db.me.guest) throw err(401, '请先登录后再使用私信');
    const msg = { id: 'm' + uuid().slice(0, 8), from: 'me', to: b.peerId, text: b.text || '', images: b.images || [], createdAt: new Date().toISOString(), read: true };
    db.messages.push(msg);
    // 演示：对方 1.2 秒后自动回一句，方便看到会话效果
    setTimeout(() => {
      db.messages.push({ id: 'm' + uuid().slice(0, 8), from: b.peerId, to: 'me', text: '收到啦～我等下回复你 🐾', images: [], createdAt: new Date().toISOString(), read: false });
      save();
    }, 1200);
    return msg;
  },

  'DELETE /api/dm': (q) => {
    db.messages = db.messages.filter((m) => m.from !== q.peerId && m.to !== q.peerId);
    return { ok: true };
  },

  'GET /api/dm/unread': () => ({ count: db.me.guest ? 0 : db.messages.filter((m) => m.to === 'me' && !m.read).length }),

  /* 宠物档案 */
  'GET /api/pets': () => db.pets.map(petSnapshot),

  'POST /api/pets': (q, b) => {
    if (!b.name || !b.species) throw err(400, '请填写名字和物种');
    const i = db.pets.findIndex((p) => p.name === b.name);
    const pet = Object.assign({}, i >= 0 ? db.pets[i] : {}, b);
    if (b.weightKg != null) pet.weightUpdatedAt = ymd(new Date());
    if (i >= 0) db.pets[i] = pet; else db.pets.push(pet);
    return petSnapshot(pet);
  },

  'DELETE /api/pets': (q) => {
    db.pets = db.pets.filter((p) => p.name !== q.name);
    return { ok: true };
  },

  /* 健康提醒 */
  'GET /api/reminders': () => {
    const items = [];
    const now = new Date();
    db.pets.forEach((pet) => {
      const isCatDog = pet.species === '狗' || pet.species === '猫';
      let annual = pet.birthday ? new Date(String(pet.birthday).replace(/-/g, '/')) : new Date(now.getFullYear(), 11, 31);
      if (pet.birthday) {
        annual.setFullYear(now.getFullYear());
        if (annual < now) annual.setFullYear(now.getFullYear() + 1);
      }
      const push = (type, label, due, key) => items.push({ petId: pet.name, petName: pet.name, type, label, due: due.toISOString(), key, done: db.reminderDone.indexOf(key) >= 0 });
      if (isCatDog) push('vaccine', '年度疫苗加强（遵医嘱确认针次）', annual, `${pet.name}:vaccine:${annual.getFullYear()}`);
      push('checkup', '年度基础体检', annual, `${pet.name}:checkup:${annual.getFullYear()}`);
      if (isCatDog) {
        const q = Math.floor(now.getMonth() / 3);
        push('deworm-in', `本季度体内驱虫（Q${q + 1}）`, new Date(now.getFullYear(), q * 3 + 2, 28), `${pet.name}:deworm-in:${now.getFullYear()}-Q${q + 1}`);
        push('deworm-out', `本月体外驱虫（${now.getMonth() + 1} 月）`, new Date(now.getFullYear(), now.getMonth() + 1, 0), `${pet.name}:deworm-out:${now.getFullYear()}-${now.getMonth() + 1}`);
      }
    });
    items.sort((a, b2) => Number(a.done) - Number(b2.done) || new Date(a.due) - new Date(b2.due));
    return items;
  },

  'POST /api/reminders': (q, b) => {
    const i = db.reminderDone.indexOf(b.key);
    if (i >= 0) db.reminderDone.splice(i, 1); else db.reminderDone.push(b.key);
    return { ok: true, done: i < 0 };
  },

  /* 收货地址 */
  'GET /api/addresses': () => db.addresses,

  'POST /api/addresses': (q, b) => {
    if (!b.name || !b.phone || !b.detail) throw err(400, '请填写完整的收货信息');
    if (!/^1\d{10}$/.test(b.phone)) throw err(400, '手机号格式不正确');
    const addr = Object.assign({ id: b.id || 'a' + uuid().slice(0, 6) }, b);
    if (addr.isDefault) db.addresses.forEach((a) => { a.isDefault = false; });
    const i = db.addresses.findIndex((a) => a.id === addr.id);
    if (i >= 0) db.addresses[i] = addr; else db.addresses.push(addr);
    if (db.addresses.length === 1) db.addresses[0].isDefault = true;
    return addr;
  },

  'DELETE /api/addresses': (q) => {
    db.addresses = db.addresses.filter((a) => a.id !== q.id);
    return { ok: true };
  },

  'POST /api/addresses/default': (q, b) => {
    db.addresses.forEach((a) => { a.isDefault = a.id === b.id; });
    return { ok: true };
  },

  /* 签到 */
  'GET /api/checkin': () => ({ done: db.checkin.last === ymd(new Date()), streak: db.checkin.streak, points: db.me.points }),

  'POST /api/checkin': () => {
    const today = ymd(new Date());
    if (db.checkin.last === today) return { ok: false, done: true, streak: db.checkin.streak, points: db.me.points };
    const yesterday = ymd(new Date(Date.now() - 86400000));
    db.checkin.streak = db.checkin.last === yesterday ? db.checkin.streak + 1 : 1;
    db.checkin.last = today;
    const reward = db.checkin.streak >= 7 ? 10 : 5;
    db.me.points += reward;
    return { ok: true, reward, done: true, streak: db.checkin.streak, points: db.me.points };
  },

  /* AI 管家 */
  'GET /api/chat/history': () => db.chat,
  'GET /api/chat/diagnose': () => ({ ok: true, mode: 'mock', model: 'mock-local' }),
  'POST /api/chat': (q, b) => {
    const msgs = b.messages || [];
    const last = String((msgs[msgs.length - 1] || {}).content || '');
    const result = fakeAgent(last);
    db.chat.push({ role: 'user', content: last }, { role: 'assistant', content: result.reply });
    if (db.chat.length > 40) db.chat = db.chat.slice(-40);
    return result;
  },
};

function toggle(postId, field) {
  const p = db.posts.find((x) => x.id === postId);
  if (!p) throw err(404, '笔记不存在');
  const i = p[field].indexOf('me');
  if (i >= 0) p[field].splice(i, 1); else p[field].push('me');
  return { ok: true, on: i < 0, count: p[field].length };
}

/** 极简"假 Agent"：按关键词挑商品并组一份购物方案，够把交互跑通 */
function fakeAgent(text) {
  const q = String(text);
  const pick = (fn, n) => PRODUCTS.filter(fn).slice(0, n).map((p) => p.id);
  if (/猫/.test(q) && /粮|吃|主食/.test(q)) {
    return {
      reply: '好呀，先说结论：成猫日常主食建议以「高动物蛋白 + 充足饮水」为原则，换粮时和旧粮做 7 天左右过渡。\n\n下面这几款是站内在售里比较稳妥的选择，你可以按主子的适口性挑一款先试小包装。\n\n（当前为本地演示数据，接上后端后由 DeepSeek 双 Agent 给出带出处的回答）',
      proposals: [{ title: '猫主食推荐', badge: '按适口性排序', productIds: pick((p) => p.cat === 'food' && p.pet === '猫', 3), reason: '高蛋白配方、颗粒偏小好咀嚼，挑食猫接受度较高。' }],
    };
  }
  if (/狗|犬/.test(q) && /粮|吃|主食/.test(q)) {
    return {
      reply: '狗狗主粮先看两件事：动物蛋白来源是否明确，颗粒大小是否匹配体型。肠胃敏感的话优先单一蛋白配方，换粮同样走 7 天过渡。\n\n（当前为本地演示数据，接上后端后由 DeepSeek 双 Agent 给出带出处的回答）',
      proposals: [{ title: '狗主粮推荐', badge: '按体型与肠胃', productIds: pick((p) => p.cat === 'food' && p.pet === '狗', 3), reason: '明确动物蛋白来源，含益生元，适合日常长期喂。' }],
    };
  }
  if (/软便|拉稀|呕吐|不吃|精神|发烧|生病/.test(q)) {
    return {
      reply: '这种情况我先给你一个判断框架，但要提前说：症状归因需要面诊，我不能替代兽医。\n\n**先观察这几项**：持续时间、有没有呕吐、精神与食欲、饮水量、便便性状与颜色。\n\n**红旗信号（出现任一项尽快就医）**：精神明显萎靡、持续呕吐无法进食进水、便中带血、腹部胀痛拒摸、幼宠或老年宠物超过 12 小时无改善。\n\n**居家可以做的**：暂停零食、保证清洁饮水、记录发作时间与性状拍照，就诊时给医生看。\n\n（当前为本地演示数据，接上后端后由知识 Agent 给出带来源引用的回答）',
      proposals: [],
    };
  }
  if (/会员|权益|club/i.test(q)) {
    return { reply: 'Pawly Club 会员 ¥29/月，包含：全场 9 折、更多 AI 管家额度、生日礼盒，以及每年一次免费宠物体检。日常买粮买罐头省下来的钱，通常就够回本。你可以在「我的 → 会员权益」里看完整清单。', proposals: [] };
  }
  return {
    reply: `收到～关于「${q.slice(0, 20)}」，我可以帮你把问题讲清楚，需要买东西时再从站内严选清单里挑。\n\n你可以再多告诉我一点：宠物的物种、年龄、体重，以及最近的饮食变化，我给的建议会更贴合它。\n\n（当前为本地演示数据，接上后端后由 DeepSeek 双 Agent 给出带出处的回答）`,
    proposals: [],
  };
}

/* ——————————————— 拦截 ——————————————— */

function parseUrl(url) {
  const noHost = String(url).replace(/^https?:\/\/[^/]+/, '');
  const [path, search] = noHost.split('?');
  const query = {};
  (search || '').split('&').filter(Boolean).forEach((kv) => {
    const [k, v] = kv.split('=');
    query[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return { path, query };
}

module.exports = function applyMock() {
  if (!config.useMock) return;
  db = initDb();
  save();
  const raw = wx.request.bind(wx);
  Object.defineProperty(wx, 'request', {
    writable: true,
    value(options) {
      const { path, query } = parseUrl(options.url);
      const handler = routes[`${(options.method || 'GET').toUpperCase()} ${path}`];
      if (!handler) return raw(options);
      const timer = setTimeout(() => {
        let data;
        try {
          data = handler(query, options.data || {});
        } catch (e) {
          options.success && options.success({ statusCode: e.status || 500, data: { error: e.message } });
          options.complete && options.complete({});
          return;
        }
        save();
        options.success && options.success({ statusCode: 200, data });
        options.complete && options.complete({});
      }, LATENCY);
      return { abort() { clearTimeout(timer); } };
    },
  });
};
