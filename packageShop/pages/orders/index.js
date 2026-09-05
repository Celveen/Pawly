const api = require('../../../api/index');
const { fmt, timeAgo } = require('../../../utils/util');

Page({
  data: { orders: null, error: '' },

  onShow() { this.load(); },

  load() {
    api.orders()
      .then((list) => this.setData({
        orders: (list || []).map((o) => Object.assign({}, o, {
          totalText: fmt(o.total),
          time: timeAgo(o.createdAt),
          count: (o.items || []).reduce((s, it) => s + (it.qty || 1), 0),
        })),
        error: '',
      }))
      .catch((e) => this.setData({ orders: [], error: e.message || '加载失败' }));
  },

  goShop() { wx.switchTab({ url: '/pages/shop/index' }); },
  goProduct(e) { wx.navigateTo({ url: `/packageShop/pages/product/index?id=${e.currentTarget.dataset.id}` }); },
});
