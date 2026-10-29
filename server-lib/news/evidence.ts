/**
 * server-lib/news/evidence.ts
 *
 * Deterministic Evidence & India Posture Verification (Phase 2).
 *
 * Implements the UPSC Prelims Trap Guardrail:
 *   - Verifies whether India's diplomatic posture is accurately characterized.
 *   - Prevents treaty membership traps: If an MEA release merely "welcomes" or
 *     "notes" an international treaty, forces `non_party_commentator` and blocks
 *     any false claim of Indian signature/membership.
 *   - Validates that factual claims are anchored to verified source quotes.
 */

export type IndiaPosture =
  | "party_signatory"
  | "party_ratified"
  | "non_party_observer"
  | "non_party_commentator"
  | "not_applicable"
  | "unverified";

export interface EvidenceQuote {
  spanId: string;
  quote: string;
  sourceId: string;
}

export interface PostureVerificationResult {
  declaredPosture: IndiaPosture;
  resolvedPosture: IndiaPosture;
  isValid: boolean;
  trapDetected: boolean;
  reason: string;
}

const INDIA_ENTITY_REGEX = /\b(India|New Delhi|Government of India|\bGoI\b|\bMEA\b)\b/i;

const SIGN_RATIFY_REGEX =
  /\b(sign|signed|signing|signatory|signatories|ratif\w+|acced\w+|became a party|joined the treaty|entered into agreement|concluded and signed)\b/i;

const OBSERVER_COMMENTARY_REGEX =
  /\b(welcome|welcomes|welcomed|note|notes|noted|noting|participated as observer|attended as observer|observer status|monitors|has not signed|neither signed|not a party|non-party)\b/i;

/**
 * Normalizes text for exact quote substring matching (collapses whitespace).
 */
export function normalizeForQuoteMatch(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Verifies that a cited evidence quote is an exact excerpt of the source document text.
 */
export function verifyQuoteInSource(quote: string, sourceText: string): boolean {
  if (!quote || !sourceText) return false;
  const normQuote = normalizeForQuoteMatch(quote);
  const normSource = normalizeForQuoteMatch(sourceText);
  return normSource.includes(normQuote);
}

/**
 * Deterministic India Posture Verifier (UPSC Prelims Trap Guardrail).
 */
export function verifyIndiaPosture(params: {
  declaredPosture?: IndiaPosture | string | null;
  headline?: string;
  bullets?: string[];
  quotes?: string[];
}): PostureVerificationResult {
  const declared = (params.declaredPosture as IndiaPosture) || "unverified";
  const quotesText = (params.quotes || []).join(" ");
  const contentText = `${params.headline || ""} ${(params.bullets || []).join(" ")}`;

  // 1. Check if India is mentioned at all
  const hasIndiaMention =
    INDIA_ENTITY_REGEX.test(contentText) || INDIA_ENTITY_REGEX.test(quotesText);

  if (!hasIndiaMention) {
    if (declared === "party_signatory" || declared === "party_ratified") {
      return {
        declaredPosture: declared,
        resolvedPosture: "not_applicable",
        isValid: false,
        trapDetected: true,
        reason: "Declared party signatory/ratified, but neither content nor evidence mentions India.",
      };
    }
    return {
      declaredPosture: declared,
      resolvedPosture: declared === "unverified" ? "not_applicable" : declared,
      isValid: true,
      trapDetected: false,
      reason: "No India involvement in development.",
    };
  }

  // 2. Check for explicit observer / commentator markers in evidence
  const hasObserverEvidence = OBSERVER_COMMENTARY_REGEX.test(quotesText);

  // 3. Check for co-occurring India + sign/ratify evidence in the SAME quote
  let hasValidMembershipEvidence = false;
  for (const quote of params.quotes || []) {
    if (INDIA_ENTITY_REGEX.test(quote) && SIGN_RATIFY_REGEX.test(quote)) {
      // Must not be a negation such as "India has neither signed nor ratified"
      if (!/\b(neither|not|never)\s+(signed|ratified|a party)\b/i.test(quote)) {
        hasValidMembershipEvidence = true;
        break;
      }
    }
  }

  // 4. Trap evaluation:
  // If declared as signatory/ratified, but evidence lacks co-occurring membership token
  // OR contains observer/commentary statements
  if (declared === "party_signatory" || declared === "party_ratified") {
    if (!hasValidMembershipEvidence) {
      const resolved = hasObserverEvidence ? "non_party_commentator" : "unverified";
      return {
        declaredPosture: declared,
        resolvedPosture: resolved,
        isValid: false,
        trapDetected: true,
        reason: `UPSC Trap Guardrail: Declared '${declared}', but cited source evidence does not prove Indian signing/ratification (contains commentary/observer signals).`,
      };
    }
  }

  // Check if headline claims India joined/signed while quotes only show commentary
  if (SIGN_RATIFY_REGEX.test(params.headline || "") && INDIA_ENTITY_REGEX.test(params.headline || "")) {
    if (!hasValidMembershipEvidence && hasObserverEvidence) {
      return {
        declaredPosture: declared,
        resolvedPosture: "non_party_commentator",
        isValid: false,
        trapDetected: true,
        reason: "Headline claims India signed/joined, but evidence shows India merely observed/commented.",
      };
    }
  }

  // If declared as observer/commentator and verified
  if (declared === "non_party_observer" || declared === "non_party_commentator") {
    return {
      declaredPosture: declared,
      resolvedPosture: declared,
      isValid: true,
      trapDetected: false,
      reason: "Accurately verified non-party diplomatic posture.",
    };
  }

  // If verified signatory/ratified
  if (hasValidMembershipEvidence) {
    return {
      declaredPosture: declared,
      resolvedPosture: declared === "party_ratified" ? "party_ratified" : "party_signatory",
      isValid: true,
      trapDetected: false,
      reason: "Co-occurring India entity and signing/ratification tokens deterministically verified.",
    };
  }

  return {
    declaredPosture: declared,
    resolvedPosture: declared,
    isValid: true,
    trapDetected: false,
    reason: "Standard posture evaluated without trap conflict.",
  };
}

/**
 * Validates a complete dispatch evidence bundle before publication commit.
 */
export function validateDispatchEvidence(params: {
  headline: string;
  bullets: string[];
  quotes: EvidenceQuote[];
  sourceNormalizedText: string;
  declaredPosture?: IndiaPosture | string;
}): {
  isValid: boolean;
  errors: string[];
  resolvedPosture: IndiaPosture;
} {
  const errors: string[] = [];

  // 1. Verify quotes exist verbatim in source
  for (const q of params.quotes) {
    if (!verifyQuoteInSource(q.quote, params.sourceNormalizedText)) {
      errors.push(`Quote in span ${q.spanId} does not match source text verbatim: "${q.quote.slice(0, 50)}..."`);
    }
  }

  // 2. Verify India Posture
  const postureRes = verifyIndiaPosture({
    declaredPosture: params.declaredPosture as IndiaPosture,
    headline: params.headline,
    bullets: params.bullets,
    quotes: params.quotes.map((q) => q.quote),
  });

  if (!postureRes.isValid) {
    errors.push(postureRes.reason);
  }

  return {
    isValid: errors.length === 0,
    errors,
    resolvedPosture: postureRes.resolvedPosture,
  };
}

