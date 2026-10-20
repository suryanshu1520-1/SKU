---
task_id: "TASK_085C"
title: "Hindi-safe ministry attribution for PIB + backfill"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085A"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
PIB rows get their real issuing ministry instead of `"Government of India"`. Today 320 of the latest 400
`current_affairs` rows carry the fallback because `norm()` deletes Devanagari and PIB is ingested in Hindi.

# 2. Transcluded Context References
- `server-lib/cron/ingest/classify.ts:59-60` — `norm(t) = t.toLowerCase().replace(/[^a-z0-9\s]/g, " ")…` (root cause).
- `server-lib/cron/ingest/classify.ts:67-78` — `deriveMinistry(text, fallback)` over `MINISTRY_ALIASES`, `CANONICAL_ENTITIES`.
- `server-lib/cron/ingest/sources.ts:81-108` — PIB adapter (`lang: "hi"`, RSS gives title + PRID link; body selector comment mentions PIB's triple-'n' class typo).
- Evidence: brief PRID 2325286 span `s0` begins `"वाणिज्\u200Dय एवं उद्योग मंत्रालय …" (U+200D zero-width joiner after the virama)` — the ministry heading is the first line of the release body.

**Distilled spec**
1. Unicode-safe normaliser (export it as `normUnicode` from a new `server-lib/text/normalize.ts` and use it in `classify.ts`):
   ```ts
   export function normUnicode(t: string): string {
     return t.normalize("NFKC").toLowerCase().replace(/[\u200C\u200D]/g, "")
       .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
   }
   ```
   `\p{M}` is mandatory: Devanagari matras and the virama are combining marks.
2. Data file `server-lib/cron/ingest/data/pib-ministries.json`: array of `{ "slug": "ENT_MOCI", "en": "Ministry of Commerce & Industry", "hi": ["वाणिज्य एवं उद्योग मंत्रालय"], "source_url": "<PIB listing URL>" }`. Build it at dev time from PIB's own English and Hindi ministry listings (use `firecrawl_scrape`/`browser_subagent`); if both languages expose the same ministry identifiers, join on them, else map by hand and keep the listing URL. Store `hi` variants both with and without nukta/ZWJ.
3. PIB extract: capture the release's ministry heading (first heading line of the release body; confirm the selector on PRIDs 2325286, 2325285, 2325292) as `ministryHint`; save one HTML snapshot as `scripts/tests/fixtures/pib/2325286.html`.
4. `deriveMinistry` order: `ministryHint` → Hindi alias match on the first 200 chars of body → existing English aliases → fallback. Return `{ ministry, ministry_source: 'pib_heading'|'hi_alias'|'en_alias'|'fallback' }` from a new `deriveMinistryDetailed`; keep `deriveMinistry` as a thin string wrapper for current callers.
5. Backfill script `scripts/radar/backfill-ministry.ts` (dry-run by default, `--apply` to write): for `source='PIB' AND ministry='Government of India'`, run step 4 on the first evidence quote (`summary.claims[0].quotes[0]` or `summary.exam_insights.facts[*].evidence[0].quote` with `span_id='s0'`). Print `{scanned, resolved, still_fallback}`.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `classify.ts:1-80`, `sources.ts:81-110`.
2. `call_mcp_tool` firecrawl / `browser_subagent` → build `pib-ministries.json`, confirm heading selector, save fixture HTML.
3. `write_to_file` `server-lib/text/normalize.ts`, data file, backfill script.
4. `multi_replace_file_content` `classify.ts`, `sources.ts`.
5. `write_to_file` `scripts/tests/radar/ministry.test.ts` (picked up by the `test:radar` glob).
6. `run_command` `npm run test:radar`, `npm test`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
- `normUnicode("वाणिज्\u200Dय एवं उद्योग मंत्रालय")` === `normUnicode("वाणिज्य एवं उद्योग मंत्रालय")` (ZWJ variant) and both keep the matra `ा` and virama `्`.
- `normUnicode("Ministry of Commerce & Industry")` === `"ministry of commerce industry"`.
- ≥ 10 Hindi ministry first-lines in the test map to the correct slug (include Commerce, Finance, Home Affairs, Defence, Health & FW, Environment, Power, MeitY, Agriculture, External Affairs).
- The fixture HTML for PRID 2325286 yields `ministry_source='pib_heading'`, ministry Commerce & Industry.
- Existing `npm test` still passes (English behaviour unchanged).
- `pib-ministries.json` has ≥ 50 entries, every entry with `source_url`.
- *Orchestrator post-deploy:* backfill `--apply`, then latest 200 PIB rows have ≥ 90 % `ministry <> 'Government of India'`.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { test_radar: null, test: null, lint: null }
  pib_heading_selector: ""
  ministries_mapped: 0
diff: |
  <unified diff>
```
