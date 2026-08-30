---
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
