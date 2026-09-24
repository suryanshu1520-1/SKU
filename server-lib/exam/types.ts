/**
 * Exam Hall canonical wire types (TASK_059).
 * PoolItem is server-only (it holds the answer key). The client may only
 * `import type` from this file, and only via src/components/exam/types.ts.
 */

export type OptionKey = 'A' | 'B' | 'C' | 'D';
export const OPTION_KEYS: readonly OptionKey[] = ['A', 'B', 'C', 'D'];

export type ExamSubject = 'Economy' | 'Environment' | 'Geography' | 'History' | 'Polity' | 'General Studies';
export const EXAM_SUBJECTS: readonly ExamSubject[] = ['Economy', 'Environment', 'Geography', 'History', 'Polity', 'General Studies'];

export type ItemFormat = 'single' | 'statements' | 'pairs' | 'howmany' | 'assertion';
export type PaperCode = 'GS1_FULL' | 'GS1_HALF' | 'GS1_SECTION';
export type SectionSubject = 'Mixed' | ExamSubject;
export type RulesPreset = 'exam_day' | 'practice';
export type Series = 'A' | 'B' | 'C' | 'D';
export type Confidence = 'sure' | 'fifty' | 'guess';
export type SubmitMode = 'manual' | 'timeout' | 'recovered';

/** Server-only. Holds the key. Never serialise to a client before submission. */
export interface PoolItem {
  id: string;
  year: number;
  subject: ExamSubject;
  format: ItemFormat;
  stem: string;
  options: [string, string, string, string];
  key: OptionKey;
  explanation: string;
}

/** Sent to the client during a sitting: no key, explanation, year or subject. */
export interface PaperItem {
  qid: string;
  n: number;
  format: ItemFormat;
  stem: string;
  options: [string, string, string, string];
}

export interface PaperSpec {
  code: PaperCode;
  title: string;
  questionCount: number;
  durationSeconds: number;
}

export type SheetEventType =
  | 'visit' | 'circle' | 'uncircle' | 'bubble' | 'erase' | 'double' | 'strike' | 'unstrike' | 'tag' | 'flag';

export interface SheetEvent {
  /** Whole seconds since the attempt started. */
  t: number;
  q: string;
  e: SheetEventType;
  v?: string;
}

export interface AwaySpan {
  from: number;
  to: number;
}

export interface ResponseSheet {
  v: 1;
  rules: RulesPreset;
  bubbles: Record<string, OptionKey[]>;
  circled: Record<string, OptionKey>;
  struck: Record<string, OptionKey[]>;
  confidence: Record<string, Confidence>;
  flagged: Record<string, true>;
  events: SheetEvent[];
  away: AwaySpan[];
  clientUpdatedAt: number;
}

export type Verdict = 'correct' | 'wrong' | 'invalid' | 'blank';

export interface ItemResult {
  qid: string;
  n: number;
  subject: ExamSubject;
  year: number;
  format: ItemFormat;
  key: OptionKey;
  bubbled: OptionKey[];
  circled: OptionKey | null;
  struck: OptionKey[];
  confidence: Confidence | null;
  flagged: boolean;
  verdict: Verdict;
  /** +200 correct, -66 wrong or invalid, 0 blank. */
  marksHundredths: number;
  dwellSeconds: number;
}

export interface LedgerRow {
  attempted: number;
  correct: number;
  /** wrong + invalid */
  wrong: number;
  netHundredths: number;
}

export interface SubjectRow extends LedgerRow {
  total: number;
}

export interface DisciplineStats {
  circledNotBubbled: number;
  circledNotBubbledCorrect: number;
  changedAtTransfer: number;
  changedRightToWrong: number;
  changedWrongToRight: number;
}

export interface PacePoint {
  minute: number;
  bubbled: number;
}

export interface ExamResult {
  attemptId: string;
  paperCode: PaperCode;
  rules: RulesPreset;
  questionCount: number;
  durationSeconds: number;
  startedAt: string;
  submittedAt: string;
  submitMode: SubmitMode;
  correct: number;
  wrong: number;
  invalid: number;
  blank: number;
  grossHundredths: number;
  penaltyHundredths: number;
  netHundredths: number;
  maxHundredths: number;
  bySubject: Record<string, SubjectRow>;
  byConfidence: Record<Confidence | 'untagged', LedgerRow>;
  byStruckCount: Record<'0' | '1' | '2' | '3', LedgerRow>;
  discipline: DisciplineStats;
  pace: PacePoint[];
  timeUsedSeconds: number;
  awaySeconds: number;
  awayCount: number;
  items: ItemResult[];
}

export interface StartRequest {
  paperCode: PaperCode;
  subject?: SectionSubject;
  rules: RulesPreset;
  series: Series;
}

export interface StartResponse {
  attemptId: string;
  paper: PaperSpec & {
    series: Series;
    rules: RulesPreset;
    subject: SectionSubject | null;
    composition: Record<string, number>;
    items: PaperItem[];
  };
  startedAt: string;
  deadlineAt: string;
  serverNow: string;
}

export interface ActiveAttempt extends StartResponse {
  sheet: ResponseSheet | null;
  checkpointAt: string | null;
}

export interface SubmitResponse {
  result: ExamResult;
  /** Post-submission only. Keyed by qid. */
  explanations: Record<string, string>;
  /** The booklet as the candidate saw it, in order (for the review booklet). */
  paper: PaperItem[];
}

export interface ActiveResponse {
  active: ActiveAttempt | null;
  finalized: SubmitResponse | null;
}

export interface AttemptSummary {
  attemptId: string;
  paperCode: PaperCode;
  subject: SectionSubject | null;
  submittedAt: string;
  submitMode: SubmitMode;
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  netHundredths: number;
  maxHundredths: number;
}

export interface CatalogResponse {
  papers: PaperSpec[];
  sectionSubjects: { subject: SectionSubject; available: number }[];
  blueprints: Record<PaperCode, Record<string, number>>;
  poolSize: number;
  yearsCovered: string;
}
