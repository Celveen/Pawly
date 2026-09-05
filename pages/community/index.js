const api = require('../../api/index');
const { TOPICS } = require('../../data');
const { toast } = require('../../utils/util');
const syncTab = require('../../utils/tabbar');

const app = getApp();

Page({
  data: {
    topics: TOPICS,
    topic: 'all',
    posts: null,      // null = 加载中
    colA: [],
    colB: [],
    error: '',
    unread: 0,
  },

  onLoad() { this.load(); },

  onShow() {
    syncTab(this, 3);
    this.setData({ unread: app.globalData.unreadDm || 0 });
    this.off = app.on('unread', (g) => this.setData({ unread: g.unreadDm || 0 }));
    if (this.needReload) {
      this.needReload = false;
      this.load();
    }
  },
  onHide() { this.off && this.off(); },
  onUnload() { this.off && this.off(); },

  onPullDownRefresh() {
    this.load().then(() => wx.stopPullDownRefresh());
  },

  load() {
    this.setData({ error: '' });
    return api.posts(this.data.topic === 'all' ? '' : this.data.topic)
      .then((posts) => this.spread(posts || []))
      .catch((e) => {
        this.setData({ posts: [], colA: [], colB: [], error: e.message || '加载失败' });
      });
  },

  /** 两列瀑布：按索引奇偶分列，卡片高度差异由内容自然形成 */
  spread(posts) {
    const colA = [];
    const colB = [];
    posts.forEach((p, i) => (i % 2 === 0 ? colA : colB).push(p));
    this.setData({ posts, colA, colB });
  },

  onTopic(e) {
    this.setData({ topic: e.currentTarget.dataset.id, posts: null }, () => this.load());
  },

  onLike(e) {
    const id = e.detail.id;
    const posts = this.data.posts.map((p) => (p.id === id
      ? Object.assign({}, p, { likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) })
      : p));
    this.spread(posts);
    api.likePost(id).catch(() => this.load());
  },

  goPost(e) {
    this.needReload = true;
    wx.navigateTo({ url: `/packageSocial/pages/post/index?id=${e.detail.id}` });
  },
  goAuthor(e) {
    wx.navigateTo({ url: `/packageSocial/pages/profile/index?userId=${e.detail.id}` });
  },
  onEmptyAction() {
    if (this.data.error) this.load();
    else this.goPublish();
  },

  goPublish() {
    this.needReload = true;
    wx.navigateTo({ url: '/packageSocial/pages/publish/index' });
  },
  goMessages() { wx.navigateTo({ url: '/packageSocial/pages/messages/index' }); },
  goSearch() { wx.navigateTo({ url: '/packageUser/pages/search/index?tab=post' }); },
});
