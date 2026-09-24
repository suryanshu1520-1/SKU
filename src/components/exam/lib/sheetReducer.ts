import { INK_GRACE_MS, MAX_EVENTS } from '../types.js';
import type {
  Confidence,
  OptionKey,
  ResponseSheet,
  RulesPreset,
  SheetEvent,
} from '../types.js';

export interface SheetState {
  sheet: ResponseSheet;
  /** epoch ms when the row's current single bubble was inked (exam-day grace window) */
  inkAt: Record<string, number>;
  pendingDouble: { qid: string; key: OptionKey } | null;
  awayOpenAt: number | null;
  lastVisit: string | null;
}

export type SheetAction =
  | { type: 'HYDRATE'; sheet: ResponseSheet }
  | { type: 'CHOOSE'; qid: string; key: OptionKey; t: number; now: number }
  | { type: 'BUBBLE'; qid: string; key: OptionKey; t: number; now: number }
  | { type: 'TRANSFER'; qid: string; t: number; now: number }
  | { type: 'CONFIRM_DOUBLE'; t: number; now: number }
  | { type: 'CANCEL_DOUBLE' }
  | { type: 'UNDO'; qid: string; t: number; now: number }
  | { type: 'STRIKE'; qid: string; key: OptionKey; t: number; now: number }
  | { type: 'TAG'; qid: string; confidence: Confidence; t: number; now: number }
  | { type: 'FLAG'; qid: string; t: number; now: number }
  | { type: 'VISIT'; qid: string; t: number; now: number }
  | { type: 'AWAY_START'; t: number; now: number }
  | { type: 'AWAY_END'; t: number; now: number };

