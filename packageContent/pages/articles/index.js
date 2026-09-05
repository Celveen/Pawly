const { ARTICLES, ARTICLE_CATS } = require('../../../data/index');
const { PET_FILTERS, articleMatchesSpecies } = require('../../../utils/pet-species');
const { debounce } = require('../../../utils/util');

const PAGE_SIZE = 12;

Page({
  data: {
    cats: ARTICLE_CATS,
    pets: PET_FILTERS,
    cat: 'all',
    pet: 'all',
    q: '',
    hero: null,
    list: [],
    total: 0,
    shown: 0,
  },

  onLoad(query) {
    if (query.cat) this.setData({ cat: query.cat });
    this.debounced = debounce(() => this.apply(), 260);
    this.apply();
  },

  apply(more) {
    const { cat, pet, q } = this.data;
    const kw = String(q).trim();
    const filtered = ARTICLES.filter((a) => (cat === 'all' || a.cat === cat)
      && articleMatchesSpecies(a, pet)
      && (!kw || a.title.indexOf(kw) >= 0 || a.excerpt.indexOf(kw) >= 0));

    const shown = more ? Math.min(this.data.shown + PAGE_SIZE, filtered.length) : Math.min(PAGE_SIZE, filtered.length);
    this.setData({
      hero: filtered[0] || null,
      list: filtered.slice(1, shown),
      total: filtered.length,
      shown,
    });
  },

  onReachBottom() {
    if (this.data.shown < this.data.total) this.apply(true);
  },

  onInput(e) { this.setData({ q: e.detail.value }); this.debounced(); },
  onClearQ() { this.setData({ q: '' }, () => this.apply()); },
  onCat(e) { this.setData({ cat: e.currentTarget.dataset.id }, () => this.apply()); },
  onPet(e) { this.setData({ pet: e.currentTarget.dataset.id }, () => this.apply()); },
  goArticle(e) { wx.navigateTo({ url: `/packageContent/pages/article/index?id=${e.detail.id}` }); },
  goHero() { if (this.data.hero) wx.navigateTo({ url: `/packageContent/pages/article/index?id=${this.data.hero.id}` }); },
  reset() { this.setData({ cat: 'all', pet: 'all', q: '' }, () => this.apply()); },
});
