/**
 * server-lib/policy/lineage.ts
 *
 * Deterministic lineage builder for policy event chains and explicit references.
 * Pure, order-independent, race-free DAG generation.
 * TASK_085J
 */

import { normUnicode } from "../text/normalize.js";

export type Ev = {
  id: string;
  program: string | null;
  ring: 0 | 1 | 2 | 3;
  date: string; /* YYYY-MM-DD */
  createdAt: string;
  text: string;
};

/**
 * Returns the 4-tuple ordering key: [date, ring, createdAt, id].
 */
export function orderKey(e: Ev): [string, number, string, string] {
  return [e.date, e.ring, e.createdAt, e.id];
}

/**
 * Strict lexicographical comparison on [date, ring, createdAt, id].
 */
export function compareEv(a: Ev, b: Ev): number {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;

  if (a.ring < b.ring) return -1;
  if (a.ring > b.ring) return 1;

  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;

  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;

  return 0;
}

/**
 * Determines parent event within each program.
 * Groups events by program (skipping null), sorts each group by compareEv,
 * and sets parent = last earlier event f with f.ring <= e.ring (or null).
 * Deterministic: result is identical for any input permutation.
 */
export function programParents(events: Ev[]): Map<string, string | null> {
  const result = new Map<string, string | null>();

  const byProgram = new Map<string, Ev[]>();
  for (const e of events) {
    if (!e.program) continue;
    let list = byProgram.get(e.program);
    if (!list) {
      list = [];
      byProgram.set(e.program, list);
    }
    list.push(e);
  }

  for (const group of byProgram.values()) {
    const sorted = [...group].sort(compareEv);

    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i];
      let parent: string | null = null;
      for (let j = i - 1; j >= 0; j--) {
        const f = sorted[j];
        if (f.ring <= e.ring) {
          parent = f.id;
          break;
        }
      }
      result.set(e.id, parent);
    }
  }

  return result;
}

/**
 * Discovers explicit cross-program references using an inverted alias index.
 * For event e and program P != e.program, if an alias of P (length >= 6)
 * occurs as a whole-word substring in normUnicode(e.text), adds an edge { src: f.id, dst: e.id }
 * where f is the last event of P with compareEv(f, e) < 0.
 */
export function explicitReferences(
  events: Ev[],
  aliasesByProgram: Map<string, string[]>
): Array<{ src: string; dst: string }> {
  const byProgramSorted = new Map<string, Ev[]>();
  for (const e of events) {
    if (!e.program) continue;
    let list = byProgramSorted.get(e.program);
    if (!list) {
      list = [];
      byProgramSorted.set(e.program, list);
    }
    list.push(e);
  }
  for (const list of byProgramSorted.values()) {
    list.sort(compareEv);
  }

  type AliasEntry = { normAlias: string; programs: string[]; regex: RegExp };
  const aliasEntries: AliasEntry[] = [];
  const programsByNormAlias = new Map<string, Set<string>>();

  for (const [programSlug, aliases] of aliasesByProgram.entries()) {
    for (const a of aliases) {
      const normA = normUnicode(a);
      if (normA.length >= 6) {
        let set = programsByNormAlias.get(normA);
        if (!set) {
          set = new Set<string>();
          programsByNormAlias.set(normA, set);
        }
        set.add(programSlug);
      }
    }
  }

  for (const [normA, progSet] of programsByNormAlias.entries()) {
    const escaped = normA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
    aliasEntries.push({
      normAlias: normA,
      programs: Array.from(progSet),
      regex,
    });
  }

  const edges: Array<{ src: string; dst: string }> = [];

  for (const e of events) {
    if (!e.program || !e.text) continue;
    const normText = normUnicode(e.text);
    if (!normText) continue;

    const referencedPrograms = new Set<string>();

    for (const entry of aliasEntries) {
      if (entry.regex.test(normText)) {
        for (const p of entry.programs) {
          if (p !== e.program) {
            referencedPrograms.add(p);
          }
        }
      }
    }

    for (const p of referencedPrograms) {
      const pEvents = byProgramSorted.get(p);
      if (!pEvents || pEvents.length === 0) continue;

      let f: Ev | null = null;
      for (let i = pEvents.length - 1; i >= 0; i--) {
        if (compareEv(pEvents[i], e) < 0) {
          f = pEvents[i];
          break;
        }
      }

      if (f) {
        edges.push({ src: f.id, dst: e.id });
      }
    }
  }

  return edges;
}

/**
 * Asserts that all edges flow forward in the total order (guarantees a DAG).
 * Throws an error on any backward or cyclic edge.
 */
export function assertAcyclic(
  edges: Array<{ src: string; dst: string }>,
  byId: Map<string, Ev>
): void {
  for (const edge of edges) {
    const srcEv = byId.get(edge.src);
    const dstEv = byId.get(edge.dst);

    if (!srcEv) {
      throw new Error(`Edge references unknown src event: ${edge.src}`);
    }
    if (!dstEv) {
      throw new Error(`Edge references unknown dst event: ${edge.dst}`);
    }

    if (compareEv(srcEv, dstEv) >= 0) {
      throw new Error(
        `Cycle or backward edge detected: event ${edge.src} (${srcEv.date}, r${srcEv.ring}) -> event ${edge.dst} (${dstEv.date}, r${dstEv.ring})`
      );
    }
  }
}
