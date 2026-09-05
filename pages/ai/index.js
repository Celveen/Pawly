const api = require('../../api/index');
const config = require('../../config');
const { chatStream } = require('../../utils/stream');
const { PRODUCTS, productById } = require('../../data/index');
const { fmt, toast } = require('../../utils/util');
const syncTab = require('../../utils/tabbar');

const app = getApp();

const QUICK = [
  '我家狗刚到家，怎么养',
  '帮我家猫挑款主食',
  '狗狗肠胃不好吃什么',
  '会员有什么权益？',
];

const GREETING = {
  id: 'greeting',
  role: 'assistant',
  content: '你好呀，我是宝狸助手 🐾\n\n养宠上的问题都可以问我：喂养、驱虫、训练、挑粮……我会先把问题讲清楚，确实需要买什么，才从站内严选清单里帮你挑。\n\n提一句你家宝贝的物种、年龄和体重，我的建议会更贴合它。',
  proposals: [],
};

Page({
  data: {
    messages: [],
    input: '',
    sending: false,
    quick: QUICK,
    scrollTo: '',
    inputBottom: 0,
    showQuick: true,
    navH: 64,
    composerBottom: 'calc(108rpx + env(safe-area-inset-bottom))',
  },

  onLoad() {
    const g = app.globalData;
    this.setData({ messages: [GREETING], navH: g.statusBarHeight + g.navBarHeight });
    this.loadHistory();
  },

  onShow() { syncTab(this, 2); },

  loadHistory() {
    api.chatHistory()
      .then((list) => {
        if (!list || !list.length) return;
        const msgs = list.map((m, i) => ({ role: m.role, content: m.content, proposals: [], id: `h${i}` }));
        this.setData({ messages: [GREETING].concat(msgs), showQuick: false }, () => this.scrollBottom());
      })
      .catch(() => { /* 拉不到历史不影响新对话 */ });
  },

  onInput(e) { this.setData({ input: e.detail.value }); },

  onFocus(e) {
    const h = e.detail.height || 0;
    // 键盘弹起时把输入条抬到键盘上方；收起时落回自定义 tabBar 上方
    this.setData({ inputBottom: h, composerBottom: `${h}px` }, () => this.scrollBottom());
  },
  onBlur() {
    this.setData({ inputBottom: 0, composerBottom: 'calc(108rpx + env(safe-area-inset-bottom))' });
  },

  onQuick(e) {
    this.send(e.currentTarget.dataset.q);
  },

  onSend() {
    const text = String(this.data.input || '').trim();
    if (!text) return;
    this.send(text);
  },

  send(text) {
    if (this.data.sending) return toast('宝狸还在想上一个问题…');

    const messages = this.data.messages.concat([
      { role: 'user', content: text, proposals: [], id: `u${Date.now()}` },
      { role: 'assistant', content: '', proposals: [], pending: true, id: `a${Date.now()}` },
    ]);
    this.setData({ messages, input: '', sending: true, showQuick: false }, () => this.scrollBottom());

    // 发给后端的历史：只带 role/content，去掉本地字段
    const payload = messages
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, content: m.content }));

    const idx = messages.length - 1;
    const onDelta = (chunk) => {
      const cur = this.data.messages[idx];
      this.setData({
        [`messages[${idx}].content`]: (cur.content || '') + chunk,
        [`messages[${idx}].pending`]: false,
      }, () => this.scrollBottom());
    };
    const onReset = () => this.setData({ [`messages[${idx}].content`]: '' });

    const done = (result) => {
      this.setData({
        [`messages[${idx}].content`]: result.reply || this.data.messages[idx].content,
        [`messages[${idx}].pending`]: false,
        [`messages[${idx}].proposals`]: this.decorate(result.proposals),
        sending: false,
      }, () => this.scrollBottom());
    };

    const fail = () => {
      this.setData({
        [`messages[${idx}].content`]: '抱歉，AI 暂时不可用，请稍后再试。\n\n（如果是本地联调：检查 config.js 的 baseUrl，或把 useMock 打开先跑通界面）',
        [`messages[${idx}].pending`]: false,
        sending: false,
      }, () => this.scrollBottom());
    };

    const fallback = () => api.chat(payload).then(done).catch(fail);

    if (config.useChatStream && !config.useMock) {
      chatStream(payload, { onDelta, onReset }).then(done).catch(fallback);
    } else {
      fallback();
    }
  },

  /** 把方案里的 productIds 换成可渲染的商品对象 */
  decorate(proposals) {
    return (proposals || []).map((pr) => ({
      title: pr.title,
      badge: pr.badge,
      reason: pr.reason,
      items: (pr.productIds || [])
        .map((id) => productById(id))
        .filter(Boolean)
        .map((p) => Object.assign({}, p, { priceText: fmt(p.price) })),
      total: fmt((pr.productIds || []).reduce((s, id) => {
        const p = productById(id);
        return s + (p ? p.price : 0);
      }, 0)),
    }));
  },

  scrollBottom() {
    const last = this.data.messages[this.data.messages.length - 1];
    if (last) this.setData({ scrollTo: `msg-${last.id || this.data.messages.length - 1}` });
  },

  /* —— 方案交互 —— */
  addProduct(e) {
    const p = productById(e.currentTarget.dataset.id);
    if (!p) return;
    app.addToCart(p, 1);
    toast(`已加入购物车 · ${p.name.slice(0, 10)}`);
  },
  addAll(e) {
    const { m, p } = e.currentTarget.dataset;
    const proposal = this.data.messages[m].proposals[p];
    proposal.items.forEach((it) => app.addToCart(it, 1));
    toast(`${proposal.items.length} 件已加入购物车`);
  },
  goProduct(e) {
    wx.navigateTo({ url: `/packageShop/pages/product/index?id=${e.currentTarget.dataset.id}` });
  },
  goCart() { wx.navigateTo({ url: '/packageShop/pages/cart/index' }); },

  clearChat() {
    wx.showModal({
      title: '清空对话',
      content: '只清掉这台设备上显示的对话记录，服务端历史不受影响。',
      confirmColor: '#2C563A',
      success: (r) => {
        if (r.confirm) this.setData({ messages: [GREETING], showQuick: true });
      },
    });
  },
});
