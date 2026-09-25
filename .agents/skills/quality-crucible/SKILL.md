---
name: quality-crucible
description: >-
  Uncompromising verification runbook and QA protocol for Tark.
  Enforces zero-regression delivery across TypeScript web, API backend,
  core engine tests, question bank integrity, and pre-push hygiene.
license: MIT
---

# Quality Crucible (Tark Verification Runbook)

Before any code change is presented as complete or committed to `origin/main`, it must pass through the **Quality Crucible**. This protocol guarantees zero broken builds, zero type leaks, and zero runtime crashes.

---

## 1. The 5-Gate Verification Pipeline

Run these commands in order. Every single gate must exit with code `0`.

### Gate 1: Web Frontend Type Safety
```bash
npm run lint:web
```
- Validates React 19 JSX, component props, and CSS token types.
- Catches invalid imports, missing types, and deprecated React patterns.

### Gate 2: Serverless Backend & API Type Safety
```bash
npm run lint:api
```
- Validates Express routes, Vercel serverless functions, and Supabase RPC signatures.
- Ensures all payload decoders and database response types are aligned.

### Gate 3: Core Simulation & Arena Test Suite
```bash
npm test
```
- Executes all 68+ tests in `scripts/qbank-tests/` and core exam engine.
- Verifies timer countdowns, negative marking math (+2.00 / -0.66), local storage rebase, and event replay.

### Gate 4: Question Bank & Manifest Integrity
```bash
npm run test:qbank
```
- Audits official UPSC question files, canonical IDs, option letters, and answer keys.
- Ensures no placeholder options ("Option X") or corrupted question stems enter production.

### Gate 5: Pre-Push Hygiene Gate (`repo-hygiene`)
```bash
git diff --cached --name-only
```
- Scans staged diffs for leaked secrets (`service_role`, `gsk_`, `sk-`, `CRON_SECRET`).
- Verifies no scratch files, test probes, or agent handoffs are staged.

---

## 2. Headless Verification Standard (No Pixel Loops)

- **Do NOT** spawn heavy screenshot-based browser subagents that wander around clicking and timing out.
- **DO USE**:
  1. Unit tests with `tsx --test` or `vitest` for deterministic state transitions.
  2. `@playwright/mcp` in headless mode (`--headless --snapshot-mode full`) for accessibility tree snapshots.
  3. Direct endpoint tests via curl / fetch scripts for API verification.

---

## 3. Incident & Regression Prevention Rules

1. **Never suppress lint or type errors** with `@ts-ignore` or `any` without an explicit, documented architectural justification.
2. **Never leave floating promises**: Always handle async errors with `.catch()` or structured `try/catch` blocks.
3. **Never push unverified migrations**: Migrations must be written to disk, audited, and reviewed by a human before applying to production.
