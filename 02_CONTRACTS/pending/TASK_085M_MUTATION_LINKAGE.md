---
task_id: "TASK_085M"
title: "Mutation linkage: 'what changed' from the verified fact ledger, not an LLM boolean"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085I", "TASK_085J"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
When a verified numeric fact (outlay, target, deadline) gets a new value, link the event that carried the old value
to the event that carried the new one with an `AMENDS` edge, and expose old → new with both quotes.

# 2. Transcluded Context References
- `supabase/migrations/20260819182814_continuous_readiness_core.sql:41-87` — `news_claim_versions(id, claim_id, version_no, value_text, numeric_value, evidence_quote, source_url, story_url, effective_at, observed_at)` and `news_claim_mutations(claim_id, action 'learn'|'replace', previous_version_id, current_version_id, reason, effective_at, detected_at)`.
- `server-lib/cron/ingest/rebase.ts:46` `canonicalClaimKey` (`v1|entity|metric|period|unit`), `:250` `recordVerifiedClaims`.
- `policy_events(dispatch_id → current_affairs.id)`, `current_affairs(url)`; `policy_edges` (085H).

**Distilled spec**
1. Join rule (SQL view `policy_fact_mutations_v`): for each `news_claim_mutations` row with `action='replace'`:
   `prev = news_claim_versions(previous_version_id)`, `cur = news_claim_versions(current_version_id)`;
   `src_event` = the lowest `event_seq` public event whose `current_affairs.url = prev.story_url`;
   `dst_event` = same for `cur.story_url`. Rows where either side has no event are kept in the view with nulls
   (shown as "changed" on the claim, not on the graph).
2. Worker step (inside `rebuildLineage`, after 085J): upsert `policy_edges(src, dst, 'AMENDS', 'fact_mutation', p=null, model_version='mutation_v1')` for rows with both sides and `compareEv(src, dst) < 0`; if the order is reversed (old value published later), skip and log `mutation_order_conflict`.
3. Pure formatter `server-lib/policy/mutation-format.ts`:
   `formatChange({ metric, unit, prevValueText, curValueText, prevQuote, curQuote, prevUrl, curUrl, effectiveAt })` →
   `{ headline: "{metric}: {prev} → {cur}", effectiveAt, sources: [{quote, url}, {quote, url}] }` — values printed exactly as stored (`value_text`), never re-computed.
4. Retire the LLM flag: stop reading `mutates_prior_fact` from the model in the v2 path (legacy column untouched).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` the migration slice and `rebase.ts:40-110`.
2. `write_to_file` migration `20261021000700_policy_fact_mutations_view.sql`, `mutation-format.ts`; `multi_replace_file_content` `policy-lineage-worker.ts`.
3. `write_to_file` `scripts/tests/radar/mutation.test.ts` (picked up by the `test:radar` glob).
4. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria
- Formatter: `{metric:'Outlay', prev:'₹19,744 crore', cur:'₹21,000 crore'}` → headline `"Outlay: ₹19,744 crore → ₹21,000 crore"` byte-identical to inputs.
- Edge builder unit test (pure function over in-memory rows): replace-mutation with both events present → one `AMENDS` edge src→dst; reversed chronology → no edge and a `mutation_order_conflict` log entry; `learn` action → no edge.
- `grep_search "mutates_prior_fact"` in `server-lib/policy/` → 0 matches.
- `npm run lint`, `npm run test:radar` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { test_radar: null, lint: null }
  migration_applied: false
diff: |
  <unified diff>
```
