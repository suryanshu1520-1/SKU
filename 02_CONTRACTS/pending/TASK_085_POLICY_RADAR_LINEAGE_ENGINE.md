---
task_id: "TASK_085"
title: "Policy Radar → Policy Lineage Engine: a verified, primary-source graph of how Indian policy moves"
type: "EPIC_MASTER_PLAN"
status: "PENDING_EXECUTION"
assigned_to: "ORCHESTRATOR (decomposes) → ANTIGRAVITY (executes sub-contracts TASK_085A … TASK_085S)"
priority: "P0"
created_at: "2026-10-20"
supersedes_runtime_of: ["TASK_083 §Policy Radar hardening", "TASK_084 chain matcher, volcano index, boss MCQ fallbacks"]
---

# TASK_085 — Policy Lineage Engine (master plan)

> **How to use this pack.** This file is the Orchestrator's master plan: problem, audit, invariants, data model,
> algorithms and the delivery order. Antigravity does **not** execute this file. It executes the atomic
> sub-contracts `TASK_085A … TASK_085S` in this folder, each self-contained and under the 4k-token context
> budget in `00_SYSTEM/CONTRACT_SCHEMA.md`. When a sub-contract cites "§6.3", the needed rule is already
> distilled inside that sub-contract; this file is the reference, not a dependency.
>
> Status rules from `CONTRACT_SCHEMA.md` apply unchanged: a delegate may write at most `AWAITING_VERIFICATION`,
> never moves files to `completed/`, never writes to `01_CONTROL/` or `03_MEMORY/`.

---

## 1. The problem: information asymmetry about where a policy actually is

A press release is a point. Policy is a path: a Cabinet decision becomes an Act or a notification, a nodal
agency writes guidelines, money is released, states roll it out, and numbers get revised along the way.
Insiders (ministries, coaching faculty, consultants) carry this path in their heads. The public, and most
aspirants, see disconnected headlines.

The radar exists to answer four questions about any program, **with primary-source proof for every answer**:

1. **What is it and who legally owns it?** Program, nodal authority, that authority's legal basis and tier.
2. **Where is it in its lifecycle?** What has happened (with dates and sources) and what has *not yet been
   seen* in the sources we track.
3. **What changed?** Revised outlays, targets and deadlines, old value → new value, with both sources.
4. **What did it ripple into?** Other programs that explicitly build on it.

The moat is not a prompt. It is a compounding, verified data asset that a competitor cannot prompt an LLM
into: a canonical authority registry with cited legal bases, a ledger of span-verified policy events, a
lineage graph whose edges have explicit anchors, expert-labelled link data, and lifecycle timing statistics
learned from history. Every day of operation makes it more accurate and harder to copy.

---

## 2. Audit: what the radar is today (verified 2026-10-20 against the repo and the live database)

