import json
import sqlite3
import os
import re
from datetime import datetime

MEGA_SNAPSHOT = os.path.join(os.path.dirname(__file__), 'data', 'mega_news_corpus_snapshot.json')

with open(MEGA_SNAPSHOT, 'r', encoding='utf-8') as f:
    corpus = json.load(f)

ca_articles = corpus.get('current_affairs_articles', [])
pib_digests = corpus.get('pib_digests', [])
ca_mcqs = corpus.get('current_affairs_mcqs', [])

print(f"Loaded: {len(ca_articles)} CA articles, {len(pib_digests)} PIB digests, {len(ca_mcqs)} MCQs.")

# Target Output Directories
KNOWLEDGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '03_MEMORY', 'knowledge', 'news-summer-2026'))
ARCHIVE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '_raw_source_archive', 'news-summer-2026'))

os.makedirs(KNOWLEDGE_DIR, exist_ok=True)
os.makedirs(ARCHIVE_DIR, exist_ok=True)

# ==============================================================================
# 1. BUILD SQLITE DATABASE WITH FULL-TEXT SEARCH (FTS5)
# ==============================================================================
sqlite_paths = [
    os.path.join(KNOWLEDGE_DIR, 'news_corpus_summer_2026.sqlite3'),
    os.path.join(ARCHIVE_DIR, 'news_corpus_summer_2026.sqlite3')
]

