import type { ExamResult, LedgerRow } from '../types';
import { SUBJECT_LABELS } from '../types';
import { formatDuration, formatMarks, hallClockAtMinute } from '../lib/clock';

export const SUBJECT_ORDER = [
  'Economy',
  'Environment',
  'Geography',
  'History',
  'Polity',
  'General Studies',
] as const;

export function perAnswerHundredths(row: LedgerRow): number | null {
  return row.attempted === 0 ? null : Math.round(row.netHundredths / row.attempted);
}

export type VerdictTone = 'good' | 'even' | 'bad' | 'few';

export function ledgerVerdict(row: LedgerRow): { label: string; tone: VerdictTone } {
  if (row.attempted < 5) {
    return { label: 'Too few to judge', tone: 'few' };
  }
  const p = perAnswerHundredths(row);
  if (p !== null && p >= 30) {
    return { label: 'Worth attempting', tone: 'good' };
  }
  if (p !== null && p >= -10) {
    return { label: 'Roughly break-even', tone: 'even' };
  }
  return { label: 'Costing you marks', tone: 'bad' };
}

export function heroInterpretation(r: ExamResult): string {
  if (r.grossHundredths > 0 && r.penaltyHundredths * 100 >= 15 * r.grossHundredths) {
    return `Negative marking took ${formatMarks(r.penaltyHundredths)} marks, ${Math.round(
      (100 * r.penaltyHundredths) / r.grossHundredths
    )}% of what you earned. The risk ledger below shows where.`;
  }

  if (r.blank * 100 >= 30 * r.questionCount) {
    return `You left ${r.blank} questions blank. The risk ledger shows which kinds were worth a try.`;
  }

  const attempted = r.correct + r.wrong + r.invalid;
  const pct = attempted === 0 ? 0 : Math.round((100 * r.correct) / attempted);
  return `${pct}% of your attempted answers were right.`;
}

export function ledgerHeadline(r: ExamResult): string {
  const s = r.byConfidence.sure;
  const f = r.byConfidence.fifty;
  const g = r.byConfidence.guess;
  const pf = perAnswerHundredths(f);
  const pg = perAnswerHundredths(g);

  if (s.attempted + f.attempted + g.attempted === 0) {
    return 'Tag answers Sure, 50:50 or Guess while you write, and this ledger will show which risks pay off for you.';
  }

  if (g.attempted >= 5 && pg !== null && pg < -10) {
    return `Guesses cost you ${formatMarks(-pg)} marks each. Leave pure guesses blank.`;
  }

  if (f.attempted >= 5 && pf !== null && pf >= 30) {
    const extra =
      g.attempted >= 5 && pg !== null && pg >= -10 && pg < 30
        ? ' Pure guesses only broke even.'
        : '';
    return `Your 50:50 calls earned ${formatMarks(pf)} marks each. Keep taking them.${extra}`;
  }

  if (f.attempted >= 5 && pf !== null && pf < -10) {
    return `Your 50:50 calls cost ${formatMarks(-pf)} marks each. Rule out one more option before you attempt.`;
  }

  return 'Your tagged answers roughly broke even. The options-struck table below shows where your odds improve.';
}

