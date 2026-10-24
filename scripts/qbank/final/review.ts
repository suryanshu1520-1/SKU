import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execSync, spawnSync } from 'node:child_process';
import { getRunDir, assertRunDirSafe, stableStringify } from './run-dir.js';
import type { QueueItem } from './reconcile.js';

export interface ReviewDecision {
  item_id: string;
  decision: 'accept_candidate' | 'edit' | 'park';
  candidate_index?: number;
  value?: unknown;
  reason?: string;
  reviewer?: string;
  decided_at?: string;
}

export interface ReviewState {
  queue: QueueItem[];
  decisions: ReviewDecision[];
  currentIndex: number;
  runDir: string;
}

export interface ApplyCommandOptions {
  reason?: string;
  editValue?: unknown;
  reviewer?: string;
  clockTime?: string;
}

export interface ApplyCommandResult {
  state: ReviewState;
  decision?: ReviewDecision;
  error?: string;
  quit?: boolean;
}

export function safeId(s: string): string {
  return s.replace(/[^A-Za-z0-9_.-]/g, '_');
}

export function findNextUndecidedIndex(queue: QueueItem[], decisions: ReviewDecision[], fromIndex = 0): number {
  const decidedSet = new Set(decisions.map((d) => d.item_id));
  for (let i = fromIndex; i < queue.length; i++) {
    if (!decidedSet.has(queue[i].item_id)) {
      return i;
    }
  }
  return queue.length;
}

export function validateEditValue(
  item: QueueItem,
  val: unknown,
  reason?: string
): { valid: boolean; error?: string } {
  if (!val || typeof val !== 'object') {
    return { valid: false, error: 'Edited value must be a valid JSON object' };
  }

  const v = val as Record<string, any>;
  const isPrelims = item.canonical_id && item.canonical_id.includes('_Prelims_');
  const isMains = item.canonical_id && item.canonical_id.includes('_Mains_');

  if (isPrelims) {
    if (!v.stem || typeof v.stem !== 'string' || !v.stem.trim()) {
      return { valid: false, error: 'Prelims edit requires non-empty stem' };
    }
    if (!Array.isArray(v.options) || v.options.length !== 4) {
      return { valid: false, error: 'Prelims edit requires exactly 4 options' };
    }
    const keys = new Set(v.options.map((o: any) => (o?.key || '').toLowerCase()));
    for (const expectedKey of ['a', 'b', 'c', 'd']) {
      if (!keys.has(expectedKey)) {
        return { valid: false, error: `Prelims edit missing option key '${expectedKey}'` };
      }
    }
    for (const opt of v.options) {
      if (!opt.text || typeof opt.text !== 'string' || !opt.text.trim()) {
        return { valid: false, error: `Prelims edit option '${opt.key}' text is empty` };
      }
    }
  } else if (isMains) {
    if (!v.prompt || typeof v.prompt !== 'string' || !v.prompt.trim()) {
      return { valid: false, error: 'Mains edit requires non-empty prompt' };
    }
  }

  if (item.gate === 'G_MARKS') {
    if (typeof v.marks_allotted !== 'number' || v.marks_allotted <= 0) {
      return { valid: false, error: 'G_MARKS edit must hold a positive marks_allotted' };
    }
    if (!reason || reason.trim().length < 10) {
      return { valid: false, error: 'G_MARKS edit requires a reason of >= 10 characters' };
    }
  }

  return { valid: true };
}

