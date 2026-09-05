const api = require('../../../api/index');
const config = require('../../../config');
const { toast, ymd } = require('../../../utils/util');

const app = getApp();
const AVATAR_EMOJIS = ['🐾', '🐶', '🐱', '🐰', '🦜', '🐹', '🐟', '🦎', '🐷', '✨', '🧶', '📦'];
const GENDERS = [
  { id: '', name: '不展示' },
  { id: 'female', name: '女' },
  { id: 'male', name: '男' },
  { id: 'other', name: '其他' },
];

Page({
  data: {
    me: null,
    emojis: AVATAR_EMOJIS,
    genders: GENDERS,
    form: { nickname: '', bio: '', avatarEmoji: '🐾', gender: '', birthday: '', location: '' },
    genderIndex: 0,
    today: '',
    pwOpen: false,
    pw: { oldPassword: '', newPassword: '', confirm: '' },
    saving: false,
    cacheSize: '',
  },

  onLoad() { this.setData({ today: ymd(new Date()) }); },

  onShow() {
    app.refreshMe().then((me) => {
      this.setData({
        me,
        form: {
          nickname: me.nickname || '',
          bio: me.bio || '',
          avatarEmoji: me.avatarEmoji || '🐾',
          gender: me.gender || '',
          birthday: me.birthday ? String(me.birthday).slice(0, 10) : '',
          location: me.location || '',
        },
        genderIndex: Math.max(0, GENDERS.findIndex((g) => g.id === (me.gender || ''))),
      });
    });
    this.readCache();
  },

  readCache() {
    try {
      const info = wx.getStorageInfoSync();
      this.setData({ cacheSize: `${(info.currentSize || 0)} KB` });
    } catch (e) { this.setData({ cacheSize: '—' }); }
  },

  onField(e) { this.setData({ [`form.${e.currentTarget.dataset.k}`]: e.detail.value }); },
  onEmoji(e) { this.setData({ 'form.avatarEmoji': e.currentTarget.dataset.e }); },
  onGender(e) {
    const i = Number(e.detail.value);
    this.setData({ genderIndex: i, 'form.gender': GENDERS[i].id });
  },
  onBirthday(e) { this.setData({ 'form.birthday': e.detail.value }); },

  save() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    api.updateProfile(this.data.form)
      .then(() => app.refreshMe())
      .then(() => { toast('已保存'); this.setData({ saving: false }); })
      .catch((e) => { this.setData({ saving: false }); toast(e.message || '保存失败'); });
  },

  openPw() { this.setData({ pwOpen: true, pw: { oldPassword: '', newPassword: '', confirm: '' } }); },
  closePw() { this.setData({ pwOpen: false }); },
  stop() {},
  onPw(e) { this.setData({ [`pw.${e.currentTarget.dataset.k}`]: e.detail.value }); },
  savePw() {
    const { oldPassword, newPassword, confirm } = this.data.pw;
    if (newPassword.length < 6) return toast('新密码至少 6 位');
    if (newPassword !== confirm) return toast('两次输入的新密码不一样');
    api.changePassword(oldPassword, newPassword)
      .then(() => { toast('密码已更新'); this.closePw(); })
      .catch((e) => toast(e.message || '修改失败'));
  },

  clearCache() {
    wx.showModal({
      title: '清理缓存',
      content: '会清掉本地购物车、对话草稿与演示数据；账号和服务端数据不受影响。',
      confirmColor: '#2C563A',
      success: (r) => {
        if (!r.confirm) return;
        const uid = api.getUid();
        wx.clearStorageSync();
        api.setUid(uid); // 身份留着，不然会变成另一个游客
        app.clearCart();
        toast('已清理');
        this.readCache();
      },
    });
  },

  logout() {
    wx.showModal({
      title: '退出登录', content: '退出后会回到游客状态，本机数据不会同步。', confirmColor: '#C0492B',
      success: (r) => {
        if (!r.confirm) return;
        api.logout().catch(() => {}).then(() => {
          api.resetUid();
          app.clearCart();
          return app.refreshMe();
        }).then(() => {
          toast('已退出');
          setTimeout(() => wx.navigateBack(), 600);
        });
      },
    });
  },

  goLogin() { wx.navigateTo({ url: '/packageUser/pages/login/index' }); },

  about() {
    wx.showModal({
      title: '关于 Pawly 宝狸',
      content: `AI 养宠助手 + 宠物导购 + 养宠社区。\n\n当前接口：${config.useMock ? '本地演示数据（mock）' : config.baseUrl}\n\n作品演示版本，商品为模拟数据，结算为演示流程，AI 回复仅供参考。`,
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#2C563A',
    });
  },
});
