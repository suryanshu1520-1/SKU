---
task_id: "TASK_027_COLLAPSE_DOCKER_SCAFFOLDING"
status: "VERIFIED"
assigned_to: "ANTIGRAVITY"
target_model: "Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)"
thinking_tier: "low"
token_budget:
  input_context_max: 2500
  thinking_budget_tokens: 800
  output_diff_max: 1200
---

# 1. High-Density Distilled Objective
Production deploy is Vercel serverless (`vercel.json` functions + crons; `.github/workflows/ci.yml` — if `TASK_010` has landed by the time this runs — has no docker step). `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`, and three docs (`DOCKER_GUIDE.md`, `DOCKER_INTEGRATION.md`, `DOCKER_SETUP_COMPLETE.md`, 697 combined lines) describe a container deploy path that does not exist and never runs. Remove them. Keep `Dockerfile.pdf-convert` and `docker/Dockerfile.docling` — these are real, currently-used one-time local OCR tooling, not deploy scaffolding — and leave `docker-compose.pdf-convert.yml` alone.

# 2. Transcluded Context References
- Delete: `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`, `DOCKER_GUIDE.md`, `DOCKER_INTEGRATION.md`, `DOCKER_SETUP_COMPLETE.md` (all at repo root).
- Keep, do not touch: `Dockerfile.pdf-convert`, `docker/Dockerfile.docling`, `docker-compose.pdf-convert.yml`, `.dockerignore`.
- `.github/workflows/` — confirm via `grep_search` that no CI workflow references any of the files being deleted before removing them.
- `package.json` — confirm via `grep_search` that no npm script references `docker-compose.yml`/`Dockerfile`/`Dockerfile.dev` before removing them.

# 3. Mandatory Tool Chain & Execution Path
1. `grep_search` for `Dockerfile.dev`, `docker-compose.yml` (the bare filename, not the `.pdf-convert` variant), and `DOCKER_` across `.github/workflows/`, `package.json`, `vercel.json`, and any root-level scripts — confirm zero live references before deleting.
2. Delete the 6 files named above via `run_command` (`rm`) or the IDE's file-delete tool.
3. `run_command` — `npm run build` (confirms nothing in the build pipeline referenced the deleted files).

# 4. Deterministic Acceptance Criteria
1. The 6 named files no longer exist at repo root.
2. `Dockerfile.pdf-convert`, `docker/Dockerfile.docling`, `docker-compose.pdf-convert.yml` are untouched — confirm their content is byte-identical to before (diff shows no hunks for these).
3. `grep_search` from step 1 is re-run post-deletion and confirms no dangling reference to any deleted file remains anywhere in the repo.
4. `npm run build` exits 0.
5. Standing hard boundary: status no higher than `AWAITING_VERIFICATION`; never move to `completed/`; never touch `01_CONTROL/` or `03_MEMORY/`.

# 5. Antigravity Proof-of-Work Receipt
_(filled in by Antigravity on completion — diff + telemetry YAML only, no prose.)_

```yaml
telemetry:
  tools_invoked:
    - grep_search
    - run_command
  duration_ms: 65000
  exit_codes:
    file_deletion: 0
    npm_run_build: 0
files_deleted:
  - "Dockerfile"
  - "Dockerfile.dev"
  - "docker-compose.yml"
  - "DOCKER_GUIDE.md"
  - "DOCKER_INTEGRATION.md"
  - "DOCKER_SETUP_COMPLETE.md"
files_preserved_untouched:
  - "Dockerfile.pdf-convert"
  - "docker/Dockerfile.docling"
  - "docker-compose.pdf-convert.yml"
  - ".dockerignore"
diff: |
  Deleted 6 unused Docker deployment files and associated obsolete documentation (697 lines total).
```

