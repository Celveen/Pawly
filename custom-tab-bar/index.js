const app = getApp();

Component({
  data: {
    active: 0,
    cartCount: 0,
    unread: 0,
    list: [
      { path: '/pages/home/index', text: '首页', icon: 'home' },
      { path: '/pages/shop/index', text: '商品', icon: 'shop' },
      { path: '/pages/ai/index', text: '宝狸', icon: 'paw', center: true },
      { path: '/pages/community/index', text: '社区', icon: 'community' },
      { path: '/pages/my/index', text: '我的', icon: 'my' },
    ],
  },

  lifetimes: {
    attached() {
      this.sync();
      this.offCart = app.on('cart', () => this.sync());
      this.offUnread = app.on('unread', () => this.sync());
    },
    detached() {
      this.offCart && this.offCart();
      this.offUnread && this.offUnread();
    },
  },

  methods: {
    sync() {
      this.setData({
        cartCount: app.cartCount(),
        unread: (app.globalData.unreadDm || 0) + (app.globalData.unreadNotify || 0),
      });
    },
    onTap(e) {
      const { index, path } = e.currentTarget.dataset;
      if (index === this.data.active) return;
      wx.switchTab({ url: path });
    },
  },
});
