---
task_id: "TASK_084"
title: "Unified Cross-Room Intelligence Engine: Policy Ripple Wiring, Full-Chain Boss MCQs, Volcano Node Radar (V_j) & Calibrated 50:50 EV Curve"
status: "ACTIVE"
priority: "P0_CRITICAL"
owner: "Antigravity"
created_at: "2026-10-19"
---

# TASK_084: Unified Cross-Room Ripple, Volcano Radar & Calibrated 50:50 EV Engine

## 1. Architectural Objective
Eliminate the remaining room silos between **Daily Brief (`Alt + 2`)**, **Test Arena (`Alt + 3`)**, **Syllabus Pillars (`Alt + 4`)**, and **The Observatory (`Alt + 6`)** by fusing two core telemetry systems into a single cross-room loop:

1. **Cross-Room Policy Ripple & Full-Chain Boss MCQ Engine (Option A):**
   - Prevent duplicate LLM RPD burn in `policy-graph-worker.ts` via an idempotent `graph_processed_at` guard.
   - Surface clickable **`[RIPPLE r{depth} // {CHAIN_TITLE}]`** pills directly on **Daily Brief (`Alt + 2`)** cards that deep-link into `PolicyRippleRadar.tsx`.
   - Inject the **5-Tier Legal Authority Badge** (`policy_entities`) directly into **`BAY_02 // DISSECTION`** answer autopsies.
   - Auto-synthesize a 3-statement **Full-Chain Boss MCQ** ($r_0$ Sovereign Mandate + $r_1$ `PSY_01_INST_SWAP` + $r_2$ `PSY_03_LEGAL_TIER`) whenever a `policy_chain` reaches $\ge 3$ nodes across rings, strictly enforcing the **Fact Half-Life Guardrail** ($T_{1/2} \in [231, 866]\text{ days}$).

2. **Empirical Volcano Node Radar ($V_j$) & Calibrated 50:50 EV Degradation Curve (Option B):**
   - Compute and expose the **Volcano Index ($V_j$)** across all 137 syllabus nodes in `SubjectPillars.tsx`, `Observatory.tsx`, and `PolicyRippleRadar.tsx` to spotlight long-dormant UPSC topics experiencing high 2026 PIB/PRS velocity (led by `GS3.ECO.EXTERNAL` at $V_j = 30.13$ and `GS2.IR.BILATERAL` at $V_j = 28.53$).
   - Deprecate the naive $+0.67$ 50:50 Expected Value assumption and wire the **Calibrated 50:50 EV Degradation Curve** ($\text{EV}(P_{\text{trap}}) = 2.00 - 2.66\,P_{\text{trap}}$), firing an explicit **EV Inversion Alert (`STRICT ABSTENTION`)** whenever a user's historical operator accuracy drops below the **$24.8\%$ ($P_{\text{trap}} \ge 75.2\%$)** breakeven horizon.

---

## 2. Phase 1: Database Migration (`supabase/migrations/20261019_ripple_volcano_ev_engine.sql`)

Create and apply the following idempotent migration to:
1. Add `graph_processed_at` to `current_affairs` so `runPolicyGraphWorker()` never re-runs LLM extraction on dispatches already processed inline by `orchestrator.ts`.
2. Extend `pyq_node_analytics` with `news_count_2026`, `volcano_index`, and `volcano_status`, plus a deterministic SQL function `recompute_volcano_indices()`.
3. Extend `current_affairs_mcqs` and `static_questions` with `chain_id`, `is_boss_mcq`, `secondary_operator`, `entity_slugs`, and `claim_half_life_days`.

