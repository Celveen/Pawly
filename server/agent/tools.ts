// Agent 工具注册中心：定义与执行解耦，便于后续继续增删工具。
import { prisma } from '../db/prisma';
import { store } from '../db/store';
import { petSnapshot, birthdayFromAgeMonths } from '../pets';
import { searchCommunityPosts } from './community/search';
import { summarizeCommunityPosts } from './community/summarize';
import type { CommunityPostRecord, CommunitySearchResultItem } from './community/types';
import { rankGuidanceCandidates } from './guidance/rank';
import { inferExplicitProductRequestTerms, matchesExplicitProductTerms } from './guidance/request';
import { buildKnowledgeToolPayload } from './knowledge/presentation';
import { runKnowledgeAgent } from './knowledge/runKnowledgeAgent';
import { inferPrimarySpeciesScope, normalizeSpeciesScope } from './knowledge/taxonomy';

// #工具执行上下文
export interface ToolContext {
  userId: string;
  currentUserQuestion?: string;
  currentPetSpecies?: string;
  explicitProductTerms?: string[];
}

// #工具处理函数类型
type ToolHandler = (args: any, ctx: ToolContext) => Promise<unknown>;

// #工具注册结构
interface RegisteredTool {
  name: string;
  definition: {
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  };
  handler: ToolHandler;
}

// #工具定义助手
function defineTool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
  handler: ToolHandler,
): RegisteredTool {
  return {
    name,
    definition: {
      type: 'function',
      function: { name, description, parameters },
    },
    handler,
  };
}

