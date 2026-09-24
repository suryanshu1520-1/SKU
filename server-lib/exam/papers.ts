import { EXAM_SUBJECTS } from './types.js';
import type { ExamSubject, PaperCode, PaperItem, PaperSpec, PoolItem, SectionSubject } from './types.js';

export const PAPER_SPECS: Record<PaperCode, PaperSpec> = {
  GS1_FULL:    { code: 'GS1_FULL',    title: 'General Studies Paper I · Full paper', questionCount: 100, durationSeconds: 7200 },
  GS1_HALF:    { code: 'GS1_HALF',    title: 'General Studies Paper I · Half paper', questionCount: 50,  durationSeconds: 3600 },
  GS1_SECTION: { code: 'GS1_SECTION', title: 'General Studies Paper I · Sectional',  questionCount: 25,  durationSeconds: 1800 },
};

/** Tark v1 composition, constrained by the pool (blueprint §3.1). Each row sums to questionCount. */
export const BLUEPRINTS: Record<PaperCode, Record<ExamSubject, number>> = {
  GS1_FULL:    { Economy: 34, Environment: 24, Geography: 21, History: 15, Polity: 5, 'General Studies': 1 },
  GS1_HALF:    { Economy: 17, Environment: 12, Geography: 10, History: 8,  Polity: 2, 'General Studies': 1 },
  GS1_SECTION: { Economy: 9,  Environment: 6,  Geography: 5,  History: 4,  Polity: 1, 'General Studies': 0 },
};

export const SECTION_SUBJECT_MIN_POOL = 50;
export const PAPER_CODES: readonly PaperCode[] = ['GS1_FULL', 'GS1_HALF', 'GS1_SECTION'];

/** 'Mixed' first, then every subject whose pool count is >= SECTION_SUBJECT_MIN_POOL, in EXAM_SUBJECTS order. */
export function offeredSectionSubjects(counts: Record<ExamSubject, number>): SectionSubject[] {
  const result: SectionSubject[] = ['Mixed'];
  for (const subject of EXAM_SUBJECTS) {
    if ((counts[subject] ?? 0) >= SECTION_SUBJECT_MIN_POOL) {
      result.push(subject);
    }
  }
  return result;
}

/** Builds a fresh object with exactly: qid, n, format, stem, options (a copied array). Never spread the PoolItem. */
export function toPaperItem(item: PoolItem, n: number): PaperItem {
  return {
    qid: item.id,
    n,
    format: item.format,
    stem: item.stem,
    options: item.options.slice() as [string, string, string, string],
  };
}
