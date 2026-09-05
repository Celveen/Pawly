const api = require('../../../api/index');
const { timeAgo, toast, debounce } = require('../../../utils/util');
const { imgUrl } = require('../../../utils/media');

const app = getApp();

Page({
  data: {
    list: null,
    q: '',
    results: [],
    searching: false,
    error: '',
  },

  onLoad() { this.debounced = debounce(() => this.search(), 320); },

  onShow() {
    this.load();
    this.timer = setInterval(() => this.load(true), 20000);
  },
  onHide() { clearInterval(this.timer); },
  onUnload() { clearInterval(this.timer); },

  load(quiet) {
    return api.conversations()
      .then((list) => {
        this.setData({
          list: (list || []).map((c) => Object.assign({}, c, {
            time: timeAgo(c.lastAt),
            avatarUrlFull: c.avatarUrl ? imgUrl(c.avatarUrl) : '',
          })),
          error: '',
        });
        app.refreshUnread();
      })
      .catch((e) => {
        if (!quiet) this.setData({ list: [], error: e.message || '加载失败' });
      });
  },

  onInput(e) {
    this.setData({ q: e.detail.value });
    this.debounced();
  },

  search() {
    const kw = String(this.data.q || '').trim();
    if (!kw) return this.setData({ results: [], searching: false });
    this.setData({ searching: true });
    api.searchUsers(kw)
      .then((users) => this.setData({
        results: (users || []).map((u) => Object.assign({}, u, { avatarUrlFull: u.avatarUrl ? imgUrl(u.avatarUrl) : '' })),
        searching: false,
      }))
      .catch(() => this.setData({ results: [], searching: false }));
  },

  clearQ() { this.setData({ q: '', results: [] }); },

  goThread(e) {
    wx.navigateTo({ url: `/packageSocial/pages/dm/index?peerId=${e.currentTarget.dataset.id}` });
  },

  onLongPress(e) {
    const peerId = e.currentTarget.dataset.id;
    wx.showActionSheet({
      itemList: ['删除会话'],
      itemColor: '#C0492B',
      success: (r) => {
        if (r.tapIndex !== 0) return;
        api.deleteConversation(peerId)
          .then(() => { toast('已删除'); this.load(); })
          .catch((err) => toast(err.message || '删除失败'));
      },
    });
  },

  goCommunity() { wx.switchTab({ url: '/pages/community/index' }); },
});
