---
task_id: "TASK_080"
title: "Build & Wire the Deterministic 'Examiner's Psyche' 7-Operator Engine Across All Rooms"
status: "ACTIVE"
priority: "P0_CRITICAL"
owner: "Antigravity"
created_at: "2026-10-15"
---

# TASK_080: Deterministic "Examiner's Psyche" 7-Operator Engine

## 1. Architectural Objective
Transform "Examiner's Psyche" from ungrounded LLM guesswork into a deterministic, empirically backed telemetry engine anchored to Tark's 25-year UPSC Prelims vault (2000–2025), 130-node syllabus ontology (`node_id`), and `+2.00 / −0.66` server grading pipeline.

Instead of trying to predict *which random news topic* UPSC will ask, this engine models **how the UPSC paper-setter mutates a true primary-source sentence into a legally defensible false statement** using 7 canonical Distortion Operators (`PSY_01` through `PSY_07`).

---

## 2. The 7 Canonical Examiner Distortion Operators

Every false statement or distractor in `pyq_prelims`, `static_questions`, and `current_affairs` trap MCQs must be classified into one of these 7 deterministic operators:

| Enum Value | Short Code | Operator Label | Structural Definition |
| :--- | :--- | :--- | :--- |
| `PSY_01_INST_SWAP` | `PSY_01` | **Nodal / Authority Swap** | Swaps the implementing Ministry, regulator, appointing authority, or committee (e.g., swapping *MNRE* with *Ministry of Petroleum & Natural Gas*, or *RBI* with *SEBI/NPCI*). |
| `PSY_02_QUAL_POLARITY` | `PSY_02` | **Extreme Qualifier Trap** | Injects absolute determiners/adverbs (*"only"*, *"all"*, *"never"*, *"drastically"*, *"immediate statutory obligation from year one"*) into a phased, conditional, or partial rule. |
| `PSY_03_LEGAL_TIER` | `PSY_03` | **Legal Tier Shift** | Misattributes the legal origin of a body or norm across *Constitutional*, *Statutory*, *Executive Resolution*, or *Judicial Doctrine* tiers (e.g., *"defined in the Constitution"*). |
| `PSY_04_CAUSAL_INV` | `PSY_04` | **Causal / Schedule Inversion** | Inverts a 2-variable relationship, constitutional schedule, or directional mechanism (e.g., swapping *1st Schedule* vs. *2nd Schedule*, or inverting bond-yield vs. interest-rate directionality). |
| `PSY_05_SCOPE_MUTATE` | `PSY_05` | **Scope / Trend Mutation** | Mutates numerical thresholds, tenures, eligibility bounds, or multi-year monotonicity (*"steadily increased over the last decade"* when the metric fluctuated). |
| `PSY_06_PAIR_DECOY` | `PSY_06` | **Pair-Matrix Neutralizer** | Uses the post-2023 *"Only one pair / Only two pairs / All three pairs"* structure specifically designed to neutralize single-statement `50:50` elimination. |
| `PSY_07_TRUE_NON_CAUSAL` | `PSY_07` | **True-Fact Non-Causal Decoy** | Both Statement-I and Statement-II are 100% factual truths, but Statement-II is *not* the correct causal explanation for Statement-I. |

---

## 3. Phase 1: Database Migration (`supabase/migrations/20261015_examiner_psyche_engine.sql`)

Create and apply the following idempotent SQL migration to declare the operator enum, extend the question and node analytics tables, and track user-level operator vulnerabilities and `50:50 Ledger` Expected Value (EV):

