const { PRODUCTS, ARTICLES, CATEGORIES } = require('../../data');
const { toast } = require('../../utils/util');
const syncTab = require('../../utils/tabbar');
const api = require('../../api/index');

const app = getApp();

Page({
  data: {
    navClear: true,
    featured: [],
    newArrivals: [],
    journal: [],
    categories: [],
    unreadNotify: 0,
    trust: [
      { no: '01', t: '有问题，先问一句', d: '掉毛、软便、挑食、要不要驱虫……随时开口，AI 管家马上接住。' },
      { no: '02', t: '答案有出处', d: '回答基于站内循证科普与 WSAVA、ESCCAP 等权威兽医指南，文末标注来源。' },
      { no: '03', t: '需要买，才推荐', d: '确实需要用到什么，AI 才会从严选清单里帮你挑，一键加购。' },
    ],
    perks: [
      { e: '🤖', t: 'AI 额度升级' },
      { e: '💳', t: '全场 9 折' },
      { e: '🏥', t: '年度体检' },
      { e: '🎂', t: '生日福利' },
    ],
    demo: [
      { role: 'user', text: '我家布偶 8 个月，最近有点软便，要换粮吗？' },
      { role: 'ai', text: '先别急着换粮。软便更常见的原因是喂食量或零食变化，先观察 48 小时……' },
    ],
  },

  onLoad() {
    this.setData({
      featured: PRODUCTS.slice(0, 8),
      newArrivals: PRODUCTS.filter((p) => p.tag === '新品' || p.cat === 'snack').slice(0, 4),
      journal: ARTICLES.slice(0, 8),
      categories: CATEGORIES.slice(1),
    });
  },

  onShow() {
    syncTab(this, 0);
    this.setData({ unreadNotify: app.globalData.unreadNotify || 0 });
    this.off = app.on('unread', (g) => this.setData({ unreadNotify: g.unreadNotify || 0 }));
  },

  onHide() { this.off && this.off(); },
  onUnload() { this.off && this.off(); },

  onPageScroll(e) {
    const clear = e.scrollTop < 60;
    if (clear !== this.data.navClear) this.setData({ navClear: clear });
  },

  onPullDownRefresh() {
    app.refreshUnread();
    wx.stopPullDownRefresh();
  },

  /* —— 跳转 —— */
  goAI() { wx.switchTab({ url: '/pages/ai/index' }); },
  goShop(e) {
    const cat = e.currentTarget.dataset.cat;
    wx.setStorageSync('pawly_shop_cat', cat || 'all');
    wx.switchTab({ url: '/pages/shop/index' });
  },
  goArticles() { wx.navigateTo({ url: '/packageContent/pages/articles/index' }); },
  goArticle(e) { wx.navigateTo({ url: `/packageContent/pages/article/index?id=${e.detail.id}` }); },
  goProduct(e) { wx.navigateTo({ url: `/packageShop/pages/product/index?id=${e.detail.id}` }); },
  goSearch() { wx.navigateTo({ url: '/packageUser/pages/search/index' }); },
  goNotify() { wx.navigateTo({ url: '/packageSocial/pages/notifications/index' }); },
  goMember() { wx.navigateTo({ url: '/packageUser/pages/member/index?tab=benefits' }); },
  goCart() { wx.navigateTo({ url: '/packageShop/pages/cart/index' }); },

  onAdd(e) {
    const p = PRODUCTS.find((x) => x.id === e.detail.id);
    if (!p) return;
    if (p.stock === 0) return toast('这款暂时缺货');
    app.addToCart(p, 1);
    toast(`已加入购物车 · ${p.name.slice(0, 10)}`);
  },
});
