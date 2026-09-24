import type { ResponseSheet } from '../types';

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Pure helper to choose between local and server response sheet on resume.
 * Returns the one with the larger clientUpdatedAt; ties go to server; null side loses.
 */
export function chooseResumeSheet(
  local: ResponseSheet | null,
  server: ResponseSheet | null
): ResponseSheet | null {
  if (!local && !server) return null;
  if (!local) return server;
  if (!server) return local;
  if ((local.clientUpdatedAt ?? 0) > (server.clientUpdatedAt ?? 0)) {
    return local;
  }
  return server;
}

/**
 * Returns true if the keepalive request body fits within the browser's safe limit (<= 60,000 chars).
 */
export function keepaliveBodyFits(
  attemptId: string,
  sheet: ResponseSheet
): boolean {
  try {
    return JSON.stringify({ attemptId, sheet }).length <= 60000;
  } catch {
    return false;
  }
}

/**
 * Pure helper to safely normalize raw deserialized JSON into a valid ResponseSheet.
 * Returns null if raw is not an object with v === 1.
 */
export function normalizeLocalSheet(raw: unknown): ResponseSheet | null {
  if (!isPlainObject(raw) || raw.v !== 1) {
    return null;
  }

  const rules = raw.rules === 'practice' ? 'practice' : 'exam_day';
  const bubbles = isPlainObject(raw.bubbles) ? (raw.bubbles as ResponseSheet['bubbles']) : {};
  const circled = isPlainObject(raw.circled) ? (raw.circled as ResponseSheet['circled']) : {};
  const struck = isPlainObject(raw.struck) ? (raw.struck as ResponseSheet['struck']) : {};
  const confidence = isPlainObject(raw.confidence)
    ? (raw.confidence as ResponseSheet['confidence'])
    : {};
  const flagged = isPlainObject(raw.flagged) ? (raw.flagged as ResponseSheet['flagged']) : {};
  const events = Array.isArray(raw.events) ? (raw.events as ResponseSheet['events']) : [];
  const away = Array.isArray(raw.away) ? (raw.away as ResponseSheet['away']) : [];
  const clientUpdatedAt =
    typeof raw.clientUpdatedAt === 'number' && Number.isFinite(raw.clientUpdatedAt)
      ? raw.clientUpdatedAt
      : 0;

  return {
    v: 1,
    rules,
    bubbles,
    circled,
    struck,
    confidence,
    flagged,
    events,
    away,
    clientUpdatedAt,
  };
}
