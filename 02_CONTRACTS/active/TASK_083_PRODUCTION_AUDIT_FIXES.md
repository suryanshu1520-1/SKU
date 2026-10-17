---
task_id: "TASK_083"
title: "Production Audit Fixes: Telemetry Calibration, PRS Timestamp Sanitization, SSR DOM Deduplication & Policy Radar Hardening"
status: "ACTIVE"
priority: "P0_CRITICAL"
owner: "Antigravity"
created_at: "2026-10-17"
---

# TASK_083: Production Audit Fixes & Telemetry Calibration

## 1. Objective
Fix 8 live production defects identified across `https://www.tark.live`, `/intelligence`, `/daily-edition`, `/prs`, `/privacy`, `/terms`, and `/refund`, and harden the newly deployed **Policy Ripple Radar** graph pipeline so it operates idempotently without hallucinating chain IDs or creating disconnected silos.

---

## 2. Workstream 1: Fix the `"PSY_01 • BLIND SPOT"` Cry-Wolf Bug (`/intelligence` & `/prs`)

### Root Cause
1. Unauthenticated/cold visitors with `0` completed attempts are assigned a fallback `worstBleedOperator = 'PSY_01'`, causing `• BLIND SPOT` to render on ~80% of cards for every visitor and Googlebot.
2. The ingestion classifier over-assigns `PSY_01_INST_SWAP` whenever any Ministry name appears in a PIB dispatch.

### Required Code Changes
1. **Gate the Blind Spot Badge in UI (`src/components/` feed & brief cards):**
   - Never display `• BLIND SPOT` or `[YOUR −0.66 BLIND SPOT]` unless the user has a verified negative score history:
   ```tsx
   const hasSufficientTelemetry =
     Boolean(userTelemetry) &&
     userTelemetry.totalAttempts >= 3 &&
     userTelemetry.worstOperatorBleed < 0;

   const isPersonalBlindSpot =
     hasSufficientTelemetry &&
     Boolean(brief.primary_operator) &&
     userTelemetry.worstBleedOperator === brief.primary_operator;
   ```
   - When `isPersonalBlindSpot` is `false`, render only the neutral forensic operator pill (e.g., `TRAP VECTOR: PSY_01 // NODAL SWAP`) without `• BLIND SPOT`.

2. **Rebalance Operator Classification (`server-lib/` & `scripts/classify-examiner-psyche.ts`):**
   - Update the classifier prompt and deterministic rules to enforce operator diversity across `PSY_01`–`PSY_07`:
     - **`PSY_05_SCOPE_MUTATE`**: Assign when the primary trap mutates financial outlays, multi-year timelines (e.g., `FY27–32`), percentage targets, or numerical rankings.
     - **`PSY_03_LEGAL_TIER`**: Assign when the dispatch centers on a body's Constitutional, Statutory, Executive Resolution, or Section-8 Society status.
     - **`PSY_02_QUAL_POLARITY`**: Assign when the trap hinges on restrictive determiners (`only`, `all`, `immediate mandatory obligation`).
     - **`PSY_01_INST_SWAP`**: Reserve strictly for dispatches with non-obvious nodal agencies, inter-ministerial SPVs, or regulatory overlaps (e.g., *ISM*, *BIRAC*, *NPCI*, *NFRA*, *DRI vs. CBN*).

3. **SQL Re-Calibration Pass:**
   - Run a one-time SQL update on `current_affairs` rows from the last 30 days where `primary_operator = 'PSY_01_INST_SWAP'` and the summary/trap text explicitly tests numerical outlays, years, or percentage targets, re-tagging them to `'PSY_05_SCOPE_MUTATE'`.

---

## 3. Workstream 2: Purge & Fix Misdated 2019/2020 PRS Archives on `/prs`

