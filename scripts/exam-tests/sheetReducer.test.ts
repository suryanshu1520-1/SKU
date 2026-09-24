import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initSheetState,
  sheetReducer,
  tallies,
  type SheetState,
} from '../../src/components/exam/lib/sheetReducer.js';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze((obj as any)[key]);
  }
  return obj;
}

function nextState(state: SheetState, action: any): SheetState {
  deepFreeze(state);
  return sheetReducer(state, action);
}

test('1. E: CHOOSE toggles circled and emits circle / uncircle', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'CHOOSE', qid: 'q1', key: 'A', t: 5, now: 1000 });
  assert.strictEqual(s.sheet.circled.q1, 'A');
  assert.deepStrictEqual(s.sheet.events.at(-1), { t: 5, q: 'q1', e: 'circle', v: 'A' });
  assert.strictEqual(s.sheet.clientUpdatedAt, 1000);

  s = nextState(s, { type: 'CHOOSE', qid: 'q1', key: 'A', t: 10, now: 2000 });
  assert.strictEqual(s.sheet.circled.q1, undefined);
  assert.strictEqual(s.sheet.events.at(-1)?.e, 'uncircle');
});

test('2. E: BUBBLE sets bubble; identical bubble returns same state', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'BUBBLE', qid: 'q1', key: 'A', t: 1, now: 1000 });
  assert.deepStrictEqual(s.sheet.bubbles.q1, ['A']);

  const unchanged = nextState(s, { type: 'BUBBLE', qid: 'q1', key: 'A', t: 2, now: 2000 });
  assert.strictEqual(unchanged, s);
});

test('3. E grace: BUBBLE within grace window replaces bubble', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'BUBBLE', qid: 'q1', key: 'A', t: 1, now: 1000 });
  s = nextState(s, { type: 'BUBBLE', qid: 'q1', key: 'C', t: 4, now: 4000 });
  assert.deepStrictEqual(s.sheet.bubbles.q1, ['C']);
  const evs = s.sheet.events.slice(-2);
  assert.deepStrictEqual(evs[0], { t: 4, q: 'q1', e: 'erase', v: 'A' });
  assert.deepStrictEqual(evs[1], { t: 4, q: 'q1', e: 'bubble', v: 'C' });
});

test('4. E after grace: BUBBLE triggers pendingDouble then CONFIRM_DOUBLE', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'BUBBLE', qid: 'q1', key: 'A', t: 1, now: 1000 });
  s = nextState(s, { type: 'BUBBLE', qid: 'q1', key: 'C', t: 7, now: 7000 });
  assert.deepStrictEqual(s.pendingDouble, { qid: 'q1', key: 'C' });
  assert.deepStrictEqual(s.sheet.bubbles.q1, ['A']);

  s = nextState(s, { type: 'CONFIRM_DOUBLE', t: 8, now: 8000 });
  assert.deepStrictEqual(s.sheet.bubbles.q1, ['A', 'C']);
  assert.strictEqual(s.pendingDouble, null);
  assert.deepStrictEqual(s.sheet.events.at(-1), { t: 8, q: 'q1', e: 'double', v: 'C' });
});

test('5. E: CANCEL_DOUBLE clears pending without changing sheet', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'BUBBLE', qid: 'q1', key: 'A', t: 1, now: 1000 });
  s = nextState(s, { type: 'BUBBLE', qid: 'q1', key: 'C', t: 7, now: 7000 });
  const beforeUpdated = s.sheet.clientUpdatedAt;

  s = nextState(s, { type: 'CANCEL_DOUBLE' });
  assert.strictEqual(s.pendingDouble, null);
  assert.deepStrictEqual(s.sheet.bubbles.q1, ['A']);
  assert.strictEqual(s.sheet.clientUpdatedAt, beforeUpdated);
});

test('6. E UNDO: within grace erases row; after grace leaves unchanged', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'BUBBLE', qid: 'q1', key: 'A', t: 1, now: 1000 });
  const s2 = nextState(s, { type: 'UNDO', qid: 'q1', t: 3, now: 3000 });
  assert.strictEqual(s2.sheet.bubbles.q1, undefined);
  assert.strictEqual(s2.sheet.events.at(-1)?.e, 'erase');

  let sLate = initSheetState('exam_day');
  sLate = nextState(sLate, { type: 'BUBBLE', qid: 'q1', key: 'A', t: 1, now: 1000 });
  const sLate2 = nextState(sLate, { type: 'UNDO', qid: 'q1', t: 9, now: 9000 });
  assert.strictEqual(sLate2, sLate);
});

test('7. E TRANSFER: transfers circled option to bubble', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'CHOOSE', qid: 'q2', key: 'B', t: 1, now: 1000 });
  s = nextState(s, { type: 'TRANSFER', qid: 'q2', t: 2, now: 2000 });
  assert.deepStrictEqual(s.sheet.bubbles.q2, ['B']);
  assert.strictEqual(s.sheet.circled.q2, 'B');

  const sTransferEmpty = nextState(s, { type: 'TRANSFER', qid: 'q3', t: 3, now: 3000 });
  assert.strictEqual(sTransferEmpty, s);
});

