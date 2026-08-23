# Canonical Text Sources — Provenance & PD Basis

Sourced by the Orchestrator directly (Antigravity has no web-fetch tool and can't be trusted to verify public-domain provenance). One rejection already happened here — record it so it isn't repeated.

## Ambedkar — Annihilation of Caste (1936)

- **File:** `03_MEMORY/sources/raw/ambedkar-clean.txt` (~9,600 words)
- **Fetched from:** https://archive.org/stream/ambedkar-annihilation-of-castes/ambedkar-annihilation-of-castes_djvu.txt
- **PD basis:** Author d. 1956; public domain in India 60 years post-death (since 2017). Original English speech text.
- **Rejected source, do not reuse:** `archive.org/details/AnnihilationOfCasteDr.B.r.ambedkar` — this is Navayana's 2014 "Annotated Critical Edition," which bundles Arundhati Roy's ~150-page introductory essay "The Doctor and the Saint" ahead of Ambedkar's text. That essay is a separately copyrighted modern work, not PD. Caught by word-count/heading-structure sanity check before it reached any content pipeline — flagging here so nobody re-fetches it by habit.

## Gandhi — Hind Swaraj / Indian Home Rule (1909/1938 English)

- **File:** `03_MEMORY/sources/raw/gandhi-clean.txt` (~32,000 words)
- **Fetched from:** https://archive.org/stream/hindswarajorindi00ganduoft/hindswarajorindi00ganduoft_djvu.txt
- **PD basis:** Author d. 1948; PD in India since 2009. Original publisher G.A. Natesan & Co., Madras — plain edition, no modern editorial layer.

## Kant — Fundamental Principles of the Metaphysic of Morals (trans. Abbott, 1889)

- **File:** `03_MEMORY/sources/raw/kant-clean.txt` (~31,000 words)
- **Fetched from:** https://www.gutenberg.org/files/5682/5682-h/5682-h.htm (Project Gutenberg eBook #5682)
- **PD basis:** Kant d. 1804. Translator Thomas Kingsmill Abbott d. 1913 — translation PD. Project Gutenberg only distributes verified-PD texts, so no separate check needed beyond confirming this is the right edition.

## Process note for future sourcing

- Always check the source's heading/section structure before trusting it — a bundled modern introduction, foreword, or annotation layer can hide inside an otherwise-correct archive.org item.
- `curl` direct to the raw text/HTML URL, not `WebFetch` — WebFetch summarizes through a model and will not preserve exact primary-source text.
- This sourcing step stays Orchestrator-only. Antigravity converts verified clean text into structured Markdown (see `02_CONTRACTS/completed/TASK_005_CANON_TEXT_MD.md`) but never re-sources or re-fetches source text itself.
