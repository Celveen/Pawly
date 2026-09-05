const api = require('../../../api/index');
const { toast } = require('../../../utils/util');

const app = getApp();

Page({
  data: {
    me: null,
    petCount: 0,
    orderCount: 0,
    dueCount: 0,
    checkin: { streak: 0, done: false },
    benefits: [
      { e: '💳', t: '全场 9 折', d: '主粮、零食、洗护全线适用，买得越多省得越多。' },
      { e: '🤖', t: 'AI 管家额度升级', d: '每日对话额度翻倍，长对话不被打断。' },
      { e: '🏥', t: '年度免费体检', d: '每年一次基础体检，覆盖常规项目。' },
      { e: '🎂', t: '生日礼盒', d: '毛孩子生日当月寄出，含零食与玩具。' },
      { e: '🚚', t: '免运费', d: '会员期内订单无门槛包邮。' },
      { e: '🎓', t: '专属科普', d: '会员专享的深度指南与线上课程。' },
    ],
    faq: [
      { q: '会员费怎么算？', a: '¥29/月，按月订阅，随时可取消，不自动涨价。' },
      { q: '真的能回本吗？', a: '按站内均价算，每月买两袋主粮 + 一次洗护，9 折省下的通常就超过会员费。' },
      { q: '体检怎么用？', a: '会员期内在合作医院出示宝狸号即可，具体项目以医院公示为准。' },
    ],
  },

  onLoad(query) {
    if (query.tab === 'benefits') this.scrollToBenefits = true;
  },

  onShow() {
    app.refreshMe().then((me) => this.setData({ me }));
    api.pets().then((l) => this.setData({ petCount: (l || []).length })).catch(() => {});
    api.orders().then((l) => this.setData({ orderCount: (l || []).length })).catch(() => {});
    api.reminders().then((l) => this.setData({ dueCount: (l || []).filter((r) => !r.done).length })).catch(() => {});
    api.checkinStatus().then((c) => this.setData({ checkin: c })).catch(() => {});
  },

  join() {
    if (this.data.me && this.data.me.guest) {
      return wx.navigateTo({ url: '/packageUser/pages/login/index' });
    }
    wx.showModal({
      title: 'Pawly Club',
      content: '当前为作品演示版本，尚未接入真实支付。上线后这里会拉起微信支付完成订阅。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#2C563A',
    });
  },

  goPets() { wx.navigateTo({ url: '/packageUser/pages/pets/index' }); },
  goOrders() { wx.navigateTo({ url: '/packageShop/pages/orders/index' }); },
  goReminders() { wx.navigateTo({ url: '/packageUser/pages/reminders/index' }); },
  goAddress() { wx.navigateTo({ url: '/packageUser/pages/address/index' }); },
});
