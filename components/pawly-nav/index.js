const app = getApp();

Component({
  options: { multipleSlots: true },
  properties: {
    title: { type: String, value: '' },
    /** 副标题：小字眉题，编辑风 */
    eyebrow: { type: String, value: '' },
    /** 透明底（首页首屏用），滚动后由页面切回实底 */
    transparent: { type: Boolean, value: false },
    /** 是否显示返回键；tabBar 页面传 false */
    back: { type: Boolean, value: true },
    /** 显示 Pawly 字标而不是标题 */
    brand: { type: Boolean, value: false },
  },
  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    menuRight: 10,
  },
  lifetimes: {
    attached() {
      const g = app.globalData;
      this.setData({
        statusBarHeight: g.statusBarHeight,
        navBarHeight: g.navBarHeight,
        menuRight: g.menuRight,
      });
    },
  },
  methods: {
    onBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) wx.navigateBack();
      else wx.switchTab({ url: '/pages/home/index' });
    },
  },
});
