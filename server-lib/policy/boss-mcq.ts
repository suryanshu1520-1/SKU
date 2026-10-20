/**
 * server-lib/policy/boss-mcq.ts
 *
 * Full-Chain Boss MCQ by construction: truth values decided before wording.
 * Pure function with injected PRNG and optional paraphrase. No runtime fallbacks.
 * TASK_085O
 */

import { fnv1a, mulberry32 } from "./prng.ts";
import { extractFacts } from "../cron/ingest/verify.ts";
import { jaroWinkler } from "./resolve.ts";
import type { RegistryRow } from "./tiers.ts";

export interface TrueStmt {
  text: string;
  eventId: string;
  actorSlug: string | null;
  numbers: string[];
  quote: string;
  url: string;
}

export interface StatementDissection {
  n: number;
  is_true: boolean;
  operator: string | null;
  original?: string;
  replaced?: string;
  evidence: { quote: string; url: string };
}

export interface Built {
  stem: string;
  statements: string[];
  truth: boolean[];
  key: "a" | "b" | "c" | "d";
  dissection: StatementDissection[];
}

const BASIS_TRUE: Record<string, string> = {
  constitution_article: "{A} is a constitutional body ({ref}).",
  central_act: "{A} is a statutory body established under the {ref}.",
  state_act: "{A} is a statutory body established under the {ref}.",
  executive_order: "{A} was set up by an executive order of the government, not by an Act.",
  society_registration: "{A} is registered as a society.",
  companies_act_section8: "{A} is a not-for-profit company under Section 8 of the Companies Act, 2013.",
  trust: "{A} is constituted as a trust.",
  companies_act_cpse: "{A} is a public sector company.",
};

const BASIS_FALSE: Record<string, string> = {
  constitution_article: "{A} is a statutory body created by an Act of Parliament.",
  central_act: "{A} is a constitutional body.",
  executive_order: "{A} is a statutory body created by an Act of Parliament.",
  society_registration: "{A} is a statutory body created by an Act of Parliament.",
  companies_act_section8: "{A} is a statutory body created by an Act of Parliament.",
  trust: "{A} is a statutory body created by an Act of Parliament.",
  companies_act_cpse: "{A} is a statutory body created by an Act of Parliament.",
};

interface Slot {
  isRegistry: boolean;
  text: string;
  quote: string;
  url: string;
  registryRow?: RegistryRow;
  originalStmt?: TrueStmt;
}

function formatNumberLike(num: number, originalStr: string): string {
  const hasCommas = originalStr.includes(",");
  const numStr = hasCommas
    ? num.toLocaleString("en-IN") // or standard comma format
    : String(num);
  return numStr;
}

function mutateNumberToken(
  token: string,
  rawVal: number,
  forbiddenNumbers: Set<number | string>
): { original: string; replaced: string } | null {
  if (rawVal <= 0 || isNaN(rawVal)) return null;

  const candidates: number[] = [];
  candidates.push(Math.round(1.5 * rawVal));
  candidates.push(Math.round(0.5 * rawVal));

  const logScale = Math.pow(10, Math.floor(Math.log10(rawVal)));
  candidates.push(rawVal + logScale);
  if (rawVal - logScale > 0) {
    candidates.push(rawVal - logScale);
  }

  const numMatch = token.match(/\d[\d,]*(?:\.\d+)?/);
  if (!numMatch) return null;
  const numPart = numMatch[0];

  for (const c of candidates) {
    if (c === rawVal) continue;
    if (forbiddenNumbers.has(c) || forbiddenNumbers.has(String(c))) continue;

    const formattedNumPart = formatNumberLike(c, numPart);
    const replaced = token.replace(numPart, formattedNumPart);
    return { original: token, replaced };
  }

  return null;
}

