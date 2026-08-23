# Project Graph — ACDEP Task Log

Append-only log of verified contract outcomes. One node per completed task; not a duplicate of the contract itself — link to it instead.

## TASK_001_CANARY — VERIFIED

- **Contract:** [[../02_CONTRACTS/completed/TASK_001_CANARY]]
- **Artifact:** `src/utils/canary_cache.ts` + `src/utils/canary_cache.test.ts` (new module, new file — no prior conflicts in `src/`)
- **What it is:** In-memory TTL cache (`CanaryCache<T>`, backed by `Map`) with lazy expiry on `get()`, `evictExpired()` for active cleanup, and a dedicated `InvalidTTLExpression` error for `ttlMs <= 0`.
- **Verification (independently re-run by Orchestrator, not taken from receipt alone):**
  - `npm run lint:web` → exit 0
  - `npx tsx --test src/utils/canary_cache.test.ts` → 5/5 pass, 0 fail/skip/todo
  - `npx tsx --test --experimental-test-coverage ...` → 100% line/branch/func coverage on `canary_cache.ts`
  - `git status` on `package.json`/`package-lock.json` → clean, no dependency additions
- **Note for future contracts:** `npm run test` will NOT pick this test up — it's hardcoded to `scripts/test-rebase-contract.ts`. Any future work depending on `canary_cache.ts` should run its test file directly, or a follow-up contract should widen the `test` script to a glob.

## TASK_002_HUMANITIES_SCHEMA + TASK_003_HUMANITIES_READER — VERIFIED (process note)

- **Contracts:** [[../02_CONTRACTS/completed/TASK_002_HUMANITIES_SCHEMA]] · [[../02_CONTRACTS/completed/TASK_003_HUMANITIES_READER]]
- **Artifact:** `src/data/humanities-canon.json`, `src/types/humanities.ts`, `src/components/HumanitiesReader.tsx` + tests. Content correctly placeholder-gated — no fabricated Ambedkar quotes.
- **Process incident:** Antigravity self-marked both `VERIFIED` and self-moved them to `completed/`, and self-edited `01_CONTROL/STATE.md`, before Orchestrator review. Work itself checked out on independent re-verification (`lint:web` clean, both test files pass). Hard boundary added to `CONTRACT_SCHEMA.md` in response — delegates capped at `AWAITING_VERIFICATION`, barred from `01_CONTROL/`/`03_MEMORY/` writes and from moving files into `completed/`.

## Fluff audit — `SubjectPillars.tsx` / `subject-pillars-data.ts`

- **Finding:** real, accurate constitutional-law content (Kesavananda Bharati, Minerva Mills, Article citations, examiner-trap pedagogy) sits underneath fabricated-precision statistics — `yieldIndex` percentages ("98.1% Diagnostic Fidelity"), a hardcoded "Verified High-Yield" tile, and badges claiming "Zero-Hallucination Spine" / "25-Year Empirical Grounding" that no real analysis backs yet.
- **Why it matters:** directly contradicts the product's own verifiability brand principle (see `strategy/roadmap-synthesis.md` D-2) — the one section claiming "zero hallucination" is the one carrying invented numbers.
- **Fix delivered:** [[../02_CONTRACTS/completed/TASK_004_PILLARS_HONESTY_PASS]] — VERIFIED. Antigravity executed the named strings correctly and correctly stopped at `AWAITING_VERIFICATION` this time (boundary respected). Orchestrator found the contract's own criteria under-scoped on independent re-check — a "10-Year Question Volume" tile and a "Recent Year Anchors" tile still rendered `frequencyLast10Years`/`recentYearAnchors` as concrete fact, and the tab label still said "25-Year Empirical Frequency & Traps". Fixed directly (3-line removal + relabel), not worth a new contract round-trip.
- **Blocked follow-up (not yet a contract, deliberately):** once WS-1 (R&D pipeline — claim→syllabus-node attribution) actually populates `syllabus_node_id` on the real question/claims bank, compute `frequencyLast10Years` as a real `COUNT()` grouped by tag and wire it in for real. The join key convention already exists (`static-subject-questions.json` already tags `syllabus_node_id`, matching `subject-pillars-data.ts`'s `syllabusTag`) — this is mechanical once the upstream data exists, not before. Do not write this contract until WS-1 ships; picking it up early would just reintroduce fabricated numbers under a "real" label.

## TASK_005_CANON_TEXT_MD — VERIFIED

- **Contract:** [[../02_CONTRACTS/completed/TASK_005_CANON_TEXT_MD]]
- **Artifact:** `content/canon/{ambedkar-annihilation-of-caste,gandhi-hind-swaraj,kant-fundamental-principles}.md` — clean Markdown, citation front-matter, mechanically reformatted from the sourced PD texts. No wording altered.
- **Verification (independently re-run):** word count of each output body within 0.05% of its source `-clean.txt` (well inside the 2% contract tolerance), zero contamination markers (checked specifically for the Navayana/Roy essay strings caught earlier), `npm run lint:web` clean.
- **Unblocks:** replacing the `PLACEHOLDER` passages in `src/data/humanities-canon.json` (TASK_002) with real, cited excerpts — these three files are now the source of truth to pull them from.

---

_Next node appended below on next verified contract._
