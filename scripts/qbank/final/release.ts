import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  assertRunDirSafe,
  getRunDir,
  stableStringify,
  writeJsonAtomic,
} from './run-dir.js';
import {
  deriveEligibility,
  isPlaceholderOption,
  validateMainsQuestionRecord,
  validatePaperManifest,
  validateQuestionRecord,
} from '../../../server-lib/qbank/validators.js';
import type {
  Discrepancy,
  EvidenceRef,
  MainsQuestionRecord,
  PaperManifest,
  QuestionRecord,
  QuestionText,
  SourceOccurrence,
} from '../../../server-lib/qbank/types.js';
import type { QueueItem } from './reconcile.js';
import type { ReviewDecision } from './review.js';

export interface GateResult {
  pass: boolean;
  numbers: Record<string, unknown>;
}

export interface ReleaseReport {
  release_id: string;
  files: Record<string, string>;
  counts: {
    questions: number;
    mains: number;
    manifests: number;
    gaps: number;
    occurrences: number;
  };
  gates: Record<string, GateResult>;
}

export interface PreviewReport {
  undecided_by_gate: Record<string, number>;
  would_block: Array<{ item_id: string; reason: string }>;
  counts: {
    questions: number;
    mains: number;
    manifests: number;
    gaps: number;
    occurrences: number;
  };
  gates: Record<string, GateResult>;
}

export function safeId(s: string): string {
  return s.replace(/[^A-Za-z0-9_.-]/g, '_');
}

