---
type: agent-handoff
from: Claude (Sonnet) — Claude Code
to: Anti-G (Antigravity)
date: 2026-08-19
subject: P4 + P5 Backend (Tark ingestion engine)
status: done
---

# Task Brief — P4 + P5 Backend (Tark ingestion engine)

> Status: **COMPLETE** (2026-08-19). Backend, significance scoring, structured synthesis, auto-MCQ generator, database migration, and Supabase deployment verified.

## Read first
`docs/news-intelligence-architecture.md` — read the three addenda dated 2026-08-19 (source strategy, P2 unified ingest, P3 clustering). They explain the whole engine.

## Existing module (do not rewrite — extend)
`server-lib/cron/ingest/`:
- `types.ts` — `Candidate = { source, tier: "primary"|"world"|"wire", lang: "en"|"hi", url, headline, body, ministryHint?, preSummarized?, bullets? }`; `Story = { lead: Candidate; members: Candidate[]; sources: string[] }`; `IngestResult`.
- `cluster.ts` — exports `authorityOf(c): number` (PIB 100, RBI 96, PRS 92, WIKIPEDIA 60, wires ~40), `makeStory`, `clusterCandidates`, `embedText`.
- `synthesize.ts` — `synthesize({title,body,lang}) => Promise<string[]|null>` (EN summarize; HI translate-then-summarize; null on non-relevance / no LLM).
- `orchestrator.ts` — `runIngest()`; three tiers gather→cluster→synthesize+upsert. The Tier-3 loop iterates `stories`, gets bullets, derives ministry, calls `upsertCurrentAffairs`.
- `server-lib/llm.ts` — `llmGenerate({system,prompt,temperature,json}) => Promise<{text,provider,model}|null>` (Gemini→Groq; Groq models `openai/gpt-oss-120b,openai/gpt-oss-20b`), `llmAvailable()`.
- `server-lib/cron/db.ts` — `upsertCurrentAffairs({source,ministry,headline,url,summary})`, upsert on conflict `url`; `summary` is a **jsonb** column.

Conventions: ESM relative imports carry explicit `.js` extensions. Defensive everywhere — NEVER throw out of the pipeline; degrade to null. $0 / free-tier only. `npm run lint` (tsc web + api) must stay clean.

## SHARED CONTRACT (the frontend is built against this — do not deviate)
`current_affairs.summary` jsonb (backward compatible; `.bullets` stays primary):
```ts
{
  bullets: string[],        // unchanged
  significance: number,     // 0-100 integer
  tags: string[],           // syllabus tags e.g. ["GS2 Polity"], 0-3
  prelims: string,          // one prelims-fact pointer, "" if none
  mains: string,            // one mains-angle pointer, "" if none
  sources: string[],        // authority-ordered source ids from the cluster
  cluster_size: number,     // # corroborating sources, >=1
  edition_date: string,     // "YYYY-MM-DD" in IST
  has_quiz: boolean         // an MCQ exists for this story
}
```
New table `public.current_affairs_mcqs`:
`id uuid pk default gen_random_uuid(), affair_url text not null unique, headline text, question text not null, options jsonb not null /*4 strings*/, correct_index smallint not null /*0-3*/, explanation text, subject text, edition_date date, created_at timestamptz not null default timezone('utc',now())`.

## Tasks
1. **`ingest/significance.ts`** — `scoreStory(story: Story): number` (int 0-100, rule-based, zero-cost). Blend: `authorityOf(lead)` ~50%; corroboration `min(sources.length-1,4)*6`; high-signal keyword density in `headline + lead.body` scaled 0-20; tier bonus (primary +6 / world +3 / wire 0); clamp 0-100. Export `SIGNAL_KEYWORDS` (cabinet, supreme court, verdict, policy, scheme, bill, act, budget, gdp, rbi, repo, treaty, agreement, mou, launch, approve, ban, sanction, tariff, parliament, ordinance, summit, …).
2. **Extend `ingest/synthesize.ts`** — add `synthesizeStructured({title,body,lang}) => Promise<{bullets:string[];tags:string[];prelims:string;mains:string}|null>`. `llmGenerate({json:true})` with a UPSC system prompt → strict JSON `{bullets, syllabus_tags, prelims_pointer, mains_pointer}`; lang-aware (Hindi→English). Robust parse (strip ```json fences, repair). On JSON failure, FALL BACK to existing `synthesize()` → `{bullets, tags:[], prelims:"", mains:""}`; null only if that also empty. Keep existing `synthesize` export unchanged.
3. **`ingest/mcq.ts`** — `generateMcq({headline,bullets,body,lang}) => Promise<{question,options:string[],correct_index:number,explanation,subject}|null>`. One UPSC prelims MCQ GROUNDED STRICTLY in supplied facts (no outside knowledge / fabrication), exactly 4 options, one correct. JSON via `llmGenerate({json:true})`; validate shape (4 options, correct_index 0-3) else null.
4. **`ingest/mcq-db.ts`** — `upsertMcq(row) => Promise<{ok,errorMessage?}>` mirroring db.ts (service-role client, upsert onConflict `affair_url`, fail-soft).
5. **Edit `ingest/orchestrator.ts` Tier 3**:
   - `significance = scoreStory(story)`, `cluster_size = story.sources.length`; SORT stories by significance desc before the loop.
   - preSummarized → bullets=lead.bullets, tags=[], prelims/mains=""; else `synthesizeStructured(...)` (null → `filtered++; continue`).
   - `edition_date` = current date in IST (UTC+5:30) "YYYY-MM-DD".
   - Top **K=8** significance-ranked NON-preSummarized stories → `generateMcq` → on success `upsertMcq` + `has_quiz=true`, else false.
   - Build enriched `summary` per contract; pass to `upsertCurrentAffairs`.
   - WIDEN db.ts `upsertCurrentAffairs` summary param type to `{ bullets: string[]; [k: string]: unknown }` (one-line; keep logic).
   - Keep ALL `IngestResult` counters (the `pipeline.ts` shim reads them).
6. **Migration** `supabase/migrations/20260619000003_current_affairs_mcqs.sql` — create table IF NOT EXISTS + `create index if not exists` on `edition_date` + enable RLS + policy SELECT for `anon, authenticated` `using(true)` + full for `service_role` (mirror `supabase/seed.sql` RLS style). **Write the file only; do not apply.**
7. **Verify** — `npm run lint` clean. Temporary OFFLINE test: assert `scoreStory` ranks a multi-source PIB Cabinet story above a single-source wire item; run from project root; delete it. If `GROQ_API_KEY` in env, ephemeral live test of `synthesizeStructured` + `generateMcq` on one sample body, print JSON, NEVER write to Supabase; delete temp files. Ensure `git status` shows only intended source changes.

## Constraints recap
No `src/` edits. No commit/push. No DB migration application. Free-tier only. Lint clean. Defensive/no-throw.
