// #社区帖子原始结构
export interface CommunityPostRecord {
  id: string;
  title: string;
  content: string;
  topic: string;
  petName?: string | null;
  author: string;
  likeCount: number;
  createdAt: Date;
}

// #社区帖子检索参数
export interface CommunitySearchInput {
  query: string;
  petSpecies?: string | null;
  topicScope?: string | null;
  communityTopic?: string | null;
  limit?: number;
}

// #社区帖子匹配结果
export interface CommunitySearchResultItem {
  id: string;
  title: string;
  excerpt: string;
  topic: string;
  author: string;
  likeCount: number;
  createdAt: Date;
  matchReasons: string[];
}

// #社区帖子排序结果
export interface RankedCommunityPost {
  score: number;
  post: CommunitySearchResultItem;
}

// #社区摘要输入结构
export interface CommunitySummaryInput {
  query: string;
  petSpecies?: string | null;
  topicScope?: string | null;
  posts: CommunitySearchResultItem[];
}

// #社区摘要输出结构
export interface CommunitySummaryResult {
  summary: string;
  caution: string;
  commonPatterns: string[];
  suggestedUse: 'reference_only' | 'reference_after_knowledge';
}
