export type {
  OptionKey, ExamSubject, ItemFormat, PaperCode, SectionSubject, RulesPreset, Series, Confidence, SubmitMode,
  PaperItem, PaperSpec, SheetEventType, SheetEvent, AwaySpan, ResponseSheet, Verdict, ItemResult, LedgerRow,
  SubjectRow, DisciplineStats, PacePoint, ExamResult, StartRequest, StartResponse, ActiveAttempt, SubmitResponse,
  ActiveResponse, AttemptSummary, CatalogResponse,
} from '../../../server-lib/exam/types';
import type { OptionKey, PaperCode, RulesPreset, SectionSubject } from '../../../server-lib/exam/types';

export const OPTIONS: readonly OptionKey[] = ['A', 'B', 'C', 'D'];
export const SUBJECT_LABELS: Record<string, string> = {
  Economy: 'Economy', Environment: 'Environment', Geography: 'Geography',
  History: 'History & Culture', Polity: 'Polity', 'General Studies': 'General', Mixed: 'Mixed',
};
export const PAPER_SHORT_TITLES: Record<PaperCode, string> = {
  GS1_FULL: 'Full paper', GS1_HALF: 'Half paper', GS1_SECTION: 'Sectional',
};
export const HALL_START_MINUTES = 9 * 60 + 30;
export const INK_GRACE_MS = 5000;
export const CHECKPOINT_INTERVAL_MS = 30000;
export const MAX_EVENTS = 2000;

export type ExamPhase =
  | 'checking' | 'admit' | 'starting' | 'resume' | 'sitting' | 'pens-down' | 'submitting' | 'submit-error' | 'scorecard' | 'load-error';
export type SaveState = 'idle' | 'saving' | 'saved' | 'offline';
export type BookletTheme = 'paper' | 'night';
export interface ExamPrefs { rules: RulesPreset; booklet: BookletTheme; bell: boolean; }
export const DEFAULT_PREFS: ExamPrefs = { rules: 'exam_day', booklet: 'paper', bell: false };
export const PREFS_STORAGE_KEY = 'tark_exam_prefs';
export const sheetStorageKey = (attemptId: string) => `tark_exam_sheet_${attemptId}`;

export type ExamLaunch =
  | { kind: 'new'; paperCode: PaperCode; subject?: SectionSubject }
  | { kind: 'resume' }
  | { kind: 'result'; attemptId: string };
