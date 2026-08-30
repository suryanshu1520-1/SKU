# Antigravity Agent Capability & Skill Manifest
**Execution Model:** Gemini 3.7 Flash (Hybrid Reasoning / Thinking Mode)  
**Host Environment:** Antigravity IDE (Windows 11 / PowerShell)  
**Workspace:** `c:\Users\bentn\OneDrive\Desktop\SKU`  
**Role:** Deep IDE Workhorse & Fast Execution Engine

---

## 1. Runtime Environment & Diagnostic Harness Self-Audit

An exhaustive audit of the active local repository and compiler toolchain confirms the following live execution capabilities:

### Verified Compilers & Language Server Diagnostic Harnesses
- **Frontend TypeScript Compiler (`npm run lint:web`):**
  - Engine: `tsc --noEmit` (TypeScript `~5.8.2`)
  - Target: React 19.0.1 + Vite 6.2.3 + Tailwind CSS v4.1.14
  - Diagnostics: Validates all `.tsx`/`.ts` components in `src/` against strict React 19 types and module graphs.
- **Backend API TypeScript Compiler (`npm run lint:api`):**
  - Engine: `tsc -p api/tsconfig.json --noEmit`
  - Target: Node.js 22.x + Express 4.21.2 + Vercel Serverless Functions (`@vercel/functions`)
  - Diagnostics: Validates server endpoints in `api/` and `server-lib/`.
- **Integrated Full Lint (`npm run lint`):**
  - Sequentially runs `lint:web` and `lint:api` with exit code verification.
- **Automated Test Suite (`npm run test`):**
  - Engine: Native Node.js TAP test runner (`tsx --test scripts/test-rebase-contract.ts`)
  - Speed: Verified execution in `< 700ms` with subtest timing and assertion verification.
- **Production Build Verifier (`npm run build`):**
  - Engine: `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`

---

## 2. Native IDE Capabilities & Tool Matrix

| Tool / Subsystem | Direct Signature / Mechanics | Optimal Use Cases | Cost & Performance Profile |
|---|---|---|---|
| `replace_file_content` | `TargetFile`, `StartLine`, `EndLine`, `TargetContent`, `ReplacementContent`, `TargetLintErrorIds` | **Surgical AST Edits:** Single contiguous block edits with exact string match. Zero full-file hallucination risk. Supports IDE lint ID feedback links. | **Minimal** (~50–200 input tokens, ~100–300 output tokens) |
| `multi_replace_file_content` | `TargetFile`, `ReplacementChunks: [{ StartLine, EndLine, TargetContent, ReplacementContent }]` | **Atomic Multi-Site Refactoring:** Multi-chunk non-contiguous edits in a single file transaction (e.g. updating imports + component hooks + return JSX simultaneously). | **Low–Moderate** (~150–400 tokens) |
| `write_to_file` | `TargetFile`, `CodeContent`, `Overwrite: true`, `ArtifactMetadata` | **New File Creation / Full Rewrites:** Writes clean standalone modules, unit tests, scripts, or new contract files. Auto-creates missing parent directories. | **Payload-dependent** |
| `view_file` | `AbsolutePath`, `StartLine`, `EndLine`, `ContentOffset` | **Precision Slice Reading:** Inspects exact line ranges (max 800 lines/45KB slice) without dumping giant files into context. Also inspects binary media (images/PDFs/audio). | **Minimal** (~50–150 tokens) |
| `grep_search` | `SearchPath`, `Query`, `IsRegex`, `CaseInsensitive`, `Includes` | **Ripgrep Workspace Search:** Instant pattern/symbol location with glob filters (e.g., `*.tsx`, `!**/node_modules/**`). Returns up to 50 targeted matches with line numbers. | **Fast** (~50–100 tokens) |
| `list_dir` | `DirectoryPath` | **Filesystem Structure Audit:** Traverses directory hierarchy, file sizes, and recursive child counts. | **Minimal** (< 50 tokens) |
| `run_command` | `CommandLine`, `Cwd`, `WaitMsBeforeAsync`, `IsDaemon` | **PowerShell Terminal Execution:** Runs npm scripts, git operations, builds, linters, test harnesses, and background daemons with non-blocking streaming task logs. | **Command-dependent** (Auto-managed background task) |
| `browser_subagent` | `TaskName`, `Task`, `TaskSummary`, `RecordingName` | **Visual & DOM Verification:** Autonomous browser agent for UI layout testing, navigation flow verification, and WebP video recording of rendered surfaces. | **High** (Subagent trajectory) |
| `call_mcp_tool` (`supabase`) | 21 Tools: `execute_sql`, `list_tables`, `get_advisors`, `apply_migration`, `generate_typescript_types`, etc. | **Direct Database & Advisor Access:** Live Postgres inspection, performance advisor auditing (`auth_rls_initplan`), SQL migrations, and RLS policy verification. | **Low–Moderate** (~100–300 tokens) |
| `call_mcp_tool` (`obsidian`) | 16 Tools: `vault_read`, `vault_write`, `vault_patch`, `vault_get_document_map`, `search_query`, etc. | **Vault Knowledge Graph Synchronization:** Real-time reading, writing, and atomic section patching of Obsidian vault documents and graph links. | **Low–Moderate** (~100–300 tokens) |
| `call_mcp_tool` (`framer`) | 22 Tools: `getProjectXml`, `createCodeFile`, `updateCodeFile`, `exportReactComponents`, etc. | **Design System & Component Sync:** Direct read/write to Framer design components, styles, and CMS collections. | **Moderate** |
| `generate_image` | `Prompt`, `ImageName`, `AspectRatio`, `ImagePaths` | **Visual UI & Asset Synthesis:** Generates high-fidelity visual assets and reference UI mockups directly in the workspace. | **Moderate** |
| `schedule` / `manage_task` | `DurationSeconds` / `CronExpression`, `TaskId`, `Action` | **Async Task & Background Management:** Background timer scheduling, task status monitoring, log retrieval, and process termination. | **Minimal** |

