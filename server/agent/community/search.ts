import { inferSpeciesScopesFromText, inferTopicScopesFromText, normalizeSpeciesScope } from '../knowledge/taxonomy';
import type {
  CommunityPostRecord,
  CommunitySearchInput,
  CommunitySearchResultItem,
  RankedCommunityPost,
} from './types';

// #社区帖子搜索执行
export function searchCommunityPosts(
  posts: CommunityPostRecord[],
  input: CommunitySearchInput,
): { query: string; matchedCount: number; posts: CommunitySearchResultItem[] } {
  const petSpecies = normalizeSpeciesScope(input.petSpecies);
  const ranked = rankCommunityPosts(posts, {
    query: input.query,
    petSpecies,
    topicScope: input.topicScope?.trim().toLowerCase() || '',
  });
  const limit = clampLimit(input.limit, 3, 5);

  return {
    query: input.query,
    matchedCount: ranked.length,
    posts: ranked.slice(0, limit).map((item) => item.post),
  };
}

// #社区帖子排序
export function rankCommunityPosts(
  posts: CommunityPostRecord[],
  opts: { query: string; petSpecies: string | null; topicScope: string },
): RankedCommunityPost[] {
  const query = opts.query.trim();
  const queryTopics = inferTopicScopesFromText(query);
  const targetTopic = opts.topicScope || queryTopics[0] || '';

  return posts
    .map((post) => {
      const haystack = [post.title, post.content, post.topic, post.petName || ''].join(' ');
      let score = 0;
      const matchReasons: string[] = [];

      if (query && haystack.includes(query)) {
        score += 3;
        matchReasons.push('标题或正文直接命中查询词');
      }

      if (opts.petSpecies) {
        const postSpecies = inferSpeciesScopesFromText(haystack);
        if (postSpecies.includes(opts.petSpecies)) {
          score += 2;
          matchReasons.push(`命中相同物种：${opts.petSpecies}`);
        }
      }

      if (targetTopic) {
        const postTopics = inferTopicScopesFromText(haystack);
        if (postTopics.includes(targetTopic)) {
          score += 2;
          matchReasons.push(`命中相同主题：${targetTopic}`);
        }
      }

      if (post.topic === '求助') score += 1;
      if (post.likeCount > 0) score += Math.min(post.likeCount, 3) * 0.2;

      return {
        score,
        post: {
          id: post.id,
          title: post.title,
          excerpt: post.content.slice(0, 120),
          topic: post.topic,
          author: post.author,
          likeCount: post.likeCount,
          createdAt: post.createdAt,
          matchReasons,
        },
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

// #返回条数限制
function clampLimit(value: unknown, defaultValue: number, maxValue: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return defaultValue;
  const normalized = Math.floor(value);
  if (normalized <= 0) return defaultValue;
  return Math.min(normalized, maxValue);
}