// #主Agent可调用工具注册表
const registeredTools: RegisteredTool[] = [
  defineTool(
    'get_pet_profile',
    '读取【当前用户】的宠物档案。年龄由出生日期实时计算。返回里 weightStale=true 表示体重数据已过期(>60天)，需先确认。若返回空数组，说明该用户还没填过资料，应礼貌询问并用 upsert_pet 保存。',
    {
      type: 'object',
      properties: { name: { type: 'string', description: '宠物名，可选；不填返回该用户全部宠物' } },
    },
    async (args, ctx) => {
      const pets = await store.getPet(ctx.userId, args?.name);
      return pets.map((p: any) => petSnapshot(p));
    },
  ),
  defineTool(
    'upsert_pet',
    '保存/更新【当前用户】的宠物资料。当用户在对话中透露了宠物信息（品种、年龄、体重等），就主动调用它把数据收集存档，下次无需重复问。同名宠物会被更新。',
    {
      type: 'object',
      properties: {
        name: { type: 'string', description: '宠物名（必填）' },
        species: { type: 'string', description: '物种（当前主要支持猫狗，字段保持字符串以便后续扩展）' },
        breed: { type: 'string', description: '品种，如"柴犬"' },
        sex: { type: 'string', enum: ['男', '女'] },
        ageMonths: { type: 'number', description: '当前月龄（会自动换算成出生日期存储，以后年龄自动增长）' },
        birthday: { type: 'string', description: '出生日期 YYYY-MM-DD（与 ageMonths 二选一，优先用它）' },
        weightKg: { type: 'number', description: '体重(kg)' },
        notes: { type: 'string', description: '特点/健康备注，如"肠胃敏感、爱啃咬"' },
      },
      required: ['name', 'species'],
    },
    async (args, ctx) => {
      const data: any = { name: args.name, species: args.species };
      if (args.breed) data.breed = args.breed;
      if (args.sex) data.sex = args.sex;
      if (args.notes) data.notes = args.notes;
      if (typeof args.weightKg === 'number') {
        data.weightKg = args.weightKg;
        data.weightUpdatedAt = new Date();
      }
      if (args.birthday) data.birthday = new Date(args.birthday);
      else if (typeof args.ageMonths === 'number') data.birthday = new Date(birthdayFromAgeMonths(args.ageMonths));
      const saved = await store.upsertPet(ctx.userId, data);
      return { ok: true, saved: petSnapshot(saved) };
    },
  ),
  defineTool(
    'search_products',
    '按条件检索在售商品（替代把整库塞进上下文）。推荐前必须用它取真实商品，建议 inStockOnly=true。',
    {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        species: { type: 'string', description: '当前商品目录主要支持狗/猫，字段保持字符串便于后续扩展' },
        category: { type: 'string', description: 'food/snack/toy/wash/out/home/health' },
        maxPrice: { type: 'number' },
        inStockOnly: { type: 'boolean' },
      },
    },
    async (args, ctx) => {
      // #明确商品词与当前物种强约束
      const explicitTerms = ctx.explicitProductTerms?.length
        ? ctx.explicitProductTerms
        : inferExplicitProductRequestTerms(ctx.currentUserQuestion || '');
      const list = await store.searchProducts({
        keyword: explicitTerms[0] || args?.keyword,
        species: ctx.currentPetSpecies || args?.species,
        category: args?.category,
        maxPrice: args?.maxPrice,
        inStockOnly: args?.inStockOnly,
      });
      return list.map((p: any) => ({
        id: p.id,
        name: p.name,
        pet: p.pet,
        price: p.price,
        was: p.was,
        rating: p.rating,
        sub: p.sub,
        badges: p.badges,
        stock: p.stock,
        inStock: p.stock > 0,
      }));
    },
  ),
  defineTool(
    'guidance_rank_products',
    '基于已检索到的商品候选、宠物档案和订单历史，对导购候选做二次排序与理由提炼。适用于主 Agent 已经拿到 search_products 结果，想更稳地组织推荐时。',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: '当前导购诉求，例如“帮我挑肠胃友好的主粮”' },
        category: { type: 'string', description: '目标品类，可选' },
        maxPrice: { type: 'number', description: '预算上限，可选' },
        petProfile: {
          type: 'object',
          properties: {
            species: { type: 'string' },
            breed: { type: 'string' },
            ageMonths: { type: 'number' },
            weightKg: { type: 'number' },
            notes: { type: 'string' },
          },
        },
        orderHistory: {
          type: 'object',
          properties: {
            purchasedCategories: { type: 'array', items: { type: 'string' } },
            purchasedSpecies: { type: 'array', items: { type: 'string' } },
          },
        },
        products: {
          type: 'array',
          description: '通常直接传 search_products 返回的商品数组',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              pet: { type: 'string' },
              price: { type: 'number' },
              rating: { type: 'number' },
              sub: { type: 'string' },
              badges: { type: 'array', items: { type: 'string' } },
              stock: { type: 'number' },
              inStock: { type: 'boolean' },
            },
            required: ['id', 'name'],
          },
        },
      },
      required: ['query', 'products'],
    },
    async (args, ctx) => {
      const explicitTerms = ctx.explicitProductTerms?.length
        ? ctx.explicitProductTerms
        : inferExplicitProductRequestTerms(ctx.currentUserQuestion || '');
      const products = normalizeGuidanceProducts(Array.isArray(args?.products) ? args.products : [])
        .filter((product) => matchesExplicitProductTerms(product, explicitTerms));
      return rankGuidanceCandidates({
        query: ctx.currentUserQuestion?.trim() || String(args?.query || ''),
        category: typeof args?.category === 'string' ? args.category : undefined,
        maxPrice: typeof args?.maxPrice === 'number' ? args.maxPrice : undefined,
        petProfile: args?.petProfile && typeof args.petProfile === 'object'
          ? {
              species: typeof args.petProfile.species === 'string' ? args.petProfile.species : undefined,
              breed: typeof args.petProfile.breed === 'string' ? args.petProfile.breed : undefined,
              ageMonths: typeof args.petProfile.ageMonths === 'number' ? args.petProfile.ageMonths : undefined,
              weightKg: typeof args.petProfile.weightKg === 'number' ? args.petProfile.weightKg : undefined,
              notes: typeof args.petProfile.notes === 'string' ? args.petProfile.notes : undefined,
            }
          : undefined,
        orderHistory: args?.orderHistory && typeof args.orderHistory === 'object'
          ? {
              purchasedCategories: Array.isArray(args.orderHistory.purchasedCategories)
                ? args.orderHistory.purchasedCategories.map(String)
                : [],
              purchasedSpecies: Array.isArray(args.orderHistory.purchasedSpecies)
                ? args.orderHistory.purchasedSpecies.map(String)
                : [],
            }
          : undefined,
        products,
      });
    },
  ),
  defineTool(
    'community_search',
    '检索社区帖子与经验内容。适用于“别人怎么说”“社区里有没有类似情况”“看看大家经验”这类问题。它只返回经验内容，不提供专业医疗结论。',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: '当前要检索的社区问题或关键词' },
        petSpecies: { type: 'string', description: '相关物种，可选' },
        topicScope: { type: 'string', description: '相关病症或主题，可选，如 vomit/feeding/behavior' },
        communityTopic: { type: 'string', description: '社区帖子话题，可选，如 日常/好物/求助' },
        limit: { type: 'number', description: '返回条数，默认 3，最大 5' },
      },
      required: ['query'],
    },
    async (args, ctx) => {
      const posts = await store.listPosts(
        ctx.userId,
        typeof args?.communityTopic === 'string' && args.communityTopic.trim() ? args.communityTopic.trim() : undefined,
      );
      return searchCommunityPosts(normalizeCommunityPostRecords(posts), {
        query: String(args?.query || ''),
        petSpecies: normalizeSpeciesScope(typeof args?.petSpecies === 'string' ? args.petSpecies : null),
        topicScope: typeof args?.topicScope === 'string' ? args.topicScope.trim().toLowerCase() : '',
        communityTopic: typeof args?.communityTopic === 'string' ? args.communityTopic.trim() : null,
        limit: args?.limit,
      });
    },
  ),
  defineTool(
    'community_summarize',
    '基于 community_search 返回的帖子结果，提炼社区里常见的经验模式，并明确加上“仅供参考、不替代专业判断”的边界。',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: '原始社区问题或查询词' },
        petSpecies: { type: 'string', description: '相关物种，可选' },
        topicScope: { type: 'string', description: '相关病症或主题，可选' },
        posts: {
          type: 'array',
          description: '通常直接传 community_search 返回的 posts',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              excerpt: { type: 'string' },
              topic: { type: 'string' },
              author: { type: 'string' },
              likeCount: { type: 'number' },
              createdAt: { type: 'string' },
              matchReasons: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'title', 'excerpt', 'topic', 'author'],
          },
        },
      },
      required: ['query', 'posts'],
    },
    async (args) => {
      const posts = Array.isArray(args?.posts) ? args.posts : [];
      return summarizeCommunityPosts({
        query: String(args?.query || ''),
        petSpecies: typeof args?.petSpecies === 'string' ? normalizeSpeciesScope(args.petSpecies) : null,
        topicScope: typeof args?.topicScope === 'string' ? args.topicScope.trim().toLowerCase() : null,
        posts: normalizeCommunitySearchResultItems(posts),
      });
    },
  ),
  defineTool(
    'get_order_history',
    '读取【当前用户】最近订单历史，用于理解以前买过什么、最近买过哪些同类品，但不负责复购判断。',
    {
      type: 'object',
      properties: {
        limit: { type: 'number', description: '返回最近订单数量，默认 5，最大 10' },
      },
    },
    async (args, ctx) => {
      const limit = clampLimit(args?.limit, 5, 10);
      const orders = await prisma.order.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      const orderItems = orders.map((order: any) => ({
        id: order.id,
        createdAt: order.createdAt,
        total: order.total,
        status: order.status,
        items: parseOrderItems(order.items),
      }));
      const productIds = Array.from(
        new Set(
          orderItems.flatMap((order: { items: Array<{ id?: string; name?: string; price?: number }> }) =>
            order.items
              .map((item: { id?: string }) => item.id)
              .filter((id: string | undefined): id is string => typeof id === 'string' && id.length > 0),
          ),
        ),
      );
      const products = productIds.length ? await store.getProductsByIds(productIds as string[]) : [];
      const productMap = new Map(products.map((item: any) => [item.id, item] as const));
      const purchasedCategories = new Set<string>();
      const purchasedSpecies = new Set<string>();

      const recentOrders = orderItems.map((order: any) => ({
        orderId: order.id,
        createdAt: order.createdAt,
        total: order.total,
        status: order.status,
        items: order.items.map((item: { id?: string; name?: string; price?: number }) => {
          const product = item.id ? productMap.get(item.id) : undefined;
          if (product?.cat) purchasedCategories.add(product.cat);
          if (product?.pet) purchasedSpecies.add(product.pet);
          return {
            id: item.id,
            name: item.name,
            price: item.price,
            category: product?.cat,
            species: product?.pet,
          };
        }),
      }));

      return {
        orderCount: recentOrders.length,
        lastPurchasedAt: recentOrders[0]?.createdAt || null,
        purchasedCategories: Array.from(purchasedCategories),
        purchasedSpecies: Array.from(purchasedSpecies),
        recentOrders,
      };
    },
  ),
  defineTool(
    'ask_knowledge_agent',
    '遇到专业知识、疾病、药物、急症、中毒、术后恢复等问题时，调用知识 Agent 进行基于证据的回答。优先传入你已知的 evidence；如果暂时没有，知识 Agent 会先尝试从内部科普知识库检索，但若最终仍无可靠来源，就会拒答或保守回答。返回结果包含 knowledge（专业结论）和 presentationHints（主 Agent 如何安全呈现这条结论的提示）。',
    {
      type: 'object',
      properties: {
        question: { type: 'string', description: '需要知识 Agent 回答的具体问题' },
        intent: { type: 'string', enum: ['knowledge', 'high_risk_knowledge'] },
        petProfile: {
          type: 'object',
          description: '当前问题相关的宠物信息；物种不要写死，便于未来扩展到猫狗以外',
          properties: {
            species: { type: 'string', description: '宠物物种，如狗、猫，后续可扩展到其他宠物' },
            breed: { type: 'string' },
            ageMonths: { type: 'number' },
            sex: { type: 'string' },
            weightKg: { type: 'number' },
            notes: { type: 'string' },
          },
        },
        conversationContext: {
          type: 'array',
          items: { type: 'string' },
          description: '与当前问题直接相关的上下文片段，避免把整段历史都塞进去',
        },
        suspectedRiskTags: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['disease', 'drug', 'emergency', 'poison', 'post_op', 'vomit_diarrhea', 'bleeding', 'neurological', 'respiratory', 'urinary_block', 'young_or_senior'],
          },
        },
        evidence: {
          type: 'array',
          description: '可选的补充证据列表；知识 Agent 还会自动尝试从内部科普知识库补充来源',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string', description: '来源名，如内部知识库、WSAVA、AAHA' },
              title: { type: 'string', description: '来源标题' },
              url: { type: 'string', description: '来源链接，可选' },
              evidenceType: { type: 'string', enum: ['internal_kb', 'guideline', 'association', 'hospital_reference'] },
              snippet: { type: 'string', description: '摘录或要点，可选' },
            },
            required: ['source', 'title', 'evidenceType'],
          },
        },
      },
      required: ['question', 'intent'],
    },
    async (args, ctx) => {
      // #当前问题作为知识检索事实源
      const question = ctx.currentUserQuestion?.trim() || String(args?.question || '');
      const profile = args?.petProfile && typeof args.petProfile === 'object' ? args.petProfile : null;
      const profileSpecies = typeof profile?.species === 'string' ? profile.species : undefined;
      const inferredSpecies = normalizeSpeciesScope(inferPrimarySpeciesScope(question));
      const result = await runKnowledgeAgent({
        question,
        intent: args?.intent === 'high_risk_knowledge' ? 'high_risk_knowledge' : 'knowledge',
        petProfile: profile ? {
          species: profileSpecies || inferredSpecies || undefined,
          breed: typeof profile.breed === 'string' ? profile.breed : undefined,
          ageMonths: typeof profile.ageMonths === 'number' ? profile.ageMonths : undefined,
          sex: typeof profile.sex === 'string' ? profile.sex : undefined,
          weightKg: typeof profile.weightKg === 'number' ? profile.weightKg : undefined,
          notes: typeof profile.notes === 'string' ? profile.notes : undefined,
        } : undefined,
        conversationContext: [],
        suspectedRiskTags: [],
        evidence: Array.isArray(args?.evidence) ? args.evidence.map((item: any) => ({
          source: String(item?.source || ''),
          title: String(item?.title || ''),
          url: item?.url ? String(item.url) : undefined,
          evidenceType: item?.evidenceType,
          snippet: item?.snippet ? String(item.snippet) : undefined,
        })) : [],
      });
      return buildKnowledgeToolPayload(result);
    },
  ),
  defineTool(
    'create_order',
    '为当前用户创建【待支付】订单（不扣款，付款由用户在结算页确认）。仅当用户明确要下单时调用。',
    {
      type: 'object',
      properties: { productIds: { type: 'array', items: { type: 'string' } } },
      required: ['productIds'],
    },
    async (args, ctx) => store.createOrder(ctx.userId, args?.productIds || []),
  ),
  defineTool(
    'present_recommendation',
    '【最终输出工具】当你准备好回复用户时，必须调用它来输出（不要把回复直接写成文字或 JSON）。reply 是给用户的话；proposals 是商品方案（纯咨询/还在收集资料时传空数组 []）。',
    {
      type: 'object',
      properties: {
        reply: { type: 'string', description: '给用户的简短口语回复（80字内）' },
        proposals: {
          type: 'array',
          description: '0~3 个方案；购物类问题给 2~3 个（经济→周全）',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: '方案名' },
              badge: { type: 'string', description: '一句话标签' },
              productIds: { type: 'array', items: { type: 'string' }, description: '来自 search_products 的真实商品 id' },
              reason: { type: 'string', description: '结合宠物特点的理由（60字内）' },
            },
            required: ['title', 'productIds', 'reason'],
          },
        },
      },
      required: ['reply'],
    },
    async (args) => ({ ok: true, reply: args?.reply || '', proposals: args?.proposals || [] }),
  ),
];

