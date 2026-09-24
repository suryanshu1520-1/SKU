import test from 'node:test';
import assert from 'node:assert/strict';
import {
  durationLabel,
  formatDuration,
  formatMarks,
  formatPercent,
  formatSignedMarks,
  formatTimeLeft,
  hallClock,
  hallClockAtMinute,
  hallEnd,
  rollNumber,
  secondsElapsed,
  secondsLeft,
  serverOffsetMs,
} from '../../src/components/exam/lib/clock.js';

test('formatTimeLeft formatting', () => {
  assert.strictEqual(formatTimeLeft(4552), '1:15:52');
  assert.strictEqual(formatTimeLeft(3600), '1:00:00');
  assert.strictEqual(formatTimeLeft(599), '09:59');
  assert.strictEqual(formatTimeLeft(0), '00:00');
});

test('hallClock and hallEnd', () => {
  assert.strictEqual(hallClock(0), '09:30');
  assert.strictEqual(hallClock(59), '09:30');
  assert.strictEqual(hallClock(2640), '10:14');
  assert.strictEqual(hallClock(7200), '11:30');
  assert.strictEqual(hallEnd(1800), '10:00');
  assert.strictEqual(hallEnd(3600), '10:30');
  assert.strictEqual(hallClockAtMinute(90), '11:00');
});

test('formatMarks and formatSignedMarks', () => {
  assert.strictEqual(formatMarks(268), '2.68');
  assert.strictEqual(formatMarks(-66), '−0.66');
  assert.strictEqual(formatMarks(0), '0.00');
  assert.strictEqual(formatMarks(9352), '93.52');
  assert.strictEqual(formatMarks(-1848), '−18.48');
  assert.strictEqual(formatMarks(5), '0.05');

  assert.strictEqual(formatSignedMarks(200), '+2.00');
  assert.strictEqual(formatSignedMarks(-66), '−0.66');
  assert.strictEqual(formatSignedMarks(0), '0.00');
});

test('serverOffsetMs, secondsLeft, secondsElapsed', () => {
  const offset = serverOffsetMs(
    '2026-09-24T10:00:05.000Z',
    Date.parse('2026-09-24T10:00:00.000Z')
  );
  assert.strictEqual(offset, 5000);

  const leftWithoutOffset = secondsLeft(
    '2026-09-24T10:00:10.400Z',
    Date.parse('2026-09-24T10:00:00.000Z'),
    0
  );
  assert.strictEqual(leftWithoutOffset, 11);

  const leftWithOffset = secondsLeft(
    '2026-09-24T10:00:10.400Z',
    Date.parse('2026-09-24T10:00:00.000Z'),
    5000
  );
  assert.strictEqual(leftWithOffset, 6);

  const leftPast = secondsLeft(
    '2026-09-24T09:59:59.000Z',
    Date.parse('2026-09-24T10:00:00.000Z'),
    0
  );
  assert.strictEqual(leftPast, 0);

  const elapsed = secondsElapsed(
    '2026-09-24T10:00:00.000Z',
    Date.parse('2026-09-24T10:05:00.900Z'),
    0,
    1800
  );
  assert.strictEqual(elapsed, 300);

  const elapsedFuture = secondsElapsed(
    '2026-09-24T10:00:00.000Z',
    Date.parse('2026-09-24T11:00:00.000Z'),
    0,
    1800
  );
  assert.strictEqual(elapsedFuture, 1800);
});

test('formatDuration and durationLabel', () => {
  assert.strictEqual(formatDuration(100), '1m 40s');
  assert.strictEqual(formatDuration(45), '45s');
  assert.strictEqual(formatDuration(3725), '1h 02m');

  assert.strictEqual(durationLabel(7200), '2 hours');
  assert.strictEqual(durationLabel(3600), '1 hour');
  assert.strictEqual(durationLabel(1800), '30 minutes');
});

test('rollNumber deterministic hash', () => {
  assert.strictEqual(rollNumber('00000000-0000-4000-8000-000000000000'), 'TK7017141');
  assert.strictEqual(rollNumber('user-123'), 'TK8496403');
});

test('formatPercent', () => {
  assert.strictEqual(formatPercent(56, 84), '67%');
  assert.strictEqual(formatPercent(1, 0), '—');
});
