import { BLUEPRINTS, PAPER_SPECS } from './papers.js';
import { EXAM_SUBJECTS } from './types.js';
import type { PaperCode, PoolItem, SectionSubject } from './types.js';

export class PaperUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaperUnavailableError';
  }
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface AssembleRequest {
  paperCode: PaperCode;
  subject?: SectionSubject;
  seenIds: ReadonlySet<string>;
  seed: number;
}

export function assemblePaper(pool: readonly PoolItem[], req: AssembleRequest): PoolItem[] {
  const spec = PAPER_SPECS[req.paperCode];
  if (!spec) {
    throw new PaperUnavailableError(`Unknown paper code: ${req.paperCode}`);
  }
  const N = spec.questionCount;
  const rand = mulberry32(req.seed);

  const unseenFirst = (list: readonly PoolItem[]): PoolItem[] => {
    const s = seededShuffle(list, rand);
    const unseen: PoolItem[] = [];
    const seen: PoolItem[] = [];
    for (const item of s) {
      if (req.seenIds.has(item.id)) {
        seen.push(item);
      } else {
        unseen.push(item);
      }
    }
    return unseen.concat(seen);
  };

  let picked: PoolItem[] = [];

  // Single-subject sectional
  if (req.paperCode === 'GS1_SECTION' && req.subject && req.subject !== 'Mixed') {
    const candidates = pool.filter((item) => item.subject === req.subject);
    if (candidates.length < N) {
      throw new PaperUnavailableError(`Not enough ${req.subject} questions for a sectional paper`);
    }
    picked = unseenFirst(candidates).slice(0, N);
  } else {
    // Blueprint
    const blueprint = BLUEPRINTS[req.paperCode];
    if (!blueprint) {
      throw new PaperUnavailableError(`No blueprint found for paper code: ${req.paperCode}`);
    }
    const remainder: PoolItem[] = [];
    let shortfall = 0;

    for (const subject of EXAM_SUBJECTS) {
      const quota = blueprint[subject] ?? 0;
      const subjectPool = pool.filter((item) => item.subject === subject);
      const ordered = unseenFirst(subjectPool);
      const takeCount = Math.min(quota, ordered.length);
      picked.push(...ordered.slice(0, takeCount));
      remainder.push(...ordered.slice(takeCount));
      shortfall += quota - takeCount;
    }

    if (shortfall > 0) {
      const fill = unseenFirst(remainder);
      if (fill.length < shortfall) {
        throw new PaperUnavailableError('Question pool too small for this paper');
      }
      picked.push(...fill.slice(0, shortfall));
    }
  }

  return seededShuffle(picked, rand);
}