test('8. P: CHOOSE bubbles and circles, toggles, and erases', () => {
  let s = initSheetState('practice');
  s = nextState(s, { type: 'CHOOSE', qid: 'q1', key: 'A', t: 1, now: 1000 });
  assert.deepStrictEqual(s.sheet.bubbles.q1, ['A']);
  assert.strictEqual(s.sheet.circled.q1, 'A');

  s = nextState(s, { type: 'CHOOSE', qid: 'q1', key: 'C', t: 2, now: 2000 });
  assert.deepStrictEqual(s.sheet.bubbles.q1, ['C']);
  assert.strictEqual(s.pendingDouble, null);

  s = nextState(s, { type: 'CHOOSE', qid: 'q1', key: 'C', t: 3, now: 3000 });
  assert.strictEqual(s.sheet.bubbles.q1, undefined);
  assert.strictEqual(s.sheet.circled.q1, undefined);
  assert.strictEqual(s.sheet.events.at(-1)?.e, 'erase');
});

test('9. STRIKE: toggles struck, uncircles if striking circled', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'CHOOSE', qid: 'q1', key: 'B', t: 1, now: 1000 });
  s = nextState(s, { type: 'STRIKE', qid: 'q1', key: 'B', t: 2, now: 2000 });
  assert.deepStrictEqual(s.sheet.struck.q1, ['B']);
  assert.strictEqual(s.sheet.circled.q1, undefined);

  s = nextState(s, { type: 'STRIKE', qid: 'q1', key: 'B', t: 3, now: 3000 });
  assert.strictEqual(s.sheet.struck.q1, undefined);

  s = nextState(s, { type: 'STRIKE', qid: 'q1', key: 'D', t: 4, now: 4000 });
  s = nextState(s, { type: 'CHOOSE', qid: 'q1', key: 'D', t: 5, now: 5000 });
  assert.strictEqual(s.sheet.struck.q1, undefined);
  assert.strictEqual(s.sheet.circled.q1, 'D');
});

test('10. TAG and FLAG toggling', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'TAG', qid: 'q1', confidence: 'sure', t: 1, now: 1000 });
  assert.strictEqual(s.sheet.confidence.q1, 'sure');
  s = nextState(s, { type: 'TAG', qid: 'q1', confidence: 'sure', t: 2, now: 2000 });
  assert.strictEqual(s.sheet.confidence.q1, undefined);
  assert.strictEqual(s.sheet.events.at(-1)?.v, 'none');

  s = nextState(s, { type: 'FLAG', qid: 'q1', t: 3, now: 3000 });
  assert.strictEqual(s.sheet.flagged.q1, true);
  s = nextState(s, { type: 'FLAG', qid: 'q1', t: 4, now: 4000 });
  assert.strictEqual(s.sheet.flagged.q1, undefined);
});

test('11. VISIT deduplication', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'VISIT', qid: 'q1', t: 1, now: 1000 });
  assert.strictEqual(s.sheet.events.length, 1);
  const sSame = nextState(s, { type: 'VISIT', qid: 'q1', t: 2, now: 2000 });
  assert.strictEqual(sSame, s);

  s = nextState(s, { type: 'VISIT', qid: 'q2', t: 3, now: 3000 });
  assert.strictEqual(s.sheet.events.length, 2);
});

test('12. AWAY_START and AWAY_END', () => {
  let s = initSheetState('exam_day');
  s = nextState(s, { type: 'AWAY_START', t: 100, now: 1000 });
  s = nextState(s, { type: 'AWAY_END', t: 160, now: 2000 });
  assert.deepStrictEqual(s.sheet.away, [{ from: 100, to: 160 }]);

  const sNoOp = nextState(s, { type: 'AWAY_END', t: 200, now: 3000 });
  assert.strictEqual(sNoOp, s);
});

test('13. Event cap drops earliest visit events', () => {
  let s = initSheetState('exam_day');
  for (let k = 0; k < 2005; k++) {
    s = nextState(s, { type: 'VISIT', qid: k % 2 === 0 ? 'q1' : 'q2', t: k, now: 1000 + k });
  }
  assert.strictEqual(s.sheet.events.length, 2000);
  assert.strictEqual(s.sheet.events[0].t, 5);
});

test('14. tallies calculation', () => {
  const s = initSheetState('exam_day');
  s.sheet.bubbles = { q1: ['A'], q2: ['A', 'B'] };
  s.sheet.circled = { q1: 'A', q3: 'C' };
  s.sheet.flagged = { q4: true };

  const res = tallies(s.sheet, ['q1', 'q2', 'q3', 'q4', 'q5']);
  assert.strictEqual(res.bubbled, 2);
  assert.strictEqual(res.invalid, 1);
  assert.strictEqual(res.blank, 3);
  assert.strictEqual(res.circledOnly, 1);
  assert.strictEqual(res.flagged, 1);
  assert.deepStrictEqual(res.circledOnlyQids, ['q3']);
  assert.deepStrictEqual(res.flaggedQids, ['q4']);
  assert.deepStrictEqual(res.invalidQids, ['q2']);
});
