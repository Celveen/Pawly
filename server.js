// Pawly 宝莉 · AI 导购后端中转（零依赖，Node 18+ 自带 fetch）
//
// 作用：把前端请求安全地转发给 DeepSeek API。你的 API Key 只放在 .env 里（服务端），
//      永远不出现在前端代码里，用户看不到。
//
// 启动方式：
//   1) 把你的 Key 填进同目录下的 .env 文件（DEEPSEEK_API_KEY=...）
//   2) 运行：node server.js
//   3) 在 Pawly 宝莉.html 的 <head> 里加一行，把前端切到真 AI：
//        <script>window.PAWLY_API_ENDPOINT = 'http://localhost:8787/api/chat';</script>

const http = require('http');
const fs = require('fs');
const path = require('path');

// —— 极简 .env 加载器（无需安装 dotenv）——
(function loadEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);   // 跳过空行和 # 注释
    if (!m) continue;
    const k = m[1];
    const v = m[2].replace(/^["']|["']$/g, '').trim();      // 去掉两边可能的引号
    if (!(k in process.env)) process.env[k] = v;
  }
})();

const API_KEY = process.env.DEEPSEEK_API_KEY;
const PORT = process.env.PORT || 8787;
// 若该模型 id 被 API 拒绝，可在 .env 里改 PAWLY_MODEL（DeepSeek 官方常见 id：deepseek-chat / deepseek-reasoner）
const MODEL = process.env.PAWLY_MODEL || 'deepseek-v4-Pro';
const DEEPSEEK_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/chat/completions';

if (!API_KEY) {
  console.error('❌ 缺少 DEEPSEEK_API_KEY，请在 .env 文件里填入你的 Key 再启动。');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // 允许前端（静态页面 / 其它端口）跨域调用
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST' || req.url !== '/api/chat') {
    res.writeHead(404); return res.end('Not Found');
  }

  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', async () => {
    try {
      const { system, messages } = JSON.parse(body || '{}');

      // DeepSeek 用 OpenAI 兼容格式：system 作为第一条 system 消息
      const chatMessages = [
        { role: 'system', content: system },
        ...(messages || []),
      ];

      const resp = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${API_KEY}`,   // ← Key 在这里，安全地待在服务端
        },
        body: JSON.stringify({
          model: MODEL,
          messages: chatMessages,
          max_tokens: 1024,
          temperature: 0.7,
          response_format: { type: 'json_object' }, // 强制返回合法 JSON，配合我们的方案协议
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error('DeepSeek API error:', data);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ reply: '抱歉，AI 暂时不可用，请稍后再试。', proposals: [] }));
      }

      // 模型按系统提示词返回一段 JSON 文本，原样转给前端，由前端解析成 {reply, proposals}
      const text = data.choices?.[0]?.message?.content || '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text }));
    } catch (e) {
      console.error(e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ reply: '服务端出错了，请稍后再试。', proposals: [] }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`🐾 Pawly AI 后端已启动: http://localhost:${PORT}/api/chat  (model: ${MODEL})`);
});
