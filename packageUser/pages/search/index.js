const api = require('../../../api/index');
const { PRODUCTS, ARTICLES } = require('../../../data');
const { debounce, toast, timeAgo } = require('../../../utils/util');

const app = getApp();
const HISTORY_KEY = 'pawly_search_history';
const HOT = ['冻干', '猫砂', '疫苗', '幼犬', '软便', '磨牙', '驱虫', '换粮'];

Page({
  data: {
    q: '',
    tab: 'all',       // all | product | article | post
    hot: HOT,
    history: [],
    products: [],
    articles: [],
    posts: [],
    searched: false,
    loadingPosts: false,
  },

  onLoad(query) {
    this.setData({
      tab: query.tab || 'all',
      history: wx.getStorageSync(HISTORY_KEY) || [],
    });
    this.debounced = debounce(() => this.run(), 320);
  },

  onInput(e) {
    this.setData({ q: e.detail.value });
    if (!e.detail.value) return this.setData({ searched: false, products: [], articles: [], posts: [] });
    this.debounced();
  },
  onConfirm() { this.run(true); },
  onTab(e) { this.setData({ tab: e.currentTarget.dataset.t }); },
  onWord(e) { this.setData({ q: e.currentTarget.dataset.w }, () => this.run(true)); },
  clearQ() { this.setData({ q: '', searched: false, products: [], articles: [], posts: [] }); },

  clearHistory() {
    wx.removeStorageSync(HISTORY_KEY);
    this.setData({ history: [] });
  },

  saveHistory(kw) {
    const history = [kw].concat((this.data.history || []).filter((h) => h !== kw)).slice(0, 10);
    wx.setStorageSync(HISTORY_KEY, history);
    this.setData({ history });
  },

  run(record) {
    const kw = String(this.data.q || '').trim();
    if (!kw) return;
    if (record) this.saveHistory(kw);

    const products = PRODUCTS.filter((p) => p.name.indexOf(kw) >= 0 || (p.sub || '').indexOf(kw) >= 0
      || (p.desc || '').indexOf(kw) >= 0 || (p.badges || []).some((b) => b.indexOf(kw) >= 0)).slice(0, 12);
    const articles = ARTICLES.filter((a) => a.title.indexOf(kw) >= 0 || a.excerpt.indexOf(kw) >= 0).slice(0, 12);

    this.setData({ products, articles, searched: true, loadingPosts: true });

    api.searchPosts(kw)
      .then((list) => this.setData({
        posts: (list || []).slice(0, 12).map((p) => Object.assign({}, p, { time: timeAgo(p.createdAt) })),
        loadingPosts: false,
      }))
      .catch(() => this.setData({ posts: [], loadingPosts: false }));
  },

  goProduct(e) { wx.navigateTo({ url: `/packageShop/pages/product/index?id=${e.detail.id}` }); },
  goArticle(e) { wx.navigateTo({ url: `/packageContent/pages/article/index?id=${e.detail.id}` }); },
  goPost(e) { wx.navigateTo({ url: `/packageSocial/pages/post/index?id=${e.currentTarget.dataset.id}` }); },
  onAdd(e) {
    const p = PRODUCTS.find((x) => x.id === e.detail.id);
    if (!p) return;
    if (p.stock === 0) return toast('这款暂时缺货');
    app.addToCart(p, 1);
    toast('已加入购物车');
  },
  askAI() { wx.switchTab({ url: '/pages/ai/index' }); },
});
