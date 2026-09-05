const { PRODUCTS, productById, CATEGORIES } = require('../../../data');
const { getPetSpecies } = require('../../../utils/pet-species');
const { fmt, toast, abbr, timeAgo } = require('../../../utils/util');
const api = require('../../../api/index');

const app = getApp();

Page({
  data: {
    p: null,
    petLabel: '',
    petEmoji: '',
    catName: '',
    priceText: '',
    wasText: '',
    soldText: '',
    qty: 1,
    cartCount: 0,
    related: [],
    reviews: [],
    reviewsLoading: true,
  },

  onLoad(query) {
    const p = productById(query.id);
    if (!p) {
      toast('商品不存在');
      return setTimeout(() => wx.navigateBack(), 800);
    }
    const s = getPetSpecies(p.pet);
    const cat = CATEGORIES.find((c) => c.id === p.cat);
    this.setData({
      p,
      petLabel: s.label,
      petEmoji: s.emoji,
      catName: cat ? cat.name : '',
      priceText: fmt(p.price),
      wasText: p.was ? fmt(p.was) : '',
      soldText: abbr(p.sold),
      related: PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 6),
    });

    api.reviews(p.id)
      .then((list) => this.setData({
        reviews: (list || []).map((r) => Object.assign({}, r, { time: timeAgo(r.createdAt) })),
        reviewsLoading: false,
      }))
      .catch(() => this.setData({ reviews: [], reviewsLoading: false }));
  },

  onShow() { this.setData({ cartCount: app.cartCount() }); },

  minus() { this.setData({ qty: Math.max(1, this.data.qty - 1) }); },
  plus() { this.setData({ qty: Math.min(99, this.data.qty + 1) }); },

  addToCart() {
    const { p, qty } = this.data;
    if (p.stock === 0) return toast('这款暂时缺货');
    app.addToCart(p, qty);
    this.setData({ cartCount: app.cartCount() });
    toast(`已加入购物车 ×${qty}`);
  },

  buyNow() {
    const { p, qty } = this.data;
    if (p.stock === 0) return toast('这款暂时缺货');
    wx.setStorageSync('pawly_buy_now', [{ id: p.id, name: p.name, emoji: p.emoji, bg: p.bg, price: p.price, sub: p.sub, qty }]);
    wx.navigateTo({ url: '/packageShop/pages/checkout/index?mode=now' });
  },

  goCart() { wx.navigateTo({ url: '/packageShop/pages/cart/index' }); },
  goProduct(e) { wx.redirectTo({ url: `/packageShop/pages/product/index?id=${e.detail.id}` }); },
  onAddRelated(e) {
    const p = productById(e.detail.id);
    if (!p) return;
    if (p.stock === 0) return toast('这款暂时缺货');
    app.addToCart(p, 1);
    this.setData({ cartCount: app.cartCount() });
    toast('已加入购物车');
  },
  askAI() {
    wx.switchTab({ url: '/pages/ai/index' });
  },

  onShareAppMessage() {
    return {
      title: this.data.p ? this.data.p.name : 'Pawly 宝狸',
      path: `/packageShop/pages/product/index?id=${this.data.p ? this.data.p.id : ''}`,
    };
  },
});
