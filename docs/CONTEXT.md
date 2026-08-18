# Documentation Library — Tark 1.0

## Shelf Purpose

This directory holds the authoritative technical documentation, architectural assessments, subsystem mappings, and system reference manuals for **Tark 1.0**.

## Catalog of Documents

| Document | Topic | Key References |
|---|---|---|
| [`codebase-assessment.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/codebase-assessment.md) | Forensic evaluation: what tool delivers well, critique, technical debt | Entire repository, live Supabase instance |
| [`subsystem-wiring-map.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/subsystem-wiring-map.md) | Comprehensive frontend ↔ backend ↔ Supabase database mapping | `src/components/`, `server-lib/`, `api/`, Postgres tables |
| [`security-and-performance-audit.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/security-and-performance-audit.md) | Supabase advisor findings, RLS optimizations, and SQL remediations | `supabase/`, Postgres policies, RPCs |
| [`architecture.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/architecture.md) | High-level system design, client-server data flow, tech stack | `src/App.tsx`, `server.ts`, `server-lib/` |
| [`database-schema.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/database-schema.md) | PostgreSQL tables, RLS policies, migrations & RPCs | `supabase/migrations/`, `supabase/seed.sql` |
| [`api-reference.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/api-reference.md) | Server endpoints, authentication headers, request/response contracts | `server.ts`, `server-lib/`, `api/` |
| [`ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/ingestion-pipeline.md) | The four parallel `current_affairs` ingestion paths, their divergent quality bars, and the shared Gradio/Llama dependency | `server-lib/cron/`, `server-lib/internal/`, `server-lib/sync-feed.ts`, `scripts/run-scraper.ts` |
| [`news-feed-quality-roadmap.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/news-feed-quality-roadmap.md) | How to make the current-affairs feed exceptional: consolidation, PIB-in-the-autonomous-path, world coverage, dedup, significance ranking | `server-lib/cron/pipeline.ts`, `server-lib/internal/worker.ts` |
| [`monetization-tiers.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/monetization-tiers.md) | Freemium quotas, Razorpay checkout, 15-min seat reservation locks | `server-lib/create-razorpay-order.ts`, `server-lib/verify-payment.ts` |
| [`design-system.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/design-system.md) | Existing aesthetic identity, Antigravity spatial components, color/type tokens | `src/components/InteractiveBackground.tsx`, `TiltCard.tsx`, `src/index.css` |
| [`ui-revamp-masterplan.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/ui-revamp-masterplan.md) | Exhaustive full-platform UI revamp spec: north star, foundation fixes, per-surface specs, sub-agent execution (delegated to Anti-G) | All of `src/components/`, `src/index.css` |
| [`live-site-critique.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/live-site-critique.md) | Pixel-grounded critique of the rendered product (verified navy/teal/gold identity, live per-screen findings) | Rendered app at `tarkv1.vercel.app` |
| [`handoffs/tark-ui-revamp-handoff.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/handoffs/tark-ui-revamp-handoff.md) | Anti-G execution handoff: skills playbook, guardrails, Framer MCP (canonical in `.agents/inbox/`) | — |

## Reading Guidelines

- For holistic architectural understanding or subsystem wiring, start with [`codebase-assessment.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/codebase-assessment.md) and [`subsystem-wiring-map.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/subsystem-wiring-map.md).
- When modifying database policies, schemas, or RPCs, consult [`database-schema.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/database-schema.md) and [`security-and-performance-audit.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/security-and-performance-audit.md).
- To evaluate change impacts across components before writing code, open the System Map in [`map/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map).