| # | Finding | Evidence |
|---|---|---|
| A1 | **Most of the graph is seeded, not observed.** 65 of 74 `policy_chain_nodes` have synthetic ids (`DISP_*`), all created 2026-10-19, none with a source URL. Only 9 nodes come from real dispatches. | Live `policy_chain_nodes` via public REST |
| A2 | **Closed-world matching.** The worker can only attach a dispatch to one of 15 hand-made chains; it never creates a program. The LLM is asked to pick a chain id, so it forces matches: DoPT Special Campaign 6 → e-waste chain; pumped-storage roadmap and the India–Saudi power interconnection → green-hydrogen chain; Green Diwali → e-waste. | `server-lib/cron/policy-graph-worker.ts:440-497` (prompt), live `nodes_flow` |
| A3 | **Ring depth is an LLM guess with a silent default.** Missing ring → `2`. | `policy-graph-worker.ts:554` |
| A4 | **"Chronological" order is insertion order, and racy.** `step_order = count + 1`. | `policy-graph-worker.ts:553` |
| A5 | **Boss MCQs mix chains.** Entities are fetched globally (`order appearances_count limit 10`), not per chain — the live green-hydrogen boss MCQ contains a statement about the India Semiconductor Mission. | `policy-graph-worker.ts:226-231` |
| A6 | **Hard-coded fallbacks are served as if live.** `CANONICAL_BOSS_MCQ_FALLBACKS` are returned for chains without a generated MCQ; all fallbacks have key `(a) Only one` (an exploitable pattern). `CANONICAL_VOLCANO_BASELINES` pad the live `topVolcanoNodes`. | `server-lib/policy-radar.ts:179, 211, 247-248` |
| A7 | **The graph worker barely runs on real data.** Of the latest 400 `current_affairs` rows, 20 have `graph_processed_at`, 2 are matched to a chain, 0 have `node_id`. The batch runner takes 10 rows per ingest run (3 runs/day). | Live `current_affairs`; `policy-graph-worker.ts:665`; `.github/workflows/scraper.yml:5` |
| A8 | **Inline processing passes the URL as the row id.** `processDispatchIntoPolicyGraph({ id: lead.url, … published_at: now })` — the worker then queries/updates `current_affairs.id` (uuid) with a URL, so the row is never marked processed and the batch worker re-sends it to the LLM. Root cause: `upsertCurrentAffairs` does not return the row id. | `server-lib/cron/ingest/orchestrator.ts:566-573`; `server-lib/cron/db.ts:64-65` |
| A9 | **Failures are permanent.** Any LLM/DB error sets `graph_processed_at` and nulls the chain; the row is never retried. | `policy-graph-worker.ts:647-656` |
| A10 | **Ministry attribution is broken for PIB.** 320 of the latest 400 rows have ministry `"Government of India"`. Root cause: `norm()` strips every non-`[a-z0-9]` character, and PIB is ingested in **Hindi**, so `deriveMinistry()` sees an empty string and returns the fallback. | `server-lib/cron/ingest/classify.ts:59-60, 67-78`; `sources.ts:81-90` |
| A11 | **Legal tiers contradict their own legal basis.** e.g. Textiles Committee stored as Tier 4 (registered society) while its basis is the *Textiles Committee Act, 1963* (statutory → Tier 2). ISM is Tier 3 ("executive resolution") in the registry but Tier 4 ("Section-8 company division") in the boss-MCQ fallback. A municipal corporation constituted under a state Act is stored as Tier 3 "executive". Tier is free text from the LLM, not derived from the basis. | Live `policy_entities`; `policy-graph-worker.ts` fallbacks |
| A12 | **Appearance counts are not observations.** e.g. RBI `appearances_count = 104`, ISM `34`, while only 20 dispatches have ever been processed. | Live `policy_entities` |
| A13 | **The "volcano index" is year-hard-coded and uncalibrated.** `V = ((2026 − last_tested)/recurrence) · ln(1 + 2·news_count_2026)`, defaults `last_tested = 2018`, `recurrence = 2.5`, thresholds 4/8 by fiat; with A7 its news term rests on ~2 dispatches. | `supabase/migrations/20261019_ripple_volcano_ev_engine.sql:54-88` |
| A14 | **PostgREST filter built by string interpolation** with raw URLs (`dispatch_id.eq.${id},pib_url.eq.${url}`) — commas/parentheses in a URL break or alter the filter. | `policy-graph-worker.ts:401` |
| A15 | **Every brief is linked to a chain by client-side keyword regex**, not by data. `matchDispatchToPolicyChain` maps headline words to one of 15 hand-made chains (e.g. any headline with "RBI", "repo" or "forex" → the monetary-liquidity chain) and the card shows "Explore policy chain". Runs on the feed, the brief page and the Daily Edition. | `src/lib/policy-ripple-radar-shared.ts:241`; `CurrentAffairs.tsx:1016, 1094-1105`; `PolicyBrief.tsx:63, 250-262`; `DailyEdition.tsx:343` |
| A16 | **"Years since last tested" and the volcano index on briefs are constants.** Any headline containing "FTA" or "bilateral" shows `GS2.IR.BILATERAL`: "12 years since last tested · Volcano index 28.5", hard-coded; every other node gets an invented record (`last_tested_year: 2024`). The 9-row "5-Tier Authority" block in diagnostics matches aliases by regex over question text. | `policy-ripple-radar-shared.ts:24-135, 297-335, 137, 340-358`; `PolicyBrief.tsx:265-271`; `DiagnosticPreview.tsx:757` |
| A17 | **The client ships its own seeds.** The radar component bundles `policy-radar-snapshot.json` and falls back to hand-written `CHAINS`/`ENTITIES`; the Observatory tab badge counts that static array ("15 chains · 5 legal tiers"); the script that wrote the `DISP_*` seeds is still runnable. Fixing the server alone (085A) changes nothing the user sees. | `PolicyRippleRadar.tsx:17, 47-71, 108`; `policy-ripple-data.ts:51, 275, 374`; `Observatory.tsx:841, 877, 889`; `scripts/seed-policy-ripple-graph.ts` |

