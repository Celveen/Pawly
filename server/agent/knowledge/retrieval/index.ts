import type { KnowledgeEvidence, KnowledgeRetrievalQuery } from '../types';
import { internalArticleRetriever } from './internalArticles';
import type { KnowledgeRetriever } from './types';
import { whitelistSiteRetriever } from './whitelistSites';

// #知识检索器注册表
const retrievers: KnowledgeRetriever[] = [
  internalArticleRetriever,
  whitelistSiteRetriever,
];

// #多路知识检索聚合入口
export async function retrieveKnowledgeEvidence(query: KnowledgeRetrievalQuery): Promise<KnowledgeEvidence[]> {
  const merged: KnowledgeEvidence[] = [];

  for (const retriever of retrievers) {
    const list = await retriever.retrieve(query);
    merged.push(...list);
  }

  const deduped = new Map<string, KnowledgeEvidence>();
  for (const item of merged) {
    const key = `${item.source}::${item.title}::${item.snippet || ''}`;
    if (!deduped.has(key)) deduped.set(key, item);
  }
  return Array.from(deduped.values());
}
