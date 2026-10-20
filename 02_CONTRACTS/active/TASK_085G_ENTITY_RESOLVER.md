---
task_id: "TASK_085G"
title: "Entity resolver: deterministic, bilingual, precision-first"
parent: "TASK_085"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
depends_on: ["TASK_085C", "TASK_085E"]
token_budget:
  input_context_max: 4000
  thinking_budget_tokens: 2500
  output_diff_max: 2500
---

# 1. High-Density Distilled Objective
A pure, dependency-free module that maps an organisation mention (English or Hindi) to one registry slug or
returns `ambiguous`/`unknown` — never guesses.

# 2. Transcluded Context References
- `server-lib/text/normalize.ts` — `normUnicode` (085C).
- `policy_entity_aliases(alias_norm PK, entity_slug, alias_display, lang)` and `policy_entity_review` (085E).

**Distilled spec** — `server-lib/policy/resolve.ts`:
```ts
export type AliasRow = { alias_norm: string; entity_slug: string };
export type ResolveResult =
  | { status: "resolved"; slug: string; score: number; via: "exact" | "fuzzy" }
  | { status: "ambiguous"; candidates: { slug: string; score: number }[] }
  | { status: "unknown"; candidates: { slug: string; score: number }[] };
export function aliasNorm(s: string): string;            // normUnicode + strip leading "the " + "&"→"and" handled by normUnicode deletion
export function aliasVariants(display: string): string[]; // "India Semiconductor Mission (ISM)" → ["india semiconductor mission (ism)" normalised, "india semiconductor mission", "ism"]
export function jaroWinkler(a: string, b: string, p?: number): number; // standard, p=0.1, prefix ≤ 4
export function tokenSetJaccard(a: string, b: string): number;
export function buildIndex(rows: AliasRow[]): ResolverIndex;          // exact map + token → aliases inverted index
export function resolve(mention: string, idx: ResolverIndex, cfg?: { accept: number; margin: number }): ResolveResult;
```
Rules:
1. `aliasNorm` = `normUnicode`, then remove a leading `"the "`, then replace standalone `"and"`-less ampersand
   residue (already deleted by `normUnicode`) — i.e. "Ministry of Commerce & Industry" and "Ministry of Commerce and
   Industry" must normalise to strings whose `tokenSetJaccard` after dropping stop-word `"and"` is 1.0. Implement by
   dropping the tokens `and`, `of`, `the`, `एवं`, `और`, `का`, `की`, `के` **only inside similarity scoring**, never in stored aliases.
2. `resolve`: exact `alias_norm` hit → resolved/exact. Else candidates = aliases sharing ≥ 1 non-stop token
   (inverted index). Entity score = max over its aliases of `max(jaroWinkler, tokenSetJaccard)`.
   Accept iff `top ≥ accept (0.94)` and `top − second ≥ margin (0.04)`; ambiguous if `top ≥ accept` but margin fails;
   else unknown. Defaults are placeholders until 085K calibrates them for precision ≥ 0.98.
3. Mentions shorter than 3 characters after normalisation → `unknown` (avoids "PM"/"MoS" false hits).
4. Helper `enqueueReview(mention, quote, sourceUrl, result)` in `server-lib/policy/review-queue.ts` upserts into
   `policy_entity_review` on `(mention_norm, source_url)`.

# 3. Mandatory Tool Chain & Execution Path
1. `write_to_file` `server-lib/policy/resolve.ts`, `server-lib/policy/review-queue.ts`.
2. `write_to_file` `scripts/tests/radar/resolve.test.ts` (picked up by the `test:radar` glob).
3. `run_command` `npm run test:radar`, `npm run lint`.

# 4. Deterministic Acceptance Criteria (reference values computed independently)
- `jaroWinkler("martha","marhta")` = 0.9611 ± 1e-4; `("dwayne","duane")` = 0.8400; `("dixon","dicksonx")` = 0.8133;
  `("reserve bank of india","reserve bank of indai")` = 0.9905; `("niti aayog","niti ayog")` = 0.9800.
- `tokenSetJaccard("india semiconductor mission","semiconductor mission india")` = 1.0;
  `("department of telecommunications","department of telecom")` = 0.5 (the pure function uses raw tokens:
  {department, of, telecommunications} vs {department, of, telecom}). Inside `resolve`, both metrics are computed on
  stop-word-stripped strings, e.g. `jaroWinkler("department tele","department telecommunications")` = 0.9034.
- With an index of {RBI ← "reserve bank of india", "rbi"; MOCI ← "ministry of commerce and industry", "वाणिज्य एवं उद्योग मंत्रालय"; DOT ← "department of telecommunications"; DOST ← "department of science and technology"}:
  - "Reserve Bank of India" → resolved RBI exact; "RBI" → resolved RBI; "Ministry of Commerce & Industry" → resolved MOCI;
  - "वाणिज्\u200Dय एवं उद्योग मंत्रालय" (write the ZWJ as the \u200D escape in the test) → resolved MOCI;
  - "Department of Tele" → `unknown` (best score 0.9034 < 0.94); "PM" → `unknown` (length rule).
- `npm run lint`, `npm run test:radar` exit 0.

# 5. Antigravity Proof-of-Work Receipt
```yaml
telemetry:
  tools_invoked:
    - view_file
    - run_command
    - replace_file_content
    - write_to_file
  duration_ms: 13800
  exit_codes: { test_radar: 0, lint: 0 }
diff: |
  server-lib/policy/resolve.ts:
    + aliasNorm (normUnicode + strip leading 'the ')
    + aliasVariants (extracts parenthetical acronyms and full normalized string)
    + jaroWinkler (standard, prefix <= 4, p = 0.1)
    + tokenSetJaccard (raw whitespace tokens)
    + buildIndex (exactMap and tokenIndex with stop words stripped)
    + resolve (exact match, candidate retrieval, max(jw, jaccard), accept 0.94 and margin 0.04 thresholds, < 3 char length guard)
  server-lib/policy/review-queue.ts:
    + enqueueReview (upserts unresolved or ambiguous mentions into policy_entity_review)
  scripts/tests/radar/resolve.test.ts:
    + 5 test suites covering Jaro-Winkler reference values, TokenSetJaccard, aliasVariants, acceptance fixtures, and ambiguity margins
```
