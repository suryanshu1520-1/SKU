import { classifyArticle, type ClassificationInput } from '../../src/lib/article-classification.js';
export type { CoverageScope } from '../../src/lib/article-classification.js';
/** Backwards-compatible entry point; browser, read projection and ingestion use the same evidence rules. */
export function determineCoverageScope(input: ClassificationInput) {
  return classifyArticle(input).coverage.scope;
}
