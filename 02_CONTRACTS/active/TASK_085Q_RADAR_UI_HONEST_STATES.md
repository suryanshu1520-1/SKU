---
task_id: "TASK_085Q"
title: "Radar panel v2: lineage lanes, 'not yet seen' stage, source chips, what-changed badges, surge × exam weight"
parent: "TASK_085"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085A2", "TASK_085P"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 3000
  output_diff_max: 5000
---

# 1. High-Density Distilled Objective
Replace the Observatory "Ripple Radar" tab body with a v2 panel that renders `RadarV2` exactly as served: each step
opens its source at the quoted sentence, the next stage is shown as "not yet seen" with its sample size, and every
non-ok state is stated plainly instead of being filled with anything.

# 2. Transcluded Context References
- Types: `src/lib/policy-radar-v2-types.ts` (`RadarV2`, `Program`, `LineageNode`, `Evidence`, `Coverage`; `Gap.sentence` is final text from 085L).
- Mount point: `src/components/Observatory.tsx:2148` `<PolicyRippleRadar />`; tab entry `:841` (`id: 'ripple'`). Legacy component `src/components/observatory/PolicyRippleRadar.tsx` (1,393 lines) stays in the repo, unmounted.
- Stack: React 19, Tailwind v4, `lucide-react`. Existing palette in the Observatory: text `#e8e0cf`, muted `#8fa2bd`/`#9fb0c8`, accent `#0194a8`/`#5fe3f5`. Brand rule (`CLAUDE.md`): sterile, minimalist, analytical.
- Ring → lane: 0 Mandate, 1 Law, 2 Execution, 3 Delivery. Instrument enum (20 values) in 085H.

**Distilled spec** — new folder `src/components/observatory/radar-v2/`:
1. `labels.ts`: `RING_LABEL = ['Mandate','Law','Execution','Delivery']`; `INSTRUMENT_LABEL: Record<InstrumentClass,string>` (sentence case, e.g. `commencement_or_entry_into_force` → "Came into force"); compile-time exhaustive (`satisfies Record<…>`).
2. `sourceLink.ts`: `sourceHref(e: Evidence): string` = `e.source_url` + `#:~:text=` + `encodeURIComponent(firstWords).replace(/-/g, '%2D')` where `firstWords` = the first ≤ 8 whitespace-separated words of `e.quote` as stored — never normalised, the fragment must match the page — (Unicode-aware, works for Devanagari; `-`, `,`, `&` are text-directive delimiters and must be escaped); if the URL already has `#`, return it unchanged. `sourceLabel(url)` = hostname without `www.`.
3. `RadarV2Panel.tsx`: fetches `/api/policy-radar/v2` once (AbortController on unmount). States, each with fixed copy:
   - loading → skeleton rows (no numbers);
   - `paused` → "Policy Radar is being rebuilt on verified sources. It returns when it passes its accuracy checks.";
   - `unavailable` → "Policy Radar could not load. Nothing is shown rather than old data.";
   - `ok` with 0 programs → "No verified policy events yet.";
   - `stale` → data **plus** a banner "Stale since {last_event_at, local date}";
   - always (except loading) → coverage line: "Built from {events} verified events across {programs} programs since {since}. Updated {relative generated_at}."
   Left: program list (name, kind, last step date); deep link `?tab=ripple&program=<slug>` (read on load, written on select with `history.replaceState`); unknown or legacy `chain=` param → first program, no error.
4. `ProgramLineage.tsx`:
   - ≥ 768 px: four horizontal lanes; nodes placed left→right by their order index (not by date, so clusters stay legible); parent links as SVG cubic paths from `parent_event_id`; node = date · instrument label · actor name (+ "Tier n · {legal_basis_ref}" when present) · source chip.
   - < 768 px: single vertical list in order; lane shown as a small label chip; parent shown as "follows {instrument} of {date}".
   - Ghost node after the last node, in the lane of `gap.nextStage`, dashed outline, text = `gap.sentence` verbatim. Hidden when `gap.status` is `complete` or `not_applicable`.
   - Nodes with `date_source = 'ingested'` show "date of Tark ingestion" under the date.
   - Mutations: badge on the node whose `event_id` equals the mutation's `event_id`: `headline` verbatim; expanding shows both quotes with source chips.
   - Ripples: list under the lineage, "Cites {other_name}" (upstream) / "Cited by {other_name}" (downstream), quote + chip; learned ones add "model link, p = {p.toFixed(2)}".
