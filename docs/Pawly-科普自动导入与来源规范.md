# Pawly 科普自动导入与来源规范

## 基本原则

Pawly 可以自动采集、提炼、分类和校验资料，但“权威来源”不等于“允许商业转载”。来源白名单分为三种状态：

- `approved`：有明确商业使用/改编授权，可进入自动发布队列。
- `reference`：可以作为真实参考来源展示和供 AI 检索，但不能自动发布来源全文或默认改编发布。
- `blocked`：禁止采集或发布。

当前登记的来源默认都是 `reference`，没有任何来源默认授予 Pawly 商业使用权。
来源策略还必须记录 `authorizationBasis`（授权依据）、`licenseEvidenceUrl`（授权证据链接）、`verifiedAt`（核验日期）和 `allowedContentTypes`（允许摘要/引用/全文的范围）。逐篇清单还必须记录 `licenseType`（仅接受 `CC0-1.0` 或 `CC-BY-4.0`）、`licenseUrl` 和作者信息。缺少其中任一项时，自动导入只能进入 HOLD，不能自动发布。

## 自动导入流水线

1. 只访问来源白名单中的域名和路径。
2. 优先使用 RSS、API 或来源方允许的 feed；普通网页只提取标题、摘要、日期和正文文本，不抓取图片、Logo、PDF 和整页 HTML。
3. 生成 Pawly 独立摘要，不复制整篇文章、不整篇翻译、不复用原文段落结构。
4. 使用物种词典和主题词典进行规则分类，再用模型输出结构化分类和置信度。
5. 检查来源、物种、主题、重复内容和高风险词。
6. 对生成文章执行第二次独立质量校验，确认来源支持度、分类匹配度、未支持事实数量和风险等级。
7. 只有来源是 `approved` 且授权、分类、质量和风险门槛全部达标时才自动发布；否则进入隔离队列。
8. 每条任务都写入 `content/knowledge-import-log.json`，记录 `published`、`hold`、`blocked` 或 `error` 及具体原因，避免失败被静默吞掉。

## 本地运行导入器

来源 URL 写入 `content/knowledge-sources.json`。为了确保自动发布时物种和板块可追溯，自动发布必须使用带有 `expectedSpecies`、`expectedCategories` 和 `sourceId` 的清单项；直接传命令行 URL 只会进入 HOLD：

```bash
npm run knowledge:import
```

清单支持为每条来源声明预期范围，系统会在模型生成后再次核对，避免文章被放进错误物种或错误板块：

```json
[
  {
    "url": "https://www.example.org/pet-rabbit/diet",
    "sourceId": "rspca",
    "licenseType": "CC-BY-4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "author": "原文作者姓名",
    "expectedSpecies": ["rabbit"],
    "expectedCategories": ["nutri", "health"]
  }
]
```

`sourceId` 必须和白名单策略一致；物种可用 `dog`、`cat`、`rabbit`、`bird`、`hamster`、`guinea_pig`、`aquatic`、`reptile`、`mini_pig`，分类可用 `nutri`、`train`、`health`、`groom`、`breed`、`puppy`。许可证必须在原文页面逐篇核实，不能因为整本期刊或网站“开放获取”就默认所有内容都是 CC BY。

导入器只会自动发布 `approved` 来源。当前所有内置来源都是 `reference`，因此会自动停在 `[HOLD]`，不会抓取后直接上线。取得商业改编许可后，需在 `server/agent/knowledge/sourceRegistry.ts` 中补充授权证据、将状态改为 `approved`，再运行导入器。

导入器不会把抓取到的来源网页全文写入项目；本地只保留独立生成的 Pawly 文章、原文链接、抓取时间和来源正文哈希。重复正文、无效物种、错误科普分类、过短段落、具体剂量表达和模型低置信度都会被拦截并记录。

## 来源字段最低要求

来源机构、原文标题、原文 URL、来源日期、抓取日期、来源状态、许可依据、授权证据、核验日期、适用物种、适用主题和内容哈希都必须留存。

## 高风险内容

药物剂量、诊断结论、急症判断和治疗方案不能只靠自动摘要直接发布。没有人工审核时，系统应只展示来源链接、一般性风险提示和就医建议。