```sql
-- 1. Quota Idempotency Guard on current_affairs
ALTER TABLE IF EXISTS public.current_affairs
    ADD COLUMN IF NOT EXISTS graph_processed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS chain_id TEXT REFERENCES public.policy_chains(chain_id),
    ADD COLUMN IF NOT EXISTS ring_depth INT CHECK (ring_depth BETWEEN 0 AND 3),
    ADD COLUMN IF NOT EXISTS entity_slugs TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_current_affairs_unprocessed_graph
    ON public.current_affairs(published_at DESC)
    WHERE graph_processed_at IS NULL;

-- 2. Track Boss MCQ Synthesis State on policy_chains
ALTER TABLE IF EXISTS public.policy_chains
    ADD COLUMN IF NOT EXISTS boss_mcq_id TEXT,
    ADD COLUMN IF NOT EXISTS last_synthesized_node_count INT DEFAULT 0;

-- 3. Extend current_affairs_mcqs & static_questions for Full-Chain Boss MCQs & 5-Tier Entity Dissection
ALTER TABLE IF EXISTS public.current_affairs_mcqs
    ADD COLUMN IF NOT EXISTS chain_id TEXT REFERENCES public.policy_chains(chain_id),
    ADD COLUMN IF NOT EXISTS is_boss_mcq BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS primary_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS secondary_operator examiner_operator_type,
    ADD COLUMN IF NOT EXISTS entity_slugs TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS claim_half_life_days FLOAT DEFAULT 231.0 CHECK (claim_half_life_days >= 99.0);

ALTER TABLE IF EXISTS public.static_questions
    ADD COLUMN IF NOT EXISTS chain_id TEXT REFERENCES public.policy_chains(chain_id),
    ADD COLUMN IF NOT EXISTS is_boss_mcq BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS entity_slugs TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS claim_half_life_days FLOAT DEFAULT 866.4;

-- 4. Extend pyq_node_analytics with Volcano Index (V_j) Telemetry
ALTER TABLE IF EXISTS public.pyq_node_analytics
    ADD COLUMN IF NOT EXISTS news_count_2026 INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS volcano_index FLOAT DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS volcano_status TEXT DEFAULT 'STABLE'
        CHECK (volcano_status IN ('ERUPTING', 'HEATING', 'STABLE'));

CREATE INDEX IF NOT EXISTS idx_pyq_node_volcano
    ON public.pyq_node_analytics(volcano_index DESC);

-- 5. Deterministic SQL Function to Recompute Volcano Index (V_j) Across All 137 Nodes
-- Formula: V_j = ((2026 - last_tested_year) / GREATEST(1.0, recurrence_interval_avg)) * LN(1 + 2 * news_count_2026)
CREATE OR REPLACE FUNCTION public.recompute_volcano_indices()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    WITH article_counts AS (
        SELECT
            node_id,
            COUNT(*)::INT AS cnt_2026
        FROM public.current_affairs
        WHERE node_id IS NOT NULL
          AND published_at >= '2026-01-01T00:00:00Z'
        GROUP BY node_id
    )
    UPDATE public.pyq_node_analytics a
    SET
        news_count_2026 = COALESCE(ac.cnt_2026, 0),
        volcano_index = ROUND(
            (
                (2026.0 - COALESCE(a.last_tested_year, 2018)::FLOAT)
                / GREATEST(1.0, COALESCE(a.recurrence_interval_avg, 2.5)::FLOAT)
            ) * LN(1.0 + 2.0 * COALESCE(ac.cnt_2026, 0)::FLOAT)::NUMERIC,
            2
        )::FLOAT,
        volcano_status = CASE
            WHEN (
                (2026.0 - COALESCE(a.last_tested_year, 2018)::FLOAT)
                / GREATEST(1.0, COALESCE(a.recurrence_interval_avg, 2.5)::FLOAT)
            ) * LN(1.0 + 2.0 * COALESCE(ac.cnt_2026, 0)::FLOAT) > 8.0 THEN 'ERUPTING'
            WHEN (
                (2026.0 - COALESCE(a.last_tested_year, 2018)::FLOAT)
                / GREATEST(1.0, COALESCE(a.recurrence_interval_avg, 2.5)::FLOAT)
            ) * LN(1.0 + 2.0 * COALESCE(ac.cnt_2026, 0)::FLOAT) > 4.0 THEN 'HEATING'
            ELSE 'STABLE'
        END,
        is_drought_topic = (2026 - COALESCE(a.last_tested_year, 2018)) >= 6
    FROM article_counts ac
    WHERE a.node_id = ac.node_id;
END;
$$;
```

---

## 3. Phase 2: Quota-Safe Graph Worker & Full-Chain Boss MCQ Synthesizer (`server-lib/cron/policy-graph-worker.ts`)

### 3.1. Idempotent Quota Guard (`graph_processed_at`)

