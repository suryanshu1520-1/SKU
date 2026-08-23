# ACDEP Memory Index

This is the ACDEP layer's context index — it points into the existing Tark documentation rather than duplicating it. Per `CLAUDE.md`, system architecture lives in `docs/`, and edit-impact mapping lives in `map/`. Contracts should transclude from those, not restate them.

## Context indices

- Architecture & database: `docs/`
- Edit-impact / change matrix: `map/`
- Frontend: `src/`
- Backend & cron: `server-lib/`, `api/`
- Schema & RLS: `supabase/`
- Ingestion scripts: `scripts/`

## ADRs

None recorded yet. Add one entry per decision as `03_MEMORY/ADR-YYYYMMDD-<slug>.md` (title, context, decision, consequences) when a contract resolution changes architecture rather than just fixing a bug.

## Related

[[CONTRACT_SCHEMA]] · [[AGENT_CAPABILITIES]] · [[../01_CONTROL/STATE]]
