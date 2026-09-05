Component({
  properties: {
    no: { type: String, value: '' },
    en: { type: String, value: '' },
    title: { type: String, value: '' },
    sub: { type: String, value: '' },
    action: { type: String, value: '' },
    rule: { type: Boolean, value: true },
  },
  methods: {
    onAction() { this.triggerEvent('action'); },
  },
});
