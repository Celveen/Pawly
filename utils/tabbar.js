/** tabBar 页面在 onShow 里调一次，让自定义 tabBar 高亮对上当前页 */
module.exports = function syncTab(page, active) {
  if (typeof page.getTabBar === 'function' && page.getTabBar()) {
    page.getTabBar().setData({ active });
    page.getTabBar().sync();
  }
};
