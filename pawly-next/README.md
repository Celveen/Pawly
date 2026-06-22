# Pawly 宝莉 · Next.js 全栈骨架

API 优先 + 单主 Agent + 真数据库 + 多用户。访客打开链接即用、各填各的数据，AI 客服读取并主动收集每个人的宠物档案后给建议。

## 跑起来

```bash
cd pawly-next
cp .env.local.example .env.local     # 填入 DEEPSEEK_API_KEY
# .env 里已有 DATABASE_URL="file:./dev.db"（SQLite，本地零安装）
npm install
npm run db:migrate                   # 建库建表（首次）
npm run dev                          # http://localhost:3000
```

## 目录结构（对照架构图）

```
app/
  page.tsx              前端：宠物档案表单 + AI 对话
  api/
    chat/route.ts       AI 导购 Agent（读 cookie 身份 → 操作该用户数据）
    pets/route.ts       宠物档案 CRUD（按用户隔离）
    products/route.ts   商品接口
lib/
  session.ts            ⭐ 匿名会话：访客首访自动建账号(cookie)，数据各自隔离
  deepseek.ts           DeepSeek 调用（Key 只在服务端）
  agent/
    systemPrompt.ts     主 Agent 提示词
    tools.ts            工具：get_pet_profile / upsert_pet(自动收集) / search_products / create_order
    runAgent.ts         编排循环（按 userId 隔离）
  db/
    prisma.ts           Prisma 客户端单例
    store.ts            数据访问层（商品共享 / 宠物·订单按用户隔离）
    seed.ts             商品种子（首访自动灌库）
  pets.ts               年龄实时计算 / 生命阶段 / 数据过期检测
prisma/schema.prisma    数据库模型：User / Pet / Product / Order
```

## 关键设计

- **多用户、零注册**：cookie 匿名账号，扫码即用，每人只看自己的数据（`lib/session.ts`）。
- **Agent 自动收集**：用户聊天里透露宠物信息，Agent 调 `upsert_pet` 存档，越用越懂（`lib/agent/tools.ts`）。
- **年龄永不过期**：存 `birthday` 实时算年龄；体重带时间戳，超 60 天标记 `weightStale` 提醒确认（`lib/pets.ts`）。
- **上下文不爆**：商品库不进 prompt，靠 `search_products` 按需检索。

## 上线部署（让同学扫码用）需要做
- SQLite 在 Vercel 这类无服务器平台不持久 → 换 **Postgres**（如 Neon/Supabase 免费档）：把 `schema.prisma` 的 provider 改 `postgresql`、`DATABASE_URL` 换成云库连接串，重跑 migrate。
- 部署到 Vercel（连 GitHub 仓库），在环境变量里配 `DEEPSEEK_API_KEY` 和 `DATABASE_URL`。
- 之后还可补：真实下单/支付、RAG、安全护栏、转人工。
```