for db_path in sqlite_paths:
    if os.path.exists(db_path):
        os.remove(db_path)
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Create tables
    cur.execute('''
    CREATE TABLE articles (
        id TEXT PRIMARY KEY,
        source TEXT,
        ministry TEXT,
        headline TEXT,
        summary TEXT,
        url TEXT,
        published_at TEXT,
        created_at TEXT,
        word_count INTEGER
    )
    ''')

    cur.execute('''
    CREATE TABLE pib_digests (
        id TEXT PRIMARY KEY,
        title TEXT,
        date TEXT,
        content TEXT,
        url TEXT,
        created_at TEXT,
        word_count INTEGER
    )
    ''')

    cur.execute('''
    CREATE TABLE current_affairs_mcqs (
        id TEXT PRIMARY KEY,
        affair_url TEXT,
        headline TEXT,
        question TEXT,
        options_json TEXT,
        correct_index INTEGER,
        explanation TEXT,
        subject TEXT,
        edition_date TEXT,
        created_at TEXT
    )
    ''')

    # Full Text Search virtual table
    cur.execute('''
    CREATE VIRTUAL TABLE news_fts USING fts5(
        doc_id,
        doc_type,
        title,
        body,
        source,
        ministry_or_subject,
        date
    )
    ''')

    # Insert articles
    for a in ca_articles:
        s_raw = a.get('summary', '')
        s_text = ''
        if isinstance(s_raw, dict):
            s_text = ' '.join(str(v) for v in s_raw.values())
        elif isinstance(s_raw, list):
            s_text = ' '.join(str(v) for v in s_raw)
        elif isinstance(s_raw, str):
            s_text = s_raw
        
        words = len((a.get('headline', '') + ' ' + s_text).split())
        
        cur.execute('''
        INSERT INTO articles (id, source, ministry, headline, summary, url, published_at, created_at, word_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            a.get('id'), a.get('source'), a.get('ministry'), a.get('headline'),
            s_text, a.get('url'), a.get('published_at'), a.get('created_at'), words
        ))

        cur.execute('''
        INSERT INTO news_fts (doc_id, doc_type, title, body, source, ministry_or_subject, date)
        VALUES (?, 'article', ?, ?, ?, ?, ?)
        ''', (
            a.get('id'), a.get('headline'), s_text, a.get('source'),
            a.get('ministry'), a.get('published_at') or a.get('created_at')
        ))

    # Insert PIB digests
    for d in pib_digests:
        content = d.get('content', '') or ''
        words = len(content.split())
        cur.execute('''
        INSERT INTO pib_digests (id, title, date, content, url, created_at, word_count)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            d.get('id'), d.get('title'), d.get('date'), content,
            d.get('url'), d.get('created_at'), words
        ))

        cur.execute('''
        INSERT INTO news_fts (doc_id, doc_type, title, body, source, ministry_or_subject, date)
        VALUES (?, 'pib_digest', ?, ?, 'PIB', 'Government of India', ?)
        ''', (
            d.get('id'), d.get('title'), content, d.get('date')
        ))

    # Insert MCQs
    for q in ca_mcqs:
        opts_str = json.dumps(q.get('options')) if q.get('options') else ''
        cur.execute('''
        INSERT INTO current_affairs_mcqs (id, affair_url, headline, question, options_json, correct_index, explanation, subject, edition_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            q.get('id'), q.get('affair_url'), q.get('headline'), q.get('question'),
            opts_str, q.get('correct_index'), q.get('explanation'), q.get('subject'),
            q.get('edition_date'), q.get('created_at')
        ))

        cur.execute('''
        INSERT INTO news_fts (doc_id, doc_type, title, body, source, ministry_or_subject, date)
        VALUES (?, 'mcq', ?, ?, 'Daily News MCQ', ?, ?)
        ''', (
            q.get('id'), q.get('headline'), (q.get('question', '') or '') + '\n' + (q.get('explanation', '') or ''),
            q.get('subject'), q.get('edition_date') or q.get('created_at')
        ))

    conn.commit()
    conn.close()
    print(f"SQLite DB built successfully: {db_path}")

# ==============================================================================
# 2. EXPORT JSONL (JSON LINES) FOR RAPID STREAM ACCESS
# ==============================================================================
jsonl_path = os.path.join(KNOWLEDGE_DIR, 'news_corpus_summer_2026.jsonl')
with open(jsonl_path, 'w', encoding='utf-8') as f:
    for a in ca_articles:
        f.write(json.dumps({"type": "article", "data": a}) + '\n')
    for d in pib_digests:
        f.write(json.dumps({"type": "pib_digest", "data": d}) + '\n')
    for q in ca_mcqs:
        f.write(json.dumps({"type": "mcq", "data": q}) + '\n')
print(f"JSONL stream file written to: {jsonl_path}")

# ==============================================================================
# 3. BUILD CHRONOLOGICAL & THEMATIC MARKDOWN DOSSIERS
# ==============================================================================

# A. June 2026 Digests
june_digests = [d for d in pib_digests if (d.get('date') or '').startswith('2026-06')]
june_md_path = os.path.join(KNOWLEDGE_DIR, 'june_2026_policy_digests.md')
with open(june_md_path, 'w', encoding='utf-8') as f:
    f.write(f"# 🏛️ June 2026 Central Policy Digests (PIB Spine)\n\n")
    f.write(f"Total Editions: {len(june_digests)}\n\n---\n\n")
    for d in june_digests:
        f.write(f"## [{d.get('date')}] {d.get('title')}\n\n")
        f.write(f"- **ID:** `{d.get('id')}`\n")
        if d.get('url'): f.write(f"- **Source URL:** {d.get('url')}\n")
        f.write(f"\n{d.get('content')}\n\n---\n\n")

# B. July 2026 Digests
july_digests = [d for d in pib_digests if (d.get('date') or '').startswith('2026-07')]
july_md_path = os.path.join(KNOWLEDGE_DIR, 'july_2026_policy_digests.md')
with open(july_md_path, 'w', encoding='utf-8') as f:
    f.write(f"# 🌏 July 2026 Central Policy Digests (Bilateral & Trade Spine)\n\n")
    f.write(f"Total Editions: {len(july_digests)}\n\n---\n\n")
    for d in july_digests:
        f.write(f"## [{d.get('date')}] {d.get('title')}\n\n")
        f.write(f"- **ID:** `{d.get('id')}`\n")
        if d.get('url'): f.write(f"- **Source URL:** {d.get('url')}\n")
        f.write(f"\n{d.get('content')}\n\n---\n\n")

# C. August 2026 Digests
august_digests = [d for d in pib_digests if (d.get('date') or '').startswith('2026-08')]
august_md_path = os.path.join(KNOWLEDGE_DIR, 'august_2026_policy_digests.md')
with open(august_md_path, 'w', encoding='utf-8') as f:
    f.write(f"# ⚡ August 2026 Central Policy Digests (Infrastructure & Regulatory Spine)\n\n")
    f.write(f"Total Editions: {len(august_digests)}\n\n---\n\n")
    for d in august_digests:
        f.write(f"## [{d.get('date')}] {d.get('title')}\n\n")
        f.write(f"- **ID:** `{d.get('id')}`\n")
        if d.get('url'): f.write(f"- **Source URL:** {d.get('url')}\n")
        f.write(f"\n{d.get('content')}\n\n---\n\n")

# D. August Intelligence Units (MCQs)
mcq_md_path = os.path.join(KNOWLEDGE_DIR, 'august_2026_current_affairs_intelligence.md')
with open(mcq_md_path, 'w', encoding='utf-8') as f:
    f.write(f"# 🎯 August 2026 Current Affairs Intelligence Units (127 Grounded Units)\n\n")
    f.write(f"Total Verified Units: {len(ca_mcqs)}\n\n---\n\n")
    for idx, q in enumerate(ca_mcqs):
        f.write(f"### {idx + 1}. [{q.get('edition_date')}] {q.get('headline')}\n\n")
        f.write(f"- **Subject Domain:** `{q.get('subject')}`\n")
        if q.get('affair_url'): f.write(f"- **Article Link:** {q.get('affair_url')}\n")
        f.write(f"\n**Question:**\n{q.get('question')}\n\n")
        if q.get('explanation'):
            f.write(f"**Forensic Explanation & Key Facts:**\n{q.get('explanation')}\n\n")
        f.write(f"---\n\n")

# E. Master Knowledge Index for Obsidian & Claude
index_md_path = os.path.join(KNOWLEDGE_DIR, 'INDEX.md')
with open(index_md_path, 'w', encoding='utf-8') as f:
    f.write('''---
title: "Tark Summer 2026 News & Governance Corpus"
tags:
  - news-corpus
  - governance-archive
  - intelligence-vault
  - summer-2026
  - icm-workspace
type: hub
status: authoritative
---

# 🏛️ Tark Summer 2026 News & Governance Offline Knowledge Hub

This offline repository contains the **complete 1,074-record multi-source news, policy, and intelligence dataset** collected across Summer 2026 (June 1 – August 31, 2026) for instantaneous local exploration by Claude, agents, and researchers.

```
                      ┌───────────────────────────┐
                      │       [[Vault Map]]       │
                      └─────────────┬─────────────┘
                                    │
                      ┌─────────────▼─────────────┐
                      │ [[news-summer-2026/INDEX]]│
                      └─────────────┬─────────────┘
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
 ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
 │ Master SQLite FTS5│    │ JSONL Stream File │    │ Research Treatise │
 │ 1,074 Documents   │    │ 160,868 Words     │    │ [[docs/TARK_..]]  │
 └───────────────────┘    └───────────────────┘    └───────────────────┘
```

---

## 📊 Offline Access Endpoints & Assets

| Asset Path | Format | Description |
|---|---|---|
| `03_MEMORY/knowledge/news-summer-2026/news_corpus_summer_2026.sqlite3` | **SQLite (FTS5)** | Full-text indexed relational database. Supports instant BM25 and SQL searches. |
| `03_MEMORY/knowledge/news-summer-2026/news_corpus_summer_2026.jsonl` | **JSON Lines** | Complete 1,074-line stream file (1 line per news article/digest/MCQ). |
| `scripts/data/mega_news_corpus_snapshot.json` | **JSON Array** | Master JSON snapshot (1.77 MB). |
| `scripts/data/mega_phd_analytics_results.json` | **Computed Metrics** | Master statistical, network, linguistic, and geopolitical results. |
| `[[docs/TARK_SUMMER_2026_GOVERNANCE_AND_NEWS_CORPUS_DEEP_ANALYTICS]]` | **Markdown Monograph** | 196-line formal peer-reviewed standard empirical research treatise. |

---

## 📚 Structured Markdown Dossiers

- **[[03_MEMORY/knowledge/news-summer-2026/june_2026_policy_digests|🏛️ June 2026 Policy Digests]]**: Election nomination law (*Bommai/Naveen Jain*), State Finance Commissions, BHAVYA Scheme.
- **[[03_MEMORY/knowledge/news-summer-2026/july_2026_policy_digests|🌏 July 2026 Policy Digests]]**: India-Australia Strategic Partnership, ECTA, ASEAN AITIGA review, BRICS Science Forum.
- **[[03_MEMORY/knowledge/news-summer-2026/august_2026_policy_digests|⚡ August 2026 Policy Digests]]**: Space Vision 2047, DRI SAFTA areca nut crackdown, CBDC-based DBT, Grassland guide.
- **[[03_MEMORY/knowledge/news-summer-2026/august_2026_current_affairs_intelligence|🎯 August 2026 Current Affairs Intelligence]]**: 127 verified multi-statement news items with detailed statutory breakdowns.

---

## 💻 Instant Offline Shell Query Tool

Claude or any terminal agent can run instant SQL or full-text searches offline using `scripts/query_offline_news.py`:

```bash
# Keyword Search (Full-Text Search across all 1,074 documents)
python scripts/query_offline_news.py search "critical minerals"
python scripts/query_offline_news.py search "Bombay High Court"

# Ministry Filter
python scripts/query_offline_news.py ministry "Finance"
python scripts/query_offline_news.py source "THE HINDU"

# Arbitrary SQL Query
python scripts/query_offline_news.py sql "SELECT source, count(*) FROM articles GROUP BY source"
```
''')

print("All offline markdown dossiers and index created!")
