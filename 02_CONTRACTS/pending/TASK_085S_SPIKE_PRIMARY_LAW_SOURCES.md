---
task_id: "TASK_085S"
title: "Spike (report only): can Tark observe the Law and Execution rings from primary sources instead of press releases?"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: []
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 3000
  output_diff_max: 3000
---

# 1. High-Density Distilled Objective
PIB tells Tark what the government announces. The asymmetry the radar targets sits in what happens after: bill
stages, gazette notifications, rules, commencement dates. Measure, with real fetches, whether five primary sources can
be ingested reliably and lawfully, and recommend the order to add them. **No production code.**

# 2. Transcluded Context References
- Candidate sources (verify each URL; do not assume structure):
  1. PRS Legislative Research bill tracker — `https://prsindia.org/billtrack` (stages: introduced / referred / passed by each House / assent).
  2. Parliament — `https://sansad.in` (Lok Sabha / Rajya Sabha bill lists and status).
  3. e-Gazette of India — `https://egazette.gov.in` (notifications: Acts, rules, commencement, S.O./G.S.R. numbers).
  4. India Code — `https://www.indiacode.nic.in` (enacted Acts, subordinate legislation, commencement notes).
  5. RBI — notifications and master directions — `https://www.rbi.org.in` (regulation_issued events).
- Tark's existing fetch stack: `got-scraping` over HTTP (no headless browser in CI, see `.github/workflows/scraper.yml` comment); PIB returns 403 to non-browser clients from some networks.
- Target mapping (085H instrument classes): `bill_introduced`, `bill_passed`, `act_assented`, `rules_notified`, `regulation_issued`, `commencement_or_entry_into_force`.

**Questions to answer per source** (table + evidence):
- Access: HTTP status with plain `got-scraping` GET from CI-like conditions; need for JS rendering; captcha; PDF vs HTML.
- Terms: robots.txt lines that apply; any terms-of-use text on reuse (quote it with URL). Mark "unclear" rather than guessing.
- Structure: for 5 recent items, can we extract `{title, date, instrument class, issuing authority, stable URL, identifier (bill no. / S.O. / G.S.R. / notification no.)}` deterministically? Show the 5 parsed records and the selector/regex used.
- Freshness: publication lag vs the PIB release for the same item (find ≥ 2 matched pairs where possible).
- Hindi/English availability and which one carries the identifier.
- Change risk: does the page expose an RSS/JSON/listing endpoint, or only HTML?
- Estimated daily volume and politeness budget (requests/day at ≤ 1 req / 5 s).

# 3. Mandatory Tool Chain & Execution Path
1. `call_mcp_tool` firecrawl (scrape) and `run_command` `npx tsx -e` one-off `got-scraping` probes saved under `scripts/spikes/085S/` (not imported anywhere, not run in CI).
2. `browser_subagent` only to confirm what a page shows when HTTP fetch fails; record that it needed a browser.
3. `write_to_file` `docs/radar/primary-law-sources.md`: per-source section (answers above, with quoted evidence and URLs), a comparison table, and a recommendation: which source to add first for each of rings 1 and 2, the identifier to use as a join key with `policy_events`, and the risks.
4. `write_to_file` `docs/radar/primary-law-sources.samples.json`: the parsed sample records.

# 4. Deterministic Acceptance Criteria
- Report covers all 5 sources; every claim about access or terms has a URL and a fetch timestamp or a quoted line.
- ≥ 3 sources have 5 parsed sample records each, or the report states why not (status code / rendering need).
- No file outside `docs/radar/` and `scripts/spikes/085S/` is changed (`git status` in receipt).
- Probe scripts make ≤ 60 requests in total and wait ≥ 5 s between requests to the same host.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  requests_made: { prsindia: 0, sansad: 0, egazette: 0, indiacode: 0, rbi: 0 }
  samples_parsed: { prsindia: 0, sansad: 0, egazette: 0, indiacode: 0, rbi: 0 }
  git_status: ""
report: "docs/radar/primary-law-sources.md"
```
