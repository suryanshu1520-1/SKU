import os
from pathlib import Path
import re
import statistics
import sys
from typing import Any, Dict, List, Optional, Set

import pymupdf as fitz

from common import (
    assert_run_dir_safe,
    latest_acquisitions,
    map_header,
    run_dir,
    write_json_atomic,
)


def profile_pdf(
    pdf_path: Path,
    sha256: str,
    doc_ids: List[str],
    primary_stage: str,
) -> Dict[str, Any]:
    doc = fitz.open(str(pdf_path))

    forensics = {
        "producer": doc.metadata.get("producer", "") if doc.metadata else "",
        "creator": doc.metadata.get("creator", "") if doc.metadata else "",
        "creationDate": doc.metadata.get("creationDate", "") if doc.metadata else "",
        "modDate": doc.metadata.get("modDate", "") if doc.metadata else "",
        "page_count": doc.page_count,
        "is_encrypted": bool(doc.is_encrypted),
        "needs_pass": bool(doc.needs_pass),
    }

    page_chars: List[int] = []
    image_only_pages: List[int] = []
    all_page_texts: List[str] = []

    for p_idx in range(doc.page_count):
        page = doc[p_idx]
        text = page.get_text()
        all_page_texts.append(text)
        chars = len(text)
        page_chars.append(chars)
        imgs = len(page.get_images())

        if chars < 30 and imgs >= 1:
            image_only_pages.append(p_idx + 1)

    median_page_chars = int(statistics.median(page_chars)) if page_chars else 0

    # Header search on pages 1..min(15, n)
    header_page: Optional[int] = None
    header_raw: List[str] = []
    header_canonical: List[Optional[str]] = []
    unmapped_headers: List[str] = []

    search_pages = min(15, doc.page_count)
    for p_idx in range(search_pages):
        page = doc[p_idx]
        tabs = page.find_tables().tables
        for tab in tabs:
            extracted = tab.extract()
            if not extracted:
                continue
            first_row = extracted[0]
            if not first_row:
                continue

            mapped = [map_header(cell or "") for cell in first_row]
            canonical_set: Set[str] = {m for m in mapped if m and m != "EXCLUDED"}

            if {"qno", "question", "answer"}.issubset(canonical_set):
                header_page = p_idx + 1
                header_raw = [cell or "" for cell in first_row]
                header_canonical = mapped
                unmapped_headers = [
                    cell or ""
                    for cell, m in zip(first_row, mapped)
                    if m is None and (cell or "").strip()
                ]
                break
        if header_page is not None:
            break

    # tables_per_page from header_page onward
    table_ratio = 0.0
    if header_page is not None:
        pages_from_header = list(range(header_page - 1, doc.page_count))
        tables_per_page = [
            len(doc[p].find_tables().tables) for p in pages_from_header
        ]
        pages_with_table = sum(1 for cnt in tables_per_page if cnt >= 1)
        table_ratio = (
            pages_with_table / len(pages_from_header) if pages_from_header else 0.0
        )

    # legend_text: first page in 1..10 containing "Nature" and ("Difficulty" or "Level")
    legend_text = ""
    legend_limit = min(10, doc.page_count)
    for p_idx in range(legend_limit):
        text = all_page_texts[p_idx]
        if "Nature" in text and ("Difficulty" in text or "Level" in text):
            legend_text = text[:4000]
            break

    # linear check
    full_text = "\n".join(all_page_texts).replace("\r\n", "\n")
    qnum_regex = r"(?m)^\s*(?:Q\s*\.?\s*)?\d{1,3}\s*[.)](?:[ \t]|$)"
    ans_inline = (
        r"(?im)^\s*(?:Correct\s+(?:Answer|Option)|Answer|Ans)\s*[:.)\-]*\s*\(?[a-d]\)?\s*$"
    )
    ans_nextline = (
        r"(?im)^\s*(?:Correct\s+(?:Answer|Option)|Answer|Ans)\s*[:.)\-]*\s*\n\s*\(?[a-d]\)?\s*$"
    )

    linear_qnums = len(re.findall(qnum_regex, full_text))
    linear_answers = len(re.findall(ans_inline, full_text)) + len(
        re.findall(ans_nextline, full_text)
    )

    # Family determination (first match wins)
    family_evidence = {
        "median_page_chars": median_page_chars,
        "has_header": header_page is not None,
        "table_page_ratio": round(table_ratio, 3) if header_page is not None else 0.0,
        "linear_qnum_lines": linear_qnums,
        "linear_answer_lines": linear_answers,
        "stage": primary_stage,
    }

    # OCR text layer check (runs before every other family rule)
    ocr_pattern = r"(?i)paper capture|finereader|abbyy|tesseract|readiris|omnipage|\bocr\b"
    producer = forensics.get("producer") or ""
    creator = forensics.get("creator") or ""
    if re.search(ocr_pattern, producer) or re.search(ocr_pattern, creator):
        family = "SCANNED"
        family_evidence["ocr_text_layer"] = True
    elif median_page_chars < 50:
        family = "SCANNED"
    elif header_page is not None and table_ratio >= 0.5:
        family = "TABLE"
    elif linear_qnums >= 60 and linear_answers >= 60:
        family = "LINEAR"
    elif primary_stage == "Mains" and median_page_chars >= 200:
        family = "MAINS_TEXT"
    else:
        family = "UNKNOWN"

    return {
        "sha256": sha256,
        "document_ids": sorted(doc_ids),
        "forensics": forensics,
        "family": family,
        "family_evidence": family_evidence,
        "median_page_chars": median_page_chars,
        "image_only_pages": image_only_pages,
        "header_page": header_page,
        "header_raw": header_raw,
        "header_canonical": header_canonical,
        "unmapped_headers": unmapped_headers,
        "legend_text": legend_text,
    }


