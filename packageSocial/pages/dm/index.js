const api = require('../../../api/index');
const { clock, toast } = require('../../../utils/util');
const { imgUrl, imgList } = require('../../../utils/media');
const { pickImages } = require('../../../utils/image');

const app = getApp();

Page({
  data: {
    peerId: '',
    peer: null,
    peerAvatar: '',
    messages: [],
    input: '',
    pending: [],
    sending: false,
    inputBottom: 0,
    scrollTo: '',
    navH: 64,
    error: '',
  },

  onLoad(query) {
    const g = app.globalData;
    this.setData({ peerId: query.peerId, navH: g.statusBarHeight + g.navBarHeight });
    this.load();
  },

  onShow() { this.timer = setInterval(() => this.load(true), 8000); },
  onHide() { clearInterval(this.timer); },
  onUnload() { clearInterval(this.timer); },

  load(quiet) {
    return api.thread(this.data.peerId)
      .then((r) => {
        const messages = (r.messages || []).map((m, i) => Object.assign({}, m, {
          mine: m.from !== this.data.peerId,
          time: clock(m.createdAt),
          imgs: imgList(m.images),
          key: m.id || `m${i}`,
        }));
        this.setData({
          peer: r.peer,
          peerAvatar: r.peer && r.peer.avatarUrl ? imgUrl(r.peer.avatarUrl) : '',
          messages,
          error: '',
        }, () => this.scrollBottom());
        app.refreshUnread();
      })
      .catch((e) => {
        if (!quiet) this.setData({ error: e.message || '加载失败' });
      });
  },

  scrollBottom() {
    const last = this.data.messages[this.data.messages.length - 1];
    if (last) this.setData({ scrollTo: `m-${last.key}` });
  },

  onInput(e) { this.setData({ input: e.detail.value }); },
  onFocus(e) { this.setData({ inputBottom: e.detail.height || 0 }, () => this.scrollBottom()); },
  onBlur() { this.setData({ inputBottom: 0 }); },

  addImages() {
    if (this.data.pending.length >= 3) return toast('一次最多 3 张');
    wx.showLoading({ title: '处理中…', mask: true });
    pickImages(3 - this.data.pending.length)
      .then((list) => {
        wx.hideLoading();
        if (list.length) this.setData({ pending: this.data.pending.concat(list) });
      })
      .catch(() => { wx.hideLoading(); toast('图片处理失败'); });
  },
  removePending(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ pending: this.data.pending.filter((_, idx) => idx !== i) });
  },

  send() {
    const text = String(this.data.input || '').trim();
    const images = this.data.pending;
    if (!text && !images.length) return;
    if (this.data.sending) return;
    this.setData({ sending: true });
    api.sendDm({ peerId: this.data.peerId, text, images })
      .then(() => {
        this.setData({ input: '', pending: [], sending: false });
        this.load();
      })
      .catch((e) => {
        this.setData({ sending: false });
        toast(e.message || '发送失败');
      });
  },

  previewImage(e) {
    const { urls, i } = e.currentTarget.dataset;
    wx.previewImage({ current: urls[i], urls });
  },

  goProfile() { wx.navigateTo({ url: `/packageSocial/pages/profile/index?userId=${this.data.peerId}` }); },
});