1. Inside `processDispatchIntoPolicyGraph(dispatch)`:
   - First check if `dispatch.graph_processed_at` is non-null or if `policy_chain_nodes` already contains `dispatch_id = dispatch.id`. If so, return immediately without invoking `llmGenerate()`.
   - Upon completing graph extraction (even if classified as `STANDALONE_NEWS`), update `current_affairs` for `id = dispatch.id` with:
     - `graph_processed_at = NOW()`
     - `chain_id = matched_chain_id` (or newly created `chain_id`)
     - `ring_depth = node_step.ring_depth`
     - `entity_slugs = entities_detected.map(e => e.entity_slug)`

2. Inside `runPolicyGraphWorker({ maxDispatches = 10 })`:
   - Query **only** unprocessed dispatches: `.is('graph_processed_at', null).order('published_at', { ascending: false }).limit(maxDispatches)`.
   - At the end of `runPolicyGraphWorker()`, invoke `await supabaseAdmin.rpc('recompute_volcano_indices')` so `pyq_node_analytics` always reflects live 2026 news velocity.

### 3.2. Auto-Synthesizing "Full-Chain Boss MCQs" (`synthesizeChainBossMcq`)

Whenever a `policy_chain` accumulates **$\ge 3$ nodes** in `policy_chain_nodes` (and `node_count > last_synthesized_node_count`), trigger `synthesizeChainBossMcq(chainId)` via `server-lib/llm.ts`:
- 3 statements: $r_0$ Sovereign Mandate (True), $r_1$ `PSY_01_INST_SWAP` (False), $r_2$ `PSY_03_LEGAL_TIER` (False).
- Fact Half-Life Guardrail ($T_{1/2} \ge 231\text{ days}$).
- Standard pair-counting options format: (a) Only one, (b) Only two, (c) All three, (d) None.

---

## 4. Phase 3: Empirical Volcano Index ($V_j$) & Calibrated 50:50 EV Engine (`server-lib/analytics/examiner_psyche.ts`)

Add and export `computeCalibrated5050EV()`, `Calibrated5050Metrics`, and `EvExecutionProtocol`:
- $\text{EV}(P_{\text{trap}}) = (1 - P_{\text{trap}})(+2.00) + P_{\text{trap}}(-0.66) = 2.00 - 2.66\,P_{\text{trap}}$
- Thresholds:
  - $\le 0.25 \implies$ `MANDATORY_EXECUTION`
  - $0.25 - 0.35 \implies$ `AGGRESSIVE_EXECUTION`
  - $0.35 - 0.50 \implies$ `STANDARD_EXECUTION`
  - $0.50 - 0.752 \implies$ `SELECTIVE_CAUTION`
  - $\ge 0.752 \implies$ `STRICT_ABSTENTION` (EV Inverted)

---

## 5. Phase 4: Cross-Room UI Wiring (`Alt + 1` Through `Alt + 6`)

1. **Daily Brief (`Alt + 2` — `CurrentAffairs.tsx`, `DailyEdition.tsx`, `PolicyBrief.tsx`)**:
   - `[RIPPLE r{depth} // {CHAIN_TITLE}]` pills deep-linking to Policy Ripple Radar.
   - `[VOLCANO V_j: {val} // {DROUGHT_YEARS}-YR DROUGHT REBOUND]` badge when $V_j > 8.0$.

2. **`BAY_02 // DISSECTION` & `BAY_03 // SYNTHESIS`**:
   - 5-Tier Legal Authority block in `BAY_02`.
   - Calibrated 50:50 EV & Inversion Alert in `BAY_03`.

3. **`PolicyRippleRadar.tsx` & `Observatory.tsx` (`Alt + 6`) + `SubjectPillars.tsx` (`Alt + 4`)**:
   - "Full-Chain Boss MCQ" Drawer in `PolicyRippleRadar.tsx`.
   - Volcano Node Radar ($V_j$) telemetry bar in `Observatory.tsx` & `SubjectPillars.tsx`.
   - Calibrated 50:50 EV degradation curve panel in `Observatory.tsx`.

---

## 6. Verification & Acceptance Gates
1. Migration & Volcano Math Check.
2. Zero Double-Quota Burn Check.
3. 50:50 EV Mathematical Precision Unit Tests.
4. Cross-Room Deep Link & 5-Tier Dissection Check.
5. Full-Chain Boss MCQ Interactive Check.
6. Build, Lint & Test Suite Gate (`lint:web`, `lint:api`, `test`, `build` exit 0).