def run_profiler() -> Dict[str, Any]:
    assert_run_dir_safe()
    r_dir = run_dir()

    acqs = latest_acquisitions()

    # Group document_ids by sha256
    sha_to_docs: Dict[str, List[str]] = {}
    sha_to_path: Dict[str, str] = {}
    sha_to_stage: Dict[str, str] = {}
    doc_to_sha: Dict[str, str] = {}

    for doc_id, entry in acqs.items():
        acq_row = entry["acquisition"]
        census_row = entry["census"]
        sha256 = acq_row.get("sha256")
        if not sha256:
            continue
        doc_to_sha[doc_id] = sha256
        if sha256 not in sha_to_docs:
            sha_to_docs[sha256] = []
            sha_to_path[sha256] = acq_row.get("path", "")
            sha_to_stage[sha256] = census_row.get("stage", "")
        sha_to_docs[sha256].append(doc_id)

    profiles_by_sha: Dict[str, Dict[str, Any]] = {}
    profiles_dir = r_dir / "profiles"
    profiles_dir.mkdir(parents=True, exist_ok=True)

    print(f"[profiler] Profiling {len(sha_to_docs)} unique PDF documents...")

    for sha256, doc_ids in sorted(sha_to_docs.items()):
        stage = sha_to_stage[sha256]
        pdf_path = r_dir / sha_to_path[sha256]
        if not pdf_path.exists():
            print(f"[profiler:warn] File not found: {pdf_path}")
            continue

        profile = profile_pdf(pdf_path, sha256, doc_ids, stage)
        profiles_by_sha[sha256] = profile

        # Write profiles/<sha256>.json
        out_profile = profiles_dir / f"{sha256}.json"
        write_json_atomic(out_profile, profile)

    # Build profiles/summary.json sorted by document_id
    summary_rows: List[Dict[str, Any]] = []
    for doc_id in sorted(doc_to_sha.keys()):
        sha256 = doc_to_sha[doc_id]
        prof = profiles_by_sha.get(sha256)
        if not prof:
            continue
        summary_rows.append(
            {
                "document_id": doc_id,
                "sha256": sha256,
                "family": prof["family"],
                "pages": prof["forensics"]["page_count"],
                "median_page_chars": prof["median_page_chars"],
                "header_canonical": prof["header_canonical"],
                "unmapped_headers": prof["unmapped_headers"],
                "producer": prof["forensics"]["producer"],
            }
        )

    summary_file = profiles_dir / "summary.json"
    write_json_atomic(summary_file, summary_rows)

    # Build reports/profile.json
    counts_by_family: Dict[str, int] = {}
    docs_with_unmapped: List[Dict[str, Any]] = []
    unknown_or_scanned: List[Dict[str, Any]] = []

    for s_row in summary_rows:
        fam = s_row["family"]
        counts_by_family[fam] = counts_by_family.get(fam, 0) + 1

        if s_row["unmapped_headers"]:
            docs_with_unmapped.append(
                {
                    "document_id": s_row["document_id"],
                    "sha256": s_row["sha256"],
                    "unmapped_headers": s_row["unmapped_headers"],
                }
            )

        if fam in ("UNKNOWN", "SCANNED"):
            unknown_or_scanned.append(
                {
                    "document_id": s_row["document_id"],
                    "sha256": s_row["sha256"],
                    "family": fam,
                }
            )

    report_data = {
        "counts_by_family": counts_by_family,
        "documents_with_unmapped_headers": docs_with_unmapped,
        "unknown_or_scanned_documents": unknown_or_scanned,
    }

    report_file = r_dir / "reports" / "profile.json"
    write_json_atomic(report_file, report_data)

    return report_data


if __name__ == "__main__":
    report = run_profiler()
    import json

    print("\n--- Profile Report ---")
    print(json.dumps(report, sort_keys=True, indent=2))
