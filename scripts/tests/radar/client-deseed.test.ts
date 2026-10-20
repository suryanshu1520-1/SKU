import test from 'node:test';
import assert from 'node:assert';
import * as shared from '../../../src/lib/policy-ripple-radar-shared.js';
import { getBossMcqForChain } from '../../../src/lib/policy-ripple-radar-shared.js';

test('TASK_085A2 / TASK_085Q2: Client Surfaces Deseed Verification', async (t) => {
  await t.test('legacy regex and volcano functions are completely removed in Q2', () => {
    assert.strictEqual((shared as any).getVolcanoTelemetryForNode, undefined);
    assert.strictEqual((shared as any).matchDispatchToPolicyChain, undefined);
    assert.strictEqual((shared as any).getPolicyEntityForText, undefined);
    assert.strictEqual((shared as any).CANONICAL_5_TIER_ENTITIES, undefined);
  });

  await t.test('getBossMcqForChain returns MCQ only if statement_dissection exists, else null', () => {
    // Chain with no boss_mcq
    assert.strictEqual(getBossMcqForChain({ chain_id: 'CHAIN_01' } as any), null);

    // Chain with boss_mcq lacking statement_dissection
    const incompleteChain = {
      chain_id: 'CHAIN_01_SEMICON_NEXUS',
      boss_mcq: {
        stem: 'Sample stem',
        statements: ['Statement 1'],
      },
    };
    assert.strictEqual(getBossMcqForChain(incompleteChain as any), null);

    // Chain with valid statement_dissection
    const validChain = {
      chain_id: 'CHAIN_01_SEMICON_NEXUS',
      boss_mcq: {
        stem: 'Valid stem',
        statements: ['Stmt 1'],
        options: { a: 'A', b: 'B', c: 'C', d: 'D' },
        official_key: 'a',
        primary_operator: 'STATUTORY_REVERSAL',
        claim_half_life_days: 90,
        statutory_anchor: 'ISM Guidelines',
        statement_dissection: [
          { stmt_num: 1, is_true: true, operator: 'DIRECT_CITATION' },
        ],
      },
    };
    const resolved = getBossMcqForChain(validChain as any);
    assert.ok(resolved !== null);
    assert.strictEqual(resolved?.stem, 'Valid stem');
    assert.strictEqual(resolved?.statement_dissection.length, 1);
  });
});
