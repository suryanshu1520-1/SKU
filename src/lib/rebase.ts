export type RebaseAction = 'learn' | 'replace';

export interface RebaseEvidence {
  source: string;
  url: string;
  quote: string;
  spanIds: string[];
}

export interface RebasePatchItem {
  mutationId: string;
  action: RebaseAction;
  claimId: string;
  previousText: string | null;
  currentText: string;
  previousValue: string | null;
  currentValue: string;
  reason: string;
  observedAt: string;
  effectiveAt: string | null;
  verificationMethod: 'live_cite_or_drop_v1';
  evidence: RebaseEvidence[];
  syllabus: {
    nodeId: string | null;
    tags: string[];
  };
  story: {
    headline: string;
    url: string;
  };
}

export interface RebasePatch {
  schemaVersion: 1;
  patchId: string;
  fromCheckpoint: {
    sequence: string;
    verifiedThrough: string | null;
  };
  throughSequence: string;
  verifiedThrough: string;
  status: 'changes' | 'empty' | 'degraded';
  counts: {
    learn: number;
    replace: number;
    watch: 0;
    retire: 0;
  };
  items: RebasePatchItem[];
  hasMore: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isSequence(value: unknown): value is string {
  return typeof value === 'string' && /^\d+$/.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isEvidence(value: unknown): value is RebaseEvidence {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.source) &&
    isNonEmptyString(value.url) &&
    isNonEmptyString(value.quote) &&
    isStringArray(value.spanIds) &&
    value.spanIds.length > 0
  );
}

function isPatchItem(value: unknown): value is RebasePatchItem {
  if (!isRecord(value)) return false;
  if (value.action !== 'learn' && value.action !== 'replace') return false;
  if (
    !isNonEmptyString(value.mutationId) ||
    !isNonEmptyString(value.claimId) ||
    !isNonEmptyString(value.currentText) ||
    !isNonEmptyString(value.currentValue) ||
    !isNonEmptyString(value.reason) ||
    !isIsoTimestamp(value.observedAt) ||
    value.verificationMethod !== 'live_cite_or_drop_v1' ||
    !Array.isArray(value.evidence) ||
    value.evidence.length === 0 ||
    !value.evidence.every(isEvidence)
  ) {
    return false;
  }

  if (value.effectiveAt !== null && !isIsoTimestamp(value.effectiveAt)) return false;
  if (value.action === 'learn' && value.previousText !== null) return false;
  if (value.action === 'replace' && !isNonEmptyString(value.previousText)) return false;

  if (!isRecord(value.syllabus) || !isStringArray(value.syllabus.tags)) return false;
  if (value.syllabus.nodeId !== null && !isNonEmptyString(value.syllabus.nodeId)) return false;
  if (!isRecord(value.story) || !isNonEmptyString(value.story.headline) || !isNonEmptyString(value.story.url)) {
    return false;
  }
  return true;
}

/**
 * Runtime boundary for the Antigravity-owned backend. Any partial, stale, or
 * unproven payload fails closed and the product keeps rendering Daily Edition.
 */
export function isRebasePatch(value: unknown): value is RebasePatch {
  if (!isRecord(value) || value.schemaVersion !== 1) return false;
  if (
    !isNonEmptyString(value.patchId) ||
    !isRecord(value.fromCheckpoint) ||
    !isSequence(value.fromCheckpoint.sequence) ||
    (value.fromCheckpoint.verifiedThrough !== null && !isIsoTimestamp(value.fromCheckpoint.verifiedThrough)) ||
    !isSequence(value.throughSequence) ||
    !isIsoTimestamp(value.verifiedThrough) ||
    !isRecord(value.counts) ||
    !Array.isArray(value.items) ||
    typeof value.hasMore !== 'boolean'
  ) {
    return false;
  }

  if (value.status !== 'changes' && value.status !== 'empty' && value.status !== 'degraded') return false;
  const learn = value.counts.learn;
  const replace = value.counts.replace;
  const watch = value.counts.watch;
  const retire = value.counts.retire;
  if (
    typeof learn !== 'number' ||
    typeof replace !== 'number' ||
    !Number.isInteger(learn) ||
    !Number.isInteger(replace) ||
    learn < 0 ||
    replace < 0 ||
    watch !== 0 ||
    retire !== 0
  ) {
    return false;
  }
  if (!value.items.every(isPatchItem)) return false;

  const mutationIds = new Set(value.items.map((item) => item.mutationId));
  if (mutationIds.size !== value.items.length) return false;
  if (value.counts.learn !== value.items.filter((item) => item.action === 'learn').length) return false;
  if (value.counts.replace !== value.items.filter((item) => item.action === 'replace').length) return false;
  if (value.status === 'changes' && value.items.length === 0) return false;
  if (value.status === 'empty' && value.items.length !== 0) return false;
  return true;
}

export function rebaseAcknowledgementKey(userId: string, patchId: string): string {
  return `tark_rebase_ack_v1:${userId}:${patchId}`;
}
