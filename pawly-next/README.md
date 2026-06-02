# Pawly 宝莉 · Next.js 全栈骨架

把浏览器原型迁移成「API 优先 + 单主 Agent + 工具调用」的全栈骨架，对应架构图里的：客户端 → API → 业务服务 / AI 编排层 → 数据。

## 跑起来

```bash
cd pawly-next
cp .env.local.example .env.local   # 填入 DEEPSEEK_API_KEY
npm install
npm run dev                        # 打开 http://localhost:3000
```

## 目录结构（对照架构图）

```
app/
  page.tsx              前端：极简聊天 UI（瘦客户端）
  api/
    chat/route.ts       AI 导购 Agent 接口  ← 编排层入口
    products/route.ts   商品接口            ← 业务服务（多端共用）
    pets/route.ts       宠物档案接口（年龄实时算）
lib/
  deepseek.ts           DeepSeek 调用封装（Key 只在服务端）
  agent/
    systemPrompt.ts     主 Agent 提示词（不再塞商品库！）
    tools.ts            工具集：get_pet_profile / search_products / create_order
    runAgent.ts         编排循环：调模型→执行工具→回灌→出答复
  db/
    seed.ts             种子数据（商品 + 宠物）
    store.ts            数据访问层（内存版，上线换 PostgreSQL，上层不改）
  pets.ts               ⭐ 年龄/生命阶段/过期检测
  types.ts              共用类型
```

## 两个关键设计点

### 1. 单主 Agent + 工具（不是多 Agent）
- 入口只有一个对话 Agent，它通过 `tools.ts` 里的工具按需取数。
- **商品库不进上下文**，靠 `search_products` 检索 —— 不管多少 SKU，上下文都不会爆。

### 2. 数据会过期？存"出生日期"而非"年龄"
- `Pet.birthday` 存出生日期，年龄每次由 `lib/pets.ts` 的 `ageInMonths()` **实时计算**，用户永远不用改。
- 体重这种算不出来的字段带 `weightUpdatedAt`，超 60 天 `petSnapshot()` 会标记 `weightStale=true`，提示词要求 Agent **主动询问**再推荐。
- 进阶：可加定时任务（cron）在宠物跨越生命阶段（幼年→成年）时主动推送提醒。

## 上线前还要补（对照架构图）
- 把 `store.ts` 换成真实数据库（Prisma + PostgreSQL）
- 用户体系/鉴权、订单与支付（微信/支付宝）、对象存储（图片）
- RAG 向量检索（商品 + 科普知识）、安全护栏、转人工
- 微信小程序 / App 端（复用同一套 API）
