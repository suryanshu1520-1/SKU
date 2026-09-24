import test from 'node:test';
import assert from 'node:assert/strict';
import { assemblePaper, mulberry32, PaperUnavailableError } from '../../server-lib/exam/assemble.js';
import { BLUEPRINTS, offeredSectionSubjects, toPaperItem } from '../../server-lib/exam/papers.js';
import { getPool, poolCountsBySubject } from '../../server-lib/exam/pool.js';
import type { ExamSubject, PoolItem } from '../../server-lib/exam/types.js';

function mk(subject: ExamSubject, count: number): PoolItem[] {
  const items: PoolItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `${subject}-${i}`,
      year: 2019,
      subject,
      format: 'single',
      stem: 'S',
      options: ['a', 'b', 'c', 'd'],
      key: 'A',
      explanation: '',
    });
  }
  return items;
}

const basePool: PoolItem[] = [
  ...mk('Economy', 40),
  ...mk('Environment', 30),
  ...mk('Geography', 25),
  ...mk('History', 15),
  ...mk('Polity', 8),
  ...mk('General Studies', 2),
];

test('1. mulberry32(1) yields exact sequence', () => {
  const rand = mulberry32(1);
  assert.strictEqual(rand(), 0.6270739405881613);
  assert.strictEqual(rand(), 0.002735721180215478);
  assert.strictEqual(rand(), 0.5274470399599522);
});

test('2. HALF from basePool, seed 7, no seen ids', () => {
  const res = assemblePaper(basePool, {
    paperCode: 'GS1_HALF',
    seenIds: new Set(),
    seed: 7,
  });
  assert.strictEqual(res.length, 50);
  const counts: Record<string, number> = {};
  for (const item of res) {
    counts[item.subject] = (counts[item.subject] ?? 0) + 1;
  }
  assert.deepStrictEqual(counts, {
    Economy: 17,
    Environment: 12,
    Geography: 10,
    History: 8,
    Polity: 2,
    'General Studies': 1,
  });
  assert.strictEqual(new Set(res.map((i) => i.id)).size, 50);
});

test('3. Same request twice produces identical order; different seed produces different order', () => {
  const res1 = assemblePaper(basePool, { paperCode: 'GS1_HALF', seenIds: new Set(), seed: 7 });
  const res2 = assemblePaper(basePool, { paperCode: 'GS1_HALF', seenIds: new Set(), seed: 7 });
  const res3 = assemblePaper(basePool, { paperCode: 'GS1_HALF', seenIds: new Set(), seed: 8 });

  assert.deepStrictEqual(res1.map((i) => i.id), res2.map((i) => i.id));
  assert.notDeepStrictEqual(res1.map((i) => i.id), res3.map((i) => i.id));
});

test('4. Seen ids prioritization', () => {
  const seenIds = new Set(Array.from({ length: 30 }, (_, i) => `Economy-${i}`));
  const res = assemblePaper(basePool, { paperCode: 'GS1_HALF', seenIds, seed: 7 });
  const eco = res.filter((item) => item.subject === 'Economy');
  assert.strictEqual(eco.length, 17);

  for (let i = 30; i < 40; i++) {
    assert.ok(eco.some((item) => item.id === `Economy-${i}`), `Expected Economy-${i} to be included`);
  }
  const seenCount = eco.filter((item) => seenIds.has(item.id)).length;
  assert.strictEqual(seenCount, 7);
});

test('5. basePool with Polity reduced to 1 item, shortfall spillover', () => {
  const reducedPool = basePool.filter((item) => item.subject !== 'Polity').concat(mk('Polity', 1));
  const res = assemblePaper(reducedPool, { paperCode: 'GS1_HALF', seenIds: new Set(), seed: 3 });
  assert.strictEqual(res.length, 50);
  assert.strictEqual(res.filter((i) => i.subject === 'Polity').length, 1);
  assert.strictEqual(new Set(res.map((i) => i.id)).size, 50);
  const poolIdSet = new Set(reducedPool.map((i) => i.id));
  assert.ok(res.every((i) => poolIdSet.has(i.id)));
});

test('6. Single-subject sectional History threshold', () => {
  const history15 = mk('History', 15);
  assert.throws(
    () => assemblePaper(history15, { paperCode: 'GS1_SECTION', subject: 'History', seenIds: new Set(), seed: 1 }),
    PaperUnavailableError
  );
  const history30 = mk('History', 30);
  const res = assemblePaper(history30, { paperCode: 'GS1_SECTION', subject: 'History', seenIds: new Set(), seed: 1 });
  assert.strictEqual(res.length, 25);
  assert.ok(res.every((i) => i.subject === 'History'));
});

test('7. Sectional Mixed from basePool', () => {
  const res = assemblePaper(basePool, { paperCode: 'GS1_SECTION', subject: 'Mixed', seenIds: new Set(), seed: 1 });
  assert.strictEqual(res.length, 25);
  const counts: Record<string, number> = {};
  for (const item of res) {
    counts[item.subject] = (counts[item.subject] ?? 0) + 1;
  }
  assert.deepStrictEqual(counts, {
    Economy: 9,
    Environment: 6,
    Geography: 5,
    History: 4,
    Polity: 1,
  });
  assert.strictEqual(counts['General Studies'], undefined);
});

test('8. Pool too small for FULL request throws PaperUnavailableError', () => {
  const pool20 = basePool.slice(0, 20);
  assert.throws(
    () => assemblePaper(pool20, { paperCode: 'GS1_FULL', seenIds: new Set(), seed: 1 }),
    PaperUnavailableError
  );
});

test('9. toPaperItem strips hidden fields and preserves structure', () => {
  const pItem = basePool[0];
  const result = toPaperItem(pItem, 3);
  assert.deepStrictEqual(Object.keys(result).sort(), ['format', 'n', 'options', 'qid', 'stem']);
  assert.strictEqual(result.n, 3);
  assert.notStrictEqual(result.options, pItem.options);
  assert.deepStrictEqual(result.options, pItem.options);
});

test('10. Against real pool', () => {
  const realPool = getPool();
  const counts = poolCountsBySubject();
  const offered = offeredSectionSubjects(counts);
  assert.deepStrictEqual(offered, ['Mixed', 'Economy', 'Environment', 'Geography', 'History']);

  const fullPaper = assemblePaper(realPool, { paperCode: 'GS1_FULL', seenIds: new Set(), seed: 1 });
  assert.strictEqual(fullPaper.length, 100);
  assert.strictEqual(new Set(fullPaper.map((i) => i.id)).size, 100);

  const fullCounts: Record<string, number> = {};
  for (const item of fullPaper) {
    fullCounts[item.subject] = (fullCounts[item.subject] ?? 0) + 1;
  }
  assert.deepStrictEqual(fullCounts, BLUEPRINTS.GS1_FULL);
});
