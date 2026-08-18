# Tark 1.0 — Competitive Exam Testing Arena & AI Current Affairs

Sterile, minimalist, analytical testing arena and daily UPSC/current affairs intelligence engine.

## Routing

| Task | Go to | Role |
|---|---|---|
| Understand system architecture & database | `docs/` | Comprehensive technical manuals |
| Audit edit impact before modifying code | `map/` | System Map (nouns, verbs, change matrix) |
| Frontend components & test arena UI | `src/` | React 19 + Tailwind v4 + Lucide |
| Backend endpoints & cron workers | `server-lib/` & `api/` | Express + Vercel serverless |
| Database schema, RLS & migrations | `supabase/` | Postgres migrations & RPCs |
| Ingestion & scraping scripts | `scripts/` | Scrapers & test harnesses |
| Visual knowledge & graph navigation | `Vault Map.md` | Obsidian knowledge hub |

## Quick Commands

- **Dev Server**: `npm run dev` (starts Express + Vite on port 5173 / 3000)
- **Build**: `npm run build` (Vite client + esbuild backend)
- **Lint Web**: `npm run lint:web`
- **Lint API**: `npm run lint:api`
- **Full Lint**: `npm run lint`

## Operational Invariants

1. **Auth**: All protected client requests must use `fetchWithAuth()` with valid Bearer token.
2. **Evaluation**: Quiz scoring and answers are validated strictly server-side (`server-lib/submit-quiz.ts`).
3. **Concurrency**: Seat purchases use 15-minute reservation locks (`reserve_premium_seat_if_available` RPC).
4. **Ingestion**: Scrapers in `server-lib/cron/` enforce `CRON_SECRET` and execute background AI distillation via `waitUntil()`.