// #主Agent可调用工具定义
export const toolDefs = registeredTools.map((tool) => tool.definition);

const toolHandlerMap = new Map(registeredTools.map((tool) => [tool.name, tool.handler] as const));

// #工具实际执行入口
export async function runTool(name: string, args: any, ctx: ToolContext): Promise<unknown> {
  const handler = toolHandlerMap.get(name);
  if (!handler) return { error: `未知工具: ${name}` };
  return handler(args, ctx);
}

// #社区帖子记录标准化
function normalizeCommunityPostRecords(
  posts: Awaited<ReturnType<typeof store.listPosts>>,
): CommunityPostRecord[] {
  return posts.map((post: any) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    topic: post.topic,
    petName: post.petName,
    author: post.author,
    likeCount: post.likeCount,
    createdAt: post.createdAt,
  }));
}

// #社区搜索结果标准化
function normalizeCommunitySearchResultItems(posts: any[]): CommunitySearchResultItem[] {
  return posts
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      title: typeof item.title === 'string' ? item.title : '',
      excerpt: typeof item.excerpt === 'string' ? item.excerpt : '',
      topic: typeof item.topic === 'string' ? item.topic : '',
      author: typeof item.author === 'string' ? item.author : '',
      likeCount: typeof item.likeCount === 'number' ? item.likeCount : 0,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      matchReasons: Array.isArray(item.matchReasons) ? item.matchReasons.map(String) : [],
    }))
    .filter((item) => item.id && item.title);
}

// #导购商品候选标准化
function normalizeGuidanceProducts(products: any[]) {
  return products
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : '',
      name: typeof item.name === 'string' ? item.name : '',
      pet: typeof item.pet === 'string' ? item.pet : undefined,
      price: typeof item.price === 'number' ? item.price : undefined,
      rating: typeof item.rating === 'number' ? item.rating : undefined,
      sub: typeof item.sub === 'string' ? item.sub : undefined,
      badges: Array.isArray(item.badges) ? item.badges.map(String) : [],
      stock: typeof item.stock === 'number' ? item.stock : undefined,
      inStock: typeof item.inStock === 'boolean' ? item.inStock : undefined,
    }))
    .filter((item) => item.id && item.name);
}

// #订单条目解析
function parseOrderItems(raw: string): Array<{ id?: string; name?: string; price?: number }> {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : undefined,
        name: typeof item.name === 'string' ? item.name : undefined,
        price: typeof item.price === 'number' ? item.price : undefined,
      }));
  } catch {
    return [];
  }
}

// #返回条数限制
function clampLimit(value: unknown, defaultValue: number, maxValue: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return defaultValue;
  const normalized = Math.floor(value);
  if (normalized <= 0) return defaultValue;
  return Math.min(normalized, maxValue);
}