export function applyCommand(
  state: ReviewState,
  input: string,
  options?: ApplyCommandOptions
): ApplyCommandResult {
  const trimmed = input.trim();
  if (trimmed === 'q') {
    return { state, quit: true };
  }

  if (state.currentIndex >= state.queue.length) {
    return { state, error: 'No more items in queue' };
  }

  const item = state.queue[state.currentIndex];

  if (trimmed === 's') {
    const nextIdx = findNextUndecidedIndex(state.queue, state.decisions, state.currentIndex + 1);
    return {
      state: {
        ...state,
        currentIndex: nextIdx,
      },
    };
  }

  // Gate restrictions for G_SERIES and G_ANSWER_CELL
  if (item.gate === 'G_SERIES' || item.gate === 'G_ANSWER_CELL') {
    if (trimmed !== 'p' && trimmed !== 's' && !trimmed.startsWith('p ')) {
      return {
        state,
        error: `Only park (p) and skip (s) are allowed for ${item.gate}`,
      };
    }
  }

  const now = options?.clockTime || new Date().toISOString();
  const reviewer = options?.reviewer || 'reviewer';

  // 1. Accept candidate (1..n)
  if (/^[1-9]\d*$/.test(trimmed)) {
    const candidateIdx = parseInt(trimmed, 10) - 1;
    const candidates = Array.isArray(item.candidates) ? item.candidates : [];

    if (candidateIdx >= candidates.length) {
      return {
        state,
        error: `Candidate ${trimmed} does not exist. Total candidates: ${candidates.length}`,
      };
    }

    if (item.gate === 'G_MARKS') {
      // In G_MARKS, candidate 0 is primary with null marks. Only candidate 1 (paired reading) can be accepted
      if (candidateIdx === 0 && (!candidates[0]?.value?.marks_allotted || candidates[0]?.value?.marks_allotted <= 0)) {
        return {
          state,
          error: 'Cannot accept primary candidate with null marks for G_MARKS',
        };
      }
    }

    const decision: ReviewDecision = {
      item_id: item.item_id,
      decision: 'accept_candidate',
      candidate_index: candidateIdx,
      reviewer,
      decided_at: now,
    };

    const nextDecisions = [...state.decisions, decision];
    const nextIdx = findNextUndecidedIndex(state.queue, nextDecisions, state.currentIndex + 1);

    return {
      state: {
        ...state,
        decisions: nextDecisions,
        currentIndex: nextIdx,
      },
      decision,
    };
  }

  // 2. Park (p)
  if (trimmed === 'p' || trimmed.startsWith('p ')) {
    const reason = (trimmed.startsWith('p ') ? trimmed.slice(2) : options?.reason || '').trim();
    if (reason.length < 10) {
      return {
        state,
        error: 'Reason must be at least 10 characters',
      };
    }

    const decision: ReviewDecision = {
      item_id: item.item_id,
      decision: 'park',
      reason,
      reviewer,
      decided_at: now,
    };

    const nextDecisions = [...state.decisions, decision];
    const nextIdx = findNextUndecidedIndex(state.queue, nextDecisions, state.currentIndex + 1);

    return {
      state: {
        ...state,
        decisions: nextDecisions,
        currentIndex: nextIdx,
      },
      decision,
    };
  }

  // 3. Edit (e)
  if (trimmed === 'e') {
    const val = options?.editValue;
    const valRes = validateEditValue(item, val, options?.reason);
    if (!valRes.valid) {
      return {
        state,
        error: valRes.error || 'Invalid edit value',
      };
    }

    const decision: ReviewDecision = {
      item_id: item.item_id,
      decision: 'edit',
      value: val,
      reason: options?.reason,
      reviewer,
      decided_at: now,
    };

    const nextDecisions = [...state.decisions, decision];
    const nextIdx = findNextUndecidedIndex(state.queue, nextDecisions, state.currentIndex + 1);

    return {
      state: {
        ...state,
        decisions: nextDecisions,
        currentIndex: nextIdx,
      },
      decision,
    };
  }

  return {
    state,
    error: `Unknown command: '${trimmed}'. Valid commands: 1..n, e, p, o, s, q`,
  };
}

export function computeStats(queue: QueueItem[], decisions: ReviewDecision[]): {
  total: number;
  decided: number;
  remaining: number;
  by_gate: Record<string, { total: number; decided: number }>;
} {
  const decidedSet = new Set(decisions.map((d) => d.item_id));
  const by_gate: Record<string, { total: number; decided: number }> = {};

  for (const item of queue) {
    if (!by_gate[item.gate]) {
      by_gate[item.gate] = { total: 0, decided: 0 };
    }
    by_gate[item.gate].total++;
    if (decidedSet.has(item.item_id)) {
      by_gate[item.gate].decided++;
    }
  }

  const total = queue.length;
  const decided = decisions.length;
  const remaining = total - decided;

  return { total, decided, remaining, by_gate };
}

