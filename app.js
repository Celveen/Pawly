// Pawly 小程序入口：全局态（购物车 / 当前用户 / 未读数）+ mock 装配 + 胶囊布局测量
const config = require('./config');
const applyMock = require('./mock/index');
const api = require('./api/index');

applyMock();

const CART_KEY = 'pawly_cart';

App({
  globalData: {
    /** 状态栏与胶囊按钮尺寸，自定义导航栏靠它对齐 */
    statusBarHeight: 20,
    navBarHeight: 44,
    menuRight: 10,
    /** 购物车：[{ id, name, emoji, bg, price, sub, qty }] */
    cart: [],
    /** 当前用户（/api/auth/me 的返回），null 表示还没拉到 */
    me: null,
    unreadDm: 0,
    unreadNotify: 0,
  },

  /** 极简事件总线：跨页同步购物车角标、未读数等 */
  listeners: {},
  on(evt, fn) {
    (this.listeners[evt] = this.listeners[evt] || []).push(fn);
    return () => this.off(evt, fn);
  },
  off(evt, fn) {
    this.listeners[evt] = (this.listeners[evt] || []).filter((f) => f !== fn);
  },
  emit(evt, payload) {
    (this.listeners[evt] || []).forEach((fn) => {
      try { fn(payload); } catch (e) { console.error('[bus]', evt, e); }
    });
  },

  onLaunch() {
    this.measureLayout();
    this.globalData.cart = wx.getStorageSync(CART_KEY) || [];
    this.refreshMe();
    this.refreshUnread();
    this.checkUpdate();
  },

  onShow() {
    this.refreshUnread();
  },

  /* —— 布局测量：自定义导航栏 —— */
  measureLayout() {
    try {
      const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect();
      this.globalData.statusBarHeight = win.statusBarHeight || 20;
      if (menu && menu.top) {
        // 导航栏高度 = 胶囊上下留白 + 胶囊高度
        this.globalData.navBarHeight = (menu.top - this.globalData.statusBarHeight) * 2 + menu.height;
        this.globalData.menuRight = (win.windowWidth || 375) - menu.right;
      }
    } catch (e) {
      console.warn('[layout] 测量失败，使用默认值', e);
    }
  },

  /* —— 用户 —— */
  refreshMe() {
    return api.me()
      .then((me) => {
        this.globalData.me = me;
        this.emit('me', me);
        return me;
      })
      .catch(() => {
        this.globalData.me = { guest: true, offline: true };
        this.emit('me', this.globalData.me);
        return this.globalData.me;
      });
  },

  refreshUnread() {
    api.unreadDm().then((r) => {
      this.globalData.unreadDm = (r && r.count) || 0;
      this.emit('unread', this.globalData);
    }).catch(() => {});
    api.unreadNotifications().then((r) => {
      this.globalData.unreadNotify = (r && r.count) || 0;
      this.emit('unread', this.globalData);
    }).catch(() => {});
  },

  /* —— 购物车 —— */
  cartCount() {
    return this.globalData.cart.reduce((s, it) => s + it.qty, 0);
  },

  addToCart(product, qty = 1) {
    const cart = this.globalData.cart;
    const found = cart.find((x) => x.id === product.id);
    if (found) found.qty += qty;
    else {
      cart.push({
        id: product.id, name: product.name, emoji: product.emoji, bg: product.bg,
        price: product.price, sub: product.sub, qty,
      });
    }
    this.persistCart();
    wx.vibrateShort && wx.vibrateShort({ type: 'light' });
  },

  setCartQty(id, qty) {
    if (qty <= 0) this.globalData.cart = this.globalData.cart.filter((x) => x.id !== id);
    else {
      const it = this.globalData.cart.find((x) => x.id === id);
      if (it) it.qty = qty;
    }
    this.persistCart();
  },

  removeFromCart(id) {
    this.globalData.cart = this.globalData.cart.filter((x) => x.id !== id);
    this.persistCart();
  },

  clearCart() {
    this.globalData.cart = [];
    this.persistCart();
  },

  persistCart() {
    wx.setStorageSync(CART_KEY, this.globalData.cart);
    this.emit('cart', this.globalData.cart);
  },

  /* —— 版本更新 —— */
  checkUpdate() {
    if (!wx.getUpdateManager) return;
    const um = wx.getUpdateManager();
    um.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        confirmColor: '#2C563A',
        success: (res) => { if (res.confirm) um.applyUpdate(); },
      });
    });
  },

  config,
});
