import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeSheet, type GradeOptions } from '../../server-lib/exam/grading.js';
import type { ExamSubject, OptionKey, PoolItem, ResponseSheet } from '../../server-lib/exam/types.js';

function item(id: string, subject: ExamSubject, key: OptionKey): PoolItem {
  return {
    id,
    year: 2019,
    subject,
    format: 'single',
    stem: 'S',
    options: ['a', 'b', 'c', 'd'],
    key,
    explanation: '',
  };
}

test('grades the reference sheet', () => {
  const items: PoolItem[] = [
    item('q1', 'Economy', 'A'),
    item('q2', 'Economy', 'B'),
    item('q3', 'Polity', 'C'),
    item('q4', 'History', 'D'),
    item('q5', 'Geography', 'A'),
    item('q6', 'Environment', 'B'),
  ];

  const sheet: ResponseSheet = {
    v: 1,
    rules: 'exam_day',
    bubbles: { q1: ['A'], q2: ['C'], q4: ['A', 'D'], q5: ['A'] },
    circled: { q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'B' },
    struck: { q2: ['A', 'D'], q5: ['C'] },
    confidence: { q1: 'sure', q2: 'fifty', q3: 'guess', q5: 'fifty' },
    flagged: { q6: true },
    events: [
      { t: 0, q: 'q1', e: 'visit' },
      { t: 100, q: 'q1', e: 'bubble', v: 'A' },
      { t: 300, q: 'q2', e: 'visit' },
      { t: 400, q: 'q2', e: 'bubble', v: 'C' },
      { t: 450, q: 'q3', e: 'visit' },
      { t: 480, q: 'q4', e: 'visit' },
      { t: 500, q: 'q4', e: 'bubble', v: 'A' },
      { t: 700, q: 'q4', e: 'double', v: 'D' },
      { t: 900, q: 'q5', e: 'visit' },
      { t: 1000, q: 'q5', e: 'bubble', v: 'A' },
      { t: 1300, q: 'q6', e: 'visit' },
    ],
    away: [
      { from: 600, to: 660 },
      { from: 1000, to: 1030 },
    ],
    clientUpdatedAt: 0,
  };

  const opts: GradeOptions = {
    attemptId: 'att-1',
    paperCode: 'GS1_SECTION',
    rules: 'exam_day',
    durationSeconds: 1800,
    startedAtMs: 1700000000000,
    submittedAtMs: 1700001500000,
    submitMode: 'manual',
  };

  const result = gradeSheet(items, sheet, opts);

  assert.strictEqual(result.correct, 2);
  assert.strictEqual(result.wrong, 1);
  assert.strictEqual(result.invalid, 1);
  assert.strictEqual(result.blank, 2);
  assert.strictEqual(result.grossHundredths, 400);
  assert.strictEqual(result.penaltyHundredths, 132);
  assert.strictEqual(result.netHundredths, 268);
  assert.strictEqual(result.maxHundredths, 1200);
  assert.strictEqual(result.questionCount, 6);

  assert.deepStrictEqual(
    result.items.map((i) => i.verdict),
    ['correct', 'wrong', 'blank', 'invalid', 'correct', 'blank']
  );
  assert.deepStrictEqual(
    result.items.map((i) => i.marksHundredths),
    [200, -66, 0, -66, 200, 0]
  );

  assert.deepStrictEqual(result.items[3].bubbled, ['A', 'D']);
  assert.deepStrictEqual(result.items[1].struck, ['A', 'D']);
  assert.strictEqual(result.items[2].circled, 'C');
  assert.strictEqual(result.items[5].flagged, true);
  assert.strictEqual(result.items[4].confidence, 'fifty');

  assert.deepStrictEqual(
    result.items.map((i) => i.dwellSeconds),
    [300, 150, 30, 420, 400, 200]
  );

  assert.deepStrictEqual(result.bySubject, {
    Economy: { total: 2, attempted: 2, correct: 1, wrong: 1, netHundredths: 134 },
    Polity: { total: 1, attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    History: { total: 1, attempted: 1, correct: 0, wrong: 1, netHundredths: -66 },
    Geography: { total: 1, attempted: 1, correct: 1, wrong: 0, netHundredths: 200 },
    Environment: { total: 1, attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
  });

  assert.deepStrictEqual(result.byConfidence, {
    sure: { attempted: 1, correct: 1, wrong: 0, netHundredths: 200 },
    fifty: { attempted: 2, correct: 1, wrong: 1, netHundredths: 134 },
    guess: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    untagged: { attempted: 1, correct: 0, wrong: 1, netHundredths: -66 },
  });

  assert.deepStrictEqual(result.byStruckCount, {
    '0': { attempted: 2, correct: 1, wrong: 1, netHundredths: 134 },
    '1': { attempted: 1, correct: 1, wrong: 0, netHundredths: 200 },
    '2': { attempted: 1, correct: 0, wrong: 1, netHundredths: -66 },
    '3': { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
  });

  assert.deepStrictEqual(result.discipline, {
    circledNotBubbled: 1,
    circledNotBubbledCorrect: 1,
    changedAtTransfer: 2,
    changedRightToWrong: 1,
    changedWrongToRight: 1,
  });

  assert.deepStrictEqual(result.pace, [
    { minute: 0, bubbled: 0 },
    { minute: 5, bubbled: 1 },
    { minute: 10, bubbled: 3 },
    { minute: 15, bubbled: 3 },
    { minute: 20, bubbled: 4 },
    { minute: 25, bubbled: 4 },
    { minute: 30, bubbled: 4 },
  ]);

  assert.strictEqual(result.timeUsedSeconds, 1500);
  assert.strictEqual(result.awaySeconds, 90);
  assert.strictEqual(result.awayCount, 2);

  assert.strictEqual(result.startedAt, '2023-11-14T22:13:20.000Z');
  assert.strictEqual(result.submittedAt, '2023-11-14T22:38:20.000Z');
});

test('empty sheet scores zero', () => {
  const items: PoolItem[] = [
    item('q1', 'Economy', 'A'),
    item('q2', 'History', 'B'),
    item('q3', 'Polity', 'C'),
  ];

  const sheet: ResponseSheet = {
    v: 1,
    rules: 'exam_day',
    bubbles: {},
    circled: {},
    struck: {},
    confidence: {},
    flagged: {},
    events: [],
    away: [],
    clientUpdatedAt: 0,
  };

  const opts: GradeOptions = {
    attemptId: 'att-empty',
    paperCode: 'GS1_SECTION',
    rules: 'exam_day',
    durationSeconds: 1800,
    startedAtMs: 1700000000000,
    submittedAtMs: 1700000000000,
    submitMode: 'manual',
  };

  const result = gradeSheet(items, sheet, opts);

  assert.strictEqual(result.blank, 3);
  assert.strictEqual(result.netHundredths, 0);

  assert.deepStrictEqual(result.byConfidence, {
    sure: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    fifty: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    guess: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    untagged: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
  });

  assert.strictEqual(result.pace.length, 7);
  for (const p of result.pace) {
    assert.strictEqual(p.bubbled, 0);
  }

  assert.deepStrictEqual(result.discipline, {
    circledNotBubbled: 0,
    circledNotBubbledCorrect: 0,
    changedAtTransfer: 0,
    changedRightToWrong: 0,
    changedWrongToRight: 0,
  });

  for (const itemRes of result.items) {
    assert.strictEqual(itemRes.dwellSeconds, 0);
  }
});

test('ignores garbage and foreign ids', () => {
  const items: PoolItem[] = [item('q1', 'Economy', 'A')];

  const sheet = {
    v: 1,
    rules: 'exam_day',
    bubbles: { q1: ['A', 'A', 'Z'], qX: ['B'] },
    circled: {},
    struck: {},
    confidence: { q1: 'maybe' },
    flagged: {},
    events: [
      { t: 10, q: 'qX', e: 'bubble' },
      { t: Number.NaN, q: 'q1', e: 'bubble' },
      { t: 20, q: 'q1', e: 'bubble' },
    ],
    away: [],
    clientUpdatedAt: 0,
  } as unknown as ResponseSheet;

  const opts: GradeOptions = {
    attemptId: 'att-garbage',
    paperCode: 'GS1_SECTION',
    rules: 'exam_day',
    durationSeconds: 1800,
    startedAtMs: 1700000000000,
    submittedAtMs: 1700000600000,
    submitMode: 'manual',
  };

  const result = gradeSheet(items, sheet, opts);

  assert.strictEqual(result.items[0].verdict, 'correct');
  assert.deepStrictEqual(result.items[0].bubbled, ['A']);
  assert.strictEqual(result.items[0].confidence, null);
  assert.strictEqual(result.pace[0].bubbled, 0);
  assert.deepStrictEqual(result.pace[1], { minute: 5, bubbled: 1 });
});

test('clamps time used and away spans', () => {
  const items: PoolItem[] = [item('q1', 'Economy', 'A')];

  const sheet: ResponseSheet = {
    v: 1,
    rules: 'exam_day',
    bubbles: {},
    circled: {},
    struck: {},
    confidence: {},
    flagged: {},
    events: [],
    away: [
      { from: 1700, to: 4000 },
      { from: 50, to: 50 },
      { from: -20, to: 10 },
    ],
    clientUpdatedAt: 0,
  };

  const opts: GradeOptions = {
    attemptId: 'att-clamp',
    paperCode: 'GS1_SECTION',
    rules: 'exam_day',
    durationSeconds: 1800,
    startedAtMs: 1700000000000,
    submittedAtMs: 1700005000000,
    submitMode: 'manual',
  };

  const result = gradeSheet(items, sheet, opts);

  assert.strictEqual(result.timeUsedSeconds, 1800);
  assert.strictEqual(result.awaySeconds, 110);
  assert.strictEqual(result.awayCount, 2);
});

test('erase removes a bubble from pace', () => {
  const items: PoolItem[] = [item('q1', 'Economy', 'A')];

  const sheet: ResponseSheet = {
    v: 1,
    rules: 'exam_day',
    bubbles: {},
    circled: {},
    struck: {},
    confidence: {},
    flagged: {},
    events: [
      { t: 10, q: 'q1', e: 'bubble' },
      { t: 400, q: 'q1', e: 'erase' },
    ],
    away: [],
    clientUpdatedAt: 0,
  };

  const opts: GradeOptions = {
    attemptId: 'att-erase',
    paperCode: 'GS1_SECTION',
    rules: 'exam_day',
    durationSeconds: 1800,
    startedAtMs: 1700000000000,
    submittedAtMs: 1700001800000,
    submitMode: 'manual',
  };

  const result = gradeSheet(items, sheet, opts);

  assert.strictEqual(result.pace[1].bubbled, 1);
  assert.strictEqual(result.pace[2].bubbled, 0);
});
