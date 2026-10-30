import { classifyArticle, type ClassificationInput } from './article-classification.js';

export type FeedScope = 'all' | 'india' | 'international' | 'cross_border';

export function matchesCoverageScope(article: ClassificationInput, scope: FeedScope): boolean {
  if (scope === 'all') return true;
  const actual = classifyArticle(article).coverage.scope;
  return scope === 'international' ? actual === 'international' || actual === 'cross_border' : actual === scope;
}

/** Classify before paginating: stale stored scopes must neither admit nor hide a story. */
export async function selectClassifiedPage<T extends ClassificationInput>(options: {
  fetchBatch: (offset: number, size: number) => Promise<T[]>;
  scope: FeedScope;
  offset: number;
  limit: number;
  countAll?: boolean;
  batchSize?: number;
}): Promise<{ items: T[]; hasMore: boolean; totalCount?: number }> {
  const { fetchBatch, scope, offset, limit, countAll = false, batchSize = 250 } = options;
  const matching: T[] = [];
  for (let cursor = 0; ; cursor += batchSize) {
    const batch = await fetchBatch(cursor, batchSize);
    matching.push(...batch.filter(article => matchesCoverageScope(article, scope)));
    const exhausted = batch.length < batchSize;
    if (exhausted || (!countAll && matching.length > offset + limit)) {
      return {
        items: matching.slice(offset, offset + limit), hasMore: matching.length > offset + limit,
        totalCount: exhausted ? matching.length : undefined,
      };
    }
  }
}