export function getGitReviewer(): string {
  try {
    const out = execSync('git config user.name', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    if (out.trim()) return out.trim();
  } catch {
    // fallback
  }
  return 'reviewer';
}

export async function runReviewCli(): Promise<void> {
  const rDir = getRunDir();
  assertRunDirSafe(rDir);

  const queuePath = path.join(rDir, 'conflicts', 'queue.jsonl');
  const decisionsPath = path.join(rDir, 'conflicts', 'decisions.jsonl');

  const queue: QueueItem[] = [];
  if (fs.existsSync(queuePath)) {
    const lines = fs.readFileSync(queuePath, 'utf-8').split('\n');
    for (const l of lines) {
      if (l.trim()) queue.push(JSON.parse(l));
    }
  }

  const decisions: ReviewDecision[] = [];
  if (fs.existsSync(decisionsPath)) {
    const lines = fs.readFileSync(decisionsPath, 'utf-8').split('\n');
    for (const l of lines) {
      if (l.trim()) decisions.push(JSON.parse(l));
    }
  }

  // --stats flag check
  if (process.argv.some((a) => a.includes('stats'))) {
    const stats = computeStats(queue, decisions);
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  const reviewer = getGitReviewer();
  let state: ReviewState = {
    queue,
    decisions,
    currentIndex: findNextUndecidedIndex(queue, decisions, 0),
    runDir: rDir,
  };

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

  while (state.currentIndex < state.queue.length) {
    const item = state.queue[state.currentIndex];
    console.log('\n' + '='.repeat(70));
    console.log(`[${state.currentIndex + 1}/${state.queue.length}] ${item.item_id}`);
    console.log(`Gate: ${item.gate} | Reason: ${item.reason_code || 'none'}`);
    console.log(`Detail: ${item.detail}`);

    if (item.evidence && item.evidence.length > 0) {
      const ev = item.evidence[0];
      console.log(`Evidence: doc=${ev.source_document_id}, page=${ev.page}`);
    }
    if (item.crop) {
      console.log(`Crop: ${item.crop}`);
    }

    const candidates = Array.isArray(item.candidates) ? item.candidates : [];
    console.log(`\nCandidates (${candidates.length}):`);
    candidates.forEach((cand: any, idx: number) => {
      const valStr = JSON.stringify(cand.value);
      const truncStr = valStr.length > 600 ? valStr.slice(0, 600) + '...' : valStr;
      console.log(`  [${idx + 1}] (${cand.source}): ${truncStr}`);
    });

    const ans = await promptUser('\nAction (1..n=accept, e=edit, p=park, o=open crop, s=skip, q=quit): ');
    const cmd = ans.trim();

    if (cmd === 'q') {
      console.log('Exiting review.');
      break;
    }

    if (cmd === 'o') {
      if (item.crop) {
        const cropFull = path.join(rDir, item.crop);
        if (process.platform === 'win32') {
          spawnSync('cmd', ['/c', 'start', '""', cropFull]);
        } else {
          spawnSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [cropFull]);
        }
      } else {
        console.log('No crop available for this item.');
      }
      continue;
    }

    let options: ApplyCommandOptions = { reviewer };

    if (cmd === 'p') {
      const reason = await promptUser('Reason for parking (>= 10 chars): ');
      options.reason = reason.trim();
    } else if (cmd === 'e') {
      const editFile = path.join(rDir, 'conflicts', `edit-${safeId(item.item_id)}.json`);
      const defaultVal = candidates[0]?.value || {};
      fs.writeFileSync(editFile, JSON.stringify(defaultVal, null, 2), 'utf-8');

      console.log(`Opening ${editFile} for editing...`);
      try {
        const edRes = spawnSync('code', ['--wait', editFile], { stdio: 'inherit' });
        if (edRes.status !== 0 && process.platform === 'win32') {
          spawnSync('notepad', [editFile], { stdio: 'inherit' });
        }
      } catch {
        if (process.platform === 'win32') {
          spawnSync('notepad', [editFile], { stdio: 'inherit' });
        }
      }

      try {
        const editedContent = fs.readFileSync(editFile, 'utf-8');
        options.editValue = JSON.parse(editedContent);
        if (item.gate === 'G_MARKS') {
          const reason = await promptUser('Reason / evidence source for marks (>= 10 chars): ');
          options.reason = reason.trim();
        }
      } catch (e: any) {
        console.log('Failed to read or parse edited JSON:', e.message);
        continue;
      }
    }

    const res = applyCommand(state, cmd, options);
    if (res.error) {
      console.log(`\nERROR: ${res.error}`);
    } else if (res.decision) {
      // Append decision to decisions.jsonl
      const decLine = stableStringify(res.decision) + '\n';
      fs.appendFileSync(decisionsPath, decLine, 'utf-8');
      state = res.state;
      console.log(`Decision recorded: ${res.decision.decision}`);
    } else {
      state = res.state;
    }
  }

  rl.close();
  console.log('\nReview session concluded.');
}

const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('review.ts') || process.argv[1].endsWith('review.js'));

if (isMainModule) {
  runReviewCli().catch((err) => {
    console.error('Fatal review CLI error:', err);
    process.exit(1);
  });
}
