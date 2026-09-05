const api = require('../../../api/index');
const { toast, ymd } = require('../../../utils/util');

const TYPE_META = {
  vaccine: { e: '💉', name: '疫苗' },
  checkup: { e: '🏥', name: '体检' },
  'deworm-in': { e: '💊', name: '体内驱虫' },
  'deworm-out': { e: '🧴', name: '体外驱虫' },
};

Page({
  data: { list: null, todo: [], done: [], error: '' },

  onShow() { this.load(); },

  load() {
    api.reminders()
      .then((list) => {
        const now = Date.now();
        const items = (list || []).map((r) => {
          const due = new Date(String(r.due).replace(/-/g, '/').replace('T', ' ').replace(/\.\d+Z?$/, ''));
          const days = Math.ceil((due.getTime() - now) / 86400000);
          const meta = TYPE_META[r.type] || { e: '📌', name: '提醒' };
          return Object.assign({}, r, {
            emoji: meta.e,
            typeName: meta.name,
            dueText: ymd(due),
            overdue: !r.done && days < 0,
            soon: !r.done && days >= 0 && days <= 14,
            daysText: r.done ? '已完成' : days < 0 ? `已逾期 ${-days} 天` : days === 0 ? '就是今天' : `还有 ${days} 天`,
          });
        });
        this.setData({
          list: items,
          todo: items.filter((r) => !r.done),
          done: items.filter((r) => r.done),
          error: '',
        });
      })
      .catch((e) => this.setData({ list: [], todo: [], done: [], error: e.message || '加载失败' }));
  },

  toggle(e) {
    const key = e.currentTarget.dataset.key;
    api.toggleReminder(key)
      .then(() => this.load())
      .catch((err) => toast(err.message || '操作失败'));
  },

  goPets() { wx.navigateTo({ url: '/packageUser/pages/pets/index' }); },
});
