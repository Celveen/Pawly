// Pawly 后端服务（分离模式入口）。
// 安全设计：只监听 127.0.0.1（即使防火墙放行了端口，公网也无法直连），
// 且每个请求必须携带与前端层约定的 x-internal-key，双保险。
// 启动：INTERNAL_API_KEY=xxx BACKEND_PORT=28898 npm run backend
import express from 'express';
import { dispatch, RpcError } from './services';

const PORT = Number(process.env.BACKEND_PORT || 28898);
const HOST = process.env.BACKEND_HOST || '127.0.0.1';
const KEY = process.env.INTERNAL_API_KEY;

if (!KEY) {
  console.error('[backend] 缺少 INTERNAL_API_KEY 环境变量（openssl rand -hex 32 生成）');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.post('/rpc/:op', async (req, res) => {
  if (req.get('x-internal-key') !== KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const userId = req.get('x-user-id') || '';
  if (!userId) return res.status(400).json({ error: '缺少用户身份' });
  try {
    res.json(await dispatch(req.params.op, userId, req.body ?? {}));
  } catch (e: any) {
    if (e instanceof RpcError) return res.status(e.status).json({ error: e.message });
    console.error(`[backend] ${req.params.op} error:`, e?.message || e);
    res.status(500).json({ error: '服务内部错误' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`[backend] Pawly 后端已启动 http://${HOST}:${PORT}（仅内网可达）`);
});
