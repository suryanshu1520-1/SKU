---
type: object
status: verified 2026-08-19
universe: live
---

# Object: Syllabus Testability Graph (`syllabus/` — nodes, testability, gate, backtest)

## 1. What It Is
The reservoir the ingestion pipe fills. A persistent graph of ~130 UPSC syllabus nodes where every ingested story attaches to a node, and ONE per-node testability estimate drives the relevance gate, significance ranking, the (planned) per-aspirant Coverage Ledger, and spaced repetition. Lives in [`server-lib/cron/ingest/syllabus/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/server-lib/cron/ingest/syllabus).

## 2. Why This Shape
- **Two-axis testability**: frequency (time-decayed PYQ share) × drought (overdue vs a node's own testing rhythm). Both are config-gated by a walk-forward backtest — nothing ships unvalidated.
- **Coverage** of sparse nodes solved by hierarchical (Bayesian) shrinkage toward the parent domain's rate.
- **Evidence stack ranked by trust**: Tier A (official PYQs — the ONLY tier allowed to judge the backtest) > B (internal 1,722-bank + open corpora) > C (coaching-TOC salience) > D (syllabus floor).

## 3. Shape & Citations
- `syllabus/types.ts` — `SyllabusNode`, `Evidence` (tiers A–D), `NodeTestability`.
- `syllabus/nodes.ts` — ~130 nodes (2-level domain→leaf) + loaders + `embedNodes()`.
- `syllabus/testability.ts` — `estimateTestability()` (frequency × drought + shrinkage). **Do not change logic without re-running the backtest.**
- `syllabus/gate.ts` — `relevanceGate()` + `shouldEscalateUnmapped()` (taxonomy-bias safety valve).
- `syllabus/backtest.ts` — `laterPyqRecallAtK()`, `compareConfigs()` — the honesty gate.
- `syllabus/data/pyq-tier-a.json` (2,839) + `pyq-tier-b.json` (274) — **metadata-only** Evidence records (no question text; no copyright/secret exposure).
- `embeddings.ts` — migrated to `gemini-embedding-001` (768-dim MRL, `SEMANTIC_SIMILARITY`).

## 4. Connected To
- **Consumes**: `embeddings.ts` (`getEmbedder`), `cluster.ts` (`authorityOf`).
- **Feeds (planned wiring)**: `significance.ts` (`syllabus_match × testability`) and `orchestrator.ts` Tier 2 (relevance gate, pre-synthesis).

## 5. If You Change This
- **Hits (once wired)**: significance scores → the ordering in [`DailyEdition.tsx`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/src/components/DailyEdition.tsx). **Currently NOT wired into the live path** — staged behind corpus calibration so a biased prior can't regress the edition.
- **Backtest status (2026-08-19)**: recall@20 ≈ 23%. Drought's reported lift (22.78→24.02%) is a **tagging-bias artifact** — `GS1.HIS.FREEDOM` absorbed ~22% of tags via a single-node fallback in `scripts/build-syllabus-corpora.ts`. Under node-year dedup, `droughtEarnsItsPlace=false`. **Ship frequency-only (`droughtWeight=0`) until a cleaner corpus earns drought.**
- **Does not hit**: payments, auth, or the `pib_digests` pipeline.

## 6. Surfaces
- **Written by**: the build step (`embedNodes` → static array) and the corpus ETL (`scripts/build-syllabus-corpora.ts`).
- **Read by (planned)**: the ingestion orchestrator; the Coverage Ledger.

## 7. See
- Design rationale: `docs/handoffs/innovation-session-superprompt.md` session.
- Corpus handoff: `docs/handoffs/syllabus-corpus-antigravity.md` (gitignored — local only).
- Related: [[ingestion-pipeline]], [[news-intelligence-architecture]].
