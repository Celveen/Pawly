const config = require('../config');

/**
 * 帖子/头像图片地址归一化：
 * - data:image/... 用户上传的 base64，直接用
 * - http(s) 开头，直接用
 * - /images/xxx.jpg 后端静态资源，补上 baseUrl
 */
function imgUrl(src) {
  if (!src) return '';
  const s = String(src);
  if (s.indexOf('data:') === 0 || s.indexOf('http') === 0 || s.indexOf('wxfile://') === 0) return s;
  return config.baseUrl + s;
}

function imgList(list) {
  return (list || []).map(imgUrl).filter(Boolean);
}

module.exports = { imgUrl, imgList };
