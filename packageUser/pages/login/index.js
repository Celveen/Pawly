const api = require('../../../api/index');
const { toast } = require('../../../utils/util');

const app = getApp();

Page({
  data: {
    mode: 'login',      // login | register
    account: '',
    password: '',
    confirm: '',
    nickname: '',
    agreed: false,
    submitting: false,
  },

  onMode(e) { this.setData({ mode: e.currentTarget.dataset.m }); },
  onField(e) { this.setData({ [e.currentTarget.dataset.k]: e.detail.value }); },
  onAgree() { this.setData({ agreed: !this.data.agreed }); },

  submit() {
    const { mode, account, password, confirm, nickname, agreed, submitting } = this.data;
    if (submitting) return;
    const acc = account.trim();
    if (!acc) return toast('填一下手机号或邮箱');
    const isPhone = /^1\d{10}$/.test(acc);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acc);
    if (!isPhone && !isEmail) return toast('手机号或邮箱格式不对');
    if (password.length < 6) return toast('密码至少 6 位');
    if (mode === 'register' && password !== confirm) return toast('两次输入的密码不一样');
    if (!agreed) return toast('请先勾选同意用户协议');

    this.setData({ submitting: true });
    const call = mode === 'login'
      ? api.login(acc, password)
      : api.register({ account: acc, password, nickname: nickname.trim() });

    call
      .then((r) => {
        // 网页端用 Cookie 记身份，小程序改用 x-pawly-uid，需要后端把 userId 回传
        if (r && r.userId) api.setUid(r.userId);
        else console.warn('[login] 后端未返回 userId，请参考 docs/后端对接改动.md 打补丁');
        // 注册接口本身不收昵称，登录成功后单独写一次资料
        if (mode === 'register' && nickname.trim()) {
          return api.updateProfile({ nickname: nickname.trim() }).catch(() => {}).then(() => app.refreshMe());
        }
        return app.refreshMe();
      })
      .then(() => {
        app.refreshUnread();
        toast(this.data.mode === 'login' ? '登录成功' : '注册成功');
        setTimeout(() => wx.navigateBack(), 600);
      })
      .catch((e) => {
        this.setData({ submitting: false });
        toast(e.message || '操作失败');
      });
  },

  wxLogin() {
    wx.showModal({
      title: '微信一键登录',
      content: '这条路需要后端拿 AppID/AppSecret 用 code 换 openid。接线方法写在仓库的 docs/后端对接改动.md 里，接好之后这个按钮就能直接用。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#2C563A',
    });
  },

  showAgreement() {
    wx.showModal({
      title: '用户协议与隐私政策',
      content: '当前为作品演示版本。小程序只保存你主动填写的资料、宠物档案与社区内容，不会读取通讯录或位置。正式上线前会补齐完整协议文本。',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#2C563A',
    });
  },
});
