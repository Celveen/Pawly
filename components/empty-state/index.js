Component({
  properties: {
    emoji: { type: String, value: '🐾' },
    title: { type: String, value: '这里还空着' },
    desc: { type: String, value: '' },
    action: { type: String, value: '' },
  },
  methods: {
    onAction() { this.triggerEvent('action'); },
  },
});
