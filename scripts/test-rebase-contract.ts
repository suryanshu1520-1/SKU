import assert from 'node:assert/strict';
import test from 'node:test';
import { isRebasePatch } from '../src/lib/rebase.js';

function validLearnPatch() {
  return {
    schemaVersion: 1,
    patchId: 'b52e27a5-a790-49ab-9759-a05f255fa6f1',
    fromCheckpoint: { sequence: '0', verifiedThrough: null },
    throughSequence: '1',
    verifiedThrough: '2026-08-20T03:30:00.000Z',
    status: 'changes',
    counts: { learn: 1, replace: 0, watch: 0, retire: 0 },
    items: [
      {
        mutationId: '4c69a95b-cfe0-45fd-80bf-97d286fc5d93',
        action: 'learn',
        claimId: '712cbf1a-8efe-4db9-8869-c8cf167675b8',
        previousText: null,
        currentText: 'The RBI repo rate is 6.25%.',
        previousValue: null,
        currentValue: '6.25%',
        reason: 'First verified observation for RBI repo_rate, CURRENT_PERIOD.',
        observedAt: '2026-08-20T03:25:00.000Z',
        effectiveAt: null,
        verificationMethod: 'live_cite_or_drop_v1',
        evidence: [
          {
            source: 'RBI',
            url: 'https://www.rbi.org.in/example',
            quote: 'The Monetary Policy Committee decided to keep the repo rate at 6.25 per cent.',
            spanIds: ['s4'],
          },
        ],
        syllabus: { nodeId: null, tags: ['GS3 Economy'] },
        story: { headline: 'RBI announces policy decision', url: 'https://www.rbi.org.in/example' },
      },
    ],
    hasMore: false,
  };
}

test('accepts a complete live-provenance learn patch', () => {
  assert.equal(isRebasePatch(validLearnPatch()), true);
});

test('accepts an empty completed patch', () => {
  const patch = validLearnPatch();
  patch.status = 'empty';
  patch.items = [] as typeof patch.items;
  patch.counts.learn = 0;
  patch.throughSequence = patch.fromCheckpoint.sequence;
  assert.equal(isRebasePatch(patch), true);
});

test('rejects a fabricated no-run checkpoint', () => {
  const patch = validLearnPatch();
  patch.status = 'empty';
  patch.items = [] as typeof patch.items;
  patch.counts.learn = 0;
  patch.throughSequence = patch.fromCheckpoint.sequence;
  patch.patchId = '00000000-0000-0000-0000-000000000000';
  assert.equal(isRebasePatch(patch), false);
});

test('accepts a replace only when old and new text are present', () => {
  const patch = validLearnPatch();
  patch.items[0].action = 'replace';
  patch.items[0].previousText = 'The RBI repo rate was 6.50%.';
  patch.items[0].previousValue = '6.50%';
  patch.counts.learn = 0;
  patch.counts.replace = 1;
  assert.equal(isRebasePatch(patch), true);

  patch.items[0].previousText = null;
  assert.equal(isRebasePatch(patch), false);
});

test('rejects legacy or synthetic trust data without live provenance', () => {
  const patch = validLearnPatch();
  patch.items[0].verificationMethod = 'legacy_backfill' as 'live_cite_or_drop_v1';
  assert.equal(isRebasePatch(patch), false);
});

test('rejects evidence without an addressable source span', () => {
  const patch = validLearnPatch();
  patch.items[0].evidence[0].spanIds = [];
  assert.equal(isRebasePatch(patch), false);
});

test('rejects count drift and duplicate mutation ids', () => {
  const countDrift = validLearnPatch();
  countDrift.counts.learn = 2;
  assert.equal(isRebasePatch(countDrift), false);

  const duplicate = validLearnPatch();
  duplicate.items.push({ ...duplicate.items[0] });
  duplicate.counts.learn = 2;
  assert.equal(isRebasePatch(duplicate), false);
});

test('rejects a regressing or internally inconsistent checkpoint', () => {
  const regressing = validLearnPatch();
  regressing.fromCheckpoint.sequence = '2';
  assert.equal(isRebasePatch(regressing), false);

  const emptyWithProgress = validLearnPatch();
  emptyWithProgress.status = 'empty';
  emptyWithProgress.items = [] as typeof emptyWithProgress.items;
  emptyWithProgress.counts.learn = 0;
  emptyWithProgress.throughSequence = '1';
  emptyWithProgress.fromCheckpoint.sequence = '0';
  assert.equal(isRebasePatch(emptyWithProgress), false);
});

test('rejects unsupported v1 actions', () => {
  const patch = validLearnPatch();
  patch.items[0].action = 'watch' as 'learn';
  assert.equal(isRebasePatch(patch), false);
});
