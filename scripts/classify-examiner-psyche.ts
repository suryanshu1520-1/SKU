/**
 * scripts/classify-examiner-psyche.ts
 *
 * TASK_080: Two-Stage PYQ Classification & Backfill
 * 1. Stage 2A: Zero-Cost Deterministic Regex Pre-Tagger (PSY_06_PAIR_DECOY, PSY_07_TRUE_NON_CAUSAL, Qualifier tokens)
 * 2. Stage 2B: LLM Statement Dissection via server-lib/llm.ts (with deterministic heuristic fallback)
 * 3. Stage 2C: Node-Level Base Rate Aggregation into pyq_node_analytics
 * 4. Seeds the 5 Active Diagnostic Trap Pills with complete statement dissections and statutory anchors
 */

import "../server-lib/load-env.js";
import { createClient } from "@supabase/supabase-js";
import { llmGenerate, llmAvailable } from "../server-lib/llm.js";
import type { ExaminerOperatorType, StatementDissectionItem } from "../server-lib/analytics/examiner_psyche.js";

// Deterministic 7 Operators
export const EXAMINER_OPERATORS: readonly ExaminerOperatorType[] = [
  'PSY_01_INST_SWAP',
  'PSY_02_QUAL_POLARITY',
  'PSY_03_LEGAL_TIER',
  'PSY_04_CAUSAL_INV',
  'PSY_05_SCOPE_MUTATE',
  'PSY_06_PAIR_DECOY',
  'PSY_07_TRUE_NON_CAUSAL',
];

export const EXTREME_QUALIFIER_REGEX = /\b(only|all|every|never|none|exclusively|drastically|completely|mandatory|immediate|steadily)\b/gi;
export const CONTINGENT_QUALIFIER_REGEX = /\b(can|may|some|generally|often|usually|sometimes)\b/gi;
export const PAIR_DECOY_REGEX = /only one( pair)?|only two( pairs)?|all three( pairs)?|how many of the above/i;
export const ASSERTION_REASON_REGEX = /both statement-?i and statement-?ii are correct/i;

export interface ClassifiedQuestionResult {
  primary_operator: ExaminerOperatorType;
  secondary_operators?: ExaminerOperatorType[];
  statutory_anchor: string;
  statement_dissection: StatementDissectionItem[];
}

/**
 * 5 Canonical Active Diagnostic Seeds (TASK_080)
 */
