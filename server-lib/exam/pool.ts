import { GS1_EXAM_POOL } from './data/gs1ExamPool.js';
import { EXAM_SUBJECTS } from './types.js';
import type { ExamSubject, PoolItem } from './types.js';

const BY_ID = new Map<string, PoolItem>(GS1_EXAM_POOL.map((item) => [item.id, item]));

export function getPool(): readonly PoolItem[] {
  return GS1_EXAM_POOL;
}

export function getPoolItem(id: string): PoolItem | undefined {
  return BY_ID.get(id);
}

export function poolCountsBySubject(): Record<ExamSubject, number> {
  const counts = Object.fromEntries(EXAM_SUBJECTS.map((s) => [s, 0])) as Record<ExamSubject, number>;
  for (const item of GS1_EXAM_POOL) counts[item.subject] += 1;
  return counts;
}