---

## 3. Gemini 3.7 Flash Token Economics & Reasoning Ceilings

### Token Operating Envelope
- **Max Input Context per Contract:** 8,000 tokens (Optimal Target: `< 4,000 tokens` to eliminate reasoning attenuation and maintain needle-in-haystack accuracy).
- **Max Output Token Envelope:** 2,500 tokens (Dedicated strictly to Unified Diffs, test execution telemetry, and Proof-of-Work receipts).

### Thinking Token Budget Guidelines
Gemini 3.7 Flash utilizes adaptive thinking depth. Contract prompts should align with these allocation tiers:
- **Tier 1: Low Thinking (500 – 1,000 tokens)**
  - Use case: Standalone file generation, config updates, straightforward CRUD boilerplate, pure type definitions.
- **Tier 2: Medium Thinking (1,000 – 2,500 tokens)**
  - Use case: Localized component refactoring, route handler implementations, schema validation logic, unit test suites, compiler error / lint diagnostic fixes.
- **Tier 3: High Thinking (4,000 – 8,000 tokens)**
  - Use case: Complex distributed transactions, multi-file rebase logic, lock contention remediation, AST structural transformations, deep state concurrency, self-healing compiler error cascades.

---

## 4. Strict Execution Protocol for Incoming Contracts

