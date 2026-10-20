# Policy Radar Lineage Engine

**Universe**: `live` (v2 API & UI verified; daily cron workers automated)  
**Status**: `verified 2026-10-21`  
**Parent Contract**: [`TASK_085`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/02_CONTRACTS/pending/TASK_085_POLICY_RADAR_LINEAGE_ENGINE.md)  
**Related Documents**: [`docs/radar/primary-law-sources.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/radar/primary-law-sources.md), [`docs/radar/primary-law-sources.samples.json`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/radar/primary-law-sources.samples.json)

---

## 1. Domain Object Definition

The **Policy Radar Lineage Engine** transforms disconnected policy news items and press releases into a verified, primary-source directed acyclic graph (DAG) of how Indian public policy evolves through statutory and executive rings:
- **Ring 0 (Executive Announcements)**: Cabinet decisions, PIB releases, press conferences (`cabinet_approval`, `pib_release`).
- **Ring 1 (The Law)**: Bills introduced, passed across Lok Sabha/Rajya Sabha, presidential assent (`bill_introduced`, `bill_passed`, `act_assented`).
- **Ring 2 (Subordinate Legislation & Execution)**: Central rules, statutory orders, commencement notifications, regulatory circulars (`rules_notified`, `regulation_issued`, `commencement_or_entry_into_force`).
- **Ring 3 (Operational Rollout)**: State execution, guidelines, nodal tenders, outlay revisions (`guidelines_issued`, `outlay_revised`).

---

## 2. Core Tables & Schemas

| Table / View | Migration | Purpose |
|---|---|---|
| `public.authority_registry` | `20261021000300_authority_registry.sql` | Canonical authorities (Ministries, Regulators, Tribunals) with legal tier, basis citation, and aliases |
| `public.policy_programs` | `20261021000400_policy_events.sql` | Central schemes and statutory programs with nodal authority and canonical slug |
| `public.policy_events` | `20261021000400_policy_events.sql` | Immutable ledger of policy occurrences with instrument class, span evidence, and dates |
| `public.policy_program_edges` | `20261021000500_rebuild_program_edges.sql` | Explicit inter-program references and learned ripples |
| `public.policy_program_gaps` | `20261021000600_program_gaps.sql` | Observed vs expected lifecycle stage gaps calculated via Kaplan–Meier empirical survival |
| `public.policy_fact_mutations_v` | `20261021000700_policy_fact_mutations_view.sql` | Fact drift view tracking revisions to outlay, deadline, target, and nodal authority |
| `public.policy_node_signals` | `20261021000800_node_signals.sql` | Empirical Bayesian surge detection ($\text{NegBin}(r, p) + \text{Benjamini–Hochberg}$) |
| `public.policy_boss_mcqs` | `20261021000850_policy_boss_mcqs.sql` | Synthesized multi-statement MCQs anchored to verified program events and entity traps |
| `public.radar_eval_runs` | `20261021000900_radar_eval_runs.sql` | Daily automated evaluation runs enforcing 5 metric thresholds and emergency kill switches |

---

## 3. Invariants & Guardrails

1. **Evidence Integrity**: Every program, event, mutation, and edge displayed to the user carries an exact citation or text span fragment (`source_url`, `char_start..char_end`).
2. **Evaluation Isolation**: Answer keys for Boss MCQs are strictly withheld from client responses; validation occurs solely on the backend (`POST /api/policy-radar/v2/boss-mcq/:id/check`).
3. **No Synthetic Fallbacks**: Legacy hardcoded seeds (`CANONICAL_BOSS_MCQ_FALLBACKS`, `CANONICAL_VOLCANO_BASELINES`, synthetic `DISP_*` nodes) are strictly quarantined in `server-lib/policy/radar-payload.ts`.
4. **Public Gate & Kill Switch**: Public consumption is gated by `isRadarPublic()` (`RADAR_PUBLIC=1` + passing evaluation status in `radar_eval_runs`). If any daily eval metric fails, the API gracefully reports `status: "paused"` with zero data corruption.
5. **Human Gate on Migrations**: All migration files in `supabase/migrations/20261021*.sql` are additive and applied strictly by human authorization.

---

## 4. API Surface

- `GET /api/policy-radar/v2`: Full radar payload with programs, lineage events, lifecycle gaps, mutations, ripples, and surging node signals.
- `GET /api/policy-radar/v2/by-dispatch`: Batched lightweight lineage chips for feed cards (max 50 dispatch IDs per request).
- `POST /api/policy-radar/v2/boss-mcq/:id/check`: Verifies candidate answer choice without exposing the answer key.
- `GET /api/policy-radar/v2/authorities`: Read-only taxonomy of canonical authorities and legal tiers.

---

## 5. UI Consumers

- **Observatory Radar Panel** ([`src/components/observatory/radar-v2/RadarV2Panel.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/observatory/radar-v2/RadarV2Panel.tsx)): Lineage lanes, provenance chips, lifecycle gap warnings, mutation diffs, and honest state badges (`ok`, `paused`, `stale`, `unavailable`).
- **Feed Card Lineage Chips** ([`src/components/CurrentAffairs.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/CurrentAffairs.tsx)): Displays program name, nodal authority, and legal ring chips on daily dispatch cards with automatic 50-item request coalescing.
