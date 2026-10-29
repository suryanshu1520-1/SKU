import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import type { HumanitiesCanon, Thinker, Passage } from './humanities.js';
import { CANON_ORIGINAL_WORKS, getCanonOriginalWork } from '../data/canon-original-works.js';

test('humanities-canon.json schema and expanded passage depth', () => {
  const jsonPath = path.resolve(process.cwd(), 'src/data/humanities-canon.json');
  assert.ok(fs.existsSync(jsonPath), 'humanities-canon.json must exist');

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw) as HumanitiesCanon;

  assert.ok(Array.isArray(data.thinkers), 'thinkers must be an array');
  assert.strictEqual(data.thinkers.length, 10, 'must have exactly 10 canon thinkers');

  let totalPassages = 0;
  for (const thinker of data.thinkers) {
    assert.ok(thinker.id, 'thinker must have id');
    assert.ok(thinker.name, 'thinker must have name');
    assert.ok(thinker.workTitle, 'thinker must have workTitle');
    assert.ok(typeof thinker.year === 'number', 'year must be a number');
    assert.ok(thinker.publicDomainBasis, 'publicDomainBasis must exist');
    assert.ok(Array.isArray(thinker.passages), 'passages must be an array');
    assert.ok(thinker.passages.length >= 8, `${thinker.name} must have at least 8 passages for deep study`);
    totalPassages += thinker.passages.length;

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
      assert.ok(passage.pyqCitations.length > 0, `passage ${passage.id} must have at least one PYQ citation`);
      for (const cit of passage.pyqCitations) {
        assert.ok(typeof cit.year === 'number', 'citation year must be number');
        assert.ok(typeof cit.paper === 'string', 'citation paper must be string');
      }
    }
  }

  assert.ok(totalPassages >= 80, `Canon must contain at least 80 passages, got ${totalPassages}`);
});

test('canon-original-works registry and unabridged source integrity', async () => {
  const thinkerIds = [
    'ambedkar',
    'gandhi',
    'kant',
    'mill',
    'kautilya',
    'aristotle',
    'rawls',
    'vivekananda',
    'tagore',
    'rousseau'
  ];

  for (const id of thinkerIds) {
    const work = getCanonOriginalWork(id);
    assert.ok(work, `Original work must be registered for ${id}`);
    assert.strictEqual(work.thinkerId, id);
    assert.ok(work.title, 'work must have title');
    assert.ok(work.author, 'work must have author');
    assert.ok(work.pdBasis, 'work must have public domain basis');
    assert.ok(work.wordCountApprox > 10000, `work ${id} must have substantial text (>10k words)`);
    assert.ok(work.readingTimeMinutes > 30, `work ${id} must have realistic reading time`);
    assert.ok(Array.isArray(work.chapters) && work.chapters.length >= 4, `work ${id} must have at least 4 chapters`);

    // Verify content loader
    const content = await work.loadContent();
    assert.ok(content && content.length > 5000, `loaded text for ${id} must be non-empty and substantial`);
    assert.ok(content.includes('# ') || content.includes('## '), `text for ${id} must have structured Markdown headings`);
  }
});
