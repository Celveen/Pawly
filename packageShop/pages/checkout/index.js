const api = require('../../../api/index');
const { fmt, toast } = require('../../../utils/util');

const app = getApp();
const FREE_SHIPPING = 99;
const SHIPPING = 12;
const EXPRESS = 20;

Page({
  data: {
    mode: 'cart',
    items: [],
    addresses: [],
    address: null,
    delivery: 'standard',
    subtotal: 0,
    subtotalText: '',
    shippingText: '',
    totalText: '',
    submitting: false,
    note: '',
  },

  onLoad(query) {
    this.setData({ mode: query.mode === 'now' ? 'now' : 'cart' });
  },

  onShow() {
    const raw = this.data.mode === 'now'
      ? (wx.getStorageSync('pawly_buy_now') || [])
      : app.globalData.cart;
    if (!raw.length) {
      toast('没有要结算的商品');
      return setTimeout(() => wx.navigateBack(), 800);
    }
    const items = raw.map((it) => Object.assign({}, it, { lineText: fmt(it.price * it.qty) }));
    this.setData({ items }, () => this.recalc());
    this.loadAddresses();
  },

  loadAddresses() {
    api.addresses()
      .then((list) => {
        const addresses = list || [];
        const def = addresses.find((a) => a.isDefault) || addresses[0] || null;
        this.setData({ addresses, address: def });
      })
      .catch(() => this.setData({ addresses: [], address: null }));
  },

  recalc() {
    const subtotal = this.data.items.reduce((s, it) => s + it.price * it.qty, 0);
    let shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING;
    if (this.data.delivery === 'express') shipping = EXPRESS;
    this.setData({
      subtotal,
      subtotalText: fmt(subtotal),
      shippingText: shipping === 0 ? '免运费' : fmt(shipping),
      shipping,
      totalText: fmt(subtotal + shipping),
    });
  },

  onDelivery(e) {
    this.setData({ delivery: e.currentTarget.dataset.k }, () => this.recalc());
  },
  onNote(e) { this.setData({ note: e.detail.value }); },
  pickAddress(e) {
    this.setData({ address: this.data.addresses[e.currentTarget.dataset.i] });
  },
  goAddress() { wx.navigateTo({ url: '/packageUser/pages/address/index?pick=1' }); },

  submit() {
    if (this.data.submitting) return;
    if (!this.data.address) return toast('请先添加收货地址');
    this.setData({ submitting: true });
    api.createOrder({
      items: this.data.items.map((it) => ({ id: it.id, qty: it.qty })),
      addressId: this.data.address.id,
      delivery: this.data.delivery,
      shipping: this.data.shipping,
      note: this.data.note,
    })
      .then(() => {
        if (this.data.mode === 'cart') app.clearCart();
        else wx.removeStorageSync('pawly_buy_now');
        wx.showModal({
          title: '下单成功',
          content: '当前为演示流程，未接入真实支付。可以在「我的订单」里查看这一单。',
          showCancel: false,
          confirmText: '看看订单',
          confirmColor: '#2C563A',
          success: () => wx.redirectTo({ url: '/packageShop/pages/orders/index' }),
        });
      })
      .catch((e) => {
        this.setData({ submitting: false });
        toast(e.message || '下单失败');
      });
  },
});
