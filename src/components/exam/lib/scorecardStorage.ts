import type { SubmitResponse, PaperCode, SectionSubject } from '../types.js';
import { PAPER_SHORT_TITLES } from '../types.js';

export interface StoredScorecardSummary {
  attemptId: string;
  paperCode: PaperCode;
  subject?: SectionSubject | null;
  paperTitle: string;
  submittedAt: string;
  durationSeconds: number;
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  netHundredths: number;
  maxHundredths: number;
  accuracy: number;
  cpEarned?: number;
  cutoffCleared?: boolean;
}

interface StoredScorecardPayload extends StoredScorecardSummary {
  response: SubmitResponse;
}

const SCORECARDS_STORAGE_KEY = 'tark_saved_scorecards';
const MAX_STORED_SCORECARDS = 30;

/**
 * Persists evaluated scorecard to localStorage for instantaneous offline inspection,
 * candidate dossier reflection, and persistent record preservation.
 */
export function saveScorecardToLocal(response: SubmitResponse): void {
  if (!response?.result?.attemptId) return;
  try {
    const r = response.result;
    const existingRaw = localStorage.getItem(SCORECARDS_STORAGE_KEY);
    let existingList: StoredScorecardPayload[] = [];
    if (existingRaw) {
      try {
        existingList = JSON.parse(existingRaw);
        if (!Array.isArray(existingList)) existingList = [];
      } catch {
        existingList = [];
      }
    }

    const accuracy = r.questionCount > 0 ? Math.round((r.correct / r.questionCount) * 100) : 0;
    const shortTitle = PAPER_SHORT_TITLES[r.paperCode] ?? r.paperCode;
    const paperTitle = `GS-1 ${shortTitle}`;

    const newEntry: StoredScorecardPayload = {
      attemptId: r.attemptId,
      paperCode: r.paperCode,
      subject: (r as any).subject ?? null,
      paperTitle,
      submittedAt: r.submittedAt,
      durationSeconds: r.durationSeconds,
      questionCount: r.questionCount,
      correct: r.correct,
      wrong: r.wrong + r.invalid,
      blank: r.blank,
      netHundredths: r.netHundredths,
      maxHundredths: r.maxHundredths,
      accuracy,
      cpEarned: r.cpEarned,
      cutoffCleared: r.cutoffCleared,
      response,
    };

    const filtered = existingList.filter((item) => item.attemptId !== r.attemptId);
    filtered.unshift(newEntry);

    const trimmed = filtered.slice(0, MAX_STORED_SCORECARDS);
    localStorage.setItem(SCORECARDS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[scorecardStorage] Failed to save scorecard locally:', err);
  }
}

/**
 * Retrieves all stored scorecard summaries sorted chronologically (newest first).
 */
export function getLocalScorecards(): StoredScorecardSummary[] {
  try {
    const raw = localStorage.getItem(SCORECARDS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map(({ response, ...summary }) => summary);
  } catch {
    return [];
  }
}

/**
 * Loads the complete evaluation response for a specific attempt ID.
 */
export function getLocalScorecard(attemptId: string): SubmitResponse | null {
  try {
    const raw = localStorage.getItem(SCORECARDS_STORAGE_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return null;
    const found = list.find((item: any) => item.attemptId === attemptId);
    return found?.response ?? null;
  } catch {
    return null;
  }
}

/**
 * Deletes a stored scorecard from local storage.
 */
export function removeLocalScorecard(attemptId: string): void {
  try {
    const raw = localStorage.getItem(SCORECARDS_STORAGE_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;
    const updated = list.filter((item: any) => item.attemptId !== attemptId);
    localStorage.setItem(SCORECARDS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Fail silently
  }
}
