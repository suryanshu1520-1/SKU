import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { importHandoff, parseCsv } from '../../qbank/final/import-handoff.js';
import { getRunDir, REPO_ROOT } from '../../qbank/final/run-dir.js';

test('(a) parseCsv handles quoted commas, doubled quotes and newlines', () => {
  const csv = [
    'id,title,description',
    '1,"Hello, World","She said ""quoted text"""',
    '2,"Line 1\nLine 2","Normal text"',
  ].join('\n');

  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, '1');
  assert.equal(rows[0].title, 'Hello, World');
  assert.equal(rows[0].description, 'She said "quoted text"');
  assert.equal(rows[1].id, '2');
  assert.equal(rows[1].title, 'Line 1\nLine 2');
  assert.equal(rows[1].description, 'Normal text');
});

test('(b) Key mappings for scored, dropped, and two_answers_accepted', () => {
  const tempHandoff = path.join(
    REPO_ROOT,
    '_raw_source_archive',
    'qbank-quality',
    `test-handoff-${Date.now()}`
  );
  fs.mkdirSync(tempHandoff, { recursive: true });

  const keysCsv = [
    'id,year,paper,series,qnum,official_key,key_status,item_status,verification,note,official_filename,file_sha256,page,source_tier,mirror_vajiram',
    'CSE-2020-GS1-A-Q01,2020,GS1,A,1,B,official,scored,agreed,,key.pdf,hash1,1,2026-09-28,vaj.pdf',
    'CSE-2020-GS1-A-Q27,2020,GS1,A,27,X,official,dropped,agreed,,key.pdf,hash1,1,2026-09-28,vaj.pdf',
    "CSE-2021-GS2-A-Q39,2021,GS2,A,39,C|D,official,two_answers_accepted,agreed,overwritten 'C or D',key2.pdf,hash2,2,2026-09-28,vaj.pdf",
  ].join('\n');

  fs.writeFileSync(path.join(tempHandoff, 'official_keys_seriesA_2020_2024.csv'), keysCsv);

  const emptyQuestionsCsv = 'id,year,paper,series,qnum,question_text,option_a,option_b,option_c,option_d,official_key,key_status,item_status,deleted_flag,format,n_items,items_json,truth_basis,primary_topic,secondary_topic,word_count,source_url,archive_url,file_sha256,page,source_tier,verification,coder_notes\n';
  for (const yr of ['2021', '2022', '2024', '2025']) {
    fs.writeFileSync(path.join(tempHandoff, `cse${yr}_gs1_seriesA_questions.csv`), emptyQuestionsCsv);
  }

  const tempRun = path.join(tempHandoff, 'run');
  fs.mkdirSync(tempRun, { recursive: true });

  const rep = importHandoff({ runDir: tempRun, handoffDir: tempHandoff });
  assert.equal(rep.keys['2020-GS-1'].official_final, 1);
  assert.equal(rep.keys['2020-GS-1'].withdrawn, 1);
  assert.equal(rep.keys['2021-GS-2'].accepted_multi, 1);

  const key2020 = JSON.parse(
    fs.readFileSync(path.join(tempRun, 'keys', 'official', '2020-GS-1.json'), 'utf-8')
  );
  assert.equal(key2020.series.A['1'].authority, 'official-final');
  assert.equal(key2020.series.A['1'].key, 'b');
  assert.equal(key2020.series.A['27'].authority, 'withdrawn');
  assert.equal(key2020.series.A['27'].key, null);

  const key2021 = JSON.parse(
    fs.readFileSync(path.join(tempRun, 'keys', 'official', '2021-GS-2.json'), 'utf-8')
  );
  assert.equal(key2021.series.A['39'].authority, 'official-final');
  assert.equal(key2021.series.A['39'].key, 'c');
  assert.deepEqual(key2021.series.A['39'].accepted_keys, ['c', 'd']);

  fs.rmSync(tempHandoff, { recursive: true, force: true });
});