export async function buildBossMcq(
  program: { slug: string; name: string },
  trues: TrueStmt[],
  registry: RegistryRow[],
  editionDate: string,
  paraphrase?: (s: string, keep: string[]) => Promise<string>
): Promise<Built | null> {
  // 1. Require >= 2 trues
  if (!trues || trues.length < 2) {
    return null;
  }

  // PRNG deterministically keyed by program slug and edition date
  const seed = fnv1a(`${program.slug}|${editionDate}`);
  const rng = mulberry32(seed);

  // All numbers present in ANY verified claim of the program
  const allProgramNumbers = new Set<number | string>();
  for (const t of trues) {
    for (const num of t.numbers) {
      allProgramNumbers.add(num);
      const parsed = parseFloat(num.replace(/[^\d.]/g, ""));
      if (!isNaN(parsed)) allProgramNumbers.add(parsed);
    }
    const facts = extractFacts(t.text);
    for (const f of facts) {
      allProgramNumbers.add(f);
      const parsed = parseFloat(f.replace(/[^\d.]/g, ""));
      if (!isNaN(parsed)) allProgramNumbers.add(parsed);
    }
  }

  // All authorities that appear in any event of the program
  const programActorSlugs = new Set<string>();
  for (const t of trues) {
    if (t.actorSlug) programActorSlugs.add(t.actorSlug);
  }

  // 2. Registry statement (optional, at most one)
  const registryCandidateRows = registry.filter(
    (r) => r.provenance === "registry" && programActorSlugs.has(r.entity_slug)
  );

  let registrySlot: Slot | null = null;
  if (registryCandidateRows.length > 0) {
    // Ties by slug, first by rng
    registryCandidateRows.sort((a, b) => a.entity_slug.localeCompare(b.entity_slug));
    const chosenIdx = Math.floor(rng() * registryCandidateRows.length);
    const regRow = registryCandidateRows[chosenIdx];

    const basisKind = regRow.legal_basis_kind;
    if (basisKind && BASIS_TRUE[basisKind]) {
      const tmpl = BASIS_TRUE[basisKind];
      const text = tmpl
        .replace("{A}", regRow.authority)
        .replace("{ref}", regRow.legal_basis_ref || "");

      registrySlot = {
        isRegistry: true,
        text,
        quote: regRow.legal_basis_ref || regRow.authority,
        url: regRow.source_url || "",
        registryRow: regRow,
      };
    }
  }

  // 3. Pool of available true event claims
  const availableTrues = [...trues];
  // Shuffle available trues with rng
  for (let i = availableTrues.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [availableTrues[i], availableTrues[j]] = [availableTrues[j], availableTrues[i]];
  }

  const neededEventClaims = registrySlot ? 2 : 3;
  if (availableTrues.length < neededEventClaims) {
    return null;
  }

  const chosenEventTrues = availableTrues.slice(0, neededEventClaims);
  const remainingTrues = availableTrues.slice(neededEventClaims);

  const rawSlots: Slot[] = [];
  if (registrySlot) {
    rawSlots.push(registrySlot);
  }
  for (const et of chosenEventTrues) {
    rawSlots.push({
      isRegistry: false,
      text: et.text,
      quote: et.quote,
      url: et.url,
      originalStmt: et,
    });
  }

  // Shuffle the 3 slots with rng
  for (let i = rawSlots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rawSlots[i], rawSlots[j]] = [rawSlots[j], rawSlots[i]];
  }

  // Decide how many stay true: kTrue in {0, 1, 2, 3}
  const kTrue = Math.floor(rng() * 4);

  const finalStatements: string[] = [];
  const truth: boolean[] = [];
  const dissections: StatementDissection[] = [];

  // Slots 0 .. kTrue - 1 remain TRUE
  for (let idx = 0; idx < kTrue; idx++) {
    const slot = rawSlots[idx];
    finalStatements.push(slot.text);
    truth.push(true);
    dissections.push({
      n: idx + 1,
      is_true: true,
      operator: null,
      evidence: { quote: slot.quote, url: slot.url },
    });
  }

  // Slots kTrue .. 2 must be FALSIFIED
  for (let idx = kTrue; idx < 3; idx++) {
    let slot = rawSlots[idx];
    let falsified = false;

    if (slot.isRegistry) {
      const regRow = slot.registryRow!;
      const kind = regRow.legal_basis_kind;
      if (kind === "state_act") {
        // state_act is not falsifiable per spec: replace slot with another event claim
        if (remainingTrues.length > 0) {
          const replacement = remainingTrues.shift()!;
          slot = {
            isRegistry: false,
            text: replacement.text,
            quote: replacement.quote,
            url: replacement.url,
            originalStmt: replacement,
          };
          rawSlots[idx] = slot;
          // Continues down to event falsification below
        } else {
          return null;
        }
      } else if (kind && BASIS_FALSE[kind]) {
        const falseText = BASIS_FALSE[kind].replace("{A}", regRow.authority);
        finalStatements.push(falseText);
        truth.push(false);
        dissections.push({
          n: idx + 1,
          is_true: false,
          operator: "PSY_03_LEGAL_TIER",
          original: slot.text,
          replaced: falseText,
          evidence: { quote: slot.quote, url: slot.url },
        });
        falsified = true;
      }
    }

    if (!slot.isRegistry) {
      // Event claim falsifiers
      let currentEventSlot: Slot | null = slot;

      while (currentEventSlot && !falsified) {
        const text = currentEventSlot.text;

        // Try 1: PSY_05_SCOPE_MUTATE
        const numRe =
          /(?:₹|rs\.?|inr)?\s?\d[\d,]*(?:\.\d+)?\s?(?:%|per\s?cent|percent|crore|lakh|billion|million|trillion|bn|mn)?/gi;
        let scopeMutated: { original: string; replaced: string } | null = null;

        for (const match of text.matchAll(numRe)) {
          const tok = match[0].trim();
          const parsed = parseFloat(tok.replace(/[^\d.]/g, ""));
          if (!isNaN(parsed) && parsed > 0) {
            const mut = mutateNumberToken(tok, parsed, allProgramNumbers);
            if (mut) {
              scopeMutated = mut;
              break;
            }
          }
        }

        if (scopeMutated) {
          const falseText = text.replace(scopeMutated.original, scopeMutated.replaced);
          finalStatements.push(falseText);
          truth.push(false);
          dissections.push({
            n: idx + 1,
            is_true: false,
            operator: "PSY_05_SCOPE_MUTATE",
            original: scopeMutated.original,
            replaced: scopeMutated.replaced,
            evidence: { quote: currentEventSlot.quote, url: currentEventSlot.url },
          });
          falsified = true;
          break;
        }

        // Try 2: PSY_01_INST_SWAP
        const actorSlug = currentEventSlot.originalStmt?.actorSlug;
        const actorRow = actorSlug
          ? registry.find((r) => r.entity_slug === actorSlug)
          : null;

        if (actorRow && text.includes(actorRow.authority)) {
          // Find siblings: same kind and jurisdiction, excluding program authorities
          const candidateSiblings = registry.filter(
            (r) =>
              r.entity_slug !== actorRow.entity_slug &&
              r.kind === actorRow.kind &&
              r.jurisdiction === actorRow.jurisdiction &&
              !programActorSlugs.has(r.entity_slug)
          );

          if (candidateSiblings.length > 0) {
            candidateSiblings.sort((a, b) => {
              const scoreA =
                jaroWinkler(actorRow.authority, a.authority) +
                (a.parent_entity_slug && a.parent_entity_slug === actorRow.parent_entity_slug ? 0.5 : 0);
              const scoreB =
                jaroWinkler(actorRow.authority, b.authority) +
                (b.parent_entity_slug && b.parent_entity_slug === actorRow.parent_entity_slug ? 0.5 : 0);
              if (scoreB !== scoreA) return scoreB - scoreA;
              return a.entity_slug.localeCompare(b.entity_slug);
            });

            const bestSibling = candidateSiblings[0];
            const falseText = text.replace(actorRow.authority, bestSibling.authority);
            finalStatements.push(falseText);
            truth.push(false);
            dissections.push({
              n: idx + 1,
              is_true: false,
              operator: "PSY_01_INST_SWAP",
              original: actorRow.authority,
              replaced: bestSibling.authority,
              evidence: { quote: currentEventSlot.quote, url: currentEventSlot.url },
            });
            falsified = true;
            break;
          }
        }

        // Neither applied: drop this statement and draw another from remainingTrues
        if (remainingTrues.length > 0) {
          const nextEv = remainingTrues.shift()!;
          currentEventSlot = {
            isRegistry: false,
            text: nextEv.text,
            quote: nextEv.quote,
            url: nextEv.url,
            originalStmt: nextEv,
          };
        } else {
          currentEventSlot = null;
        }
      }

      if (!falsified) {
        return null; // Cannot falsify required slot
      }
    }
  }

  // 5. Optional paraphrase
  if (paraphrase) {
    for (let i = 0; i < finalStatements.length; i++) {
      const origText = finalStatements[i];
      const dis = dissections[i];
      const requiredTokens = extractFacts(origText);
      if (dis.replaced) {
        requiredTokens.push(dis.replaced);
      }

      try {
        const paraphrased = await paraphrase(origText, requiredTokens);
        // Accept only if all required tokens appear verbatim
        const accepted = requiredTokens.every((tok) => paraphrased.includes(tok));
        if (accepted) {
          finalStatements[i] = paraphrased;
        }
      } catch {
        // Keep original wording on paraphrase error
      }
    }
  }

  // 6. Key from count of true statements:
  // 1 -> 'a' "Only one", 2 -> 'b' "Only two", 3 -> 'c' "All three", 0 -> 'd' "None"
  const trueCount = truth.filter(Boolean).length;
  const keyMap: Record<number, "a" | "b" | "c" | "d"> = {
    1: "a",
    2: "b",
    3: "c",
    0: "d",
  };
  const key = keyMap[trueCount] ?? "d";

  const stem = `With reference to the ${program.name}, consider the following statements:`;

  return {
    stem,
    statements: finalStatements,
    truth,
    key,
    dissection: dissections,
  };
}
