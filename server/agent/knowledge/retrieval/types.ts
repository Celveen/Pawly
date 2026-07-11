import type { KnowledgeEvidence, KnowledgeRetrievalQuery } from '../types';

// #知识检索器接口
export interface KnowledgeRetriever {
  name: string;
  retrieve(query: KnowledgeRetrievalQuery): Promise<KnowledgeEvidence[]>;
}