test('(c) Empty option triggers missing_option warning', () => {
  const tempHandoff = path.join(
    REPO_ROOT,
    '_raw_source_archive',
    'qbank-quality',
    `test-handoff-opt-${Date.now()}`
  );
  fs.mkdirSync(tempHandoff, { recursive: true });

  const keysCsv = 'id,year,paper,series,qnum,official_key,key_status,item_status,verification,note,official_filename,file_sha256,page,source_tier,mirror_vajiram\n';
  fs.writeFileSync(path.join(tempHandoff, 'official_keys_seriesA_2020_2024.csv'), keysCsv);

  const questionCsv = [
    'id,year,paper,series,qnum,question_text,option_a,option_b,option_c,option_d,official_key,key_status,item_status,deleted_flag,format,n_items,items_json,truth_basis,primary_topic,secondary_topic,word_count,source_url,archive_url,file_sha256,page,source_tier,verification,coder_notes',
    'CSE-2021-GS1-A-Q01,2021,GS1,A,1,"Question stem text","Option A","","Option C","Option D","B","official","scored","0","direct","0","","","","","10","https://src.pdf","","sha123","1","T1","ok",""',
  ].join('\n');

  fs.writeFileSync(path.join(tempHandoff, 'cse2021_gs1_seriesA_questions.csv'), questionCsv);
  for (const yr of ['2022', '2024', '2025']) {
    fs.writeFileSync(path.join(tempHandoff, `cse${yr}_gs1_seriesA_questions.csv`), 'id\n');
  }

  const tempRun = path.join(tempHandoff, 'run');
  fs.mkdirSync(tempRun, { recursive: true });

  const rep = importHandoff({ runDir: tempRun, handoffDir: tempHandoff });
  assert.equal(rep.transcriptions['2021-GS-1'].missing_option, 1);

  const occPath = path.join(tempRun, 'occurrences', 'handoff', '2021-GS-1.jsonl');
  const lines = fs.readFileSync(occPath, 'utf-8').split(/\r?\n/).filter((l) => l.trim().length > 0);
  assert.equal(lines.length, 1);
  const envelope = JSON.parse(lines[0]);
  assert.ok(envelope.parse.warnings.includes('missing_option'));

  // (e) official_key never reaches key_claim
  assert.equal(envelope.explanation_claim, null);
  assert.equal(envelope.occurrence.canonical_id, null);
  assert.equal((envelope as any).key_claim, undefined);

  fs.rmSync(tempHandoff, { recursive: true, force: true });
});

test('(d) Determinism: two runs produce byte-identical output', () => {
  const tempHandoff = path.join(
    REPO_ROOT,
    '_raw_source_archive',
    'qbank-quality',
    `test-handoff-det-${Date.now()}`
  );
  fs.mkdirSync(tempHandoff, { recursive: true });

  const keysCsv = [
    'id,year,paper,series,qnum,official_key,key_status,item_status,verification,note,official_filename,file_sha256,page,source_tier,mirror_vajiram',
    'CSE-2020-GS1-A-Q01,2020,GS1,A,1,B,official,scored,agreed,,key.pdf,hash1,1,2026-09-28,vaj.pdf',
  ].join('\n');
  fs.writeFileSync(path.join(tempHandoff, 'official_keys_seriesA_2020_2024.csv'), keysCsv);

  const qCsv = [
    'id,year,paper,series,qnum,question_text,option_a,option_b,option_c,option_d,official_key,key_status,item_status,deleted_flag,format,n_items,items_json,truth_basis,primary_topic,secondary_topic,word_count,source_url,archive_url,file_sha256,page,source_tier,verification,coder_notes',
    'CSE-2021-GS1-A-Q01,2021,GS1,A,1,"Stem","A","B","C","D","B","official","scored","0","direct","0","","","","","10","https://src.pdf","","sha123","1","T1","ok",""',
  ].join('\n');
  for (const yr of ['2021', '2022', '2024', '2025']) {
    fs.writeFileSync(path.join(tempHandoff, `cse${yr}_gs1_seriesA_questions.csv`), qCsv);
  }

  const run1 = path.join(tempHandoff, 'run1');
  const run2 = path.join(tempHandoff, 'run2');

  importHandoff({ runDir: run1, handoffDir: tempHandoff });
  importHandoff({ runDir: run2, handoffDir: tempHandoff });

  const file1 = fs.readFileSync(path.join(run1, 'reports', 'import-handoff.json'), 'utf-8');
  const file2 = fs.readFileSync(path.join(run2, 'reports', 'import-handoff.json'), 'utf-8');
  assert.equal(file1, file2);

  const occ1 = fs.readFileSync(path.join(run1, 'occurrences', 'handoff', '2021-GS-1.jsonl'), 'utf-8');
  const occ2 = fs.readFileSync(path.join(run2, 'occurrences', 'handoff', '2021-GS-1.jsonl'), 'utf-8');
  assert.equal(occ1, occ2);

  fs.rmSync(tempHandoff, { recursive: true, force: true });
});

