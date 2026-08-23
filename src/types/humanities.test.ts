import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import type { HumanitiesCanon, Thinker, Passage } from './humanities.js';

test('humanities-canon.json schema and validation', () => {
  const jsonPath = path.resolve(process.cwd(), 'src/data/humanities-canon.json');
  assert.ok(fs.existsSync(jsonPath), 'humanities-canon.json must exist');

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw) as HumanitiesCanon;

  assert.ok(Array.isArray(data.thinkers), 'thinkers must be an array');
  assert.ok(data.thinkers.length > 0, 'must have at least one thinker');

  for (const thinker of data.thinkers) {
    assert.ok(thinker.id, 'thinker must have id');
    assert.ok(thinker.name, 'thinker must have name');
    assert.ok(thinker.workTitle, 'thinker must have workTitle');
    assert.ok(typeof thinker.year === 'number', 'year must be a number');
    assert.ok(thinker.publicDomainBasis, 'publicDomainBasis must exist');
    assert.ok(Array.isArray(thinker.passages), 'passages must be an array');

    const seenIds = new Set<string>();
    for (const passage of thinker.passages) {
      assert.ok(passage.id && passage.id.trim().length > 0, 'passage id must be non-empty string');
      assert.ok(!seenIds.has(passage.id), `duplicate passage id within work: ${passage.id}`);
      seenIds.add(passage.id);

      assert.ok(typeof passage.isPlaceholder === 'boolean', 'isPlaceholder must be boolean');
      if (passage.isPlaceholder) {
        assert.ok(
          passage.text.includes('PLACEHOLDER'),
          `passage ${passage.id} has isPlaceholder: true but does not contain 'PLACEHOLDER' in text`
        );
      }

      assert.ok(Array.isArray(passage.pyqCitations), 'pyqCitations must be an array');
      for (const cit of passage.pyqCitations) {
        assert.ok(typeof cit.year === 'number', 'citation year must be number');
        assert.ok(typeof cit.paper === 'string', 'citation paper must be string');
      }
    }
  }
});
