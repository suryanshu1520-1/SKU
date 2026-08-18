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
| [`ingestion-pipeline.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/ingestion-pipeline.md) | RSS feed ingestion, PIB scraping, AI distillation & cron workers | `server-lib/cron/`, `scripts/run-scraper.ts` |
| [`monetization-tiers.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/monetization-tiers.md) | Freemium quotas, Razorpay checkout, 15-min seat reservation locks | `server-lib/create-razorpay-order.ts`, `server-lib/verify-payment.ts` |

## Reading Guidelines

- For holistic architectural understanding or subsystem wiring, start with [`codebase-assessment.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/codebase-assessment.md) and [`subsystem-wiring-map.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/subsystem-wiring-map.md).
- When modifying database policies, schemas, or RPCs, consult [`database-schema.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/database-schema.md) and [`security-and-performance-audit.md`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/docs/security-and-performance-audit.md).
- To evaluate change impacts across components before writing code, open the System Map in [`map/`](file:///c:/Users/bentn/OneDrive/Desktop/SKU/map).
