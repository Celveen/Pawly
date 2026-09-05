const api = require('../../../api/index');
const { PET_SPECIES, getPetSpecies } = require('../../../utils/pet-species');
const { toast, ymd } = require('../../../utils/util');

const SPECIES = PET_SPECIES.map((s) => s.name);
const SEXES = ['男', '女'];

Page({
  data: {
    pets: null,
    speciesList: SPECIES,
    sexes: SEXES,
    editing: false,
    isNew: true,
    form: null,
    today: '',
    error: '',
  },

  onLoad() { this.setData({ today: ymd(new Date()) }); },
  onShow() { this.load(); },

  load() {
    api.pets()
      .then((list) => this.setData({
        pets: (list || []).map((p) => Object.assign({}, p, { emoji: getPetSpecies(p.species).emoji })),
        error: '',
      }))
      .catch((e) => this.setData({ pets: [], error: e.message || '加载失败' }));
  },

  openNew() {
    this.setData({
      editing: true,
      isNew: true,
      form: { name: '', species: '狗', speciesIndex: 0, breed: '', sex: '', sexIndex: -1, birthday: '', weightKg: '', notes: '' },
    });
  },

  openEdit(e) {
    const p = this.data.pets[e.currentTarget.dataset.i];
    this.setData({
      editing: true,
      isNew: false,
      form: {
        name: p.name,
        species: p.species,
        speciesIndex: Math.max(0, SPECIES.indexOf(p.species)),
        breed: p.breed || '',
        sex: p.sex || '',
        sexIndex: SEXES.indexOf(p.sex),
        birthday: p.birthday || '',
        weightKg: p.weightKg == null ? '' : String(p.weightKg),
        notes: p.notes || '',
      },
    });
  },

  close() { this.setData({ editing: false, form: null }); },
  stop() {},

  onField(e) {
    const k = e.currentTarget.dataset.k;
    this.setData({ [`form.${k}`]: e.detail.value });
  },
  onSpecies(e) {
    const i = Number(e.detail.value);
    this.setData({ 'form.speciesIndex': i, 'form.species': SPECIES[i] });
  },
  onSex(e) {
    const i = Number(e.detail.value);
    this.setData({ 'form.sexIndex': i, 'form.sex': SEXES[i] });
  },
  onBirthday(e) { this.setData({ 'form.birthday': e.detail.value }); },

  save() {
    const f = this.data.form;
    if (!f.name.trim()) return toast('给它起个名字吧');
    const payload = {
      name: f.name.trim(),
      species: f.species,
      breed: f.breed.trim(),
      sex: f.sex,
      notes: f.notes.trim(),
    };
    if (f.birthday) payload.birthday = f.birthday;
    if (f.weightKg !== '') {
      const w = Number(f.weightKg);
      if (!isFinite(w) || w <= 0) return toast('体重填个正数');
      payload.weightKg = w;
    }
    api.upsertPet(payload)
      .then(() => { toast('已保存'); this.close(); this.load(); })
      .catch((e) => toast(e.message || '保存失败'));
  },

  remove(e) {
    const name = e.currentTarget.dataset.name;
    wx.showModal({
      title: '删除档案', content: `确定删除「${name}」的档案吗？`, confirmColor: '#C0492B',
      success: (r) => {
        if (!r.confirm) return;
        api.deletePet(name).then(() => { toast('已删除'); this.load(); }).catch((err) => toast(err.message || '删除失败'));
      },
    });
  },

  askAI() { wx.switchTab({ url: '/pages/ai/index' }); },
});
