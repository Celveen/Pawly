/**
 * Pawly 接口清单：一行一个后端能力，与网页端 app/api 下的路由一一对应。
 * 页面只调这里的方法，不直接拼 URL。
 */
const { get, post, del, getUid, setUid, resetUid } = require('./request');
const config = require('../config');

module.exports = {
  getUid, setUid, resetUid,

  /* —— 账号 —— */
  me: () => get('/api/auth/me'),
  login: (account, password) => post('/api/auth/login', { account, password }),
  register: (payload) => post('/api/auth/register', payload),
  logout: () => post('/api/auth/logout', {}),
  changePassword: (oldPassword, newPassword) => post('/api/auth/password', { oldPassword, newPassword }),

  /* —— 个人资料 —— */
  profile: (userId) => get('/api/profile', { userId }),
  updateProfile: (payload) => post('/api/profile', payload),
  follows: (userId, kind) => get('/api/profile/follows', { userId, kind }),
  collection: (kind) => get('/api/profile/collection', { kind }),
  searchUsers: (q) => get('/api/users/search', { q }),
  toggleFollow: (userId) => post('/api/follow', { userId }),
  avatarUrl: (userId, v) => `${config.baseUrl}/api/avatar/${userId}${v ? `?v=${v}` : ''}`,

  /* —— 商品与订单 —— */
  products: () => get('/api/products'),
  reviews: (productId) => get('/api/reviews', { productId }),
  createReview: (payload) => post('/api/reviews', payload),
  orders: () => get('/api/orders'),
  createOrder: (payload) => post('/api/orders', payload),

  /* —— 社区 —— */
  posts: (topic) => get('/api/posts', { topic }),
  post: (id) => get('/api/posts', { id }),
  createPost: (payload) => post('/api/posts', payload),
  deletePost: (id) => del('/api/posts', { id }),
  likePost: (postId) => post('/api/posts/like', { postId }),
  favoritePost: (postId) => post('/api/posts/favorite', { postId }),
  searchPosts: (q) => get('/api/posts/search', { q }),
  comments: (postId) => get('/api/comments', { postId }),
  createComment: (payload) => post('/api/comments', payload),
  deleteComment: (id) => del('/api/comments', { id }),

  /* —— 通知与私信 —— */
  notifications: (kind) => get('/api/notifications', { kind }),
  unreadNotifications: () => get('/api/notifications', { unread: 1 }),
  readNotifications: () => post('/api/notifications', {}),
  conversations: () => get('/api/dm'),
  thread: (peerId) => get('/api/dm/thread', { peerId }),
  sendDm: (payload) => post('/api/dm', payload),
  deleteConversation: (peerId) => del('/api/dm', { peerId }),
  unreadDm: () => get('/api/dm/unread'),

  /* —— 会员中心 —— */
  pets: () => get('/api/pets'),
  upsertPet: (payload) => post('/api/pets', payload),
  deletePet: (name) => del('/api/pets', { name }),
  reminders: () => get('/api/reminders'),
  toggleReminder: (key) => post('/api/reminders', { key }),
  addresses: () => get('/api/addresses'),
  upsertAddress: (payload) => post('/api/addresses', payload),
  deleteAddress: (id) => del('/api/addresses', { id }),
  setDefaultAddress: (id) => post('/api/addresses/default', { id }),
  checkinStatus: () => get('/api/checkin'),
  checkin: () => post('/api/checkin', {}),

  /* —— AI 管家 —— */
  chat: (messages) => post('/api/chat', { messages }, { timeout: config.chatTimeout }),
  chatHistory: () => get('/api/chat/history'),
  diagnose: () => get('/api/chat/diagnose'),
};
