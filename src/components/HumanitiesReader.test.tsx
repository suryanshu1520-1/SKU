import { test } from 'node:test';
import assert from 'node:assert/strict';
import { togglePinPassage, isPassagePinned } from './HumanitiesReader.js';
import canonData from '../data/humanities-canon.json' with { type: 'json' };
import type { Passage } from '../types/humanities.js';

test('HumanitiesReader logic: pin and unpin operations', () => {
  const thinker = canonData.thinkers[0];
  assert.ok(thinker, 'must have at least one thinker');
  const passage1 = thinker.passages[0] as Passage;
  const passage2 = (thinker.passages[1] || thinker.passages[0]) as Passage;

  let pinned: Passage[] = [];

  // Pin passage 1
  pinned = togglePinPassage(pinned, passage1);
  assert.strictEqual(pinned.length, 1);
  assert.strictEqual(isPassagePinned(pinned, passage1.id), true);

  // Pinning again should unpin (toggle)
  pinned = togglePinPassage(pinned, passage1);
  assert.strictEqual(pinned.length, 0);
  assert.strictEqual(isPassagePinned(pinned, passage1.id), false);

  // Pin passage 1 and 2
  pinned = togglePinPassage(pinned, passage1);
  if (passage2 && passage2.id !== passage1.id) {
    pinned = togglePinPassage(pinned, passage2);
    assert.strictEqual(pinned.length, 2);
  }
});

test('HumanitiesReader data contract: placeholder and citations', () => {
  for (const thinker of canonData.thinkers) {
    for (const passage of thinker.passages) {
      if (passage.isPlaceholder) {
        assert.ok(
          passage.text.includes('PLACEHOLDER'),
          'isPlaceholder passage must have text containing PLACEHOLDER'
        );
      }
      assert.ok(Array.isArray(passage.pyqCitations), 'pyqCitations must be an array');
      for (const cit of passage.pyqCitations) {
        assert.ok(typeof cit.year === 'number', 'cit.year must be number');
        assert.ok(typeof cit.paper === 'string', 'cit.paper must be string');
      }
    }
  }
});