4b. `BossMcq.tsx` (only when `program.boss_mcq`): question + 4 options; on submit `POST /api/policy-radar/v2/boss-mcq/:id/check`; then show correct/incorrect and the dissection (each statement: true/false, operator name for false ones, evidence quote + source chip). No answer is computed or stored client-side.
5. `SignalsQuadrant.tsx`: scatter of `node_signals` (x = `exam_weight`, y = `score`), surging points filled, others outlined; vertical guide at the median `exam_weight` of the shown nodes; no horizontal threshold line (significance is the `surging` flag). Hover/focus shows the node `title`, `x_recent` vs `expected` ("{x} items in 14 days vs {expected.toFixed(1)} expected"). A visually-hidden `<table>` carries the same data.
6. Vocabulary guard `scripts/tests/radar/vocab.test.ts` (render with `react-dom/server` `renderToStaticMarkup`): rendered text of all components over fixtures contains none of `ERUPTING|HEATING|volcano|delayed|pending|failed|not done` (case-insensitive).
7. `Observatory.tsx`: mount `<RadarV2Panel />` instead of `<PolicyRippleRadar />`; tab label "Policy Radar"; badge = `programs.length` when status is `ok`/`stale`, else none.
Accessibility: every chip is an `<a target="_blank" rel="noopener noreferrer">` with `aria-label="Open source: {host}"`; lanes have `role="list"`; colour is never the only signal (surging also uses a filled shape + text).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `Observatory.tsx:835-895, 2140-2154`.
2. `write_to_file` the files in spec 1–6; `multi_replace_file_content` `Observatory.tsx` (spec 7).
3. `write_to_file` fixtures `scripts/tests/fixtures/radar/v2-payload.json` (3 programs incl. one Hindi quote, one stale) and tests for `sourceHref`, labels exhaustiveness and the vocabulary guard (picked up by the `test:radar` glob).
4. `run_command` `npm run lint`, `npm run test:radar`, `npm run build`.
5. `run_command` `npm run dev` with a mocked `/api/policy-radar/v2` (env `RADAR_V2_FIXTURE=scripts/tests/fixtures/radar/v2-payload.json` read by the handler only when `NODE_ENV !== 'production'`), then `browser_subagent`: `/observatory?tab=ripple&program=<fixture slug>` at 390×844 and 1280×800 — capture screenshots; check no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`), ghost node present, a source chip `href` contains `#:~:text=`.

# 4. Deterministic Acceptance Criteria
- `sourceHref({ source_url: 'https://pib.gov.in/x?PRID=1', quote: 'भारत और न्यूज़ीलैंड ने मुक्त व्यापार समझौते पर हस्ताक्षर किए' })` ends with `#:~:text=` + `encodeURIComponent('भारत और न्यूज़ीलैंड ने मुक्त व्यापार समझौते पर')` (first 8 words); a quote `India-New Zealand FTA` yields `India%2DNew%20Zealand%20FTA`; a URL containing `#` is returned unchanged.
- `INSTRUMENT_LABEL` has exactly the 20 enum keys (type-checked + runtime test).
- Vocabulary guard passes on all fixtures and all states.
- Status rendering: fixtures for `paused`, `unavailable`, empty `ok`, `stale` each render their fixed copy and no program nodes (except `stale`, which renders nodes + banner).
- Browser checks above pass at both widths; screenshots attached to the receipt.
- `RADAR_V2_FIXTURE` is ignored when `NODE_ENV === 'production'` (unit test on the handler guard).
- `npm run lint`, `npm run test:radar`, `npm run build` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: ["write_to_file", "multi_replace_file_content", "replace_file_content", "run_command", "view_file", "browser_subagent", "grep_search"]
  duration_ms: 380000
  exit_codes: { lint: 0, test_radar: 0, build: 0 }
  browser: { w390_no_hscroll: true, w1280_no_hscroll: true, ghost_node: true, text_fragment_href: true }
  screenshots:
    - "C:\\Users\\bentn\\.gemini\\antigravity-ide\\brain\\a885cd34-c907-4100-a092-8de11d31aa27\\radar_v2_mobile_1792517322976.png"
    - "C:\\Users\\bentn\\.gemini\\antigravity-ide\\brain\\a885cd34-c907-4100-a092-8de11d31aa27\\radar_v2_desktop_1792517353171.png"
diff: |
  src/components/observatory/radar-v2/labels.ts: RING_LABEL and exhaustive INSTRUMENT_LABEL (20 enum keys).
  src/components/observatory/radar-v2/sourceLink.ts: sourceHref Scroll-to-Text-Fragment generator and sourceLabel host extractor.
  src/components/observatory/radar-v2/SignalsQuadrant.tsx: Accessible scatter plot with median weight guide and text + fill markers.
  src/components/observatory/radar-v2/BossMcq.tsx: Server-side evaluated Boss MCQ component with statement dissection.
  src/components/observatory/radar-v2/ProgramLineage.tsx: Desktop 4 horizontal lanes + mobile vertical list, ghost node, what-changed mutation badges, and cross-program ripples.
  src/components/observatory/radar-v2/RadarV2Panel.tsx: Main panel with honest states (loading, paused, unavailable, ok-empty, stale), deep-linking (?tab=ripple&program=<slug>).
  src/components/Observatory.tsx: Mounted RadarV2Panel in place of legacy component, updated tab and banner counters.
  server-lib/policy-radar-v2.ts: Added RADAR_V2_FIXTURE non-production dev hook.
  scripts/tests/fixtures/radar/v2-payload.json: 3-program test fixture.
  scripts/tests/radar/vocab.test.ts: 5 unit tests verifying sourceHref encoding, label exhaustiveness, vocabulary guard, and status copy.
```