**What is already good and must be reused, not rebuilt:** the deterministic cite-or-drop verifier
(`verify.ts: segmentSpans, extractFacts, verifyClaim`), the numeric fact ledger (`news_claims`,
`news_claim_versions`, `news_claim_mutations`, `canonicalClaimKey`), the syllabus keyword classifier and
testability model (`syllabus/keyword-classifier.ts`, `syllabus/testability.ts`), the embedder with a $0
lexical fallback (`embeddings.ts`), and the ingest accountability ledger (`news_ingest_runs`,
`news_ingest_decisions`).

---

## 3. Invariants (non-negotiable; every sub-contract inherits them)

- **I1 Provenance or nothing.** No node, edge, authority, number or question is shown publicly without at
  least one `{source_url, quote}` pair. Seeded or fallback content never reaches a public payload.
- **I2 The LLM extracts; deterministic code decides.** The LLM may propose an event frame and must cite spans.
  Ring depth, legal tier, chronological order, lineage membership, mutation flags, MCQ truth values and all
  scores are computed by deterministic code from verified inputs.
- **I3 Cite-or-drop extends to names.** An extracted actor/program name is kept only if it (or a registry
  alias of the resolved entity) appears in a cited span. Unverifiable fields drop the whole event.
- **I4 Open world, reviewed growth.** New programs are created automatically from verified r0/r1 events. New
  *authorities* are never auto-created; unresolved mentions go to a review queue.
- **I5 Absence is not a claim.** Lifecycle gaps are phrased "not yet seen in the sources Tark tracks", never
  "not done". Every gap shows its sample size.
- **I6 Calibrated or not shipped.** Any learned threshold ships with its validation metrics; if the gold set
  cannot support the target precision, the learned component stays off and the deterministic path runs alone.
- **I7 Idempotent and retryable.** Every worker step is keyed (`dispatch uuid`, `event seq`, `model version`)
  and safe to re-run; failures are retried with backoff, never silently marked done.
- **I8 Zero extra LLM calls on the hot path.** Event extraction rides on the existing synthesis call.
- **I9 Additive migrations.** Legacy tables stay readable until the UI moves to API v2; nothing is deleted
  without a human gate.
- **I10 Bilingual by default.** Every text function must work on Devanagari input (PIB arrives in Hindi).

---

## 4. Architecture

```
 PIB (hi) · PRS · RBI · wires          existing ingest (unchanged gates)
        │                                       │
        ▼                                       ▼
 segmentSpans ──► synthesizeStructured ──► verifyClaim (cite-or-drop) ──► current_affairs (+ id returned)
                     │  (same LLM call now also returns `policy_events[]` with span ids)
                     ▼
            ┌──────────────── EVENT LAYER (deterministic gates) ────────────────┐
            │ instrument lexicon cross-check (en+hi) → ring = RING_OF[instrument] │
            │ name cite-or-drop → resolver → authority slug / program slug        │
            │ event_date from source metadata (fallback: ingested, flagged)       │
            └──────────────────────────────┬──────────────────────────────────────┘
                                           ▼
                                    policy_events  ◄── news_claim_mutations (AMENDS)
                                           │
              ┌────────────────────────────┼─────────────────────────────┐
              ▼                            ▼                             ▼
   PROGRAM LINEAGE (deterministic)  RIPPLE EDGES (anchored)        SIGNALS
   chain = program_slug             v1 explicit reference          lifecycle gaps (Kaplan–Meier)
   order = (date, ring, id)         v2 + calibrated link model      surge (Gamma–Poisson + BH-FDR)
   parent = latest prior ≤ ring     (gold set, τ by Wilson LB)      exam weight (testability.ts)
              └────────────────────────────┬─────────────────────────────┘
                                           ▼
                          Boss MCQ by construction (truth known before wording)
                                           ▼
                     /api/policy-radar v2 (provenance, coverage, staleness) ──► UI
                                           ▲
                    eval harness + kill switch (RADAR_PUBLIC, radar_eval_runs)
```

---

## 5. Data model (summary — exact DDL lives in the sub-contracts)