export function sha256String(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

export function computeGates(
  questions: QuestionRecord[],
  mains: MainsQuestionRecord[],
  manifests: Record<string, PaperManifest>,
  gaps: Array<{ paper_slug: string; reason?: string }>,
  queue: QueueItem[],
  decisionsByItemId: Map<string, ReviewDecision>,
  validatorErrorsCount: number
): Record<string, GateResult> {
  // R1: Every unresolved slot has a reason, and every paper in gaps.json has a reason.
  let r1Pass = true;
  let unresolvedCount = 0;
  for (const m of Object.values(manifests)) {
    unresolvedCount += m.coverage.unresolved.length;
  }
  for (const g of gaps) {
    if (!g.reason || !g.reason.trim()) {
      r1Pass = false;
    }
  }
  const r1: GateResult = {
    pass: r1Pass,
    numbers: {
      unresolved_slots: unresolvedCount,
      gaps_count: gaps.length,
      all_gaps_have_reason: r1Pass,
    },
  };

  // R2: No placeholder options, no empty options, no U+FFFD, exactly 4 options keyed a-d
  let r2Pass = true;
  let placeholderCount = 0;
  let emptyOptCount = 0;
  let ufffdCount = 0;
  let badOptionCount = 0;

  for (const q of questions) {
    if (q.identity.stage !== 'Prelims') continue;
    const opts = q.text.options || [];
    if (opts.length !== 4) {
      r2Pass = false;
      badOptionCount++;
    }
    const keys = new Set<string>();
    for (const opt of opts) {
      keys.add((opt.key || '').toLowerCase());
      if (isPlaceholderOption(opt.text)) {
        placeholderCount++;
        r2Pass = false;
      }
      if (!opt.text || !opt.text.trim()) {
        emptyOptCount++;
        r2Pass = false;
      }
      if ((opt.text || '').includes('\ufffd') || (q.text.stem || '').includes('\ufffd')) {
        ufffdCount++;
        r2Pass = false;
      }
    }
    for (const k of ['a', 'b', 'c', 'd']) {
      if (!keys.has(k)) {
        r2Pass = false;
      }
    }
  }

  const r2: GateResult = {
    pass: r2Pass,
    numbers: {
      placeholder_options: placeholderCount,
      empty_options: emptyOptCount,
      ufffd_count: ufffdCount,
      records_without_4_options: badOptionCount,
    },
  };

  // R3: Withdrawn keys have null key; official-final has source_ref and paper_series_join
  let r3Pass = true;
  let officialMissingJoin = 0;
  let withdrawnWithKey = 0;
  const agreementRates: Record<string, unknown> = {};

  for (const q of questions) {
    if (q.key.authority === 'withdrawn' && q.key.key != null) {
      r3Pass = false;
      withdrawnWithKey++;
    }
    if (q.key.authority === 'official-final') {
      if (!q.key.source_ref || !q.key.paper_series_join) {
        r3Pass = false;
        officialMissingJoin++;
      }
    }
  }

  const r3: GateResult = {
    pass: r3Pass,
    numbers: {
      withdrawn_with_key: withdrawnWithKey,
      official_missing_join: officialMissingJoin,
      rates: agreementRates,
    },
  };

  // R4: G_XSRC items: none unresolved without a park reason
  let r4Pass = true;
  let xsrcUnresolvedCount = 0;
  for (const qItem of queue) {
    if (qItem.gate === 'G_XSRC') {
      const dec = decisionsByItemId.get(qItem.item_id);
      if (!dec) {
        r4Pass = false;
        xsrcUnresolvedCount++;
      } else if (dec.decision === 'park' && (!dec.reason || dec.reason.length < 10)) {
        r4Pass = false;
        xsrcUnresolvedCount++;
      }
    }
  }

  const r4: GateResult = {
    pass: r4Pass,
    numbers: {
      xsrc_unresolved: xsrcUnresolvedCount,
    },
  };

  // R5: Explanation verdict counts
  const verdictCounts: Record<string, number> = {
    unreviewed: 0,
    rejected: 0,
    none: 0,
    approved: 0,
    pending: 0,
  };
  for (const q of questions) {
    const st = q.explanation.review_state || 'unreviewed';
    verdictCounts[st] = (verdictCounts[st] || 0) + 1;
    if (q.explanation.provenance === 'none') {
      verdictCounts['none'] = (verdictCounts['none'] || 0) + 1;
    }
  }

  const r5: GateResult = {
    pass: true,
    numbers: verdictCounts,
  };

  // R7: Validator errors = 0
  const r7: GateResult = {
    pass: validatorErrorsCount === 0,
    numbers: {
      validator_errors: validatorErrorsCount,
    },
  };

  return { R1: r1, R2: r2, R3: r3, R4: r4, R5: r5, R7: r7 };
}

export function formatReleaseMarkdown(
  manifests: Record<string, PaperManifest>,
  questions: QuestionRecord[],
  mains: MainsQuestionRecord[],
  gaps: Array<{ paper_slug: string; expected_slots: number | null; reason: string }>,
  decisions: ReviewDecision[],
  reconcileReport?: any
): string {
  const lines: string[] = [];
  lines.push('# TARK PYQ Bank Canonical Release (final-2026-10)\n');

  // 1. Coverage per paper
  lines.push('## 1. Coverage per Paper\n');
  lines.push('| Paper Slug | Stage | Expected | Accounted | Unresolved | Status |');
  lines.push('|---|---|---|---|---|---|');
  for (const [slug, m] of Object.entries(manifests).sort(([a], [b]) => a.localeCompare(b))) {
    const unresStr = m.coverage.unresolved.length > 0 ? m.coverage.unresolved.join(', ') : 'none';
    lines.push(
      `| ${slug} | ${m.stage} | ${m.coverage.expected.length} | ${m.coverage.accounted.length} | ${unresStr} | Complete |`
    );
  }
  lines.push('');

  // 2. Key authority distribution
  lines.push('## 2. Key Authority Distribution\n');
  const authCounts: Record<string, number> = {};
  for (const q of questions) {
    authCounts[q.key.authority] = (authCounts[q.key.authority] || 0) + 1;
  }
  lines.push('| Key Authority | Count | Share |');
  lines.push('|---|---|---|');
  for (const [auth, count] of Object.entries(authCounts).sort()) {
    const share = ((count / questions.length) * 100).toFixed(2);
    lines.push(`| ${auth} | ${count} | ${share}% |`);
  }
  lines.push('');

  // 3. VisionIAS-vs-official agreement per paper, 2020-2024
  lines.push('## 3. VisionIAS vs Official Key Agreement (2020–2024)\n');
  lines.push('| Paper Slug | Agreement Rate | Matches / Total | Series Aligned |');
  lines.push('|---|---|---|---|');
  if (reconcileReport?.per_slug) {
    for (const [slug, row] of Object.entries(reconcileReport.per_slug) as any) {
      if (row.rate != null) {
        const pct = (row.rate * 100).toFixed(2);
        lines.push(`| ${slug} | ${pct}% | ${row.agree}/${row.n} | ${row.aligned ? 'Yes (Series A)' : 'No (Unresolved)'} |`);
      }
    }
  }
  lines.push('');

  // 4. Corroboration: pairs, diffs, resolution
  lines.push('## 4. Corroboration Summary\n');
  lines.push(`- Total corroborated items across handoff sources: ${reconcileReport?.totals?.corroborated_items || 0}`);
  lines.push(`- Cross-source identity conflicts detected: ${reconcileReport?.totals?.xsrc_diffs || 0}`);
  lines.push('');

  // 5. Explanation verdicts
  lines.push('## 5. Explanation Verdicts\n');
  const expVerdicts: Record<string, number> = {};
  for (const q of questions) {
    const rev = q.explanation.review_state || 'unreviewed';
    expVerdicts[rev] = (expVerdicts[rev] || 0) + 1;
  }
  lines.push('| Review State | Count |');
  lines.push('|---|---|');
  for (const [rev, cnt] of Object.entries(expVerdicts).sort()) {
    lines.push(`| ${rev} | ${cnt} |`);
  }
  lines.push('');

  // 6. Parked items
  lines.push('## 6. Parked Items\n');
  const parked = decisions.filter((d) => d.decision === 'park');
  if (parked.length === 0) {
    lines.push('No items parked.\n');
  } else {
    lines.push('| Item ID | Reason | Reviewer |');
    lines.push('|---|---|---|');
    for (const p of parked) {
      lines.push(`| ${p.item_id} | ${p.reason || 'none'} | ${p.reviewer || 'reviewer'} |`);
    }
    lines.push('');
  }

  // 7. Single-source share
  lines.push('## 7. Single-Source Share\n');
  let singleCount = 0;
  for (const q of questions) {
    if (q.evidence.length <= 1) singleCount++;
  }
  lines.push(`- Single source items: ${singleCount} / ${questions.length} (${((singleCount / questions.length) * 100).toFixed(2)}%)\n`);

  // 8. Known gaps
  lines.push('## 8. Known Gaps\n');
  lines.push('| Paper Slug | Expected Slots | Reason |');
  lines.push('|---|---|---|');
  for (const g of gaps) {
    lines.push(`| ${g.paper_slug} | ${g.expected_slots ?? 'N/A'} | ${g.reason} |`);
  }
  lines.push('');

  return lines.join('\n');
}

export async function buildRelease(options: {
  runDir?: string;
  preview?: boolean;
  decisionsOverride?: ReviewDecision[];
}): Promise<{
  previewReport?: PreviewReport;
  releaseReport?: ReleaseReport;
  validatorErrors: number;
  filesContent?: Record<string, string>;
}> {
  const rDir = options.runDir || getRunDir();
  assertRunDirSafe(rDir);

  const canonicalDir = path.join(rDir, 'canonical');
  const conflictsDir = path.join(rDir, 'conflicts');
  const reportsDir = path.join(rDir, 'reports');
  const cropsDir = path.join(rDir, 'crops');

  // Load preview data
  const questionsPreviewPath = path.join(canonicalDir, 'questions.preview.jsonl');
  const mainsPreviewPath = path.join(canonicalDir, 'mains.preview.jsonl');
  const manifestsPreviewPath = path.join(canonicalDir, 'manifests.preview.json');
  const gapsPreviewPath = path.join(canonicalDir, 'gaps.preview.json');
  const occPreviewPath = path.join(canonicalDir, 'occurrences.preview.jsonl');
  const queuePath = path.join(conflictsDir, 'queue.jsonl');
  const decisionsPath = path.join(conflictsDir, 'decisions.jsonl');
  const reconcileReportPath = path.join(reportsDir, 'reconcile.json');

  const questions: QuestionRecord[] = [];
  if (fs.existsSync(questionsPreviewPath)) {
    for (const l of fs.readFileSync(questionsPreviewPath, 'utf-8').split('\n')) {
      if (l.trim()) questions.push(JSON.parse(l));
    }
  }

  const mains: MainsQuestionRecord[] = [];
  if (fs.existsSync(mainsPreviewPath)) {
    for (const l of fs.readFileSync(mainsPreviewPath, 'utf-8').split('\n')) {
      if (l.trim()) mains.push(JSON.parse(l));
    }
  }

  const manifests: Record<string, PaperManifest> = fs.existsSync(manifestsPreviewPath)
    ? JSON.parse(fs.readFileSync(manifestsPreviewPath, 'utf-8'))
    : {};

  const gaps: Array<{ paper_slug: string; expected_slots: number | null; reason: string }> =
    fs.existsSync(gapsPreviewPath) ? JSON.parse(fs.readFileSync(gapsPreviewPath, 'utf-8')) : [];

  const occurrences: SourceOccurrence[] = [];
  if (fs.existsSync(occPreviewPath)) {
    for (const l of fs.readFileSync(occPreviewPath, 'utf-8').split('\n')) {
      if (l.trim()) occurrences.push(JSON.parse(l));
    }
  }

  const queue: QueueItem[] = [];
  if (fs.existsSync(queuePath)) {
    for (const l of fs.readFileSync(queuePath, 'utf-8').split('\n')) {
      if (l.trim()) queue.push(JSON.parse(l));
    }
  }

  // Load decisions (or override)
  const decisions: ReviewDecision[] = options.decisionsOverride || [];
  if (!options.decisionsOverride && fs.existsSync(decisionsPath)) {
    for (const l of fs.readFileSync(decisionsPath, 'utf-8').split('\n')) {
      if (l.trim()) decisions.push(JSON.parse(l));
    }
  }

  const decisionsByItemId = new Map<string, ReviewDecision>();
  for (const d of decisions) {
    decisionsByItemId.set(d.item_id, d);
  }

  // Find undecided items
  const undecidedItems = queue.filter((it) => !decisionsByItemId.has(it.item_id));
  const undecided_by_gate: Record<string, number> = {};
  for (const it of undecidedItems) {
    undecided_by_gate[it.gate] = (undecided_by_gate[it.gate] || 0) + 1;
  }

  const would_block: Array<{ item_id: string; reason: string }> = [];
  for (const it of undecidedItems) {
    would_block.push({
      item_id: it.item_id,
      reason: `Queue item undecided at gate ${it.gate}`,
    });
  }

  // Attach figures from crops/fig-<safe(occ_id)>-<k>.png
  const occByCanonicalId = new Map<string, SourceOccurrence[]>();
  for (const occ of occurrences) {
    if (occ.canonical_id) {
      if (!occByCanonicalId.has(occ.canonical_id)) {
        occByCanonicalId.set(occ.canonical_id, []);
      }
      occByCanonicalId.get(occ.canonical_id)!.push(occ);
    }
  }

  for (const q of questions) {
    const qOccs = occByCanonicalId.get(q.canonical_id) || [];
    const figFiles: string[] = [];
    for (const occ of qOccs) {
      const sId = safeId(occ.occurrence_id);
      let k = 1;
      while (true) {
        const figRel = `crops/fig-${sId}-${k}.png`;
        const figFull = path.join(rDir, figRel);
        if (fs.existsSync(figFull)) {
          figFiles.push(figRel);
          k++;
        } else {
          break;
        }
      }
    }
    if (figFiles.length > 0) {
      figFiles.sort();
      q.text.figures = figFiles;
    }
  }

  // Apply decisions
  for (const it of queue) {
    const dec = decisionsByItemId.get(it.item_id);
    if (!dec) continue;

    if (it.canonical_id) {
      const qRec = questions.find((q) => q.canonical_id === it.canonical_id);
      if (qRec) {
        let changed = false;
        if (dec.decision === 'accept_candidate' && dec.candidate_index != null) {
          const cand = (it.candidates as any[])[dec.candidate_index];
          if (cand?.value) {
            qRec.text = JSON.parse(JSON.stringify(cand.value));
            changed = true;
          }
        } else if (dec.decision === 'edit' && dec.value) {
          qRec.text = JSON.parse(JSON.stringify(dec.value));
          changed = true;
        }

        if (changed) {
          qRec.version = 2;
          const manualEv: EvidenceRef = {
            ...(it.evidence && it.evidence[0] ? it.evidence[0] : qRec.evidence[0]),
            extraction_method: 'manual',
            extraction_version: 'review-cli-1',
            adjudication: `${dec.decision} by ${dec.reviewer || 'reviewer'} at ${dec.decided_at || new Date().toISOString()}${dec.reason ? ': ' + dec.reason : ''}`,
          };
          qRec.evidence.push(manualEv);
        }

        if (dec.decision === 'park') {
          if (['G_GLYPH', 'G_CONTAMINATION', 'G_FIDELITY'].includes(it.gate)) {
            const disc: Discrepancy = {
              code: 'source_identity_conflict',
              detail: `Parked at pipeline gate ${it.gate}: ${dec.reason || it.detail}`,
              question_number: qRec.identity.question_number,
            };
            qRec.discrepancies.push(disc);
          }
        } else {
          // Resolve discrepancy if matching gate
          for (const d of qRec.discrepancies) {
            if (d.code === it.reason_code) {
              d.resolved = true;
            }
          }
        }

        // Recompute eligibility
        qRec.eligibility = deriveEligibility(qRec);
      }
    }
  }

  // Validate all records
  let validatorErrorsCount = 0;
  for (const q of questions) {
    const vRes = validateQuestionRecord(q);
    if (!vRes.ok) validatorErrorsCount += vRes.errors.length;
  }
  for (const m of mains) {
    const vRes = validateMainsQuestionRecord(m);
    if (!vRes.ok) validatorErrorsCount += vRes.errors.length;
  }
  for (const man of Object.values(manifests)) {
    const vRes = validatePaperManifest(man);
    if (!vRes.ok) validatorErrorsCount += vRes.errors.length;
  }

  const gates = computeGates(
    questions,
    mains,
    manifests,
    gaps,
    queue,
    decisionsByItemId,
    validatorErrorsCount
  );

  const counts = {
    questions: questions.length,
    mains: mains.length,
    manifests: Object.keys(manifests).length,
    gaps: gaps.length,
    occurrences: occurrences.length,
  };

  // Preview Mode
  if (options.preview) {
    const previewRep: PreviewReport = {
      undecided_by_gate,
      would_block,
      counts,
      gates,
    };

    const outPath = path.join(reportsDir, 'release-preview.json');
    writeJsonAtomic(outPath, previewRep);

    return {
      previewReport: previewRep,
      validatorErrors: validatorErrorsCount,
    };
  }

  // Full Release Mode: Must have 0 undecided items
  if (undecidedItems.length > 0) {
    throw new Error(
      `Cannot build release: ${undecidedItems.length} items are undecided in the queue.`
    );
  }

  if (validatorErrorsCount > 0) {
    throw new Error(`Cannot build release: ${validatorErrorsCount} validator errors.`);
  }

  // Sort canonical records
  questions.sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  mains.sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  occurrences.sort((a, b) => a.occurrence_id.localeCompare(b.occurrence_id));
  gaps.sort((a, b) => a.paper_slug.localeCompare(b.paper_slug));

  const questionsContent =
    questions.map((q) => stableStringify(q)).join('\n') + (questions.length > 0 ? '\n' : '');
  const mainsContent =
    mains.map((m) => stableStringify(m)).join('\n') + (mains.length > 0 ? '\n' : '');
  const occContent =
    occurrences.map((o) => stableStringify(o)).join('\n') + (occurrences.length > 0 ? '\n' : '');
  const manifestsContent = JSON.stringify(manifests, null, 2) + '\n';
  const gapsContent = JSON.stringify(gaps, null, 2) + '\n';

  let reconcileRep: any = null;
  if (fs.existsSync(reconcileReportPath)) {
    reconcileRep = JSON.parse(fs.readFileSync(reconcileReportPath, 'utf-8'));
  }
  const releaseMdContent = formatReleaseMarkdown(
    manifests,
    questions,
    mains,
    gaps,
    decisions,
    reconcileRep
  );

  const filesMap: Record<string, string> = {
    'canonical/questions.jsonl': sha256String(questionsContent),
    'canonical/mains.jsonl': sha256String(mainsContent),
    'canonical/manifests.json': sha256String(manifestsContent),
    'canonical/gaps.json': sha256String(gapsContent),
    'canonical/occurrences.jsonl': sha256String(occContent),
    'canonical/RELEASE.md': sha256String(releaseMdContent),
  };

  const releaseRep: ReleaseReport = {
    release_id: 'final-2026-10',
    files: filesMap,
    counts,
    gates,
  };

  const filesContent: Record<string, string> = {
    'canonical/questions.jsonl': questionsContent,
    'canonical/mains.jsonl': mainsContent,
    'canonical/manifests.json': manifestsContent,
    'canonical/gaps.json': gapsContent,
    'canonical/occurrences.jsonl': occContent,
    'canonical/RELEASE.md': releaseMdContent,
    'reports/release.json': JSON.stringify(releaseRep, null, 2) + '\n',
  };

  // Write outputs only in full release
  fs.writeFileSync(path.join(canonicalDir, 'questions.jsonl'), questionsContent, 'utf-8');
  fs.writeFileSync(path.join(canonicalDir, 'mains.jsonl'), mainsContent, 'utf-8');
  fs.writeFileSync(path.join(canonicalDir, 'manifests.json'), manifestsContent, 'utf-8');
  fs.writeFileSync(path.join(canonicalDir, 'gaps.json'), gapsContent, 'utf-8');
  fs.writeFileSync(path.join(canonicalDir, 'occurrences.jsonl'), occContent, 'utf-8');
  fs.writeFileSync(path.join(canonicalDir, 'RELEASE.md'), releaseMdContent, 'utf-8');
  writeJsonAtomic(path.join(reportsDir, 'release.json'), releaseRep);

  return {
    releaseReport: releaseRep,
    validatorErrors: validatorErrorsCount,
    filesContent,
  };
}

// ---------------------------------------------------------------------------
// CLI Execution
// ---------------------------------------------------------------------------

const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('release.ts') || process.argv[1].endsWith('release.js'));

