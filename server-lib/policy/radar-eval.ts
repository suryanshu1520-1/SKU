/**
 * server-lib/policy/radar-eval.ts
 *
 * Pure evaluation engine for Policy Radar quality gates.
 * Evaluates live DB signals, human gold sets, and fixture models against strict thresholds.
 * TASK_085R
 */

import { wilsonLower } from "./logreg.js";

export type Metric = {
  key: string;
  value: number | null;
  n: number | null;
  threshold: number;
  op: ">=" | "<=" | "==";
  status: "pass" | "fail" | "missing" | "skipped";
  wilson_lb?: number;
};

export interface Thresholds {
  public_evidence_missing: number;
  hardcoded_fallbacks: number;
  pib_non_fallback_ministry_rate: number;
  passing_rows_node_id_rate: number;
  event_precision: number;
  instrument_accuracy: number;
  resolver_precision: number;
  resolver_recall: number;
  ordering_errors: number;
  learned_edges_precision: number;
  learned_edges_wilson_lb: number;
  pending_backlog_stale_count: number;
  boss_mcq_traceable_rate: number;
  audit_max_age_days: number;
  run_max_age_days: number;
  [key: string]: number;
}

export interface AuditRow {
  event_id?: string;
  event_date?: string;
  instrument?: string;
  actor?: string;
  program?: string;
  quote?: string;
  source_url?: string;
  is_policy_event?: string | number | boolean | null;
  actor_correct?: string | number | boolean | null;
  program_correct?: string | number | boolean | null;
  date_correct?: string | number | boolean | null;
  notes?: string;
}

export interface EvalInputs {
  audit?: {
    rows: AuditRow[];
    date: string; // YYYY-MM-DD
  } | null;
  instrument?: {
    correct: number;
    total: number;
  } | null;
  resolver?: {
    precision: number | null;
    recall: number | null;
    n_accepted: number | null;
    n_labelled: number | null;
  } | null;
  ordering_errors?: number | null;
  learned_edges?: {
    passed: boolean;
    precision?: number | null;
    wilson_lb?: number | null;
    n?: number | null;
  } | null;
  public_evidence_missing?: number | null;
  hardcoded_fallbacks?: number | null;
  pib_non_fallback_ministry_rate?: number | null;
  pib_total?: number | null;
  passing_rows_node_id_rate?: number | null;
  passing_rows_total?: number | null;
  radar_v2_since_set?: boolean;
  pending_backlog_stale_count?: number | null;
  boss_mcq_traceable_rate?: number | null;
  boss_mcq_total?: number | null;
}

function isTruthyFlag(v: any): boolean {
  if (v === true || v === 1 || v === "1") return true;
  if (typeof v === "string" && v.trim().toLowerCase() === "true") return true;
  return false;
}

function isFalsyFlag(v: any): boolean {
  if (v === false || v === 0 || v === "0") return true;
  if (typeof v === "string" && v.trim().toLowerCase() === "false") return true;
  return false;
}

function hasFlag(v: any): boolean {
  return isTruthyFlag(v) || isFalsyFlag(v);
}

function daysDiff(d1: string, d2: string): number {
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  return (t2 - t1) / (86400 * 1000);
}

/**
 * Pure evaluation function. Computes each metric status against provided thresholds.
 */