export function disciplineLines(r: ExamResult): string[] {
  const lines: string[] = [];
  const k = r.discipline.circledNotBubbled;
  const kc = r.discipline.circledNotBubbledCorrect;
  const net = 200 * kc - 66 * (k - kc);

  if (k === 1 && kc === 1) {
    lines.push(
      '1 answer circled in the booklet never reached your sheet. It was right; bubbling it would have added 2.00 marks.'
    );
  } else if (k === 1 && kc === 0) {
    lines.push(
      '1 answer circled in the booklet never reached your sheet. It was wrong; bubbling it would have cost 0.66 marks, so leaving it blank was right.'
    );
  } else if (k > 1) {
    const verb = kc === 1 ? 'was' : 'were';
    const suffix =
      net > 0
        ? `bubbling them would have added ${formatMarks(net)} marks.`
        : `bubbling them would have cost ${formatMarks(-net)} marks, so leaving them blank was right.`;
    lines.push(
      `${k} answers circled in the booklet never reached your sheet. ${kc} of them ${verb} right; ${suffix}`
    );
  }

  const t = r.discipline.changedAtTransfer;
  if (t > 0) {
    const noun = t === 1 ? 'answer' : 'answers';
    lines.push(
      `${t} ${noun} changed while bubbling: ${r.discipline.changedRightToWrong} right → wrong, ${r.discipline.changedWrongToRight} wrong → right.`
    );
  }

  const i = r.invalid;
  if (i > 0) {
    const noun = i === 1 ? 'row' : 'rows';
    lines.push(`${i} ${noun} double-marked (−${formatMarks(66 * i)}).`);
  }

  const n = r.awayCount;
  if (n > 0) {
    const noun = n === 1 ? 'time' : 'times';
    lines.push(`You left the exam tab ${n} ${noun} (${formatDuration(r.awaySeconds)}).`);
  }

  if (lines.length === 0) {
    return ['Clean sheet: every circled answer made it onto your answer sheet.'];
  }

  return lines;
}

export function paceLines(r: ExamResult): string[] {
  const half = Math.ceil(r.questionCount / 2);
  const evenMinute = Math.ceil(r.durationSeconds / 120);
  const hit = r.pace.find((p) => p.bubbled >= half);
  const last = r.pace[r.pace.length - 1];

  const line1 = hit
    ? `You bubbled half the paper by ${hallClockAtMinute(hit.minute)}; even pace gets there at ${hallClockAtMinute(evenMinute)}.`
    : `You bubbled ${last ? last.bubbled : 0} of ${r.questionCount} answers; even pace reaches half the paper by ${hallClockAtMinute(evenMinute)}.`;

  let line2: string;
  if (r.submitMode === 'manual') {
    const m = Math.round((r.durationSeconds - r.timeUsedSeconds) / 60);
    if (m > 0) {
      const noun = m === 1 ? 'minute' : 'minutes';
      line2 = `You handed in with ${m} ${noun} left.`;
    } else {
      line2 = 'You used the full time.';
    }
  } else {
    line2 = 'You used the full time.';
  }

  return [line1, line2];
}

export function subjectLine(r: ExamResult): string | null {
  const qualified: { subject: string; per: number }[] = [];
  for (const s of SUBJECT_ORDER) {
    const row = r.bySubject[s];
    if (row && row.total >= 5) {
      const per = Math.round(row.netHundredths / row.total);
      qualified.push({ subject: s, per });
    }
  }

  if (qualified.length < 2) return null;

  let strongest = qualified[0];
  let weakest = qualified[0];

  for (let idx = 1; idx < qualified.length; idx++) {
    const item = qualified[idx];
    if (item.per > strongest.per) {
      strongest = item;
    }
    if (item.per < weakest.per) {
      weakest = item;
    }
  }

  const sLabel = SUBJECT_LABELS[strongest.subject] ?? strongest.subject;
  const wLabel = SUBJECT_LABELS[weakest.subject] ?? weakest.subject;

  return `Strongest: ${sLabel} (${formatMarks(strongest.per)} per question). Weakest: ${wLabel} (${formatMarks(weakest.per)} per question).`;
}

export function weakestOfferedSubject(
  r: ExamResult,
  offered: readonly string[]
): string | null {
  const offeredSet = new Set(offered);
  let weakest: { subject: string; per: number } | null = null;

  for (const s of SUBJECT_ORDER) {
    if (!offeredSet.has(s)) continue;
    const row = r.bySubject[s];
    if (row && row.total >= 5) {
      const per = Math.round(row.netHundredths / row.total);
      if (!weakest || per < weakest.per) {
        weakest = { subject: s, per };
      }
    }
  }

  return weakest ? weakest.subject : null;
}
