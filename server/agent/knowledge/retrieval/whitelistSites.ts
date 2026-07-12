import {
  extractBreedScopes,
  filterTopicDomainsBySpecies,
  inferTopicDomainScopesFromText,
  inferTopicDomainScopesFromTopics,
  inferTopicScopesFromText,
  isBreedCompatible,
  isSpeciesCompatible,
  isTopicCompatible,
  normalizeScopeList,
  normalizeSpeciesScope,
  resolveBreedContext,
  scoreTopicCompatibility,
} from '../taxonomy';
import type { KnowledgeEvidence, KnowledgeTopicDomainScope, KnowledgeRetrievalQuery, KnowledgeTopicScope } from '../types';
import type { KnowledgeRetriever } from './types';
import { WHITELIST_KNOWLEDGE_SOURCES } from './whitelistRegistry';

// #白名单网站检索器
export const whitelistSiteRetriever: KnowledgeRetriever = {
  name: 'whitelist_sites',

  async retrieve(query: KnowledgeRetrievalQuery): Promise<KnowledgeEvidence[]> {
    const targetSpecies = normalizeSpeciesScope(query.petProfile?.species);
    const targetBreeds = resolveBreedContext(query.petProfile?.breed, query.petProfile?.species).matchedBreedScopes;
    const targetTopics = inferQueryTopicScopes(query);
    const targetTopicDomains = inferQueryTopicDomains(query, targetTopics);

    const ranked = WHITELIST_KNOWLEDGE_SOURCES
      .map((item) => {
        if (!isSpeciesCompatible(item.speciesScope, targetSpecies)) {
          return null;
        }

        if (!isBreedCompatible(item.breedScopes, targetBreeds)) {
          return null;
        }

        if (!isTopicCompatible(item.topicScopes, item.topicDomainScopes, targetTopics, targetTopicDomains)) {
          return null;
        }

        let score = 1;
        if (targetSpecies && item.speciesScope === targetSpecies) score += 4;
        const normalizedBreedScopes = normalizeScopeList(item.breedScopes);
        if (targetBreeds.length && normalizedBreedScopes.length) {
          const breedMatches = normalizedBreedScopes.filter((scope) => targetBreeds.includes(scope)).length;
          score += breedMatches * 2;
        }
        if (item.speciesScope === 'generic') score += 1;
        score += scoreTopicCompatibility(item.topicScopes, item.topicDomainScopes, targetTopics, targetTopicDomains);

        return {
          score,
          evidence: {
            source: item.source,
            title: item.title,
            url: item.url,
            evidenceType: item.evidenceType,
            snippet: item.snippet,
            metadata: {
              registryId: item.id,
              domain: item.domain,
              speciesScope: item.speciesScope,
              breedScopes: item.breedScopes?.join('|') || null,
              topicScope: item.topicScopes[0] || 'generic',
              topicDomainScopes: item.topicDomainScopes?.join('|') || null,
              retriever: 'whitelist_sites',
            },
          } satisfies KnowledgeEvidence,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b as { score: number }).score - (a as { score: number }).score)
      .slice(0, query.limit || 3) as Array<{ score: number; evidence: KnowledgeEvidence }>;

    return ranked.map((item) => item.evidence);
  },
};

// #白名单检索主题推断
function inferQueryTopicScopes(query: KnowledgeRetrievalQuery): KnowledgeTopicScope[] {
  return inferTopicScopesFromText(query.question);
}

// #白名单检索主题域推断
function inferQueryTopicDomains(
  query: KnowledgeRetrievalQuery,
  topicScopes: KnowledgeTopicScope[],
): KnowledgeTopicDomainScope[] {
  const fromText = inferTopicDomainScopesFromText(query.question);
  const fromTopics = inferTopicDomainScopesFromTopics(topicScopes);
  return filterTopicDomainsBySpecies(
    normalizeScopeList([...fromText, ...fromTopics]),
    query.petProfile?.species,
  );
}
