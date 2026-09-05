const api = require('../../api/index');
const { toast } = require('../../utils/util');
const { imgUrl } = require('../../utils/media');
const syncTab = require('../../utils/tabbar');

const app = getApp();

Page({
  data: {
    me: null,
    profile: null,
    avatar: '',
    checkin: { done: false, streak: 0 },
    petCount: 0,
    orderCount: 0,
    dueCount: 0,
    cartCount: 0,
    unreadDm: 0,
    unreadNotify: 0,
    entries: [
      { id: 'orders', icon: '📦', name: '我的订单', url: '/packageShop/pages/orders/index' },
      { id: 'pets', icon: '🐾', name: '宠物档案', url: '/packageUser/pages/pets/index' },
      { id: 'reminders', icon: '💉', name: '健康提醒', url: '/packageUser/pages/reminders/index' },
      { id: 'address', icon: '📍', name: '收货地址', url: '/packageUser/pages/address/index' },
    ],
  },

  onShow() {
    syncTab(this, 4);
    this.refresh();
    this.off = app.on('cart', () => this.setData({ cartCount: app.cartCount() }));
    this.offUnread = app.on('unread', (g) => this.setData({ unreadDm: g.unreadDm, unreadNotify: g.unreadNotify }));
  },
  onHide() { this.off && this.off(); this.offUnread && this.offUnread(); },
  onUnload() { this.off && this.off(); this.offUnread && this.offUnread(); },

  onPullDownRefresh() {
    this.refresh();
    setTimeout(() => wx.stopPullDownRefresh(), 500);
  },

  refresh() {
    this.setData({
      cartCount: app.cartCount(),
      unreadDm: app.globalData.unreadDm || 0,
      unreadNotify: app.globalData.unreadNotify || 0,
    });
    app.refreshUnread();

    app.refreshMe().then((me) => {
      this.setData({ me, avatar: me && me.avatarUrl ? imgUrl(me.avatarUrl) : '' });
      if (!me || me.offline) return;
      api.profile().then((profile) => this.setData({ profile })).catch(() => {});
    });

    api.checkinStatus().then((c) => this.setData({ checkin: c })).catch(() => {});
    api.pets().then((list) => this.setData({ petCount: (list || []).length })).catch(() => {});
    api.orders().then((list) => this.setData({ orderCount: (list || []).length })).catch(() => {});
    api.reminders().then((list) => this.setData({ dueCount: (list || []).filter((r) => !r.done).length })).catch(() => {});
  },

  doCheckin() {
    if (this.data.checkin.done) return toast('今天已经签过啦');
    api.checkin().then((r) => {
      if (r.ok) {
        toast(`签到成功 +${r.reward} 分`);
        this.setData({ checkin: r });
        app.refreshMe();
      } else {
        toast('今天已经签过啦');
      }
    }).catch((e) => toast(e.message || '签到失败'));
  },

  goLogin() { wx.navigateTo({ url: '/packageUser/pages/login/index' }); },
  goProfile() {
    if (this.data.me && this.data.me.guest) return this.goLogin();
    wx.navigateTo({ url: '/packageSocial/pages/profile/index' });
  },
  goEntry(e) { wx.navigateTo({ url: e.currentTarget.dataset.url }); },
  goMember() { wx.navigateTo({ url: '/packageUser/pages/member/index?tab=benefits' }); },
  goCart() { wx.navigateTo({ url: '/packageShop/pages/cart/index' }); },
  goMessages() { wx.navigateTo({ url: '/packageSocial/pages/messages/index' }); },
  goNotifications() { wx.navigateTo({ url: '/packageSocial/pages/notifications/index' }); },
  goSettings() { wx.navigateTo({ url: '/packageUser/pages/settings/index' }); },
  goCollection(e) {
    wx.navigateTo({ url: `/packageSocial/pages/profile/index?tab=${e.currentTarget.dataset.tab}` });
  },
});
