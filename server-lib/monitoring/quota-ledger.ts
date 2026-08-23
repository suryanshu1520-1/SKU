/**
 * server-lib/monitoring/quota-ledger.ts
 *
 * Minimal append-only quota ledger for tracking model invocations and fallbacks (WS-0.3).
 * Records { model_id, timestamp, mode: "primary" | "fallback", caller, metadata? }
 */

import fs from "fs";
import path from "path";

export interface QuotaLedgerEntry {
  model_id: string;
  timestamp: string;
  mode: "primary" | "fallback";
  caller: string;
  metadata?: Record<string, any>;
}

const LEDGER_FILE = process.env.QUOTA_LEDGER_PATH || path.resolve(process.cwd(), "logs/quota-ledger.jsonl");

export function recordModelInvocation(entry: Omit<QuotaLedgerEntry, "timestamp">): void {
  try {
    const dir = path.dirname(LEDGER_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const fullEntry: QuotaLedgerEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    fs.appendFileSync(LEDGER_FILE, JSON.stringify(fullEntry) + "\n", "utf-8");
  } catch (err) {
    // Non-blocking logging failure
    console.error("[quota-ledger] Failed to record invocation:", err);
  }
}
