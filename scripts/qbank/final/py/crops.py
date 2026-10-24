import glob
import json
import os
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional

import pymupdf

try:
    from scripts.qbank.final.py.common import (
        assert_run_dir_safe,
        run_dir,
        write_json_atomic,
        write_jsonl_atomic,
    )
except ModuleNotFoundError:
    from common import (
        assert_run_dir_safe,
        run_dir,
        write_json_atomic,
        write_jsonl_atomic,
    )


def safe_id(s: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]", "_", s)


def run_crops(custom_run_dir: Optional[Path] = None) -> Dict[str, int]:
    r_dir = (custom_run_dir or run_dir()).resolve()
    assert_run_dir_safe()

    crops_dir = r_dir / "crops"
    crops_dir.mkdir(parents=True, exist_ok=True)
    conflicts_dir = r_dir / "conflicts"
    reports_dir = r_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    queue_path = conflicts_dir / "queue.jsonl"
    queue_items: List[Dict[str, Any]] = []
    if queue_path.exists():
        with open(queue_path, "r", encoding="utf-8") as f:
            for line in f:
                line_str = line.strip()
                if line_str:
                    queue_items.append(json.loads(line_str))

    # Map sha256 to pdf path
    pdf_by_sha: Dict[str, Path] = {}
    sources_dir = r_dir / "sources"
    if sources_dir.exists():
        for p in sources_dir.glob("*/*.pdf"):
            pdf_by_sha[p.stem] = p

    # Load envelope occurrences
    envelopes_by_occ_id: Dict[str, Dict[str, Any]] = {}
    occurrences_dir = r_dir / "occurrences"
    if occurrences_dir.exists():
        for p in occurrences_dir.glob("*/*.jsonl"):
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    line_str = line.strip()
                    if line_str:
                        env = json.loads(line_str)
                        occ_id = env.get("occurrence", {}).get("occurrence_id")
                        if occ_id:
                            envelopes_by_occ_id[occ_id] = env

    doc_cache: Dict[str, pymupdf.Document] = {}

    def get_doc(sha: str) -> Optional[pymupdf.Document]:
        if sha in doc_cache:
            return doc_cache[sha]
        p_path = pdf_by_sha.get(sha)
        if not p_path or not p_path.exists():
            return None
        doc = pymupdf.open(p_path)
        doc_cache[sha] = doc
        return doc

    queue_crops = 0
    figure_crops = 0
    full_page_fallbacks = 0
    no_region = 0
    missing_pdf = 0

    # 1. Render Item Crops
    for item in queue_items:
        occ_id = item.get("occurrence_id")
        if not occ_id:
            no_region += 1
            continue

        ev_list = item.get("evidence") or []
        if not ev_list:
            no_region += 1
            continue

        ev0 = ev_list[0]
        sha256 = ev0.get("sha256")
        page_num = ev0.get("page", 1)

        doc = get_doc(sha256)
        if not doc or page_num < 1 or page_num > len(doc):
            missing_pdf += 1
            continue

        page = doc[page_num - 1]

        # Determine clip rect
        env = envelopes_by_occ_id.get(occ_id)
        boxes: List[List[float]] = []
        if env and "bboxes" in env:
            env_bboxes = env.get("bboxes", {})
            for field in ["question", "answer"]:
                for b in env_bboxes.get(field, []):
                    if len(b) >= 5 and b[0] == page_num:
                        boxes.append(b[1:5])

        clip_rect: pymupdf.Rect
        if boxes:
            min_x0 = min(b[0] for b in boxes)
            min_y0 = min(b[1] for b in boxes)
            max_x1 = max(b[2] for b in boxes)
            max_y1 = max(b[3] for b in boxes)
            pad = 2.0
            clip_rect = pymupdf.Rect(
                max(0.0, min_x0 - pad),
                max(0.0, min_y0 - pad),
                min(page.rect.width, max_x1 + pad),
                min(page.rect.height, max_y1 + pad),
            )
        elif ev0.get("region") and "bbox: [" in ev0.get("region", ""):
            reg_str = ev0["region"]
            m_bbox = re.search(r"bbox:\s*\[([\d.,\s-]+)\]", reg_str)
            if m_bbox:
                coords = [float(x.strip()) for x in m_bbox.group(1).split(",")]
                clip_rect = pymupdf.Rect(coords[0], coords[1], coords[2], coords[3])
            else:
                clip_rect = page.rect
                full_page_fallbacks += 1
        else:
            clip_rect = page.rect
            full_page_fallbacks += 1

        pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=clip_rect)
        crop_filename = f"{safe_id(item['item_id'])}.png"
        crop_file_path = crops_dir / crop_filename
        pix.save(str(crop_file_path))

        item["crop"] = f"crops/{crop_filename}"
        queue_crops += 1

    # 2. Render Figure Crops
    for occ_id, env in envelopes_by_occ_id.items():
        fig_regions = env.get("figure_regions") or []
        if not fig_regions:
            continue

        occ = env.get("occurrence", {})
        ev = occ.get("evidence", {})
        sha256 = ev.get("sha256")
        if not sha256:
            continue

        doc = get_doc(sha256)
        if not doc:
            continue

        k = 1
        for reg in fig_regions:
            if len(reg) < 5:
                continue
            p_num, x0, y0, x1, y1 = reg[0], reg[1], reg[2], reg[3], reg[4]
            # Skip tiny watermark dots / patterns < 5 pt
            if (x1 - x0 < 5.0) or (y1 - y0 < 5.0):
                continue
            if p_num < 1 or p_num > len(doc):
                continue

            page = doc[p_num - 1]
            pad = 2.0
            rect = pymupdf.Rect(
                max(0.0, x0 - pad),
                max(0.0, y0 - pad),
                min(page.rect.width, x1 + pad),
                min(page.rect.height, y1 + pad),
            )
            pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=rect)
            fig_filename = f"fig-{safe_id(occ_id)}-{k}.png"
            pix.save(str(crops_dir / fig_filename))
            figure_crops += 1
            k += 1

    # Close open documents
    for doc in doc_cache.values():
        doc.close()

    # Rewrite queue.jsonl with crop paths populated
    if queue_items:
        write_jsonl_atomic(queue_path, queue_items)

    report = {
        "queue_crops": queue_crops,
        "figure_crops": figure_crops,
        "full_page_fallbacks": full_page_fallbacks,
        "no_region": no_region,
        "missing_pdf": missing_pdf,
    }

    report_path = reports_dir / "crops.json"
    write_json_atomic(report_path, report)

    return report


if __name__ == "__main__":
    rep = run_crops()
    print(f"Crops completed: {json.dumps(rep)}")
    sys.exit(0)
