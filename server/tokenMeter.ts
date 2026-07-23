// 每次 chat.run 的 token 用量计量器：
// services 层用 tokenMeter.run() 包住 Agent 执行，deepseek.ts 在每次响应后
// 把 usage.total_tokens 累加进来（AsyncLocalStorage 隔离并发请求，互不串账）。
import { AsyncLocalStorage } from 'async_hooks';

export const tokenMeter = new AsyncLocalStorage<{ total: number }>();

export function addTokens(n: number) {
  const s = tokenMeter.getStore();
  if (s && Number.isFinite(n) && n > 0) s.total += n;
}
