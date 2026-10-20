import test from 'node:test';
import assert from 'node:assert';
import { buildRadarPayloadV1, isObservedNode } from '../../../server-lib/policy/radar-payload.js';

test('TASK_085A: Radar Payload Isolation & Quarantine', async (t) => {
  await t.test('(a) a DISP_001_X node with pib_url: null is absent from output', () => {
    const input = {
      chains: [
        {
          chain_id: 'CHAIN_TEST_1',
          title: 'Test Chain 1',
          policy_chain_nodes: [
            {
              dispatch_id: 'DISP_001_X',
              pib_url: null,
              provenance: 'seed',
              action: 'Synthetic Seed Action',
            },
            {
              dispatch_id: 'DISP_002_Y',
              pib_url: 'https://pib.gov.in/PressReleasePage.aspx?PRID=12345',
              provenance: 'seed',
              action: 'Seed with URL',
            },
            {
              dispatch_id: 'REAL_DISPATCH_101',
              pib_url: 'https://archive.pib.gov.in/release/101',
              provenance: 'observed',
              action: 'Observed Union Action',
            },
          ],
        },
      ],
      entities: [],
      volcanoRows: [],
      bossMcqs: [],
    };

    const payload = buildRadarPayloadV1(input);

    assert.strictEqual(payload.chains.length, 1);
    const flow = payload.chains[0].nodes_flow;
    assert.strictEqual(flow.length, 1);
    assert.strictEqual(flow[0].dispatch_id, 'REAL_DISPATCH_101');
    assert.ok(!flow.some((n: any) => n.dispatch_id === 'DISP_001_X'));
    assert.ok(!flow.some((n: any) => n.pib_url === null));
  });

  await t.test('(b) a chain whose only nodes are seeds is absent', () => {
    const input = {
      chains: [
        {
          chain_id: 'CHAIN_SEEDS_ONLY',
          title: 'All Seed Chain',
          policy_chain_nodes: [
            { dispatch_id: 'DISP_001_A', pib_url: null, provenance: 'seed' },
            { dispatch_id: 'DISP_001_B', pib_url: null, provenance: 'seed' },
          ],
        },
        {
          chain_id: 'CHAIN_WITH_OBSERVED',
          title: 'Observed Chain',
          policy_chain_nodes: [
            {
              dispatch_id: 'REAL_001',
              pib_url: 'https://pib.gov.in/1',
              provenance: 'observed',
              step_order: 1,
            },
          ],
        },
      ],
      entities: [],
      volcanoRows: [],
      bossMcqs: [],
    };

    const payload = buildRadarPayloadV1(input);

    assert.strictEqual(payload.chains.length, 1);
    assert.strictEqual(payload.chains[0].chain_id, 'CHAIN_WITH_OBSERVED');
    assert.ok(!payload.chains.some((c: any) => c.chain_id === 'CHAIN_SEEDS_ONLY'));
  });

  await t.test('(c) topVolcanoNodes contains no node_id that is missing from volcanoRows', () => {
    const input = {
      chains: [],
      entities: [],
      volcanoRows: [
        {
          node_id: 'GS3.LIVE.OBSERVED',
          last_tested_year: 2021,
          recurrence_interval_avg: 2.0,
          news_count_2026: 5,
          volcano_index: 12.5,
          volcano_status: 'ERUPTING',
          syllabus_nodes: { paper: 'GS3', gloss: 'Live Observed Topic' },
        },
      ],
      bossMcqs: [],
    };

    const payload = buildRadarPayloadV1(input);

    assert.strictEqual(payload.topVolcanoNodes.length, 1);
    assert.strictEqual(payload.topVolcanoNodes[0].node_id, 'GS3.LIVE.OBSERVED');

    // Verify baseline IDs (like GS3.ECO.EXTERNAL, GS2.IR.BILATERAL) are absent unless present in volcanoRows
    const knownBaselines = [
      'GS3.ECO.EXTERNAL',
      'GS2.IR.BILATERAL',
      'GS3.SCI.IT_COMP',
      'GS3.ENV.POLLUTION',
      'GS3.DEF.MODERN',
    ];
    for (const bId of knownBaselines) {
      assert.ok(
        !payload.topVolcanoNodes.some((n: any) => n.node_id === bId),
        `Baseline node ${bId} must NOT be present when absent from volcanoRows`
      );
    }
  });

  await t.test('(d) a chain with boss_mcq_id not present in bossMcqs yields boss_mcq: null', () => {
    const input = {
      chains: [
        {
          chain_id: 'CHAIN_01_SEMICON_NEXUS',
          title: 'Semicon Nexus',
          boss_mcq_id: 'mcq-missing-uuid-999',
          policy_chain_nodes: [
            {
              dispatch_id: 'REAL_ISM_01',
              pib_url: 'https://pib.gov.in/ism1',
              provenance: 'observed',
              step_order: 1,
            },
          ],
        },
        {
          chain_id: 'CHAIN_02_GREEN_HYDROGEN',
          title: 'Green Hydrogen',
          boss_mcq_id: 'mcq-valid-uuid-123',
          policy_chain_nodes: [
            {
              dispatch_id: 'REAL_GH_01',
              pib_url: 'https://pib.gov.in/gh1',
              provenance: 'observed',
              step_order: 1,
            },
          ],
        },
      ],
      entities: [],
      volcanoRows: [],
      bossMcqs: [
        {
          id: 'mcq-valid-uuid-123',
          question: 'Consider the following statements regarding SIGHT...',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
        },
      ],
    };

    const payload = buildRadarPayloadV1(input);

    const missingChain = payload.chains.find((c: any) => c.chain_id === 'CHAIN_01_SEMICON_NEXUS');
    assert.ok(missingChain);
    // Crucial: Must be null, never falling back to CANONICAL_BOSS_MCQ_FALLBACKS['CHAIN_01_SEMICON_NEXUS']
    assert.strictEqual(missingChain.boss_mcq, null);

    const validChain = payload.chains.find((c: any) => c.chain_id === 'CHAIN_02_GREEN_HYDROGEN');
    assert.ok(validChain);
    assert.strictEqual(validChain.boss_mcq?.id, 'mcq-valid-uuid-123');
  });

  await t.test('(e) coverage.hidden_seed_nodes equals the count of dropped seed nodes', () => {
    const input = {
      chains: [
        {
          chain_id: 'CHAIN_MIXED_1',
          policy_chain_nodes: [
            { dispatch_id: 'DISP_01', pib_url: null, provenance: 'seed' }, // dropped
            { dispatch_id: 'DISP_02', pib_url: 'https://url', provenance: 'seed' }, // dropped
            { dispatch_id: 'REAL_01', pib_url: 'https://url', provenance: 'observed' }, // kept
          ],
        },
        {
          chain_id: 'CHAIN_SEEDS_ONLY',
          policy_chain_nodes: [
            { dispatch_id: 'DISP_03', pib_url: null, provenance: 'seed' }, // dropped
            { dispatch_id: 'DISP_04', pib_url: null, provenance: 'seed' }, // dropped
            { dispatch_id: 'DISP_05', pib_url: null, provenance: 'seed' }, // dropped
          ],
        },
      ],
      entities: [],
      volcanoRows: [],
      bossMcqs: [],
    };

    const payload = buildRadarPayloadV1(input);

    // Total nodes across input: 6 nodes.
    // Kept: 1 (REAL_01).
    // Dropped seed nodes: 5 (DISP_01, DISP_02, DISP_03, DISP_04, DISP_05).
    assert.strictEqual(payload.coverage.hidden_seed_nodes, 5);
    assert.strictEqual(payload.coverage.observed_nodes, 1);
    assert.strictEqual(payload.coverage.chains_shown, 1);
    assert.strictEqual(typeof payload.coverage.generated_at, 'string');
  });

  await t.test('isObservedNode helper edge cases', () => {
    assert.strictEqual(isObservedNode(null), false);
    assert.strictEqual(isObservedNode(undefined), false);
    assert.strictEqual(isObservedNode({ dispatch_id: 'DISP_123', pib_url: 'https://pib' }), false);
    assert.strictEqual(isObservedNode({ dispatch_id: 'REAL_123', pib_url: null }), false);
    assert.strictEqual(isObservedNode({ dispatch_id: 'REAL_123', pib_url: '' }), false);
    assert.strictEqual(isObservedNode({ dispatch_id: 'REAL_123', pib_url: '   ' }), false);
    assert.strictEqual(isObservedNode({ dispatch_id: 'REAL_123', pib_url: 'https://pib', provenance: 'seed' }), false);
    assert.strictEqual(isObservedNode({ dispatch_id: 'REAL_123', pib_url: 'https://pib', provenance: 'observed' }), true);
  });
});
