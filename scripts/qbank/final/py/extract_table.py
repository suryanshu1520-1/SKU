from collections import Counter
import json
import math
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
        map_header,
        norm_header,
        run_dir,
        write_json_atomic,
        write_jsonl_atomic,
    )
except ModuleNotFoundError:
    from common import (
        assert_run_dir_safe,
        latest_acquisitions,
        map_header,
        norm_header,
        run_dir,
        write_json_atomic,
        write_jsonl_atomic,
    )


def extract_table_document(
    doc_id: str,
    sha256: str,
    pdf_path: Path,
    profile_data: Dict[str, Any],
    expected_n: int,
) -> Tuple[str, List[Dict[str, Any]], Dict[str, Any]]:
    unmapped_headers = profile_data.get("unmapped_headers", [])
    if unmapped_headers:
        report_entry = {
            "document_id": doc_id,
            "status": "BLOCKED_UNMAPPED_HEADER",
            "items": 0,
            "missing": list(range(1, expected_n + 1)),
            "duplicates": [],
            "out_of_order": [],
            "empty_question": [],
            "empty_answer": [],
            "unaligned_cells": 0,
            "orphan_rows": 0,
            "continuation_rows_merged": 0,
            "excluded_cols": [],
            "foreign_tables_skipped": 0,
            "doc_agreement": 0.0,
            "geometry_unverifiable": True,
            "cell_gap_fill": 0,
            "cell_mismatch": 0,
        }
        return "BLOCKED_UNMAPPED_HEADER", [], report_entry

    hp = profile_data.get("header_page")
    if not hp:
        report_entry = {
            "document_id": doc_id,
            "status": "FAIL",
            "items": 0,
            "missing": list(range(1, expected_n + 1)),
            "duplicates": [],
            "out_of_order": [],
            "empty_question": [],
            "empty_answer": [],
            "unaligned_cells": 0,
            "orphan_rows": 0,
            "continuation_rows_merged": 0,
            "excluded_cols": [],
            "foreign_tables_skipped": 0,
            "doc_agreement": 0.0,
            "geometry_unverifiable": True,
            "cell_gap_fill": 0,
            "cell_mismatch": 0,
        }
        return "FAIL", [], report_entry

    doc = pymupdf.open(pdf_path)
    hp_page = doc[hp - 1]

    ref_table = None
    ref_headers_raw: List[Optional[str]] = []
    for t in hp_page.find_tables().tables:
        ext = t.extract()
        if not ext:
            continue
        r0 = ext[0]
        mapped = [map_header(c or "") for c in r0]
        mapped_set = {m for m in mapped if m and m != "EXCLUDED"}
        if {"qno", "question", "answer"}.issubset(mapped_set):
            ref_table = t
            ref_headers_raw = r0
            break

    if ref_table is None:
        doc.close()
        report_entry = {
            "document_id": doc_id,
            "status": "FAIL",
            "items": 0,
            "missing": list(range(1, expected_n + 1)),
            "duplicates": [],
            "out_of_order": [],
            "empty_question": [],
            "empty_answer": [],
            "unaligned_cells": 0,
            "orphan_rows": 0,
            "continuation_rows_merged": 0,
            "excluded_cols": [],
            "foreign_tables_skipped": 0,
            "doc_agreement": 0.0,
            "geometry_unverifiable": True,
            "cell_gap_fill": 0,
            "cell_mismatch": 0,
        }
        return "FAIL", [], report_entry

    ref_cols: List[Tuple[Optional[str], float, float]] = []
    excluded_cols_set: Set[str] = set()
    ref_header_norms: Set[str] = set()

    for j, (text, cell) in enumerate(zip(ref_headers_raw, ref_table.rows[0].cells)):
        if cell is not None:
            canon = map_header(text or "")
            if canon == "EXCLUDED" and text:
                excluded_cols_set.add(text)
            ref_cols.append((canon, cell[0], cell[2]))
            if text:
                ref_header_norms.add(norm_header(text))

    # Pre-cache page words and line words for geometry checking and gap-fill
    page_words: Dict[int, List[Tuple]] = {}
    page_line_words: Dict[int, Dict[Tuple[int, int], List[Tuple]]] = {}
    for p_idx in range(hp - 1, doc.page_count):
        p_num = p_idx + 1
        pw = doc[p_idx].get_text("words")
        page_words[p_num] = pw
        lw: Dict[Tuple[int, int], List[Tuple]] = {}
        for w in pw:
            lw.setdefault((w[5], w[6]), []).append(w)
        page_line_words[p_num] = lw

    items: List[Dict[str, Any]] = []
    current_item: Optional[Dict[str, Any]] = None
    unaligned_cells = 0
    orphan_rows = 0
    continuation_rows_merged = 0
    foreign_tables_skipped = 0

    seen_ref_table = False

    # Track column bounds per page: page_col_bounds[p_num][canon] = (min_x0, max_x1)
    page_col_bounds: Dict[int, Dict[str, Tuple[float, float]]] = {}

    for p_idx in range(hp - 1, doc.page_count):
        page_num = p_idx + 1
        page = doc[p_idx]

        page_rows = []
        for t in page.find_tables().tables:
            if not seen_ref_table:
                if p_idx == hp - 1 and t.bbox == ref_table.bbox:
                    seen_ref_table = True

            if seen_ref_table and t.bbox != ref_table.bbox:
                # Foreign table guard
                t_x0, t_x1 = t.bbox[0], t.bbox[2]
                overlapping_ref = [
                    c for c in ref_cols if max(0.0, min(t_x1, c[2]) - max(t_x0, c[1])) > 0
                ]
                n_ref = len(overlapping_ref) if overlapping_ref else len(ref_cols)
                min_cols = max(3, math.ceil(n_ref / 2))

                total_cells_with_bbox = 0
                assigned_cells_count = 0
                for row in t.rows:
                    for cell_bbox in row.cells:
                        if cell_bbox is not None:
                            cell_w = cell_bbox[2] - cell_bbox[0]
                            if cell_w > 0:
                                total_cells_with_bbox += 1
                                best_overlap = 0.0
                                best_canon = None
                                for canon_col, rx0, rx1 in ref_cols:
                                    overlap = max(
                                        0.0, min(cell_bbox[2], rx1) - max(cell_bbox[0], rx0)
                                    )
                                    if overlap > best_overlap:
                                        best_overlap = overlap
                                        best_canon = canon_col
                                if best_overlap >= 0.5 * cell_w and best_canon is not None:
                                    assigned_cells_count += 1
                aligned_fraction = (
                    (assigned_cells_count / total_cells_with_bbox)
                    if total_cells_with_bbox > 0
                    else 0.0
                )
                t_ext = t.extract()
                has_qno = any(
                    r and r[0] and re.match(r"^\d{1,3}\.?$", r[0].strip())
                    for r in t_ext
                )
                if not has_qno:
                    t_txt = " ".join((c or "") for r in t_ext for c in r)
                    norm_t = re.sub(r"\s+", " ", t_txt).strip().lower()
                    summary_pats = [
                        r"g+r+a+n+d+\s*t+o+t+a+l+",
                        r"total\s*questions?",
                        r"n[u\s]*m[b\s]*e[r\s]*\s*of\s*questions?",
                        r"section\s*wise",
                        r"\bdifficult\b.*\bmedium\b",
                        r"\btopic\b.*\b(difficult|medium|easy)\b",
                        r"row\s+labels\b",
                        r"\btopic\b.*\bcount\b",
                        r"essential\s+material",
                    ]
                    has_summary = any(
                        re.search(pat, norm_t, re.IGNORECASE) for pat in summary_pats
                    )
                else:
                    has_summary = False
                if t.col_count < min_cols or aligned_fraction < 0.5 or has_summary:
                    foreign_tables_skipped += 1
                    warn_str = f"foreign_table_skipped: p{page_num} col_count={t.col_count} aligned={round(aligned_fraction, 3)}"
                    if current_item is not None:
                        current_item["warnings"].append(warn_str)
                    elif items:
                        items[-1]["warnings"].append(warn_str)
                    continue


            texts = t.extract()
            rows_cells = t.rows
            for r_idx, row_text in enumerate(texts):
                cells_bbox = rows_cells[r_idx].cells
                valid_cells = [c for c in cells_bbox if c is not None]
                if not valid_cells:
                    continue
                row_y0 = min(c[1] for c in valid_cells)
                row_y1 = max(c[3] for c in valid_cells)
                row_x0 = min(c[0] for c in valid_cells)

                # Record page_col_bounds
                for j, cell_bbox in enumerate(cells_bbox):
                    if cell_bbox is not None and (cell_bbox[2] - cell_bbox[0]) > 0:
                        cell_w = cell_bbox[2] - cell_bbox[0]
                        best_overlap = 0.0
                        best_canon = None
                        for canon_col, rx0, rx1 in ref_cols:
                            overlap = max(
                                0.0, min(cell_bbox[2], rx1) - max(cell_bbox[0], rx0)
                            )
                            if overlap > best_overlap:
                                best_overlap = overlap
                                best_canon = canon_col
                        if (
                            best_overlap >= 0.5 * cell_w
                            and best_canon is not None
                            and best_canon != "EXCLUDED"
                        ):
                            if page_num not in page_col_bounds:
                                page_col_bounds[page_num] = {}
                            if best_canon not in page_col_bounds[page_num]:
                                page_col_bounds[page_num][best_canon] = (
                                    cell_bbox[0],
                                    cell_bbox[2],
                                )
                            else:
                                cur_x0, cur_x1 = page_col_bounds[page_num][best_canon]
                                page_col_bounds[page_num][best_canon] = (
                                    min(cur_x0, cell_bbox[0]),
                                    max(cur_x1, cell_bbox[2]),
                                )

                page_rows.append((row_y0, row_x0, row_y1, row_text, cells_bbox))

        page_rows.sort(key=lambda r: (round(r[0], 1), round(r[1], 1)))

        for row_y0, row_x0, row_y1, row_text, cells_bbox in page_rows:
            non_empty_cells = [c for c in row_text if c and c.strip()]
            if non_empty_cells:
                header_matches = sum(
                    1
                    for c in non_empty_cells
                    if norm_header(c) in ref_header_norms or map_header(c) is not None
                )
                if header_matches / len(non_empty_cells) >= 0.6:
                    continue

            row_mapped: Dict[str, str] = {}
            row_cols_assigned: Set[str] = set()

            for j, c_text in enumerate(row_text):
                cell_bbox = cells_bbox[j]
                if cell_bbox is None:
                    continue
                cell_w = cell_bbox[2] - cell_bbox[0]
                if cell_w <= 0:
                    continue

                best_overlap = 0.0
                best_canon: Optional[str] = None
                for canon_col, rx0, rx1 in ref_cols:
                    overlap = max(
                        0.0, min(cell_bbox[2], rx1) - max(cell_bbox[0], rx0)
                    )
                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_canon = canon_col

                if best_overlap >= 0.5 * cell_w and best_canon is not None:
                    if best_canon != "EXCLUDED":
                        row_cols_assigned.add(best_canon)
                        t_str = c_text or ""
                        if best_canon not in row_mapped:
                            row_mapped[best_canon] = t_str
                        else:
                            if t_str:
                                row_mapped[best_canon] += " " + t_str
                else:
                    unaligned_cells += 1
                    if current_item is not None:
                        current_item["warnings"].append(
                            f"unaligned_cell: p{page_num} [{round(cell_bbox[0],1)}, {round(cell_bbox[1],1)}, {round(cell_bbox[2],1)}, {round(cell_bbox[3],1)}]"
                        )

            qno_text = row_mapped.get("qno", "").strip()
            qno_match = re.match(r"^(\d{1,3})\s*\.?$", qno_text)

            if qno_match:
                q = int(qno_match.group(1))
                if 1 <= q <= expected_n:
                    if current_item is None or q > current_item["qno"]:
                        if current_item is not None:
                            items.append(current_item)
                        current_item = {
                            "document_id": doc_id,
                            "sha256": sha256,
                            "qno": q,
                            "cells": {
                                k: v
                                for k, v in row_mapped.items()
                                if k != "qno"
                            },
                            "pages": [page_num],
                            "bboxes": {},
                            "figure_regions": [],
                            "warnings": [],
                            "_page_y_extents": {page_num: (row_y0, row_y1)},
                            "_page_cols": {page_num: {k for k in row_cols_assigned if k != "qno"}},
                        }
            else:
                has_content = any(v.strip() for v in row_mapped.values())
                if not has_content:
                    continue
                if current_item is None:
                    orphan_rows += 1
                else:
                    if (
                        current_item["qno"] == expected_n
                        and page_num > current_item["pages"][-1] + 1
                    ):
                        continue
                    continuation_rows_merged += 1
                    if page_num not in current_item["pages"]:
                        current_item["pages"].append(page_num)
                    for k, v in row_mapped.items():
                        if k == "qno":
                            continue
                        if (
                            k in current_item["cells"]
                            and current_item["cells"][k].strip()
                        ):
                            if v.strip():
                                current_item["cells"][k] += "\n" + v
                        else:
                            if v.strip():
                                current_item["cells"][k] = v

                    if page_num not in current_item["_page_y_extents"]:
                        current_item["_page_y_extents"][page_num] = (row_y0, row_y1)
                        current_item["_page_cols"][page_num] = set()
                    else:
                        cur_min_y, cur_max_y = current_item["_page_y_extents"][page_num]
                        current_item["_page_y_extents"][page_num] = (
                            min(cur_min_y, row_y0),
                            max(cur_max_y, row_y1),
                        )
                    current_item["_page_cols"][page_num].update(
                        {k for k in row_cols_assigned if k != "qno"}
                    )

    if current_item is not None:
        items.append(current_item)

    # Compute band bboxes for each item: [p_num, x0, top_y0, x1, bottom_y1]
    for item in items:
        item["pages"] = sorted(list(set(item["pages"])))
        item_bboxes: Dict[str, List[List[Any]]] = {}
        for p_num in item["pages"]:
            if p_num in item.get("_page_y_extents", {}):
                top_y0, bottom_y1 = item["_page_y_extents"][p_num]
                for col in item.get("_page_cols", {}).get(p_num, set()):
                    matched_ref = [c for c in ref_cols if c[0] == col]
                    rx0 = matched_ref[0][1] if matched_ref else 0.0
                    rx1 = matched_ref[0][2] if matched_ref else 0.0
                    if p_num in page_col_bounds and col in page_col_bounds[p_num]:
                        col_x0, col_x1 = page_col_bounds[p_num][col]
                        col_x0 = min(col_x0, rx0)
                        col_x1 = max(col_x1, rx1)
                    else:
                        col_x0 = rx0
                        col_x1 = rx1
                    band = [p_num, col_x0, top_y0, col_x1, bottom_y1]
                    item_bboxes.setdefault(col, []).append(band)
        item["bboxes"] = item_bboxes
        if "_page_y_extents" in item:
            del item["_page_y_extents"]
        if "_page_cols" in item:
            del item["_page_cols"]

    # Compute figure regions
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
            for img_info in p_obj.get_image_info():
                bbox = img_info.get("bbox")
                if not bbox:
                    continue
                img_rect = pymupdf.Rect(bbox)
                img_area = img_rect.width * img_rect.height
                if img_area >= 0.60 * p_area:
                    continue
                if any(img_rect.intersects(qb) for qb in q_bboxes):
                    item["figure_regions"].append(
                        [
                            p_num,
                            img_rect.x0,
                            img_rect.y0,
                            img_rect.x1,
                            img_rect.y1,
                        ]
                    )

    def get_tok(s: str) -> Counter:
        return Counter(re.findall(r"[a-z]{3,}", s.lower()))

    def is_token_subset(tok_A: Counter, tok_B: Counter) -> bool:
        b_counts = dict(tok_B)
        for t in tok_A:
            avail = sum(c for bt, c in b_counts.items() if (bt.startswith(t) or t in bt))
            if avail == 0:
                return False
        return True


    # Agreement gate (per document)
    satisfied_count = 0
    total_q_items = len(items)

    for item in items:
        A = item["cells"].get("question", "")
        tok_A = get_tok(A)
        bands = item["bboxes"].get("question", [])
        b_words = []
        for band in bands:
            p_num, bx0, by0, bx1, by1 = band
            for w in page_words.get(p_num, []):
                cx = (w[0] + w[2]) / 2.0
                cy = (w[1] + w[3]) / 2.0
                if bx0 <= cx <= bx1 and by0 <= cy <= by1:
                    b_words.append(w)
        b_words.sort(key=lambda w: (w[1], w[0]))
        tok_B = get_tok(" ".join(w[4] for w in b_words))
        if is_token_subset(tok_A, tok_B):
            satisfied_count += 1

    doc_agreement = (satisfied_count / total_q_items) if total_q_items > 0 else 1.0
    geometry_unverifiable = (doc_agreement < 0.80)

    # Gap-fill (B) if doc_agreement >= 0.80
    cell_gap_fill_count = 0
    cell_mismatch_count = 0

    if not geometry_unverifiable:
        for item in items:
            q = item["qno"]
            for col in list(item["cells"].keys()):
                A = item["cells"][col]
                tok_A = get_tok(A)
                bands = item["bboxes"].get(col, [])
                if not bands:
                    continue

                b_words_by_page = {}
                for band in bands:
                    p_num, bx0, by0, bx1, by1 = band
                    pw = page_words.get(p_num, [])
                    plw = page_line_words.get(p_num, {})

                    collected = []
                    for w in pw:
                        cx = (w[0] + w[2]) / 2.0
                        cy = (w[1] + w[3]) / 2.0
                        if bx0 <= cx <= bx1 and by0 <= cy <= by1:
                            collected.append(w)
                    b_words_by_page[p_num] = (band, collected, plw)

                all_b_words = []
                for p_num in sorted(b_words_by_page.keys()):
                    all_b_words.extend(b_words_by_page[p_num][1])

                tok_B = get_tok(" ".join(w[4] for w in all_b_words))
                diff = tok_B - tok_A
                diff_count = sum(diff.values())

                can_gap_fill = False
                if is_token_subset(tok_A, tok_B) and diff_count >= 1:
                    all_lines_contained = True
                    for p_num, (band, collected, plw) in b_words_by_page.items():
                        bx0, by0, bx1, by1 = band[1], band[2], band[3], band[4]
                        for w in collected:
                            w_toks = re.findall(r"[a-z]{3,}", w[4].lower())
                            if any(t in diff for t in w_toks):
                                line_words = plw.get((w[5], w[6]), [])
                                for lw in line_words:
                                    lcx = (lw[0] + lw[2]) / 2.0
                                    lcy = (lw[1] + lw[3]) / 2.0
                                    if not (bx0 <= lcx <= bx1 and by0 <= lcy <= by1):
                                        all_lines_contained = False
                                        break
                            if not all_lines_contained:
                                break
                        if not all_lines_contained:
                            break
                    if all_lines_contained:
                        can_gap_fill = True

                if can_gap_fill:
                    lines_grouped: Dict[Tuple[int, int, int], List[Tuple]] = {}
                    for p_num in sorted(b_words_by_page.keys()):
                        for w in b_words_by_page[p_num][1]:
                            lines_grouped.setdefault((p_num, w[5], w[6]), []).append(w)
                    sorted_line_keys = sorted(
                        lines_grouped.keys(),
                        key=lambda k: (k[0], min(w[1] for w in lines_grouped[k]), min(w[0] for w in lines_grouped[k]))
                    )
                    formatted_lines = []
                    for k in sorted_line_keys:
                        line_w = sorted(lines_grouped[k], key=lambda w: (w[0], w[7]))
                        formatted_lines.append(" ".join(w[4] for w in line_w))
                    new_text = "\n".join(formatted_lines)
                    item["cells"][col] = new_text
                    cell_gap_fill_count += 1
                    item["warnings"].append(
                        f"cell_gap_fill: q{q} col={col} added_words={diff_count}"
                    )
                else:
                    if diff_count > 0:
                        cell_mismatch_count += 1
                        item["warnings"].append(f"cell_mismatch: {col}")

    doc.close()

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
        out_of_order = [q for i, q in enumerate(qnos) if i > 0 and q < qnos[i - 1]]

    empty_question = sorted(
        [
            it["qno"]
            for it in items
            if not it["cells"].get("question", "").strip()
        ]
    )
    empty_answer = sorted(
        [it["qno"] for it in items if not it["cells"].get("answer", "").strip()]
    )

    all_passed = (
        len(missing) == 0
        and len(duplicates) == 0
        and len(out_of_order) == 0
        and len(empty_question) == 0
        and len(empty_answer) == 0
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
        "empty_question": empty_question,
        "empty_answer": empty_answer,
        "unaligned_cells": unaligned_cells,
        "orphan_rows": orphan_rows,
        "continuation_rows_merged": continuation_rows_merged,
        "excluded_cols": sorted(list(excluded_cols_set)),
        "foreign_tables_skipped": foreign_tables_skipped,
        "doc_agreement": round(doc_agreement, 4),
        "geometry_unverifiable": geometry_unverifiable,
        "cell_gap_fill": cell_gap_fill_count,
        "cell_mismatch": cell_mismatch_count,
    }

    return status, items, report_entry



