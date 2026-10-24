from collections import Counter
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


def is_english_line(text: str) -> bool:
    alpha_chars = [c for c in text if c.isalpha()]
    if not alpha_chars:
        return False
    ascii_alphas = [c for c in alpha_chars if "a" <= c.lower() <= "z"]
    if len(ascii_alphas) / len(alpha_chars) < 0.8:
        return False
    tokens = re.findall(r"[A-Za-z]{2,}", text)
    return len(tokens) >= 3


def token_set_jaccard(s1: str, s2: str) -> float:
    t1 = set(re.findall(r"[a-z0-9]+", s1.lower()))
    t2 = set(re.findall(r"[a-z0-9]+", s2.lower()))
    if not (t1 | t2):
        return 1.0
    return len(t1 & t2) / len(t1 | t2)


def extract_single_mains_doc(
    doc_id: str,
    paper_slug: str,
    doc_path: Path,
    is_essay: bool,
) -> Tuple[str, Optional[str], List[Dict[str, Any]], float, List[str]]:
    doc = pymupdf.open(doc_path)
    total_pages = len(doc)
    raw_lines: List[Dict[str, Any]] = []
    full_doc_text = ""

    for pno, page in enumerate(doc):
        w = page.rect.width
        h = page.rect.height
        d = page.get_text("dict")
        full_doc_text += page.get_text() + "\n"
        page_spans: List[Dict[str, Any]] = []
        for b in d.get("blocks", []):
            if b.get("type") == 0:
                for l in b.get("lines", []):
                    for s in l.get("spans", []):
                        txt = s.get("text", "")
                        if txt and txt.strip():
                            bbox = s["bbox"]
                            cy = (bbox[1] + bbox[3]) / 2.0
                            page_spans.append({
                                "bbox": bbox,
                                "cy": cy,
                                "x0": bbox[0],
                                "y0": bbox[1],
                                "x1": bbox[2],
                                "y1": bbox[3],
                                "text": txt.strip(),
                            })

        # Group spans whose vertical centres differ by <= 3 pt, regardless of block
        page_spans.sort(key=lambda s: (s["cy"], s["x0"]))
        groups: List[List[Dict[str, Any]]] = []
        for s in page_spans:
            matched_g = None
            for g in groups:
                avg_cy = sum(item["cy"] for item in g) / len(g)
                if abs(s["cy"] - avg_cy) <= 3.0:
                    matched_g = g
                    break
            if matched_g is not None:
                matched_g.append(s)
            else:
                groups.append([s])

        # Sort visual line groups vertically
        groups.sort(key=lambda g: min(item["y0"] for item in g))

        for g in groups:
            # Order spans within a group by x
            g.sort(key=lambda s: s["x0"])

            line_bbox = [
                min(s["x0"] for s in g),
                min(s["y0"] for s in g),
                max(s["x1"] for s in g),
                max(s["y1"] for s in g),
            ]

            line_marks: Optional[float] = None
            # Marks tokens rule:
            # A number matching ^\d{1,3}(?:\.\d)?$ that either:
            # (a) ends a visual line with x0 >= 80% of page width, or
            # (b) forms a visual line on its own.
            # Spec Rule 3: Attach each marks token to the subpart, or question, whose English block it ends.
            if len(g) > 1 and g[-1]["x0"] >= 0.8 * w and re.match(r"^\d{1,3}(?:\.\d)?$", g[-1]["text"].strip()):
                m_txt = g[-1]["text"].strip()
                prefix_txt = " ".join(s["text"] for s in g[:-1])
                has_devanagari = any("\u0900" <= c <= "\u097f" for c in prefix_txt)
                if not has_devanagari:
                    line_marks = float(m_txt) if "." in m_txt else int(m_txt)
                    g.pop()
            elif len(g) == 1 and re.match(r"^\d{1,3}(?:\.\d)?$", g[0]["text"].strip()):
                m_txt = g[0]["text"].strip()
                line_marks = float(m_txt) if "." in m_txt else int(m_txt)
                g.pop()

            if not g and line_marks is not None:
                line_text = ""
            elif g:
                line_text = " ".join(s["text"] for s in g)
            else:
                continue

            raw_lines.append({
                "page": pno + 1,
                "page_h": h,
                "page_w": w,
                "bbox": line_bbox,
                "text": line_text,
                "marks_token": line_marks,
            })

    # Sort reading order: page, round(y/4), x
    raw_lines.sort(key=lambda x: (x["page"], round(x["bbox"][1] / 4.0), x["bbox"][0]))

    # Identify recurring furniture in page margins (top/bottom)
    margin_counts = Counter()
    for l in raw_lines:
        if l["text"] and (l["bbox"][1] <= 0.08 * l["page_h"] or l["bbox"][3] >= 0.92 * l["page_h"]):
            base = re.sub(r"\s+\d{1,3}\s*$", "", l["text"]).strip()
            if base:
                margin_counts[base] += 1

    drop_furn = {
        base
        for base, count in margin_counts.items()
        if count >= 2 and count >= 0.5 * total_pages
    }

    def is_furniture_line(txt: str, l_item: Dict[str, Any]) -> bool:
        if not txt:
            if l_item.get("marks_token") is not None and (
                l_item["bbox"][1] <= 0.04 * l_item["page_h"]
                or l_item["bbox"][3] >= 0.96 * l_item["page_h"]
            ):
                return True
            return False

        base = re.sub(r"\s+\d{1,3}\s*$", "", txt).strip()
        if base in drop_furn and (
            l_item["bbox"][1] <= 0.08 * l_item["page_h"]
            or l_item["bbox"][3] >= 0.92 * l_item["page_h"]
        ):
            return True
        if re.match(r"^\s*\d{1,3}\s*$", txt):
            # Page number drop in header/footer margin or matching page index
            if (
                l_item["bbox"][1] <= 0.04 * l_item["page_h"]
                or l_item["bbox"][3] >= 0.96 * l_item["page_h"]
                or int(txt) == l_item["page"]
            ):
                return True
        return False

    filtered_lines = [l for l in raw_lines if not is_furniture_line(l["text"], l)]

    # Essay instructions for word limits and marks
    essay_wl: Optional[int] = None
    essay_marks: Optional[float] = None
    if is_essay:
        m_wl = re.search(r"in\s+(?:about\s+)?(?:\d{3,4})\s*[-–]\s*(\d{3,4})\s*words", full_doc_text, re.I)
        if m_wl:
            essay_wl = int(m_wl.group(1))
        else:
            m_single = re.search(r"(?:not\s+more\s+than|about)\s+(\d{3,4})\s*words", full_doc_text, re.I)
            if m_single:
                essay_wl = int(m_single.group(1))

        m_m = re.search(r"(\d{3})\s*marks", full_doc_text, re.I)
        if m_m:
            essay_marks = float(m_m.group(1))
        else:
            m_f = re.search(r"(\d{2,3})\s*(?:[×*x]|&times;)\s*\d+\s*=\s*\d+", full_doc_text, re.I)
            if m_f:
                essay_marks = float(m_f.group(1))
            else:
                m_max = re.search(r"Maximum Marks\s*:\s*(\d+)", full_doc_text, re.I)
                if m_max:
                    essay_marks = float(m_max.group(1))

    items: List[Dict[str, Any]] = []
    current_sec: Optional[str] = None
    current_qno: Optional[int] = None
    next_expected: int = 1
    start_page: Optional[int] = None
    start_bbox: Optional[List[float]] = None
    start_sec: Optional[str] = None
    doc_warnings: Set[str] = set()

    # Per-question state
    q_has_english: bool = False
    case_study_lines: List[str] = []
    subparts: List[Dict[str, Any]] = []
    current_sub_label: Optional[str] = None
    current_sub_lines: List[str] = []
    current_sub_marks: Optional[float] = None
    current_sub_wl: Optional[int] = None
    q_standalone_marks: Optional[float] = None

    def clean_text_and_extract_meta(lines: List[str]) -> Tuple[str, Optional[int], Optional[float]]:
        full_text = " ".join(lines).strip()
        wl = essay_wl
        marks = essay_marks if is_essay else None

        if not is_essay:
            m_wl_match = re.search(r"\(\s*Answer\s+in\s+(\d+)\s+words\s*\)", full_text, re.I)
            if m_wl_match:
                wl = int(m_wl_match.group(1))
                m_marks_match = re.search(
                    r"\(\s*Answer\s+in\s+\d+\s+words\s*\)\s*(\d{1,3}(?:\.\d)?)", full_text, re.I
                )
                if m_marks_match and m_marks_match.group(1):
                    val = m_marks_match.group(1)
                    marks = float(val) if "." in val else int(val)

        clean = re.sub(r"\s*\(\s*Answer\s+in\s+\d+\s+words\s*\)\s*", " ", full_text, flags=re.I)
        if marks is None and not is_essay:
            m_end_marks = re.search(r"\s+(\d{1,3}(?:\.\d)?)\s*$", clean)
            if m_end_marks and m_end_marks.group(1):
                val = m_end_marks.group(1)
                marks = float(val) if "." in val else int(val)
        clean = re.sub(r"\s*\d{1,3}(?:\.\d)?\s*$", "", clean).strip()
        return clean, wl, marks

    def finalize_question() -> None:
        nonlocal current_qno, current_sec, start_sec, start_page, start_bbox
        nonlocal q_has_english, case_study_lines, subparts, current_sub_label
        nonlocal current_sub_lines, current_sub_marks, current_sub_wl, q_standalone_marks

        if current_qno is None:
            return

        # Save any in-flight subpart
        if current_sub_label is not None and current_sub_lines:
            c_text, c_wl, c_marks = clean_text_and_extract_meta(current_sub_lines)
            subparts.append({
                "label": current_sub_label,
                "clean_prompt": re.sub(r"^\(([a-h])\)\s*", "", c_text).strip(),
                "marks": current_sub_marks if current_sub_marks is not None else c_marks,
                "word_limit": current_sub_wl if current_sub_wl is not None else c_wl,
            })
            current_sub_label = None
            current_sub_lines = []
            current_sub_marks = None
            current_sub_wl = None

        sec = start_sec if start_sec is not None else current_sec

        # Decide whether to emit per-subpart or as single question
        if subparts:
            all_have_marks = all(sp.get("marks") is not None for sp in subparts)
            if all_have_marks:
                # Rule 4a: every subpart has its own marks token -> emit one record per subpart
                cs_intro = " ".join(case_study_lines).strip() or None
                for sp in subparts:
                    item_warnings = []
                    items.append({
                        "document_id": doc_id,
                        "paper_slug": paper_slug,
                        "question_number": current_qno,
                        "subpart": sp["label"],
                        "prompt": sp["clean_prompt"],
                        "case_study": cs_intro,
                        "word_limit": sp["word_limit"],
                        "marks_allotted": sp["marks"],
                        "section": sec,
                        "page": start_page,
                        "bbox": start_bbox,
                        "warnings": item_warnings,
                    })
            else:
                # Rule 4b: emit ONE record for the whole question (case study model)
                cs_text = " ".join(case_study_lines).strip() or None
                joined_prompts = []
                last_marks = subparts[-1].get("marks") if subparts[-1].get("marks") is not None else q_standalone_marks
                last_wl = None
                for sp in subparts:
                    joined_prompts.append(f"{sp['label']} {sp['clean_prompt']}")
                    if sp.get("word_limit") is not None:
                        last_wl = sp["word_limit"]

                item_warnings = []
                if last_marks is None:
                    item_warnings.append("marks_missing")
                    doc_warnings.add("marks_missing")

                items.append({
                    "document_id": doc_id,
                    "paper_slug": paper_slug,
                    "question_number": current_qno,
                    "subpart": None,
                    "prompt": "\n".join(joined_prompts),
                    "case_study": cs_text,
                    "word_limit": last_wl,
                    "marks_allotted": last_marks,
                    "section": sec,
                    "page": start_page,
                    "bbox": start_bbox,
                    "warnings": item_warnings,
                })
        elif case_study_lines:
            # Single question with no subparts
            c_text, c_wl, c_marks = clean_text_and_extract_meta(case_study_lines)
            marks = q_standalone_marks if q_standalone_marks is not None else c_marks
            if is_essay and marks is None:
                marks = essay_marks

            item_warnings = []
            if marks is None:
                item_warnings.append("marks_missing")
                doc_warnings.add("marks_missing")

            items.append({
                "document_id": doc_id,
                "paper_slug": paper_slug,
                "question_number": current_qno,
                "subpart": None,
                "prompt": c_text,
                "case_study": None,
                "word_limit": c_wl,
                "marks_allotted": marks,
                "section": sec,
                "page": start_page,
                "bbox": start_bbox,
                "warnings": item_warnings,
            })

        # Reset question state
        q_has_english = False
        case_study_lines = []
        subparts = []
        current_sub_label = None
        current_sub_lines = []
        current_sub_marks = None
        current_sub_wl = None
        q_standalone_marks = None

    for l in filtered_lines:
        txt = l["text"]
        m_tok = l.get("marks_token")

        is_eng = is_english_line(txt)
        if is_eng:
            q_has_english = True

        # Attach marks token if present and we are in English block
        if m_tok is not None and q_has_english:
            if current_sub_label is not None:
                current_sub_marks = m_tok
            else:
                q_standalone_marks = m_tok

        if not txt:
            continue

        # Check section headers
        m_sec = re.search(r"\bSECTION\s*[-–—:\u00b7]?\s*['\"‘“]?([AB])['\"’”]?\b", txt, re.I)
        if m_sec:
            finalize_question()
            current_qno = None
            new_sec = m_sec.group(1).upper()
            current_sec = new_sec
            if new_sec == "B":
                # Backfill Section A for earlier items if they were None
                for it in items:
                    if it.get("section") is None:
                        it["section"] = "A"
            continue

        # Check question number start
        m_q = re.match(r"^\s*(?:Q\s*\.?\s*)?(\d{1,2})\.(?:\s*\(|\s+|$)", txt, re.I)
        if m_q and (int(m_q.group(1)) == next_expected or (current_qno is None and not items)):
            finalize_question()
            current_qno = int(m_q.group(1))
            next_expected = current_qno + 1
            start_page = l["page"]
            start_bbox = l["bbox"]
            start_sec = current_sec

            remainder = txt[m_q.end():].strip()
            m_sub_initial = re.search(r"\(([a-h])\)", txt, re.I)
            if m_sub_initial:
                current_sub_label = f"({m_sub_initial.group(1).lower()})"
                remainder = re.sub(r"^\(([a-h])\)\s*", "", remainder, flags=re.I).strip()

            if remainder:
                if is_english_line(remainder) or not any("\u0900" <= c <= "\u097f" for c in remainder):
                    q_has_english = True
                    if current_sub_label is not None:
                        current_sub_lines.append(remainder)
                    else:
                        case_study_lines.append(remainder)
            continue

        if current_qno is not None:
            # Check subpart start
            m_sub = re.match(r"^\s*(?:(?:Q\s*\.?\s*)?\d{1,2}\.?\s*)?\(([a-h])\)(?:\s+|$)", txt, re.I)
            is_eng = is_english_line(txt)

            # A subpart boundary triggers if:
            # 1. line is English and starts with (a)-(h)
            # 2. line is non-English, starts with (a)-(h), AND we have already seen English lines in this question
            sub_trigger = False
            if m_sub:
                if is_eng:
                    sub_trigger = True
                elif q_has_english:
                    sub_trigger = True

            if sub_trigger:
                lbl = f"({m_sub.group(1).lower()})"
                if current_sub_label is not None:
                    c_text, c_wl, c_marks = clean_text_and_extract_meta(current_sub_lines)
                    subparts.append({
                        "label": current_sub_label,
                        "clean_prompt": re.sub(r"^\(([a-h])\)\s*", "", c_text).strip(),
                        "marks": current_sub_marks if current_sub_marks is not None else c_marks,
                        "word_limit": current_sub_wl if current_sub_wl is not None else c_wl,
                    })
                current_sub_label = lbl
                current_sub_lines = []
                current_sub_marks = None
                current_sub_wl = None

            if is_eng:
                q_has_english = True
                if current_sub_label is not None:
                    current_sub_lines.append(txt)
                else:
                    case_study_lines.append(txt)
            elif q_has_english:
                # English continuation check
                alpha_chars = [c for c in txt if c.isalpha()]
                ascii_alphas = [c for c in alpha_chars if "a" <= c.lower() <= "z"]
                is_ascii = len(alpha_chars) == 0 or (len(ascii_alphas) / len(alpha_chars) >= 0.8)
                if is_ascii and not re.match(r"^\s*(?:Q\s*\.?\s*)?\d{1,2}\.", txt):
                    if current_sub_label is not None:
                        current_sub_lines.append(txt)
                    else:
                        case_study_lines.append(txt)

    finalize_question()

    # Per-document gates
    marks_sum = sum(it["marks_allotted"] for it in items if it["marks_allotted"] is not None)
    status = "PASS"
    reason = None

    if is_essay:
        # At least 4 topics, contiguously numbered
        q_nums = [it["question_number"] for it in items]
        if len(items) < 4:
            status = "FAIL"
            reason = "essay_topics_count"
        elif q_nums != list(range(1, len(items) + 1)):
            status = "FAIL"
            reason = "numbering_not_contiguous"
    else:
        # GS-M1..GS-M4: contiguous from 1, sum of marks == 250
        q_distinct = sorted(list(set(it["question_number"] for it in items)))
        expected_seq = list(range(1, len(q_distinct) + 1))
        if q_distinct != expected_seq:
            status = "FAIL"
            reason = "numbering_not_contiguous"
        elif any(it["marks_allotted"] is None for it in items):
            status = "FAIL"
            reason = "marks_missing"
        elif marks_sum != 250:
            status = "FAIL"
            reason = "marks_sum"

    doc.close()
    return status, reason, items, marks_sum, sorted(list(doc_warnings))