| Table | Purpose | Key constraints |
|---|---|---|
| `policy_entities` (extended) | Canonical **authority** registry | `legal_basis_kind` enum, `legal_basis_ref`, `jurisdiction` (`union`/`state`), `source_url NOT NULL` for `provenance='registry'`; **trigger derives `tier_number` from `legal_basis_kind`**; `provenance` (`seed`/`registry`/`llm_legacy`) |
| `policy_entity_aliases` | Alias index (en + hi) | `UNIQUE(alias_norm)`; `alias_norm` = §6.2 normaliser output |
| `policy_entity_review` | Unresolved mentions queue | mention, span quote, source url, best candidates + scores, status |
| `policy_programs` | Program objects (scheme, mission, act, bill, treaty, regulation, policy) | `program_slug UNIQUE`, `nodal_entity_slug` FK, `kind` enum, `first_seen_event` |
| `policy_events` | One verified policy action | `UNIQUE(dispatch_id, event_seq)`; `instrument_class` enum; `ring_depth` **set by trigger** from `instrument_class`; `actor_slug` FK; `program_slug` FK nullable; `event_date`, `date_source`; `evidence jsonb` (≥1 `{span_id, quote, source_url}`); `extractor_version` |
| `policy_edges` | Lineage + ripple + amendment edges | PK `(src_event, dst_event, edge_type)`; `CHECK src≠dst`; `anchor_kind` NOT NULL; `p` nullable (null = deterministic); `model_version` |
| `policy_link_labels` | Expert gold set | pair, label, edge_type, labeller, notes |
| `policy_boss_mcqs` | Boss MCQs built by construction | `UNIQUE(program_slug, edition_date)`; RLS on with no public policy — answers leave the server only through the POST check endpoint |
| `radar_eval_runs` | Quality gate history | metrics jsonb, thresholds jsonb, `passed` |
| `current_affairs` (extended) | Worker state | `graph_status` (`pending`/`linked`/`no_event`/`failed`/`skipped`), `graph_attempts`, `graph_next_attempt_at` |
| `policy_chains`, `policy_chain_nodes` | **Legacy** (v1 UI) | Kept read-only; seeded rows flagged `provenance='seed'`; rebuilt from v2 tables as a compatibility view in 085P |

---

## 6. Algorithms

### 6.1 Ministry attribution (fixes A10)
1. Unicode-aware normaliser: NFKC → lowercase → delete U+200C/U+200D → replace `[^\p{L}\p{M}\p{N}\s]` with
   space → collapse spaces. `\p{M}` is essential: Devanagari vowel signs (ा ि ु …) and the virama (्) are
   combining *marks*, not letters; a `\p{L}`-only class would shred every Hindi word.
2. PIB releases carry the issuing ministry as the first heading line of the release (observed: span `s0` of
   PRID 2325286 begins "वाणिज्\u200Dय एवं उद्योग मंत्रालय", with a U+200D zero-width joiner). Extract that line from the release DOM; map it through a
   committed table `pib-ministries.json` (`hi`, `en`, `slug`) built from PIB's own ministry listings.
3. Fallback chain: DOM heading → first span alias match → English alias match → `"Government of India"` with
   `ministry_source='fallback'` recorded. Acceptance: ≥ 90 % non-fallback on the latest 200 PIB rows.

### 6.2 Entity resolution (fixes A11, A12)
- `alias_norm(s)` = §6.1 normaliser + strip leading "the", expand `&`→`and`, remove parenthetical acronyms into
  separate aliases ("India Semiconductor Mission (ISM)" → two aliases).
- Resolution of mention `m`: exact `alias_norm` hit → done. Else score every alias sharing ≥1 token:
  `score = max(JaroWinkler(m, a), TokenSetJaccard(m, a))`. Accept the top entity iff `score ≥ 0.94` **and**
  `score − second_best ≥ 0.04`; otherwise enqueue to `policy_entity_review`. Thresholds are placeholders until
  085K's 100-mention gold set sets them for **precision ≥ 0.98**.
- **Tier is a function, not an opinion:**

| `legal_basis_kind` | tier | tier_name |
|---|---|---|
| `constitution_article` | 1 | Constitutional body |
| `central_act`, `state_act` | 2 | Statutory body (jurisdiction column distinguishes union/state) |
| `executive_order` (resolution, notification, AoB Rules) | 3 | Executive / attached / subordinate office |
| `society_registration`, `companies_act_section8`, `trust` | 4 | Registered society / Section-8 / trust |
| `companies_act_cpse` | 5 | Public sector undertaking |

  A BEFORE INSERT/UPDATE trigger sets `tier_number`/`tier_name` from `legal_basis_kind`; a CHECK forbids
  `provenance='registry'` without `source_url` and `legal_basis_ref`.
- `appearances_count` becomes a **derived** count of verified events (view), not a mutable counter.

