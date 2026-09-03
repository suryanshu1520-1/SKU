---
task_id: "TASK_042_FIRECRAWL_EXTRACTION_FALLBACK"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2000
depends_on: []
queue_gate: "NONE — independent of TASK_034-041. Per the default Autonomous Multi-Contract Queue Protocol (ascending numeric order), this naturally executes after that already-active batch finishes, since it was dispatched later and nothing here is urgent enough to jump the queue."
---

# 1. High-Density Distilled Objective

Add Firecrawl `/scrape` as a same-gate fallback inside `extractFromUrl()` (`server-lib/cron/ingest/extract.ts`) — the single function every non-preSummarized source adapter (PIB, PRS, and every `rssSource`-based wire adapter: Indian Express, The Hindu, Business Standard, LiveMint) calls to fetch+extract an article body. It must fire **only** when the existing got-scraping+cheerio extraction already returned text below the ~200-char floor each call site already uses to reject it today — so it can only ever recover an item that would otherwise be silently dropped, and can never regress a currently-working path.

**Honest calibration, checked before writing this contract — read before implementing:** this is a resilience addition for a documented but currently-quiescent failure mode, not a fix for an actively-reproducing bug. `sources.ts`'s own header comment and `orchestrator.ts`'s no-text-gate describe wire sources as prone to paywall/truncation self-drop. Live spot-checks run today (2026-09-03) against one real, current article each from The Hindu, official PIB, and Business Standard all **succeeded** on the existing free path — real body text extracted, no fallback needed. Do not write a receipt claiming this "fixes broken ingestion"; it hardens a real, documented, intermittent risk. A separate idea from the same investigation — reordering `pib-aggregator.ts`'s Lukmaan-IAS/InsightsIAS/official-PIB waterfall — was considered and **rejected**: that file's docstring (lines 1-33) shows the ordering is a deliberate UPSC-relevance curation choice (Lukmaan/InsightsIAS pre-select exam-worthy releases; official PIB RSS is comprehensive but uncurated), not a reliability workaround. Do not touch `pib-aggregator.ts` in this contract.

# 2. Transcluded Context References

- `server-lib/cron/ingest/extract.ts:191-199` — `extractFromUrl()`, the function to modify.
- `server-lib/cron/ingest/extract.ts:151-188` — `extractBody()`, so you know what "thin" means today (its own internal tier thresholds are 120/200/200 chars).
- `server-lib/cron/ingest/sources.ts:64-76` — `rssSource()`'s generic `extract`, calls `extractFromUrl(ref.url, opts.selectors ?? [])`; its own post-check compares the result against `opts.minBodyChars ?? 200`.
- `server-lib/cron/ingest/sources.ts:92-100` — `PIB.extract`, calls `extractFromUrl(ref.url, [...])` then hardcodes `body.length < 200`.
- `server-lib/cron/ingest/sources.ts:150-161` — `PRS.extract`, same pattern, also hardcodes `< 200`.
- `server-lib/cron/ingest/orchestrator.ts:167-173` — the no-text gate that drops a candidate when the returned body is too short; confirms `extractFromUrl`'s return value is the only thing that determines drop/keep here, so there are no other side effects to manage.
- `FIRECRAWL_API_KEY` is already present in local `.env` (added directly by the Orchestrator, not part of this contract) for local dev/testing. Production provisioning (Vercel env vars) is a separate Orchestrator/user decision, same boundary as the standing `apply_migration` invariant — your code must read `process.env.FIRECRAWL_API_KEY` and behave exactly as it does today (fallback silently unavailable, no throw) when it's unset.
- New capability, useful for your own testing while implementing (not for the production code path): `call_mcp_tool (firecrawl)` is now available to you directly (registered 2026-09-03) — see updated `00_SYSTEM/AGENT_CAPABILITIES.md` §2. You can use it interactively to scrape a test URL and sanity-check expected output while writing this fix. The **production** code in `extract.ts` must still call Firecrawl's own REST API directly (`fetch`) — Vercel's deployed serverless functions cannot reach your IDE's MCP tools.

# 3. Mandatory Tool Chain & Execution Path

1. `view_file` on all four cited ranges above to confirm current line numbers before editing (files may have shifted).
2. `grep_search` for every call site of `extractFromUrl(` in `server-lib/` — do not assume the three sites cited above are exhaustive. This pipeline has a documented history (TASK_019, TASK_021, TASK_022, TASK_030) of contracts that fixed exactly the cited lines and missed structurally-identical siblings; paste the raw grep output in the receipt, not a paraphrase.
3. Design the fallback inside `extractFromUrl()` (or a small helper it calls) so every existing caller benefits with no call-site changes required. Use `fetch()` against `https://api.firecrawl.dev/v2/scrape` with header `Authorization: Bearer ${process.env.FIRECRAWL_API_KEY}` — do not add the `@mendable/firecrawl-js` SDK as a new dependency unless you have a specific reason; state the choice and why in the receipt either way.
4. Request `jsonOptions` (a schema like `{ body: string }` plus a prompt instructing extraction of only the article body text) rather than raw `markdown` + `onlyMainContent`. Verified live during this contract's own pre-validation: The Hindu's raw markdown output mixed real article text with subscription/login/"We found a few errors"/comments boilerplate in the same response even with `onlyMainContent: true` — a structured, prompted extraction avoids reintroducing selector-style fragility in a new form.
5. `replace_file_content` — apply the change.
6. Prove the new branch actually executes: find or construct a real case where `fetchText`/`extractBody` returns thin/empty content (e.g., a URL got-scraping can't reach, or a controlled test with a deliberately-impossible selector on a page thin enough that the generic tier-2/3/4 fallbacks in `extractBody` also come up short), run it for real, and paste the actual before/after body length and a text snippet in the receipt. "Implemented, should work" is not acceptance evidence.
7. Prove the negative path too: with `FIRECRAWL_API_KEY` temporarily unset (or pointed at an unreachable host), confirm `extractFromUrl` still returns exactly what it returns today — no throw, no unbounded hang. State the timeout you chose.
8. `run_command` — `npm run lint:api`, `npm run build`.

# 4. Deterministic Acceptance Criteria

1. `extractFromUrl()` calls Firecrawl only when the got-scraping+cheerio result is below the ~200-char floor each existing call site already enforces — verify by reading the changed function directly, not by trusting a description of it.
2. Missing/invalid `FIRECRAWL_API_KEY`, a Firecrawl error, or a timeout all fall through to today's exact behavior (return the thin/empty string) — never throw, never unboundedly block the caller. Demonstrated live per tool-chain step 7, not asserted.
3. Firecrawl's response is passed through a structured `jsonOptions` extraction (schema + prompt), not raw markdown accepted verbatim — justify this against the live Hindu boilerplate example in §1/§3 if you choose differently.
4. Raw, complete `grep_search` output for every `extractFromUrl(` call site in `server-lib/` is pasted in the receipt, and each site is confirmed to benefit or is explicitly justified as excluded.
5. `git diff --stat` in the receipt confirms `server-lib/cron/pib-aggregator.ts` is untouched.
6. At least one real, executed demonstration that the fallback branch itself runs and returns real non-empty text — actual body-length numbers and a text snippet, per tool-chain step 6.
7. `npm run lint:api` and `npm run build` both exit 0.
8. The receipt does **not** claim this fixes currently-broken ingestion — state plainly that live spot-checks on 2026-09-03 (Hindu, PIB, Business Standard) found the existing path already working, and that this is a resilience addition, matching §1's honest framing.
9. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose.)_

```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: {}
diff: |
  <unified diff>
```
