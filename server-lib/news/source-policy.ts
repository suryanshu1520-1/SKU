/**
 * server-lib/news/source-policy.ts
 *
 * Source Policy and Admission Registry (Phase 0 / Phase 1 baseline).
 *
 * Enforces editorial roles, rights review boundaries, approved hostnames,
 * and rollout lanes across all ingestion and reader entry points.
 *
 * Core architectural principle:
 * Official records are authoritative for what the issuing body published/decided;
 * they are NOT universal truth for adversary claims. Independent reporting is
 * complementary. Scope (india | international | cross_border) is orthogonal to
 * publisher location.
 */

export type EditorialRole =
  | "official_record"
  | "institutional_news"
  | "independent_reporting"
  | "commentary"
  | "discovery";

export type CoverageScope = "india" | "international" | "cross_border" | "unclassified";

export type SourceRolloutLane = "shadow" | "review_pilot" | "public";

export type RightsStatus =
  | "admitted"
  | "conditional"
  | "restricted"
  | "discovery_only";

export interface SourceProfile {
  id: string;
  label: string;
  role: EditorialRole;
  scope: CoverageScope;
  jurisdiction: string;
  topicCompetence: string[];
  lang: "en" | "hi";
  enabled: boolean;
  rolloutLane: SourceRolloutLane;
  approvedHosts: string[];
  rightsReview: {
    status: RightsStatus;
    reviewDate: string;
    reviewNote: string;
    termsUrl?: string;
  };
  cadence: {
    maxItemsPerRun: number;
    pollIntervalHours: number;
  };
}

