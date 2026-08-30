#!/usr/bin/env python3
"""
Tark Summer 2026 Offline News Corpus Query Tool
Usage:
    python scripts/query_offline_news.py search "<keyword>"
    python scripts/query_offline_news.py source "<source_name>"
    python scripts/query_offline_news.py ministry "<ministry_name>"
    python scripts/query_offline_news.py sql "<arbitrary_sql_query>"
"""
import sys
import os
import sqlite3
import json

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '03_MEMORY', 'knowledge', 'news-summer-2026', 'news_corpus_summer_2026.sqlite3'))

if not os.path.exists(DB_PATH):
    # fallback to archive dir
    DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '_raw_source_archive', 'news-summer-2026', 'news_corpus_summer_2026.sqlite3'))

if not os.path.exists(DB_PATH):
    print(f"Error: Offline database not found at {DB_PATH}. Run scripts/build_offline_news_vault.py first.")
    sys.exit(1)

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def search(query_str, limit=10):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT doc_id, doc_type, title, source, ministry_or_subject, date, snippet(news_fts, 3, '<b>', '</b>', '...', 15) as snippet
        FROM news_fts
        WHERE news_fts MATCH ?
        ORDER BY rank
        LIMIT ?
    """, (query_str, limit))
    rows = cur.fetchall()
    conn.close()

    print(f"\n--- Search results for: '{query_str}' ({len(rows)} matches) ---")
    for idx, r in enumerate(rows, 1):
        print(f"\n[{idx}] [{r['date']}] [{r['source']} | {r['ministry_or_subject']}] ({r['doc_type']})")
        print(f"Title: {r['title']}")
        print(f"Snippet: {r['snippet']}")

def filter_source(source_name, limit=10):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, source, ministry, headline, published_at FROM articles WHERE source LIKE ? LIMIT ?", (f"%{source_name}%", limit))
    rows = cur.fetchall()
    conn.close()

    print(f"\n--- Articles from source matching: '{source_name}' ({len(rows)} found) ---")
    for idx, r in enumerate(rows, 1):
        print(f"[{idx}] [{r['published_at']}] [{r['source']} | {r['ministry']}] {r['headline']}")

def filter_ministry(ministry_name, limit=10):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, source, ministry, headline, published_at FROM articles WHERE ministry LIKE ? LIMIT ?", (f"%{ministry_name}%", limit))
    rows = cur.fetchall()
    conn.close()

    print(f"\n--- Articles from ministry matching: '{ministry_name}' ({len(rows)} found) ---")
    for idx, r in enumerate(rows, 1):
        print(f"[{idx}] [{r['published_at']}] [{r['source']} | {r['ministry']}] {r['headline']}")

def run_sql(sql_str):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(sql_str)
        rows = cur.fetchall()
        if rows:
            cols = rows[0].keys()
            print(f"\n--- SQL Query: {sql_str} ({len(rows)} rows) ---")
            print(" | ".join(cols))
            print("-" * 60)
            for r in rows[:25]:
                print(" | ".join(str(r[c]) for c in cols))
            if len(rows) > 25:
                print(f"... and {len(rows) - 25} more rows.")
        else:
            print("Query returned 0 rows.")
    except Exception as e:
        print(f"SQL Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(0)

    cmd = sys.argv[1].lower()
    arg = sys.argv[2]

    if cmd == 'search':
        search(arg)
    elif cmd == 'source':
        filter_source(arg)
    elif cmd == 'ministry':
        filter_ministry(arg)
    elif cmd == 'sql':
        run_sql(arg)
    else:
        print(f"Unknown command: {cmd}\n", __doc__)
