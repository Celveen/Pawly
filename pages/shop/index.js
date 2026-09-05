const { PRODUCTS, CATEGORIES } = require('../../data/index');
const { PET_FILTERS, matchPet } = require('../../utils/pet-species');
const { toast, debounce } = require('../../utils/util');
const syncTab = require('../../utils/tabbar');

const app = getApp();
const SORTS = ['热度', '价格升序', '价格降序', '评分'];
const HOT_WORDS = ['冻干', '猫砂', '磨牙', '主食粮'];

Page({
  data: {
    cats: CATEGORIES,
    pets: PET_FILTERS,
    sorts: SORTS,
    hotWords: HOT_WORDS,
    cat: 'all',
    pet: 'all',
    sort: '热度',
    q: '',
    list: [],
    cartCount: 0,
    sortOpen: false,
  },

  onLoad() {
    const cat = wx.getStorageSync('pawly_shop_cat');
    if (cat) {
      wx.removeStorageSync('pawly_shop_cat');
      this.setData({ cat });
    }
    this.applyFilter();
    this.debouncedFilter = debounce(() => this.applyFilter(), 260);
  },

  onShow() {
    syncTab(this, 1);
    const cat = wx.getStorageSync('pawly_shop_cat');
    if (cat) {
      wx.removeStorageSync('pawly_shop_cat');
      this.setData({ cat }, () => this.applyFilter());
    }
    this.setData({ cartCount: app.cartCount() });
    this.off = app.on('cart', () => this.setData({ cartCount: app.cartCount() }));
  },
  onHide() { this.off && this.off(); },
  onUnload() { this.off && this.off(); },

  applyFilter() {
    const { cat, pet, sort, q } = this.data;
    const kw = String(q).trim();
    const hitKeyword = (p) => !kw
      || p.name.indexOf(kw) >= 0 || (p.sub || '').indexOf(kw) >= 0 || (p.desc || '').indexOf(kw) >= 0
      || (p.tag || '').indexOf(kw) >= 0 || (p.badges || []).some((b) => b.indexOf(kw) >= 0);

    let list = PRODUCTS.filter((p) => (cat === 'all' || p.cat === cat) && matchPet(pet, p.pet) && hitKeyword(p));
    if (sort === '价格升序') list = list.slice().sort((a, b) => a.price - b.price);
    else if (sort === '价格降序') list = list.slice().sort((a, b) => b.price - a.price);
    else if (sort === '评分') list = list.slice().sort((a, b) => b.rating - a.rating);
    else list = list.slice().sort((a, b) => b.sold - a.sold);

    this.setData({ list });
  },

  onInput(e) {
    this.setData({ q: e.detail.value });
    this.debouncedFilter();
  },
  onHotWord(e) {
    this.setData({ q: e.currentTarget.dataset.w }, () => this.applyFilter());
  },
  onClearQ() {
    this.setData({ q: '' }, () => this.applyFilter());
  },
  onCat(e) {
    this.setData({ cat: e.currentTarget.dataset.id }, () => this.applyFilter());
  },
  onPet(e) {
    this.setData({ pet: e.currentTarget.dataset.id }, () => this.applyFilter());
  },
  toggleSort() { this.setData({ sortOpen: !this.data.sortOpen }); },
  onSort(e) {
    this.setData({ sort: e.currentTarget.dataset.s, sortOpen: false }, () => this.applyFilter());
  },

  goProduct(e) { wx.navigateTo({ url: `/packageShop/pages/product/index?id=${e.detail.id}` }); },
  goCart() { wx.navigateTo({ url: '/packageShop/pages/cart/index' }); },

  onAdd(e) {
    const p = PRODUCTS.find((x) => x.id === e.detail.id);
    if (!p) return;
    if (p.stock === 0) return toast('这款暂时缺货');
    app.addToCart(p, 1);
    toast(`已加入购物车 · ${p.name.slice(0, 10)}`);
  },
});
