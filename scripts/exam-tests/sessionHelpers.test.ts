import test from 'node:test';
import assert from 'node:assert/strict';
import type { ResponseSheet } from '../../src/components/exam/types.js';
import {
  chooseResumeSheet,
  keepaliveBodyFits,
  normalizeLocalSheet,
} from '../../src/components/exam/lib/sessionHelpers.js';

function makeSheet(clientUpdatedAt: number, label?: string): ResponseSheet {
  return {
    v: 1,
    rules: 'exam_day',
    bubbles: label ? { [label]: ['A'] } : {},
    circled: {},
    struck: {},
    confidence: {},
    flagged: {},
    events: [],
    away: [],
    clientUpdatedAt,
  };
}

test('1. chooseResumeSheet resolves local vs server by clientUpdatedAt and server tie-breaker', () => {
  assert.equal(chooseResumeSheet(null, null), null);

  const L5 = makeSheet(5, 'L5');
  const S5 = makeSheet(5, 'S5');
  const L9 = makeSheet(9, 'L9');
  const S9 = makeSheet(9, 'S9');
  const L7 = makeSheet(7, 'L7');
  const S7 = makeSheet(7, 'S7');

  assert.equal(chooseResumeSheet(L5, null), L5);
  assert.equal(chooseResumeSheet(null, S5), S5);
  assert.equal(chooseResumeSheet(L9, S5), L9);
  assert.equal(chooseResumeSheet(L5, S9), S9);
  assert.equal(chooseResumeSheet(L7, S7), S7);
});

test('2. keepaliveBodyFits enforces 60,000 character payload ceiling', () => {
  const smallSheet = makeSheet(100);
  assert.equal(keepaliveBodyFits('a', smallSheet), true);

  const largeSheet: ResponseSheet = {
    ...makeSheet(100),
    events: Array.from({ length: 2000 }, (_, i) => ({
      t: i,
      q: 'item_1234567890123456789012345678901234', // 39-character id
      e: 'visit',
    })),
  };
  assert.equal(keepaliveBodyFits('a', largeSheet), false);
});

test('3. normalizeLocalSheet validates schema, maps and defaults', () => {
  assert.deepEqual(normalizeLocalSheet({ v: 1, bubbles: {} }), {
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
  });

  assert.equal(normalizeLocalSheet({ v: 2 }), null);
  assert.equal(normalizeLocalSheet(null), null);
  assert.equal(normalizeLocalSheet('string'), null);
  assert.equal(normalizeLocalSheet([]), null);

  assert.deepEqual(
    normalizeLocalSheet({ v: 1, rules: 'practice', struck: 'x', events: {} }),
    {
      v: 1,
      rules: 'practice',
      bubbles: {},
      circled: {},
      struck: {},
      confidence: {},
      flagged: {},
      events: [],
      away: [],
      clientUpdatedAt: 0,
    }
  );
});