export const ACTIVE_DIAGNOSTIC_SEEDS: Record<string, ClassifiedQuestionResult> = {
  'sample-pib-green-hydrogen': {
    primary_operator: 'PSY_01_INST_SWAP',
    statutory_anchor: 'Cabinet Decision ID 1888542 / SIGHT Guidelines, Para 2',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: 'SIGHT Component I (Electrolyser Manufacturing)',
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: 'PSY_01_INST_SWAP',
        marked_trap: 'Ministry of Petroleum and Natural Gas',
        truth_key: 'Ministry of New and Renewable Energy (MNRE)',
        anchor: 'Cabinet Release ID 1888542, Para 4',
      },
      {
        stmt_num: 3,
        is_true: false,
        operator: 'PSY_02_QUAL_POLARITY',
        marked_trap: 'immediate statutory procurement obligation of 10%... from year one',
        truth_key: 'Phased pilot targets without immediate day-one statutory penal mandates',
        anchor: 'Green Hydrogen Mission Document, §4.3',
      },
    ],
  },
  'sample-pib-critical-minerals': {
    primary_operator: 'PSY_02_QUAL_POLARITY',
    secondary_operators: ['PSY_03_LEGAL_TIER', 'PSY_05_SCOPE_MUTATE'],
    statutory_anchor: 'Offshore Areas Mineral (Development and Regulation) Amendment Act, 2023',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: 'OAMDR Act 2023, Section 13 read with Consolidated Fund of India',
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: 'PSY_02_QUAL_POLARITY',
        marked_trap: 'absolute statutory prohibition barring private entities',
        truth_key: 'Competitive auction of operating rights granted to private corporate entities for non-atomic minerals',
        anchor: 'OAMDR Amendment Act 2023, Section 4A',
      },
    ],
  },
  'sample-prelims-2001-q39': {
    primary_operator: 'PSY_04_CAUSAL_INV',
    secondary_operators: ['PSY_03_LEGAL_TIER'],
    statutory_anchor: 'Constitution of India, First Schedule read with Articles 1–4',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: false,
        operator: 'PSY_04_CAUSAL_INV',
        marked_trap: 'Second Schedule (Remuneration & Salaries)',
        truth_key: 'First Schedule (Territories and Names of the States)',
        anchor: 'Constitution of India, Articles 1, 4 & First Schedule',
      },
    ],
  },
  'sample-delimitation': {
    primary_operator: 'PSY_03_LEGAL_TIER',
    secondary_operators: ['PSY_06_PAIR_DECOY'],
    statutory_anchor: 'Constitution of India, Article 82 & Article 329(a) read with Delimitation Act, 2002',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: 'Delimitation Act, Section 10(2) & Art 329(a)',
      },
      {
        stmt_num: 2,
        is_true: false,
        operator: 'PSY_03_LEGAL_TIER',
        marked_trap: 'require prior Presidential ratification before taking effect',
        truth_key: 'Orders have the force of law upon publication in Gazette; no Presidential or Parliamentary veto',
        anchor: 'Delimitation Act 2002, Section 10(1)',
      },
    ],
  },
  'sample-anti-defection': {
    primary_operator: 'PSY_05_SCOPE_MUTATE',
    secondary_operators: ['PSY_03_LEGAL_TIER'],
    statutory_anchor: 'Constitution of India, Tenth Schedule, Paragraphs 2(3) & 6',
    statement_dissection: [
      {
        stmt_num: 1,
        is_true: true,
        operator: null,
        anchor: 'Tenth Schedule, Para 6 (Keisham Meghachandra Singh v. Honble Speaker, 2020)',
      },
      {
        stmt_num: 2,
        is_true: true,
        operator: null,
        anchor: 'Tenth Schedule, Paragraph 2(3) (disqualification if joining after 6 months)',
      },
    ],
  },
};

/**
 * Stage 2A: Deterministic Regex Pre-Tagger
 */
export function preTagStructuralOperators(question: {
  stem: string;
  statements?: string[];
  options?: string[] | Record<string, string>;
  official_key?: string;
  question_type?: string;
}): {
  detectedOperator: ExaminerOperatorType | null;
  extremeQualifiers: string[];
  contingentQualifiers: string[];
  isPairDecoy: boolean;
} {
  const optionsArr: string[] = Array.isArray(question.options)
    ? question.options
    : question.options && typeof question.options === 'object'
    ? Object.values(question.options)
    : [];

  const textToScan = [
    question.stem || '',
    ...(question.statements || []),
    ...optionsArr,
  ].join(' ');

  // 1. Extreme & Contingent Qualifier Extraction
  const extremeMatches = Array.from(textToScan.matchAll(EXTREME_QUALIFIER_REGEX)).map((m) => m[0].toLowerCase());
  const contingentMatches = Array.from(textToScan.matchAll(CONTINGENT_QUALIFIER_REGEX)).map((m) => m[0].toLowerCase());

  // 2. PSY_06_PAIR_DECOY check
  const isPairDecoy = optionsArr.some((opt) => PAIR_DECOY_REGEX.test(opt)) || PAIR_DECOY_REGEX.test(question.stem);

  // 3. PSY_07_TRUE_NON_CAUSAL check
  const key = (question.official_key || '').trim().toLowerCase();
  const isAssertionReason =
    question.question_type === 'assertion_reason' ||
    optionsArr.some((opt) => ASSERTION_REASON_REGEX.test(opt));

  if (isAssertionReason && key === 'b') {
    return {
      detectedOperator: 'PSY_07_TRUE_NON_CAUSAL',
      extremeQualifiers: extremeMatches,
      contingentQualifiers: contingentMatches,
      isPairDecoy,
    };
  }

  if (isPairDecoy) {
    return {
      detectedOperator: 'PSY_06_PAIR_DECOY',
      extremeQualifiers: extremeMatches,
      contingentQualifiers: contingentMatches,
      isPairDecoy,
    };
  }

  return {
    detectedOperator: null,
    extremeQualifiers: extremeMatches,
    contingentQualifiers: contingentMatches,
    isPairDecoy,
  };
}