```sql
-- 1. Create the Deterministic 7-Operator Enum
DO $$ BEGIN
    CREATE TYPE examiner_operator_type AS ENUM (
        'PSY_01_INST_SWAP',
        'PSY_02_QUAL_POLARITY',
        'PSY_03_LEGAL_TIER',
        'PSY_04_CAUSAL_INV',
        'PSY_05_SCOPE_MUTATE',
        'PSY_06_PAIR_DECOY',
        'PSY_07_TRUE_NON_CAUSAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Extend pyq_prelims with Examiner Psyche Metadata
ALTER TABLE IF EXISTS pyq_prelims
    ADD COLUMN IF NOT EXISTS primary_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS statement_dissection JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS statutory_anchor TEXT;

-- 3. Extend static_questions (Test Arena & Diagnostic Pool)
ALTER TABLE IF EXISTS static_questions
    ADD COLUMN IF NOT EXISTS primary_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS statement_dissection JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS statutory_anchor TEXT,
    ADD COLUMN IF NOT EXISTS historical_twin_pyq_id TEXT REFERENCES pyq_prelims(id);

-- 4. Extend pyq_node_analytics with Empirical Operator Base Rates
ALTER TABLE IF EXISTS pyq_node_analytics
    ADD COLUMN IF NOT EXISTS operator_distribution JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS dominant_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS extreme_qualifier_false_rate FLOAT DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS contingent_qualifier_true_rate FLOAT DEFAULT 0.0;

-- 5. User Psyche Telemetry & 50:50 Ledger Table
CREATE TABLE IF NOT EXISTS user_psyche_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    question_id TEXT NOT NULL,
    node_id TEXT NOT NULL REFERENCES syllabus_nodes(id),
    operator_tested examiner_operator_type NOT NULL,
    selected_option TEXT NOT NULL CHECK (selected_option IN ('a', 'b', 'c', 'd')),
    official_key TEXT NOT NULL CHECK (official_key IN ('a', 'b', 'c', 'd')),
    is_correct BOOLEAN NOT NULL,
    marks_delta NUMERIC(4,2) NOT NULL, -- +2.00 or -0.66
    is_50_50_call BOOLEAN DEFAULT FALSE,
    eliminated_options JSONB DEFAULT '[]'::jsonb,
    response_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pyq_prelims_operator ON pyq_prelims(primary_operator);
CREATE INDEX IF NOT EXISTS idx_static_q_operator ON static_questions(primary_operator);
CREATE INDEX IF NOT EXISTS idx_user_psyche_user_op ON user_psyche_telemetry(user_id, operator_tested);
CREATE INDEX IF NOT EXISTS idx_user_psyche_user_node ON user_psyche_telemetry(user_id, node_id);
```

---

## 4. Phase 2: Two-Stage PYQ Classification & Backfill (`scripts/classify-examiner-psyche.ts`)

Build a batch classification script (`scripts/classify-examiner-psyche.ts`) that populates `primary_operator`, `statement_dissection`, and `statutory_anchor` across `pyq_prelims` and `static_questions`, then aggregates node-level base rates into `pyq_node_analytics`.

### Stage 2A: Zero-Cost Deterministic Regex Pre-Tagger (Runs First)
1. **`PSY_06_PAIR_DECOY`:** If options `a`/`b`/`c` match `/only one( pair)?|only two( pairs)?|all three( pairs)?|how many of the above/i`, tag `PSY_06_PAIR_DECOY` as secondary/structural metadata and extract qualifier tokens.
2. **`PSY_07_TRUE_NON_CAUSAL`:** If `question_type === 'assertion_reason'` or options match `/both statement-i and statement-ii are correct/i` and `official_key === 'b'`, deterministically set `primary_operator = 'PSY_07_TRUE_NON_CAUSAL'`.
3. **Qualifier Token Extraction:** Scan statements for:
   - `EXTREME_QUALIFIERS`: `\b(only|all|every|never|none|exclusively|drastically|completely|mandatory|immediate|steadily)\b`
   - `CONTINGENT_QUALIFIERS`: `\b(can|may|some|generally|often|usually|sometimes)\b`

### Stage 2B: LLM Statement Dissection via `server-lib/llm.ts`
For multi-statement and single-choice questions, route batched prompts strictly through `server-lib/llm.ts` (respecting `quota_ledger`) or heuristic fallback.

### Stage 2C: Node-Level Base Rate Aggregation
Compute and upsert `pyq_node_analytics` for each of the 130 `syllabus_nodes`.

---

## 5. Phase 3: Backend Analytics Module (`server-lib/analytics/examiner_psyche.ts`)
1. **`getNodePsycheProfile(nodeId: string)`**
2. **`getUserPsycheAutopsy(userId: string)`**
3. **`getTargetOperatorForDailyBrief(nodeId: string)`**

---

## 6. Phase 4: Cross-Room UI Wiring
1. `BAY_02 // DISSECTION` & `BAY_03 // SYNTHESIS`
2. Implicit `50:50 Ledger` Strike-Out in Test Arena & Live Diagnostic
3. `Daily Brief (Alt + 2)`: Personal Trap Radar + Historical Twin
4. `The Observatory (Alt + 6)` & `Syllabus Pillars (Alt + 4)`: Node Psyche Header

---

## 7. Verification & Acceptance Gates
1. Migration & Schema Check.
2. Zero Null Operator Check on Active Diagnostic.
3. 50:50 Strike-Out Telemetry Check.
4. Build Gate: `npm run build` and `tsc --noEmit` exit 0.
