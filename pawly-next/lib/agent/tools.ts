// Agent 的工具集（function calling）
// 关键理念：数据不进上下文，藏在工具背后。Agent 想要什么就调工具按需取。
import { store } from '../db/store';
import { petSnapshot } from '../pets';

// 给模型看的工具定义（OpenAI/DeepSeek 兼容格式）
export const toolDefs = [
  {
    type: 'function',
    function: {
      name: 'get_pet_profile',
      description:
        '获取用户的宠物档案。年龄由出生日期【实时计算】，永远是最新的。返回里含 lifeStage(生命阶段) 和 weightStale(体重数据是否过期>60天) —— 若 weightStale 为 true，必须先询问用户体重是否有变化再做推荐。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '宠物名（如"糯米"）。不填则返回全部宠物。' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: '按条件检索在售商品（替代把整个商品库塞进上下文）。推荐前必须用它取真实商品，不要凭空捏造。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: '关键词，如"鲜粮""磨牙""化毛"' },
          species: { type: 'string', enum: ['狗', '猫'], description: '适用物种' },
          category: { type: 'string', description: '类目 id：food/snack/toy/wash/out/home/health' },
          maxPrice: { type: 'number', description: '价格上限' },
          inStockOnly: { type: 'boolean', description: '是否只看有货商品（推荐时建议 true）' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description: '为选定商品创建【待支付】订单（不扣款，付款由用户在结算页确认）。仅当用户明确要下单时调用。',
      parameters: {
        type: 'object',
        properties: {
          productIds: { type: 'array', items: { type: 'string' }, description: '商品 id 列表' },
        },
        required: ['productIds'],
      },
    },
  },
] as const;

// 工具的真实执行（服务端调业务数据层）
export async function runTool(name: string, args: any): Promise<unknown> {
  switch (name) {
    case 'get_pet_profile': {
      const pets = store.getPet(args?.name);
      return pets.map((p) => petSnapshot(p));
    }
    case 'search_products': {
      const list = store.searchProducts({
        keyword: args?.keyword,
        species: args?.species,
        category: args?.category,
        maxPrice: args?.maxPrice,
        inStockOnly: args?.inStockOnly,
      });
      // 只回精简字段，避免塞爆上下文
      return list.map((p) => ({
        id: p.id, name: p.name, pet: p.pet, price: p.price, was: p.was,
        rating: p.rating, sub: p.sub, badges: p.badges, stock: p.stock, inStock: p.stock > 0,
      }));
    }
    case 'create_order': {
      return store.createOrder(args?.productIds || []);
    }
    default:
      return { error: `未知工具: ${name}` };
  }
}
