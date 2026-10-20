---
task_id: "TASK_085F"
title: "Seed the authority registry from official sources (every row cited)"
parent: "TASK_085"
status: "PENDING_EXECUTION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085C", "TASK_085E", "TASK_085G"]
human_gate: "G1 — Orchestrator/user reviews the seed diff before the loader runs with --apply"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
Produce a cited, machine-validated seed file of Union authorities (all ministries and departments, plus the
statutory/constitutional bodies, regulators and CPSEs that actually appear in Tark's sources) and a loader that
upserts it with `provenance='registry'`.

# 2. Transcluded Context References
- Registry columns and tier derivation: TASK_085E distilled spec (`legal_basis_kind`, `legal_basis_ref`, `jurisdiction`, `kind`, `parent_entity_slug`, `source_url`; tier is derived by trigger — do not hand-set it).
- `server-lib/cron/ingest/data/pib-ministries.json` from 085C (reuse slugs, `hi` aliases).
- `server-lib/policy/resolve.ts` `aliasVariants` + `aliasNorm` (085G) for `alias_norm` — the same functions the resolver uses at lookup time.

**Distilled spec**
1. File `server-lib/policy/data/authorities.seed.json`:
   ```json
   { "entity_slug": "ENT_RBI", "authority": "Reserve Bank of India", "aliases_en": ["RBI"], "aliases_hi": ["भारतीय रिज़र्व बैंक"],
     "kind": "regulator", "jurisdiction": "union", "legal_basis_kind": "central_act",
     "legal_basis_ref": "Reserve Bank of India Act, 1934", "parent_entity_slug": null,
     "source_url": "https://www.indiacode.nic.in/…" }
   ```
2. Coverage:
   - **Ministries and departments:** all entries of the First Schedule of the Government of India (Allocation of Business) Rules, 1961, `legal_basis_kind='executive_order'`, `legal_basis_ref='Allocation of Business Rules, 1961'`, `source_url` = the official AoB Rules text (Cabinet Secretariat site) or the ministry's own site.
   - **Bodies:** generate a frequency list of organisation names from the last 90 days of `current_affairs` (headline + bullets + English evidence) with `scripts/radar/candidate-authorities.ts`; seed the top 80 that are bodies (not people/places). Each gets its enabling instrument: Constitution article (constitution.gov.in / India Code), Act (India Code URL of the Act), resolution/notification (Gazette or ministry URL), Societies/Companies registration (official site "About us" page that states it).
   - **Never guess a legal basis.** If no official page states it, leave the body out and list it in the receipt under `unsourced`.
3. Loader `scripts/radar/load-authorities.ts`: validates, then (dry-run default) prints the diff vs DB; `--apply` upserts entities with `provenance='registry'` and writes aliases: for every display alias (`authority`, `aliases_en`, `aliases_hi`) store each of `aliasVariants(alias)` as `alias_norm` (so "India Semiconductor Mission (ISM)" yields the full name, the name without the parenthetical, and "ism"), failing on any `alias_norm` collision across different slugs.
4. Existing `llm_legacy` rows with the same slug are updated in place (provenance becomes `registry`); others stay `llm_legacy` (not public).

# 3. Mandatory Tool Chain & Execution Path
1. `call_mcp_tool` firecrawl `firecrawl_scrape` on the AoB Rules page and each body's citation page; `firecrawl_search` only to locate official pages.
2. `run_command` `npx tsx scripts/radar/candidate-authorities.ts` (reads DB via service key in `.env`; read-only).
3. `write_to_file` seed JSON, candidate script, loader, `scripts/tests/radar/authorities-seed.test.ts` (picked up by the `test:radar` glob).
4. `run_command` `npm run test:radar`, `npx tsx scripts/radar/load-authorities.ts` (dry run only).

# 4. Deterministic Acceptance Criteria
- Validation test over the seed file: ≥ 120 rows; every `source_url` starts with `https://` and its host ends in `.gov.in`, `.nic.in`, `.org.in` or is the body's own official domain (list exceptions explicitly in the test); every row has non-empty `legal_basis_ref`; no two slugs share an `alias_norm`; every `parent_entity_slug` exists in the file; no `tier_number` field present (derived in DB).
- Known-answer checks in the test: Textiles Committee → `central_act` (tier 2); Reserve Bank of India → `central_act`; Election Commission of India → `constitution_article` (Art. 324); NITI Aayog → `executive_order`.
- Dry-run loader output attached to the receipt; **no `--apply`** until G1.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked: []
  duration_ms: 0
  exit_codes: { test_radar: null }
  rows: 0
  unsourced: []
  dry_run_summary: ""
diff: |
  <unified diff>
```
