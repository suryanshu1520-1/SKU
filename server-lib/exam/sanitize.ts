import type { AwaySpan, Confidence, OptionKey, ResponseSheet, RulesPreset, SheetEvent, SheetEventType } from './types.js';

export const MAX_EVENTS = 2000;
export const MAX_AWAY_SPANS = 200;
export const TIME_SLACK_SECONDS = 120;

const VALID_EVENT_TYPES = new Set<string>([
  'visit', 'circle', 'uncircle', 'bubble', 'erase', 'double', 'strike', 'unstrike', 'tag', 'flag',
]);

const VALID_OPTION_KEYS = new Set<string>(['A', 'B', 'C', 'D']);

function isObject(val: unknown): val is Record<string, any> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function emptySheet(rules: RulesPreset): ResponseSheet {
  return {
    v: 1,
    rules,
    bubbles: {},
    circled: {},
    struck: {},
    confidence: {},
    flagged: {},
    events: [],
    away: [],
    clientUpdatedAt: 0,
  };
}

export function sanitizeSheet(
  raw: unknown,
  issuedIds: readonly string[],
  rules: RulesPreset,
  durationSeconds: number
): ResponseSheet {
  if (!isObject(raw)) {
    return emptySheet(rules);
  }

  const issuedSet = new Set(issuedIds);
  const maxTime = durationSeconds + TIME_SLACK_SECONDS;

  // bubbles: raw value must be an array -> keep OPTION_KEYS members, de-duplicate, sort A->D, keep the first 2. Omit the qid if the result is empty.
  const bubbles: Record<string, OptionKey[]> = {};
  if (isObject(raw.bubbles)) {
    for (const qid of Object.keys(raw.bubbles)) {
      if (!issuedSet.has(qid)) continue;
      const val = raw.bubbles[qid];
      if (!Array.isArray(val)) continue;
      const validKeys: OptionKey[] = [];
      for (const k of val) {
        if (typeof k === 'string' && VALID_OPTION_KEYS.has(k) && !validKeys.includes(k as OptionKey)) {
          validKeys.push(k as OptionKey);
        }
      }
      validKeys.sort();
      const firstTwo = validKeys.slice(0, 2);
      if (firstTwo.length > 0) {
        bubbles[qid] = firstTwo;
      }
    }
  }

  // struck: array -> valid keys, de-duplicated, sorted A->D. Omit if empty.
  const struck: Record<string, OptionKey[]> = {};
  if (isObject(raw.struck)) {
    for (const qid of Object.keys(raw.struck)) {
      if (!issuedSet.has(qid)) continue;
      const val = raw.struck[qid];
      if (!Array.isArray(val)) continue;
      const validKeys: OptionKey[] = [];
      for (const k of val) {
        if (typeof k === 'string' && VALID_OPTION_KEYS.has(k) && !validKeys.includes(k as OptionKey)) {
          validKeys.push(k as OptionKey);
        }
      }
      validKeys.sort();
      if (validKeys.length > 0) {
        struck[qid] = validKeys;
      }
    }
  }

  // circled: must be exactly one of 'A' | 'B' | 'C' | 'D'.
  const circled: Record<string, OptionKey> = {};
  if (isObject(raw.circled)) {
    for (const qid of Object.keys(raw.circled)) {
      if (!issuedSet.has(qid)) continue;
      const val = raw.circled[qid];
      if (typeof val === 'string' && VALID_OPTION_KEYS.has(val)) {
        circled[qid] = val as OptionKey;
      }
    }
  }

  // confidence: must be 'sure' | 'fifty' | 'guess'.
  const confidence: Record<string, Confidence> = {};
  if (isObject(raw.confidence)) {
    for (const qid of Object.keys(raw.confidence)) {
      if (!issuedSet.has(qid)) continue;
      const val = raw.confidence[qid];
      if (val === 'sure' || val === 'fifty' || val === 'guess') {
        confidence[qid] = val;
      }
    }
  }

  // flagged: kept only when the value is the boolean true.
  const flagged: Record<string, true> = {};
  if (isObject(raw.flagged)) {
    for (const qid of Object.keys(raw.flagged)) {
      if (!issuedSet.has(qid)) continue;
      const val = raw.flagged[qid];
      if (val === true) {
        flagged[qid] = true;
      }
    }
  }

  // events: keep finite t in [0, maxTime], issued q, SheetEventType, v if string len <= 8. Cap at MAX_EVENTS.
  const filteredEvents: SheetEvent[] = [];
  if (Array.isArray(raw.events)) {
    for (const rawEv of raw.events) {
      if (!isObject(rawEv)) continue;
      const t = rawEv.t;
      if (typeof t !== 'number' || !Number.isFinite(t)) continue;
      const floorT = Math.floor(t);
      if (floorT < 0 || floorT > maxTime) continue;
      const q = rawEv.q;
      if (typeof q !== 'string' || !issuedSet.has(q)) continue;
      const e = rawEv.e;
      if (typeof e !== 'string' || !VALID_EVENT_TYPES.has(e)) continue;

      const ev: SheetEvent = {
        t: floorT,
        q,
        e: e as SheetEventType,
      };
      if (typeof rawEv.v === 'string' && rawEv.v.length <= 8) {
        ev.v = rawEv.v;
      }
      filteredEvents.push(ev);
    }
  }

  let finalEvents: SheetEvent[];
  if (filteredEvents.length <= MAX_EVENTS) {
    finalEvents = filteredEvents;
  } else {
    let excess = filteredEvents.length - MAX_EVENTS;
    const kept: SheetEvent[] = [];
    for (const ev of filteredEvents) {
      if (ev.e === 'visit' && excess > 0) {
        excess--;
      } else {
        kept.push(ev);
      }
    }
    if (kept.length > MAX_EVENTS) {
      finalEvents = kept.slice(-MAX_EVENTS);
    } else {
      finalEvents = kept;
    }
  }

  // away: keep spans with finite from/to, 0 <= from <= to <= maxTime, max MAX_AWAY_SPANS
  const away: AwaySpan[] = [];
  if (Array.isArray(raw.away)) {
    for (const span of raw.away) {
      if (!isObject(span)) continue;
      const from = span.from;
      const to = span.to;
      if (typeof from !== 'number' || !Number.isFinite(from)) continue;
      if (typeof to !== 'number' || !Number.isFinite(to)) continue;
      const floorFrom = Math.floor(from);
      const floorTo = Math.floor(to);
      if (floorFrom < 0 || floorFrom > floorTo || floorTo > maxTime) continue;
      away.push({ from: floorFrom, to: floorTo });
      if (away.length >= MAX_AWAY_SPANS) break;
    }
  }

  // clientUpdatedAt: finite number, else 0. v is always 1.
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
    events: finalEvents,
    away,
    clientUpdatedAt,
  };
}
