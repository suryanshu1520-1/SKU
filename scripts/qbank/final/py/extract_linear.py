import json
import os
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional, Set, Tuple

import pymupdf

try:
    from scripts.qbank.final.py.common import (
        assert_run_dir_safe,
        latest_acquisitions,
        run_dir,
        write_json_atomic,
        write_jsonl_atomic,
    )
except ModuleNotFoundError:
    from common import (
        assert_run_dir_safe,
        latest_acquisitions,
        run_dir,
        write_json_atomic,
        write_jsonl_atomic,
    )

ANS_INLINE = re.compile(
    r"^\s*(?:Correct\s+(?:Answer|Option)|Answer|Ans)\s*[:.)\-]*\s*(?:Option\s+)?\(?([a-dA-D](?:[\s*()/,a-dA-D]|\band\b|\bor\b)*)\)?\s*$",
    re.I,
)
ANS_BARE = re.compile(
    r"^\s*(?:Correct\s+(?:Answer|Option)|Answer|Ans)\s*[:.)\-]*\s*$",
    re.I,
)
ANS_LETTER = re.compile(
    r"^\s*(?:Option\s+)?\(?([a-dA-D](?:[\s*()/,a-dA-D]|\band\b|\bor\b)*)\)?\s*$",
    re.I,
)
Q_CANDIDATE = re.compile(
    r"^\s*(?:Q\s*\.?\s*)?(\d{1,3})(?:\s*[.)]|\s*$)(?:\s+(.*))?$",
    re.I,
)
Q_PREFIX = re.compile(
    r"^\s*Q\s*\.?\s*(\d{1,3})\s*[.)]?",
    re.I,
)
FURN_PAGE = re.compile(r"^\s*\d{1,3}\s*$")
FURN_VISION = re.compile(
    r"www\.visionias\.in|©\s*Vision\s*IAS|\bVision\s*IAS\b",
    re.I,
)
PASSAGE_HEAD_1 = re.compile(r"^\s*Passage\s*[-–—:\ufffd]?\s*$", re.I)
PASSAGE_HEAD_2 = re.compile(r"^\s*Passage\s*[-–—:\ufffd]?\s*(\d+|[IVX]+)\b", re.I)


def is_passage_heading(s: str) -> bool:
    return bool(PASSAGE_HEAD_1.match(s) or PASSAGE_HEAD_2.match(s))


DIR_RE = re.compile(
    r"^\s*Directions?\s+for\s+(?:(?:Read\s+)?the\s+)?(?:next|following|Read\s+the\s+following)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)",
    re.I,
)
INSTR_LINE_RE = re.compile(
    r"^(?:Directions?\s+for|Read\s+the\s+following|Your\s+answers?\s+(?:to\s+these\s+items\s+)?should\s+be|items\s+should\s+be|Consider\s+the\s+given\s+information|Each\s+item\s+in\s+this\s+section|follow\s*[.:]?$)",
    re.I,
)
MISSING_PASSAGE_RE = re.compile(r"(?i)\b(the|above|given)\s+passage")

WORD_NUMS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}


def ws(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s).strip()


EXP_LABEL = re.compile(
    r"^(?:Explanation|Exp|Solution|Sol)\s*[:.)\-]*\s*",
    re.I,
)


