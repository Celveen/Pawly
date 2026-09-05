const api = require('../../../api/index');
const { toast } = require('../../../utils/util');
const { imgUrl } = require('../../../utils/media');

const CONSTELLATIONS = [
  [1, 20, '水瓶座'], [2, 19, '双鱼座'], [3, 21, '白羊座'], [4, 20, '金牛座'],
  [5, 21, '双子座'], [6, 22, '巨蟹座'], [7, 23, '狮子座'], [8, 23, '处女座'],
  [9, 23, '天秤座'], [10, 24, '天蝎座'], [11, 23, '射手座'], [12, 22, '摩羯座'],
];

function constellation(birthday) {
  if (!birthday) return '';
  const d = new Date(String(birthday).replace(/-/g, '/'));
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const row = CONSTELLATIONS.find((c) => c[0] === m);
  if (!row) return '';
  if (day >= row[1]) return row[2];
  const prev = CONSTELLATIONS[(m + 10) % 12];
  return prev[2];
}

Page({
  data: {
    userId: '',
    isMe: true,
    profile: null,
    avatar: '',
    star: '',
    tab: 'posts',       // posts | favorites | liked | followers | following
    list: [],
    colA: [],
    colB: [],
    users: [],
    loading: true,
    error: '',
  },

  onLoad(query) {
    this.setData({
      userId: query.userId || '',
      tab: query.tab || 'posts',
    });
    this.load();
  },

  onShow() {
    if (this.loaded) this.load();
    this.loaded = true;
  },

  load() {
    this.setData({ loading: true, error: '' });
    api.profile(this.data.userId)
      .then((profile) => {
        this.setData({
          profile,
          isMe: profile.isMe,
          avatar: profile.avatarUrl ? imgUrl(profile.avatarUrl) : '',
          star: constellation(profile.birthday),
          loading: false,
        });
        this.loadTab();
      })
      .catch((e) => this.setData({ loading: false, error: e.message || '加载失败' }));
  },

  loadTab() {
    const { tab, profile } = this.data;
    if (tab === 'posts') return this.spread(profile.posts || []);

    if (tab === 'followers' || tab === 'following') {
      return api.follows(this.data.userId, tab)
        .then((users) => this.setData({ users: (users || []).map((u) => Object.assign({}, u, { avatarUrlFull: u.avatarUrl ? imgUrl(u.avatarUrl) : '' })) }))
        .catch(() => this.setData({ users: [] }));
    }

    return api.collection(tab === 'liked' ? 'liked' : 'favorites')
      .then((list) => this.spread(list || []))
      .catch(() => this.spread([]));
  },

  spread(list) {
    const colA = [];
    const colB = [];
    list.forEach((p, i) => (i % 2 === 0 ? colA : colB).push(p));
    this.setData({ list, colA, colB });
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.t, list: [], colA: [], colB: [], users: [] }, () => this.loadTab());
  },

  toggleFollow() {
    api.toggleFollow(this.data.userId || this.data.profile.id)
      .then((r) => {
        toast(r.following ? '已关注' : '已取消关注');
        this.load();
      })
      .catch((e) => toast(e.message || '操作失败'));
  },

  goDm() { wx.navigateTo({ url: `/packageSocial/pages/dm/index?peerId=${this.data.profile.id}` }); },
  goEdit() { wx.navigateTo({ url: '/packageUser/pages/settings/index' }); },
  goPost(e) { wx.navigateTo({ url: `/packageSocial/pages/post/index?id=${e.detail.id}` }); },
  goUser(e) { wx.navigateTo({ url: `/packageSocial/pages/profile/index?userId=${e.currentTarget.dataset.id}` }); },
  goPublish() { wx.navigateTo({ url: '/packageSocial/pages/publish/index' }); },
  onLike(e) {
    const id = e.detail.id;
    this.spread(this.data.list.map((p) => (p.id === id
      ? Object.assign({}, p, { likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) })
      : p)));
    api.likePost(id).catch(() => this.loadTab());
  },
});
