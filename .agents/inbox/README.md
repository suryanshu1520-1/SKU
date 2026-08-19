# Agent Inbox

Agent-to-agent handoff mailbox for the Tark project. Sits alongside the shared `.agents/skills/` both Claude Code and Anti-G (Antigravity) already use.

## Convention

- One markdown file per handoff, with YAML frontmatter: `type: agent-handoff`, `from`, `to`, `date`, `subject`, `status` (`ready-for-pickup` → `in-progress` → `done`).
- The copy here is **canonical**. A mirror is placed under `docs/handoffs/` so the handoff is visible in the Obsidian graph.
- A handoff is self-contained: mission, guardrails/invariants, the skills playbook (what/when/why/how), execution structure, and definition of done — a peer agent should be able to start from it alone.

## Completed

- [`tark-typography-sweep-handoff.md`](tark-typography-sweep-handoff.md) → **Anti-G** — platform-wide mono→sans type-hierarchy sweep, completed and verified. Status: `done` (2026-08-19).

## Open

- [`tark-ui-revamp-handoff.md`](tark-ui-revamp-handoff.md) → **Anti-G** — full Tark UI revamp. Status: ready-for-pickup (2026-08-19).