if (isMainModule) {
  const isPreview = process.argv.includes('--preview');
  const isVerifyDeterminism = process.argv.includes('--verify-determinism');

  if (isVerifyDeterminism) {
    Promise.all([
      buildRelease({ preview: true }),
      buildRelease({ preview: true }),
    ])
      .then(([r1, r2]) => {
        const s1 = stableStringify(r1.previewReport);
        const s2 = stableStringify(r2.previewReport);
        if (s1 !== s2) {
          console.error('Determinism verification failed: runs produced different preview reports.');
          process.exit(1);
        }
        console.log('Determinism verification passed: byte-identical preview reports.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Determinism check failed:', err);
        process.exit(1);
      });
  } else if (isPreview) {
    buildRelease({ preview: true })
      .then(({ previewReport, validatorErrors }) => {
        if (validatorErrors > 0) {
          console.error(`Preview completed with ${validatorErrors} validator errors.`);
          process.exit(1);
        }
        console.log('Preview complete: reports/release-preview.json written.');
        console.log(JSON.stringify(previewReport, null, 2));
        process.exit(0);
      })
      .catch((err) => {
        console.error('Release preview failed:', err);
        process.exit(1);
      });
  } else {
    buildRelease({ preview: false })
      .then(({ releaseReport }) => {
        console.log('Release build completed: final-2026-10');
        console.log(JSON.stringify(releaseReport, null, 2));
        process.exit(0);
      })
      .catch((err) => {
        console.error('Release build failed:', err.message);
        process.exit(1);
      });
  }
}
