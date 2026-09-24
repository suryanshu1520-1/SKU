import { DEFAULT_PREFS, PREFS_STORAGE_KEY, sheetStorageKey } from '../types.js';
import type { BookletTheme, ExamPrefs, ResponseSheet, RulesPreset } from '../types.js';

export function loadPrefs(): ExamPrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PREFS;
    const rules: RulesPreset =
      parsed.rules === 'exam_day' || parsed.rules === 'practice'
        ? parsed.rules
        : DEFAULT_PREFS.rules;
    const booklet: BookletTheme =
      parsed.booklet === 'paper' || parsed.booklet === 'night'
        ? parsed.booklet
        : DEFAULT_PREFS.booklet;
    const bell = typeof parsed.bell === 'boolean' ? parsed.bell : DEFAULT_PREFS.bell;
    return { rules, booklet, bell };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ExamPrefs): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Fail silently
  }
}

export function loadLocalSheet(attemptId: string): ResponseSheet | null {
  try {
    const raw = localStorage.getItem(sheetStorageKey(attemptId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      parsed.v === 1 &&
      typeof parsed.bubbles === 'object' &&
      parsed.bubbles !== null
    ) {
      return parsed as ResponseSheet;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLocalSheet(attemptId: string, sheet: ResponseSheet): void {
  try {
    localStorage.setItem(sheetStorageKey(attemptId), JSON.stringify(sheet));
  } catch {
    // Fail silently
  }
}

export function clearLocalSheet(attemptId: string): void {
  try {
    localStorage.removeItem(sheetStorageKey(attemptId));
  } catch {
    // Fail silently
  }
}
