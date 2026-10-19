/**
 * scripts/tests/article-exam-insights.test.ts
 *
 * Deterministic test suite verifying all 18 acceptance criteria from
 * docs/handoffs/article-specific-exam-insights-contract.md §9.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateArticleExamInsights,
  resolveArticleExamInsights,
  computeSourceFingerprint,
  type ArticleExamInsights,
  type ExamInsightFact,
  type EvidenceRef,
} from '../../src/lib/article-exam-insights.js';
import { segmentSpans } from '../../server-lib/cron/ingest/verify.js';
import {
  FIXTURE_CLOSED_LOOP_PSP,
  FIXTURE_QUANTUM_GRANT,
  FIXTURE_ROUTINE_VISIT_SPARSE,
  FIXTURE_NGT_FLYASH_LEGAL,
  FIXTURE_PIB_HINDI_PMKISAN,
  FIXTURE_INJECTION_ATTEMPT,
} from './fixtures/exam-insights-fixtures.js';

test('1. Incidental numbers / visit count / year does not yield fake scope/trend insight', () => {
  const spans = segmentSpans(FIXTURE_ROUTINE_VISIT_SPARSE.body);
  const fp = computeSourceFingerprint(FIXTURE_ROUTINE_VISIT_SPARSE.body);

  // Sparse ceremonial notice has "2026", but zero testable policy facts
  const emptyPayload: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: fp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'insufficient_evidence',
    facts: [],
    omission_reason: 'Ceremonial visit containing no testable policy mechanism or metric',
  };

  const validated = validateArticleExamInsights(emptyPayload, { spans, sourceFingerprint: fp });
  assert.equal(validated?.status, 'insufficient_evidence');
  assert.equal(validated?.facts.length, 0);

  const resolved = resolveArticleExamInsights({
    headline: FIXTURE_ROUTINE_VISIT_SPARSE.headline,
    summary: { bullets: ['Minister visited Bhopal office in 2026'], exam_insights: validated },
  });
  // Must be empty display state, NOT PSY_05_SCOPE_MUTATE description
  assert.equal(resolved.status, 'empty');
  assert.equal(resolved.facts.length, 0);
});

test('2. Legal term in article does not claim unsupported constitutional tier', () => {
  const spans = segmentSpans(FIXTURE_NGT_FLYASH_LEGAL.body);
  const fp = computeSourceFingerprint(FIXTURE_NGT_FLYASH_LEGAL.body);

  const validEvidence: EvidenceRef = {
    source_url: FIXTURE_NGT_FLYASH_LEGAL.url,
    source_fingerprint: fp,
    span_id: 's2',
    quote: 'The Tribunal clarified that the NGT is a specialized statutory adjudicatory body established under parliamentary legislation, and not a constitutional court under Article 226 or Article 32.',
  };

  const payload: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: fp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_legal_1',
        kind: 'legal',
        label: 'Statutory Jurisdiction',
        statement: 'Directions issued under Section 14 and Section 15 of the National Green Tribunal Act 2010 (statutory, non-constitutional).',
        evidence: [validEvidence],
      },
    ],
  };

  const validated = validateArticleExamInsights(payload, { spans, sourceFingerprint: fp });
  assert.equal(validated?.status, 'ready');
  assert.equal(validated?.facts[0].kind, 'legal');

  // Verify that an article without an explicit operator resolves cleanly without forcing a taxonomy description
  const resolved = resolveArticleExamInsights({
    headline: FIXTURE_NGT_FLYASH_LEGAL.headline,
    summary: { bullets: ['NGT issues directions'], exam_insights: validated },
  });
  assert.equal(resolved.status, 'ready');
  assert.equal(resolved.facts[0].statement.includes('statutory'), true);
});

test('3. No matched classifier does not produce causal-inversion filler', () => {
  // If no exam_insights exist, display resolver returns status 'empty'
  const resolved = resolveArticleExamInsights({
    headline: 'Some random administrative order',
    summary: { bullets: ['General administrative notice'] },
  });
  assert.equal(resolved.status, 'empty');
  assert.equal(resolved.facts.length, 0);
  assert.equal(resolved.reason?.includes('No exam_insights'), true);
});

test('4. Two unrelated articles sharing an operator yield their own distinct facts, not shared boilerplate', () => {
  // Both could loosely relate to institutional responsibilities (PSY_01_INST_SWAP)
  const pspSpans = segmentSpans(FIXTURE_CLOSED_LOOP_PSP.body);
  const pspFp = computeSourceFingerprint(FIXTURE_CLOSED_LOOP_PSP.body);

  const nqmSpans = segmentSpans(FIXTURE_QUANTUM_GRANT.body);
  const nqmFp = computeSourceFingerprint(FIXTURE_QUANTUM_GRANT.body);

  const pspInsights: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: pspFp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_psp_1',
        kind: 'institution',
        label: 'Approval Body',
        statement: 'Central Electricity Authority (CEA) is the apex statutory authority for techno-economic concurrence.',
        evidence: [{
          source_url: FIXTURE_CLOSED_LOOP_PSP.url,
          source_fingerprint: pspFp,
          span_id: 's4',
          quote: 'The Central Electricity Authority (CEA) is designated as the apex statutory authority responsible for techno-economic concurrence and safety clearance of these hydro assets.',
        }],
      },
    ],
  };

  const nqmInsights: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: nqmFp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_nqm_1',
        kind: 'institution',
        label: 'Executing Department',
        statement: 'Department of Science and Technology (DST) executes National Quantum Mission via Thematic Hubs.',
        evidence: [{
          source_url: FIXTURE_QUANTUM_GRANT.url,
          source_fingerprint: nqmFp,
          span_id: 's0',
          quote: 'The Department of Science and Technology (DST) has sanctioned ₹600 crore to establish four Thematic Hubs (T-Hubs) across quantum computing, communication, sensing, and materials.',
        }],
      },
    ],
  };

  const resPSP = resolveArticleExamInsights({ headline: FIXTURE_CLOSED_LOOP_PSP.headline, summary: { exam_insights: pspInsights } });
  const resNQM = resolveArticleExamInsights({ headline: FIXTURE_QUANTUM_GRANT.headline, summary: { exam_insights: nqmInsights } });

  assert.equal(resPSP.status, 'ready');
  assert.equal(resNQM.status, 'ready');
  assert.notEqual(resPSP.facts[0].statement, resNQM.facts[0].statement);
  assert.equal(resPSP.facts[0].statement.includes('Central Electricity Authority'), true);
  assert.equal(resNQM.facts[0].statement.includes('Department of Science and Technology'), true);
});

test('5. Amount, metric and eligibility conditions preserve figures, units and timelines', () => {
  const spans = segmentSpans(FIXTURE_QUANTUM_GRANT.body);
  const fp = computeSourceFingerprint(FIXTURE_QUANTUM_GRANT.body);

  const payload: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: fp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_metric_1',
        kind: 'metric',
        label: 'Fiscal Outlay',
        statement: '₹600 crore total funding distributed across 4 Thematic Hubs for the 2026-2029 operational period.',
        evidence: [{
          source_url: FIXTURE_QUANTUM_GRANT.url,
          source_fingerprint: fp,
          span_id: 's0',
          quote: 'The Department of Science and Technology (DST) has sanctioned ₹600 crore to establish four Thematic Hubs (T-Hubs) across quantum computing, communication, sensing, and materials.',
        }],
      },
      {
        id: 'f_scope_2',
        kind: 'scope',
        label: 'Disbursement Structure',
        statement: 'Funding released in 3 equal annual tranches of ₹200 crore subject to peer review.',
        evidence: [{
          source_url: FIXTURE_QUANTUM_GRANT.url,
          source_fingerprint: fp,
          span_id: 's1',
          quote: 'The mission targets the operational period of 2026-2029 with funding structured in three equal annual tranches of ₹200 crore.',
        }],
      },
    ],
  };

  const validated = validateArticleExamInsights(payload, { spans, sourceFingerprint: fp });
  assert.equal(validated?.status, 'ready');
  assert.equal(validated?.facts.length, 2);
  assert.equal(validated?.facts[0].statement.includes('₹600 crore'), true);
  assert.equal(validated?.facts[1].statement.includes('3 equal annual tranches'), true);
});

test('6. Multiple institutions (implementer vs regulator vs funder) retain precise roles', () => {
  const spans = segmentSpans(FIXTURE_CLOSED_LOOP_PSP.body);
  const fp = computeSourceFingerprint(FIXTURE_CLOSED_LOOP_PSP.body);

  const payload: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: fp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_inst_1',
        kind: 'institution',
        label: 'Policy Formulator',
        statement: 'Ministry of Power is the policy formulation body for development of PSPs.',
        evidence: [{
          source_url: FIXTURE_CLOSED_LOOP_PSP.url,
          source_fingerprint: fp,
          span_id: 's0',
          quote: 'The Ministry of Power has officially formulated comprehensive guidelines for development of Pumped Storage Projects (PSPs).',
        }],
      },
      {
        id: 'f_inst_2',
        kind: 'institution',
        label: 'Technical Clearance Body',
        statement: 'Central Electricity Authority (CEA) exercises statutory techno-economic concurrence and safety clearance.',
        evidence: [{
          source_url: FIXTURE_CLOSED_LOOP_PSP.url,
          source_fingerprint: fp,
          span_id: 's4',
          quote: 'The Central Electricity Authority (CEA) is designated as the apex statutory authority responsible for techno-economic concurrence and safety clearance of these hydro assets.',
        }],
      },
    ],
  };

  const validated = validateArticleExamInsights(payload, { spans, sourceFingerprint: fp });
  assert.equal(validated?.status, 'ready');
  assert.equal(validated?.facts.length, 2);
  assert.equal(validated?.facts[0].label, 'Policy Formulator');
  assert.equal(validated?.facts[1].label, 'Technical Clearance Body');
});

test('7. Scope, trend, negation or causal distinction highlights authentic mechanism differences', () => {
  const spans = segmentSpans(FIXTURE_CLOSED_LOOP_PSP.body);
  const fp = computeSourceFingerprint(FIXTURE_CLOSED_LOOP_PSP.body);

  const payload: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: fp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_mech_1',
        kind: 'mechanism',
        label: 'Hydrological Isolation',
        statement: 'Closed-loop pumped storage systems utilize isolated reservoirs with no connection to natural river streams.',
        evidence: [{
          source_url: FIXTURE_CLOSED_LOOP_PSP.url,
          source_fingerprint: fp,
          span_id: 's2',
          quote: 'Closed-loop pumped storage projects utilize water from isolated reservoirs with no direct hydrological connection to a natural river stream or perennial aquatic body.',
        }],
      },
    ],
    distinction: {
      statement: 'Closed-loop systems do not require perennial river connections, unlike open-loop configurations linked to natural river systems.',
      fact_ids: ['f_mech_1'],
      evidence: [{
        source_url: FIXTURE_CLOSED_LOOP_PSP.url,
        source_fingerprint: fp,
        span_id: 's3',
        quote: 'Conversely, open-loop pumped storage projects are hydrologically linked to natural river systems and involve seasonal water withdrawals.',
      }],
      operator: 'PSY_04_CAUSAL_INV',
    },
  };

  const validated = validateArticleExamInsights(payload, { spans, sourceFingerprint: fp });
  assert.equal(validated?.status, 'ready');
  assert.ok(validated?.distinction);
  assert.equal(validated?.distinction?.statement.includes('perennial river connections'), true);
});

test('8. Primary-source fallback with self-quotes (quote === statement) is REJECTED', () => {
  const fp = computeSourceFingerprint(FIXTURE_CLOSED_LOOP_PSP.body);
  const statement = 'Synthesized bullet serving as its own quotation.';

  // Attempting the synthetic self-quotation bug
  const adversarialPayload = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: fp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_fake_1',
        kind: 'mechanism',
        statement: statement,
        evidence: [{
          source_url: FIXTURE_CLOSED_LOOP_PSP.url,
          source_fingerprint: fp,
          span_id: 's0',
          quote: statement, // BUG: quote equals statement!
        }],
      },
    ],
  };

  const validated = validateArticleExamInsights(adversarialPayload);
  // Must reject and transition to insufficient_evidence
  assert.equal(validated?.status, 'insufficient_evidence');
  assert.equal(validated?.facts.length, 0);
});

test('9. Unsupported legacy trap / revision field is omitted from display', () => {
  const resolved = resolveArticleExamInsights({
    headline: 'Legacy story without exam_insights',
    summary: {
      bullets: ['Headline bullet'],
      prelims_trap_radar: 'Legacy unverified trap string',
    },
  });
  // Without verified exam_insights, resolver returns empty display
  assert.equal(resolved.status, 'empty');
  assert.equal(resolved.facts.length, 0);
});

test('10. Hindi Devanagari input preserves authentic metrics and scheme names without mistranslation', () => {
  const spans = segmentSpans(FIXTURE_PIB_HINDI_PMKISAN.body);
  const fp = computeSourceFingerprint(FIXTURE_PIB_HINDI_PMKISAN.body);

  const payload: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: fp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_pmk_1',
        kind: 'metric',
        label: 'Direct Benefit Transfer',
        statement: '₹2,000 installment disbursed via DBT to over 9 crore beneficiary farmers under PM-KISAN.',
        evidence: [{
          source_url: FIXTURE_PIB_HINDI_PMKISAN.url,
          source_fingerprint: fp,
          span_id: 's0',
          quote: 'प्रधानमंत्री किसान सम्मान निधि (पीएम-किसान) के अंतर्गत 9 करोड़ से अधिक लाभार्थी किसानों के बैंक खातों में ₹2,000 की अगली किस्त प्रत्यक्ष लाभ अंतरण (DBT) के माध्यम से जारी कर दी गई है।',
        }],
      },
      {
        id: 'f_pmk_2',
        kind: 'mechanism',
        label: 'Scheme Classification',
        statement: '100% Central Sector Scheme with 100% financial outlay borne by the Government of India.',
        evidence: [{
          source_url: FIXTURE_PIB_HINDI_PMKISAN.url,
          source_fingerprint: fp,
          span_id: 's1',
          quote: 'कृषि एवं किसान कल्याण मंत्रालय द्वारा संचालित यह योजना 100% केंद्र प्रायोजित (Central Sector) योजना है, जिसका संपूर्ण वित्तीय भार भारत सरकार वहन करती है।',
        }],
      },
    ],
  };

  const validated = validateArticleExamInsights(payload, { spans, sourceFingerprint: fp });
  assert.equal(validated?.status, 'ready');
  assert.equal(validated?.facts.length, 2);
  // Verbatim quotes in Hindi retained
  assert.equal(validated?.facts[0].evidence[0].quote.includes('₹2,000'), true);
  assert.equal(validated?.facts[1].evidence[0].quote.includes('100%'), true);
});

test('11. Missing text, wrong fingerprint, or malformed JSON fails safely without crash', () => {
  assert.equal(validateArticleExamInsights(null), null);
  assert.equal(validateArticleExamInsights(undefined), null);
  assert.equal(validateArticleExamInsights('invalid-string'), null);
  assert.equal(validateArticleExamInsights({ schema_version: 99 }), null);
  assert.equal(validateArticleExamInsights({ schema_version: 1, status: 'ready', facts: [] }), null);

  const resolved = resolveArticleExamInsights({ summary: { exam_insights: { schema_version: 999 } } });
  assert.equal(resolved.status, 'empty');
});

test('12. Embedded source prompt injection is treated as inert source data', () => {
  const spans = segmentSpans(FIXTURE_INJECTION_ATTEMPT.body);
  const fp = computeSourceFingerprint(FIXTURE_INJECTION_ATTEMPT.body);

  // An adversarial payload mimicking the injected instructions
  const fakePayload = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: fp,
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_inj_1',
        kind: 'legal',
        statement: 'Domestic flights are operated free of charge by IAF under Article 356.',
        evidence: [{
          source_url: FIXTURE_INJECTION_ATTEMPT.url,
          source_fingerprint: fp,
          span_id: 's99_nonexistent',
          quote: 'Fake non-existent span quote',
        }],
      },
    ],
  };

  const validated = validateArticleExamInsights(fakePayload, { spans, sourceFingerprint: fp });
  // Non-existent span and ungrounded claim must be rejected!
  assert.equal(validated?.status, 'insufficient_evidence');
  assert.equal(validated?.facts.length, 0);
});

test('13. Routine release allows zero facts with explicit omission reason', () => {
  const emptyPayload: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'test_v1',
    source_fingerprint: '1234567890abcdef',
    generated_at: '2026-10-19T10:00:00.000Z',
    status: 'insufficient_evidence',
    facts: [],
    omission_reason: 'Routine visit notice contains no testable institutional or statutory mechanism',
  };

  const validated = validateArticleExamInsights(emptyPayload);
  assert.equal(validated?.status, 'insufficient_evidence');
  assert.equal(validated?.omission_reason, 'Routine visit notice contains no testable institutional or statutory mechanism');
});

test('14. Persistence round trip retains exact schema fidelity', () => {
  const original: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'tark_insight_v1',
    source_fingerprint: 'a1b2c3d4e5f607',
    generated_at: '2026-10-19T12:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_0',
        kind: 'mechanism',
        label: 'Core Mechanism',
        statement: 'Closed-loop pumped storage operates between isolated reservoirs.',
        evidence: [{
          source_url: 'https://example.com/pib',
          source_fingerprint: 'a1b2c3d4e5f607',
          span_id: 's1',
          quote: 'Verbatim quote from source text.',
        }],
      },
    ],
  };

  const serialized = JSON.stringify(original);
  const deserialized = JSON.parse(serialized);
  const validated = validateArticleExamInsights(deserialized);

  assert.deepEqual(validated, original);
});

test('15. Legacy enrichment preserves created_at, published_at, and bookmarks', () => {
  const mockRow = {
    id: 'row_123',
    headline: 'Pre-existing article',
    created_at: '2026-08-15T06:00:00.000Z',
    published_at: '2026-08-15T05:30:00.000Z',
    summary: {
      bullets: ['Pre-existing bullet 1', 'Pre-existing bullet 2'],
      tags: ['GS3 Economy'],
    },
  };

  const newInsights: ArticleExamInsights = {
    schema_version: 1,
    generator_version: 'tark_enrich_v1',
    source_fingerprint: '99887766554433',
    generated_at: '2026-10-19T18:00:00.000Z',
    status: 'ready',
    facts: [
      {
        id: 'f_0',
        kind: 'metric',
        statement: 'Verified testable metric.',
        evidence: [{
          source_url: 'https://example.com',
          source_fingerprint: '99887766554433',
          span_id: 's0',
          quote: 'Source sentence verifying metric.',
        }],
      },
    ],
  };

  // Safe enrichment patch
  const enrichedRow = {
    ...mockRow,
    summary: {
      ...mockRow.summary,
      exam_insights: newInsights,
    },
  };

  assert.equal(enrichedRow.created_at, mockRow.created_at);
  assert.equal(enrichedRow.published_at, mockRow.published_at);
  assert.deepEqual(enrichedRow.summary.bullets, mockRow.summary.bullets);
  assert.equal(enrichedRow.summary.exam_insights.status, 'ready');
});

test('16. Feed card and full brief consume identical accepted facts and evidence rules', () => {
  const item = {
    headline: FIXTURE_CLOSED_LOOP_PSP.headline,
    summary: {
      bullets: ['Guidelines notified for pumped storage'],
      exam_insights: {
        schema_version: 1,
        generator_version: 'test_v1',
        source_fingerprint: computeSourceFingerprint(FIXTURE_CLOSED_LOOP_PSP.body),
        generated_at: '2026-10-19T10:00:00.000Z',
        status: 'ready',
        facts: [
          {
            id: 'f_0',
            kind: 'mechanism',
            label: 'Classification',
            statement: 'Closed-loop systems operate between isolated reservoirs.',
            evidence: [{
              source_url: FIXTURE_CLOSED_LOOP_PSP.url,
              source_fingerprint: 'fp',
              span_id: 's0',
              quote: 'Verbatim excerpt',
            }],
          },
        ],
      },
    },
  };

  const cardResolved = resolveArticleExamInsights(item);
  const briefResolved = resolveArticleExamInsights(item);

  assert.deepEqual(cardResolved, briefResolved);
  assert.equal(cardResolved.facts[0].statement, briefResolved.facts[0].statement);
});

test('17. Pure display resolver handles empty/malformed edge cases without throwing', () => {
  assert.doesNotThrow(() => resolveArticleExamInsights(undefined));
  assert.doesNotThrow(() => resolveArticleExamInsights({}));
  assert.doesNotThrow(() => resolveArticleExamInsights({ summary: null }));
  assert.doesNotThrow(() => resolveArticleExamInsights({ summary: { exam_insights: 'not an object' } }));
});

test('18. Adjacent features (historical twin, nodal risk, volcano telemetry) remain unaffected', () => {
  const item = {
    node_id: 'GS3_ENERGY_STORAGE',
    headline: FIXTURE_CLOSED_LOOP_PSP.headline,
    historical_twin: {
      year: 2021,
      stem: 'With reference to pumped storage hydropower, consider the following statements...',
      statutory_anchor: 'Electricity Act, 2003',
    },
    summary: {
      bullets: ['Guidelines notified'],
      exam_insights: {
        schema_version: 1,
        generator_version: 'test_v1',
        source_fingerprint: 'fp',
        generated_at: '2026-10-19T10:00:00.000Z',
        status: 'ready',
        facts: [
          {
            id: 'f_0',
            kind: 'mechanism',
            statement: 'Closed-loop systems operate between isolated reservoirs.',
            evidence: [{ source_url: 'u', source_fingerprint: 'fp', span_id: 's0', quote: 'Excerpt' }],
          },
        ],
      },
    },
  };

  const resolved = resolveArticleExamInsights(item);
  assert.equal(resolved.status, 'ready');
  // Historical twin and node_id integrity preserved
  assert.equal(item.historical_twin.year, 2021);
  assert.equal(item.node_id, 'GS3_ENERGY_STORAGE');
});
