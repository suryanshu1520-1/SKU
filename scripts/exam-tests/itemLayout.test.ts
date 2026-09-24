import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeStemMarkdown,
  optionLayout,
  pageNumberAfter,
} from '../../src/components/exam/lib/itemLayout.js';
import { PRELIMS_CUTOFFS } from '../../src/components/exam/data/prelimsCutoffs.js';

test('1. already normal stem is unchanged', () => {
  const stem =
    'With reference to cultural history of India, consider the following statements:\n\n1. Most of the Tyagaraja Kritis are devotional songs in praise of Lord Krishna.\n2. Tyagaraja created several new ragas.\n\nWhich of the statements given above are correct?';
  assert.strictEqual(normalizeStemMarkdown(stem), stem);
});

test('2. normalizes list statements without blank lines', () => {
  const raw = 'Consider the following:\n1. A\n2. B\nWhich of the above?';
  const expected = 'Consider the following:\n\n1. A\n2. B\n\nWhich of the above?';
  assert.strictEqual(normalizeStemMarkdown(raw), expected);
});

test('3. normalizes markdown pair table without blank lines', () => {
  const raw = 'Consider the following pairs:\n| | X | Y |\n|---|---|---|\n| 1. | a | b |\nHow many pairs?';
  const expected = 'Consider the following pairs:\n\n| | X | Y |\n|---|---|---|\n| 1. | a | b |\n\nHow many pairs?';
  assert.strictEqual(normalizeStemMarkdown(raw), expected);
});

test('4. single-line stem is unchanged', () => {
  const raw = 'Banjaras during the medieval period of Indian history were generally';
  assert.strictEqual(normalizeStemMarkdown(raw), raw);
});

test('5. optionLayout decides grid vs list based on 28-character threshold', () => {
  assert.strictEqual(optionLayout(['1 only', '2 only', 'Both 1 and 2', 'Neither 1 nor 2']), 'grid');
  assert.strictEqual(
    optionLayout([
      'Increased plant growth due to increased concentration of carbon dioxide in the atmosphere',
      'b',
      'c',
      'd',
    ]),
    'list'
  );
});

test('6. pageNumberAfter pagination', () => {
  assert.strictEqual(pageNumberAfter(5), 2);
  assert.strictEqual(pageNumberAfter(90), 19);
  assert.strictEqual(pageNumberAfter(7), null);
});

test('7. PRELIMS_CUTOFFS integrity check', () => {
  assert.strictEqual(PRELIMS_CUTOFFS.length, 9);
  const years = PRELIMS_CUTOFFS.map((c) => c.year);
  assert.deepStrictEqual(years, [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017]);
  for (const c of PRELIMS_CUTOFFS) {
    assert.ok(
      c.source.startsWith('https://www.upsc.gov.in/sites/default/files/'),
      `Source for year ${c.year} should start with official UPSC domain`
    );
  }
  const y2023 = PRELIMS_CUTOFFS.find((c) => c.year === 2023);
  assert.strictEqual(y2023?.general, 75.41);
});
