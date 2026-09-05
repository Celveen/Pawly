const { ARTICLE_CATS } = require('../../data/index');

Component({
  properties: {
    a: { type: Object, value: null },
    /** wide：横滑卡；row：列表横排；hero：大图卡 */
    mode: { type: String, value: 'wide' },
  },
  data: { catName: '', evidence: false },
  observers: {
    a(a) {
      if (!a) return;
      const c = ARTICLE_CATS.find((x) => x.id === a.cat);
      this.setData({ catName: c ? c.name : '科普', evidence: !!(a.refs && a.refs.length) });
    },
  },
  methods: {
    onOpen() {
      this.triggerEvent('open', { id: this.data.a.id });
    },
  },
});