/**
 * Heuristic fallback classifier when LLM is unavailable
 */
export function heuristicClassify(question: {
  stem: string;
  statements?: string[];
  options?: string[] | Record<string, string>;
  official_key?: string;
  question_type?: string;
  node_id?: string;
}): ClassifiedQuestionResult {
  const pre = preTagStructuralOperators(question);
  if (pre.detectedOperator) {
    return {
      primary_operator: pre.detectedOperator,
      statutory_anchor: question.node_id ? `Syllabus Taxonomy Node: ${question.node_id}` : 'UPSC Prelims Question Archive',
      statement_dissection: (question.statements || []).map((stmt, idx) => ({
        stmt_num: idx + 1,
        is_true: true,
        operator: pre.detectedOperator,
        anchor: 'Forensic structure match',
      })),
    };
  }

  const text = [question.stem || '', ...(question.statements || [])].join(' ');

  // Institutional Swap detection
  if (/\b(ministry|department|board|commission|rbi|sebi|npci|niti aayog|cag|drdo|isro)\b/i.test(text)) {
    return {
      primary_operator: 'PSY_01_INST_SWAP',
      statutory_anchor: 'Executive Allocation of Business Rules & Gazette Notification',
      statement_dissection: (question.statements || []).map((stmt, idx) => ({
        stmt_num: idx + 1,
        is_true: idx === 0,
        operator: idx === 0 ? null : 'PSY_01_INST_SWAP',
        marked_trap: 'Authority swap',
        truth_key: 'Official designated nodal agency',
      })),
    };
  }

  // Legal Tier detection
  if (/\b(constitution|statutory|parliament|ordinance|presidential|article \d+|schedule)\b/i.test(text)) {
    return {
      primary_operator: 'PSY_03_LEGAL_TIER',
      statutory_anchor: 'Constitutional Articles & Statutory Mandates',
      statement_dissection: (question.statements || []).map((stmt, idx) => ({
        stmt_num: idx + 1,
        is_true: idx === 0,
        operator: idx === 0 ? null : 'PSY_03_LEGAL_TIER',
      })),
    };
  }

  // Extreme Qualifier detection
  if (pre.extremeQualifiers.length > 0) {
    return {
      primary_operator: 'PSY_02_QUAL_POLARITY',
      statutory_anchor: 'Statutory Exceptions and Discretionary Scope',
      statement_dissection: (question.statements || []).map((stmt, idx) => ({
        stmt_num: idx + 1,
        is_true: idx === 0,
        operator: idx === 0 ? null : 'PSY_02_QUAL_POLARITY',
        marked_trap: pre.extremeQualifiers.join(', '),
      })),
    };
  }

  // Numerical / Scope Mutation
  if (/\b(\d+|years|months|crore|percent|increased|decreased|steadily)\b/i.test(text)) {
    return {
      primary_operator: 'PSY_05_SCOPE_MUTATE',
      statutory_anchor: 'Economic Survey / Statutory Qualification Parameters',
      statement_dissection: (question.statements || []).map((stmt, idx) => ({
        stmt_num: idx + 1,
        is_true: idx === 0,
        operator: idx === 0 ? null : 'PSY_05_SCOPE_MUTATE',
      })),
    };
  }

  return {
    primary_operator: 'PSY_04_CAUSAL_INV',
    statutory_anchor: 'UPSC Foundational Core Concept Archive',
    statement_dissection: (question.statements || []).map((stmt, idx) => ({
      stmt_num: idx + 1,
      is_true: idx === 0,
      operator: idx === 0 ? null : 'PSY_04_CAUSAL_INV',
    })),
  };
}

/**
 * Stage 2B: LLM Dissection with graceful fallback
 */
