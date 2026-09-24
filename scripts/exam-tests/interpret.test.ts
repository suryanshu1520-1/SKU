import test from 'node:test';
import assert from 'node:assert/strict';
import type { ExamResult } from '../../server-lib/exam/types.js';
import {
  perAnswerHundredths,
  ledgerVerdict,
  heroInterpretation,
  ledgerHeadline,
  disciplineLines,
  paceLines,
  subjectLine,
  weakestOfferedSubject,
} from '../../src/components/exam/scorecard/interpret.js';

const S: ExamResult = {
  attemptId: 'att-sample',
  paperCode: 'GS1_FULL',
  rules: 'exam_day',
  questionCount: 100,
  durationSeconds: 7200,
  startedAt: '2026-09-24T04:00:00.000Z',
  submittedAt: '2026-09-24T05:56:00.000Z',
  submitMode: 'manual',
  correct: 56,
  wrong: 27,
  invalid: 1,
  blank: 16,
  grossHundredths: 11200,
  penaltyHundredths: 1848,
  netHundredths: 9352,
  maxHundredths: 20000,
  timeUsedSeconds: 6960,
  awaySeconds: 100,
  awayCount: 2,
  items: [],
  bySubject: {
    Economy: { total: 34, attempted: 30, correct: 21, wrong: 9, netHundredths: 3606 },
    Environment: { total: 24, attempted: 20, correct: 13, wrong: 7, netHundredths: 2138 },
    Geography: { total: 21, attempted: 17, correct: 11, wrong: 6, netHundredths: 1804 },
    History: { total: 15, attempted: 12, correct: 7, wrong: 5, netHundredths: 1070 },
    Polity: { total: 5, attempted: 4, correct: 3, wrong: 1, netHundredths: 534 },
    'General Studies': { total: 1, attempted: 1, correct: 1, wrong: 0, netHundredths: 200 },
  },
  byConfidence: {
    sure: { attempted: 38, correct: 34, wrong: 4, netHundredths: 6536 },
    fifty: { attempted: 26, correct: 14, wrong: 12, netHundredths: 2008 },
    guess: { attempted: 12, correct: 3, wrong: 9, netHundredths: 6 },
    untagged: { attempted: 8, correct: 5, wrong: 3, netHundredths: 802 },
  },
  byStruckCount: {
    '0': { attempted: 41, correct: 30, wrong: 11, netHundredths: 5274 },
    '1': { attempted: 22, correct: 13, wrong: 9, netHundredths: 2006 },
    '2': { attempted: 17, correct: 11, wrong: 6, netHundredths: 1804 },
    '3': { attempted: 4, correct: 2, wrong: 2, netHundredths: 268 },
  },
  discipline: {
    circledNotBubbled: 3,
    circledNotBubbledCorrect: 2,
    changedAtTransfer: 4,
    changedRightToWrong: 1,
    changedWrongToRight: 3,
  },
  pace: [
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110,
    115, 120,
  ].map((minute, idx) => ({
    minute,
    bubbled: [
      0, 6, 12, 17, 22, 27, 31, 35, 38, 42, 45, 47, 49, 52, 55, 58, 61, 64, 67, 70, 74, 78, 82,
      84, 84,
    ][idx],
  })),
};

test('1. heroInterpretation matches sample result S', () => {
  assert.equal(
    heroInterpretation(S),
    'Negative marking took 18.48 marks, 17% of what you earned. The risk ledger below shows where.'
  );
});

test('2. ledgerHeadline matches sample result S', () => {
  assert.equal(
    ledgerHeadline(S),
    'Your 50:50 calls earned 0.77 marks each. Keep taking them. Pure guesses only broke even.'
  );
});

test('3. ledgerVerdict and perAnswerHundredths match sample result S', () => {
  assert.deepEqual(ledgerVerdict(S.byConfidence.sure), { label: 'Worth attempting', tone: 'good' });
  assert.deepEqual(ledgerVerdict(S.byConfidence.guess), { label: 'Roughly break-even', tone: 'even' });
  assert.deepEqual(ledgerVerdict(S.byStruckCount['3']), { label: 'Too few to judge', tone: 'few' });
  assert.equal(perAnswerHundredths(S.byConfidence.fifty), 77);
});

