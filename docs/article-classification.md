# Article classification

`src/lib/article-classification.ts` owns the public article classification contract. The feed, brief reader, Daily Edition, ingestion, publication service and API use this same implementation. Compatibility exports in `syllabus-tagger.ts` and `coverage-classifier.ts` delegate to it.

## Two independent questions

- **Subject:** what the development is about. A manuscript agreement belongs to Culture even when it has an international partner. A substantive second syllabus connection remains available in Exam context.
- **Coverage:** India, India & world (`cross_border`), World (`international`), or unresolved (`unclassified`). International feed selection includes both international scopes.

Headline evidence outranks summary mentions. A foreign comparison, domestic MoU, old tag, or issuing ministry alone does not establish an international relationship. Explicit Indian participation and an international actor/activity are required for India & world. Official Indian publishers provide a domestic fallback when no foreign activity is identified. Unknown publishers and insufficient evidence can remain unresolved.

Every result carries a version, supporting text, coverage reason and review reasons. Summary-only subjects, excluded negative policy boilerplate, missing subjects and unresolved coverage enter the review queue. This is a deterministic editorial aid, not a guarantee of exhaustive semantic understanding; add regression fixtures for newly discovered mistakes.

## Display and storage

Cards show one plain subject line and optional international coverage, with no syllabus badges in the byline. Paper, secondary connections, scope explanation and review notes are inside the existing Exam context disclosure. The brief and Daily Edition use the same subjects.

Existing `summary.tags`, claims, bullets and provenance are retained. Ingestion adds `summary.classification`, `syllabus_paper` and `syllabus_topic`, and persists the resolved scope. Historical rows are classified when read, so their presentation does not depend on a database rewrite. Stored graph node IDs are corroboration rather than ground truth and are not bulk rewritten.

Scope selection classifies before pagination. The client stops scanning after it finds a page plus one matching item; the API scans the eligible set for an exact total. Queries preserve source, ministry, date and search constraints and use creation time plus ID for stable ordering. Large archives may warrant a materialized, versioned classification index after an approved data migration.

## Verification and audit

Run `npm run test:classification` for the screenshot cases, stale metadata, domestic versus foreign agreements, boilerplate, canonical syllabus nodes and pagination regressions. These tests also run under `npm test`.

Run `npm run audit:article-tags` for a **read-only** audit using the public Supabase key in `.env.local` / `.env`. It writes `artifacts/article-classification-report.json`, including proposed classifications, original tags, scope differences and a review queue. The report is ignored by Git. The script never updates rows; scope differences are proposed changes, not independently verified errors.