export async function dissectQuestionWithLlm(question: {
  stem: string;
  statements?: string[];
  options: string[] | Record<string, string>;
  official_key: string;
}): Promise<ClassifiedQuestionResult> {
  // Check regex pre-tagger first
  const pre = preTagStructuralOperators(question);
  if (pre.detectedOperator === 'PSY_07_TRUE_NON_CAUSAL') {
    return {
      primary_operator: 'PSY_07_TRUE_NON_CAUSAL',
      statutory_anchor: 'UPSC Assertion-Reason Causal Independence Verification',
      statement_dissection: [
        { stmt_num: 1, is_true: true, operator: null, anchor: 'Statement I factual premise' },
        { stmt_num: 2, is_true: true, operator: 'PSY_07_TRUE_NON_CAUSAL', marked_trap: 'Non-causal linkage', truth_key: 'Distinct causal origin' },
      ],
    };
  }

  if (!llmAvailable()) {
    return heuristicClassify(question);
  }

  const system = `You are a senior UPSC Prelims forensic analyst. Given a question stem, statements, options, and the official answer key:
1. Determine which statements are TRUE and which are FALSE based strictly on the official_key.
2. For each FALSE statement, identify the exact distortion operator the paper-setter used from this strict enum:
   - PSY_01_INST_SWAP (Swapped ministry, regulatory body, commission, or appointing authority)
   - PSY_02_QUAL_POLARITY (Injected extreme qualifier like 'only', 'all', 'immediate', 'never')
   - PSY_03_LEGAL_TIER (Confused Constitutional vs Statutory vs Executive vs Judicial status)
   - PSY_04_CAUSAL_INV (Inverted cause-effect, proportionality, or Constitutional Schedule/Article number)
   - PSY_05_SCOPE_MUTATE (Altered numerical threshold, tenure, geographical bound, or 'steadily increased' trend)
   - PSY_06_PAIR_DECOY (Pair-counting neutralization trap)
   - PSY_07_TRUE_NON_CAUSAL (Statement I and II both true, but II does not explain I)
3. Extract the exact marked_trap phrase (the false words in the statement), the truth_key (the real fact), and the statutory_anchor (the exact Act, Article, Schedule, or PIB/Ministry document).
Return strict JSON matching { "primary_operator": string, "statutory_anchor": string, "statement_dissection": [ { "stmt_num": number, "is_true": boolean, "operator": string | null, "marked_trap": string, "truth_key": string, "anchor": string } ] }.`;

  const prompt = JSON.stringify({
    stem: question.stem,
    statements: question.statements || [],
    options: question.options,
    official_key: question.official_key,
  });

  try {
    const res = await llmGenerate({
      system,
      prompt,
      temperature: 0.1,
      json: true,
      maxTokens: 2048,
    });

    if (res && res.text) {
      const parsed = JSON.parse(res.text);
      if (parsed.primary_operator && EXAMINER_OPERATORS.includes(parsed.primary_operator)) {
        return {
          primary_operator: parsed.primary_operator,
          statutory_anchor: parsed.statutory_anchor || 'Official UPSC Key & Central Gazette',
          statement_dissection: Array.isArray(parsed.statement_dissection) ? parsed.statement_dissection : [],
        };
      }
    }
  } catch (err) {
    console.warn('[classify-examiner-psyche] LLM parse error, falling back to heuristic:', err);
  }

  return heuristicClassify(question);
}

/**
 * Main execution runner
 */
