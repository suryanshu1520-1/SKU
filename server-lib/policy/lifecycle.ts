/**
 * server-lib/policy/lifecycle.ts
 *
 * Kaplan-Meier timing estimation and lifecycle gap analysis for policy programs.
 * Pure mathematical functions for empirical survival curves and honest gap sentences.
 * TASK_085L
 */

import type { InstrumentClass, ProgramKind } from "./instruments.js";
import { TEMPLATES } from "./lifecycle-templates.js";

export type Obs = { duration: number; event: boolean }; // event=false => right-censored

export interface KMPoint {
  t: number;
  S: number;
  atRisk: number;
  events: number;
}

export type GapStatus =
  | "complete"
  | "on_track"
  | "longer_than_usual"
  | "no_estimate"
  | "not_applicable";

export interface Gap {
  lastStage: InstrumentClass | null;
  lastDate: string | null;
  nextStage: InstrumentClass | null;
  elapsedDays: number | null;
  nObserved: number;
  medianDays: number | null;
  q25Days: number | null;
  status: GapStatus;
  sentence: string;
}

export interface TransitionStats {
  nObserved: number;
  medianDays: number | null;
  q25Days: number | null;
}

export type TransitionStatsLookup =
  | Map<string, TransitionStats>
  | Record<string, TransitionStats>
  | ((
      kind: ProgramKind,
      from: InstrumentClass,
      to: InstrumentClass
    ) => TransitionStats | null | undefined);

export function transitionKey(kind: string, from: string, to: string): string {
  return `${kind}:${from}->${to}`;
}

export function daysBetween(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  if (isNaN(t1) || isNaN(t2)) return 0;
  return Math.max(0, Math.round((t2 - t1) / (24 * 3600 * 1000)));
}

/**
 * Computes product-limit Kaplan-Meier survival curve S(t) = Prod_{ti <= t} (1 - di / ni).
 * Ties rule: an observation censored at time t is still at risk at time t (events processed before censorings).
 * Output points are only generated at event times where events > 0.
 */
export function kaplanMeier(obs: Obs[]): KMPoint[] {
  if (obs.length === 0) return [];

  // Group observations by duration
  const byDuration = new Map<number, { events: number; censored: number }>();
  for (const o of obs) {
    const entry = byDuration.get(o.duration) || { events: 0, censored: 0 };
    if (o.event) {
      entry.events += 1;
    } else {
      entry.censored += 1;
    }
    byDuration.set(o.duration, entry);
  }

  const distinctDurations = Array.from(byDuration.keys()).sort((a, b) => a - b);
  let atRisk = obs.length;
  let S = 1.0;
  const curve: KMPoint[] = [];

  for (const t of distinctDurations) {
    const { events, censored } = byDuration.get(t)!;
    if (events > 0) {
      S = S * (1 - events / atRisk);
      curve.push({
        t,
        S,
        atRisk,
        events,
      });
    }
    // After time t, individuals with duration t (events and censored) leave the risk set
    atRisk -= events + censored;
  }

  return curve;
}

/**
 * Quantile time: first t with S(t) <= q, else null.
 */
export function quantileTime(
  curve: Array<{ t: number; S: number }>,
  q: number
): number | null {
  for (const pt of curve) {
    if (pt.S <= q) {
      return pt.t;
    }
  }
  return null;
}

export interface ProgramInput {
  program_slug: string;
  kind?: string | null;
  name?: string;
  first_seen_at?: string;
}

export interface EventInput {
  id?: string;
  program_slug: string | null;
  instrument: InstrumentClass;
  event_date: string;
  is_public?: boolean;
}

/**
 * Extracts transition duration samples for programs of `kind` moving from stage `from` to `to`.
 * Transition samples for (from -> to):
 * Programs that reached `from`; duration = days to first `to` event (event: true)
 * or, if none yet, days from `from` to `today` (event: false).
 */
export function transitionSamples(
  programs: ProgramInput[],
  events: EventInput[],
  kind: ProgramKind,
  from: InstrumentClass,
  to: InstrumentClass,
  today: string
): Obs[] {
  const publicEventsByProgram = new Map<string, EventInput[]>();
  for (const ev of events) {
    if (ev.is_public === false || !ev.program_slug) continue;
    const list = publicEventsByProgram.get(ev.program_slug) || [];
    list.push(ev);
    publicEventsByProgram.set(ev.program_slug, list);
  }

  const samples: Obs[] = [];

  for (const prog of programs) {
    if (prog.kind !== kind) continue;
    const progEvents = publicEventsByProgram.get(prog.program_slug) || [];

    const fromEvents = progEvents
      .filter((e) => e.instrument === from)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    if (fromEvents.length === 0) continue; // Program never reached `from`

    const fromDate = fromEvents[0].event_date;

    const toEvents = progEvents
      .filter((e) => e.instrument === to && e.event_date >= fromDate)
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    if (toEvents.length > 0) {
      const duration = daysBetween(fromDate, toEvents[0].event_date);
      samples.push({ duration, event: true });
    } else {
      const duration = daysBetween(fromDate, today);
      samples.push({ duration, event: false });
    }
  }

  return samples;
}