export const SOURCE_PROFILES: Record<string, SourceProfile> = {
  PIB: {
    id: "PIB",
    label: "Press Information Bureau",
    role: "official_record",
    scope: "india",
    jurisdiction: "Union of India",
    topicCompetence: ["Executive Policy", "Cabinet Decisions", "Ministry Schemes"],
    lang: "hi",
    enabled: true,
    rolloutLane: "public",
    approvedHosts: ["pib.gov.in"],
    rightsReview: {
      status: "admitted",
      reviewDate: "2026-10-29",
      reviewNote: "Official Government of India press release portal; open public dissemination.",
      termsUrl: "https://pib.gov.in",
    },
    cadence: {
      maxItemsPerRun: 12,
      pollIntervalHours: 4,
    },
  },
  RBI: {
    id: "RBI",
    label: "Reserve Bank of India",
    role: "official_record",
    scope: "india",
    jurisdiction: "Reserve Bank of India",
    topicCompetence: ["Monetary Policy", "Banking Regulation", "Financial Stability"],
    lang: "en",
    enabled: true,
    rolloutLane: "public",
    approvedHosts: ["rbi.org.in", "www.rbi.org.in"],
    rightsReview: {
      status: "admitted",
      reviewDate: "2026-10-29",
      reviewNote: "Central bank official press releases and regulatory circulars.",
      termsUrl: "https://rbi.org.in",
    },
    cadence: {
      maxItemsPerRun: 8,
      pollIntervalHours: 6,
    },
  },
  PRS: {
    id: "PRS",
    label: "PRS Legislative Research",
    role: "institutional_news",
    scope: "india",
    jurisdiction: "Parliament of India / States",
    topicCompetence: ["Bills", "Acts", "Parliamentary Committees", "Legislative Analysis"],
    lang: "en",
    enabled: true,
    rolloutLane: "public",
    approvedHosts: ["prsindia.org", "www.prsindia.org"],
    rightsReview: {
      status: "admitted",
      reviewDate: "2026-10-29",
      reviewNote: "Public interest research tracking legislative business.",
      termsUrl: "https://prsindia.org",
    },
    cadence: {
      maxItemsPerRun: 8,
      pollIntervalHours: 8,
    },
  },
  MEA: {
    id: "MEA",
    label: "Ministry of External Affairs",
    role: "official_record",
    scope: "cross_border",
    jurisdiction: "Union of India (External Relations)",
    topicCompetence: ["Bilateral Treaties", "Diplomatic Briefings", "State Visits", "Official Statements"],
    lang: "en",
    enabled: false, // Priority adapter — enabled via review pilot once live fixture verified
    rolloutLane: "review_pilot",
    approvedHosts: ["mea.gov.in", "www.mea.gov.in"],
    rightsReview: {
      status: "admitted",
      reviewDate: "2026-10-29",
      reviewNote: "Official Government of India diplomatic record. Requires verified runner fetch policy.",
      termsUrl: "https://www.mea.gov.in/rss-feeds.htm",
    },
    cadence: {
      maxItemsPerRun: 8,
      pollIntervalHours: 6,
    },
  },
  WTO: {
    id: "WTO",
    label: "World Trade Organization",
    role: "institutional_news",
    scope: "international",
    jurisdiction: "World Trade Organization (Multilateral)",
    topicCompetence: ["Trade Disputes", "Tariffs", "Ministerial Declarations", "Dispute Settlement"],
    lang: "en",
    enabled: false, // Priority candidate — enabled via review pilot once fixture verified
    rolloutLane: "review_pilot",
    approvedHosts: ["wto.org", "www.wto.org"],
    rightsReview: {
      status: "admitted",
      reviewDate: "2026-10-29",
      reviewNote: "Official feed gateway permits dissemination with attribution. Prefer HTTPS.",
      termsUrl: "https://www.wto.org/english/res_e/webcas_e/rss_e.htm",
    },
    cadence: {
      maxItemsPerRun: 6,
      pollIntervalHours: 8,
    },
  },
  WIKIPEDIA: {
    id: "WIKIPEDIA",
    label: "Wikipedia Current Events",
    role: "discovery",
    scope: "international",
    jurisdiction: "Global (Crowdsourced)",
    topicCompetence: ["Global Discovery Pointers"],
    lang: "en",
    enabled: false, // Disabled: discovery pointer only; never bypasses enabled status
    rolloutLane: "shadow",
    approvedHosts: ["en.wikipedia.org", "wikipedia.org"],
    rightsReview: {
      status: "discovery_only",
      reviewDate: "2026-10-29",
      reviewNote: "Discovery pointer only. Never publish Wikipedia text as third-party evidence.",
    },
    cadence: {
      maxItemsPerRun: 0,
      pollIntervalHours: 24,
    },
  },
  "UN NEWS": {
    id: "UN NEWS",
    label: "UN News",
    role: "institutional_news",
    scope: "international",
    jurisdiction: "United Nations (Multilateral)",
    topicCompetence: ["Security Council", "General Assembly", "Humanitarian Agencies"],
    lang: "en",
    enabled: false, // Disabled pending specific permissions review
    rolloutLane: "shadow",
    approvedHosts: ["news.un.org", "un.org"],
    rightsReview: {
      status: "conditional",
      reviewDate: "2026-10-29",
      reviewNote: "General UN website terms are restrictive; requires explicit reuse permission verification.",
      termsUrl: "https://www.un.org/en/about-us/terms-of-use",
    },
    cadence: {
      maxItemsPerRun: 0,
      pollIntervalHours: 24,
    },
  },
  "INDIAN EXPRESS": {
    id: "INDIAN EXPRESS",
    label: "Indian Express Explained",
    role: "independent_reporting",
    scope: "india",
    jurisdiction: "India",
    topicCompetence: ["Policy Analysis", "Constitutional Explanations", "Economy"],
    lang: "en",
    enabled: true,
    rolloutLane: "public",
    approvedHosts: ["indianexpress.com", "www.indianexpress.com"],
    rightsReview: {
      status: "admitted",
      reviewDate: "2026-10-29",
      reviewNote: "Wire editorial and explained feed pointer.",
      termsUrl: "https://indianexpress.com",
    },
    cadence: {
      maxItemsPerRun: 6,
      pollIntervalHours: 8,
    },
  },
  "THE HINDU": {
    id: "THE HINDU",
    label: "The Hindu Editorial & Policy",
    role: "independent_reporting",
    scope: "india",
    jurisdiction: "India",
    topicCompetence: ["Editorial Analysis", "Sci-Tech", "Economy"],
    lang: "en",
    enabled: true,
    rolloutLane: "public",
    approvedHosts: ["thehindu.com", "www.thehindu.com"],
    rightsReview: {
      status: "admitted",
      reviewDate: "2026-10-29",
      reviewNote: "Editorial and policy feeds.",
      termsUrl: "https://www.thehindu.com",
    },
    cadence: {
      maxItemsPerRun: 6,
      pollIntervalHours: 8,
    },
  },
  "BUSINESS STANDARD": {
    id: "BUSINESS STANDARD",
    label: "Business Standard Economy & Policy",
    role: "independent_reporting",
    scope: "india",
    jurisdiction: "India",
    topicCompetence: ["Fiscal Policy", "Trade", "Industry"],
    lang: "en",
    enabled: true,
    rolloutLane: "public",
    approvedHosts: ["business-standard.com", "www.business-standard.com"],
    rightsReview: {
      status: "admitted",
      reviewDate: "2026-10-29",
      reviewNote: "Economy & policy RSS feed.",
      termsUrl: "https://www.business-standard.com",
    },
    cadence: {
      maxItemsPerRun: 6,
      pollIntervalHours: 8,
    },
  },
  LIVEMINT: {
    id: "LIVEMINT",
    label: "LiveMint Economy",
    role: "independent_reporting",
    scope: "india",
    jurisdiction: "India",
    topicCompetence: ["Macroeconomics", "Banking", "Markets Policy"],
    lang: "en",
    enabled: true,
    rolloutLane: "public",
    approvedHosts: ["livemint.com", "www.livemint.com"],
    rightsReview: {
      status: "admitted",
      reviewDate: "2026-10-29",
      reviewNote: "Economy RSS feed.",
      termsUrl: "https://www.livemint.com",
    },
    cadence: {
      maxItemsPerRun: 6,
      pollIntervalHours: 8,
    },
  },
};

/** Get the source profile by normalized ID. */
export function getSourceProfile(sourceId?: string | null): SourceProfile | null {
  if (!sourceId) return null;
  const key = sourceId.trim().toUpperCase();
  return SOURCE_PROFILES[key] ?? null;
}

/** Check if a source is admitted for active ingestion (enabled AND admitted rights). */
export function isSourceAdmitted(sourceId: string): boolean {
  const profile = getSourceProfile(sourceId);
  if (!profile) return false;
  return profile.enabled && (profile.rightsReview.status === "admitted");
}

/** Check if a source is permitted for public publication. */
export function canPublishSource(sourceId: string): boolean {
  const profile = getSourceProfile(sourceId);
  if (!profile) return false;
  return (
    profile.enabled &&
    profile.rolloutLane === "public" &&
    profile.rightsReview.status === "admitted"
  );
}

/** Validate that a discovered or extracted URL belongs to an approved host for the source. */
export function validateHost(urlStr: string, sourceId: string): boolean {
  const profile = getSourceProfile(sourceId);
  if (!profile) return false;

  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return profile.approvedHosts.some(
      (approved) => host === approved.toLowerCase() || host.endsWith(`.${approved.toLowerCase()}`)
    );
  } catch {
    return false;
  }
}

/** Retrieve all approved hosts for a given source. */
export function getAllowedHosts(sourceId: string): string[] {
  const profile = getSourceProfile(sourceId);
  return profile ? [...profile.approvedHosts] : [];
}

