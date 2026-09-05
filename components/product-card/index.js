const { getPetSpecies } = require('../../utils/pet-species');
const { fmt } = require('../../utils/util');

Component({
  properties: {
    p: { type: Object, value: null },
    /** grid：双列瀑布；wide：横滑大卡 */
    mode: { type: String, value: 'grid' },
    showAdd: { type: Boolean, value: true },
  },
  data: { petLabel: '', petEmoji: '', priceText: '', wasText: '', bump: false },
  observers: {
    p(p) {
      if (!p) return;
      const s = getPetSpecies(p.pet);
      this.setData({
        petLabel: s.label,
        petEmoji: s.emoji,
        priceText: fmt(p.price),
        wasText: p.was ? fmt(p.was) : '',
      });
    },
  },
  methods: {
    onOpen() {
      this.triggerEvent('open', { id: this.data.p.id });
    },
    onAdd(e) {
      // 阻止冒泡到卡片，避免"加购顺带跳详情"
      if (e && e.stopPropagation) e.stopPropagation();
      this.setData({ bump: true });
      setTimeout(() => this.setData({ bump: false }), 320);
      this.triggerEvent('add', { id: this.data.p.id });
    },
  },
});
