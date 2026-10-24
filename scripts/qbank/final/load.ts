import '../../../server-lib/load-env.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { assertRunDirSafe, getRunDir, stableStringify, writeJsonAtomic } from './run-dir.js';
import type {
  KeyAssertion,
  MainsQuestionRecord,
  PaperManifest,
  QuestionRecord,
  SourceOccurrence,
} from '../../../server-lib/qbank/types.js';

export interface TablePlan {
  rows: number;
  sample_pk: unknown;
  sample_row?: unknown;
}

export interface LoadPlan {
  release_id: string;
  tables: Record<string, TablePlan>;
}

export function sha256String(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf-8').digest('hex');
}

export function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function planLoad(options: {
  runDir?: string;
  preview?: boolean;
}): Promise<{ plan: LoadPlan; rowsByTable: Record<string, any[]> }> {
  const rDir = options.runDir || getRunDir();
  assertRunDirSafe(rDir);

  const releaseId = 'final-2026-10';
  const canonicalDir = path.join(rDir, 'canonical');
  const reportsDir = path.join(rDir, 'reports');
  const releasePreviewDir = path.join(rDir, 'release-preview');
  releasePreviewDir && fs.mkdirSync(releasePreviewDir, { recursive: true });

  const isPreview = options.preview ?? true;

  let questionsFile = path.join(canonicalDir, isPreview ? 'questions.preview.jsonl' : 'questions.jsonl');
  let mainsFile = path.join(canonicalDir, isPreview ? 'mains.preview.jsonl' : 'mains.jsonl');
  let occFile = path.join(canonicalDir, isPreview ? 'occurrences.preview.jsonl' : 'occurrences.jsonl');
  let manifestsFile = path.join(canonicalDir, isPreview ? 'manifests.preview.json' : 'manifests.json');

  if (!isPreview) {
    // Check reports/release.json files integrity
    const releaseRepPath = path.join(reportsDir, 'release.json');
    if (!fs.existsSync(releaseRepPath)) {
      throw new Error(`reports/release.json not found at ${releaseRepPath}`);
    }
    const releaseRep = JSON.parse(fs.readFileSync(releaseRepPath, 'utf-8'));
    for (const [relPath, expectedHash] of Object.entries(releaseRep.files as Record<string, string>)) {
      const fullPath = path.join(rDir, relPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Integrity check failed: file missing ${relPath}`);
      }
      const actualHash = sha256File(fullPath);
      if (actualHash !== expectedHash) {
        throw new Error(
          `Integrity check mismatch for ${relPath}: expected ${expectedHash}, got ${actualHash}`
        );
      }
    }
  }

  // Fallback to preview files if release files do not exist yet in preview mode
  if (!fs.existsSync(questionsFile) && fs.existsSync(path.join(canonicalDir, 'questions.preview.jsonl'))) {
    questionsFile = path.join(canonicalDir, 'questions.preview.jsonl');
  }
  if (!fs.existsSync(mainsFile) && fs.existsSync(path.join(canonicalDir, 'mains.preview.jsonl'))) {
    mainsFile = path.join(canonicalDir, 'mains.preview.jsonl');
  }
  if (!fs.existsSync(occFile) && fs.existsSync(path.join(canonicalDir, 'occurrences.preview.jsonl'))) {
    occFile = path.join(canonicalDir, 'occurrences.preview.jsonl');
  }
  if (!fs.existsSync(manifestsFile) && fs.existsSync(path.join(canonicalDir, 'manifests.preview.json'))) {
    manifestsFile = path.join(canonicalDir, 'manifests.preview.json');
  }

  const questions: QuestionRecord[] = [];
  if (fs.existsSync(questionsFile)) {
    for (const l of fs.readFileSync(questionsFile, 'utf-8').split('\n')) {
      if (l.trim()) questions.push(JSON.parse(l));
    }
  }

  const mains: MainsQuestionRecord[] = [];
  if (fs.existsSync(mainsFile)) {
    for (const l of fs.readFileSync(mainsFile, 'utf-8').split('\n')) {
      if (l.trim()) mains.push(JSON.parse(l));
    }
  }

  const occurrences: SourceOccurrence[] = [];
  if (fs.existsSync(occFile)) {
    for (const l of fs.readFileSync(occFile, 'utf-8').split('\n')) {
      if (l.trim()) occurrences.push(JSON.parse(l));
    }
  }

  const manifests: Record<string, PaperManifest> = fs.existsSync(manifestsFile)
    ? JSON.parse(fs.readFileSync(manifestsFile, 'utf-8'))
    : {};

  // Build rows per table
  // 1. qbank_releases
  const qbank_releases = [
    {
      release_id: releaseId,
      manifest_sha256: sha256String(fs.existsSync(manifestsFile) ? fs.readFileSync(manifestsFile, 'utf-8') : '{}'),
      counts: {
        questions: questions.length,
        mains: mains.length,
        manifests: Object.keys(manifests).length,
        occurrences: occurrences.length,
      },
      notes: 'Final 2026-10 release',
    },
  ];

  // 2. qbank_sources
  const sourcesMap = new Map<string, any>();
  for (const m of Object.values(manifests)) {
    for (const s of m.source_documents || []) {
      const key = `${releaseId}|${s.document_id}`;
      if (!sourcesMap.has(key)) {
        const publisher = s.document_id.split(':')[0] || 'unknown';
        sourcesMap.set(key, {
          release_id: releaseId,
          document_id: s.document_id,
          publisher,
          url: s.url,
          sha256: s.sha256,
          bytes: s.bytes,
          pages: s.pages,
          retrieved_at: s.retrieved_at,
          source_status: s.source_status,
        });
      }
    }
  }
  const qbank_sources = Array.from(sourcesMap.values());

  // 3. qbank_questions (NO key, answer, or explanation column)
  const qbank_questions = questions.map((q) => ({
    release_id: releaseId,
    canonical_id: q.canonical_id,
    year: q.identity.year,
    stage: q.identity.stage,
    paper: q.identity.paper,
    booklet_series: q.identity.booklet_series || null,
    question_number: q.identity.question_number,
    stem: q.text.stem,
    statements: q.text.statements || null,
    passage: q.text.passage || null,
    options: q.text.options,
    figures: q.text.figures || null,
    instruction_refs: q.text.instruction_refs || null,
    format: q.classification.format,
    topic: q.classification.topic,
    difficulty: q.classification.difficulty || null,
    status: q.status,
    eligibility: q.eligibility,
    content_sha256: sha256String(stableStringify(q.text)),
  }));

  // 4. qbank_keys
  const qbank_keys = questions.map((q) => ({
    release_id: releaseId,
    canonical_id: q.canonical_id,
    authority: q.key.authority,
    key: q.key.key || null,
    accepted_keys: q.key.accepted_keys || null,
    source_ref: q.key.source_ref || null,
    paper_series_join: q.key.paper_series_join || null,
  }));

  // 5. qbank_occurrences
  const qbank_occurrences = occurrences.map((o) => ({
    release_id: releaseId,
    occurrence_id: o.occurrence_id,
    canonical_id: o.canonical_id || null,
    source_document_id: o.evidence.source_document_id,
    identity: o.identity,
    text: o.text,
    key_claim: o.key_claim || null,
    evidence: o.evidence,
  }));

  // 6. qbank_explanations
  const qbank_explanations = questions.map((q) => ({
    release_id: releaseId,
    canonical_id: q.canonical_id,
    provenance: q.explanation.provenance,
    review_state: q.explanation.review_state,
    text: q.explanation.text || null,
    source_refs: q.explanation.source_refs || null,
    display_policy: 'internal_only',
  }));

  // 7. qbank_mains_questions
  const qbank_mains_questions = mains.map((m) => ({
    release_id: releaseId,
    canonical_id: m.canonical_id,
    year: m.identity.year,
    paper: m.identity.paper,
    question_number: m.identity.question_number,
    subpart: m.identity.subpart || null,
    prompt: m.text.prompt,
    case_study: m.text.case_study || null,
    word_limit: m.text.word_limit || null,
    marks_allotted: m.text.marks_allotted,
    section: m.text.section || null,
    status: m.status,
    eligibility: m.eligibility,
    evidence: m.evidence,
  }));

  // 8. qbank_discrepancies
  const discrepancies: any[] = [];
  for (const q of questions) {
    for (const d of q.discrepancies || []) {
      discrepancies.push({
        release_id: releaseId,
        canonical_id: q.canonical_id,
        code: d.code,
        detail: d.detail,
        resolved: d.resolved || false,
        evidence: d.evidence || null,
      });
    }
  }
  const qbank_discrepancies = discrepancies;

  const rowsByTable = {
    qbank_releases,
    qbank_sources,
    qbank_questions,
    qbank_keys,
    qbank_occurrences,
    qbank_explanations,
    qbank_mains_questions,
    qbank_discrepancies,
  };

  const plan: LoadPlan = {
    release_id: releaseId,
    tables: {
      qbank_releases: {
        rows: qbank_releases.length,
        sample_pk: { release_id: releaseId },
      },
      qbank_sources: {
        rows: qbank_sources.length,
        sample_pk: qbank_sources[0]
          ? { release_id: releaseId, document_id: qbank_sources[0].document_id }
          : null,
      },
      qbank_questions: {
        rows: qbank_questions.length,
        sample_pk: qbank_questions[0]
          ? { release_id: releaseId, canonical_id: qbank_questions[0].canonical_id }
          : null,
      },
      qbank_keys: {
        rows: qbank_keys.length,
        sample_pk: qbank_keys[0]
          ? { release_id: releaseId, canonical_id: qbank_keys[0].canonical_id }
          : null,
      },
      qbank_occurrences: {
        rows: qbank_occurrences.length,
        sample_pk: qbank_occurrences[0]
          ? { release_id: releaseId, occurrence_id: qbank_occurrences[0].occurrence_id }
          : null,
      },
      qbank_explanations: {
        rows: qbank_explanations.length,
        sample_pk: qbank_explanations[0]
          ? { release_id: releaseId, canonical_id: qbank_explanations[0].canonical_id }
          : null,
      },
      qbank_mains_questions: {
        rows: qbank_mains_questions.length,
        sample_pk: qbank_mains_questions[0]
          ? { release_id: releaseId, canonical_id: qbank_mains_questions[0].canonical_id }
          : null,
      },
      qbank_discrepancies: {
        rows: qbank_discrepancies.length,
        sample_pk: qbank_discrepancies[0]
          ? {
              release_id: releaseId,
              canonical_id: qbank_discrepancies[0].canonical_id,
              code: qbank_discrepancies[0].code,
              detail: qbank_discrepancies[0].detail,
            }
          : null,
      },
    },
  };

  // Write release-preview/load-plan.json
  const planPath = path.join(releasePreviewDir, 'load-plan.json');
  writeJsonAtomic(planPath, plan);

  return { plan, rowsByTable };
}

export async function runLoad(options: {
  runDir?: string;
  preview?: boolean;
  apply?: boolean;
}): Promise<void> {
  const releaseId = 'final-2026-10';
  if (options.apply) {
    const confirm = process.env.QBANK_APPLY_CONFIRM;
    if (confirm !== releaseId) {
      throw new Error(
        `--apply requires QBANK_APPLY_CONFIRM='${releaseId}', but got '${confirm || ''}'`
      );
    }
  }

  const { plan, rowsByTable } = await planLoad(options);

  if (!options.apply) {
    console.log('Dry run complete. Plan written to release-preview/load-plan.json');
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  // Apply Mode
  const confirm = process.env.QBANK_APPLY_CONFIRM;
  if (confirm !== plan.release_id) {
    throw new Error(
      `--apply requires QBANK_APPLY_CONFIRM='${plan.release_id}', but got '${confirm || ''}'`
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for --apply');
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const tableOrder = [
    'qbank_releases',
    'qbank_sources',
    'qbank_questions',
    'qbank_keys',
    'qbank_occurrences',
    'qbank_explanations',
    'qbank_mains_questions',
    'qbank_discrepancies',
  ];

  for (const table of tableOrder) {
    const rows = rowsByTable[table] || [];
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from(table).upsert(batch);
      if (error) {
        throw new Error(
          `Error upserting into ${table} at batch ${i / BATCH_SIZE + 1}: ${error.message}`
        );
      }
    }
  }

  console.log(`Successfully applied ${plan.release_id} release to database.`);
}

const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('load.ts') || process.argv[1].endsWith('load.js'));

if (isMainModule) {
  const isApply = process.argv.includes('--apply');
  const isPreview = process.argv.includes('--preview') || !isApply;

  runLoad({ preview: isPreview, apply: isApply }).catch((err) => {
    console.error('Load failed:', err.message);
    process.exit(1);
  });
}
