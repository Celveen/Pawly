import { ARTICLES, ARTICLE_CATS } from '@/components/data';
import {
  extractBreedScopes,
  filterTopicDomainsBySpecies,
  inferBreedScopesFromText,
  inferPrimarySpeciesScope,
  inferPrimaryTopicScope,
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
import type { KnowledgeEvidence, KnowledgeRetrievalQuery, KnowledgeTopicDomainScope, KnowledgeTopicScope } from '../types';
import type { KnowledgeRetriever } from './types';

// #内部科普文章结构
type Article = {
  id: string;
  cat: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  body: string[];
};

type SpeciesScope = string;

// #科普分类名称映射
const articleCategoryName = new Map<string, string>(
  ARTICLE_CATS.filter((item: { id: string }) => item.id !== 'all').map((item: { id: string; name: string }) => [item.id, item.name]),
);

// #内部文章中文检索分词
function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim();

  const parts = normalized
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const tokens = new Set<string>();

  for (const part of parts) {
    if (part.length >= 2) tokens.add(part);

    // 中文检索：给连续汉字切出 2~4 字短片段，适配“呕吐一天怎么办”“一天喂几次”这类问法
    if (/^[\p{Script=Han}]+$/u.test(part)) {
      for (let size = 2; size <= Math.min(4, part.length); size++) {
        for (let i = 0; i <= part.length - size; i++) {
          tokens.add(part.slice(i, i + size));
        }
      }
    }
  }

  return Array.from(tokens);
}

// #关键词命中评分
function scoreText(text: string, keywords: string[]): number {
  let score = 0;
  for (const keyword of keywords) {
    if (!keyword) continue;
    if (text.includes(keyword)) score += keyword.length >= 4 ? 3 : keyword.length >= 2 ? 2 : 1;
  }
  return score;
}

// #内部文章证据构造
function buildEvidence(article: Article, snippet: string): KnowledgeEvidence {
  const speciesScope = inferArticleSpeciesScope(article);
  const topicScope = inferArticleTopicScope(article);
  const topicDomainScopes = inferArticleTopicDomainScopes(article);
  const breedScopes = inferArticleBreedScopes(article);
  return {
    source: 'Pawly 科普',
    title: article.title,
    evidenceType: 'internal_kb',
    snippet,
    metadata: {
      articleId: article.id,
      articleCategory: articleCategoryName.get(article.cat) || article.cat,
      articleAuthor: article.author,
      articleDate: article.date,
      speciesScope,
      breedScopes: breedScopes.join('|') || null,
      topicScope,
      topicDomainScopes: topicDomainScopes.join('|') || null,
    },
  };
}

// #内部科普知识检索器
export const internalArticleRetriever: KnowledgeRetriever = {
  name: 'internal_articles',

  async retrieve(query: KnowledgeRetrievalQuery): Promise<KnowledgeEvidence[]> {
    const mergedQuery = [
      query.question,
      query.petProfile?.species || '',
      query.petProfile?.breed || '',
    ].join(' ');

    const keywords = tokenize(mergedQuery);
    if (!keywords.length) return [];

    const targetSpecies = normalizeSpeciesScope(query.petProfile?.species);
    const targetBreeds = resolveBreedContext(query.petProfile?.breed, query.petProfile?.species).matchedBreedScopes;
    const targetTopics = inferQueryTopicScopes(query);
    const targetTopicDomains = inferQueryTopicDomains(query, targetTopics);

    const ranked = (ARTICLES as Article[])
      .map((article) => {
        const articleSpecies = inferArticleSpeciesScope(article);
        if (!isSpeciesCompatible(articleSpecies, targetSpecies)) {
          return null;
        }

        const articleTopics = inferArticleTopicScopes(article);
        const articleTopicDomains = inferArticleTopicDomainScopes(article);
        if (!isTopicCompatible(articleTopics, articleTopicDomains, targetTopics, targetTopicDomains)) {
          return null;
        }

        const articleBreedScopes = inferArticleBreedScopes(article);
        if (!isBreedCompatible(articleBreedScopes, targetBreeds)) {
          return null;
        }

        const title = article.title.toLowerCase();
        const excerpt = article.excerpt.toLowerCase();
        const body = article.body.join('\n').toLowerCase();
        let score = scoreText(title, keywords) * 3 + scoreText(excerpt, keywords) * 2 + scoreText(body, keywords);
        if (targetSpecies && articleSpecies === targetSpecies) score += 8;
        if (targetBreeds.length && articleBreedScopes.length) {
          const breedMatches = articleBreedScopes.filter((scope) => targetBreeds.includes(scope)).length;
          score += breedMatches * 3;
        }
        score += scoreTopicCompatibility(articleTopics, articleTopicDomains, targetTopics, targetTopicDomains);
        if (articleSpecies === 'generic') score += 1;
        if (articleTopics.includes('generic')) score += 1;
        if (score === 0) return null;

        const matchedParagraph = article.body.find((paragraph) => scoreText(paragraph.toLowerCase(), keywords) > 0);
        const cautionParagraph = article.body.find((paragraph) => /建议就医|建议.*医院|尽快就医|尽快.*医院/u.test(paragraph));
        const snippet = buildEvidenceSnippet(article, matchedParagraph, cautionParagraph);

        return { article, score, snippet };
      })
      .filter(Boolean)
      .sort((a, b) => (b as { score: number }).score - (a as { score: number }).score)
      .slice(0, query.limit || 3) as Array<{ article: Article; score: number; snippet: string }>;

    return ranked.map(({ article, snippet }) => buildEvidence(article, snippet));
  },
};

// #内部文章证据摘录组合
function buildEvidenceSnippet(article: Article, matchedParagraph?: string, cautionParagraph?: string): string {
  const parts = [article.excerpt, matchedParagraph, cautionParagraph, article.body[0], article.title]
    .filter((part): part is string => Boolean(part?.trim()));
  return Array.from(new Set(parts)).join(' ');
}

// #文章物种范围推断
function inferArticleSpeciesScope(article: Article): SpeciesScope {
  return inferPrimarySpeciesScope(article.title, [article.title, article.excerpt].join('\n'), article.body.join('\n'));
}

// #文章品种范围推断
function inferArticleBreedScopes(article: Article): string[] {
  // #文章品种范围仅由标题摘要决定
  return inferBreedScopesFromText([article.title, article.excerpt].join('\n'));
}

// #文章主题主范围推断
function inferArticleTopicScope(article: Article): KnowledgeTopicScope {
  return inferPrimaryTopicScope(article.title, [article.title, article.excerpt].join('\n'), article.body.join('\n'));
}

// #文章主题范围推断
function inferArticleTopicScopes(article: Article): KnowledgeTopicScope[] {
  const scopes = inferTopicScopesFromText([article.title, article.excerpt, ...article.body].join('\n'));
  return scopes.length ? scopes : ['generic'];
}

// #文章主题域范围推断
function inferArticleTopicDomainScopes(article: Article): KnowledgeTopicDomainScope[] {
  const fromText = inferTopicDomainScopesFromText([article.title, article.excerpt, ...article.body].join('\n'));
  const fromTopics = inferTopicDomainScopesFromTopics(inferArticleTopicScopes(article));
  return normalizeScopeList([...fromText, ...fromTopics]);
}

// #查询主题范围推断
function inferQueryTopicScopes(query: KnowledgeRetrievalQuery): KnowledgeTopicScope[] {
  return inferTopicScopesFromText(query.question);
}

// #查询主题域范围推断
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
