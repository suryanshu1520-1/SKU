/**
 * server-lib/news/identity.ts
 *
 * Canonical Episode Bucket Key & Bilateral Boilerplate Defense (Phase 2).
 *
 * Solves lexical overlap in international diplomatic reporting:
 *   1. Canonical Episode Bucket (`candidate_bucket_key`):
 *      `sorted(canonical_actors) : canonical_institution_or_forum : action_domain : YYYY_Q#`
 *   2. Hard Instrument / Mechanism Disjointness Gate:
 *      Prevents distinct instruments/working groups announced during the same visit
 *      from false-merging based on embedding cosine similarity alone.
 *   3. Accepted Match Key:
 *      Unique key per bounded event episode.
 */

export interface BucketKeyParams {
  actors: string[];
  institutionOrForum?: string | null;
  actionDomain: string;
  eventDate: Date | string;
}

/**
 * Normalizes an actor code or name to a stable 2-4 char identifier.
 * e.g. "India" -> "IN", "France" -> "FR", "United States" -> "US", "WTO" -> "WTO".
 */
export function normalizeActorCode(actor: string): string {
  const clean = actor.trim().toUpperCase();
  const MAP: Record<string, string> = {
    INDIA: "IN",
    "NEW DELHI": "IN",
    "GOVERNMENT OF INDIA": "IN",
    MEA: "IN",
    FRANCE: "FR",
    PARIS: "FR",
    "UNITED STATES": "US",
    USA: "US",
    WASHINGTON: "US",
    CHINA: "CN",
    BEIJING: "CN",
    RUSSIA: "RU",
    MOSCOW: "RU",
    "UNITED KINGDOM": "UK",
    BRITAIN: "UK",
    LONDON: "UK",
    JAPAN: "JP",
    TOKYO: "JP",
    GERMANY: "DE",
    BERLIN: "DE",
    AUSTRALIA: "AU",
    CANBERRA: "AU",
    BRAZIL: "BR",
    "SOUTH AFRICA": "ZA",
    BANGLADESH: "BD",
    NEPAL: "NP",
    BHUTAN: "BT",
    "SRI LANKA": "LK",
    MALDIVES: "MV",
    MAURITIUS: "MU",
    IRAN: "IR",
    ISRAEL: "IL",
    UAE: "AE",
    "SAUDI ARABIA": "SA",
  };
  return MAP[clean] ?? clean.replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/**
 * Normalizes institution or forum identifier.
 */
export function normalizeForum(forum?: string | null): string {
  if (!forum || !forum.trim()) return "BILATERAL";
  const clean = forum.trim().toUpperCase();
  if (clean.includes("WTO") || clean.includes("WORLD TRADE")) return "WTO";
  if (clean.includes("UNSC") || clean.includes("SECURITY COUNCIL")) return "UNSC";
  if (clean.includes("UNGA") || clean.includes("GENERAL ASSEMBLY")) return "UNGA";
  if (clean.includes("G20")) return "G20";
  if (clean.includes("BRICS")) return "BRICS";
  if (clean.includes("QUAD")) return "QUAD";
  if (clean.includes("ASEAN")) return "ASEAN";
  if (clean.includes("SCO")) return "SCO";
  if (clean.includes("IMF")) return "IMF";
  if (clean.includes("WORLD BANK")) return "WORLD_BANK";
  if (clean.includes("WHO")) return "WHO";
  if (clean.includes("COP") || clean.includes("UNFCCC")) return "UNFCCC";
  return clean.replace(/[^A-Z0-9]/g, "_").slice(0, 16);
}

/**
 * Derives YYYY_Q# quarter string from date.
 */
export function getQuarterString(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const year = Number.isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const month = Number.isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth();
  const q = Math.floor(month / 3) + 1;
  return `${year}_Q${q}`;
}

/**
 * Computes deterministic Candidate Bucket Key.
 * Formula: `sorted(canonical_actors) : canonical_institution_or_forum : action_domain : YYYY_Q#`
 */
export function computeCandidateBucketKey(params: BucketKeyParams): string {
  const normalizedActors = Array.from(
    new Set((params.actors || []).map(normalizeActorCode).filter(Boolean))
  ).sort();

  const actorsSegment = normalizedActors.length > 0 ? normalizedActors.join("+") : "UNSPECIFIED";
  const forumSegment = normalizeForum(params.institutionOrForum);
  const domainSegment = (params.actionDomain || "GENERAL")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
  const quarterSegment = getQuarterString(params.eventDate);

  return `${actorsSegment}:${forumSegment}:${domainSegment}:${quarterSegment}`;
}

/**
 * Hard Instrument / Mechanism Disjointness Gate.
 *
 * Returns TRUE if candidate and existing episode name explicit disjoint instruments,
 * meaning they CANNOT be merged into the same episode regardless of cosine similarity.
 *
 * Example:
 *   candidate = ['WTO_DS602'], existing = ['WTO_DS541'] -> DISJOINT (true)
 *   candidate = ['UNCLOS'], existing = ['BBNJ'] -> DISJOINT (true)
 *   candidate = ['SPACE_PAYLOAD_MOU'], existing = ['MARITIME_LOGISTICS_AGREEMENT'] -> DISJOINT (true)
 */
export function checkInstrumentDisjointness(
  candidateInstruments: string[],
  existingInstruments: string[]
): boolean {
  if (!candidateInstruments?.length || !existingInstruments?.length) {
    return false; // No explicit named instruments to conflict on
  }

  const normCandidate = new Set(
    candidateInstruments.map((i) => i.trim().toUpperCase().replace(/[^A-Z0-9_]/g, ""))
  );
  const normExisting = new Set(
    existingInstruments.map((i) => i.trim().toUpperCase().replace(/[^A-Z0-9_]/g, ""))
  );

  // If there is ANY overlap, they are NOT disjoint
  for (const c of normCandidate) {
    if (normExisting.has(c)) {
      return false;
    }
  }

  // Both sides specify non-empty sets of instruments, and they share 0 instruments in common:
  // Strict disjointness holds!
  return true;
}

/**
 * Computes Accepted Match Key for a bounded episode.
 */
export function computeAcceptedMatchKey(params: {
  candidateBucketKey: string;
  primaryInstrument?: string | null;
  specificEventSlug: string;
}): string {
  const instrumentPart = params.primaryInstrument
    ? params.primaryInstrument.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "")
    : "GENERAL";
  const slugPart = params.specificEventSlug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 48);

  return `${params.candidateBucketKey}:${instrumentPart}:${slugPart}`;
}

