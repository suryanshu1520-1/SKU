import test from 'node:test';
import assert from 'node:assert';
import { buildRadarPayloadV1, v1FromV2 } from '../../../server-lib/policy/radar-payload.js';

// Public GET /api/policy-radar used to return the raw current_affairs_mcqs row as boss_mcq, answer key included.
// Answers may only leave the server through POST /api/policy-radar/v2/boss-mcq/:id/check.

// Same columns as a live current_affairs_mcqs row, plus one column nobody has added yet.
const LEAKY_ROW = {
  id: 'mcq-1',
  chain_id: 'CHAIN_02_GREEN_HYDROGEN',
  headline: 'FULL-CHAIN BOSS MCQ: Green Hydrogen',
  question: 'Consider the following statements regarding SIGHT...',
  options: { a: 'Only one', b: 'Only two', c: 'All three', d: 'None' },
  subject: 'GS3',
  edition_date: '2026-10-21',
  affair_url: 'boss_mcq://CHAIN_02_GREEN_HYDROGEN',
  created_at: '2026-10-21T00:00:00Z',
  is_boss_mcq: true,
  node_id: 'GS3.ENV.RENEWABLE',
  correct_index: 2,
  explanation: 'SENTINEL_EXPLANATION statement 1 is correct',
  statement_dissection: [{ anchor: 'SENTINEL_ANCHOR', verdict: 'correct' }],
  statutory_anchor: 'SENTINEL_STATUTE',
  primary_operator: 'PSY_01_INST_SWAP',
  secondary_operator: 'PSY_05_SCOPE_MUTATE',
  entity_slugs: ['ENT_MNRE'],
  claim_half_life_days: 180,
  answer_hint: 'SENTINEL_FUTURE_COLUMN',
};

const ANSWER_FIELDS = [
  'correct_index', 'explanation', 'statement_dissection', 'statutory_anchor',
  'primary_operator', 'secondary_operator', 'answer_hint',
];

test('legacy radar boss_mcq: answer-free allowlist', async (t) => {
  await t.test('v1 payload keeps only what a pre-answer card needs', () => {
    const payload = buildRadarPayloadV1({
      chains: [
        {
          chain_id: 'CHAIN_02_GREEN_HYDROGEN',
          title: 'Green Hydrogen',
          boss_mcq_id: 'mcq-1',
          policy_chain_nodes: [
            { dispatch_id: 'REAL_GH_01', pib_url: 'https://pib.gov.in/gh1', provenance: 'observed', step_order: 1 },
          ],
        },
      ],
      entities: [],
      volcanoRows: [],
      bossMcqs: [LEAKY_ROW],
    });

    const boss = payload.chains[0].boss_mcq;
    assert.ok(boss, 'boss_mcq must still be served');
    assert.deepStrictEqual(
      Object.keys(boss).sort(),
      ['chain_id', 'edition_date', 'headline', 'id', 'options', 'question', 'subject'],
    );
    assert.strictEqual(boss.question, LEAKY_ROW.question);
    assert.deepStrictEqual(boss.options, LEAKY_ROW.options);

    const wire = JSON.stringify(payload);
    assert.ok(!wire.includes('SENTINEL'), 'no answer-bearing text anywhere in the payload');
    for (const field of ANSWER_FIELDS) assert.ok(!wire.includes(`"${field}"`), `${field} must not be serialized`);
  });

  await t.test('v1FromV2 strips answer fields even if a v2 program carries them', () => {
    const v2 = {
      status: 'ok',
      programs: [
        {
          slug: 'PRG_X', name: 'X', kind: 'scheme', nodal: 'ENT_Y', nodes: [],
          boss_mcq: {
            id: 'mcq-2', question: 'Q?', options: ['A', 'B', 'C', 'D'], edition_date: '2026-10-21',
            correct_index: 1, explanation: 'SENTINEL_V2',
          },
        },
        { slug: 'PRG_NONE', name: 'None', kind: 'scheme', nodal: 'ENT_Z', nodes: [], boss_mcq: null },
      ],
      node_signals: [],
      coverage: { generated_at: '2026-10-21T00:00:00Z' },
    };

    const v1 = v1FromV2(v2);
    assert.deepStrictEqual(Object.keys(v1.chains[0].boss_mcq).sort(), ['edition_date', 'id', 'options', 'question']);
    assert.ok(!JSON.stringify(v1).includes('SENTINEL_V2'));
    assert.strictEqual(v1.chains[1].boss_mcq, null);
  });
});
