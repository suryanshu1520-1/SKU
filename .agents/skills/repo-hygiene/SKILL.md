---
name: repo-hygiene
description: Use BEFORE any git commit or push, and whenever deciding what should or should not enter the repository. This repo is PUBLIC — this protocol blocks secrets (API keys, service_role JWTs, tokens), agent handoffs/inboxes, and scratch/probe files from ever being pushed, and forbids self-authorized production changes. Run it as a mandatory pre-push gate.
version: 1.0.0
user-invocable: true
argument-hint: "[check | pre-push]"
license: MIT
---

# Repository Hygiene Protocol

> **Context:** `origin` is a **public** GitHub repo that auto-deploys. Anything committed is world-readable and stays in history forever. Treat every commit as a publication.

This protocol is the single source of truth for *what goes to the repo and what never does*. It is mirrored at `.claude/skills/repo-hygiene/` (Claude — invoke with `/repo-hygiene`) and `.agents/skills/repo-hygiene/` (Antigravity — reference with `@repo-hygiene`). Keep both copies identical.

## The two hard rules

1. **NEVER publish secrets or internal orchestration artifacts.** Not in source, not in docs, not in tests, not in commit messages.
2. **NEVER self-authorize an irreversible/outward action** (DB migration apply, deploy, force-push, history rewrite, secret rotation). Write the artifact; a human runs it. *(This is the exact miss that motivated this protocol.)*

## NEVER commit (the deny list)

| Category | Examples | Enforcement |
|---|---|---|
| **Secrets** | `service_role` JWT (`eyJhbGci…role":"service_role"…`), `gsk_…` (Groq), `sk-…`, `SUPABASE_SERVICE_ROLE_KEY` values, `CRON_SECRET`, `INTERNAL_WORKER_SECRET`, Razorpay keys, any bearer token | env vars only; `.env*` gitignored |
| **Agent handoffs / inboxes** | `docs/handoffs/`, `.agents/inbox/`, `*-handoff.md`, cross-agent briefs | `.gitignore` |
| **Scratch / verification** | `*-probe.mjs`, `*-dryrun.ts`, `cluster-test.ts`, `tsconfig.verify*.json`, `_scratch/` | `.gitignore` |
| **Local/machine state** | `.env*`, `.claude/settings.local.json`, `.obsidian/workspace*.json`, `.mcp.json`, `*.key`/`*.pem` | `.gitignore` |

**Safe to commit:** application source, SQL migration *files* (not their application), tracked skills under `*/skills/`, generic public docs, the publishable **anon** key (it is designed to ship to the client — the `service_role` key is NOT).

## Pre-push gate (run every time, before `git push`)

```bash
# 1. Eyeball every staged path — no handoffs, no scratch, no .env
git diff --cached --name-only

# 2. Secret scan on ADDED staged lines only (deletions of a leaked key are fine)
git diff --cached -U0 -- . ':(exclude)**/skills/repo-hygiene/**' | grep -E '^\+[^+]' | grep -nE 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{20}|gsk_[A-Za-z0-9]{20}|sk-[A-Za-z0-9]{20}|service_role"|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'\''][A-Za-z0-9]|CRON_SECRET\s*=\s*\S|INTERNAL_WORKER_SECRET\s*=\s*\S' \
  && echo "❌ SECRET/LEAK DETECTED — DO NOT PUSH. Remove it, and if it was ever committed, ROTATE it." \
  || echo "✅ secret scan clean"

# 3. Confirm deny-list paths are not staged
git diff --cached --name-only | grep -iE 'handoff|/inbox/|\.env|-probe\.|-dryrun\.|\.key$|\.pem$' \
  && echo "❌ internal/secret path staged — unstage it" \
  || echo "✅ no denied paths staged"
```

If any check fails: unstage the offender (`git restore --staged <path>`), add it to `.gitignore`, and if a **secret** was already in history, tell the human to **rotate it** — `.gitignore` and `git rm --cached` do NOT un-leak what is already pushed.

## When you touch the deny list

- New cross-agent brief? Write it under `docs/handoffs/` or `.agents/inbox/` — both are gitignored, so it stays local by design.
- Need a key for a test? Read it from `process.env`; never paste a literal. Delete temp test files before finishing (`git status` must show only intended changes).
- Repo contains candid internal notes (vuln roadmaps, security debt)? Recommend the human make the repo **private**; do not rely on obscurity.

## Production-change guardrail

Migrations, deploys, seat/DB writes against prod, and secret rotation are **human-gated**. Produce the migration file, the deploy command, or the rotation steps — then stop and hand off. Do not apply them yourself even if you "verified" they are safe.