test('4. disciplineLines matches sample result S', () => {
  assert.deepEqual(disciplineLines(S), [
    '3 answers circled in the booklet never reached your sheet. 2 of them were right; bubbling them would have added 3.34 marks.',
    '4 answers changed while bubbling: 1 right → wrong, 3 wrong → right.',
    '1 row double-marked (−0.66).',
    'You left the exam tab 2 times (1m 40s).',
  ]);
});

test('5. paceLines matches sample result S', () => {
  assert.deepEqual(paceLines(S), [
    'You bubbled half the paper by 10:35; even pace gets there at 10:30.',
    'You handed in with 4 minutes left.',
  ]);
});

test('6. subjectLine matches sample result S', () => {
  assert.equal(
    subjectLine(S),
    'Strongest: Polity (1.07 per question). Weakest: History & Culture (0.71 per question).'
  );
});

test('7. weakestOfferedSubject matches sample result S with offered list', () => {
  assert.equal(
    weakestOfferedSubject(S, ['Mixed', 'Economy', 'Environment', 'Geography', 'History']),
    'History'
  );
});

test('8. heroInterpretation variant with high blank count', () => {
  const v: ExamResult = {
    ...S,
    questionCount: 25,
    correct: 10,
    wrong: 1,
    invalid: 0,
    blank: 14,
    grossHundredths: 2000,
    penaltyHundredths: 66,
  };
  assert.equal(
    heroInterpretation(v),
    'You left 14 questions blank. The risk ledger shows which kinds were worth a try.'
  );
});

test('9. heroInterpretation variant with high accuracy', () => {
  const v: ExamResult = {
    ...S,
    questionCount: 25,
    correct: 20,
    wrong: 2,
    invalid: 0,
    blank: 3,
    grossHundredths: 4000,
    penaltyHundredths: 132,
  };
  assert.equal(heroInterpretation(v), '91% of your attempted answers were right.');
});

test('10. ledgerHeadline variant when no answers tagged', () => {
  const v: ExamResult = {
    ...S,
    byConfidence: {
      ...S.byConfidence,
      sure: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
      fifty: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
      guess: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    },
  };
  assert.equal(
    ledgerHeadline(v),
    'Tag answers Sure, 50:50 or Guess while you write, and this ledger will show which risks pay off for you.'
  );
});

test('11. ledgerHeadline variant when pure guesses cost marks', () => {
  const v: ExamResult = {
    ...S,
    byConfidence: {
      ...S.byConfidence,
      guess: { attempted: 10, correct: 1, wrong: 9, netHundredths: -394 },
    },
  };
  assert.equal(
    ledgerHeadline(v),
    'Guesses cost you 0.39 marks each. Leave pure guesses blank.'
  );
});

test('12. disciplineLines clean sheet', () => {
  const v: ExamResult = {
    ...S,
    invalid: 0,
    awayCount: 0,
    discipline: {
      circledNotBubbled: 0,
      circledNotBubbledCorrect: 0,
      changedAtTransfer: 0,
      changedRightToWrong: 0,
      changedWrongToRight: 0,
    },
  };
  assert.deepEqual(disciplineLines(v), [
    'Clean sheet: every circled answer made it onto your answer sheet.',
  ]);
});

test('13. disciplineLines with 1 wrong circled answer', () => {
  const v: ExamResult = {
    ...S,
    invalid: 0,
    awayCount: 0,
    discipline: {
      circledNotBubbled: 1,
      circledNotBubbledCorrect: 0,
      changedAtTransfer: 0,
      changedRightToWrong: 0,
      changedWrongToRight: 0,
    },
  };
  assert.deepEqual(disciplineLines(v), [
    '1 answer circled in the booklet never reached your sheet. It was wrong; bubbling it would have cost 0.66 marks, so leaving it blank was right.',
  ]);
});

test('14. paceLines with timeout and short sectional paper', () => {
  const v: ExamResult = {
    ...S,
    questionCount: 25,
    durationSeconds: 1800,
    submitMode: 'timeout',
    pace: [0, 5, 10, 15, 20, 25, 30].map((minute, idx) => ({
      minute,
      bubbled: [0, 2, 4, 6, 8, 10, 11][idx],
    })),
  };
  assert.deepEqual(paceLines(v), [
    'You bubbled 11 of 25 answers; even pace reaches half the paper by 09:45.',
    'You used the full time.',
  ]);
});
