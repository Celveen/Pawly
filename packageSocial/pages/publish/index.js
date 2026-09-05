const api = require('../../../api/index');
const { TOPICS, SUGGESTED_TAGS } = require('../../../data');
const { pickImages } = require('../../../utils/image');
const { toast } = require('../../../utils/util');

const COVER_EMOJIS = ['🐶', '🐱', '🐾', '🧶', '🛁', '🦴', '🥣', '🎾', '🩺', '📷', '🏠', '🎁'];
const COVER_BGS = ['#F4D7B0', '#D3DEE2', '#E8D8C3', '#DCE5D4', '#EAD9DE', '#D9E2EA'];

Page({
  data: {
    topics: TOPICS.filter((t) => t.id !== 'all'),
    suggested: SUGGESTED_TAGS,
    emojis: COVER_EMOJIS,
    bgs: COVER_BGS,
    topic: '晒宠',
    title: '',
    content: '',
    petName: '',
    tags: [],
    tagInput: '',
    images: [],
    emoji: '🐾',
    bg: '#F4D7B0',
    submitting: false,
  },

  onTopic(e) { this.setData({ topic: e.currentTarget.dataset.id }); },
  onTitle(e) { this.setData({ title: e.detail.value }); },
  onContent(e) { this.setData({ content: e.detail.value }); },
  onPetName(e) { this.setData({ petName: e.detail.value }); },
  onTagInput(e) { this.setData({ tagInput: e.detail.value }); },
  onEmoji(e) { this.setData({ emoji: e.currentTarget.dataset.e }); },
  onBg(e) { this.setData({ bg: e.currentTarget.dataset.c }); },

  addTag(e) {
    const raw = e.currentTarget.dataset.t || this.data.tagInput;
    const tag = String(raw || '').trim().replace(/^#/, '');
    if (!tag) return;
    if (this.data.tags.indexOf(tag) >= 0) return this.setData({ tagInput: '' });
    if (this.data.tags.length >= 5) return toast('最多 5 个话题标签');
    this.setData({ tags: this.data.tags.concat([tag]), tagInput: '' });
  },
  removeTag(e) {
    const t = e.currentTarget.dataset.t;
    this.setData({ tags: this.data.tags.filter((x) => x !== t) });
  },

  addImages() {
    const left = 9 - this.data.images.length;
    if (left <= 0) return toast('最多 9 张图');
    wx.showLoading({ title: '处理中…', mask: true });
    pickImages(left)
      .then((list) => {
        wx.hideLoading();
        if (list.length) this.setData({ images: this.data.images.concat(list) });
      })
      .catch(() => { wx.hideLoading(); toast('图片处理失败'); });
  },
  removeImage(e) {
    const i = e.currentTarget.dataset.i;
    this.setData({ images: this.data.images.filter((_, idx) => idx !== i) });
  },
  previewImage(e) {
    const i = e.currentTarget.dataset.i;
    wx.previewImage({ current: this.data.images[i], urls: this.data.images });
  },

  submit() {
    const { title, content, topic, tags, images, emoji, bg, petName, submitting } = this.data;
    if (submitting) return;
    if (!title.trim()) return toast('给笔记起个标题吧');
    if (!content.trim()) return toast('正文还没写呢');

    this.setData({ submitting: true });
    api.createPost({ title: title.trim(), content: content.trim(), topic, topics: tags, images, emoji, bg, petName: petName.trim() })
      .then((post) => {
        toast('发布成功');
        setTimeout(() => {
          wx.redirectTo({ url: `/packageSocial/pages/post/index?id=${post.id}` });
        }, 700);
      })
      .catch((e) => {
        this.setData({ submitting: false });
        toast(e.message || '发布失败');
      });
  },
});
