// #导购候选商品结构
export interface GuidanceProductCandidate {
  id: string;
  name: string;
  pet?: string;
  price?: number;
  rating?: number;
  sub?: string;
  badges?: string[];
  stock?: number;
  inStock?: boolean;
}

// #导购宠物画像
export interface GuidancePetProfile {
  species?: string;
  breed?: string;
  ageMonths?: number;
  weightKg?: number;
  notes?: string;
}

// #导购订单历史条目
export interface GuidanceOrderHistory {
  purchasedCategories?: string[];
  purchasedSpecies?: string[];
}

// #导购排序输入
export interface GuidanceRankingInput {
  query: string;
  petProfile?: GuidancePetProfile;
  orderHistory?: GuidanceOrderHistory;
  category?: string;
  maxPrice?: number;
  products: GuidanceProductCandidate[];
}

// #导购排序结果条目
export interface GuidanceRankedCandidate {
  id: string;
  score: number;
  reasonTags: string[];
  cautionTags: string[];
  metadata?: {
    targetSpecies?: string | null;
    targetBreedScopes?: string[];
    breedMatchMode?: string;
    requestedCategories?: string[];
    supportedCategories?: string[];
    appliedPolicyId?: string;
  };
}

// #导购排序输出
export interface GuidanceRankingResult {
  query: string;
  selectedIds: string[];
  rankedCandidates: GuidanceRankedCandidate[];
  summary: string;
  caution?: string;
  metadata?: {
    targetSpecies?: string;
    targetBreedScopes?: string[];
    breedMatchMode?: string;
    requestedCategories?: string[];
    supportedCategories?: string[];
    appliedPolicyId?: string;
  };
}
