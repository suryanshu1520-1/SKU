---
task_id: "TASK_086"
title: "PYQ Bank Final Edition: digitised UPSC CSE PYQs 2011-2026 from owner-selected sources, every field traceable"
type: "EPIC_MASTER_PLAN"
status: "PENDING_EXECUTION"
assigned_to: "ORCHESTRATOR (decomposes, verifies) -> ANTIGRAVITY (executes sub-contracts TASK_086A ... TASK_086L)"
priority: "P0"
created_at: "2026-10-22"
source_scope: "OWNER DECISION 2026-10-22: only VisionIAS and Rau's IAS Compass, plus digitised data already held locally in tark_pyq_handoff/. No official-channel scraping, no scanned PDFs, no OCR."
builds_on:
  - "server-lib/qbank/types.ts + server-lib/qbank/validators.ts (canonical evidence contract: reused, not replaced)"
  - "docs/handoffs/qbank-quality-scope-2026-09-24.md (definition of pristine, sections 6-9)"
  - "tark_pyq_handoff/data/ (900 digitised official Series-A keys 2020-2024; proofread GS-I transcriptions)"
touches_production: "No. The migration is a file only. Applying it (G4) and loading data (G5) are human actions."
---

# TASK_086: PYQ Bank Final Edition (master plan)

> **How to use this pack.** This file is the Orchestrator's master plan: sources, verified facts, invariants,
> data contracts, algorithms, gates and delivery order. Antigravity does **not** execute this file. It executes
> the atomic sub-contracts `TASK_086A ... TASK_086L` in `02_CONTRACTS/active/`, each self-contained and under the
> 4k-token context budget in `00_SYSTEM/CONTRACT_SCHEMA.md`. When a sub-contract cites "§6.4", the rule it needs
> is already distilled inside that sub-contract; this file is the reference, not a dependency.
>
> Status rules from `CONTRACT_SCHEMA.md` apply unchanged: a delegate may write at most `AWAITING_VERIFICATION`,
> never moves files to `completed/`, never writes to `01_CONTROL/` or `03_MEMORY/`.

---

## 1. Outcome

A versioned release, `final-2026-10`, of canonical `QuestionRecord`s and `MainsQuestionRecord`s (the types in
`server-lib/qbank/types.ts`), built only from digitised (native-text) PDFs. Every record answers three questions
from stored evidence alone:

1. **Where did this text come from?** Document SHA-256, page, region and extraction method.
2. **Who says the answer is X, and with what authority?** A VisionIAS key is labelled `secondary-claimed`. Where
   one of the 900 locally held official keys exists, that key is `official-final`.
3. **Did a second digitised source confirm the text?** If not, the record is marked single-source.

| Cohort | Printed slots | Text source | Answer source |
|---|---|---|---|
| Prelims GS-I 2011-2026 | 1,600 (100/yr) | VisionIAS native text (16 PDFs). The handoff's proofread transcriptions corroborate 2024, 2025 and 2021 Q1-16 (the G1 scope fix: HANDOFF.md declares only these proofread). | VisionIAS key. For 2020-2024 it is checked against the local official keys, and the official key wins. |
| Prelims CSAT 2017, 2020-2026 | 640 (80/yr) | VisionIAS native text (8 PDFs) | same |
| Prelims CSAT 2011-2016, 2018, 2019 | 640 | **None of the owner's sources has these in digitised form** | Reported as explicit gaps (`missing_source`), never filled |
| Mains GS I-IV + Essay 2023, 2024, 2025 | counted from each paper | Rau's IAS digital PDFs (15); VisionIAS Mains 2024 corroborates 2024 | `not-applicable` |
| Mains 2013-2022 (50 papers) | n/a | **Gaps.** At G1, 2014 and 2016-2022 proved to be image-only scans. At Wave 2, 2013 and 2015 proved to be OCR text layers (Acrobat Paper Capture / ABBYY FineReader), not digital text. All are gaps under the no-scan/no-OCR rule (D3). | n/a |

"S-tier" means passing the release gates in §7:

- every printed slot either holds a record or is shown as a named gap;
- zero placeholder options and zero broken glyphs;
- no coaching boilerplate inside question text;
- every answer labelled with its true authority;
- VisionIAS's measured key accuracy published (from 2020-2024);
- byte-identical output when re-run.

---

## 2. Verified facts (probed live by the Orchestrator on 2026-10-21/22, not taken from docs)

### 2.1 Sources (owner-selected)

