/**
 * 统一请求层：与网页端同一套 /api 接口。
 *
 * 身份：网页端用 httpOnly Cookie（pawly_uid）标识用户，小程序 wx.request 没有可靠的
 * Cookie 容器，所以改成请求头 `x-pawly-uid` 透传同一个 id。
 * 后端需要一处很小的改动（见 docs/后端对接改动.md）：
 *   getOrCreateUserId() 先读 x-pawly-uid，再回落到 Cookie。
 */
const config = require('../config');
const { uuid } = require('../utils/util');

const UID_KEY = 'pawly_uid';

/** 取当前身份 id：游客首次进入时本地生成，登录成功后被换成账号 userId */
function getUid() {
  let id = wx.getStorageSync(UID_KEY);
  if (!id) {
    id = uuid();
    wx.setStorageSync(UID_KEY, id);
  }
  return id;
}

/** 登录 / 注册成功后切换身份（游客数据由后端合并到账号） */
function setUid(id) {
  if (id) wx.setStorageSync(UID_KEY, id);
}

/** 退出登录：回到一个全新的游客身份 */
function resetUid() {
  const id = uuid();
  wx.setStorageSync(UID_KEY, id);
  return id;
}

function request(path, method = 'GET', data, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: config.baseUrl + path,
      method,
      data: data || {},
      timeout: options.timeout || config.timeout,
      header: {
        'content-type': 'application/json',
        'x-pawly-uid': getUid(),
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          const msg = (res.data && res.data.error) || `请求失败（${res.statusCode}）`;
          reject(Object.assign(new Error(msg), { statusCode: res.statusCode, data: res.data }));
        }
      },
      fail(err) {
        reject(Object.assign(new Error('网络不给力，请稍后再试'), { raw: err }));
      },
    });
  });
}

const get = (path, query, options) => request(path + qs(query), 'GET', undefined, options);
const post = (path, body, options) => request(path, 'POST', body, options);
const del = (path, query, options) => request(path + qs(query), 'DELETE', undefined, options);

function qs(query) {
  if (!query) return '';
  const parts = Object.keys(query)
    .filter((k) => query[k] !== undefined && query[k] !== null && query[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

module.exports = { request, get, post, del, getUid, setUid, resetUid, UID_KEY };
