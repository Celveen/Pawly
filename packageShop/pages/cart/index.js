const { fmt, toast } = require('../../../utils/util');

const app = getApp();
const FREE_SHIPPING = 99;
const SHIPPING = 12;

Page({
  data: { items: [], subtotal: '', shipping: '', total: '', count: 0, free: false },

  onShow() { this.sync(); },

  sync() {
    const items = app.globalData.cart.map((it) => Object.assign({}, it, {
      priceText: fmt(it.price),
      lineText: fmt(it.price * it.qty),
    }));
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const shipping = items.length === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING;
    this.setData({
      items,
      subtotal: fmt(subtotal),
      shipping: shipping === 0 ? '免运费' : fmt(shipping),
      total: fmt(subtotal + shipping),
      count: items.reduce((s, it) => s + it.qty, 0),
      free: subtotal >= FREE_SHIPPING,
      gap: fmt(Math.max(0, FREE_SHIPPING - subtotal)),
    });
  },

  minus(e) {
    const { id, qty } = e.currentTarget.dataset;
    app.setCartQty(id, qty - 1);
    this.sync();
  },
  plus(e) {
    const { id, qty } = e.currentTarget.dataset;
    app.setCartQty(id, Math.min(99, qty + 1));
    this.sync();
  },
  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '移出购物车', content: '确定不要这件了吗？', confirmColor: '#2C563A',
      success: (r) => {
        if (r.confirm) { app.removeFromCart(id); this.sync(); }
      },
    });
  },
  clear() {
    wx.showModal({
      title: '清空购物车', content: '里面的商品都会被移除。', confirmColor: '#2C563A',
      success: (r) => { if (r.confirm) { app.clearCart(); this.sync(); } },
    });
  },
  goProduct(e) { wx.navigateTo({ url: `/packageShop/pages/product/index?id=${e.currentTarget.dataset.id}` }); },
  goShop() { wx.switchTab({ url: '/pages/shop/index' }); },
  checkout() {
    if (!this.data.items.length) return toast('购物车还是空的');
    wx.removeStorageSync('pawly_buy_now');
    wx.navigateTo({ url: '/packageShop/pages/checkout/index' });
  },
});
