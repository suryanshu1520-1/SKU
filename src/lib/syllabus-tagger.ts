import { classifyArticle, type ClassificationInput } from './article-classification.js';
export interface ArticleSyllabusTag { paper: string; topic: string; badge: string; }
/** Compatibility adapter. Missing evidence produces no invented syllabus badge. */
export function deriveArticleSyllabusTag(input: ClassificationInput): ArticleSyllabusTag | null {
  const subject = classifyArticle(input).primary;
  return subject ? { paper: subject.paper, topic: subject.topic, badge: `${subject.paper} · ${subject.topic}` } : null;
}
