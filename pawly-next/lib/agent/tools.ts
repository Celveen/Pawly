// Agent 的工具集（function calling），全部按"当前登录用户"隔离。
// 关键理念：数据不进上下文，藏在工具背后；Agent 既能【读】也能【收集】用户的个人数据。
import { store } from '../db/store';
import { petSnapshot, birthdayFromAgeMonths } from '../pets';

export interface ToolContext {
  userId: string;
}

export const toolDefs = [
  {
    type: 'function',
    function: {
      name: 'get_pet_profile',
      description:
        '读取【当前用户】的宠物档案。年龄由出生日期实时计算。返回里 weightStale=true 表示体重数据已过期(>60天)，需先确认。若返回空数组，说明该用户还没填过资料，应礼貌询问并用 upsert_pet 保存。',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: '宠物名，可选；不填返回该用户全部宠物' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upsert_pet',
      description:
        '保存/更新【当前用户】的宠物资料。当用户在对话中透露了宠物信息（品种、年龄、体重等），就主动调用它把数据收集存档，下次无需重复问。同名宠物会被更新。',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '宠物名（必填）' },
          species: { type: 'string', enum: ['狗', '猫'], description: '物种（必填）' },
          breed: { type: 'string', description: '品种，如"柴犬"' },
          sex: { type: 'string', enum: ['男', '女'] },
          ageMonths: { type: 'number', description: '当前月龄（会自动换算成出生日期存储，以后年龄自动增长）' },
          birthday: { type: 'string', description: '出生日期 YYYY-MM-DD（与 ageMonths 二选一，优先用它）' },
          weightKg: { type: 'number', description: '体重(kg)' },
          notes: { type: 'string', description: '特点/健康备注，如"肠胃敏感、爱啃咬"' },
        },
        required: ['name', 'species'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: '按条件检索在售商品（替代把整库塞进上下文）。推荐前必须用它取真实商品，建议 inStockOnly=true。',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          species: { type: 'string', enum: ['狗', '猫'] },
          category: { type: 'string', description: 'food/snack/toy/wash/out/home/health' },
          maxPrice: { type: 'number' },
          inStockOnly: { type: 'boolean' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description: '为当前用户创建【待支付】订单（不扣款，付款由用户在结算页确认）。仅当用户明确要下单时调用。',
      parameters: {
        type: 'object',
        properties: { productIds: { type: 'array', items: { type: 'string' } } },
        required: ['productIds'],
      },
    },
  },
] as const;

export async function runTool(name: string, args: any, ctx: ToolContext): Promise<unknown> {
  switch (name) {
    case 'get_pet_profile': {
      const pets = await store.getPet(ctx.userId, args?.name);
      return pets.map((p) => petSnapshot(p));
    }

    case 'upsert_pet': {
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
    }

    case 'search_products': {
      const list = await store.searchProducts({
        keyword: args?.keyword,
        species: args?.species,
        category: args?.category,
        maxPrice: args?.maxPrice,
        inStockOnly: args?.inStockOnly,
      });
      return list.map((p) => ({
        id: p.id, name: p.name, pet: p.pet, price: p.price, was: p.was,
        rating: p.rating, sub: p.sub, badges: p.badges, stock: p.stock, inStock: p.stock > 0,
      }));
    }

    case 'create_order': {
      return store.createOrder(ctx.userId, args?.productIds || []);
    }

    default:
      return { error: `未知工具: ${name}` };
  }
}