test('(e) Proofread scope enforcement, method label, and file cleanup (TASK_086H2)', () => {
  const tempHandoff = path.join(
    REPO_ROOT,
    '_raw_source_archive',
    'qbank-quality',
    `test-handoff-scope-${Date.now()}`
  );
  fs.mkdirSync(tempHandoff, { recursive: true });

  const keysCsv = [
    'id,year,paper,series,qnum,official_key,key_status,item_status,verification,note,official_filename,file_sha256,page,source_tier,mirror_vajiram',
    'CSE-2020-GS1-A-Q01,2020,GS1,A,1,B,official,scored,agreed,,key.pdf,hash1,1,2026-09-28,vaj.pdf',
  ].join('\n');
  fs.writeFileSync(path.join(tempHandoff, 'official_keys_seriesA_2020_2024.csv'), keysCsv);

  // 2021: row 1 (in scope 1..16), row 17 (out of scope)
  const qCsv2021 = [
    'id,year,paper,series,qnum,question_text,option_a,option_b,option_c,option_d,official_key,key_status,item_status,deleted_flag,format,n_items,items_json,truth_basis,primary_topic,secondary_topic,word_count,source_url,archive_url,file_sha256,page,source_tier,verification,coder_notes',
    'CSE-2021-GS1-A-Q01,2021,GS1,A,1,"Stem 1","A","B","C","D","B","official","scored","0","direct","0","","","","","10","https://src.pdf","","sha123","1","T1","ok",""',
    'CSE-2021-GS1-A-Q17,2021,GS1,A,17,"Stem 17","A","B","C","D","B","official","scored","0","direct","0","","","","","10","https://src.pdf","","sha123","2","T1","ok",""',
  ].join('\n');
  fs.writeFileSync(path.join(tempHandoff, 'cse2021_gs1_seriesA_questions.csv'), qCsv2021);

  // 2022: all out of scope
  const qCsv2022 = [
    'id,year,paper,series,qnum,question_text,option_a,option_b,option_c,option_d,official_key,key_status,item_status,deleted_flag,format,n_items,items_json,truth_basis,primary_topic,secondary_topic,word_count,source_url,archive_url,file_sha256,page,source_tier,verification,coder_notes',
    'CSE-2022-GS1-A-Q01,2022,GS1,A,1,"Stem 1","A","B","C","D","B","official","scored","0","direct","0","","","","","10","https://src.pdf","","sha123","1","T1","ok",""',
  ].join('\n');
  fs.writeFileSync(path.join(tempHandoff, 'cse2022_gs1_seriesA_questions.csv'), qCsv2022);

  // 2024: all in scope, 1 normal + 1 deleted
  const qCsv2024 = [
    'id,year,paper,series,qnum,question_text,option_a,option_b,option_c,option_d,official_key,key_status,item_status,deleted_flag,format,n_items,items_json,truth_basis,primary_topic,secondary_topic,word_count,source_url,archive_url,file_sha256,page,source_tier,verification,coder_notes',
    'CSE-2024-GS1-A-Q01,2024,GS1,A,1,"Stem 1","A","B","C","D","B","official","scored","0","direct","0","","","","","10","https://src.pdf","","sha123","1","T1","ok",""',
    'CSE-2024-GS1-A-Q20,2024,GS1,A,20,"Stem 20","A","B","C","D","B","official","dropped","1","direct","0","","","","","10","https://src.pdf","","sha123","2","T1","ok",""',
  ].join('\n');
  fs.writeFileSync(path.join(tempHandoff, 'cse2024_gs1_seriesA_questions.csv'), qCsv2024);

  // 2025: in scope
  const qCsv2025 = [
    'id,year,paper,series,qnum,question_text,option_a,option_b,option_c,option_d,official_key,key_status,item_status,deleted_flag,format,n_items,items_json,truth_basis,primary_topic,secondary_topic,word_count,source_url,archive_url,file_sha256,page,source_tier,verification,coder_notes',
    'CSE-2025-GS1-A-Q01,2025,GS1,A,1,"Stem 1","A","B","C","D","B","official","scored","0","direct","0","","","","","10","https://src.pdf","","sha123","1","T1","ok",""',
  ].join('\n');
  fs.writeFileSync(path.join(tempHandoff, 'cse2025_gs1_seriesA_questions.csv'), qCsv2025);

  const tempRun = path.join(tempHandoff, 'run');
  fs.mkdirSync(path.join(tempRun, 'occurrences', 'handoff'), { recursive: true });
  // Seed stale 2022 file to test it gets removed
  const stale2022Path = path.join(tempRun, 'occurrences', 'handoff', '2022-GS-1.jsonl');
  fs.writeFileSync(stale2022Path, '{"stale": true}\n');

  const rep = importHandoff({ runDir: tempRun, handoffDir: tempHandoff });

  // 2021: 1 imported, 1 skipped_not_proofread
  assert.equal(rep.transcriptions['2021-GS-1'].imported, 1);
  assert.equal(rep.transcriptions['2021-GS-1'].skipped_not_proofread, 1);

  // 2022: 0 imported, 1 skipped_not_proofread, and file was deleted
  assert.equal(rep.transcriptions['2022-GS-1'].imported, 0);
  assert.equal(rep.transcriptions['2022-GS-1'].skipped_not_proofread, 1);
  assert.equal(fs.existsSync(stale2022Path), false);

  // 2024: 1 imported, 1 skipped_deleted, 0 skipped_not_proofread
  assert.equal(rep.transcriptions['2024-GS-1'].imported, 1);
  assert.equal(rep.transcriptions['2024-GS-1'].skipped_deleted, 1);
  assert.equal(rep.transcriptions['2024-GS-1'].skipped_not_proofread, 0);

  // 2025: 1 imported
  assert.equal(rep.transcriptions['2025-GS-1'].imported, 1);
  assert.equal(rep.transcriptions['2025-GS-1'].skipped_not_proofread, 0);

  // Check method label in 2021 output
  const occ2021 = fs.readFileSync(path.join(tempRun, 'occurrences', 'handoff', '2021-GS-1.jsonl'), 'utf-8');
  const env2021 = JSON.parse(occ2021.trim());
  assert.equal(
    env2021.occurrence.evidence.extraction_method,
    'tesseract-ocr(2 passes)+visual-proofread (tark_pyq_handoff)'
  );

  fs.rmSync(tempHandoff, { recursive: true, force: true });
});

