---
task_id: "TASK_004_PILLARS_HONESTY_PASS"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 1500
  output_diff_max: 2000
---

# 1. High-Density Distilled Objective
`SubjectPillars.tsx` and `subject-pillars-data.ts` present fabricated-precision statistics (`yieldIndex` percentages like "98.1% Diagnostic Fidelity", a hardcoded "Verified High-Yield" label, an "Empirical Frequency Synthesis" claim, and badges reading "Zero-Hallucination Spine" / "25-Year Empirical Grounding" / "95.4% Historical Yield" / "Zero Traffic Leaks") as if they were measured. They were not measured — no real PYQ-frequency analysis backs these numbers yet (confirmed: `syllabus_node_id` attribution is not yet populated on the real claims data per the R&D pipeline's WS-1 gap). This contract removes every claim of measured empirical precision, keeps every genuinely real piece of content (case law, article citations, syllabus weightage, examiner-trap pedagogy) untouched, and downgrades the qualitative scoring to be labeled as editorial judgment, not measurement. Pure removal/relabeling — no new features, no new data.

# 2. Transcluded Context References
- `src/components/SubjectPillars.tsx:72-83` (hero badges), `:233-238` (pillar header yieldIndex badge), `:450-454` (the false "Empirical Frequency Synthesis" claim), `:467-469` ("Yield Index" badge on testabilityScore), `:491-498` (hardcoded "Syllabus Confidence: Verified High-Yield" — this one is hardcoded UI text, not even driven by data, and must be deleted, not relabeled).
- `src/data/subject-pillars-data.ts` — `keyMetrics.yieldIndex` field exists on all 35 `SubjectPillar` entries as a percentage string (e.g. `"94.8% Factual Consistency"`); `PyqEvidenceStat.testabilityScore` is a legitimate qualitative enum (`VERY HIGH`/`HIGH`/`MEDIUM`) that should be RELABELED in the UI as editorial priority, not deleted from data.
- Do NOT touch: `foundationalConcepts`, `criticalProvisions`, `examinerPerspective`, `mindMaps`, `mainsBlueprints`, `empiricalBasis` prose, `keyMetrics.totalMarksWeight`/`prelimsAvgQuestions`/`pyqCoverageYears` — these are real syllabus facts or genuine pedagogy, not fabricated statistics, and are out of scope.
- Do NOT touch the "1,720+ Indexed Items" / "2nd ARC & Law Commission" hero badges — those refer to the real question bank and real cited institutions, not fabricated stats.
- Do NOT touch any file outside these two.

# 3. Mandatory Tool Chain & Execution Path
1. `grep_search` for `yieldIndex` in both files to confirm full extent before editing
2. `multi_replace_file_content` on `src/data/subject-pillars-data.ts` — remove the `yieldIndex` field from the `SubjectPillar.keyMetrics` interface and from all 35 data entries
3. `multi_replace_file_content` on `src/components/SubjectPillars.tsx`:
   - Delete the "25-Year Empirical Grounding" and "Zero-Hallucination Spine" badge spans (hero section)
   - Delete the "95.4% Historical Yield" and "Zero Traffic Leaks" badge tiles (hero evidence grid) — these two are hardcoded, not sourced from real metrics, and don't correspond to anything computable
   - Delete the `keyMetrics.yieldIndex` emerald badge in the pillar header (now dead code once the field is removed from data — must be deleted, not left referencing a missing field)
   - Rewrite the "Empirical Frequency Synthesis" paragraph to not claim measurement — e.g. state plainly that themes are editorially prioritized by exam relevance, pending a real frequency count
   - Rename the "Yield Index" badge label to "Editorial Priority" (still renders `ev.testabilityScore`, just relabeled)
   - Delete the hardcoded "Syllabus Confidence: Verified High-Yield" tile entirely (it is static UI text unconnected to any data field — remove the whole tile, don't relabel it)
4. `run_command` → `npm run lint:web` — must exit `0`

# 4. Deterministic Acceptance Criteria
1. `yieldIndex` does not appear anywhere in `subject-pillars-data.ts` (type or data) or `SubjectPillars.tsx`.
2. The strings "Zero-Hallucination Spine", "25-Year Empirical Grounding", "95.4% Historical Yield", "Zero Traffic Leaks", "Empirical Frequency Synthesis", and "Verified High-Yield" do not appear anywhere in `SubjectPillars.tsx`.
3. `frequencyLast10Years` and `testabilityScore` remain in the data layer untouched; the UI badge that rendered `testabilityScore` now reads "Editorial Priority" instead of "Yield Index".
4. All previously-untouched content (case law, articles, mind maps, mains blueprints, real syllabus weightage) is byte-for-byte unchanged — diff must show only deletions/relabeling in the sections named above.
5. `npm run lint:web` exits `0`. No new dependencies. No new files.

# 5. Antigravity Proof-of-Work Receipt

> [!note] Orchestrator follow-up (post-verification)
> Antigravity executed exactly what §3/§4 specified — correctly. But the contract's acceptance criteria were under-scoped: it named specific banned strings and missed that `{ev.frequencyLast10Years} Questions` and `{ev.recentYearAnchors.join(', ')}` (a "10-Year Question Volume" tile and a "Recent Year Anchors" tile in the PYQ-evidence tab) render the same fabricated numbers as concrete fact, and the tab label still read "25-Year Empirical Frequency & Traps". Orchestrator removed both tiles and relabeled the tab to "Exam Relevance & Examiner Traps" directly (3-line UI fix, not worth a new contract round-trip). `frequencyLast10Years`/`recentYearAnchors` remain in the data layer, unrendered, pending the real WS-1-backed count (see `03_MEMORY/PROJECT_GRAPH.md`).

```yaml
telemetry:
  tools_invoked:
    - grep_search (yieldIndex)
    - multi_replace_file_content (src/data/subject-pillars-data.ts)
    - multi_replace_file_content (src/components/SubjectPillars.tsx)
    - grep_search (verification passes for banned strings)
    - run_command (npm run lint:web)
  duration_ms: 980
  exit_codes:
    lint_web: 0
diff: |
  diff --git a/src/data/subject-pillars-data.ts b/src/data/subject-pillars-data.ts
  --- a/src/data/subject-pillars-data.ts
  +++ b/src/data/subject-pillars-data.ts
  @@ -57 +56,0 @@
  -    yieldIndex: string;
  @@ -90 +88,0 @@
  -      yieldIndex: "94.8% Factual Consistency"
  @@ -204 +201,0 @@
  -      yieldIndex: "91.2% Factual Grounding"
  @@ -292 +288,0 @@
  -      yieldIndex: "96.4% Economic Rigor"
  @@ -368 +363,0 @@
  -      yieldIndex: "98.1% Diagnostic Fidelity"
  @@ -447 +441,0 @@
  -      yieldIndex: "100% Deterministic Rules"
  diff --git a/src/components/SubjectPillars.tsx b/src/components/SubjectPillars.tsx
  --- a/src/components/SubjectPillars.tsx
  +++ b/src/components/SubjectPillars.tsx
  @@ -72,12 +72,3 @@
  -              <span className="px-3 py-1 rounded-sm text-[10px] font-mono tracking-widest uppercase bg-[#e0d0ab]/10 text-[#e0d0ab] border border-[#e0d0ab]/30 flex items-center gap-1.5 font-bold shadow-sm">
  -                <Anchor className="w-3.5 h-3.5 text-[#e0d0ab]" />
  -                25-Year Empirical Grounding
  -              </span>
  -              <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800">
  -                UPSC CSE Corpus (2000–2025)
  -              </span>
  -              <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 flex items-center gap-1">
  -                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
  -                Zero-Hallucination Spine
  -              </span>
  +              <span className="px-2.5 py-1 rounded-sm text-[10px] font-mono text-zinc-400 bg-zinc-900/90 border border-zinc-800">
  +                UPSC CSE Corpus (2000–2025)
  +              </span>
```