| Source | What it holds | Access mechanics | Role |
|---|---|---|---|
| **VisionIAS** `https://www.visionias.in/resources/upsc-paper-solution/` | 32 items, all server-rendered on one page; the dropdowns filter client-side only. Prelims, English: GS-I 2011-2026 (16) and CSAT 2017 + 2020-2026 (8). Mains: 2024 only (Essay and GS I-III, English and Hindi = 8). No Prelims Hindi. | Plain GET works with no login and no JS. A card links to `.../resources/material/?id=<n>&type=prelims_sol\|mains_sol`. That page's inline script holds `const pdfPath = 'https://cdn.visionias.in/value_added_material/<file>.pdf'`. A stale, commented-out `//const url = '...ilovepdf_merged.pdf'` also sits there and must be ignored. robots.txt disallows `/resources/tab.php` but not these paths. The CDN is S3 behind CloudFront with `ETag` and `Last-Modified`. | Primary text for 24 Prelims papers; `secondary-claimed` key; editorial explanation and annotations; corroborating text for Mains 2024 |
| **Rau's IAS Compass** Mains `https://compass.rauias.com/upsc-mains/10-years-paper/` | 65 PDFs, 2013-2025 (Essay + GS I-IV). The 2022 essay is `ESSAY.pdf`, so its year comes only from the page section heading. The 2020 essay is misspelt `Eassy_2020.pdf`. | `/wp-content/uploads/` links; robots.txt disallows only `/wp-admin/` | Primary Mains text |
| **Local handoff** `tark_pyq_handoff/data/` (gitignored, already on disk) | 900 digitised official Series-A keys for 2020-2024 (890 scored, 9 dropped, 1 with two answers accepted), each read two independent ways with the readings agreeing. Proofread GS-I Series-A transcriptions `cse{2021,2022,2024,2025}_gs1_seriesA_questions.csv`; completeness per file is measured by 086H. | Local CSV; nothing is fetched | Key check for 2020-2024; second transcription |

