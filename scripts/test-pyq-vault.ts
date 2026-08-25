/**
 * scripts/test-pyq-vault.ts
 *
 * Automated Test Suite & Integrity Validation Harness for the 25-Year UPSC PYQ Relational Vault
 * and The Examiner Psyche Analytics Engine.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import {
  getParetoAndDroughtAnalysis,
  getQualifierTrapCorrelation,
  getFormatShiftTracking,
  getGs4AndEssayDialecticalAxes,
  getDirectiveVerbScoringMatrix,
} from "../server-lib/analytics/examiner_psyche.js";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ixngfxaerlkkcacrbdgc.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, errorDetail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (errorDetail) console.error(`    Detail: ${errorDetail}`);
    failed++;
  }
}

async function runTestHarness() {
  console.log("=".repeat(80));
  console.log("  TARK INTELLIGENCE — 25-YEAR PYQ VAULT & EXAMINER PSYCHE TEST HARNESS");
  console.log("=".repeat(80));

  // 1. Syllabus Nodes Integrity
  console.log("\n[Test Suite 1: Syllabus Nodes Ontology Integrity]");
  const { count: nodeCount, data: nodes, error: nodeErr } = await supabase
    .from("syllabus_nodes")
    .select("id, paper, gloss", { count: "exact" });

  assert(!nodeErr && (nodeCount || 0) >= 130, "Syllabus ontology has at least 130 nodes", `Found ${nodeCount}`);
  const hasNoEmptyGloss = (nodes || []).every(n => n.gloss && n.gloss.length > 10);
  assert(hasNoEmptyGloss, "All syllabus nodes possess rich pedagogical glosses");

  // 2. Prelims Questions Guardrails
  console.log("\n[Test Suite 2: Prelims Relational Integrity & Guardrails]");
  const { count: prelimsCount, data: prelimsSample } = await supabase
    .from("pyq_prelims")
    .select("id, year, node_id, official_key, stem, options, is_dropped", { count: "exact" })
    .limit(100);

  assert((prelimsCount || 0) >= 900, "Prelims question corpus exceeds 900 verified items", `Found ${prelimsCount}`);
  
  // Zero Null-Key Guardrail
  const { count: nullNodePrelims } = await supabase
    .from("pyq_prelims")
    .select("id", { count: "exact", head: true })
    .is("node_id", null);
  assert(nullNodePrelims === 0, "Zero Null-Key Guardrail: 0 Prelims questions have NULL node_id", `Found ${nullNodePrelims} nulls`);

  // Valid Official Keys
  const validKeys = (prelimsSample || []).every(p => ["a", "b", "c", "d", "dropped"].includes(p.official_key));
  assert(validKeys, "All sampled Prelims questions contain valid official keys ('a', 'b', 'c', 'd', 'dropped')");

  // 3. Mains Questions Guardrails
  console.log("\n[Test Suite 3: Mains Prompts, Directive Verbs & 3-Tier Rubrics]");
  const { count: mainsCount, data: mainsSample } = await supabase
    .from("pyq_mains")
    .select("id, year, paper, marks, prompt, directive_verb, node_id, rubric_level_1, rubric_level_2, rubric_level_3", { count: "exact" });

  assert((mainsCount || 0) >= 15, "Mains question repository populated with analytical prompts", `Found ${mainsCount}`);

  const hasCompleteRubrics = (mainsSample || []).every(m => m.rubric_level_1 && m.rubric_level_2 && m.rubric_level_3);
  assert(hasCompleteRubrics, "All Mains questions possess 3-tier evaluation rubrics (Level 1, Level 2, Level 3)");

  const { count: nullNodeMains } = await supabase
    .from("pyq_mains")
    .select("id", { count: "exact", head: true })
    .is("node_id", null);
  assert(nullNodeMains === 0, "Zero Null-Key Guardrail: 0 Mains questions have NULL node_id", `Found ${nullNodeMains} nulls`);

  // 4. Node Analytics & Drought Detection
  console.log("\n[Test Suite 4: Pareto Distribution & Drought Detection Engine]");
  const { count: analyticsCount, data: analyticsSample } = await supabase
    .from("pyq_node_analytics")
    .select("*", { count: "exact" });

  assert((analyticsCount || 0) >= 130, "Analytics computed for all syllabus nodes", `Found ${analyticsCount}`);
  
  const droughtNodes = (analyticsSample || []).filter(a => a.is_drought_topic);
  assert(droughtNodes.length > 0, "Drought detection correctly flags dormant low-recurrence topics", `Found ${droughtNodes.length} drought nodes`);

  // 5. Examiner Psyche Analytics Engine Module
  console.log("\n[Test Suite 5: Examiner Psyche Analytical Modules]");
  const paretoReport = await getParetoAndDroughtAnalysis();
  assert(paretoReport.paretoCoreNodes.length > 0, "Pareto Core 80/20 distribution successfully generated");

  const qualifierReport = await getQualifierTrapCorrelation();
  assert(qualifierReport.extremeQualifiers.length > 0 && qualifierReport.overallHeuristics.extremeFalseProbability > 80, "Qualifier trap correlation proves extreme qualifiers have >80% false rate");

  const shifts = await getFormatShiftTracking();
  assert(shifts.length === 4, "Format shift chronology tracks all 4 major historical exam eras (2001–2025)");

  const dialectics = await getGs4AndEssayDialecticalAxes();
  assert(dialectics.length >= 4, "GS-4 & Essay dialectical axes extraction successfully identifies core moral tensions");

  const rubrics = await getDirectiveVerbScoringMatrix();
  assert(rubrics.length >= 4, "Directive verb scoring matrix establishes cognitive mark allocations for all major command words");

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=".repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

runTestHarness().catch((err) => {
  console.error("Fatal test harness error:", err);
  process.exit(1);
});
