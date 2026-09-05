const api = require('../../../api/index');
const { timeAgo } = require('../../../utils/util');
const { imgUrl } = require('../../../utils/media');

const app = getApp();

const TABS = [
  { id: 'all', name: '全部' },
  { id: 'interact', name: '赞和收藏' },
  { id: 'comment', name: '评论' },
  { id: 'follow', name: '关注' },
];

Page({
  data: { tabs: TABS, tab: 'all', list: null, error: '' },

  onLoad() {
    this.load();
    // 打开即标记已读，与网页端行为一致
    api.readNotifications().then(() => app.refreshUnread()).catch(() => {});
  },

  load() {
    api.notifications(this.data.tab === 'all' ? '' : this.data.tab)
      .then((list) => this.setData({
        list: (list || []).map((n) => Object.assign({}, n, {
          time: timeAgo(n.createdAt),
          avatarUrlFull: n.actorAvatarUrl ? imgUrl(n.actorAvatarUrl) : '',
        })),
        error: '',
      }))
      .catch((e) => this.setData({ list: [], error: e.message || '加载失败' }));
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.id, list: null }, () => this.load());
  },

  goTarget(e) {
    const { postId, actorId } = e.currentTarget.dataset;
    if (postId) wx.navigateTo({ url: `/packageSocial/pages/post/index?id=${postId}` });
    else if (actorId) wx.navigateTo({ url: `/packageSocial/pages/profile/index?userId=${actorId}` });
  },
  goCommunity() { wx.switchTab({ url: '/pages/community/index' }); },
});
