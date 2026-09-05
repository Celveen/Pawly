const api = require('../../../api/index');
const { toast } = require('../../../utils/util');

Page({
  data: {
    list: null,
    pick: false,
    editing: false,
    form: null,
    error: '',
  },

  onLoad(query) { this.setData({ pick: query.pick === '1' }); },
  onShow() { this.load(); },

  load() {
    api.addresses()
      .then((list) => this.setData({ list: list || [], error: '' }))
      .catch((e) => this.setData({ list: [], error: e.message || '加载失败' }));
  },

  openNew() {
    this.setData({
      editing: true,
      form: { id: '', name: '', phone: '', region: [], province: '', city: '', district: '', detail: '', isDefault: false },
    });
  },
  openEdit(e) {
    const a = this.data.list[e.currentTarget.dataset.i];
    this.setData({
      editing: true,
      form: Object.assign({ region: [a.province, a.city, a.district] }, a),
    });
  },
  close() { this.setData({ editing: false, form: null }); },
  stop() {},

  onField(e) { this.setData({ [`form.${e.currentTarget.dataset.k}`]: e.detail.value }); },
  onRegion(e) {
    const r = e.detail.value;
    this.setData({ 'form.region': r, 'form.province': r[0], 'form.city': r[1], 'form.district': r[2] });
  },
  onDefault(e) { this.setData({ 'form.isDefault': e.detail.value }); },

  save() {
    const f = this.data.form;
    if (!f.name.trim()) return toast('填一下收件人');
    if (!/^1\d{10}$/.test(f.phone)) return toast('手机号格式不正确');
    if (!f.province) return toast('选一下所在地区');
    if (!f.detail.trim()) return toast('详细地址还没填');
    api.upsertAddress({
      id: f.id || undefined,
      name: f.name.trim(),
      phone: f.phone,
      province: f.province,
      city: f.city,
      district: f.district,
      detail: f.detail.trim(),
      isDefault: !!f.isDefault,
    })
      .then(() => { toast('已保存'); this.close(); this.load(); })
      .catch((e) => toast(e.message || '保存失败'));
  },

  setDefault(e) {
    api.setDefaultAddress(e.currentTarget.dataset.id)
      .then(() => this.load())
      .catch((err) => toast(err.message || '操作失败'));
  },

  remove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除地址', content: '确定删除这条收货地址吗？', confirmColor: '#C0492B',
      success: (r) => {
        if (!r.confirm) return;
        api.deleteAddress(id).then(() => { toast('已删除'); this.load(); }).catch((err) => toast(err.message || '删除失败'));
      },
    });
  },

  choose(e) {
    if (!this.data.pick) return;
    api.setDefaultAddress(e.currentTarget.dataset.id)
      .then(() => wx.navigateBack())
      .catch(() => wx.navigateBack());
  },
});
