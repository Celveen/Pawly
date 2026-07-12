import type { CommunitySummaryInput, CommunitySummaryResult } from './types';

// #社区结果摘要生成
export function summarizeCommunityPosts(input: CommunitySummaryInput): CommunitySummaryResult {
  const commonPatterns = collectCommonPatterns(input.posts);
  const petLabel = input.petSpecies?.trim() || '该宠物';
  const topicLabel = input.topicScope?.trim() || '当前问题';

  if (!input.posts.length) {
    return {
      summary: `社区里暂时没检索到和${petLabel}${topicLabel}直接相关的经验帖，先不要把“没人提到”理解成“没风险”。`,
      caution: '社区经验缺失不代表问题轻微；如果本身是知识或高风险问题，仍应优先看知识结论与就医建议。',
      commonPatterns: [],
      suggestedUse: 'reference_after_knowledge',
    };
  }

  const leadingTitles = input.posts.slice(0, 2).map((post) => `《${post.title}》`);
  const summary = commonPatterns.length
    ? `社区里和“${input.query}”接近的帖子，大家更常提到：${commonPatterns.join('；')}。较相关的帖子包括 ${leadingTitles.join('、')}。`
    : `社区里找到了几条和“${input.query}”接近的帖子，较相关的包括 ${leadingTitles.join('、')}。可以把这些当作经验参考，但别替代专业判断。`;

  return {
    summary,
    caution: '社区内容属于用户经验分享，只能作参考；如果涉及疾病、药物、急症、中毒或持续不适，优先采用知识 Agent 结论与线下兽医建议。',
    commonPatterns,
    suggestedUse: input.topicScope ? 'reference_after_knowledge' : 'reference_only',
  };
}

// #社区经验模式提取
function collectCommonPatterns(posts: CommunitySummaryInput['posts']): string[] {
  const patterns = new Set<string>();

  for (const post of posts) {
    const text = `${post.title} ${post.excerpt}`;
    if (/先观察|观察/.test(text)) patterns.add('很多人会先短时观察精神和食欲变化');
    if (/就医|医院|兽医|急诊/.test(text)) patterns.add('一旦持续恶化，大家普遍会建议尽快就医');
    if (/换粮|主粮|零食/.test(text)) patterns.add('有些帖子会把饮食变化当作排查线索');
    if (/误食|乱吃|异物/.test(text)) patterns.add('误食或异物被反复提到时，风险通常会被看得更重');
    if (/拉稀|腹泻|软便/.test(text)) patterns.add('不少人会同时关注是否伴随腹泻或软便');
    if (/吐|呕吐/.test(text)) patterns.add('大家会特别关注呕吐次数、颜色和是否喝水也吐');
    if (patterns.size >= 4) break;
  }

  return Array.from(patterns);
}