export function emptyResponseSheet(rules: RulesPreset): ResponseSheet {
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

export function initSheetState(rules: RulesPreset, sheet?: ResponseSheet | null): SheetState {
  return {
    sheet: sheet ? { ...sheet } : emptyResponseSheet(rules),
    inkAt: {},
    pendingDouble: null,
    awayOpenAt: null,
    lastVisit: null,
  };
}

export function isInGrace(state: SheetState, qid: string, now: number): boolean {
  return state.inkAt[qid] !== undefined && now - state.inkAt[qid] <= INK_GRACE_MS;
}

function appendEvents(events: SheetEvent[], newEvents: SheetEvent[]): SheetEvent[] {
  let list = events.concat(newEvents);
  if (list.length <= MAX_EVENTS) {
    return list;
  }
  let excess = list.length - MAX_EVENTS;
  const kept: SheetEvent[] = [];
  for (const ev of list) {
    if (ev.e === 'visit' && excess > 0) {
      excess--;
    } else {
      kept.push(ev);
    }
  }
  if (kept.length > MAX_EVENTS) {
    return kept.slice(-MAX_EVENTS);
  }
  return kept;
}

export function sheetReducer(state: SheetState, action: SheetAction): SheetState {
  const { sheet } = state;
  const isExamDay = sheet.rules === 'exam_day';

  switch (action.type) {
    case 'HYDRATE':
      return {
        sheet: action.sheet,
        inkAt: {},
        pendingDouble: null,
        awayOpenAt: null,
        lastVisit: null,
      };

    case 'CHOOSE': {
      const { qid, key, t, now } = action;
      // Also removes key from struck[qid] if present
      let newStruck = sheet.struck;
      if (sheet.struck[qid]?.includes(key)) {
        const filtered = sheet.struck[qid].filter((k) => k !== key);
        newStruck = { ...sheet.struck };
        if (filtered.length === 0) {
          delete newStruck[qid];
        } else {
          newStruck[qid] = filtered;
        }
      }

      if (isExamDay) {
        const isAlreadyCircled = sheet.circled[qid] === key;
        const newCircled = { ...sheet.circled };
        let ev: SheetEvent;
        if (isAlreadyCircled) {
          delete newCircled[qid];
          ev = { t, q: qid, e: 'uncircle', v: key };
        } else {
          newCircled[qid] = key;
          ev = { t, q: qid, e: 'circle', v: key };
        }

        return {
          ...state,
          sheet: {
            ...sheet,
            circled: newCircled,
            struck: newStruck,
            events: appendEvents(sheet.events, [ev]),
            clientUpdatedAt: now,
          },
        };
      }

      // Practice mode (P-CHOOSE)
      const b = sheet.bubbles[qid];
      const isExactlyKey = b && b.length === 1 && b[0] === key;
      const newBubbles = { ...sheet.bubbles };
      const newCircled = { ...sheet.circled };
      let ev: SheetEvent;

      if (isExactlyKey) {
        delete newBubbles[qid];
        delete newCircled[qid];
        ev = { t, q: qid, e: 'erase', v: key };
      } else {
        newBubbles[qid] = [key];
        newCircled[qid] = key;
        ev = { t, q: qid, e: 'bubble', v: key };
      }

      return {
        ...state,
        sheet: {
          ...sheet,
          bubbles: newBubbles,
          circled: newCircled,
          struck: newStruck,
          events: appendEvents(sheet.events, [ev]),
          clientUpdatedAt: now,
        },
      };
    }

    case 'BUBBLE': {
      const { qid, key, t, now } = action;
      if (!isExamDay) {
        // P-BUBBLE identical to P-CHOOSE
        return sheetReducer(state, { type: 'CHOOSE', qid, key, t, now });
      }

      // E-BUBBLE
      const b = sheet.bubbles[qid] ?? [];
      if (b.length === 0) {
        const newBubbles = { ...sheet.bubbles, [qid]: [key] };
        const newInkAt = { ...state.inkAt, [qid]: now };
        const ev: SheetEvent = { t, q: qid, e: 'bubble', v: key };
        return {
          ...state,
          inkAt: newInkAt,
          sheet: {
            ...sheet,
            bubbles: newBubbles,
            events: appendEvents(sheet.events, [ev]),
            clientUpdatedAt: now,
          },
        };
      }

      if (b.length === 1 && b[0] === key) {
        return state;
      }

      if (b.length === 1 && b[0] !== key) {
        if (isInGrace(state, qid, now)) {
          // Replace within grace window
          const newBubbles = { ...sheet.bubbles, [qid]: [key] };
          const newInkAt = { ...state.inkAt, [qid]: now };
          const evErase: SheetEvent = { t, q: qid, e: 'erase', v: b[0] };
          const evBubble: SheetEvent = { t, q: qid, e: 'bubble', v: key };
          return {
            ...state,
            inkAt: newInkAt,
            sheet: {
              ...sheet,
              bubbles: newBubbles,
              events: appendEvents(sheet.events, [evErase, evBubble]),
              clientUpdatedAt: now,
            },
          };
        }

        // Outside grace window -> pending double mark
        return {
          ...state,
          pendingDouble: { qid, key },
        };
      }

      // b.length >= 2
      return state;
    }

    case 'TRANSFER': {
      const { qid, t, now } = action;
      if (isExamDay && sheet.circled[qid]) {
        return sheetReducer(state, {
          type: 'BUBBLE',
          qid,
          key: sheet.circled[qid],
          t,
          now,
        });
      }
      return state;
    }

    case 'CONFIRM_DOUBLE': {
      const { t, now } = action;
      if (!state.pendingDouble) {
        return state;
      }
      const { qid, key } = state.pendingDouble;
      const b = sheet.bubbles[qid];
      if (!b || b.length !== 1) {
        return state;
      }

      const newBubblesList: OptionKey[] = [b[0], key].sort();
      const newBubbles = { ...sheet.bubbles, [qid]: newBubblesList };
      const newInkAt = { ...state.inkAt };
      delete newInkAt[qid];
      const ev: SheetEvent = { t, q: qid, e: 'double', v: key };

      return {
        ...state,
        inkAt: newInkAt,
        pendingDouble: null,
        sheet: {
          ...sheet,
          bubbles: newBubbles,
          events: appendEvents(sheet.events, [ev]),
          clientUpdatedAt: now,
        },
      };
    }

    case 'CANCEL_DOUBLE': {
      if (!state.pendingDouble) {
        return state;
      }
      return {
        ...state,
        pendingDouble: null,
      };
    }

    case 'UNDO': {
      const { qid, t, now } = action;
      if (isExamDay) {
        const b = sheet.bubbles[qid];
        if (b && b.length === 1 && isInGrace(state, qid, now)) {
          const newBubbles = { ...sheet.bubbles };
          delete newBubbles[qid];
          const newInkAt = { ...state.inkAt };
          delete newInkAt[qid];
          const ev: SheetEvent = { t, q: qid, e: 'erase', v: b[0] };
          return {
            ...state,
            inkAt: newInkAt,
            sheet: {
              ...sheet,
              bubbles: newBubbles,
              events: appendEvents(sheet.events, [ev]),
              clientUpdatedAt: now,
            },
          };
        }
        return state;
      }

      // Practice mode
      if (sheet.bubbles[qid]) {
        const oldKey = sheet.bubbles[qid][0];
        const newBubbles = { ...sheet.bubbles };
        delete newBubbles[qid];
        const newCircled = { ...sheet.circled };
        delete newCircled[qid];
        const newInkAt = { ...state.inkAt };
        delete newInkAt[qid];
        const ev: SheetEvent = { t, q: qid, e: 'erase', v: oldKey };
        return {
          ...state,
          inkAt: newInkAt,
          sheet: {
            ...sheet,
            bubbles: newBubbles,
            circled: newCircled,
            events: appendEvents(sheet.events, [ev]),
            clientUpdatedAt: now,
          },
        };
      }

      return state;
    }

    case 'STRIKE': {
      const { qid, key, t, now } = action;
      const current = sheet.struck[qid] ?? [];
      const newStruck = { ...sheet.struck };
      let newCircled = sheet.circled;
      let ev: SheetEvent;

      if (current.includes(key)) {
        const next = current.filter((k) => k !== key);
        if (next.length === 0) {
          delete newStruck[qid];
        } else {
          newStruck[qid] = next;
        }
        ev = { t, q: qid, e: 'unstrike', v: key };
      } else {
        newStruck[qid] = [...current, key].sort();
        ev = { t, q: qid, e: 'strike', v: key };
        if (isExamDay && sheet.circled[qid] === key) {
          newCircled = { ...sheet.circled };
          delete newCircled[qid];
        }
      }

      return {
        ...state,
        sheet: {
          ...sheet,
          struck: newStruck,
          circled: newCircled,
          events: appendEvents(sheet.events, [ev]),
          clientUpdatedAt: now,
        },
      };
    }

    case 'TAG': {
      const { qid, confidence, t, now } = action;
      const current = sheet.confidence[qid];
      const newConf = { ...sheet.confidence };
      let ev: SheetEvent;

      if (current === confidence) {
        delete newConf[qid];
        ev = { t, q: qid, e: 'tag', v: 'none' };
      } else {
        newConf[qid] = confidence;
        ev = { t, q: qid, e: 'tag', v: confidence };
      }

      return {
        ...state,
        sheet: {
          ...sheet,
          confidence: newConf,
          events: appendEvents(sheet.events, [ev]),
          clientUpdatedAt: now,
        },
      };
    }

    case 'FLAG': {
      const { qid, t, now } = action;
      const current = sheet.flagged[qid];
      const newFlagged = { ...sheet.flagged };
      let ev: SheetEvent;

      if (current) {
        delete newFlagged[qid];
        ev = { t, q: qid, e: 'flag', v: '0' };
      } else {
        newFlagged[qid] = true;
        ev = { t, q: qid, e: 'flag', v: '1' };
      }

      return {
        ...state,
        sheet: {
          ...sheet,
          flagged: newFlagged,
          events: appendEvents(sheet.events, [ev]),
          clientUpdatedAt: now,
        },
      };
    }

    case 'VISIT': {
      const { qid, t, now } = action;
      if (state.lastVisit === qid) {
        return state;
      }
      const ev: SheetEvent = { t, q: qid, e: 'visit' };
      return {
        ...state,
        lastVisit: qid,
        sheet: {
          ...sheet,
          events: appendEvents(sheet.events, [ev]),
          clientUpdatedAt: now,
        },
      };
    }

    case 'AWAY_START': {
      if (state.awayOpenAt !== null) {
        return state;
      }
      return {
        ...state,
        awayOpenAt: action.t,
      };
    }

    case 'AWAY_END': {
      if (state.awayOpenAt === null || action.t < state.awayOpenAt) {
        return state;
      }
      const span = { from: state.awayOpenAt, to: action.t };
      const newAway = [...sheet.away, span];
      return {
        ...state,
        awayOpenAt: null,
        sheet: {
          ...sheet,
          away: newAway,
          clientUpdatedAt: action.now,
        },
      };
    }

    default:
      return state;
  }
}

export function tallies(sheet: ResponseSheet, qids: readonly string[]): {
  bubbled: number;
  blank: number;
  invalid: number;
  circledOnly: number;
  flagged: number;
  circledOnlyQids: string[];
  flaggedQids: string[];
  invalidQids: string[];
} {
  let bubbled = 0;
  let invalid = 0;
  let circledOnly = 0;
  let flagged = 0;
  const circledOnlyQids: string[] = [];
  const flaggedQids: string[] = [];
  const invalidQids: string[] = [];

  for (const qid of qids) {
    const b = sheet.bubbles[qid];
    const bLen = b ? b.length : 0;
    const isBubbled = bLen >= 1;
    const isInvalid = bLen >= 2;
    const isCircled = Boolean(sheet.circled[qid]);
    const isFlagged = Boolean(sheet.flagged[qid]);

    if (isBubbled) {
      bubbled++;
    }
    if (isInvalid) {
      invalid++;
      invalidQids.push(qid);
    }
    if (isCircled && !isBubbled) {
      circledOnly++;
      circledOnlyQids.push(qid);
    }
    if (isFlagged) {
      flagged++;
      flaggedQids.push(qid);
    }
  }

  return {
    bubbled,
    blank: qids.length - bubbled,
    invalid,
    circledOnly,
    flagged,
    circledOnlyQids,
    flaggedQids,
    invalidQids,
  };
}