export function evaluate(
  inputs: EvalInputs,
  t: Thresholds,
  today: string
): { metrics: Metric[]; passed: boolean; failing: string[] } {
  const metrics: Metric[] = [];

  // 1. event_precision (50-event human audit)
  if (!inputs.audit || !inputs.audit.rows || inputs.audit.rows.length === 0) {
    metrics.push({
      key: "event_precision",
      value: null,
      n: null,
      threshold: t.event_precision,
      op: ">=",
      status: "missing",
    });
  } else {
    const ageDays = daysDiff(inputs.audit.date, today);
    if (ageDays > t.audit_max_age_days) {
      metrics.push({
        key: "event_precision",
        value: null,
        n: inputs.audit.rows.length,
        threshold: t.event_precision,
        op: ">=",
        status: "missing",
      });
    } else {
      // Check if every row is fully labelled
      const fullyLabelled = inputs.audit.rows.every(
        (r) =>
          hasFlag(r.is_policy_event) &&
          hasFlag(r.actor_correct) &&
          hasFlag(r.date_correct)
      );

      if (!fullyLabelled) {
        metrics.push({
          key: "event_precision",
          value: null,
          n: inputs.audit.rows.length,
          threshold: t.event_precision,
          op: ">=",
          status: "missing",
        });
      } else {
        let correctCount = 0;
        for (const r of inputs.audit.rows) {
          const isEvent = isTruthyFlag(r.is_policy_event);
          const actorOk = isTruthyFlag(r.actor_correct);
          const dateOk = isTruthyFlag(r.date_correct);
          const programBlank = !r.program || String(r.program).trim() === "";
          const programOk = isTruthyFlag(r.program_correct) || programBlank;

          if (isEvent && actorOk && dateOk && programOk) {
            correctCount++;
          }
        }

        const n = inputs.audit.rows.length;
        const value = n > 0 ? correctCount / n : 0;
        const lb = wilsonLower(correctCount, n);
        const status = value >= t.event_precision ? "pass" : "fail";

        metrics.push({
          key: "event_precision",
          value: Math.round(value * 10000) / 10000,
          n,
          threshold: t.event_precision,
          op: ">=",
          status,
          wilson_lb: Math.round(lb * 10000) / 10000,
        });
      }
    }
  }

  // 2. instrument_accuracy (60 labelled)
  if (!inputs.instrument || inputs.instrument.total === 0) {
    metrics.push({
      key: "instrument_accuracy",
      value: null,
      n: null,
      threshold: t.instrument_accuracy,
      op: ">=",
      status: "missing",
    });
  } else {
    const value = inputs.instrument.correct / inputs.instrument.total;
    const status = value >= t.instrument_accuracy ? "pass" : "fail";
    metrics.push({
      key: "instrument_accuracy",
      value: Math.round(value * 10000) / 10000,
      n: inputs.instrument.total,
      threshold: t.instrument_accuracy,
      op: ">=",
      status,
    });
  }

  // 3. resolver_precision (100 mentions)
  if (
    !inputs.resolver ||
    inputs.resolver.precision === null ||
    inputs.resolver.n_accepted === null ||
    inputs.resolver.n_accepted === 0
  ) {
    metrics.push({
      key: "resolver_precision",
      value: null,
      n: inputs.resolver?.n_accepted ?? null,
      threshold: t.resolver_precision,
      op: ">=",
      status: "missing",
    });
  } else {
    const status = inputs.resolver.precision >= t.resolver_precision ? "pass" : "fail";
    metrics.push({
      key: "resolver_precision",
      value: Math.round(inputs.resolver.precision * 10000) / 10000,
      n: inputs.resolver.n_accepted,
      threshold: t.resolver_precision,
      op: ">=",
      status,
    });
  }

  // 4. resolver_recall (100 mentions)
  if (
    !inputs.resolver ||
    inputs.resolver.recall === null ||
    inputs.resolver.n_labelled === null ||
    inputs.resolver.n_labelled === 0
  ) {
    metrics.push({
      key: "resolver_recall",
      value: null,
      n: inputs.resolver?.n_labelled ?? null,
      threshold: t.resolver_recall,
      op: ">=",
      status: "missing",
    });
  } else {
    const status = inputs.resolver.recall >= t.resolver_recall ? "pass" : "fail";
    metrics.push({
      key: "resolver_recall",
      value: Math.round(inputs.resolver.recall * 10000) / 10000,
      n: inputs.resolver.n_labelled,
      threshold: t.resolver_recall,
      op: ">=",
      status,
    });
  }

  // 5. ordering_errors on fixtures
  if (inputs.ordering_errors === null || inputs.ordering_errors === undefined) {
    metrics.push({
      key: "ordering_errors",
      value: null,
      n: null,
      threshold: t.ordering_errors,
      op: "==",
      status: "missing",
    });
  } else {
    const status = inputs.ordering_errors === t.ordering_errors ? "pass" : "fail";
    metrics.push({
      key: "ordering_errors",
      value: inputs.ordering_errors,
      n: null,
      threshold: t.ordering_errors,
      op: "==",
      status,
    });
  }

  // 6. learned_edges (precision & wilson_lb)
  if (!inputs.learned_edges || inputs.learned_edges.passed !== true) {
    metrics.push({
      key: "learned_edges_precision",
      value: null,
      n: inputs.learned_edges?.n ?? null,
      threshold: t.learned_edges_precision,
      op: ">=",
      status: "skipped",
    });
    metrics.push({
      key: "learned_edges_wilson_lb",
      value: null,
      n: inputs.learned_edges?.n ?? null,
      threshold: t.learned_edges_wilson_lb,
      op: ">=",
      status: "skipped",
    });
  } else {
    // Model passed: evaluate precision
    if (
      inputs.learned_edges.precision === null ||
      inputs.learned_edges.precision === undefined
    ) {
      metrics.push({
        key: "learned_edges_precision",
        value: null,
        n: inputs.learned_edges.n ?? null,
        threshold: t.learned_edges_precision,
        op: ">=",
        status: "missing",
      });
    } else {
      const pStatus =
        inputs.learned_edges.precision >= t.learned_edges_precision ? "pass" : "fail";
      metrics.push({
        key: "learned_edges_precision",
        value: Math.round(inputs.learned_edges.precision * 10000) / 10000,
        n: inputs.learned_edges.n ?? null,
        threshold: t.learned_edges_precision,
        op: ">=",
        status: pStatus,
      });
    }

    // Evaluate wilson_lb
    if (
      inputs.learned_edges.wilson_lb === null ||
      inputs.learned_edges.wilson_lb === undefined
    ) {
      metrics.push({
        key: "learned_edges_wilson_lb",
        value: null,
        n: inputs.learned_edges.n ?? null,
        threshold: t.learned_edges_wilson_lb,
        op: ">=",
        status: "missing",
      });
    } else {
      const lbStatus =
        inputs.learned_edges.wilson_lb >= t.learned_edges_wilson_lb ? "pass" : "fail";
      metrics.push({
        key: "learned_edges_wilson_lb",
        value: Math.round(inputs.learned_edges.wilson_lb * 10000) / 10000,
        n: inputs.learned_edges.n ?? null,
        threshold: t.learned_edges_wilson_lb,
        op: ">=",
        status: lbStatus,
      });
    }
  }

  // 7. public_evidence_missing
  if (
    inputs.public_evidence_missing === null ||
    inputs.public_evidence_missing === undefined
  ) {
    metrics.push({
      key: "public_evidence_missing",
      value: null,
      n: null,
      threshold: t.public_evidence_missing,
      op: "==",
      status: "missing",
    });
  } else {
    const status =
      inputs.public_evidence_missing === t.public_evidence_missing ? "pass" : "fail";
    metrics.push({
      key: "public_evidence_missing",
      value: inputs.public_evidence_missing,
      n: null,
      threshold: t.public_evidence_missing,
      op: "==",
      status,
    });
  }

  // 8. hardcoded_fallbacks
  if (
    inputs.hardcoded_fallbacks === null ||
    inputs.hardcoded_fallbacks === undefined
  ) {
    metrics.push({
      key: "hardcoded_fallbacks",
      value: null,
      n: null,
      threshold: t.hardcoded_fallbacks,
      op: "==",
      status: "missing",
    });
  } else {
    const status = inputs.hardcoded_fallbacks === t.hardcoded_fallbacks ? "pass" : "fail";
    metrics.push({
      key: "hardcoded_fallbacks",
      value: inputs.hardcoded_fallbacks,
      n: null,
      threshold: t.hardcoded_fallbacks,
      op: "==",
      status,
    });
  }

  // 9. pib_non_fallback_ministry_rate
  if (
    inputs.pib_non_fallback_ministry_rate === null ||
    inputs.pib_non_fallback_ministry_rate === undefined
  ) {
    metrics.push({
      key: "pib_non_fallback_ministry_rate",
      value: null,
      n: inputs.pib_total ?? null,
      threshold: t.pib_non_fallback_ministry_rate,
      op: ">=",
      status: "missing",
    });
  } else {
    const status =
      inputs.pib_non_fallback_ministry_rate >= t.pib_non_fallback_ministry_rate
        ? "pass"
        : "fail";
    metrics.push({
      key: "pib_non_fallback_ministry_rate",
      value: Math.round(inputs.pib_non_fallback_ministry_rate * 10000) / 10000,
      n: inputs.pib_total ?? null,
      threshold: t.pib_non_fallback_ministry_rate,
      op: ">=",
      status,
    });
  }

  // 10. passing_rows_node_id_rate
  if (
    inputs.passing_rows_node_id_rate === null ||
    inputs.passing_rows_node_id_rate === undefined
  ) {
    metrics.push({
      key: "passing_rows_node_id_rate",
      value: null,
      n: inputs.passing_rows_total ?? null,
      threshold: t.passing_rows_node_id_rate,
      op: ">=",
      status: "missing",
    });
  } else {
    const status =
      inputs.passing_rows_node_id_rate >= t.passing_rows_node_id_rate ? "pass" : "fail";
    metrics.push({
      key: "passing_rows_node_id_rate",
      value: Math.round(inputs.passing_rows_node_id_rate * 10000) / 10000,
      n: inputs.passing_rows_total ?? null,
      threshold: t.passing_rows_node_id_rate,
      op: ">=",
      status,
    });
  }

  // 11. pending_backlog_stale_count (only evaluated if RADAR_V2_SINCE is set)
  if (
    !inputs.radar_v2_since_set ||
    inputs.pending_backlog_stale_count === null ||
    inputs.pending_backlog_stale_count === undefined
  ) {
    metrics.push({
      key: "pending_backlog_stale_count",
      value: null,
      n: null,
      threshold: t.pending_backlog_stale_count,
      op: "==",
      status: "missing",
    });
  } else {
    const status =
      inputs.pending_backlog_stale_count === t.pending_backlog_stale_count
        ? "pass"
        : "fail";
    metrics.push({
      key: "pending_backlog_stale_count",
      value: inputs.pending_backlog_stale_count,
      n: null,
      threshold: t.pending_backlog_stale_count,
      op: "==",
      status,
    });
  }

  // 12. boss_mcq_traceable_rate
  if (
    inputs.boss_mcq_traceable_rate === null ||
    inputs.boss_mcq_traceable_rate === undefined
  ) {
    metrics.push({
      key: "boss_mcq_traceable_rate",
      value: null,
      n: inputs.boss_mcq_total ?? null,
      threshold: t.boss_mcq_traceable_rate,
      op: ">=",
      status: "missing",
    });
  } else {
    const status =
      inputs.boss_mcq_traceable_rate >= t.boss_mcq_traceable_rate ? "pass" : "fail";
    metrics.push({
      key: "boss_mcq_traceable_rate",
      value: Math.round(inputs.boss_mcq_traceable_rate * 10000) / 10000,
      n: inputs.boss_mcq_total ?? null,
      threshold: t.boss_mcq_traceable_rate,
      op: ">=",
      status,
    });
  }

  // Determine failing keys: 'fail' or 'missing' counts as failing
  const failing: string[] = [];
  for (const m of metrics) {
    if (m.status === "fail" || m.status === "missing") {
      failing.push(m.key);
    }
  }

  const passed = failing.length === 0;

  return {
    metrics,
    passed,
    failing,
  };
}