/**
 * Computes transition statistics for all adjacent stages in lifecycle templates.
 */
export function computeAllTransitionStats(
  programs: ProgramInput[],
  events: EventInput[],
  today: string
): Map<string, TransitionStats> {
  const map = new Map<string, TransitionStats>();

  for (const [kind, stages] of Object.entries(TEMPLATES)) {
    for (let i = 0; i < stages.length - 1; i++) {
      const from = stages[i];
      const to = stages[i + 1];
      const obs = transitionSamples(
        programs,
        events,
        kind as ProgramKind,
        from,
        to,
        today
      );
      const nObserved = obs.filter((o) => o.event).length;
      let medianDays: number | null = null;
      let q25Days: number | null = null;

      if (obs.length > 0) {
        const curve = kaplanMeier(obs);
        medianDays = quantileTime(curve, 0.5);
        q25Days = quantileTime(curve, 0.25);
      }

      map.set(transitionKey(kind, from, to), {
        nObserved,
        medianDays,
        q25Days,
      });
    }
  }

  return map;
}

function resolveStats(
  lookup: TransitionStatsLookup | undefined,
  kind: ProgramKind,
  from: InstrumentClass,
  to: InstrumentClass
): TransitionStats | null {
  if (!lookup) return null;
  if (typeof lookup === "function") {
    return lookup(kind, from, to) || null;
  }
  const key = transitionKey(kind, from, to);
  if (lookup instanceof Map) {
    return lookup.get(key) || null;
  }
  return (lookup as Record<string, TransitionStats>)[key] || null;
}

/**
 * Evaluates the lifecycle gap for a single program.
 */
export function programGap(
  program: ProgramInput,
  events: EventInput[],
  stats: TransitionStatsLookup | undefined,
  today: string
): Gap {
  const kind = program.kind as ProgramKind | undefined;
  if (!kind || !(kind in TEMPLATES)) {
    return {
      lastStage: null,
      lastDate: null,
      nextStage: null,
      elapsedDays: null,
      nObserved: 0,
      medianDays: null,
      q25Days: null,
      status: "not_applicable",
      sentence: "Lifecycle tracking not applicable for this program kind.",
    };
  }

  const template = TEMPLATES[kind];
  const publicEvents = events.filter(
    (e) => e.is_public !== false && e.program_slug === program.program_slug
  );

  let furthestIdx = -1;
  let lastStage: InstrumentClass | null = null;
  let lastDate: string | null = null;

  for (let idx = 0; idx < template.length; idx++) {
    const stage = template[idx];
    const matching = publicEvents.filter((e) => e.instrument === stage);
    if (matching.length > 0) {
      furthestIdx = idx;
      lastStage = stage;
      matching.sort((a, b) => b.event_date.localeCompare(a.event_date));
      lastDate = matching[0].event_date;
    }
  }

  // If completed all stages in template
  if (furthestIdx === template.length - 1) {
    return {
      lastStage,
      lastDate,
      nextStage: null,
      elapsedDays: null,
      nObserved: 0,
      medianDays: null,
      q25Days: null,
      status: "complete",
      sentence: "All expected lifecycle stages observed in the sources Tark tracks.",
    };
  }

  // Not completed
  const nextStage = template[furthestIdx + 1];
  const elapsedDays = lastDate ? daysBetween(lastDate, today) : null;

  let nObserved = 0;
  let medianDays: number | null = null;
  let q25Days: number | null = null;

  if (lastStage) {
    const transition = resolveStats(stats, kind, lastStage, nextStage);
    if (transition) {
      nObserved = transition.nObserved;
      medianDays = transition.medianDays;
      q25Days = transition.q25Days;
    }
  }

  let status: GapStatus;
  let sentence: string;

  if (nObserved < 8) {
    status = "no_estimate";
    sentence = `Next stage (${nextStage}) not yet seen in the sources Tark tracks. Not enough history to estimate timing (n = ${nObserved}).`;
  } else if (
    q25Days !== null &&
    elapsedDays !== null &&
    elapsedDays > q25Days
  ) {
    status = "longer_than_usual";
    sentence = `Next stage (${nextStage}) not yet seen in the sources Tark tracks, ${elapsedDays} days on. That is longer than 75% of past cases (n = ${nObserved}).`;
  } else {
    status = "on_track";
    sentence = `Next stage (${nextStage}) not yet seen in the sources Tark tracks. Typically follows in about ${medianDays ?? "N/A"} days (n = ${nObserved}).`;
  }

  return {
    lastStage,
    lastDate,
    nextStage,
    elapsedDays,
    nObserved,
    medianDays,
    q25Days,
    status,
    sentence,
  };
}