**Excluded by owner decision (2026-10-22):**
- `upsc.gov.in`, the Wayback Machine, and any scanned PDF (including Rau's Prelims booklets, which are image-only scans).
- OCR of any kind.
- Rau's subject-wise HTML pages.

### 2.2 Document formats (VisionIAS and Rau's samples probed with PyMuPDF 1.28.2 / pdfplumber 0.11.10)

| Sample | Pages | Text layer | Layout | Printed columns / structure | Hazards seen |
|---|---|---|---|---|---|
| VisionIAS GS-I 2011 | 20 | Yes. RC4-encrypted, permissions only; extraction works. | Ruled table, 10 cols | Q.No. · Topics · Sub-topics · Questions · Answer · APP/UAPP · Level · Nature · Source · Broad Source. **No explanation column.** | The option label "(d)" is absent from the extracted text of Q2/Q3. Curly quotes become U+FFFD. |
| VisionIAS GS-I 2019 | 101 | Yes (MS Word) | Ruled table, 11 cols | Q.No · Section · Question · Answer · Explanation · Level · Nature · Source · Source type · VisionIAS test-series/PT365 reference · Motivation (086C confirms the headers) | In plain reading order, VisionIAS's own "similar test question" interleaves with the UPSC text. |
| VisionIAS GS-I 2026 | 167, landscape | Yes (Quartz). Every page also carries an image (the diagonal watermark). | Ruled table, 14 cols | Q.N. · Section · Questions · Answer · Explanation · Motivation/Current Affairs · Level · Nature · Source · Source Type · VisionIAS AITS/Sandhan/Open Test/PT365 · VisionIAS Current Affairs Source · Digital Current Affairs Links · Coverage | Rows continue across pages. Headers are fragmented ("A ns w er", "Lev el"). Words split in narrow cells ("fundament al"), and URLs split too. |
| VisionIAS CSAT 2026 | 32 | Yes (MS Word) | Linear, no tables | `N.` stem, `(a)`-`(d)`, `Answer: (b)`. Passages open with "Directions for the next N items ... Passage". No explanations. | Some pages hold only header text (figure/image pages). |
| Rau's Mains GS-I 2024 | 4 | Yes (Adobe), bilingual | Numbered prompts | A Hindi line comes first, carrying the question number, then English, `(Answer in 150 words)`, and the marks at the line end. | Hindi uses a legacy font encoding (garbled Unicode); keep English only. |

**Decisive finding:** `page.find_tables()` detected the ruled table in all three GS-I samples with the correct
header row. Rows that continue onto the next page come back with an empty Q.N. cell. That gives a deterministic,
LLM-free backbone for every VisionIAS table document.

### 2.3 The existing bank: what to reuse and what never to repeat

- **Live tables.**
  - `static_questions` (~1,801 rows; the scored Arena; answers locked from anon since `20260830230000`).
  - `pyq_prelims` (2,890 rows at last record). Its `official_key` is **anon-readable**: `20260825150000_create_pyq_relational_vault.sql:76-84` grants public SELECT with no column lockdown. This is a separate small fix, flagged and out of scope here.
  - `pyq_mains`.
- **Files.**
  - `verified_pyqs_15yr.json` (1,869 rows).
  - `master_7841_pyqs.json` (mostly placeholders).
  - The Exam Hall pool `server-lib/exam/data/gs1ExamPool.ts` (647 items). In a 55-item 2019 sample, 23 items disagree with the official Series-A key.
- **Failure shapes this epic must make impossible:**
  - defaults that fabricate facts (key "a" or "C", year 2020);
  - IDs built from row indexes;
  - dedupe on stem prefixes;
  - OCR-garbled text promoted into the bank;
  - a loader that bypassed the ingestion gate;
  - acceptance criteria gamed by patching the quoted failure strings (TASK_019);
  - self-reported counts that did not match the data (TASK_018).
- **Reused, not rebuilt:**
  - `server-lib/qbank/types.ts` and `validators.ts`. `buildCanonicalId` gives `UPSC_CSE_Prelims_2019_GS-1_Q001_en`; `deriveEligibility` scores only `official-final` keys.
  - The 900 handoff keys, imported as-is.

---

## 3. Invariants (non-negotiable; every sub-contract inherits them)

- **I1 Evidence or nothing.** Every accepted text, key and explanation carries an `EvidenceRef`: document id,
  URL, SHA-256, retrieval time, page, region and extraction method/version.
- **I2 Authority is recorded truthfully.**
  - VisionIAS keys are `secondary-claimed`.
  - The locally held UPSC keys are `official-final` (or `withdrawn` for dropped items). Where both exist, the official key wins, and the disagreement is recorded, never hidden.
  - A coaching key is never relabelled as official. Whether coaching keys may drive scored practice is a product switch in the consumer epic, not something baked into the data.
- **I3 Unknown stays unknown.** No default letters, years or series, and no inferred option text. An unknown header
  or annotation code stops that document and is listed in the receipt; the delegate never guesses a mapping.
- **I4 No LLM and no OCR anywhere in this epic.** Extraction, parsing, reconciliation and gates are deterministic
  code. A scanned document is recorded as an unresolved gap, never transcribed.
- **I5 Bronze is immutable.** Source bytes are never modified. Every later stage is a pure function of bronze plus
  code version: idempotent, re-runnable and diffable.
- **I6 Third-party material never enters git.** The run directory is a gitignored path, asserted at every start-up.
  Tests use synthetic fixtures generated at test time. Receipts and logs quote at most one short line of source
  text per example.
- **I7 Answers stay server-side.** New tables lock keys, key claims and explanations away from `anon` and
  `authenticated`. Explanations default to `display_policy = 'internal_only'`.
- **I8 Gates are computed, not reported.** Every stage writes a machine report. A receipt cites the report path and
  its SHA-256 and pastes the report's summary block verbatim. The Orchestrator re-runs every report and spot-checks
  freshly drawn random items against page renders (the sample is never disclosed in advance).
- **I9 No special cases.** Extractor and parser code must contain no document-, year- or filename-specific branches.
  A fix is a general rule backed by a synthetic test. Data files are never hand-edited.
- **I10 Polite acquisition.** At most 1 request per 3 s per host, concurrency 1, an honest User-Agent, conditional
  GET, robots.txt honored. No auth bypass and no enumeration of unlisted IDs.
- **I11 No production writes by the delegate.** The migration is a file only. The loader runs as a dry run only.
  Never call `apply_migration` or `execute_sql` with DDL/DML.
- **I12 Windows-safe and deterministic.**
  - Python runs as `python -X utf8`, and all file I/O is UTF-8.
  - Writes are atomic (temp file + rename, retried 3 times on EPERM/EBUSY, because the run directory is under OneDrive).
  - JSON output uses sorted keys, and timestamps come from the census `generated_at`, never the wall clock.
  - TypeScript is ESM: use `fileURLToPath(import.meta.url)`, never `__dirname`, and `.js` import specifiers.

---

## 4. Architecture

```
 WAVE 1  acquire
   086A census (VisionIAS + Rau's Mains) ──► 086B bronze: immutable PDFs + HTML snapshots ──► 086C profiles + forensics
                                                   │
                                                   ▼   [G1 Orchestrator checkpoint: census, hashes, family map, header map]
 WAVE 2  extract (deterministic)
   TABLE docs  ──► 086D extract_table ──┐
   LINEAR docs ──► 086E extract_linear ─┴─► 086F parse_items ──► VisionIAS occurrence envelopes
   MAINS docs  ──► 086G extract_mains ─────────────────────────► Mains candidates (Rau's; VisionIAS 2024)
   local handoff CSVs ──► 086H import ─────────────────────────► official keys 2020-24 + handoff transcriptions
                                                   │
                                                   ▼
 WAVE 3  verify
   086I reconcile: series alignment ──► canonical assembly ──► gates ──► review queue
   086J crops + review CLI                                              [G2 human review]
                                                   │
                                                   ▼
 WAVE 4  release
   086K release builder ──► canonical/*.jsonl + PaperManifests + RELEASE.md + quality report
   086L DB projection: migration file + loader dry-run + legacy parity  [G4 apply migration] [G5 loader --apply]
```

**Run directory.** It follows the scope doc §11 layout. The default is
`_raw_source_archive/qbank-quality/final-2026-10/`, which `QBANK_RUN_DIR` overrides. It is gitignored by
`.gitignore:123` (verified with `git check-ignore`).

```
manifest/   census.json · acquisition.jsonl · robots/<host>.txt
sources/    <publisher>/<sha256>.pdf · html/<sha256>.html
profiles/   <sha256>.json · summary.json
extracted/  <sha256>.rows.jsonl · <sha256>.passages.jsonl
occurrences/visionias/<paperSlug>.jsonl · handoff/<paperSlug>.jsonl
mains/      <paperSlug>.<publisher>.jsonl
keys/       official/<paperSlug>.json
crops/      <item_id>.png · fig-<occurrence_id>-<n>.png
conflicts/  queue.jsonl · decisions.jsonl   (decisions: human-written only)
canonical/  questions.jsonl · mains.jsonl · occurrences.jsonl · manifests.json · gaps.json · RELEASE.md   (+ *.preview.* before G2)
reports/    <stage>.json
release-preview/  load-plan.json · parity-legacy.json
```

**Code layout.** This code is committed and contains no source material.

- TypeScript in `scripts/qbank/final/`: `run-dir.ts`, `http.ts`, `census.ts`, `acquire.ts`, `import-handoff.ts`, `reconcile.ts`, `review.ts`, `release.ts`, `load.ts`, `parity.ts`.
- Python in `scripts/qbank/final/py/`: `common.py`, `profile_docs.py`, `extract_table.py`, `extract_linear.py`, `parse_items.py`, `extract_mains.py`, `crops.py`, plus `test_*.py`.
- TypeScript tests in `scripts/qbank-tests/final/`, added to `test:qbank`. Python tests run via `test:qbank:py`.

---

## 5. Data contracts

**Paper slug**: `${year}-${PaperKind}`, using `PaperKind` from types.ts, e.g. `2019-GS-1`, `2019-GS-2`, `2024-GS-M1`,
`2024-Essay`.

**Document id**: `${publisher}:${paperSlug}:${role}:${lang}`, where:

- `publisher` ∈ {visionias, rau, upsc, handoff};
- `role` ∈ {solution, paper, key, transcription};
- `lang` ∈ {en, hi, bi}.

| Artifact | Shape (key fields) |
|---|---|
| Census row | `document_id, publisher, stage, year, paper, role, language, title, listing_url, landing_url, pdf_url, landing_snapshot_sha256, robots_ok, skip_reason?` |
| Acquisition row | `document_id, url, final_url, http_status, etag, last_modified, bytes, sha256, retrieved_at, path, status, duplicate_of?` |
| Profile | `sha256, document_id, forensics{producer, creator, creation_date, mod_date, pages, encrypted}, family ∈ {TABLE, LINEAR, MAINS_TEXT, SCANNED, UNKNOWN}, family_evidence, median_page_chars, image_only_pages[], header_page, header_raw[], header_canonical[], unmapped_headers[], legend_text` |
| Extracted row | `document_id, sha256, qno, cells{question, answer, explanation?, section?, topic?, level?, nature?, source?, source_type?, motivation?, applicability?}, pages[], bboxes{col: [[page,x0,y0,x1,y1]…]}, passage_ref?, figure_regions[], warnings[]` |
| Occurrence envelope | `occurrence: SourceOccurrence` (types.ts), `explanation_claim: ExplanationAssertion \| null`, `annotations{section, topic, level{raw,canonical}, nature{raw,canonical}, source_type{raw,canonical}, source_urls[], motivation}`, `parse{question_type, has_roman_and_arabic_labels, repairs[], warnings[]}` |
| Official key file | `paper_slug, series: {A: {"1": KeyAssertion, …}}, documents[EvidenceRef], method` |
| Queue item | `item_id, canonical_id, gate, reason_code?, detail, candidates[{source, value}], evidence[EvidenceRef], crop?` |
| Decision (human-written only) | `item_id, decision ∈ {accept_candidate, edit, park}, candidate_index?, value?, reason, reviewer, decided_at` |

**Canonical mapping** (`QuestionRecord`):

- **`identity`.** Taken from the paper and the printed number. `booklet_series: 'A'` is set only when §6.9 proves VisionIAS numbering equals Series A.
- **`text`.** VisionIAS text. Where a handoff transcription pairs with it, any critical-token difference goes to review (§6.10).
- **`key`.** The official `KeyAssertion` where one exists; otherwise the VisionIAS claim as `secondary-claimed`.
- **`explanation`.** VisionIAS text with `provenance: 'editorial'`, `review_state: 'unreviewed'` and `source_refs`. When VisionIAS's answer contradicts the official key, `review_state` becomes `'rejected'` and a non-blocking `explanation_unsupported` discrepancy is added.
- **`classification`.** `topic` comes from VisionIAS section/topic; `difficulty` from its legend-mapped level; `format` from the deterministic question-type classifier. Each carries `annotation_method`, and all are `'unreviewed'`.
- **`eligibility`.** Always computed by `deriveEligibility`, never hand-set.

**One additive type change (086I).** UPSC accepted two answers once in 2020-2024 (CSE-2021-GS2-A-Q39).
`KeyAssertion` gains an optional `accepted_keys?: OptionKey[] | null`, with a validator rule and tests.

**DB projection (086L, file only).** New tables, each with a `release_id`:

- `qbank_releases`
- `qbank_sources`
- `qbank_questions` (answer-free)
- `qbank_keys`
- `qbank_occurrences`
- `qbank_explanations`
- `qbank_mains_questions`
- `qbank_discrepancies`

`anon` and `authenticated` may read only `qbank_releases`, `qbank_questions` and `qbank_mains_questions`. Legacy
tables are untouched.

---

## 6. Algorithms (each one is distilled again inside its sub-contract)

**6.1 Census (086A).**

- *VisionIAS.* Parse each `a[href*="/resources/material"]` and its card: title, `Year YYYY`, ENGLISH/HINDI, Prelims/Mains.
  - Classify the paper: Prelims `/CSAT|Paper\s*II\b/i` → GS-2, else GS-1. Mains: Essay → Essay; GS Paper I/II/III/IV → GS-M1/M2/M3/M4.
  - Resolve `pdfPath` from the first `const pdfPath = '…'` line that is not commented out.
- *Hindi items.* Recorded with `skip_reason: 'hindi_out_of_scope'`.
- *Rau's.* Each `.pdf` link takes its year from the nearest preceding `UPSC Mains YYYY` heading; the filename is only a cross-check.
- *Assertions.* The census must reproduce the §2.1 counts. Extras are listed in the report, never dropped.

**6.2 Acquisition (086B).**

- Conditional GET into a temp file. Check the `%PDF-` magic and that the size is > 1,000 bytes.
- Compute SHA-256 and move the file to `sources/<publisher>/<sha256>.pdf`.
- A byte-identical document under another id becomes `duplicate_of`.
- A re-run makes zero downloads.

**6.3 Profiling (086C).** Record forensics (producer, creator, dates, pages, encryption), then assign one family:

| Family | Condition |
|---|---|
| SCANNED | median page chars < 50 |
| TABLE | a header row maps to {qno, question, answer} through the synonym map |
| LINEAR | ≥ 60 left-margin `^\d{1,3}\.\s` starts and ≥ 60 `Answer\s*[:\-]?\s*\(?[a-dA-D]\)?` lines |
| MAINS_TEXT | a Mains stage document with median chars ≥ 200 |
| UNKNOWN | anything else |

The legend page is the first page containing "Nature" and either "Difficulty" or "Level".

**6.4 Table extraction (086D).**

- **Header mapping.** Map header names with `norm = lowercase, strip non-alphanumerics` against an exact synonym dictionary. VisionIAS self-reference columns (test-series, current-affairs links, coverage) are excluded, never merged.
- **Rows.**
  1. Take the reference column x-ranges from the header page.
  2. Assign each cell to the column with the greatest horizontal overlap (≥ 50% of the cell width).
  3. A qno cell matching `^\s*\d{1,3}\s*\.?\s*$` opens a question. Empty-qno rows are continuations and are appended column by column.
  4. Skip repeated header rows.
- **Check.** Numbering must run exactly 1..N, where N is 100 for GS-I and 80 for CSAT.

**6.5 Linear extraction (086E).**

- **Question starts.** The question-number margin is the mode of `x0`; a question starts on a margin line `^(\d{1,3})\.\s`.
- **Options and answer.** Options use `\(([a-d])\)` labels, and several may share a line. The answer comes from `^Answer\s*[:\-]?\s*\(([a-dA-D])\)`.
- **Passages.** "Directions for the next N items" opens a passage, which is linked to the next N questions.
- **Figures.** Image-only pages and images within a question's span become `figure_regions`.
- **Page furniture.** Text such as `www.visionias.in`, `©Vision IAS` and page numbers is dropped.

**6.6 Item parsing and normalization (086F).** Clean the text first:

- **Basic normalization.** NFC; NBSP becomes a space.
- **U+FFFD repair.** First re-read the same bbox with pdfplumber. Failing that, apply context rules (apostrophe, bullet, paired quotes, dash), each one logged. Failing that, raise gate G_GLYPH.
- **Line-break joins.** `word-\nword` keeps its hyphen only if the hyphenated token occurs elsewhere in the document. `a\nb` joins with no space only if `a+b` occurs elsewhere and `b` never occurs standalone.

Then parse the question cell:

- **Options.** Take the last a→b→c→d label chain. A missing label is **never** inferred: it raises G_OPTIONS (`missing_option`).
- **Statements.** Lines labelled `^(\d{1,2}|I{1,3}|IV|V|VI|VII|VIII)[.)]\s`, kept with their labels. The closing prompt goes to `instruction_refs`. Match lists and pair tables keep their line breaks inside `stem`.
- **Question type.** An ordered regex classifier: statement_i_ii → how_many → match_list → pairs → statements → single_best → passage → direct.
- **Answer cell.** A single letter becomes a `secondary-claimed` key. Anything else becomes key null with `disputed_with` set plus G_ANSWER_CELL.

Annotations map through the document's own legend; a code missing from the legend gets canonical null, with no
guessing. Two checks follow:

- **Contamination.** `/vision\s*ias|www\.|https?:\/\/|©|all india test series|\bAITS\b|sandhan|abhyaas|PT\s?365|\bTest\s+\d{3,5}\b|Page\s+\d+/i` must not hit in stem, statements, options or passage (G_CONTAMINATION).
- **Fidelity.** Every one of those fields, with whitespace squashed, must be a substring of its squashed raw cell text, where repaired characters match a wildcard (G_FIDELITY).

**6.7 Mains extraction (086G).**

- **Question numbers.** A question number sits on any line matching `^\s*(\d{1,2})\.\s` (in Rau's bilingual layout it is on the Hindi line).
- **English text.** Keep a line only if ≥ 80% of its letters are ASCII and it has ≥ 3 ASCII words.
- **Word limits and marks.** `\(Answer in (\d+) words\)`; the marks are the trailing number. Subparts `\(([a-c])\)` are kept.
- **Essay.** Sections with their topics and the printed instructions.
- **Gates.** Σ marks per GS paper must equal 250, numbering must be contiguous, and an Essay paper must have ≥ 4 topics.
- **Unreadable documents.** A SCANNED Mains document is an unresolved gap.

**6.8 Local key import (086H).**

- **Keys.** The 900 handoff rows become `KeyAssertion`s: scored → `official-final`; dropped → `withdrawn`; two-answers-accepted → `official-final` with `accepted_keys`.
- **Evidence.** Each key's evidence is the UPSC file name and SHA-256 recorded in the CSV.
- **Transcriptions.** The handoff transcriptions become Series-A `SourceOccurrence`s with `extraction_method: 'manual-proofread (tark_pyq_handoff)'`.

**6.9 Series alignment (086I).** This applies to the 10 papers from 2020-2024.

1. Compute the rate at which VisionIAS's claimed letter equals the official Series-A key, by printed number, over items where both are letters.
2. A rate ≥ 0.80 sets `booklet_series: 'A'` and joins the official key. Random agreement would be about 0.25.
3. A rate < 0.80 raises `series_unresolved` on every record of that paper; it blocks scoring and escalates.

The rate is also published as VisionIAS's measured key accuracy.

**6.10 Canonical assembly (086I).**

- **Text corroboration.**
  1. Pair handoff and VisionIAS items by text, not by number: token-set Jaccard on stem and options, greedy unique best match, ≥ 0.60.
  2. For each pair, compute a critical-token diff: numbers; the words not, never, no, none, only, all, both, neither, except, incorrect, correct, cannot, always, any; and the option texts.
  3. Any difference goes to review, with both readings and a crop.
- **Key resolution.** The official key wins where one exists. A contradicting VisionIAS explanation becomes `rejected`.
- **Gaps.** A slot with no source gets no record; its `PaperManifest` lists it under `unresolved`. A paper with no source document at all gets no manifest, because `validatePaperManifest` rejects an empty `source_documents`. It goes to the gap ledger `canonical/gaps.json` instead.

**6.11 Gates and review (086I, 086J).**

| Gate | Fails when | Maps to |
|---|---|---|
| G_COUNT | a slot is missing or duplicated | `missing_question` |
| G_OPTIONS | the option set is not exactly a-d, non-empty and distinct | `missing_option` |
| G_ANSWER_CELL | the answer cell is non-standard | `key_unavailable` (when no official key exists) |
| G_GLYPH | U+FFFD remains | pipeline-only |
| G_CONTAMINATION | the contamination regex hits | pipeline-only |
| G_FIDELITY | the fidelity check fails | pipeline-only |
| G_SERIES | series alignment fails | `series_unresolved` |
| G_XSRC | a critical-token diff exists | `source_identity_conflict` |
| G_FIGURE | the text references a figure/map/diagram and no figure region exists | `figure_unreadable` |

Every failure becomes a queue item with candidates, evidence and a crop. Only a human writes `decisions.jsonl`
(G2). Antigravity builds the CLI but never decides an item.

**6.12 Release and load (086K, 086L).**

- **Decisions.** Apply them, recording each override as an `EvidenceRef` with `extraction_method: 'manual'` and an adjudication note. A review edits text only; it never types a key.
- **Validation and output.** Run every validator. Build a `PaperManifest` per paper, then write `RELEASE.md` and `reports/release.json`.
- **Refusal.** The build refuses on any validator error or any undecided queue item.
- **Loader.** It reads `canonical/` only, and only after checking the file hashes. It defaults to a dry run. `--apply` needs `QBANK_APPLY_CONFIRM=<release_id>` (G5). It never deletes and never touches legacy tables.

---

## 7. Release gates (Definition of Done for the epic)

- **R1 Coverage.**
  - Every paper in scope has `SlotCoverage.expected` derived from the paper itself.
  - Every unresolved slot carries a reason in `RELEASE.md`. CSAT 2011-2016, 2018 and 2019 appear in `canonical/gaps.json` as `missing_source` gaps.
- **R2 Text integrity.** Zero placeholder or empty options, zero U+FFFD, zero contamination hits and zero fidelity failures. Every option set is exactly a-d.
- **R3 Key integrity.**
  - Every key states its true authority.
  - All 900 local official keys are joined, or their paper is escalated.
  - Withdrawn items carry `withdrawn`, never a letter. Zero keys come from defaults.
  - VisionIAS's agreement with the official keys is published per paper for 2020-2024.
- **R4 Corroboration.** Zero unresolved critical-token diffs wherever a second transcription exists. The single-source share is published.
- **R5 Explanations.** Every VisionIAS explanation has provenance `editorial`, `source_refs` and a consistency verdict. A contradicting one is `rejected`.
- **R6 Determinism.** Two consecutive runs of Waves 2-4 on the same bronze give an identical SHA-256 for every file in `canonical/`.
- **R7 Validators.** `validateQuestionRecord`, `validatePaperManifest` and `validateMainsQuestionRecord` return zero errors on every released record.
- **R8 Isolation.**
  - `git status --porcelain` lists nothing from the run directory.
  - `git grep` for three random explanation sentences from the release finds nothing.
- **R9 Independent check.** The Orchestrator spot-checks ≥ 30 freshly random items (at least one per paper-year) against page renders. There must be zero text-critical errors and zero key errors.

---

## 8. Delivery plan

| Wave | Contracts | Gate to enter |
|---|---|---|
| 1 Acquire | 086A census → 086B bronze → 086C profiles | none (086B, 086C SOFT on predecessors) |
| G1 | The Orchestrator verifies census counts, bronze hashes, the family map and unmapped headers, and amends the synonym map in 086D if needed. | |
| 2 Extract | 086D table and 086E linear (HARD on 086C); 086G Mains (HARD on 086C); 086H local import (SOFT on 086A, needs only `run-dir.ts`); 086F parse (SOFT on the 086D/086E outputs) | 086C in `completed/` |
| 3 Verify | 086I reconcile (HARD on 086F, 086G, 086H) → 086J crops + review CLI (SOFT on 086I) | |
| G2 | A **human** works the review queue in the CLI. | |
| 4 Release | 086K release (HARD on 086J, after G2) → 086L DB projection (HARD on 086K) | |
| G4 / G5 | A **human** applies the migration, then runs the loader with `--apply`. | |

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| VisionIAS keys are a coaching institute's keys | I2 labels them `secondary-claimed`. Their accuracy is measured on 2020-2024 against the 900 official keys and published in `RELEASE.md`. |
| VisionIAS changes its page or CDN | Census assertions fail loudly. Bronze already captured is immutable. |
| Unseen header layouts in the 20 unsampled VisionIAS documents | 086C lists `unmapped_headers`, and G1 amends the map. The delegate never guesses (I3). |
| VisionIAS numbering is not Series A in some year | Alignment fails → `series_unresolved` → escalation, never a silent join. |
| A Rau's Mains PDF turns out to be a scan | It is recorded as an unresolved gap (I4). |
| Copyright and terms of the coaching sources | I6 and I7; owner decision D1. Nothing third-party is served until D1 is made. |
| OneDrive file locks | I12 retry policy |
| Delegate self-verification | I8 and I9; the Orchestrator re-runs every report and draws fresh random samples. |

---

## 10. Owner decisions (defaults apply until the owner says otherwise)

- **D1 Explanation display** (default `internal_only`). Tark does not serve VisionIAS explanation text verbatim.
  The recommended follow-up is Tark-authored explanations grounded on the key, using VisionIAS as a private
  fact reference under a verbatim-overlap ceiling.
- **D2 Scope** (default). Prelims in full from VisionIAS. Mains question text from Rau's. No model answers; Hindi out of scope.
- **D3 Sources** (decided 2026-10-22). Only VisionIAS, Rau's and the local handoff data. CSAT 2011-2016, 2018 and
  2019 remain gaps until the owner supplies a digitised source.
- **D4 Coaching keys in scored practice.** This is a consumer-epic product switch. The data always tells the truth about authority.
- **D5 Reviewer** (default: the owner). Works the G2 queue.

---

## 11. Out of scope (follow-up epics)

- **Consumer cutover.** The Exam Hall pool, Arena, Observatory and analytics, rebuilt from the release with `mock_attempts.pool_version` pinning.
- **New content.** Tark-authored explanations, and semantic syllabus-node tagging (which fixes the known tagging bias).
- **Legacy cleanup.** The `pyq_prelims` table and the old file corpora, plus the anon-readable `pyq_prelims.official_key`, which is flagged for a separate small fix.
- **Owner-excluded sources.** Official channels, scans, OCR, Rau's subject pages and pre-2011 papers.

---

## 12. Sub-contract index

| ID | Title | Wave | Depends on | Gate |
|---|---|---|---|---|
| 086A | Run dir, polite fetcher, source census | 1 | none | none |
| 086B | Bronze acquisition | 1 | 086A | SOFT |
| 086C | Document profiler (forensics, families, headers, legends) | 1 | 086B | SOFT |
| 086D | VisionIAS table extractor | 2 | 086C | HARD (G1) |
| 086E | VisionIAS linear extractor | 2 | 086C | HARD (G1) |
| 086F | Item parser + normalizer → occurrence envelopes | 2 | 086D, 086E | SOFT |
| 086G | Mains extractor (Rau's + VisionIAS 2024) | 2 | 086C | HARD (G1) |
| 086H | Import local verification layer (900 keys + transcriptions) | 2 | 086A | SOFT |
| 086H2 | Fast-follow (G1): transcriptions only within HANDOFF.md's proofread scope | 2 | 086H | SOFT; 086I HARD on it |
| 086D2 | Fast-follow (Wave 2): foreign-table guard, band-based gap-fill, band bboxes | 2 | 086D | SOFT; 086I HARD on it |
| 086F2 | Fast-follow (Wave 2): line-break-tolerant phrases, closing-prompt split | 2 | 086F, 086D2 | SOFT; 086I HARD on it |
| 086G2 | Fast-follow (Wave 2): OCR-producer guard, baseline lines, word-limit regex | 2 | 086G | SOFT; 086I HARD on it |
| 086E2 | Fast-follow (2026-10-24): CSAT multi-passage segmentation, so each item links to its own passage | 2 | 086E, 086F2 | SOFT; 086I HARD on it |
| 086G3 | Fast-follow (2026-10-24): Mains subparts on bilingual lines, one record per case study, marks attribution | 2 | 086G2 | SOFT; 086I HARD on it |
| 086I | Reconcile, series alignment, gates, review queue | 3 | 086F, 086G, 086H | HARD |
| 086J | Crops + review CLI | 3 | 086I | SOFT |
| 086K | Release builder (decisions → canonical, manifests, RELEASE.md) | 4 | 086J + G2 | HARD |
| 086L | DB projection: migration file, loader dry-run, legacy parity | 4 | 086K | HARD; G4/G5 human |
