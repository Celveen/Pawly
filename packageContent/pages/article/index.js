const { ARTICLES, ARTICLE_CATS, articleById } = require('../../../data');
const { toast } = require('../../../utils/util');

Page({
  data: { a: null, catName: '', related: [], fontLarge: false },

  onLoad(query) {
    const a = articleById(query.id);
    if (!a) {
      toast('文章不存在');
      return setTimeout(() => wx.navigateBack(), 800);
    }
    const cat = ARTICLE_CATS.find((c) => c.id === a.cat);
    this.setData({
      a,
      catName: cat ? cat.name : '科普',
      related: ARTICLES.filter((x) => x.cat === a.cat && x.id !== a.id).slice(0, 6),
      fontLarge: !!wx.getStorageSync('pawly_article_large'),
    });
  },

  toggleFont() {
    const fontLarge = !this.data.fontLarge;
    wx.setStorageSync('pawly_article_large', fontLarge);
    this.setData({ fontLarge });
  },

  copyRef(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    // 小程序不能直接打开外部网页，复制链接让用户在浏览器里看
    wx.setClipboardData({ data: url, success: () => toast('来源链接已复制') });
  },

  goArticle(e) { wx.redirectTo({ url: `/packageContent/pages/article/index?id=${e.detail.id}` }); },
  askAI() { wx.switchTab({ url: '/pages/ai/index' }); },

  onShareAppMessage() {
    return {
      title: this.data.a ? this.data.a.title : 'Pawly 宠物科普',
      path: `/packageContent/pages/article/index?id=${this.data.a ? this.data.a.id : ''}`,
    };
  },
});
