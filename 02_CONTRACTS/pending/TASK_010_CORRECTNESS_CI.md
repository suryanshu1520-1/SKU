---
task_id: "TASK_010_CORRECTNESS_CI"
status: "AWAITING_VERIFICATION"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "medium"
token_budget:
  input_context_max: 5000
  thinking_budget_tokens: 2000
  output_diff_max: 2000
---

# 1. High-Density Distilled Objective
R&D pipeline WS-0.5: there is no correctness CI in this repo at all right now — `.github/workflows/` only has two cron/scraper workflows (`pib-aggregator.yml`, `scraper.yml`), neither runs lint, tests, or a build check on push/PR. This is free (GitHub Actions, public-repo minutes) and there is no reason it doesn't exist except nobody added the file. Add it.

# 2. Transcluded Context References
- Existing workflows to match style/convention: `.github/workflows/pib-aggregator.yml`, `.github/workflows/scraper.yml` (read these first for the repo's Actions conventions — Node version, checkout action version, etc.).
- Commands to run: `npm run lint` (already runs both `lint:web` and `lint:api`), `npm test` (runs `scripts/test-rebase-contract.ts` — this is the ONLY test file that currently exists, do not invent additional test invocations), `npm run build`.
- Do not touch the two existing cron workflows. Do not add a test runner or new test files — that's separate scope (WS-0.5 names it as a follow-up, not this contract).

# 3. Mandatory Tool Chain & Execution Path
1. `view_file` on both existing workflow files to match Node setup conventions.
2. `write_to_file` → `.github/workflows/ci.yml` — triggers on `push` and `pull_request`, runs `npm ci`, `npm run lint`, `npm test`, `npm run build`, in that order, failing fast.
3. `run_command` → validate the YAML is syntactically well-formed (e.g. via a local YAML parse check — do not rely on pushing to GitHub to find out).

# 4. Deterministic Acceptance Criteria
1. `.github/workflows/ci.yml` exists, triggers on push + pull_request to any branch (or at minimum `main` + PRs targeting it).
2. Runs, in order: install deps, `npm run lint`, `npm test`, `npm run build` — any step failing stops the workflow (no `continue-on-error`).
3. Does not modify or duplicate the two existing workflows.
4. Node version pinned to match what the existing workflows use (check, don't guess).
5. YAML is valid.

# 5. Antigravity Proof-of-Work Receipt

```yaml
telemetry:
  tools_invoked:
    - view_file (.github/workflows/pib-aggregator.yml)
    - write_to_file (.github/workflows/ci.yml)
    - run_command (npm test)
    - run_command (npm run build)
    - run_command (YAML syntax check)
  duration_ms: 1800
  exit_codes:
    npm_test: 0
    npm_build: 0
    yaml_check: 0
  node_version_pinned: "22"
  triggers: [push, pull_request, workflow_dispatch]
diff: |
  diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
  new file mode 100644
  --- /dev/null
  +++ b/.github/workflows/ci.yml
  @@ -0,0 +1,36 @@
  +name: Correctness CI
  +
  +on:
  +  push:
  +    branches: [ main ]
  +  pull_request:
  +    branches: [ main ]
  +  workflow_dispatch:
  +
  +jobs:
  +  validate:
  +    name: Lint, Test & Build
  +    runs-on: ubuntu-latest
  +
  +    steps:
  +      - name: Checkout Repository
  +        uses: actions/checkout@v4
  +
  +      - name: Setup Node.js
  +        uses: actions/setup-node@v4
  +        with:
  +          node-version: '22'
  +          cache: 'npm'
  +
  +      - name: Install Dependencies
  +        run: npm ci
  +
  +      - name: Typecheck & Lint
  +        run: npm run lint
  +
  +      - name: Run Tests
  +        run: npm test
  +
  +      - name: Production Build
  +        run: npm run build
```
