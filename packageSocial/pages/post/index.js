const api = require('../../../api/index');
const { timeAgo, toast } = require('../../../utils/util');
const { imgUrl, imgList } = require('../../../utils/media');

Page({
  data: {
    id: '',
    post: null,
    images: [],
    avatar: '',
    time: '',
    comments: [],
    commentsLoading: true,
    input: '',
    sending: false,
    inputBottom: 0,
    error: '',
  },

  onLoad(query) {
    this.setData({ id: query.id });
    this.load();
  },

  load() {
    api.post(this.data.id)
      .then((post) => {
        this.setData({
          post,
          images: imgList(post.images),
          avatar: post.authorAvatarUrl ? imgUrl(post.authorAvatarUrl) : '',
          time: timeAgo(post.createdAt),
          error: '',
        });
        this.loadComments();
      })
      .catch((e) => this.setData({ error: e.message || '加载失败', post: null }));
  },

  loadComments() {
    api.comments(this.data.id)
      .then((list) => this.setData({
        comments: (list || []).map((c) => Object.assign({}, c, {
          time: timeAgo(c.createdAt),
          avatarUrl: c.authorAvatarUrl ? imgUrl(c.authorAvatarUrl) : '',
        })),
        commentsLoading: false,
      }))
      .catch(() => this.setData({ comments: [], commentsLoading: false }));
  },

  toggleLike() {
    const post = this.data.post;
    this.setData({
      'post.likedByMe': !post.likedByMe,
      'post.likeCount': post.likeCount + (post.likedByMe ? -1 : 1),
    });
    api.likePost(post.id).catch(() => this.load());
  },

  toggleFavorite() {
    const post = this.data.post;
    this.setData({
      'post.favoritedByMe': !post.favoritedByMe,
      'post.favoriteCount': (post.favoriteCount || 0) + (post.favoritedByMe ? -1 : 1),
    });
    api.favoritePost(post.id).catch(() => this.load());
  },

  toggleFollow() {
    const post = this.data.post;
    api.toggleFollow(post.authorId)
      .then((r) => toast(r.following ? '已关注' : '已取消关注'))
      .catch((e) => toast(e.message || '操作失败'));
  },

  previewImage(e) {
    wx.previewImage({ current: this.data.images[e.currentTarget.dataset.i], urls: this.data.images });
  },

  onInput(e) { this.setData({ input: e.detail.value }); },
  onFocus(e) { this.setData({ inputBottom: e.detail.height || 0 }); },
  onBlur() { this.setData({ inputBottom: 0 }); },

  sendComment() {
    const content = String(this.data.input || '').trim();
    if (!content) return;
    if (this.data.sending) return;
    this.setData({ sending: true });
    api.createComment({ postId: this.data.id, content })
      .then((c) => {
        this.setData({
          comments: this.data.comments.concat([Object.assign({}, c, { time: '刚刚', avatarUrl: '' })]),
          input: '',
          sending: false,
          'post.commentCount': (this.data.post.commentCount || 0) + 1,
        });
      })
      .catch((e) => {
        this.setData({ sending: false });
        toast(e.message || '评论失败');
      });
  },

  deleteComment(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除评论', content: '删掉这条评论？', confirmColor: '#2C563A',
      success: (r) => {
        if (!r.confirm) return;
        api.deleteComment(id)
          .then(() => this.setData({ comments: this.data.comments.filter((c) => c.id !== id) }))
          .catch((err) => toast(err.message || '删除失败'));
      },
    });
  },

  deletePost() {
    wx.showModal({
      title: '删除笔记', content: `确定删除「${this.data.post.title}」吗？`, confirmColor: '#C0492B',
      success: (r) => {
        if (!r.confirm) return;
        api.deletePost(this.data.id)
          .then(() => { toast('已删除'); setTimeout(() => wx.navigateBack(), 600); })
          .catch((e) => toast(e.message || '删除失败'));
      },
    });
  },

  goAuthor() { wx.navigateTo({ url: `/packageSocial/pages/profile/index?userId=${this.data.post.authorId}` }); },
  goDm() {
    if (this.data.post.mine) return;
    wx.navigateTo({ url: `/packageSocial/pages/dm/index?peerId=${this.data.post.authorId}` });
  },

  onShareAppMessage() {
    return {
      title: this.data.post ? this.data.post.title : 'Pawly 社区',
      path: `/packageSocial/pages/post/index?id=${this.data.id}`,
    };
  },
});
