import { OPTION_KEYS } from './types.js';
import type {
  Confidence,
  DisciplineStats,
  ExamResult,
  ItemResult,
  LedgerRow,
  OptionKey,
  PacePoint,
  PaperCode,
  PoolItem,
  ResponseSheet,
  RulesPreset,
  SubjectRow,
  SubmitMode,
  Verdict,
} from './types.js';

export interface GradeOptions {
  attemptId: string;
  paperCode: PaperCode;
  rules: RulesPreset;
  durationSeconds: number;
  startedAtMs: number;
  submittedAtMs: number;
  submitMode: SubmitMode;
}

export const MARKS_CORRECT = 200; // hundredths
export const MARKS_WRONG = -66; // hundredths, also used for invalid rows

function validKeys(x: unknown): OptionKey[] {
  if (!Array.isArray(x)) return [];
  const validSet = new Set<OptionKey>();
  for (const item of x) {
    if (typeof item === 'string' && (OPTION_KEYS as readonly string[]).includes(item)) {
      validSet.add(item as OptionKey);
    }
  }
  return Array.from(validSet).sort();
}

export function gradeSheet(
  items: readonly PoolItem[],
  sheet: ResponseSheet,
  opts: GradeOptions
): ExamResult {
  const candidateQids = new Set(items.map((it) => it.id));
  const timeUsedSeconds = Math.max(
    0,
    Math.min(opts.durationSeconds, Math.round((opts.submittedAtMs - opts.startedAtMs) / 1000))
  );

  // 1. Process events for dwell time and pace
  const events = Array.isArray(sheet.events) ? sheet.events : [];
  const filteredEvents = events.filter(
    (e) =>
      typeof e?.t === 'number' &&
      Number.isFinite(e.t) &&
      typeof e?.q === 'string' &&
      candidateQids.has(e.q)
  );

  // Stable sort by t
  const sortedEvents = [...filteredEvents].sort((a, b) => a.t - b.t);

  // Compute dwellSeconds per question
  const dwellMap = new Map<string, number>();
  const visitEvents = sortedEvents.filter((e) => e.e === 'visit');
  for (let k = 0; k < visitEvents.length; k++) {
    const v = visitEvents[k];
    const tStart = v.t;
    const tNext = k < visitEvents.length - 1 ? visitEvents[k + 1].t : timeUsedSeconds;
    const clipStart = Math.max(0, Math.min(timeUsedSeconds, tStart));
    const clipEnd = Math.max(0, Math.min(timeUsedSeconds, tNext));
    const duration = Math.max(0, clipEnd - clipStart);
    dwellMap.set(v.q, (dwellMap.get(v.q) ?? 0) + duration);
  }

  // Compute pace
  const pace: PacePoint[] = [];
  const maxMinute = Math.floor(opts.durationSeconds / 60);
  for (let m = 0; m <= maxMinute; m += 5) {
    const cutoffSeconds = m * 60;
    const bubbledSet = new Set<string>();
    for (const ev of sortedEvents) {
      if (ev.t <= cutoffSeconds) {
        if (ev.e === 'bubble' || ev.e === 'double') {
          bubbledSet.add(ev.q);
        } else if (ev.e === 'erase') {
          bubbledSet.delete(ev.q);
        }
      } else {
        break;
      }
    }
    pace.push({ minute: m, bubbled: bubbledSet.size });
  }

  // 2. Score items
  const itemResults: ItemResult[] = [];
  let correct = 0;
  let wrong = 0;
  let invalid = 0;
  let blank = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qid = item.id;
    const bubbled = validKeys(sheet.bubbles?.[qid]);

    let verdict: Verdict = 'blank';
    let marksHundredths = 0;

    if (bubbled.length === 0) {
      verdict = 'blank';
      marksHundredths = 0;
      blank += 1;
    } else if (bubbled.length >= 2) {
      verdict = 'invalid';
      marksHundredths = MARKS_WRONG;
      invalid += 1;
    } else {
      if (bubbled[0] === item.key) {
        verdict = 'correct';
        marksHundredths = MARKS_CORRECT;
        correct += 1;
      } else {
        verdict = 'wrong';
        marksHundredths = MARKS_WRONG;
        wrong += 1;
      }
    }

    const rawCircled = sheet.circled?.[qid];
    const circled =
      typeof rawCircled === 'string' && (OPTION_KEYS as readonly string[]).includes(rawCircled)
        ? (rawCircled as OptionKey)
        : null;

    const struck = validKeys(sheet.struck?.[qid]);

    const rawConfidence = sheet.confidence?.[qid];
    const confidence =
      rawConfidence === 'sure' || rawConfidence === 'fifty' || rawConfidence === 'guess'
        ? (rawConfidence as Confidence)
        : null;

    const flagged = sheet.flagged?.[qid] === true;
    const dwellSeconds = dwellMap.get(qid) ?? 0;

    itemResults.push({
      qid,
      n: i + 1,
      subject: item.subject,
      year: item.year,
      format: item.format,
      key: item.key,
      bubbled,
      circled,
      struck,
      confidence,
      flagged,
      verdict,
      marksHundredths,
      dwellSeconds,
    });
  }

  const grossHundredths = MARKS_CORRECT * correct;
  const penaltyHundredths = 66 * (wrong + invalid);
  const netHundredths = grossHundredths - penaltyHundredths;
  const maxHundredths = MARKS_CORRECT * items.length;
  const questionCount = items.length;

  // 3. bySubject
  const bySubject: Record<string, SubjectRow> = {};
  for (const item of items) {
    if (!bySubject[item.subject]) {
      bySubject[item.subject] = {
        total: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        netHundredths: 0,
      };
    }
    bySubject[item.subject].total += 1;
  }
  for (const res of itemResults) {
    if (res.verdict !== 'blank') {
      bySubject[res.subject].attempted += 1;
      if (res.verdict === 'correct') {
        bySubject[res.subject].correct += 1;
      } else {
        bySubject[res.subject].wrong += 1;
      }
    }
    bySubject[res.subject].netHundredths += res.marksHundredths;
  }

  // 4. byConfidence
  const byConfidence: Record<Confidence | 'untagged', LedgerRow> = {
    sure: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    fifty: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    guess: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    untagged: { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
  };
  for (const res of itemResults) {
    if (res.verdict !== 'blank') {
      const bucket = res.confidence ?? 'untagged';
      byConfidence[bucket].attempted += 1;
      if (res.verdict === 'correct') {
        byConfidence[bucket].correct += 1;
      } else {
        byConfidence[bucket].wrong += 1;
      }
      byConfidence[bucket].netHundredths += res.marksHundredths;
    }
  }

  // 5. byStruckCount
  const byStruckCount: Record<'0' | '1' | '2' | '3', LedgerRow> = {
    '0': { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    '1': { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    '2': { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
    '3': { attempted: 0, correct: 0, wrong: 0, netHundredths: 0 },
  };
  for (const res of itemResults) {
    if (res.verdict !== 'blank') {
      const bucket = String(Math.min(3, res.struck.length)) as '0' | '1' | '2' | '3';
      byStruckCount[bucket].attempted += 1;
      if (res.verdict === 'correct') {
        byStruckCount[bucket].correct += 1;
      } else {
        byStruckCount[bucket].wrong += 1;
      }
      byStruckCount[bucket].netHundredths += res.marksHundredths;
    }
  }

  // 6. discipline
  let circledNotBubbled = 0;
  let circledNotBubbledCorrect = 0;
  let changedAtTransfer = 0;
  let changedRightToWrong = 0;
  let changedWrongToRight = 0;

  for (const res of itemResults) {
    if (res.circled !== null && res.bubbled.length === 0) {
      circledNotBubbled += 1;
      if (res.circled === res.key) {
        circledNotBubbledCorrect += 1;
      }
    }
    if (res.circled !== null && res.bubbled.length === 1 && res.bubbled[0] !== res.circled) {
      changedAtTransfer += 1;
      if (res.circled === res.key) {
        changedRightToWrong += 1;
      }
      if (res.bubbled[0] === res.key) {
        changedWrongToRight += 1;
      }
    }
  }

  const discipline: DisciplineStats = {
    circledNotBubbled,
    circledNotBubbledCorrect,
    changedAtTransfer,
    changedRightToWrong,
    changedWrongToRight,
  };

  // 10. away
  let awaySeconds = 0;
  let awayCount = 0;
  if (Array.isArray(sheet.away)) {
    for (const span of sheet.away) {
      if (
        typeof span?.from === 'number' &&
        Number.isFinite(span.from) &&
        typeof span?.to === 'number' &&
        Number.isFinite(span.to)
      ) {
        const from = Math.max(0, Math.min(opts.durationSeconds, span.from));
        const to = Math.max(0, Math.min(opts.durationSeconds, span.to));
        if (to > from) {
          awaySeconds += to - from;
          awayCount += 1;
        }
      }
    }
  }

  return {
    attemptId: opts.attemptId,
    paperCode: opts.paperCode,
    rules: opts.rules,
    questionCount,
    durationSeconds: opts.durationSeconds,
    startedAt: new Date(opts.startedAtMs).toISOString(),
    submittedAt: new Date(opts.submittedAtMs).toISOString(),
    submitMode: opts.submitMode,
    correct,
    wrong,
    invalid,
    blank,
    grossHundredths,
    penaltyHundredths,
    netHundredths,
    maxHundredths,
    bySubject,
    byConfidence,
    byStruckCount,
    discipline,
    pace,
    timeUsedSeconds,
    awaySeconds,
    awayCount,
    items: itemResults,
  };
}
