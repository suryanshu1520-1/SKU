# Ingestion & Distillation Pipeline — Tark 1.0

## 1. Pipeline Overview

The Tark 1.0 news ingestion engine continuously monitors government press releases, gazettes, and reputable current affairs RSS feeds, distill them using LLMs, and stores clean digests into Supabase.

```
[ Government / News RSS Feeds (PIB, Drishti, The Hindu) ]
                          │
                          ▼
[ RSS Fetcher & HTML Parser (Cheerio, Turndown, Got-Scraping) ]
                          │
                          ▼
[ Article Deduplication & Content Cleaning ]
                          │
                          ▼
[ LLM Distillation Engine (Gemini 2.5 / Llama 3) ]
  - Generates executive summary
  - Formats markdown analysis
  - Extracts key exam takeaways & MCQs
                          │
                          ▼
[ Supabase Storage (`pib_digests` & `questions` tables) ]
```

## 2. Ingestion Stages & Mechanics

### Stage 1: Fetching & Discovery (`server-lib/cron/rss.ts`, `pib-aggregator.ts`)
- Connects to RSS feeds using `rss-parser` and `got-scraping`.
- Applies source-specific rate limits and custom headers to avoid bot throttling.
- Extracts article metadata: title, original publication date, category, and source link.

### Stage 2: HTML Extraction & Sanitization
- Uses `cheerio` to strip navigation bars, scripts, advertisements, and tracking tags.
- Converts raw HTML bodies into clean, standardized markdown using `turndown`.
- Drops boilerplate and duplicates based on URL and headline hashing.

### Stage 3: AI Distillation (`server-lib/cron/ai.ts`)
- Sends the sanitized content to LLMs with strict prompting guidelines:
  - Extract government schemes, ministry context, constitutional provisions, and economic data.
  - Produce high-density analytical bullet points.
  - Formulate UPSC-standard Multiple Choice Questions (MCQs) with single/multi-statement options.

### Stage 4: Database Persistence (`server-lib/cron/db.ts`)
- Upserts the generated digest into `pib_digests`.
- Ingests generated MCQs into `questions` table for upcoming daily quiz pools.

## 3. Execution & Cron Scheduling

- **Vercel Cron Trigger**: Configured in `vercel.json` to hit `/api/cron/scrape` at scheduled intervals.
- **Manual Execution**: Run standalone via PowerShell/Node:
  ```bash
  npx tsx scripts/run-scraper.ts
  ```
- **Error Handling**: Wrapped in item-level try/catch blocks; a failed single feed or malformed article will not abort the batch execution.
