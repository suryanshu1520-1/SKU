import sqlite3
import json
import os

db_path = r'_raw_source_archive/pyq-master/master_pyq_intelligence.sqlite3'
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute('''
SELECT 
    id, year, paper, stage, primary_subject, stem, statements_json, options_json, official_key, question_type, cognitive_depth, examiner_trap_archetype, word_count, answer_explanation
FROM master_questions
ORDER BY chronological_sequence_index ASC
''')
rows = cur.fetchall()

processed = []
for r in rows:
    qid, yr, paper, stage, subj, stem, stmts_json, opts_json, key, qtype, cog, trap, wc, exp = r
    opts = json.loads(opts_json) if opts_json else {}
    opt_list = []
    if isinstance(opts, dict):
        for k in ['a', 'b', 'c', 'd']:
            if k in opts and opts[k]:
                opt_list.append(f"({k}) {opts[k]}")
    elif isinstance(opts, list):
        opt_list = opts

    ext = []
    cont = []
    low = (stem or '').lower()
    for w in ['always', 'never', 'only', 'all', 'solely', 'cannot', 'under no circumstances', 'exclusively']:
        if f" {w} " in f" {low} ":
            ext.append(w)
    for w in ['can be', 'may be', 'some', 'certain', 'might', 'generally', 'often']:
        if f" {w} " in f" {low} ":
            cont.append(w)

    era = '2023-2025' if yr >= 2023 else ('2011-2022' if yr >= 2011 else '2000-2010')
    k_upper = (key or 'C').upper()
    cog_clean = (cog or 'Direct Synthesis').replace('_', ' ')
    trap_archetype = trap or 'Standard Analysis'
    trap_text = exp if exp else f"Official UPSC Key: ({k_upper}). Primary taxonomy: {subj}. Cognitive depth: {cog_clean}. Trap Archetype: {trap_archetype}."

    processed.append({
        'id': qid,
        'year': yr,
        'paper': paper,
        'stage': stage,
        'subject': subj,
        'era': era,
        'stem': stem,
        'options': opt_list if len(opt_list) >= 2 else ['(a) Option A', '(b) Option B', '(c) Option C', '(d) Option D'],
        'correctKey': k_upper,
        'cognitiveType': cog_clean,
        'wordCount': wc or len((stem or '').split()),
        'trapAnalysis': trap_text,
        'qualifiers': {'extreme': ext, 'contingent': cont}
    })

print(f"Total processed questions: {len(processed)}")
os.makedirs('server-lib/analytics/data', exist_ok=True)
out_path = 'server-lib/analytics/data/master_7841_pyqs.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(processed, f, ensure_ascii=False)

sz = os.path.getsize(out_path)
print(f"Successfully generated {out_path}: {sz / 1024 / 1024:.2f} MB")