def run_table_extractor() -> List[Dict[str, Any]]:
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

        if profile_data.get("family") != "TABLE":
            continue

        paper = census_row.get("paper", "")
        expected_n = 80 if ("GS-2" in paper or "CSAT" in paper) else 100

        local_path = r_dir / acq_row["path"]
        status, items, rep = extract_table_document(
            doc_id, sha256, local_path, profile_data, expected_n
        )

        rows_path = r_dir / "extracted" / f"{sha256}.rows.jsonl"
        items.sort(key=lambda x: x["qno"])
        write_jsonl_atomic(rows_path, items)

        reports.append(rep)

    rep_path = r_dir / "reports" / "extract-table.json"
    write_json_atomic(rep_path, reports)
    return reports


if __name__ == "__main__":
    rep = run_table_extractor()
    print(f"Extracted {len(rep)} TABLE documents.")
    passed = sum(1 for r in rep if r["status"] == "PASS")
    failed = sum(1 for r in rep if r["status"] == "FAIL")
    blocked = sum(1 for r in rep if r["status"] == "BLOCKED_UNMAPPED_HEADER")
    print(f"Passed: {passed}, Failed: {failed}, Blocked: {blocked}")
    if failed > 0 or blocked > 0:
        sys.exit(1)
    sys.exit(0)
