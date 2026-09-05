/** 前端展示用的静态数据与分类表（与网页端 components/data.js 对齐） */
const PRODUCTS = require('./products');
const ARTICLES = require('./articles');

const CATEGORIES = [
  { id: 'all', name: '全部', icon: '✨' },
  { id: 'food', name: '主粮', icon: '🥣' },
  { id: 'snack', name: '零食', icon: '🍖' },
  { id: 'toy', name: '玩具', icon: '🎾' },
  { id: 'wash', name: '洗护', icon: '🛁' },
  { id: 'out', name: '外出', icon: '🎒' },
  { id: 'home', name: '家居', icon: '🛏️' },
  { id: 'health', name: '保健', icon: '💊' },
];

const ARTICLE_CATS = [
  { id: 'all', name: '全部' },
  { id: 'nutri', name: '饮食营养' },
  { id: 'train', name: '训练教程' },
  { id: 'health', name: '健康与疾病' },
  { id: 'groom', name: '美容护理' },
  { id: 'breed', name: '品种百科' },
  { id: 'puppy', name: '幼宠养育' },
];

const TOPICS = [
  { id: 'all', name: '全部', emoji: '' },
  { id: '晒宠', name: '晒宠', emoji: '🐾' },
  { id: '好物', name: '好物', emoji: '🧶' },
  { id: '求助', name: '求助', emoji: '🩺' },
  { id: '日常', name: '日常', emoji: '☀️' },
];

const SUGGESTED_TAGS = ['新手养猫', '新手养狗', '好物推荐', '避坑指南', '日常碎片', '健康求助', '晒单'];

function productById(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}
function articleById(id) {
  return ARTICLES.find((a) => a.id === id) || null;
}

module.exports = {
  PRODUCTS, ARTICLES, CATEGORIES, ARTICLE_CATS, TOPICS, SUGGESTED_TAGS,
  productById, articleById,
};
