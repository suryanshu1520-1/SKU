---
task_id: "TASK_085I"
title: "Extract policy events inside the existing grounded synthesis call, behind deterministic gates"
parent: "TASK_085"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "high"
depends_on: ["TASK_085B", "TASK_085C", "TASK_085G", "TASK_085H"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 6000
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
With **zero additional LLM calls**, every grounded brief yields 0–3 `policy_events` rows; an event is stored only if
its instrument trigger, actor name and program name are all found inside its cited source spans.

# 2. Transcluded Context References
- `server-lib/cron/ingest/synthesize.ts:121-170` — `EN_GROUNDED_SYSTEM`, `HI_GROUNDED_SYSTEM` JSON schemas (spans are integer indices into `segmentSpans` output); `:209-215` `GroundedSynthesis`; `synthesizeGrounded` (below `:400`).
- `server-lib/cron/ingest/orchestrator.ts:385-400` (grounded call), `:510-516` (upsert returns `id` after 085B).
- `server-lib/cron/ingest/verify.ts:51` `segmentSpans`, `:81` `extractFacts`, `:156` `verifyClaim`.
- `server-lib/policy/instruments.ts` (`RING_OF`, `NON_EVENTS`, `assertEvidence`) — 085H; `server-lib/policy/resolve.ts` — 085G; `server-lib/text/normalize.ts` — 085C.

**Distilled spec**
1. Add to **both grounded prompts only** (ungrounded fallback produces no events):
   ```
   "policy_events": [{ "instrument": <one of the 20 instrument_class values or a non-event value>,
     "actor": string,            // exactly as written in the source span (Hindi stays Hindi)
     "program": string | null,   // exactly as written in the source span
     "program_en": string | null,// English name, used only for slug/display, never for gating
     "program_kind": "scheme"|"mission"|"act"|"bill"|"treaty"|"regulation"|"policy"|null,
     "date_text": string | null, "summary": string, "spans": number[] }]  // 0-3 items; only formal government actions
   ```
   with one instruction line: "Meetings, visits, campaigns, ceremonies, conferences and awareness drives are not policy events."
2. `server-lib/policy/instrument-lexicon.ts`: `TRIGGERS: Record<InstrumentClass, { en: RegExp[]; hi: RegExp[] }>` covering all 20
   classes. Minimum patterns (extend, never weaken):
   `cabinet_approval` en `/\b(union )?cabinet\b.*\bapprov/i`, `/\bCCEA\b/` · hi `/मंत्रिमंडल/`, `/मंजूरी/`
   `rules_notified` en `/\bnotif(y|ied|ication)\b/i`, `/\bRules,? 20\d\d\b/` · hi `/अधिसूच/`
   `commencement_or_entry_into_force` en `/\b(come|comes|came) into (force|effect)\b/i`, `/\btake[s]? effect\b/i` · hi `/लागू\s*हो/`
   `funds_released` en `/\b(released|sanctioned|allocated)\b.*(₹|rs\.?|crore|lakh)/i` · hi `/(जारी|स्वीकृत|आवंटित)/`
   `guidelines_issued` en `/\bguidelines?\b|\bSOPs?\b/i` · hi `/दिशानिर्देश|दिशा-निर्देश/`
   `bill_passed` en `/\bbill\b.*\bpassed\b|\bpasses\b.*\bbill\b/i` · hi `/विधेयक.*पारित/`
   `project_commissioned` en `/\b(inaugurat|dedicat\w* to the nation|commission)/i` · hi `/(उद्घाटन|लोकार्पण)/`
   `enforcement_action` en `/\b(seiz|arrest|penalt|raid)/i` · hi `/(जब्त|गिरफ्तार|जुर्माना)/`
   `treaty_signed` en `/\bsign(ed|ing)\b.*\b(agreement|MoU|treaty|FTA)\b/i` · hi `/हस्ताक्षर/`
3. `server-lib/policy/events.ts`:
   ```ts
   export type EventFrame = { instrument: string; actor: string; program: string|null; program_en: string|null; program_kind: string|null;
     date_text: string|null; summary: string; spans: number[] };
   export type GateOutcome = { ok: true; row: PolicyEventInsert } | { ok: false; reason: string };
   export function gateEvent(f: EventFrame, spans: EvidenceSpan[], ctx: { dispatchId: string; seq: number;
     sourceUrl: string; releaseDate: string|null; ingestedAt: string; resolveActor(m: string): ResolveResult;
     resolveProgram(m: string): string|null; extractorVersion: string }): GateOutcome;
   ```
   Gate order (first failure wins, reason codes exact): `non_event` (instrument ∈ NON_EVENTS or not in RING_OF) →
   `no_spans` (no valid span index) → `no_trigger` (no TRIGGERS pattern of that class, in the span's language, matches
   any cited span) → `actor_not_in_span` (normUnicode(actor) — or a registry alias of the resolved slug — not a substring
   of any normUnicode(cited span)) → `program_not_in_span` (same rule when program ≠ null) → `numbers_unverified`
   (`verifyClaim(summary, citedIds, spans).verified === false`).
   Passing frames: `actor_slug` = resolved slug, or `null` + `review_id` from `enqueueReview` when ambiguous/unknown;
   `event_date`: release date → else first ISO/`d Month yyyy`/`d माह yyyy` date in a cited span (`date_source='span'`) → else ingested.
   Hindi months (accept both spellings): जनवरी, फरवरी/फ़रवरी, मार्च, अप्रैल, मई, जून, जुलाई, अगस्त, सितंबर/सितम्बर,
   अक्टूबर/अक्तूबर, नवंबर/नवम्बर, दिसंबर/दिसम्बर. Parse on `normUnicode` text;
   `evidence` = cited spans as `{ span_id: "s"+i, quote: span.text, source_url }`.
4. Program creation (open world): if `program` is unresolved **and** `RING_OF[instrument] <= 1`, insert into
   `policy_programs` with slug `PRG_` + uppercase snake of `program_en` (ASCII only, ≤ 48 chars; skip creation if
   `program_en` or `program_kind` is null), `provenance='auto'`, `aliases=[program, program_en]`, `node_id` = the brief's `node_id`.
   Unresolved programs on ring 2–3 → `program_slug = null`. Program resolution uses `resolve()` over program aliases.
5. Persist after the `current_affairs` upsert returns its id: upsert on `(dispatch_id, event_seq)`; log every drop with
   `recordIngestDecision({ ingestRunId, sourceId, candidateUrl: url, candidateFingerprint: url + '#event' + seq,
   decision: 'excluded', reasonCode: 'event_' + reason })` (the table is `UNIQUE(ingest_run_id, candidate_fingerprint)` and
   the orchestrator already logs the bare URL). Set `extractorVersion = 'events_v1'`.
6. Row status (only when `RADAR_V2 === '1'`): ≥ 1 event row stored → `graph_status='linked', graph_processed_at=now`;
   grounded synthesis with 0 stored events, or the ungrounded fallback → `'no_event'`; an error while persisting →
   `graph_status='failed', graph_attempts = graph_attempts + 1` (synthesis is not re-run, so there is no retry).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` `synthesize.ts:121-215` and the `synthesizeGrounded` body; `orchestrator.ts:380-520`.
2. `write_to_file` `instrument-lexicon.ts`, `events.ts`.
3. `multi_replace_file_content` `synthesize.ts` (both grounded prompts + `GroundedSynthesis.policy_events?: EventFrame[]` + parse), `orchestrator.ts` (gate + persist).
4. `write_to_file` `scripts/tests/radar/events.test.ts` (picked up by the `test:radar` glob).
5. `run_command` `npm run test:radar`, `npm test`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
- Lexicon test: ≥ 20 English and ≥ 20 Hindi positive sentences (≥ 1 per class for the 9 classes listed) match their class; 10 negatives (a review meeting, a courtesy call, a Swachhata campaign, a seminar, an award) match **no** class.
- Gate tests with spans built by `segmentSpans`:
  1. NZ FTA (Hindi span "वाणिज्य एवं उद्योग मंत्रालय भारत-न्यूजीलैंड मुक्त व्यापार समझौता (एफटीए) 20 अक्टूबर 2026 को विजय दशमी के अवसर पर लागू होगा"), frame `{instrument:'commencement_or_entry_into_force', actor:'वाणिज्य एवं उद्योग मंत्रालय', program:'भारत-न्यूजीलैंड मुक्त व्यापार समझौता', summary:'The India-New Zealand free trade agreement comes into force on 20 October 2026.', spans:[0]}`, `releaseDate: null` → ok, ring 1, `date_source='span'`, `event_date='2026-10-20'`.
     (Write "free trade agreement", not "FTA": `verifyClaim` requires ≥3-letter acronyms verbatim and the Hindi source writes "एफटीए". Add this rule to the prompt line for `summary`.)
  2. Same frame with `instrument:'campaign_or_awareness'` → `non_event`.
  3. Frame citing a span without any trigger → `no_trigger`.
  4. Actor "Ministry of Power" absent from the cited span → `actor_not_in_span`.
  5. Summary containing "₹19,744 crore" not present in spans → `numbers_unverified`.
- Prompt snapshot test: both grounded system prompts contain `"policy_events"` and the non-event instruction; the ungrounded prompts do not.
- `npm test`, `npm run lint`, `npm run test:radar` exit 0.
- *Orchestrator post-deploy (1 week):* manual audit sheet from 085R shows event precision ≥ 0.90 on 50 random stored events.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: ["view_file", "write_to_file", "replace_file_content", "multi_replace_file_content", "run_command"]
  duration_ms: 32000
  exit_codes: { test_radar: 0, test: 0, lint: 0 }
  lexicon_patterns: { en: 39, hi: 39 }
diff: |
  server-lib/policy/instrument-lexicon.ts (39 en, 39 hi bidirectional trigger patterns covering all 20 classes)
  server-lib/policy/events.ts (gateEvent, buildProgramSlug, parseEventDate, defaultResolveActor)
  server-lib/policy/review-queue.ts (enqueueReview returns id)
  server-lib/cron/ingest/synthesize.ts (schema + non-event instruction in grounded prompts, policy_events parsing)
  server-lib/cron/ingest/orchestrator.ts (processPolicyEventsForDispatch, auto-program creation, review enqueue, RADAR_V2 graph_status)
  scripts/tests/radar/events.test.ts (20 en / 20 hi positives, 10 negatives, 5 acceptance gates, snapshot test)
```