def extract_linear_document(
    doc_id: str,
    sha256: str,
    pdf_path: Path,
    profile_data: Dict[str, Any],
    expected_n: int,
) -> Tuple[str, List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
    doc = pymupdf.open(pdf_path)

    raw_lines: List[Dict[str, Any]] = []
    for pno, page in enumerate(doc):
        h = page.rect.height
        d = page.get_text("dict")
        for b in d.get("blocks", []):
            if b.get("type") == 0:
                for l in b.get("lines", []):
                    txt = "".join(s.get("text", "") for s in l.get("spans", [])).strip()
                    if not txt:
                        continue
                    raw_lines.append(
                        {
                            "page": pno + 1,
                            "page_h": h,
                            "bbox": l.get("bbox"),
                            "text": txt,
                        }
                    )

    # Group lines by visual line with vertical overlap tolerance, sorting left-to-right within each line
    pages_dict: Dict[int, List[Dict[str, Any]]] = {}
    for l in raw_lines:
        pages_dict.setdefault(l["page"], []).append(l)

    ordered_lines: List[Dict[str, Any]] = []
    for p in sorted(pages_dict.keys()):
        p_lines = pages_dict[p]
        p_lines.sort(key=lambda x: (x["bbox"][1], x["bbox"][0]))

        lines_groups: List[List[Dict[str, Any]]] = []
        for l in p_lines:
            y0, y1 = l["bbox"][1], l["bbox"][3]
            h = y1 - y0
            matched = False
            for grp in lines_groups:
                g_y0 = min(item["bbox"][1] for item in grp)
                g_y1 = max(item["bbox"][3] for item in grp)
                g_h = g_y1 - g_y0
                overlap = min(y1, g_y1) - max(y0, g_y0)
                if overlap > 0.4 * min(h, g_h):
                    grp.append(l)
                    matched = True
                    break
            if not matched:
                lines_groups.append([l])

        for grp in lines_groups:
            grp.sort(key=lambda x: x["bbox"][0])
            ordered_lines.extend(grp)

    raw_lines = ordered_lines

    # Identify furniture repeating top/bottom 4% across >= 50% of pages
    from collections import Counter

    top_bot_lines = Counter()
    total_pages = len(doc)
    for l in raw_lines:
        y0, y1 = l["bbox"][1], l["bbox"][3]
        h = l["page_h"]
        if y0 <= 0.04 * h or y1 >= 0.96 * h:
            top_bot_lines[l["text"]] += 1

    furniture_repeats = {
        txt
        for txt, count in top_bot_lines.items()
        if count >= 2 and count >= 0.5 * total_pages
    }

    filtered_lines: List[Dict[str, Any]] = []
    for l in raw_lines:
        txt = l["text"]
        # Drop page numbers in header/footer margin or matching page index
        if FURN_PAGE.match(txt) and (
            l["bbox"][1] <= 0.08 * l["page_h"]
            or l["bbox"][3] >= 0.92 * l["page_h"]
            or int(txt) == l["page"]
        ):
            continue
        # Drop visionias host or copyright branding
        if FURN_VISION.search(txt):
            continue
        # Drop recurring header/footer furniture
        if (
            l["bbox"][1] <= 0.04 * l["page_h"] or l["bbox"][3] >= 0.96 * l["page_h"]
        ) and txt in furniture_repeats:
            continue
        filtered_lines.append(l)

    prefix_count = sum(1 for l in filtered_lines if Q_PREFIX.match(l["text"]))
    prefix_mode = prefix_count >= 60

    candidates = []
    for l in filtered_lines:
        txt = l["text"]
        m = Q_CANDIDATE.match(txt)
        if m:
            if not prefix_mode or Q_PREFIX.match(txt):
                candidates.append((l["bbox"][0], int(m.group(1))))

    margin = 0
    if candidates:
        margin_counts = Counter(round(x0) for x0, q in candidates)
        margin = margin_counts.most_common(1)[0][0]

    raw_items: List[Dict[str, Any]] = []
    passages: List[Dict[str, Any]] = []
    current_item: Optional[Dict[str, Any]] = None
    current_passage: Optional[Dict[str, Any]] = None
    current_dir_block: Optional[Dict[str, Any]] = None
    current_state = "BEFORE_Q1"

    def is_q_start_candidate(line_dict: Dict[str, Any], next_exp: int) -> bool:
        t = line_dict["text"]
        m = Q_CANDIDATE.match(t)
        if not m:
            return False
        qn = int(m.group(1))
        is_pfx = bool(Q_PREFIX.match(t))
        allowed = (not prefix_mode) or is_pfx or (qn > 5)
        return allowed and abs(line_dict["bbox"][0] - margin) <= 6 and qn == next_exp

    i = 0
    while i < len(filtered_lines):
        line = filtered_lines[i]
        txt = line["text"]
        x0 = line["bbox"][0]

        # 1. Directions check (single line or wrapped across 2 lines)
        m_dir = None
        adv_dir = 1
        ws_txt = ws(txt)
        if re.match(r"^\s*Directions?\b", ws_txt, re.I):
            m_dir = DIR_RE.search(ws_txt)
            if not m_dir and i + 1 < len(filtered_lines):
                combined_txt = ws(txt + " " + filtered_lines[i + 1]["text"])
                m_dir = DIR_RE.search(combined_txt)
                if m_dir:
                    adv_dir = 2

        if m_dir:
            if (
                current_item is not None
                and not current_item.get("answer_seen")
                and current_item["qno"] == 1
            ):
                current_item = None

            # Explanation boundary: explanation ends at directions line
            if current_item is not None and current_state == "EXPLANATION":
                current_state = "IDLE"

            raw_c = m_dir.group(1).lower()
            count = int(raw_c) if raw_c.isdigit() else WORD_NUMS.get(raw_c, 1)
            next_exp = (current_item["qno"] + 1) if current_item else 1
            dir_text = ws(txt if adv_dir == 1 else (txt + " " + filtered_lines[i + 1]["text"]))

            # Look ahead to see if any line before next_exp question matches is_passage_heading
            has_heading_ahead = False
            for k in range(i + adv_dir, len(filtered_lines)):
                k_line = filtered_lines[k]
                if is_q_start_candidate(k_line, next_exp):
                    break
                if is_passage_heading(k_line["text"]):
                    has_heading_ahead = True
                    break

            current_dir_block = {
                "directions": dir_text,
                "start_qno": next_exp,
                "end_qno": next_exp + count - 1,
                "count": count,
                "headings_count": 0,
                "passages": [],
                "has_heading": has_heading_ahead,
            }
            current_passage = None
            current_state = "DIRECTIONS_SEEN"
            i += adv_dir
            continue

        # 2. Passage Heading check
        if is_passage_heading(txt):
            # Explanation boundary: explanation ends at passage heading
            if current_item is not None and current_state == "EXPLANATION":
                current_state = "IDLE"

            pid = f"{doc_id}#P{len(passages) + 1}"
            next_exp = (current_item["qno"] + 1) if current_item else 1

            # If no active directions block, create standalone block covering 1 item
            if current_dir_block is None or current_dir_block["end_qno"] < next_exp:
                current_dir_block = {
                    "directions": None,
                    "start_qno": next_exp,
                    "end_qno": next_exp,
                    "count": 1,
                    "headings_count": 0,
                    "passages": [],
                    "has_heading": True,
                }

            current_dir_block["headings_count"] += 1
            current_passage = {
                "passage_id": pid,
                "text": txt,
                "applies_to": [],
                "pages": [line["page"]],
                "bboxes": [[line["page"], *line["bbox"]]],
                "directions": current_dir_block["directions"],
            }
            passages.append(current_passage)
            current_dir_block["passages"].append(current_passage)
            current_state = "PASSAGE"
            i += 1
            continue

        # 3. Headingless passage start: ONLY when block has NO headings ahead
        if current_state == "DIRECTIONS_SEEN":
            if current_dir_block and not current_dir_block.get("has_heading"):
                if INSTR_LINE_RE.match(txt):
                    i += 1
                    continue
                next_exp = (current_item["qno"] + 1) if current_item else 1
                if not is_q_start_candidate(line, next_exp):
                    pid = f"{doc_id}#P{len(passages) + 1}"
                    current_passage = {
                        "passage_id": pid,
                        "text": txt,
                        "applies_to": [],
                        "pages": [line["page"]],
                        "bboxes": [[line["page"], *line["bbox"]]],
                        "directions": current_dir_block["directions"],
                    }
                    passages.append(current_passage)
                    current_dir_block["headings_count"] += 1
                    current_dir_block["passages"].append(current_passage)
                    current_state = "PASSAGE"
                    i += 1
                    continue
            else:
                # If block has headings ahead, skip directions prose until heading is reached
                if INSTR_LINE_RE.match(txt):
                    i += 1
                    continue

        # 4. Question Candidate check
        m_cand = Q_CANDIDATE.match(txt)
        is_start = False
        if m_cand:
            qnum = int(m_cand.group(1))
            is_q_prefixed = bool(Q_PREFIX.match(txt))
            allowed_prefix = (not prefix_mode) or is_q_prefixed or (qnum > 5)
            if allowed_prefix and abs(x0 - margin) <= 6:
                if (
                    current_item is not None
                    and not current_item.get("answer_seen")
                    and current_item["qno"] == 1
                    and qnum == 1
                ):
                    current_item = None
                next_expected = (current_item["qno"] + 1) if current_item else 1
                if qnum == next_expected:
                    if current_item is None or current_item.get("answer_seen"):
                        is_start = True

        if is_start:
            if current_item:
                raw_items.append(current_item)

            current_passage = None
            qnum = int(m_cand.group(1))

            # Passage linking
            pref = None
            inst_refs = []
            if current_dir_block and current_dir_block["start_qno"] <= qnum <= current_dir_block["end_qno"]:
                if current_dir_block["passages"]:
                    nearest_p = current_dir_block["passages"][-1]
                    pref = nearest_p["passage_id"]
                    nearest_p["applies_to"].append(qnum)
                if current_dir_block["directions"]:
                    inst_refs = [current_dir_block["directions"]]
            elif current_dir_block and qnum > current_dir_block["end_qno"]:
                current_dir_block = None

            remainder = m_cand.group(2) or ""
            q_lines = [remainder] if remainder.strip() else []
            q_bboxes = [[line["page"], *line["bbox"]]]

            current_item = {
                "qno": qnum,
                "question_lines": q_lines,
                "explanation_lines": [],
                "answer": None,
                "answer_seen": False,
                "pages": [line["page"]],
                "bboxes": {"question": q_bboxes},
                "passage_ref": pref,
                "instruction_refs": inst_refs,
            }
            current_state = "QUESTION"
            i += 1
            continue

        if current_state == "PASSAGE" and current_passage is not None:
            current_passage["text"] += "\n" + txt
            if line["page"] not in current_passage["pages"]:
                current_passage["pages"].append(line["page"])
            current_passage["bboxes"].append([line["page"], *line["bbox"]])
            i += 1
            continue

        if current_item is not None:
            if current_state == "QUESTION":
                m_ans = ANS_INLINE.match(txt)
                if m_ans:
                    raw_ans = m_ans.group(1).strip().strip("()")
                    current_item["answer"] = raw_ans.strip().lower()
                    current_item["answer_seen"] = True
                    current_state = "EXPLANATION"
                    i += 1
                    continue
                m_bare = ANS_BARE.match(txt)
                if m_bare and i + 1 < len(filtered_lines):
                    next_txt = filtered_lines[i + 1]["text"]
                    m_let = ANS_LETTER.match(next_txt)
                    if m_let:
                        raw_ans = m_let.group(1).strip().strip("()")
                        current_item["answer"] = raw_ans.strip().lower()
                        current_item["answer_seen"] = True
                        current_state = "EXPLANATION"
                        i += 2
                        continue
                current_item["question_lines"].append(txt)
                if line["page"] not in current_item["pages"]:
                    current_item["pages"].append(line["page"])
                current_item["bboxes"]["question"].append([line["page"], *line["bbox"]])
                i += 1
                continue
            elif current_state == "EXPLANATION":
                current_item["explanation_lines"].append(txt)
                if line["page"] not in current_item["pages"]:
                    current_item["pages"].append(line["page"])
                i += 1
                continue

        i += 1

    if current_item:
        raw_items.append(current_item)

    # Format items into output structure
    items: List[Dict[str, Any]] = []
    for it in raw_items:
        q_text = "\n".join(it["question_lines"]).strip()
        cells: Dict[str, Any] = {
            "question": q_text,
            "answer": it["answer"] or "",
        }
        exp_raw = "\n".join(it["explanation_lines"]).strip()
        if exp_raw:
            exp_clean = EXP_LABEL.sub("", exp_raw).strip()
            if exp_clean:
                cells["explanation"] = exp_clean

        # Compute per-page union bboxes for question
        per_page_bboxes: Dict[int, List[List[float]]] = {}
        for b in it["bboxes"]["question"]:
            p = b[0]
            per_page_bboxes.setdefault(p, []).append(b[1:5])

        union_q_bboxes: List[List[float]] = []
        for p in sorted(per_page_bboxes.keys()):
            boxes = per_page_bboxes[p]
            min_x0 = min(b[0] for b in boxes)
            min_y0 = min(b[1] for b in boxes)
            max_x1 = max(b[2] for b in boxes)
            max_y1 = max(b[3] for b in boxes)
            union_q_bboxes.append([p, min_x0, min_y0, max_x1, max_y1])

        warnings = []
        if not it.get("passage_ref"):
            collapsed_q = ws(q_text)
            if MISSING_PASSAGE_RE.search(collapsed_q):
                warnings.append("G_PASSAGE_MISSING")

        item_out = {
            "document_id": doc_id,
            "sha256": sha256,
            "qno": it["qno"],
            "cells": cells,
            "pages": sorted(list(set(it["pages"]))),
            "bboxes": {"question": union_q_bboxes},
            "figure_regions": [],
            "warnings": warnings,
        }
        if it.get("passage_ref"):
            item_out["passage_ref"] = it["passage_ref"]
        if it.get("instruction_refs"):
            item_out["instruction_refs"] = it["instruction_refs"]

        items.append(item_out)

    # Compute figure regions
    image_only_pages = set(profile_data.get("image_only_pages", []))
    for item in items:
        item_pages = item["pages"]
        for p_num in item_pages:
            p_obj = doc[p_num - 1]
            p_area = p_obj.rect.width * p_obj.rect.height
            q_bboxes = [
                pymupdf.Rect(b[1], b[2], b[3], b[4])
                for b in item["bboxes"].get("question", [])
                if b[0] == p_num
            ]
            if not q_bboxes:
                continue
            min_y = min(qb.y0 for qb in q_bboxes)
            max_y = max(qb.y1 for qb in q_bboxes)
            v_span = pymupdf.Rect(0, min_y, p_obj.rect.width, max_y)

            for img_info in p_obj.get_image_info():
                bbox = img_info.get("bbox")
                if not bbox:
                    continue
                img_rect = pymupdf.Rect(bbox)
                img_area = img_rect.width * img_rect.height
                if img_area >= 0.60 * p_area:
                    continue
                if img_rect.intersects(v_span):
                    item["figure_regions"].append(
                        [
                            p_num,
                            img_rect.x0,
                            img_rect.y0,
                            img_rect.x1,
                            img_rect.y1,
                        ]
                    )

            if p_num in image_only_pages:
                item["figure_regions"].append(
                    [
                        p_num,
                        0.0,
                        0.0,
                        p_obj.rect.width,
                        p_obj.rect.height,
                    ]
                )

    # Format passages
    formatted_passages: List[Dict[str, Any]] = []
    for p in passages:
        p_bboxes_by_page: Dict[int, List[List[float]]] = {}
        for b in p["bboxes"]:
            p_no = b[0]
            p_bboxes_by_page.setdefault(p_no, []).append(b[1:5])

        p_union_bboxes = []
        for p_no in sorted(p_bboxes_by_page.keys()):
            boxes = p_bboxes_by_page[p_no]
            p_union_bboxes.append(
                [
                    p_no,
                    min(b[0] for b in boxes),
                    min(b[1] for b in boxes),
                    max(b[2] for b in boxes),
                    max(b[3] for b in boxes),
                ]
            )

        p_entry = {
            "passage_id": p["passage_id"],
            "text": p["text"],
            "applies_to": p["applies_to"],
            "pages": sorted(list(set(p["pages"]))),
            "bboxes": p_union_bboxes,
        }
        if p.get("directions"):
            p_entry["directions"] = p["directions"]
        formatted_passages.append(p_entry)

    # Per-document check
    qnos = [it["qno"] for it in items]
    expected_set = set(range(1, expected_n + 1))
    actual_set = set(qnos)

    missing = sorted(list(expected_set - actual_set))
    seen_qnos: Set[int] = set()
    duplicates_set: Set[int] = set()
    for q in qnos:
        if q in seen_qnos:
            duplicates_set.add(q)
        seen_qnos.add(q)
    duplicates = sorted(list(duplicates_set))

    out_of_order = []
    if qnos != sorted(qnos):
        out_of_order = [q for idx, q in enumerate(qnos) if idx > 0 and q < qnos[idx - 1]]

    no_answer = sorted(
        [it["qno"] for it in items if not it["cells"].get("answer", "").strip()]
    )

    passage_mismatches = [
        p["passage_id"]
        for p in formatted_passages
        if not all(q in actual_set for q in p["applies_to"])
    ]

    all_passed = (
        len(missing) == 0
        and len(duplicates) == 0
        and len(out_of_order) == 0
        and len(no_answer) == 0
        and len(passage_mismatches) == 0
        and len(items) == expected_n
    )
    status = "PASS" if all_passed else "FAIL"

    report_entry = {
        "document_id": doc_id,
        "status": status,
        "items": len(items),
        "missing": missing,
        "duplicates": duplicates,
        "out_of_order": out_of_order,
        "no_answer": no_answer,
        "passages": len(formatted_passages),
        "passage_mismatches": passage_mismatches,
    }

    return status, items, formatted_passages, report_entry


def run_linear_extractor() -> List[Dict[str, Any]]:
    assert_run_dir_safe()
    r_dir = run_dir()
    acqs = latest_acquisitions()

    reports: List[Dict[str, Any]] = []

    for doc_id, entry in sorted(acqs.items()):
        census_row = entry["census"]
        acq_row = entry["acquisition"]
        sha256 = acq_row.get("sha256", "")

        stage = census_row.get("stage")
        if stage != "Prelims":
            continue

        prof_path = r_dir / "profiles" / f"{sha256}.json"
        if not prof_path.exists():
            continue

        with open(prof_path, "r", encoding="utf-8") as f:
            profile_data = json.load(f)

        if profile_data.get("family") != "LINEAR":
            continue

        paper = census_row.get("paper", "")
        expected_n = 80 if ("GS-2" in paper or "CSAT" in paper) else 100

        local_path = r_dir / acq_row["path"]
        status, items, passages, rep = extract_linear_document(
            doc_id, sha256, local_path, profile_data, expected_n
        )

        rows_path = r_dir / "extracted" / f"{sha256}.rows.jsonl"
        items.sort(key=lambda x: x["qno"])
        write_jsonl_atomic(rows_path, items)

        passages_path = r_dir / "extracted" / f"{sha256}.passages.jsonl"
        write_jsonl_atomic(passages_path, passages)

        reports.append(rep)

    rep_path = r_dir / "reports" / "extract-linear.json"
    write_json_atomic(rep_path, reports)
    return reports


if __name__ == "__main__":
    rep = run_linear_extractor()
    print(f"Extracted {len(rep)} LINEAR documents.")
    passed = sum(1 for r in rep if r["status"] == "PASS")
    failed = sum(1 for r in rep if r["status"] == "FAIL")
    print(f"Passed: {passed}, Failed: {failed}")
    for r in rep:
        print(f"  {r['document_id']}: status={r['status']}, items={r['items']}, passages={r['passages']}")
    if failed > 0:
        sys.exit(1)
    sys.exit(0)
