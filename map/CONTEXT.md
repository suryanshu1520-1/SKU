# System Map Contract — Tark 1.0

## The Universes

Every card in this map belongs to one of three universes:

- **`live`**: In active production use. Code and tables must be verified against current source files.
- **`leftover`**: Legacy migrations or unused utilities preserved for historical compatibility (e.g. ad-hoc SQL migrations).
- **`ghost`**: Planned features or stubs not yet wired into production runtime.

## Source of Truth Hierarchy

1. **Code Wins**: The actual TypeScript implementation in `src/`, `server-lib/`, and SQL in `supabase/migrations/` is the absolute source of truth.
2. **Citations Required**: Every verified object card must cite exact files and line ranges (`file:line`).
3. **First-Order Impact Only**: "If you change this" cards specify direct first-order hits and explicit "Does not hit" boundaries.

## Reading Protocol

1. Read `map/CLAUDE.md` to identify the noun or process in question.
2. Open the specific card in `map/objects/` or `map/processes/`.
3. Check `map/effects/CONTEXT.md` to confirm the ripple effects before submitting a modification.
