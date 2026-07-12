// 前端层（Next.js）到后端服务的唯一通道。
// - 配置了 BACKEND_URL：HTTP 转发到内网后端进程（生产分离模式），
//   业务代码、数据库连接串、模型 Key 都不在前端层进程里。
// - 未配置 BACKEND_URL：进程内直调 server/services（单体模式，Vercel 演示用）。
// 前端层的其余代码（components/、app/ 页面）永远不直接接触数据库。

export type RpcResult<T = any> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function rpc<T = any>(op: string, userId: string, payload: any = {}): Promise<RpcResult<T>> {
  const base = process.env.BACKEND_URL;

  if (base) {
    try {
      const r = await fetch(`${base}/rpc/${op}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY || '',
          'x-user-id': userId,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, status: r.status, error: data?.error || `后端返回 ${r.status}` };
      return { ok: true, data };
    } catch (e: any) {
      console.error(`[gateway] ${op} 转发失败:`, e?.message || e);
      return { ok: false, status: 502, error: '后端服务不可用' };
    }
  }

  // 单体模式：进程内直调（动态 import，避免纯前端构建路径产生额外依赖）
  try {
    const { dispatch, RpcError } = await import('@/server/services');
    try {
      return { ok: true, data: await dispatch(op, userId, payload) };
    } catch (e: any) {
      if (e instanceof RpcError) return { ok: false, status: e.status, error: e.message };
      throw e;
    }
  } catch (e: any) {
    console.error(`[gateway] ${op} 执行失败:`, e?.message || e);
    return { ok: false, status: 500, error: '服务内部错误' };
  }
}
