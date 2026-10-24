import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyCommand,
  computeStats,
  findNextUndecidedIndex,
  type ReviewState,
} from '../../qbank/final/review.js';
import type { QueueItem } from '../../qbank/final/reconcile.js';

function makeMockQueueItem(overrides?: Partial<QueueItem>): QueueItem {
  return {
    item_id: 'UPSC_CSE_Prelims_2024_GS-1_Q001_en:G_OPTIONS',
    canonical_id: 'UPSC_CSE_Prelims_2024_GS-1_Q001_en',
    occurrence_id: 'mock:doc_p1_q1',
    gate: 'G_OPTIONS',
    reason_code: 'placeholder_options',
    detail: 'Option text missing',
    candidates: [
      {
        source: 'primary',
        value: {
          stem: 'Test stem',
          options: [
            { key: 'a', text: 'Option A' },
            { key: 'b', text: 'Option B' },
            { key: 'c', text: 'Option C' },
            { key: 'd', text: 'Option D' },
          ],
        },
      },
      {
        source: 'handoff',
        value: {
          stem: 'Test stem from handoff',
          options: [
            { key: 'a', text: 'Option A2' },
            { key: 'b', text: 'Option B2' },
            { key: 'c', text: 'Option C2' },
            { key: 'd', text: 'Option D2' },
          ],
        },
      },
    ],
    evidence: [],
    crop: 'crops/test.png',
    ...overrides,
  };
}

test('1. Review Core: Accept candidate', () => {
  const item = makeMockQueueItem();
  const state: ReviewState = {
    queue: [item],
    decisions: [],
    currentIndex: 0,
    runDir: '/mock',
  };

  const res = applyCommand(state, '2', { reviewer: 'alice', clockTime: '2026-10-24T00:00:00.000Z' });
  assert.equal(res.error, undefined);
  assert.ok(res.decision);
  assert.equal(res.decision.item_id, item.item_id);
  assert.equal(res.decision.decision, 'accept_candidate');
  assert.equal(res.decision.candidate_index, 1);
  assert.equal(res.decision.reviewer, 'alice');
  assert.equal(res.state.decisions.length, 1);
  assert.equal(res.state.currentIndex, 1);
});

test('2. Review Core: Park rejects a reason under 10 characters', () => {
  const item = makeMockQueueItem();
  const state: ReviewState = {
    queue: [item],
    decisions: [],
    currentIndex: 0,
    runDir: '/mock',
  };

  // Rejection with short reason
  const resShort = applyCommand(state, 'p', { reason: 'too short' });
  assert.ok(resShort.error);
  assert.match(resShort.error, /at least 10 characters/);
  assert.equal(resShort.decision, undefined);
  assert.equal(resShort.state.decisions.length, 0);

  // Success with valid reason
  const resValid = applyCommand(state, 'p', { reason: 'This reason is definitely long enough.' });
  assert.equal(resValid.error, undefined);
  assert.ok(resValid.decision);
  assert.equal(resValid.decision.decision, 'park');
  assert.equal(resValid.decision.reason, 'This reason is definitely long enough.');
  assert.equal(resValid.state.decisions.length, 1);
});

test('3. Review Core: Edit rejects 3 options on Prelims and empty prompt on Mains', () => {
  // Prelims item
  const prelimsItem = makeMockQueueItem();
  const prelimsState: ReviewState = {
    queue: [prelimsItem],
    decisions: [],
    currentIndex: 0,
    runDir: '/mock',
  };

  const res3Opts = applyCommand(prelimsState, 'e', {
    editValue: {
      stem: 'Valid stem',
      options: [
        { key: 'a', text: 'Option A' },
        { key: 'b', text: 'Option B' },
        { key: 'c', text: 'Option C' },
      ],
    },
  });
  assert.ok(res3Opts.error);
  assert.match(res3Opts.error, /exactly 4 options/);

  // Mains item
  const mainsItem = makeMockQueueItem({
    item_id: 'UPSC_CSE_Mains_2024_Essay_Q001_en:G_XSRC',
    canonical_id: 'UPSC_CSE_Mains_2024_Essay_Q001_en',
    gate: 'G_XSRC',
  });
  const mainsState: ReviewState = {
    queue: [mainsItem],
    decisions: [],
    currentIndex: 0,
    runDir: '/mock',
  };

  const resEmptyPrompt = applyCommand(mainsState, 'e', {
    editValue: {
      prompt: '   ',
      marks_allotted: 10,
    },
  });
  assert.ok(resEmptyPrompt.error);
  assert.match(resEmptyPrompt.error, /non-empty prompt/);
});

test('4. Review Core: G_SERIES and G_ANSWER_CELL reject accept and edit', () => {
  for (const gate of ['G_SERIES', 'G_ANSWER_CELL'] as const) {
    const item = makeMockQueueItem({ gate, item_id: `test:${gate}` });
    const state: ReviewState = {
      queue: [item],
      decisions: [],
      currentIndex: 0,
      runDir: '/mock',
    };

    // Reject accept candidate
    const resAccept = applyCommand(state, '1');
    assert.ok(resAccept.error);
    assert.match(resAccept.error, /Only park \(p\) and skip \(s\) are allowed/);

    // Reject edit
    const resEdit = applyCommand(state, 'e', {
      editValue: { stem: 'stem', options: [{ key: 'a', text: 'a' }] },
    });
    assert.ok(resEdit.error);
    assert.match(resEdit.error, /Only park \(p\) and skip \(s\) are allowed/);

    // Allow park
    const resPark = applyCommand(state, 'p', { reason: 'Allowed parking for series or answer cell' });
    assert.equal(resPark.error, undefined);
    assert.equal(resPark.decision?.decision, 'park');
  }
});

test('5. Review Core: Resume skips items already decided and computeStats', () => {
  const item1 = makeMockQueueItem({ item_id: 'item:1', gate: 'G_OPTIONS' });
  const item2 = makeMockQueueItem({ item_id: 'item:2', gate: 'G_FIGURE' });
  const item3 = makeMockQueueItem({ item_id: 'item:3', gate: 'G_XSRC' });

  const queue = [item1, item2, item3];
  const decisions = [
    {
      item_id: 'item:1',
      decision: 'accept_candidate' as const,
      candidate_index: 0,
    },
  ];

  const nextIdx = findNextUndecidedIndex(queue, decisions, 0);
  assert.equal(nextIdx, 1, 'Should skip item:1 and resume at item:2');

  const stats = computeStats(queue, decisions);
  assert.equal(stats.total, 3);
  assert.equal(stats.decided, 1);
  assert.equal(stats.remaining, 2);
  assert.equal(stats.by_gate['G_OPTIONS'].total, 1);
  assert.equal(stats.by_gate['G_OPTIONS'].decided, 1);
  assert.equal(stats.by_gate['G_FIGURE'].total, 1);
  assert.equal(stats.by_gate['G_FIGURE'].decided, 0);
});