### 6.3 Events: instrument classes and rings (fixes A2, A3)
`ring_depth` is a lookup, never model output:

| ring | meaning | `instrument_class` values |
|---|---|---|
| 0 Mandate | political decision | `cabinet_approval`, `budget_announcement`, `executive_announcement`, `treaty_signed` |
| 1 Law | legal instrument | `bill_introduced`, `bill_passed`, `act_assented`, `ordinance_promulgated`, `rules_notified`, `regulation_issued`, `commencement_or_entry_into_force` |
| 2 Execution | administrative machinery | `guidelines_issued`, `institution_constituted`, `funds_released`, `tender_awarded`, `interagency_mou` |
| 3 Delivery | on-the-ground | `state_rollout`, `project_commissioned`, `beneficiary_milestone`, `enforcement_action` |
| — | **not a policy event** | `review_meeting`, `visit_or_courtesy`, `campaign_or_awareness`, `award_or_ceremony`, `conference_or_seminar`, `other` |

Non-events never enter the graph — this is what keeps "Green Diwali" and "Special Campaign 6" out of lineages.

**Acceptance gate per event** (all must hold, else drop and log `news_ingest_decisions` reason):
1. `instrument_class` ∈ policy classes **and** the deterministic lexicon (en + hi trigger patterns per class,
   e.g. `rules_notified`: /notif(ied|ication)|Rules, 20\d\d/ · /अधिसूच/; `commencement_or_entry_into_force`:
   /come[s]? into (force|effect)|take[s]? effect/ · /लागू हो/) fires inside a **cited span**.
2. Actor name and program name (if any) pass name cite-or-drop (I3) and resolve (§6.2) — or the event is kept
   with `actor_slug = null, review_id = …` but excluded from public payloads until resolved.
3. `event_date` comes from release metadata or an explicit date in a cited span; else `date_source='ingested'`.