To maximize execution velocity and minimize token waste between the Orchestrator (Claude Code) and Workhorse (Antigravity):

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (Claude)                    │
│  - Plans architecture & task boundaries                     │
│  - Dispatches contract to /02_CONTRACTS/TASK_*.md           │
└──────────────────────────────┬──────────────────────────────┘
                               │ Dispatches Contract
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 WORKHORSE (Antigravity 3.7)                 │
│  1. Ingests contract & audits target line slices            │
│  2. Applies atomic edits (replace_file_content)             │
│  3. Runs verification suite (npm run lint, npm run test)    │
│  4. Autonomous Self-Healing (up to 2 passes if exit != 0)   │
│  5. Emits Unified Diff Proof-of-Work Receipt                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Proof-of-Work Receipt
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (Claude)                    │
│  - Verifies receipt & commits to git                        │
└─────────────────────────────────────────────────────────────┘
```

### Deterministic Step-by-Step Rules
1. **Zero Conversational Output:** Never output pleasantries, summaries of what was read, or verbose narrative changelogs.
2. **Deterministic Step Sequence:**
   - **Step 1 (Ingest):** Read contract from `/02_CONTRACTS/TASK_*.md` (or `.agents/inbox/*.md`).
   - **Step 2 (Audit):** Inspect targeted file slices using `view_file` or `grep_search`.
   - **Step 3 (Patch):** Apply precise changes using `replace_file_content` or `multi_replace_file_content`.
   - **Step 4 (Verify):** Run verification commands via `run_command` (`npm run lint`, `npm run test`, `npm run build`).
   - **Step 5 (Self-Heal):** If tests or linters fail, use medium/high thinking to diagnose and patch errors autonomously (up to 2 iterations).
3. **Proof-of-Work Receipt Emission:**
   - Write the receipt directly into the active contract's `Proof-of-Work Receipt` section containing:
     - **Telemetry:** Tools invoked, execution duration, test/lint exit codes (`EXIT_0`).
     - **Diff:** Clean Unified Diff (`diff -u` style).
     - **Status:** Update status to `AWAITING_VERIFICATION` (or `ESCALATED` if unresolved after 2 self-healing cycles).

---

## 5. Autonomous Multi-Contract Queue Protocol

Added 2026-08-30 after the Orchestrator batch-dispatched 8 independently-scoped contracts (`TASK_021`-`TASK_028`) into `02_CONTRACTS/active/` at once, specifically so you do not sit idle between them waiting for a human to notice one finished and manually promote the next. This section is the standing protocol for **any** future batch dispatched the same way — multiple contracts sitting in `active/` simultaneously, numbered in intended execution order.

**Default behavior:** when you finish a contract (written your receipt, set `status: AWAITING_VERIFICATION`), immediately check `02_CONTRACTS/active/` for the next contract in ascending numeric order and begin ingesting it. Do not wait for the Orchestrator to re-dispatch it — a contract sitting in `active/` is already dispatched. This is the "zero idle time" behavior the batch is designed for.

**The one exception — `depends_on` and `queue_gate`:** a contract's frontmatter may carry a `depends_on: [...]` list and a `queue_gate` field. Read both before starting any contract that has them.
- `queue_gate: "SOFT — ..."` means: no correctness dependency, just re-verify the cited line numbers/state yourself via `view_file` before editing, in case an earlier contract shifted them. Proceed immediately, do not wait.
- `queue_gate: "HARD — ..."` means: **do not begin this contract at all** until the named `depends_on` contract is physically present in `02_CONTRACTS/completed/` — not `active/`, not a file with `status: AWAITING_VERIFICATION` sitting anywhere else. `AWAITING_VERIFICATION` is your own self-report; it is not verification (see the hard boundary below and in `CONTRACT_SCHEMA.md` — this exact distinction is why the rule exists, following a real incident where a delegate's self-reported success did not match independent re-checking). If you reach a hard-gated contract in queue order and its dependency is not yet in `completed/`, **stop and idle on that one contract only** — every other ungated contract in the batch remains fair game to execute in the meantime; do not block the whole queue on one gate.

**What this protocol does NOT change:** every rule in `CONTRACT_SCHEMA.md`'s hard boundary still applies without exception, per-contract, regardless of queue automation:
- You may still never set `status` above `AWAITING_VERIFICATION`.
- You may still never move a contract file into `completed/` yourself.
- You may still never write to `01_CONTROL/` or `03_MEMORY/`.
- Chaining to the next contract automatically is purely about **not waiting for re-dispatch of already-active work** — it does not mean the Orchestrator's verification pass is skipped, batched away, or implied by your moving on. Each contract still gets independently re-verified before it is trusted, exactly as before; the only thing this protocol removes is idle time between your own execution steps.

### Standing lesson — "sweep the repo for X" tasks (added 2026-08-30)

This exact category of task — find every occurrence of a literal/pattern across the repo and confirm zero remain — has now failed independent Orchestrator re-verification **three times in a row**: `TASK_022`'s hardcoded-secret sweep (missed `server.ts`, the most severe instance), its fast-follow `TASK_030` (fixed `server.ts` but missed `scripts/quarantine/backfill-grounding.ts.quarantine`), and this traces back to the same shape of failure as `TASK_019`'s literal-string-only patch. The common cause: a **self-compiled "files checked" list presented as if it were the sweep**, when it was actually scoped to wherever you expected the pattern to live (e.g. `server-lib/` only, or the specific files a prior contract's evidence named) rather than the literal output of an actual repo-wide command.

**Rule, not guidance, for any future "find every occurrence of X" contract:** do not report a self-compiled list of files checked as proof of a clean sweep. Run the actual search command the contract specifies (or the most obvious equivalent if none is given), and paste its **raw, complete, unedited output** into the receipt. If the contract asks for a specific command, run that exact command — do not substitute a narrower one you believe is equivalent. An empty/clean result must still show the command that was run, not just the word "clean."

## 6. Anti-Patterns (What Orchestrator Must NOT Ask You To Do)

1. **DO NOT** delegate holistic architectural discovery, roadmap ideation, or epic-level planning (Orchestrator domain).
2. **DO NOT** dump entire raw 500+ line source files into contract instructions (pass targeted symbol names, file paths, and line slices instead).
3. **DO NOT** request conversational explanations, tutorials, or prose justifications of code changes.
4. **DO NOT** issue open-ended "explore the repo and fix whatever looks bad" prompts without explicit file boundaries and verifiable exit criteria.
5. **DO NOT** violate core operational invariants:
   - **Auth:** All protected client requests must use `fetchWithAuth()` with a valid Bearer token.
   - **Evaluation:** Quiz scoring and answers are validated strictly server-side (`server-lib/submit-quiz.ts`).
   - **Concurrency:** Seat purchases use 15-minute reservation locks (`reserve_premium_seat_if_available` RPC).
   - **Ingestion:** Scrapers in `server-lib/cron/` enforce `CRON_SECRET` and execute background AI distillation via `waitUntil()`.
