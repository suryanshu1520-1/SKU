# Tark Question-Bank Canonical Contract (`server-lib/qbank/`)

Source-controlled, versioned schema + validators for the question-bank
restoration and corroboration project. Implements the "pristine" definition in
`docs/handoffs/qbank-quality-scope-2026-09-24.md` §6 and the discrepancy reason
codes in §7.

## Files

- `types.ts` — canonical types and enumerations (identity, text, key authority,
  explanation, classification, eligibility, evidence, paper manifest, source
  occurrences).
- `validators.ts` — pure, deterministic normalization + validation + eligibility
  derivation. No filesystem or network access.
- `scripts/qbank-tests/validators.test.ts` — acceptance tests (§9).

## Key design rules

1. **Unknown stays unknown.** A missing key is `key_unavailable`, never a default
   letter. A missing year is not 2020.
2. **Canonical IDs ≠ occurrence IDs.** Booklet series is a presentation variant
   captured on `SourceOccurrence`; the canonical identity is series-independent.
3. **Tark's randomized mock series is never an official booklet series.**
4. **Key authority** is explicit: `official-final`, `official-provisional`,
   `secondary-claimed`, `disputed`, `withdrawn`, `unavailable`, `not-applicable`.
   A coaching key or a mirrored official key is `secondary-claimed` until the
   official host is fetched.
5. **Eligibility is derived** (`deriveEligibility`), not asserted: `scored` requires
   authentic + text-complete + official-final key + zero blocking discrepancies.

## Run tests

```sh
npm run test:qbank
```

## Operational scripts (write only into the run directory)

- `scripts/qbank/extract-pages.ts` — render + vision-OCR a scanned PDF page-by-page.
- `scripts/qbank/reconcile-paper.ts` — turn extracted pages + key into canonical records.

Raw sources and run artifacts live under `_raw_source_archive/qbank-quality/<run-id>/`
and are not published with the source tree.
