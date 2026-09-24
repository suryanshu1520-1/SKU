import test from 'node:test';
import assert from 'node:assert/strict';
import { emptySheet, sanitizeSheet } from '../../server-lib/exam/sanitize.js';

const issued = ['q1', 'q2', 'q3'];

test('1. null raw yields emptySheet', () => {
  const res = sanitizeSheet(null, issued, 'exam_day', 1800);
  assert.deepStrictEqual(res, emptySheet('exam_day'));
});

test('2. rules argument always overrides raw.rules', () => {
  const res = sanitizeSheet({ rules: 'practice' }, issued, 'exam_day', 1800);
  assert.strictEqual(res.rules, 'exam_day');
});

test('3. cleans bubbles map', () => {
  const raw = {
    bubbles: {
      q1: ['C', 'A', 'A', 'Z', 'D'],
      qX: ['A'],
      q2: 'A',
      q3: [],
    },
  };
  const res = sanitizeSheet(raw, issued, 'exam_day', 1800);
  assert.deepStrictEqual(res.bubbles, { q1: ['A', 'C'] });
});

test('4. cleans circled, confidence, flagged, struck maps', () => {
  const raw = {
    circled: { q1: 'b', q2: 'B', qX: 'A' },
    confidence: { q1: 'sure', q2: 'maybe' },
    flagged: { q1: true, q2: 'yes', q3: 1 },
    struck: { q1: ['D', 'D', 'B'], q2: ['X'] },
  };
  const res = sanitizeSheet(raw, issued, 'exam_day', 1800);
  assert.deepStrictEqual(res.circled, { q2: 'B' });
  assert.deepStrictEqual(res.confidence, { q1: 'sure' });
  assert.deepStrictEqual(res.flagged, { q1: true });
  assert.deepStrictEqual(res.struck, { q1: ['B', 'D'] });
});

test('5. events filtering and capacity cap', () => {
  const rawEvents: any[] = [];
  for (let i = 0; i < 2100; i++) {
    rawEvents.push({ t: i % 1800, q: i % 2 ? 'q2' : 'q1', e: 'visit' });
  }
  for (let i = 0; i < 10; i++) {
    rawEvents.push({ t: 1000 + i, q: 'q3', e: 'bubble', v: 'A' });
  }
  rawEvents.push(
    { t: -1, q: 'q1', e: 'visit' },
    { t: NaN, q: 'q1', e: 'visit' },
    { t: 5, q: 'q1', e: 'hack' },
    { t: 5, q: 'qX', e: 'visit' },
    { t: 1921, q: 'q1', e: 'visit' }
  );

  const res = sanitizeSheet({ events: rawEvents }, issued, 'exam_day', 1800);
  assert.strictEqual(res.events.length, 2000);
  const bubbleEvents = res.events.filter((ev) => ev.e === 'bubble');
  assert.strictEqual(bubbleEvents.length, 10);
  assert.ok(res.events.every((ev) => ev.q !== 'qX'));
  assert.ok(res.events.every((ev) => (ev.e as string) !== 'hack'));
  assert.ok(res.events.every((ev) => ev.t >= 0 && ev.t <= 1920));
});

test('6. overlong event value v is stripped', () => {
  const res = sanitizeSheet(
    { events: [{ t: 3, q: 'q1', e: 'bubble', v: 'abcdefghi' }] },
    issued,
    'exam_day',
    1800
  );
  assert.strictEqual(res.events.length, 1);
  assert.strictEqual(res.events[0].q, 'q1');
  assert.strictEqual(res.events[0].e, 'bubble');
  assert.strictEqual(res.events[0].t, 3);
  assert.strictEqual('v' in res.events[0], false);
});

test('7. cleans away spans', () => {
  const raw = {
    away: [
      { from: 10, to: 20 },
      { from: 30, to: 10 },
      { from: -5, to: 3 },
      { from: 0, to: 99999 },
    ],
  };
  const res = sanitizeSheet(raw, issued, 'exam_day', 1800);
  assert.deepStrictEqual(res.away, [{ from: 10, to: 20 }]);
});

test('8. prototype pollution safety', () => {
  const pollutedJson = '{"bubbles":{"__proto__":{"polluted":["A"]}},"circled":{"__proto__":"A"}}';
  const raw = JSON.parse(pollutedJson);
  const res = sanitizeSheet(raw, issued, 'exam_day', 1800);

  assert.deepStrictEqual(res.bubbles, {});
  assert.deepStrictEqual(res.circled, {});
  assert.strictEqual(({} as any).polluted, undefined);
});
