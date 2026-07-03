<div align="center">

# 🐾 Pawly 宝莉 · AI 宠物导购电商

**一个带 AI 导购助手的宠物用品电商**。用户无需登录即可录入（或在对话中随口提到）自家宠物，AI 客服会**读取专属个人数据**，结合宠物的品种 / 年龄 / 体重 / 特点，从真实商品库挑选并生成可一键下单的购物方案——**提问 → 选方案 → 付款**，把购物链路压到最短。

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Postgres](https://img.shields.io/badge/Neon-Postgres-336791?logo=postgresql&logoColor=white)](https://neon.tech/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-Function%20Calling-4D6BFE)](https://platform.deepseek.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com/)

### 🔗 在线体验：**https://pawly-xi.vercel.app**

</div>

---

## ✨ 项目亮点

- **AI 导购 Agent（核心）**：单主 Agent + 工具调用（Function Calling），自己查用户的宠物档案、检索真实在售商品，一轮内给出 2~3 个带理由的购物方案。
- **个性化且"越用越懂"**：用户在对话里透露的信息（如"我家英短 3 岁 5 公斤"）会被 Agent 自动建档存库，下次无需重复询问。
- **数据永不过期**：宠物只存出生日期，年龄每次实时计算；体重带更新时间戳，过期会提示 Agent 主动确认。
- **多用户零注册**：基于匿名 Cookie 会话，每个访客数据独立隔离，扫码即用。
- **完整电商体验**：首页 / 商品（38 件，含详情与规格参数）/ 宠物科普（16 篇）/ 购物车 / 结算 / 会员中心，加购有 Toast + 角标弹动等确认动效。

## 🧠 AI Agent 设计

| 设计点 | 说明 |
|---|---|
| **单主 Agent + 工具** | 不用多 Agent（早期会带来延迟、成本、调试复杂度），由一个 Agent 通过工具按需取数办事 |
| **工具集** | `get_pet_profile`（读档案）· `upsert_pet`（自动收集）· `search_products`（检索真实商品）· `create_order` · `present_recommendation`（结构化输出） |
| **上下文管理** | 商品库不进提示词，靠检索工具按需取——SKU 再多也不爆上下文；"记忆"放数据库而非上下文窗口 |
| **可靠的结构化输出** | 用工具参数（按 schema 生成）输出方案，规避小模型手写 JSON 失败的问题 |
| **密钥安全** | 大模型 Key 只在服务端读取，前端经 `/api/chat` 间接调用，用户拿不到 Key |

## 🛠️ 技术栈

- **前端**：Next.js 14（App Router）+ React 18 + TypeScript
- **后端**：Next.js Route Handlers（Node.js 运行时）
- **数据库**：Neon（Serverless PostgreSQL）+ Prisma ORM
- **AI**：DeepSeek API（deepseek-v4-flash）+ Function Calling
- **部署**：Vercel + GitHub 自动部署

## 🚀 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
#    .env       中填 DATABASE_URL=...      （Neon 连接串）
#    .env.local 中填 DEEPSEEK_API_KEY=...  （DeepSeek 密钥，可参考 .env.local.example）

# 3. 同步数据库结构到 Neon
npx prisma db push

# 4. 启动
npm run dev          # 打开 http://localhost:3000
```

## 📁 目录结构

```
app/
  page.tsx              前端入口（加载客户端 SPA）
  api/{chat,pets,products,posts}/route.ts   后端接口（posts 为社区帖子 + 点赞）
components/             页面与组件（商品/详情/科普/社区/结算/会员 + 浮窗客服）
lib/
  deepseek.ts           DeepSeek 调用封装（Key 仅服务端）
  session.ts            匿名 Cookie 会话
  pets.ts               年龄 / 生命阶段 / 数据过期计算
  agent/                Agent 编排循环 + 工具集 + 系统提示词
  db/                   Prisma 客户端 / 商品种子 / 数据访问层
prisma/schema.prisma    数据库模型（User / Pet / Product / Order / Post / PostLike）
docs/                   产品设计 / 架构文档
```

## 🗄️ 数据库设计要点

- **存出生日期而非年龄**：年龄实时算，用户零维护，狗狗长大也永远准确。
- **数据归属隔离**：宠物 / 订单都按匿名用户 id 隔离。
- **商品自动同步**：商品种子按 id 增量灌库（已存在跳过），新增商品自动补充。
- **社区帖子全站共享**：帖子/点赞对所有用户可见，发帖与删帖仍按匿名用户 id 归属；首次访问自动灌入官方示例帖。

## ☁️ 部署

推送到 GitHub 后由 Vercel 自动构建部署。需在 Vercel 配置环境变量（Production）：
`DATABASE_URL`、`DEEPSEEK_API_KEY`、`PAWLY_MODEL`、`DEEPSEEK_BASE_URL`。

## 🧭 后续规划

- **接入官方商品联盟 API**（京东联盟 / 淘宝客）：用真实商品（销量、好评）替代演示数据，转"导购 + 返佣"模式，无需自建库存与支付。
- 用户登录、RAG 商品检索、安全护栏与转人工、微信小程序端。

## ⚠️ 说明

当前为作品演示版本：商品为精选模拟数据，结算为演示流程（未接真实支付）。AI 回复仅供参考，宠物健康问题请咨询专业兽医。

---

<div align="center">
<sub>Made with 🐾 for 毛孩子 · Next.js · Prisma · DeepSeek</sub>
</div>