### Root Cause
Legacy PRS Legislative Research explainers (such as *The Citizenship (Amendment) Bill, 2019* and *Central government's response to the COVID-19 pandemic (Apr 13-20, 2020)*) were ingested without a parsed source date, falling back to `published_at DEFAULT NOW()` (`Sept/Oct 2026`).

### Required Code & Database Changes
1. **Immediate Production DB Cleanup (`supabase/migrations/20261017_audit_cleanup.sql`):**
   ```sql
   -- 1. Remove obsolete 2020 COVID-19 weekly trackers masquerading as 2026 news
   DELETE FROM public.current_affairs
   WHERE (source ILIKE '%PRS%' OR category ILIKE '%PRS%')
     AND (
       title ILIKE '%COVID-19%'
       OR title ILIKE '%Apr 13-20, 2020%'
       OR title ILIKE '%lockdown%'
     );

   -- 2. Backdate historical PRS Bills/Acts (2018-2024) whose titles contain an explicit past year
   UPDATE public.current_affairs
   SET published_at = MAKE_TIMESTAMPTZ((regexp_match(title, '\b(2018|2019|2020|2021|2022|2023|2024)\b'))[1]::int, 6, 15, 0, 0, 0, 'UTC')
   WHERE (source ILIKE '%PRS%' OR category ILIKE '%PRS%')
     AND title ~ '\b(2018|2019|2020|2021|2022|2023|2024)\b'
     AND published_at >= '2026-01-01';

   -- 3. Fix tokenizer space typo in Oct 14 BHAVYA dispatch
   UPDATE public.current_affairs
   SET title = REPLACE(title, 'BHAVY A', 'BHAVYA'),
       summary = REPLACE(summary, 'BHAVY A', 'BHAVYA')
   WHERE title LIKE '%BHAVY A%' OR summary LIKE '%BHAVY A%';
   ```

2. **PRS Scraper Date Guard (`server-lib/` PRS ingestion worker):**
   - Extract the explicit publication date from the PRS page metadata (`<meta property="article:published_time">`, `.date`, or year in title `(Bill|Act),\s*(20\d{2})`).
   - If the extracted year is `< 2025`, either skip live news ingestion or tag as `archive_static` so it never surfaces at the top of `Sorted by Recency` on `/prs`.

---

## 4. Workstream 3: Replace Self-Sabotaging `"33% Grounded"` Badges

### Root Cause
Cards on `/intelligence` and `/daily-edition` display `PIB OFFICIAL · 33% Grounded` or `50% Grounded` when only 1 of 3 summary bullets carries an inline citation marker, contradicting the platform covenant that *"every statement is cited; any sentence without a source is dropped."*

### Required Code Changes
1. **Ingestion Citation Propagator:**
   - When distilling a single primary PIB/RBI/Cabinet release (`source_url`) into 3 factual bullets, bind the verified primary `source_url` and release ID across all 3 bullets if they originate from that release.

2. **UI Badge Normalization:**
   - Replace the raw `33% Grounded` / `50% Grounded` string on published primary-source cards with deterministic provenance badges:
     - If `source_url` is a verified government/statutory domain (`pib.gov.in`, `rbi.org.in`, `prsindia.org`, `egazette.nic.in`, `indiabudget.gov.in`): render **`100% Grounded · Primary Source`** (or **`Verified Primary Source · 3 Claims`**).
     - Never publish a card to the public feed with `< 100%` grounding; if a claim lacks source backing during ingestion, drop the claim before insert.

---

## 5. Workstream 4: Ingestion Noise Gate (Drop 24-Hour Ephemeral Trivia)

### Root Cause
Routine administrative PR notices and overnight money-market liquidity operations ($T_{1/2} \approx 1\text{ day}$, 0% Prelims probability) are leaking into `/daily-edition` and `/intelligence`:
- RBI Overnight Variable Rate Reverse Repo (VRRR) auctions & weekly 91/182/364-day T-Bill auction yields.
- Routine ministry cleanliness/record-keeping workshops under *"Special Campaign 6"* and municipal road-silt removal drives.

### Required Code Changes
1. **Pre-LLM Regex Rejection Filter (`server-lib/cron/` / `pib-aggregator`):**
   - Before spending LLM tokens or inserting into `current_affairs`, immediately reject (`status = 'REJECTED_EPHEMERAL_TRIVIA'` in `news_ingest_decisions`) any release matching:
   ```typescript
   const EPHEMERAL_TRIVIA_PATTERNS = [
     /\b(VRRR|Variable Rate Repo|Variable Rate Reverse Repo)\s+auction\b/i,
     /\b(91-day|182-day|364-day)\s+Treasury Bills?\s+\(T-Bills?\)\s+auction/i,
     /\bSpecial Campaign\s+\d+\b.*\b(workshop|record management|cleanliness|scrap disposal)\b/i,
     /\bremoval of (dust|silt|construction debris) from roads\b/i,
     /\b(courtesy call|pays floral tributes|condoles the passing)\b/i,
   ];
   ```

2. **Database Purge of Existing Trivia:**
   ```sql
   DELETE FROM public.current_affairs
   WHERE title ~* '(Variable Rate Reverse Repo|Treasury Bills.*auction|Workshop on Record Management under Special Campaign|Removal of dust/silt from roads)';
   ```

---

## 6. Workstream 5: Fix Double-Rendered Homepage DOM, Legal Route Bleed & Cold-Load Tour Leak

### Root Cause
1. On `/`, the static SEO shell inside `index.html` (or bot-renderer) and the hydrated React tree both remain in the crawlable DOM, duplicating the entire homepage text block.
2. On `/privacy`, `/terms`, and `/refund`, the entire Homepage component mounts in the background underneath `LegalModal`, causing Googlebot to index `/privacy` as 80% duplicate homepage copy.
3. `<OnboardingTour />` (`STEP 1 OF 6 WAR ROOM COMMAND`) mounts automatically when `localStorage` is empty, leaking tour UI text into Google search snippets across `/terms`, `/privacy`, and `/intelligence/*`.
4. On `/intelligence/[slug]?id=...`, all 45 feed cards render in the DOM *above* the single article content, and slugs truncate mid-word at 80 characters.

### Required Code Changes
1. **Exclusive Route Mounting for `/privacy`, `/terms`, `/refund` (`src/App.tsx` & `server-lib/seo/bot-renderer.ts`):**
   - When `pathname` is `/privacy`, `/terms`, or `/refund`, render **only** the standalone Legal Charter page view with a top bar (`← Return to Tark War Room`)—do **not** mount the Home landing page behind it.

2. **Deduplicate Root `/` Static vs. Hydrated DOM:**
   - Ensure React mounts into the root container cleanly (`createRoot(rootEl).render(...)`) replacing any static pre-render placeholder inside `#root` / `#main-content`, rather than rendering a duplicate sibling block.

3. **Kill Automatic Cold-Load Mounting of `<OnboardingTour />`:**
   - Remove the `useEffect` that auto-opens the 6-step tour modal on initial visit when `localStorage.getItem('tark_tour_seen')` is null.
   - Mount `<OnboardingTour />` **strictly** when the user explicitly clicks the `Tour` button in the navigation rail/header.

4. **Isolate Single-Article SSR & Fix Mid-Word Slug Truncation:**
   - On `/intelligence/[slug]`, render only the target dispatch, its Examiner Trap MCQ, and its Historical Twin PYQ in the initial/SSR view (do not prepend the 45-card feed list above the article).
   - Update the slug generator to truncate cleanly on word boundaries:
   ```typescript
   export function toCleanSlug(title: string, maxLen = 72): string {
     const raw = title
       .toLowerCase()
       .replace(/[^a-z0-9\s-]/g, "")
       .trim()
       .replace(/\s+/g, "-");
     if (raw.length <= maxLen) return raw;
     return raw.slice(0, maxLen).replace(/-[^-]*$/, "");
   }
   ```

---

## 7. Workstream 6: Harden the Policy Ripple Radar Pipeline (`policy_chains`, `policy_entities`)

Ensure the newly deployed Policy Ripple Radar migration and cron worker (`server-lib/cron/policy-graph-worker.ts`) enforce these 5 invariants:

1. **Master Syllabus Join Key (`node_id`):**
   - `public.policy_chains` must include `node_id TEXT REFERENCES public.syllabus_nodes(id)` and `historical_twin_pyq_id TEXT REFERENCES public.pyq_prelims(id)`.

2. **Concentric Ring Depth (`ring_depth`) vs. Sequence (`step_order`):**
   - `public.policy_chain_nodes` must store `ring_depth INT CHECK (ring_depth BETWEEN 0 AND 3)` (`0` = Sovereign Trigger, `1` = Statutory/Rules, `2` = Nodal Execution, `3` = Rollout) separately from `step_order INT`, and enforce `UNIQUE (chain_id, dispatch_id)` for cron idempotency.

3. **Normalized Entity Slugs & `examiner_operator_type` Binding:**
   - `public.policy_entities` must deduplicate on `entity_slug TEXT UNIQUE` (e.g., `'ENT_ISM'`) with `aliases TEXT[]` so `"ISM"` and `"India Semiconductor Mission"` increment the same row, and bind `neutralized_trap` to `examiner_operator_type`.

4. **Context-Injected Chain Matching (No Blind ID Guessing):**
   - In `policy-graph-worker.ts`, query active chains (`SELECT chain_id, title, node_id, lead_driver FROM policy_chains WHERE status = 'active'`) and inject that compact directory into `GRAPH_EXTRACTOR_PROMPT` so the LLM matches real `chain_id` values deterministically without `pgvector`.

5. **Edge Caching on `GET /api/policy-radar`:**
   - Add `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` to `/api/policy-radar`.

---

## 8. Workstream 7: Sitemap & Route Alignment (`scripts/generate-sitemap.ts`)

1. Verify `scripts/generate-sitemap.ts` includes all live, indexable canonical hubs under `https://www.tark.live`:
   - `/`
   - `/intelligence`
   - `/daily-edition`
   - `/prs`
   - `/arena`
   - `/syllabus`
   - `/thinkers`
   - `/observatory`
   - `/manifesto`
   - `/sources`
   - `/privacy`
   - `/terms`
   - `/refund`

2. Ensure all individual `/intelligence/[slug]` URLs in `public/sitemap.xml` use the word-boundary-safe slug generator.

---

## 9. Verification & Acceptance Gates

Before marking `TASK_083` complete, run and verify all 6 gates:

1. **Cold-User Blind Spot Gate:**
   - Open `/intelligence` and `/prs` in an incognito context (`localStorage` empty). Verify **zero** cards display `• BLIND SPOT` or `[YOUR −0.66 BLIND SPOT]`.

2. **Zero Tour Leak in Raw HTML:**
   ```bash
   ! curl -s https://www.tark.live/privacy | grep -q "STEP 1 OF 6 WAR ROOM COMMAND"
   ! curl -s https://www.tark.live/ | grep -q "STEP 1 OF 6 WAR ROOM COMMAND"
   ```

3. **Legal Route Isolation Check:**
   - Verify `curl -s https://www.tark.live/privacy` contains `Privacy Policy` (`TARK-LEGAL-PP-2026-V2.4`) and does **not** contain the homepage hero string `"Diagnose your UPSC readiness and improve with evidence"`.

4. **Zero `< 100% Grounded` Badges on Public Feeds:**
   - Verify no card on `/intelligence` or `/daily-edition` renders `33% Grounded` or `50% Grounded`.

5. **PRS Date & Trivia Sanity Check:**
   - Verify `/prs` sorted by recency no longer lists 2019/2020 explainers under 2026 dates, and `/daily-edition` contains zero VRRR/T-Bill auction or Special Campaign 6 trivia items.

6. **Build & Type Safety:**
   - `npm run build` and `tsc --noEmit` exit `0` with zero errors.