Worked example (today's brief, PIB PRID 2325286): "India–New Zealand FTA to take effect on 20 Oct 2026" →
`commencement_or_entry_into_force`, ring 1, program `PRG_INDIA_NEW_ZEALAND_FREE_TRADE_AGREEMENT` (slug from `program_en`, kind `treaty`), actor
`ENT_MOCI` (Ministry of Commerce and Industry), trigger "लागू होगा" in span s0.

### 6.4 Lineage (fixes A2, A4)
**Intra-program lineage is deterministic.** Chain = all events with the same `program_slug`.
- Order key: `(event_date ASC, ring_depth ASC, created_at ASC, id ASC)` — total order, stable, race-free.
- Parent of event `e` = the latest earlier event `f` in the same program with `ring(f) ≤ ring(e)`; ties →
  higher ring, then later order key. Result is a forest per program (one parent each) → a clean timeline.
- Edges written with `edge_type='IMPLEMENTS'`, `anchor_kind='shared_program'`, `p = null`.

**Cross-program ripples (v1, deterministic).** Edge `f → e` (`edge_type='REFERENCES'`) iff `e`'s verified
spans contain a registry alias of `f`'s program **and** `date(f) ≤ date(e)`. `anchor_kind='explicit_reference'`.
Edges point forward in time, so the graph is a DAG by construction.

**Cross-program ripples (v2, learned; only after the gold set).**
- Candidates via blocking (inverted index on `actor_slug`, `program_slug`, `node_id`; 365-day window; ≤ 50
  per event) → O(k) per new event.
- Features `x` for pair `(f, e)`: `x1` shared actor; `x2` shared syllabus node; `x3` Jaccard of resolved entity
  sets; `x4` cosine of event embeddings (`getEmbedder()`); `x5` `1[ring(e) − ring(f) ∈ {0,1}]`;
  `x6` `−log1p(days)/log(366)`; `x7` explicit reference (from v1).
- Model: L2-regularised logistic regression, `p = σ(w·x + b)`, fitted by Newton/IRLS
  (`H = XᵀSX + λI`, `S = diag(p(1−p))`; 7 features → < 20 iterations), 5-fold stratified CV, out-of-fold
  predictions.
- **Threshold rule (I6):** `τ*` = smallest τ with OOF precision ≥ 0.90 **and** Wilson 95 % lower bound ≥ 0.80.
  Reference: precision 0.90 at n=50 gives LB 0.786 (fails); at n=100 gives 0.826 (passes). So the gold set
  must yield ~90+ predicted positives — target **300 labelled pairs with ≥ 120 positives**. If no τ satisfies
  the rule, v2 stays off.
- **Hard constraints stay hard:** an accepted learned edge still needs `date(f) ≤ date(e)` and at least one
  anchor among {shared actor, shared program kind+node}. No anchor, no edge.

### 6.5 Lifecycle gaps — the asymmetry signal
Stage templates per program kind (committed config), e.g.
`act: bill_introduced → bill_passed → act_assented → commencement_or_entry_into_force → rules_notified → guidelines_issued`;
`scheme/mission: cabinet_approval → guidelines_issued → funds_released → state_rollout`;
`treaty: treaty_signed → commencement_or_entry_into_force → regulation_issued`.

For each transition `k = (a → b)` estimate the time-to-next-stage survival curve with Kaplan–Meier:
`S(t) = Π_{t_i ≤ t} (1 − d_i / n_i)` over all programs that reached `a`; programs still waiting are right-censored
at their elapsed time. For a program sitting at stage `a` for `t` days:
- `n_observed(k) < 8` → "Next stage not yet seen · no reliable timing estimate (n = …)".
- else report median `t̃` (first `t` with `S(t) ≤ 0.5`) and flag **"longer than usual"** when
  `t > t_{0.25}` (first `t` with `S(t) ≤ 0.25`).
Reference fixture: durations `[30,45,60c,60,90,120c,150,200,210c,365]` (c = censored) give
`S = 0.9, 0.8, 0.7, 0.5833, 0.4375, 0.2917, 0` at `30, 45, 60, 90, 150, 200, 365` → median 150, `t_{0.25}` = 365.

### 6.6 Mutations (fixes the LLM `mutates_prior_fact` boolean)
An event mutates a prior fact iff one of its verified numeric claims produced a `news_claim_mutations` row
(an existing `canonical_key` got a new `value_hash`). Write an `AMENDS` edge from the event that carried the
previous version to the mutating event; show "old → new" with both quotes.

### 6.7 Surge and exam weight (replaces the volcano index, fixes A13)
Two honest axes instead of one invented product:
- **Exam weight** = `estimateTestability()` output for the node (existing frequency + drought model).
- **News surge** per syllabus node `j`, Gamma–Poisson with empirical-Bayes prior:
  baseline window `B` = 180 days ending 14 days ago (count `N_j`), recent window `W` = 14 days (count `x_j`).
  Pooled rates `r_j = N_j/180`; `m = mean(r)`, `v = var(r)`; `Var(λ) = v − m/180`;
  if `Var(λ) > 0`: `β0 = m/Var(λ)`, `α0 = m·β0`; else `β0 = 10⁴`, `α0 = m·β0`.
  Posterior `α = α0 + N_j`, `β = β0 + 180`; predictive `X ~ NegBin(r = α, q = β/(β + 14))`;
  `p_j = P(X ≥ x_j)`; surge score `−log10 p_j`. Mark **surging** with Benjamini–Hochberg at `q = 0.10` across
  nodes, only where `x_j ≥ 3`. No year literals anywhere.
  Reference values (scipy): `(α,β,w,x) = (5.2,180.4,14,7) → p = 3.03549e-06`; `(2,180,14,3) → 0.00142191`;
  `(12,190,14,5) → 0.00349979`; `(0.8,200,14,2) → 0.00310919`; `(30,182,14,10) → 0.000319266`.
  BH fixture: `p = [0.001,0.008,0.039,0.041,0.042,0.06,0.074,0.205,0.212,0.216]`, `q = 0.10` → 6 rejections.

### 6.8 Boss MCQ by construction (fixes A5, A6)
Truth is decided before any wording:
1. Program must have ≥ 3 public (verified, resolved) events. Entities come **only** from that program's events.
2. Draw `k_true ∈ {0,1,2,3}` uniformly with a seeded PRNG (`seed = fnv1a(program_slug + edition_date)`), so the
   key is not biased (today every fallback is `(a)`).
3. True statements are verified claim texts attached to the program's events.
4. False statements come from deterministic operators applied to a true statement:
   - `PSY_01_INST_SWAP`: replace the actor with the most confusable registry sibling (same `kind` and
     `jurisdiction`, not mentioned anywhere in the program's events), confusability = JaroWinkler(name) +
     0.5·[same parent ministry]; ties by slug.
   - `PSY_05_SCOPE_MUTATE`: replace a verified number `x` with `x' ∈ {round(1.5x), round(0.5x), x ± 10^⌊log10 x⌋}`
     (same unit, same rounding granularity), rejecting any `x'` that appears in the program's verified claims.
   - `PSY_03_LEGAL_TIER`: assert a different tier/basis for an authority whose registry row has `source_url`.
   - `PSY_02_QUAL_POLARITY` is **excluded** in v1 (truth not decidable by construction).
5. Optional LLM paraphrase into UPSC register, accepted only if every `extractFacts()` token of the input — and,
   for false statements, the mutated token — survives verbatim; otherwise keep the template wording.
6. The answer key is computed from the truth vector. No runtime fallbacks; on failure, no MCQ.

---

## 7. What the user sees (API v2 + UI rules)

- **Program page:** lineage lanes Mandate / Law / Execution / Delivery; every node shows date, instrument,
  actor (with tier and legal basis) and a source chip that opens the release at the quoted sentence.
- **"Not yet seen" ghost stage** after the last observed stage, with the KM sentence and its `n`.
- **"What changed"** badges from AMENDS edges: old value → new value, both quotes.
- **Ripples:** linked programs with the exact sentence that references them.
- **Surge × exam weight** quadrant per syllabus node, replacing ERUPTING/HEATING.
- **Feed cards and briefs** show a lineage chip only when one of the brief's own verified events belongs to a
  program, and a surge note only when its syllabus node passed the false-discovery test (085Q2). No keyword guessing.
- **Coverage line** on every view: "Built from N verified events across M programs since <date>; last
  updated <time>". Stale snapshot ⇒ visible "stale since" banner.
- **Kill switch:** when the latest `radar_eval_runs.passed = false` or `RADAR_PUBLIC != '1'`, the API returns
  `{ status: "paused" }` and the UI shows an honest maintenance state.

---

## 8. Quality gates (Definition of Done for the epic)

| Metric | Gate | Measured by |
|---|---|---|
| Public items without `{source_url, quote}` | **0** | API v2 test over full payload |
| Hard-coded baselines/fallbacks in public payload | **0** | API v2 test |
| PIB rows with non-fallback ministry (latest 200) | ≥ 90 % | SQL check in 085C |
| Passing rows with `node_id` | ≥ 95 % | SQL check in 085D |
| Event extraction precision (50-event human audit) | ≥ 0.90 | 085R audit sheet |
| Instrument class accuracy (60 labelled) | ≥ 0.85 | 085R |
| Entity resolution precision / recall (100 mentions) | ≥ 0.98 / ≥ 0.85 | 085R |
| Intra-program ordering errors on fixtures | 0 | `npm run test:radar` |
| Learned ripple edges (if shipped): precision / Wilson LB | ≥ 0.90 / ≥ 0.80 | 085K |
| Worker backlog: `graph_status='pending'` older than 48 h, rows since `RADAR_V2_SINCE` | 0 | 085R |
| Boss MCQ statements traceable to evidence or operator | 100 % | 085O property tests |

---

## 9. Delivery plan

| ID | Contract | Phase | Depends on | Thinking | Human gate |
|---|---|---|---|---|---|
| 085A | Quarantine seeds and fallbacks | 0 Truth | — | low | **G3** decide deletion later |
| 085A2 | Remove client-side seeds and regex linking from all feed surfaces | 0 | 085A | low | — |
| 085B | Graph worker reliability (id, retries, scoping, filters) | 0 | 085A | medium | — |
| 085C | Hindi-safe ministry attribution + backfill | 0 | 085A | medium | — |
| 085D | Syllabus `node_id` wiring + backfill | 0 | 085A | medium | — |
| 085E | Authority registry schema (basis → tier trigger) | 1 Registry | 085A | medium | — |
| 085F | Registry seed with citations | 1 | 085C, 085E, 085G | medium | **G1** approve seed diff |
| 085G | Entity resolver module | 1 | 085C, 085E | medium | — |
| 085H | Programs + events schema (ring trigger) | 2 Events | 085E | medium | — |
| 085I | Event extraction inside synthesis + gates | 2 | 085B, 085C, 085G, 085H | high | — |
| 085J | Deterministic lineage builder (+ explicit ripples) | 3 Lineage | 085I | high | — |
| 085K | Gold set tooling + calibrated link model | 3 | 085J | high | **G2** label 300 pairs, 100 mentions, 60 events |
| 085L | Lifecycle gap engine (Kaplan–Meier) | 4 Signals | 085J | medium | — |
| 085M | Mutation linkage from the fact ledger | 4 | 085I, 085J | medium | — |
| 085N | Surge (Gamma–Poisson + BH) + exam weight; retire volcano | 4 | 085D | medium | — |
| 085O | Boss MCQ by construction | 5 Questions | 085A2, 085G, 085J | high | — |
| 085P | Radar API v2 + legacy compatibility view | 6 Surface | 085J, 085L, 085M, 085N, 085O | medium | — |
| 085Q | Radar panel: lineage lanes, gaps, provenance, honest states | 6 | 085A2, 085P | medium | — |
| 085Q2 | Feed cards + diagnostics read lineage/surge/tiers from API v2 | 6 | 085Q | medium | — |
| 085R | Eval harness, `radar_eval_runs`, kill switch | 7 Eval | 085J, 085K, 085O, 085P | medium | **G4** public launch |
| 085S | Spike: primary law sources (PRS bill stages, e-Gazette, India Code) | 8 Moat | — | medium | report only |

085A goes first (it creates the `test:radar` glob script every later contract relies on); the rest of Phase 0 can then run in parallel. Nothing in Phases 2–6 starts before 085E merges.

---

**Switches the Orchestrator controls (no code change needed):** GitHub repository variables `RADAR_V2` (`1` turns on
v2 extraction + lineage in the ingest run) and `RADAR_V2_SINCE` (ISO date of that cutover; earlier unprocessed rows
become `skipped`), Vercel env `RADAR_PUBLIC` (`1` only after G4), optional `RADAR_LINK_MODEL` (`1` only if 085K passed).
Daily jobs run in `.github/workflows/radar-daily.yml` (gaps → node signals → boss MCQs → eval), created by the first of
085L/085N to merge.

---

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| LLM event frames drift or hallucinate | Lexicon cross-check inside cited spans (§6.3), name cite-or-drop (I3), extractor versioning, 50-event audit in 085R |
| PIB markup changes break ministry extraction | DOM selector fixtures + alias fallback + `ministry_source` telemetry alert when fallback share > 20 % |
| Gold set too small for the learned linker | v2 is optional by design (I6); deterministic program lineage + explicit references carry the product |
| "Not yet seen" read as an accusation | Fixed wording (I5), sample size always shown, link to sources tracked |
| Cost creep | Extraction folded into synthesis (I8); backlog backfill pre-filtered by lexicon; boss MCQ ≤ 1 call per program per 3 new events |
| Small executor context (Gemini Flash) | Every sub-contract is self-contained with distilled interfaces, fixtures and exact commands |

## 11. Out of scope (this epic)
pgvector; state-government sources; personalisation; redesign of Observatory beyond the radar panel; Examiner
Psyche/PTVI changes beyond using operator enums; deleting legacy tables (needs G3).

## 12. Sub-contract index
`TASK_085A_RADAR_QUARANTINE_SEEDS_AND_FALLBACKS.md` · `TASK_085A2_CLIENT_SURFACES_DESEED.md` ·
`TASK_085B_GRAPH_WORKER_RELIABILITY.md` ·
`TASK_085C_HINDI_MINISTRY_ATTRIBUTION.md` · `TASK_085D_SYLLABUS_NODE_WIRING.md` ·
`TASK_085E_AUTHORITY_REGISTRY_SCHEMA.md` · `TASK_085F_AUTHORITY_REGISTRY_SEED.md` ·
`TASK_085G_ENTITY_RESOLVER.md` · `TASK_085H_PROGRAMS_AND_EVENTS_SCHEMA.md` ·
`TASK_085I_EVENT_EXTRACTION_IN_SYNTHESIS.md` · `TASK_085J_LINEAGE_BUILDER.md` ·
`TASK_085K_GOLD_SET_AND_LINK_MODEL.md` · `TASK_085L_LIFECYCLE_GAP_ENGINE.md` ·
`TASK_085M_MUTATION_LINKAGE.md` · `TASK_085N_SURGE_AND_EXAM_WEIGHT.md` ·
`TASK_085O_BOSS_MCQ_BY_CONSTRUCTION.md` · `TASK_085P_RADAR_API_V2.md` ·
`TASK_085Q_RADAR_UI_HONEST_STATES.md` · `TASK_085Q2_FEED_CARD_LINEAGE_CHIPS.md` · `TASK_085R_EVAL_HARNESS_AND_KILL_SWITCH.md` ·
`TASK_085S_SPIKE_PRIMARY_LAW_SOURCES.md`
