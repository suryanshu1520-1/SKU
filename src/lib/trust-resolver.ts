/**
 * src/lib/trust-resolver.ts
 *
 * Pure, deterministic Trust and Grounding Resolver.
 *
 * Replaces loose substring-based domain matching and eliminates automatic 100%
 * truth assertions for allowlisted names. Reconciles the historical 0..1 vs 0..100
 * grounding score mismatch cleanly.
 *
 * Designed with ZERO DOM dependencies to run identically in Node/server and React.
 */

export type EditorialRole =
  | 'official_record'
  | 'institutional_news'
  | 'independent_reporting'
  | 'commentary'
  | 'discovery'
  | 'unknown';

export type TrustBadgeLevel =
  | 'primary_record'         // Official government or multilateral primary host + cite-or-drop verified
  | 'evidence_backed'        // Wire / independent source with cite-or-drop verified claims
  | 'official_unverified'    // Official host, but lacks cite-or-drop claim verification
  | 'none';                  // Wire without verified claims, or invalid/unsupported

export interface TrustResolution {
  hostname: string | null;
  isOfficialRecord: boolean;
  editorialRole: EditorialRole;
  badgeLevel: TrustBadgeLevel;
  badgeLabel: string | null;
  badgeTooltip: string | null;
  groundingRatio: number | null; // Normalized 0..1
  verifiedClaimCount: number;
  isCiteOrDrop: boolean;
}

const OFFICIAL_PRIMARY_HOSTS = new Set<string>([
  'pib.gov.in',
  'rbi.org.in',
  'prsindia.org',
  'egazette.nic.in',
  'indiabudget.gov.in',
  'mea.gov.in',
  'wto.org',
]);

/**
 * Robustly parses and extracts lowercase hostname from a URL string.
 * Strips leading 'www.' and trailing dots. Returns null if invalid or missing.
 */
export function parseHost(urlStr?: string | null): string | null {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    const trimmed = urlStr.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return null;
    }
    const parsed = new URL(trimmed);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    if (host.endsWith('.')) {
      host = host.slice(0, -1);
    }
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Checks if a hostname matches an official primary source domain.
 * Strictly checks exact domain or subdomain (e.g. `press.pib.gov.in` or `pib.gov.in`).
 * Substring matching (e.g. 'not-pib.com') is strictly forbidden.
 */
export function isVerifiedPrimaryHost(hostname: string | null): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase();
  for (const official of OFFICIAL_PRIMARY_HOSTS) {
    if (host === official || host.endsWith(`.${official}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Normalizes grounding score to a canonical 0..1 range.
 * Reconciles producer values (which may have been emitted as 0..100 or 0..1).
 */
export function normalizeGroundingScore(score?: number | null): number | null {
  if (score === null || score === undefined || typeof score !== 'number' || Number.isNaN(score)) {
    return null;
  }
  if (!Number.isFinite(score) || score < 0) {
    return 0;
  }
  // If score is > 1.0 (e.g. 100 or 85), divide by 100 to normalize to 0..1
  const normalized = score > 1 ? score / 100 : score;
  return Math.min(1, Math.max(0, normalized));
}

export interface ResolveTrustParams {
  source?: string | null;
  sourceUrl?: string | null;
  grounding?: number | null;
  verificationMethod?: string | null;
  claims?: Array<{ verified?: boolean; verification_method?: string }> | null;
}

/**
 * Resolves trust properties for an article or card deterministically.
 */
export function resolveTrustStatus(params: ResolveTrustParams): TrustResolution {
  const { source, sourceUrl, grounding, verificationMethod, claims } = params;

  const hostname = parseHost(sourceUrl);
  const isOfficialRecord = isVerifiedPrimaryHost(hostname);

  // Derive editorial role
  let editorialRole: EditorialRole = 'unknown';
  if (isOfficialRecord) {
    editorialRole = 'official_record';
  } else if (source) {
    const s = source.trim().toUpperCase();
    if (s === 'PIB' || s === 'RBI' || s === 'MEA') {
      editorialRole = 'official_record';
    } else if (s === 'PRS' || s === 'WTO' || s === 'UN NEWS') {
      editorialRole = 'institutional_news';
    } else if (s === 'WIKIPEDIA') {
      editorialRole = 'discovery';
    } else if (['INDIAN EXPRESS', 'THE HINDU', 'BUSINESS STANDARD', 'LIVEMINT'].includes(s)) {
      editorialRole = 'independent_reporting';
    }
  }

  const isCiteOrDrop = verificationMethod === 'live_cite_or_drop_v1';
  const verifiedClaims = Array.isArray(claims)
    ? claims.filter((c) => c && c.verified && (!c.verification_method || c.verification_method === 'live_cite_or_drop_v1'))
    : [];
  const verifiedClaimCount = verifiedClaims.length;

  const groundingRatio = normalizeGroundingScore(grounding);

  // Determine badge level
  let badgeLevel: TrustBadgeLevel = 'none';
  let badgeLabel: string | null = null;
  let badgeTooltip: string | null = null;

  if (isOfficialRecord && isCiteOrDrop && verifiedClaimCount > 0) {
    badgeLevel = 'primary_record';
    badgeLabel = 'Primary Source · Grounded';
    badgeTooltip = 'Official record with deterministic span-anchored claim verification';
  } else if (isCiteOrDrop && verifiedClaimCount > 0) {
    badgeLevel = 'evidence_backed';
    badgeLabel = 'Evidence Backed';
    badgeTooltip = 'Reported claims deterministically anchored to cited source text';
  } else if (isOfficialRecord) {
    badgeLevel = 'official_unverified';
    badgeLabel = 'Primary Source';
    badgeTooltip = 'Direct official publisher record; summary not span-verified';
  }

  return {
    hostname,
    isOfficialRecord,
    editorialRole,
    badgeLevel,
    badgeLabel,
    badgeTooltip,
    groundingRatio,
    verifiedClaimCount,
    isCiteOrDrop,
  };
}

