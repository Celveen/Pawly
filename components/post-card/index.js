const { timeAgo } = require('../../utils/util');
const { imgUrl } = require('../../utils/media');

Component({
  properties: {
    p: { type: Object, value: null },
  },
  data: { cover: '', time: '', avatar: '' },
  observers: {
    p(p) {
      if (!p) return;
      this.setData({
        cover: p.images && p.images.length ? imgUrl(p.images[0]) : '',
        avatar: p.authorAvatarUrl ? imgUrl(p.authorAvatarUrl) : '',
        time: timeAgo(p.createdAt),
      });
    },
  },
  methods: {
    onOpen() { this.triggerEvent('open', { id: this.data.p.id }); },
    onLike(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      this.triggerEvent('like', { id: this.data.p.id });
    },
    onAuthor(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      this.triggerEvent('author', { id: this.data.p.authorId });
    },
  },
});