def run_mains_extractor() -> Dict[str, Any]:
    assert_run_dir_safe()
    r_dir = run_dir()
    acqs = latest_acquisitions()

    mains_dir = r_dir / "mains"
    mains_dir.mkdir(parents=True, exist_ok=True)

    doc_reports: List[Dict[str, Any]] = []
    unresolved_docs: List[Dict[str, Any]] = []
    extracted_by_slug: Dict[str, Dict[str, List[Dict[str, Any]]]] = {}

    for doc_id, entry in sorted(acqs.items()):
        census_row = entry["census"]
        acq_row = entry["acquisition"]
        sha256 = acq_row.get("sha256", "")

        stage = census_row.get("stage")
        if stage != "Mains":
            continue

        prof_path = r_dir / "profiles" / f"{sha256}.json"
        family = "UNKNOWN"
        if prof_path.exists():
            with open(prof_path, "r", encoding="utf-8") as pf:
                prof_data = json.load(pf)
                family = prof_data.get("family", "UNKNOWN")

        if family in ("SCANNED", "UNKNOWN"):
            unresolved_docs.append({
                "document_id": doc_id,
                "family": family,
                "reason": "missing_source (not digitised)",
            })
            continue

        if family != "MAINS_TEXT":
            continue

        year = str(census_row.get("year", ""))
        paper = str(census_row.get("paper", ""))
        publisher = str(census_row.get("publisher", ""))
        paper_slug = f"{year}-{paper}"
        is_essay = "Essay" in paper

        doc_path = r_dir / acq_row["path"]
        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            doc_id, paper_slug, doc_path, is_essay
        )

        # Write output jsonl: mains/<year>-<paper>.<publisher>.jsonl
        out_filename = f"{year}-{paper}.{publisher}.jsonl"
        out_path = mains_dir / out_filename
        write_jsonl_atomic(out_path, items)

        if paper_slug not in extracted_by_slug:
            extracted_by_slug[paper_slug] = {}
        extracted_by_slug[paper_slug][publisher] = items

        report_entry: Dict[str, Any] = {
            "document_id": doc_id,
            "status": status,
            "prompts": len(items),
            "marks_sum": marks_sum,
            "warnings": warnings,
        }
        if reason is not None:
            report_entry["reason"] = reason

        null_records = [
            f"Q{it['question_number']}" + (f"{it['subpart']}" if it.get("subpart") else "")
            for it in items
            if it.get("marks_allotted") is None
        ]
        if null_records:
            report_entry["null_marks_records"] = null_records

        doc_reports.append(report_entry)

    # Corroboration pairs when paper slug has rows from more than one publisher
    for slug, pub_map in sorted(extracted_by_slug.items()):
        if len(pub_map) > 1:
            pub_names = sorted(list(pub_map.keys()))
            p1, p2 = pub_names[0], pub_names[1]
            rows1 = pub_map[p1]
            rows2 = pub_map[p2]

            dict1 = {(it["question_number"], it.get("subpart")): it for it in rows1}
            dict2 = {(it["question_number"], it.get("subpart")): it for it in rows2}

            all_keys = sorted(list(set(dict1.keys()) | set(dict2.keys())))
            pairs: List[Dict[str, Any]] = []
            unpaired: List[Dict[str, Any]] = []

            for key in all_keys:
                it1 = dict1.get(key)
                it2 = dict2.get(key)
                if it1 is not None and it2 is not None:
                    sim = token_set_jaccard(it1["prompt"], it2["prompt"])
                    pairs.append({
                        "question_number": key[0],
                        "subpart": key[1],
                        "similarity": round(sim, 4),
                        "prompts": {
                            p1: it1["prompt"],
                            p2: it2["prompt"],
                        },
                    })
                else:
                    unpaired.append({
                        "question_number": key[0],
                        "subpart": key[1],
                        "publisher": p1 if it1 is not None else p2,
                        "prompt": it1["prompt"] if it1 is not None else it2["prompt"],
                    })

            discrepant = [p for p in pairs if p["similarity"] < 0.9]

            pair_manifest = {
                "paper_slug": slug,
                "publishers": pub_names,
                "total_pairs": len(pairs),
                "discrepant_count": len(discrepant),
                "pairs": pairs,
                "discrepant_pairs": discrepant,
                "unpaired": unpaired,
            }
            write_json_atomic(mains_dir / f"{slug}.pairs.json", pair_manifest)

    # Master report
    full_report = {
        "documents": doc_reports,
        "unresolved": unresolved_docs,
    }
    write_json_atomic(r_dir / "reports" / "extract-mains.json", full_report)
    return full_report


if __name__ == "__main__":
    rep = run_mains_extractor()
    print(f"Mains extraction complete: {len(rep['documents'])} processed, {len(rep['unresolved'])} unresolved.")