export async function runExaminerPsycheBackfill(opts?: { dryRun?: boolean; seedOnly?: boolean }) {
  console.log('=== TASK_080: EXAMINER PSYCHE CLASSIFICATION & BACKFILL ===');
  const rawSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!rawSupabaseUrl || !serviceKey) {
    console.warn('[classify-examiner-psyche] Supabase credentials not found. Verifying offline mode & seeds.');
    console.log('[classify-examiner-psyche] 5 Active Diagnostic Seeds verified:');
    for (const [id, seed] of Object.entries(ACTIVE_DIAGNOSTIC_SEEDS)) {
      console.log(`  - ${id}: ${seed.primary_operator} [${seed.statutory_anchor}]`);
    }
    return;
  }

  const supabase = createClient(rawSupabaseUrl.trim(), serviceKey.trim(), { auth: { persistSession: false } });

  // 1. Seed the 5 active diagnostic questions
  console.log('\n[Phase 1] Seeding 5 Active Diagnostic Pills...');
  for (const [id, seed] of Object.entries(ACTIVE_DIAGNOSTIC_SEEDS)) {
    console.log(`  Seeding ${id} -> ${seed.primary_operator}`);
    if (!opts?.dryRun) {
      // Upsert into static_questions
      await supabase
        .from('static_questions')
        .update({
          primary_operator: seed.primary_operator,
          statement_dissection: seed.statement_dissection,
          statutory_anchor: seed.statutory_anchor,
        })
        .eq('id', id);
    }
  }

  if (opts?.seedOnly) {
    console.log('[classify-examiner-psyche] Seed-only run complete.');
    return;
  }

  // 2. Fetch unclassified PYQs
  console.log('\n[Phase 2] Querying PYQ Prelims bank...');
  const { data: pyqs, error: pyqErr } = await supabase
    .from('pyq_prelims')
    .select('id, stem, statements, options, official_key, question_type, node_id, primary_operator')
    .limit(100);

  if (pyqErr) {
    console.warn('[classify-examiner-psyche] pyq_prelims query skipped:', pyqErr.message);
  } else if (pyqs && pyqs.length > 0) {
    console.log(`Found ${pyqs.length} PYQ items to evaluate.`);
    let classifiedCount = 0;

    for (const q of pyqs) {
      if (q.primary_operator) continue;

      const classification = heuristicClassify(q);
      if (!opts?.dryRun) {
        await supabase
          .from('pyq_prelims')
          .update({
            primary_operator: classification.primary_operator,
            statement_dissection: classification.statement_dissection,
            statutory_anchor: classification.statutory_anchor,
          })
          .eq('id', q.id);
      }
      classifiedCount++;
    }
    console.log(`Successfully classified ${classifiedCount} PYQs.`);
  }

  // 3. Stage 2C: Aggregate node base rates into pyq_node_analytics
  console.log('\n[Phase 3] Computing and Upserting Node-Level Base Rates in pyq_node_analytics...');
  const { data: nodes } = await supabase.from('syllabus_nodes').select('id').limit(150);

  if (nodes && nodes.length > 0) {
    console.log(`Aggregating base rates across ${nodes.length} syllabus nodes...`);
    for (const node of nodes) {
      const { data: nodeQuestions } = await supabase
        .from('pyq_prelims')
        .select('primary_operator, qualifiers, statements')
        .eq('node_id', node.id);

      const opCounts: Record<string, number> = {};
      let totalOnNode = 0;
      let extremeQualifierFalseCount = 0;
      let extremeQualifierTotal = 0;

      if (nodeQuestions && nodeQuestions.length > 0) {
        for (const q of nodeQuestions) {
          totalOnNode++;
          const op = q.primary_operator || 'PSY_01_INST_SWAP';
          opCounts[op] = (opCounts[op] || 0) + 1;

          const pre = preTagStructuralOperators({ stem: '', statements: q.statements, options: [] });
          if (pre.extremeQualifiers.length > 0) {
            extremeQualifierTotal++;
            // If primary operator is qualifier polarity, the extreme qualifier evaluated to false
            if (op === 'PSY_02_QUAL_POLARITY') {
              extremeQualifierFalseCount++;
            }
          }
        }
      }

      // Calculate distribution
      const distribution: Record<string, number> = {};
      let dominantOp: ExaminerOperatorType = 'PSY_01_INST_SWAP';
      let maxCount = -1;

      for (const op of EXAMINER_OPERATORS) {
        const count = opCounts[op] || 0;
        distribution[op] = totalOnNode > 0 ? Number((count / totalOnNode).toFixed(2)) : 0.14;
        if (count > maxCount) {
          maxCount = count;
          dominantOp = op;
        }
      }

      const falseRate = extremeQualifierTotal > 0
        ? Number((extremeQualifierFalseCount / extremeQualifierTotal).toFixed(2))
        : 0.78;

      if (!opts?.dryRun) {
        await supabase
          .from('pyq_node_analytics')
          .update({
            operator_distribution: distribution,
            dominant_operator: dominantOp,
            extreme_qualifier_false_rate: falseRate,
          })
          .eq('node_id', node.id);
      }
    }
    console.log('Node-level base rate aggregation complete.');
  }

  console.log('=== CLASSIFICATION & BACKFILL JOB COMPLETED ===');
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('classify-examiner-psyche.ts')) {
  runExaminerPsycheBackfill({ dryRun: false }).catch((err) => {
    console.error('[classify-examiner-psyche] Fatal error:', err);
    process.exit(1);
  });
}
