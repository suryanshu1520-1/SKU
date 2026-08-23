#!/usr/bin/env python3
"""Passive watcher: logs contract state transitions to the terminal.

Read-only. Never edits contracts or ACTIVE_PIPELINE.json — it only observes
02_CONTRACTS/{pending,active,completed} and prints when a task_id's status
or containing folder changes. Run alongside the Orchestrator/Antigravity
session for a live log; Ctrl+C to stop.
"""

import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTRACTS_DIR = ROOT / "02_CONTRACTS"
STAGES = ("pending", "active", "completed")
POLL_INTERVAL_SECONDS = 3

STATUS_RE = re.compile(r'^status:\s*"?([A-Z_]+)"?', re.MULTILINE)
TASK_ID_RE = re.compile(r'^task_id:\s*"?([\w-]+)"?', re.MULTILINE)


def read_contract(path):
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return None
    status_match = STATUS_RE.search(text)
    task_id_match = TASK_ID_RE.search(text)
    task_id = task_id_match.group(1) if task_id_match else path.stem
    status = status_match.group(1) if status_match else "UNKNOWN"
    return task_id, status


def scan():
    snapshot = {}
    for stage in STAGES:
        stage_dir = CONTRACTS_DIR / stage
        if not stage_dir.is_dir():
            continue
        for path in stage_dir.glob("*.md"):
            parsed = read_contract(path)
            if parsed is None:
                continue
            task_id, status = parsed
            snapshot[task_id] = {"stage": stage, "status": status}
    return snapshot


def log(message):
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}", flush=True)


def diff_and_report(previous, current):
    for task_id, state in current.items():
        prior = previous.get(task_id)
        if prior is None:
            log(f"NEW      {task_id}  -> {state['stage']}/{state['status']}")
        elif prior != state:
            log(
                f"TRANSITION {task_id}  "
                f"{prior['stage']}/{prior['status']} -> {state['stage']}/{state['status']}"
            )
    for task_id in previous:
        if task_id not in current:
            log(f"REMOVED  {task_id}")


def main():
    if not CONTRACTS_DIR.is_dir():
        print(f"No contracts directory at {CONTRACTS_DIR}", file=sys.stderr)
        return 1

    log("orchestrator_bridge watching 02_CONTRACTS/ (read-only, Ctrl+C to stop)")
    previous = scan()
    for task_id, state in previous.items():
        log(f"INITIAL  {task_id}  -> {state['stage']}/{state['status']}")

    try:
        while True:
            time.sleep(POLL_INTERVAL_SECONDS)
            current = scan()
            diff_and_report(previous, current)
            previous = current
    except KeyboardInterrupt:
        log("stopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
