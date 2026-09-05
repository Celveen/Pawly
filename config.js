/**
 * Pawly 小程序端运行配置。
 *
 * useMock = true  ：不连后端，wx.request 被 mock 层拦截，用内置数据跑通全部界面。
 *                   （开发者工具里第一次跑、或后端没起的时候用这个）
 * useMock = false ：走真实后端，请求 baseUrl + /api/xxx，与网页端同一套接口。
 *
 * baseUrl 已指向正式域名 https://www.aipawly.com（已备案）。记得在
 * 「微信公众平台 → 开发管理 → 开发设置 → 服务器域名 → request 合法域名」里把它加进去。
 *
 * 本地联调改成 'http://localhost:3000'，并在开发者工具勾选
 * 「详情 → 本地设置 → 不校验合法域名」。
 *
 * ⚠️ 后端合完 docs/后端对接改动.md 里的两个补丁、并部署到 www.aipawly.com 之后，
 *    把上面的 useMock 改成 false 就切到真数据了。
 */
module.exports = {
  useMock: true,
  baseUrl: 'https://www.aipawly.com',

  /** AI 对话是否用流式接口（/api/chat/stream，需基础库 >= 2.20.2） */
  useChatStream: true,

  /** 请求超时（AI 编排链较长，单独放宽） */
  timeout: 15000,
  chatTimeout: 60000,
};
