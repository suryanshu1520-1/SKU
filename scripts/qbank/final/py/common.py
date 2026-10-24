import json
import os
from pathlib import Path
import re
import subprocess
import time
from typing import Any, Dict, List, Optional, Tuple

REPO_ROOT = Path(__file__).resolve().parents[4]


class RunDirNotIgnoredError(Exception):
    pass


def run_dir() -> Path:
    env = os.environ.get("QBANK_RUN_DIR")
    if env and env.strip():
        return Path(env.strip()).resolve()
    return (REPO_ROOT / "_raw_source_archive" / "qbank-quality" / "final-2026-10").resolve()


def assert_run_dir_safe() -> None:
    r_dir = run_dir()
    repo_resolved = REPO_ROOT.resolve()
    try:
        r_dir.relative_to(repo_resolved)
        is_inside = True
    except ValueError:
        is_inside = False

    if is_inside:
        probe_path = r_dir / "__probe__.pdf"
        result = subprocess.run(
            ["git", "check-ignore", "-q", str(probe_path)],
            cwd=str(repo_resolved),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        if result.returncode != 0:
            raise RunDirNotIgnoredError(
                f"Run directory is inside repository but not gitignored: {r_dir}"
            )


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    if not path.exists():
        return rows
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line_str = line.strip()
            if line_str:
                rows.append(json.loads(line_str))
    return rows


def write_json_atomic(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(obj, sort_keys=True, ensure_ascii=False, indent=2) + "\n"
    tmp_path = path.with_name(f"{path.name}.tmp-{os.getpid()}-{int(time.time() * 1000)}")

    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)

    attempts = 0
    while True:
        try:
            os.replace(tmp_path, path)
            break
        except (PermissionError, OSError):
            if attempts < 3:
                attempts += 1
                time.sleep(0.5)
                continue
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass
            raise


def write_jsonl_atomic(path: Path, rows: List[Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_name(f"{path.name}.tmp-{os.getpid()}-{int(time.time() * 1000)}")

    with open(tmp_path, "w", encoding="utf-8") as f:
        for row in rows:
            line = json.dumps(row, sort_keys=True, ensure_ascii=False) + "\n"
            f.write(line)

    attempts = 0
    while True:
        try:
            os.replace(tmp_path, path)
            break
        except (PermissionError, OSError):
            if attempts < 3:
                attempts += 1
                time.sleep(0.5)
                continue
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass
            raise


def latest_acquisitions() -> Dict[str, Dict[str, Any]]:
    r_dir = run_dir()
    census_file = r_dir / "manifest" / "census.json"
    acq_file = r_dir / "manifest" / "acquisition.jsonl"

    if not census_file.exists():
        raise FileNotFoundError(f"Missing census file at {census_file}")
    if not acq_file.exists():
        raise FileNotFoundError(f"Missing acquisition file at {acq_file}")

    with open(census_file, "r", encoding="utf-8") as f:
        census_data = json.load(f)

    census_map = {row["document_id"]: row for row in census_data.get("rows", [])}

    latest_acq: Dict[str, Dict[str, Any]] = {}
    for row in read_jsonl(acq_file):
        doc_id = row.get("document_id")
        if not doc_id:
            continue
        status = row.get("status")
        if status in ("ok", "not_modified"):
            latest_acq[doc_id] = row

    combined: Dict[str, Dict[str, Any]] = {}
    for doc_id, acq_row in latest_acq.items():
        census_row = census_map.get(doc_id, {})
        combined[doc_id] = {
            "acquisition": acq_row,
            "census": census_row,
        }

    return combined


def norm_header(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


HEADER_SYNONYMS: Dict[str, str] = {
    # qno
    "qno": "qno",
    "qn": "qno",
    "qnno": "qno",
    "qsno": "qno",
    "questionno": "qno",
    "questionnumber": "qno",
    "sno": "qno",
    "slno": "qno",
    "no": "qno",
    # section
    "section": "section",
    "topics": "section",
    "subject": "section",
    "area": "section",
    "subjectarea": "section",
    # topic
    "topic": "topic",
    "subtopic": "topic",
    "subtopics": "topic",
    # question
    "question": "question",
    "questions": "question",
    # answer
    "answer": "answer",
    "answers": "answer",
    "ans": "answer",
    "key": "answer",
    "answerkey": "answer",
    "correctanswer": "answer",
    "correctoption": "answer",
    # explanation
    "explanation": "explanation",
    "explanations": "explanation",
    "exp": "explanation",
    "solution": "explanation",
    "solutions": "explanation",
    # level
    "level": "level",
    "difficulty": "level",
    "difficultylevel": "level",
    "levelofdifficulty": "level",
    # nature
    "nature": "nature",
    "natureofquestion": "nature",
    "natureofthequestion": "nature",
    # source
    "source": "source",
    "sources": "source",
    "reference": "source",
    "references": "source",
    "sourcelink": "source",
    "sourcelinks": "source",
    # source_type
    "sourcetype": "source_type",
    "broadsource": "source_type",
    "typeofsource": "source_type",
    # applicability
    "appuapp": "applicability",
}


def map_header(raw: str) -> Optional[str]:
    norm = norm_header(raw)
    if not norm:
        return None

    # Check EXCLUDED rules
    if (
        norm.startswith("visionias")
        or "testseries" in norm
        or norm.startswith("digitalcurrent")
        or norm.startswith("coverage")
        or "allindia" in norm
        or norm.startswith("pt365")
        or "sandhan" in norm
        or "abhyaas" in norm
    ):
        return "EXCLUDED"

    # Check motivation
    if norm.startswith("motivation"):
        return "motivation"

    # Exact dictionary match
    return HEADER_SYNONYMS.get(norm, None)
