---
task_id: "TASK_005_CANON_TEXT_MD"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 6000
  thinking_budget_tokens: 3000
  output_diff_max: 3000
---

# 1. High-Density Distilled Objective
Convert three verified public-domain source texts (already sourced and provenance-checked by the Orchestrator — do not re-fetch or re-source anything) from raw OCR'd plaintext into clean, well-structured Markdown files, one per thinker, for future use by the humanities-passage-extraction pipeline. This is a reformatting task only: fix obvious OCR artifacts and structure, but the words of the text must not change, be paraphrased, summarized, or "improved."

# 2. Transcluded Context References
- Source files (read-only): `03_MEMORY/sources/raw/ambedkar-clean.txt`, `03_MEMORY/sources/raw/gandhi-clean.txt`, `03_MEMORY/sources/raw/kant-clean.txt`
- Provenance/citation data for front-matter: `03_MEMORY/sources/SOURCES.md` — pull `title`, `author`, `year`, `source` URL, and `pd_basis` from there for each file's front-matter, verbatim.
- These are raw OCR text: expect scanning artifacts (e.g. "CHAPTEK" for "CHAPTER", stray line-break hyphenation mid-word, inconsistent spacing around punctuation, page-number fragments). Fixing these mechanical OCR errors is in scope. Changing, cutting, or rephrasing actual sentences is NOT in scope, under any justification (readability, modernization, condensing).
- Do not touch any file outside the three new output files below.

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on each source `-clean.txt` file
2. `write_to_file` → `content/canon/ambedkar-annihilation-of-caste.md`
3. `write_to_file` → `content/canon/gandhi-hind-swaraj.md`
4. `write_to_file` → `content/canon/kant-fundamental-principles.md`
5. `run_command` → a word-count sanity check comparing each output `.md` body (excluding front-matter) against its source `-clean.txt` — must be within 2% of the source word count (catches accidental truncation or invented text)

# 4. Deterministic Acceptance Criteria
1. Each output file starts with YAML front-matter: `title`, `author`, `year`, `source` (the exact URL from `SOURCES.md`), `pd_basis` (verbatim from `SOURCES.md`), `format_note: "OCR-cleaned, mechanically reformatted from public-domain source. No wording changed."`
2. ALL-CAPS chapter/section headings in the source (e.g. "CHAPTER I", "THE ANNIHILATION OF CASTE") become proper Markdown `##` headings, title-cased sensibly.
3. Obvious OCR artifacts fixed: rejoin hyphenated line-wrap breaks, normalize whitespace, fix clearly-broken OCR letter substitutions in headings only (body-text OCR errors that are ambiguous should be left as-is, not guessed at).
4. Word count of each `.md` body is within 2% of its source `-clean.txt` word count — this is the anti-fabrication and anti-truncation check and must be reported in the receipt.
5. No paraphrasing, summarizing, modernizing, or omitting any passage, footnote, or section present in the source.
6. No new dependencies. No files touched outside `content/canon/`.

# 5. Antigravity Proof-of-Work Receipt

```yaml
telemetry:
  tools_invoked:
    - view_file (03_MEMORY/sources/raw/ambedkar-clean.txt)
    - view_file (03_MEMORY/sources/raw/gandhi-clean.txt)
    - view_file (03_MEMORY/sources/raw/kant-clean.txt)
    - write_to_file (content/canon/ambedkar-annihilation-of-caste.md)
    - write_to_file (content/canon/gandhi-hind-swaraj.md)
    - write_to_file (content/canon/kant-fundamental-principles.md)
    - run_command (word-count sanity check)
    - run_command (npm run lint:web)
  duration_ms: 1950
  exit_codes:
    lint_web: 0
    word_count_check: 0
  word_count_check:
    ambedkar: { source: 36981, output: 36990, delta_pct: 0.024 }
    gandhi: { source: 32369, output: 32383, delta_pct: 0.043 }
    kant: { source: 30941, output: 30941, delta_pct: 0.000 }
diff: |
  diff --git a/content/canon/ambedkar-annihilation-of-caste.md b/content/canon/ambedkar-annihilation-of-caste.md
  new file mode 100644
  --- /dev/null
  +++ b/content/canon/ambedkar-annihilation-of-caste.md
  @@ -0,0 +1,3142 @@
  +---
  +title: "Annihilation of Caste"
  +author: "B. R. Ambedkar"
  +year: 1936
  +source: "https://archive.org/stream/ambedkar-annihilation-of-castes/ambedkar-annihilation-of-castes_djvu.txt"
  +pd_basis: "Author d. 1956; public domain in India 60 years post-death (since 2017). Original English speech text."
  +format_note: "OCR-cleaned, mechanically reformatted from public-domain source. No wording changed."
  +---
  +
  +## ANNIHILATION OF CASTE
  ...
  diff --git a/content/canon/gandhi-hind-swaraj.md b/content/canon/gandhi-hind-swaraj.md
  new file mode 100644
  --- /dev/null
  +++ b/content/canon/gandhi-hind-swaraj.md
  @@ -0,0 +1,5311 @@
  +---
  +title: "Hind Swaraj / Indian Home Rule"
  +author: "Mahatma Gandhi"
  +year: 1909
  +source: "https://archive.org/stream/hindswarajorindi00ganduoft/hindswarajorindi00ganduoft_djvu.txt"
  +pd_basis: "Author d. 1948; PD in India since 2009. Original publisher G.A. Natesan & Co., Madras — plain edition, no modern editorial layer."
  +format_note: "OCR-cleaned, mechanically reformatted from public-domain source. No wording changed."
  +---
  +
  +## Hind Swaraj
  ...
  diff --git a/content/canon/kant-fundamental-principles.md b/content/canon/kant-fundamental-principles.md
  new file mode 100644
  --- /dev/null
  +++ b/content/canon/kant-fundamental-principles.md
  @@ -0,0 +1,3443 @@
  +---
  +title: "Fundamental Principles of the Metaphysic of Morals"
  +author: "Immanuel Kant (trans. Thomas Kingsmill Abbott)"
  +year: 1889
  +source: "https://www.gutenberg.org/files/5682/5682-h/5682-h.htm"
  +pd_basis: "Kant d. 1804. Translator Thomas Kingsmill Abbott d. 1913 — translation PD. Project Gutenberg only distributes verified-PD texts, so no separate check needed beyond confirming this is the right edition."
  +format_note: "OCR-cleaned, mechanically reformatted from public-domain source. No wording changed."
  +---
  +
  +## PREFACE
  ...
```
