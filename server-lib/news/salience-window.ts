/**
 * server-lib/news/salience-window.ts
 *
 * Deterministic Head + Operative-Salience Windowing (Phase 2).
 *
 * Prevents the first-6,000-character truncation defect where long diplomatic,
 * treaty, or multilateral texts front-load ceremonial preambles and bury
 * operative articles/annexes beyond the clamp.
 *
 * 1. Lead Anchor (~1,200 chars): Retains opening paragraphs establishing date, speaker, forum.
 * 2. Operative Salience Scoring (~4,800 chars): Scores remaining paragraphs deterministically.
 * 3. Context-Preserving Assembly: Reconstructs paragraphs in document order with explicit
 *    `[...]` omission markers and document-qualified span IDs (`docA:v2:p7`).
 */

export interface SalienceSpan {
  spanId: string;
  paragraphIndex: number;
  score: number;
  text: string;
  isLead: boolean;
}

export interface SalienceWindowResult {
  windowedText: string;
  charCount: number;
  spans: SalienceSpan[];
  omissionCount: number;
}

// Operative legal/diplomatic markers (+5 each)
const OPERATIVE_MARKERS = [
  /\b(decides|agrees|ratifies|ratified|accords|amends|amended|adopt|adopts|adopted)\b/gi,
  /\b(entry into force|entered into force|effective from|commences|commenced)\b/gi,
  /\b(memorandum of understanding|\bmou\b|agreement|convention|treaty|protocol)\b/gi,
  /\b(article\s+\d+|annex\s+[a-z0-9]+|clause\s+\d+|schedule\s+\d+)\b/gi,
  /\b(tariff|countervailing|anti-dumping|customs duty|bound rate)\b/gi,
  /\b(dispute settlement|panel report|appellate body|ruling|sanction|sanctions)\b/gi,
  /\b(binding obligation|legally binding|signatory|signatories|ratification)\b/gi,
  /\b(prohibited|shall not|hereby resolves|mandates|enacted)\b/gi,
];

// Quantitative & temporal density (+4 each)
const QUANT_TEMPORAL_PATTERNS = [
  /(\$|₹|€|£|EUR|USD|INR)\s*[\d,.]+(\s*(billion|million|crore|lakh|trillion))?/gi,
  /\b\d+(\.\d+)?\s*%/g,
  /\b(19\d\d|20\d\d)\b/g,
  /\b(by|before|effective)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
  /\bdeadline\s+of\b/gi,
];

// Target entity/treaty anchors (+6 each)
const ENTITY_ANCHORS = [
  /\b(India|New Delhi|Government of India|MEA)\b/gi,
  /\b(WTO|UNSC|UNGA|UNCLOS|BBNJ|G20|BRICS|COP\d+|IMF|World Bank|WHO)\b/gi,
];

/**
 * Deterministically scores a paragraph based on operative salience.
 */
export function scoreParagraphSalience(text: string): number {
  if (!text || text.length < 30) return 0;
  let score = 0;

  for (const regex of OPERATIVE_MARKERS) {
    const matches = text.match(regex);
    if (matches) score += matches.length * 5;
  }

  for (const regex of QUANT_TEMPORAL_PATTERNS) {
    const matches = text.match(regex);
    if (matches) score += matches.length * 4;
  }

  for (const regex of ENTITY_ANCHORS) {
    const matches = text.match(regex);
    if (matches) score += matches.length * 6;
  }

  // Modest length boost (substantive paragraphs vs one-line headings)
  score += Math.min(Math.floor(text.length / 120), 4);

  return score;
}

/**
 * Splits document into normalized paragraphs.
 */
export function splitParagraphs(fullText: string): string[] {
  return fullText
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 20);
}

/**
 * Windows document using Deterministic Head + Operative-Salience Scoring.
 */
export function windowDocumentBySalience(params: {
  documentId: string;
  versionNo: number | string;
  text: string;
  maxTotalChars?: number;
  leadAnchorChars?: number;
}): SalienceWindowResult {
  const {
    documentId,
    versionNo,
    text,
    maxTotalChars = 6000,
    leadAnchorChars = 1200,
  } = params;

  if (!text || text.length <= maxTotalChars) {
    // Fits comfortably within budget; preserve as single continuous span set
    const paragraphs = splitParagraphs(text);
    const spans: SalienceSpan[] = paragraphs.map((p, idx) => ({
      spanId: `${documentId}:v${versionNo}:p${idx}`,
      paragraphIndex: idx,
      score: scoreParagraphSalience(p),
      text: p,
      isLead: true,
    }));

    return {
      windowedText: text.trim(),
      charCount: text.length,
      spans,
      omissionCount: 0,
    };
  }

  const allParagraphs = splitParagraphs(text);
  if (allParagraphs.length === 0) {
    return {
      windowedText: text.slice(0, maxTotalChars),
      charCount: Math.min(text.length, maxTotalChars),
      spans: [],
      omissionCount: 0,
    };
  }

  // 1. Lead Anchor Assembly (first ~1,200 characters)
  const leadIndices: number[] = [];
  let leadAccumChars = 0;

  for (let i = 0; i < allParagraphs.length; i++) {
    const pLen = allParagraphs[i].length;
    if (leadAccumChars === 0 || leadAccumChars + pLen <= leadAnchorChars) {
      leadIndices.push(i);
      leadAccumChars += pLen;
    } else {
      break;
    }
  }

  const leadIndexSet = new Set(leadIndices);

  // 2. Score remaining operative paragraphs
  const remainingCandidates: Array<{ index: number; score: number; length: number }> = [];

  for (let i = 0; i < allParagraphs.length; i++) {
    if (leadIndexSet.has(i)) continue;
    const score = scoreParagraphSalience(allParagraphs[i]);
    remainingCandidates.push({ index: i, score, length: allParagraphs[i].length });
  }

  // Sort descending by score
  remainingCandidates.sort((a, b) => b.score - a.score);

  // 3. Greedily pick highest scoring paragraphs within remaining budget
  const budgetForOperative = Math.max(1000, maxTotalChars - leadAccumChars);
  let operativeAccumChars = 0;
  const selectedIndices = new Set<number>(leadIndices);

  for (const cand of remainingCandidates) {
    if (operativeAccumChars + cand.length <= budgetForOperative) {
      selectedIndices.add(cand.index);
      operativeAccumChars += cand.length;
    }
  }

  // 4. Order selected paragraphs strictly by document order to preserve narrative structure
  const sortedSelected = Array.from(selectedIndices).sort((a, b) => a - b);

  const finalSpans: SalienceSpan[] = [];
  const textBlocks: string[] = [];
  let omissionCount = 0;
  let prevIdx = -1;

  for (const idx of sortedSelected) {
    if (prevIdx !== -1 && idx > prevIdx + 1) {
      // There was a gap of 1 or more omitted paragraphs
      textBlocks.push("[...]");
      omissionCount++;
    }

    const pText = allParagraphs[idx];
    const isLead = leadIndexSet.has(idx);
    const score = isLead ? 100 : scoreParagraphSalience(pText);
    const spanId = `${documentId}:v${versionNo}:p${idx}`;

    finalSpans.push({
      spanId,
      paragraphIndex: idx,
      score,
      text: pText,
      isLead,
    });

    textBlocks.push(pText);
    prevIdx = idx;
  }

  const windowedText = textBlocks.join("\n\n");

  return {
    windowedText,
    charCount: windowedText.length,
    spans: finalSpans,
    omissionCount,
  };
}

