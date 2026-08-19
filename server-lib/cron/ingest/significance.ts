/**
 * server-lib/cron/ingest/significance.ts
 *
 * Tier 3 — Significance scoring (P4 rank & synthesize).
 *
 * Rule-based, zero-cost, zero-latency ranking function that scores each Story
 * from 0 to 100 based on source authority, multi-source corroboration,
 * high-signal UPSC/policy keyword density, and source tier bonuses.
 *
 * Designed to separate high-yield constitutional/statutory/macro announcements
 * from routine bureaucratic notifications.
 */

import { authorityOf } from "./cluster.js";
import type { Story } from "./types.js";

/** High-signal UPSC policy, governance, statutory, and macro indicators. */
export const SIGNAL_KEYWORDS: string[] = [
  "cabinet",
  "supreme court",
  "high court",
  "verdict",
  "judgment",
  "policy",
  "scheme",
  "bill",
  "act",
  "amendment",
  "budget",
  "gdp",
  "rbi",
  "repo",
  "treaty",
  "agreement",
  "mou",
  "launch",
  "approve",
  "ban",
  "sanction",
  "tariff",
  "parliament",
  "ordinance",
  "summit",
  "election commission",
  "constitutional",
  "inflation",
  "cpi",
  "fiscal deficit",
  "monetary policy",
  "foreign direct investment",
  "fdi",
  "isro",
  "drdo",
  "climate",
  "cop",
  "renewable",
  "sovereign",
  "tribunal",
  "gazette",
  "census",
  "niti aayog",
  "discom",
  "defence",
  "defense",
  "missile",
  "satellite",
  "biodiversity",
  "ramsar",
  "wetland",
  "national park",
  "bilateral",
  "multilateral",
  "asean",
  "g20",
  "brics",
  "quad",
  "united nations",
  "unsc",
  "who",
  "imf",
  "world bank",
  "wto",
];

/**
 * Score a Story (0-100 integer) based on:
 *   1. Lead source authority (0-50 pts) — ~50% weight
 *   2. Corroboration boost (0-24 pts) — 6 pts per distinct corroborating outlet, up to 4
 *   3. High-signal keyword density (0-20 pts) — scaled by unique keyword occurrences
 *   4. Source tier bonus (0-6 pts) — primary +6, world +3, wire 0
 *   5. Syllabus relevance penalty: If tags are explicitly passed and empty,
 *      the score is hard-floored (capped at 20) regardless of authority.
 */
export function scoreStory(story: Story, opts?: { tags?: string[] }): number {
  if (!story || !story.lead) return 0;

  const lead = story.lead;

  // 1. Authority base (0 - 50)
  const auth = authorityOf(lead);
  const authorityScore = (Math.min(100, Math.max(0, auth)) / 100) * 50;

  // 2. Corroboration bonus (0 - 24): 6 pts per extra source up to 4 extra sources
  const extraSources = Math.max(0, (story.sources?.length ?? 1) - 1);
  const corroborationScore = Math.min(extraSources, 4) * 6;

  // 3. High-signal keyword density (0 - 20)
  const combinedText = `${lead.headline || ""} ${lead.body || ""}`.toLowerCase();
  let matchedKeywordCount = 0;
  for (const kw of SIGNAL_KEYWORDS) {
    if (combinedText.includes(kw)) {
      matchedKeywordCount++;
    }
  }
  // 5+ distinct keywords maxes out at 20 pts (4 pts per keyword)
  const keywordScore = Math.min(20, matchedKeywordCount * 4);

  // 4. Tier bonus (0 - 6)
  let tierBonus = 0;
  if (lead.tier === "primary") {
    tierBonus = 6;
  } else if (lead.tier === "world") {
    tierBonus = 3;
  }

  let rawTotal = authorityScore + corroborationScore + keywordScore + tierBonus;

  // Hard penalty if tags are explicitly provided and empty (untagged noise/tribute)
  if (opts?.tags !== undefined && opts.tags.length === 0) {
    rawTotal = Math.min(20, rawTotal * 0.35);
  }

  return Math.max(0, Math.min(100, Math.round(rawTotal)));
}

