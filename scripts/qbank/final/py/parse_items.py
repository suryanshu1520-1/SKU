import json
import os
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional, Set, Tuple
import unicodedata

from common import (
    assert_run_dir_safe,
    latest_acquisitions,
    read_jsonl,
    run_dir,
    write_json_atomic,
    write_jsonl_atomic,
)

BLOCKING_WARNINGS: Set[str] = {
    "G_OPTIONS",
    "G_GLYPH",
    "G_CONTAMINATION",
    "G_FIDELITY",
    "G_ANSWER_CELL",
}

STOP_WORDS: Set[str] = {
    "question",
    "questions",
    "which",
    "that",
    "is",
    "are",
    "like",
    "based",
    "from",
    "means",
}


def fid(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"[\s\-]+", "", s)


def ws(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s).strip()


def parse_legend(legend_text: str) -> Dict[str, str]:
    legend_map: Dict[str, str] = {}
    if not legend_text:
        return legend_map

    matches = re.findall(r"\b([A-Z]{1,4})\s*[:=]\s*([A-Z][^\n]{2,80})", legend_text)
    for code, text in matches:
        if code in legend_map:
            continue
        sub = re.split(r"[,.;(]", text, maxsplit=1)[0].strip()
        words = sub.split()
        label_words = []
        for w in words:
            clean_w = re.sub(r"[^a-zA-Z0-9]", "", w).lower()
            if clean_w in STOP_WORDS:
                break
            label_words.append(w)
            if len(label_words) == 4:
                break
        if not label_words:
            label_words = words[:1]
        raw_label = " ".join(label_words)
        canonical = re.sub(r"[^a-z0-9]+", "_", raw_label.lower()).strip("_")
        legend_map[code] = canonical
    return legend_map


def repair_characters(
    text: str,
    bboxes: Optional[List[Any]] = None,
    pdf_path: Optional[Path] = None,
    repairs: Optional[Dict[str, int]] = None,
) -> Tuple[str, Dict[str, int]]:
    if repairs is None:
        repairs = {}
    if not text:
        return "", repairs

    # (a) NFC. U+00A0 becomes a space. Strip trailing spaces on every line.
    norm = unicodedata.normalize("NFC", text).replace("\u00a0", " ")
    norm_lines = [line.rstrip(" ") for line in norm.splitlines()]
    norm = "\n".join(norm_lines)

    # (b) U+FFFD repair
    if "\ufffd" in norm and bboxes and pdf_path and pdf_path.exists():
        try:
            import pdfplumber

            with pdfplumber.open(str(pdf_path)) as pdf:
                cropped_segments = []
                for b in bboxes:
                    if len(b) >= 5:
                        p_idx = int(b[0]) - 1
                        x0, y0, x1, y1 = float(b[1]), float(b[2]), float(b[3]), float(b[4])
                        if 0 <= p_idx < len(pdf.pages):
                            page = pdf.pages[p_idx]
                            crop_box = (min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
                            c_text = page.crop(crop_box).extract_text()
                            if c_text:
                                cropped_segments.append(c_text)
                alt_text = "\n".join(cropped_segments)
                if "\ufffd" not in alt_text:
                    orig_ws_free = re.sub(r"\s+", "", norm)
                    alt_ws_free = re.sub(r"\s+", "", alt_text)
                    if len(orig_ws_free) == len(alt_ws_free):
                        is_match = all(
                            o == "\ufffd" or o == a
                            for o, a in zip(orig_ws_free, alt_ws_free)
                        )
                        if is_match:
                            rebuilt = []
                            k = 0
                            fixed_count = 0
                            for ch in norm:
                                if ch.isspace():
                                    rebuilt.append(ch)
                                else:
                                    if ch == "\ufffd":
                                        rebuilt.append(alt_ws_free[k])
                                        fixed_count += 1
                                    else:
                                        rebuilt.append(ch)
                                    k += 1
                            norm = "".join(rebuilt)
                            repairs["glyph_pdfplumber"] = repairs.get("glyph_pdfplumber", 0) + fixed_count
        except Exception:
            pass

    if "\ufffd" in norm:
        # Context rules in order:
        # 1. (?<=[A-Za-z])(?=[A-Za-z]) -> ’ (glyph_apostrophe)
        apostrophes = len(re.findall(r"(?<=[A-Za-z])\ufffd(?=[A-Za-z])", norm))
        if apostrophes > 0:
            norm = re.sub(r"(?<=[A-Za-z])\ufffd(?=[A-Za-z])", "’", norm)
            repairs["glyph_apostrophe"] = repairs.get("glyph_apostrophe", 0) + apostrophes

        # 2. (^|\n)\s*\s+ -> \1• (glyph_bullet)
        bullets = len(re.findall(r"(?m)(^|\n)[ \t]*\ufffd\s+", norm))
        if bullets > 0:
            norm = re.sub(r"(?m)(^|\n)[ \t]*\ufffd\s+", r"\1• ", norm)
            repairs["glyph_bullet"] = repairs.get("glyph_bullet", 0) + bullets

        # 3. ([^\n]{1,120}) -> “\1” (glyph_quotes)
        quotes = len(re.findall(r"\ufffd([^\ufffd\n]{1,120})\ufffd", norm))
        if quotes > 0:
            norm = re.sub(r"\ufffd([^\ufffd\n]{1,120})\ufffd", r"“\1”", norm)
            repairs["glyph_quotes"] = repairs.get("glyph_quotes", 0) + quotes * 2

        # 4. \s\s ->  –  (glyph_dash)
        dashes = len(re.findall(r"\s\ufffd\s", norm))
        if dashes > 0:
            norm = re.sub(r"\s\ufffd\s", " – ", norm)
            repairs["glyph_dash"] = repairs.get("glyph_dash", 0) + dashes

    return norm, repairs


def build_document_vocab(
    raw_rows: List[Dict[str, Any]], passages_rows: List[Dict[str, Any]]
) -> Tuple[Set[str], Set[str]]:
    vocab: Set[str] = set()
    standalone_tokens: Set[str] = set()

    def process_text(t: str) -> None:
        norm = unicodedata.normalize("NFC", t).replace("\u00a0", " ")
        lines = norm.splitlines()
        for i, line in enumerate(lines):
            line_tokens = [m.lower() for m in re.findall(r"[A-Za-z]+(?:-[A-Za-z]+)*", line)]
            for tok in line_tokens:
                vocab.add(tok)
            if i > 0 and re.search(r"[A-Za-z]+$", lines[i - 1]):
                for tok in line_tokens[1:]:
                    standalone_tokens.add(tok)
            else:
                for tok in line_tokens:
                    standalone_tokens.add(tok)

    for r in raw_rows:
        for c in r.get("cells", {}).values():
            if c:
                process_text(c)
    for p in passages_rows:
        ptxt = p.get("text", "")
        if ptxt:
            process_text(ptxt)

    return vocab, standalone_tokens


def join_lines(
    text: str,
    vocab: Set[str],
    standalone_tokens: Set[str],
    is_table_stem: bool = False,
) -> str:
    if is_table_stem or not text:
        return text

    lines = text.split("\n")
    if not lines:
        return ""
    out = lines[0]
    for nxt in lines[1:]:
        m_x_hyphen = re.search(r"([A-Za-z]+)-$", out)
        m_x_plain = re.search(r"([A-Za-z]+)$", out)
        m_y = re.match(r"^\s*([a-z][A-Za-z]*)", nxt)

        if m_x_hyphen and m_y:
            x = m_x_hyphen.group(1)
            y = m_y.group(1)
            xy_hyphen = (x + "-" + y).lower()
            if xy_hyphen in vocab:
                out = out[:-1] + "-" + nxt.lstrip()
            else:
                out = out[:-1] + nxt.lstrip()
        elif m_x_plain and m_y:
            x = m_x_plain.group(1)
            y = m_y.group(1)
            xy = (x + y).lower()
            y_low = y.lower()
            if xy in vocab and y_low not in standalone_tokens:
                out = out + nxt.lstrip()
            else:
                out = out + " " + nxt.lstrip()
        else:
            out = out + " " + nxt.lstrip()
    return re.sub(r"[ \t]+", " ", out).strip()


def extract_source_urls(text: str) -> List[str]:
    if not text:
        return []
    lines = text.splitlines()
    reconstructed = []
    in_url = False
    cur = ""
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("http"):
            if cur:
                reconstructed.append(cur)
            cur = stripped
            in_url = True
        elif in_url and " " not in stripped and not stripped.startswith("http") and len(stripped) > 0:
            cur += stripped
        else:
            if cur:
                reconstructed.append(cur)
            cur = ""
            in_url = False
    if cur:
        reconstructed.append(cur)
    urls = []
    for r in reconstructed:
        urls.extend(re.findall(r"https?://\S+", r))
    return urls


def parse_question_cell(
    q_cell_norm: str,
    vocab: Set[str],
    standalone_tokens: Set[str],
    passage_ref: Optional[str] = None,
) -> Tuple[
    Dict[str, Any],
    Dict[str, Any],
    List[str],
]:
    warnings: List[str] = []

    # 1. Options extraction
    p1 = list(re.finditer(r"(?:(?<=\s)|^)\(([a-dA-D])\)\s*", q_cell_norm))
    matches = [(m.group(1).lower(), m.start(), m.end()) for m in p1]
    if not matches:
        p2 = list(re.finditer(r"(?m)^\s*([a-dA-D])[.)]\s", q_cell_norm))
        matches = [(m.group(1).lower(), m.start(), m.end()) for m in p2]

    def find_last(letter: str, before_pos: Optional[int] = None) -> Optional[Tuple[str, int, int]]:
        candidates = [
            m for m in matches if m[0] == letter and (before_pos is None or m[1] < before_pos)
        ]
        return candidates[-1] if candidates else None

    d = find_last("d")
    c = find_last("c", d[1] if d else None)
    b = find_last("b", c[1] if c else None)
    a = find_last("a", b[1] if b else None)

    options: List[Dict[str, str]] = []
    has_opt_error = False

    if a and b and c and d:
        stem_region = q_cell_norm[: a[1]].rstrip()
        raw_opts = [
            ("a", q_cell_norm[a[2]: b[1]].strip()),
            ("b", q_cell_norm[b[2]: c[1]].strip()),
            ("c", q_cell_norm[c[2]: d[1]].strip()),
            ("d", q_cell_norm[d[2]:].strip()),
        ]
        for k, v in raw_opts:
            joined_v = join_lines(v, vocab, standalone_tokens, is_table_stem=False)
            options.append({"key": k, "text": joined_v})
    else:
        has_opt_error = True
        warnings.append("G_OPTIONS")
        # Keep options found in order
        found = [m for m in (a, b, c, d) if m is not None]
        if found:
            stem_region = q_cell_norm[: found[0][1]].rstrip()
            for idx, curr in enumerate(found):
                nxt = found[idx + 1] if idx + 1 < len(found) else None
                end_idx = nxt[1] if nxt else len(q_cell_norm)
                raw_txt = q_cell_norm[curr[2]: end_idx].strip()
                joined_txt = join_lines(raw_txt, vocab, standalone_tokens, is_table_stem=False)
                options.append({"key": curr[0], "text": joined_txt})
        else:
            stem_region = q_cell_norm.rstrip()

    # Options guard: exactly 4 non-empty, pairwise distinct after fid
    if not has_opt_error:
        if (
            len(options) != 4
            or not all(fid(o["text"]) for o in options)
            or len(set(fid(o["text"]) for o in options)) != 4
        ):
            warnings.append("G_OPTIONS")

    # 2. Stem and Statements
    ws_stem_region = ws(stem_region)
    is_table_stem = bool(
        (re.search(r"List[\s-]*I\b", ws_stem_region) and re.search(r"List[\s-]*II\b", ws_stem_region))
        or re.search(r"following\s+pairs", ws_stem_region, re.IGNORECASE)
    )

    statements: Optional[List[str]] = None
    instruction_refs: Optional[List[str]] = None
    has_roman_and_arabic_labels = False

    CLOSING_PROMPT_RE = re.compile(
        r"(?i)\b("
        r"Which\s+(?:(?:one|two|three|four)\s+of\s+)?(?:the\s+|all\s+)?(?:statements|pairs|above|given|following|relationships|criteria)\b|"
        r"Which\s+(?:of|one\s+of)\s+the\b|"
        r"Which\s+of\s+these\b|"
        r"Who\s+among\s+the\s+above\b|"
        r"How\s+many\s+(?:of\s+(?:the|them|these)|pairs|statements)\b|"
        r"Select\s+(?:the\s+|eh\s+)?(?:correct\s+)?(?:answer|code)\b|"
        r"Choose\s+the\s+correct\b"
        r")"
    )

    if is_table_stem:
        m_prompt = CLOSING_PROMPT_RE.search(stem_region)
        if m_prompt and m_prompt.start() > 0:
            prompt_raw = stem_region[m_prompt.start():].strip()
            stem = stem_region[: m_prompt.start()].rstrip()
            joined_prompt = join_lines(prompt_raw, vocab, standalone_tokens, is_table_stem=False)
            instruction_refs = [joined_prompt]
        else:
            stem = stem_region
    else:
        stmt_re = re.compile(r"^\s*(\d{1,2}|I|II|III|IV|V|VI|VII|VIII)\s*[.)]\s+\S")
        lines = stem_region.splitlines()
        matching_indices = [idx for idx, line in enumerate(lines) if stmt_re.match(line)]

        if len(matching_indices) >= 2:
            first_idx = matching_indices[0]
            stem_lead_lines = lines[:first_idx]
            stem_lead_raw = "\n".join(stem_lead_lines).rstrip()
            stem = join_lines(stem_lead_raw, vocab, standalone_tokens, is_table_stem=False)

            # Build statements
            stmts_raw: List[str] = []
            cur_stmt_lines: List[str] = []
            trailing_lines: List[str] = []
            in_trailing = False

            for idx in range(first_idx, len(lines)):
                line = lines[idx]
                if stmt_re.match(line):
                    if in_trailing:
                        # Back to statement line
                        cur_stmt_lines.extend(trailing_lines)
                        trailing_lines = []
                        in_trailing = False
                    if cur_stmt_lines:
                        stmts_raw.append("\n".join(cur_stmt_lines).rstrip())
                        cur_stmt_lines = []
                    cur_stmt_lines.append(line.rstrip())
                else:
                    if not in_trailing and CLOSING_PROMPT_RE.match(line.strip()):
                        in_trailing = True
                        trailing_lines.append(line.rstrip())
                    elif in_trailing:
                        trailing_lines.append(line.rstrip())
                    else:
                        cur_stmt_lines.append(line.rstrip())

            if in_trailing and trailing_lines:
                trailing_block = "\n".join(trailing_lines).strip()
                if cur_stmt_lines:
                    stmts_raw.append("\n".join(cur_stmt_lines).rstrip())
                joined_instr = join_lines(trailing_block, vocab, standalone_tokens, is_table_stem=False)
                instruction_refs = [joined_instr]
            elif cur_stmt_lines:
                stmts_raw.append("\n".join(cur_stmt_lines).rstrip())

            statements = [
                join_lines(s, vocab, standalone_tokens, is_table_stem=False)
                for s in stmts_raw
            ]

            # Splitting closing prompt from statements (checking from tail backwards)
            if statements:
                new_instruction_refs = []
                for s_idx in range(len(statements) - 1, -1, -1):
                    s = statements[s_idx]
                    m_close = CLOSING_PROMPT_RE.search(s)
                    if m_close:
                        head = s[: m_close.start()].strip()
                        stmt_body = re.sub(
                            r"^\s*(\d{1,2}|I|II|III|IV|V|VI|VII|VIII)\s*[.)]\s*",
                            "",
                            head,
                        ).strip()
                        if stmt_body:
                            prompt_text = s[m_close.start():].strip()
                            statements[s_idx] = head
                            new_instruction_refs.insert(0, prompt_text)
                        else:
                            prompt_text = s.strip()
                            statements.pop(s_idx)
                            new_instruction_refs.insert(0, prompt_text)
                if new_instruction_refs:
                    if instruction_refs:
                        instruction_refs = new_instruction_refs + instruction_refs
                    else:
                        instruction_refs = new_instruction_refs

            # Roman and arabic check
            has_arabic = any(re.match(r"^\s*\d{1,2}[.)]", s) for s in statements)
            has_roman = any(
                re.match(r"^\s*(I|II|III|IV|V|VI|VII|VIII)[.)]", s) for s in statements
            )
            has_roman_and_arabic_labels = has_arabic and has_roman
        else:
            stem = join_lines(stem_region, vocab, standalone_tokens, is_table_stem=False)

    # 3. Question type
    ws_full_q = ws(q_cell_norm)
    if re.search(r"Statement[\s-]*I\b.*Statement[\s-]*II\b", ws_full_q):
        q_type = "statement_i_ii"
    elif re.search(r"\bHow many (?:of the|pairs|statements)\b", ws_full_q, re.IGNORECASE) or re.search(r"\bhow many of the\b", ws_full_q, re.IGNORECASE):
        q_type = "how_many"
    elif re.search(r"List[\s-]*I\b", ws_full_q) and re.search(r"List[\s-]*II\b", ws_full_q):
        q_type = "match_list"
    elif re.search(r"following pairs", ws_full_q, re.IGNORECASE):
        q_type = "pairs"
    elif statements and len(statements) >= 2:
        q_type = "statements"
    elif re.search(r"Which one of the following", ws_full_q, re.IGNORECASE):
        q_type = "single_best"
    elif passage_ref is not None:
        q_type = "passage"
    else:
        q_type = "direct"

    text_dict = {
        "stem": stem,
        "statements": statements,
        "passage": None,  # populated by caller if passage_ref
        "options": options,
        "figures": None,
        "instruction_refs": instruction_refs,
    }

    parse_diag = {
        "question_type": q_type,
        "has_roman_and_arabic_labels": has_roman_and_arabic_labels,
    }

    return text_dict, parse_diag, warnings


def process_paper(
    census_row: Dict[str, Any],
    acq_row: Dict[str, Any],
    r_dir: Path,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    sha = acq_row.get("sha256") or census_row.get("sha256", "")
    doc_id = census_row["document_id"]
    year = int(census_row["year"])
    paper = census_row["paper"]
    publisher = census_row["publisher"]

    rows_path = r_dir / "extracted" / f"{sha}.rows.jsonl"
    passages_path = r_dir / "extracted" / f"{sha}.passages.jsonl"
    profile_path = r_dir / "profiles" / f"{sha}.json"
    bronze_candidates = list((r_dir / "bronze" / sha).glob("*"))
    pdf_path = bronze_candidates[0] if bronze_candidates else None

    raw_rows = read_jsonl(rows_path)
    passages_rows = read_jsonl(passages_path)
    passages_map = {p["passage_id"]: p for p in passages_rows}

    profile = {}
    if profile_path.exists():
        with open(profile_path, "r", encoding="utf-8") as f:
            profile = json.load(f)

    family = profile.get("family", "TABLE")
    legend_text = profile.get("legend_text", "")
    legend_map = parse_legend(legend_text)

    vocab, standalone_tokens = build_document_vocab(raw_rows, passages_rows)

    extraction_method = (
        "native-pdf-text:pymupdf-find_tables"
        if family == "TABLE"
        else "native-pdf-text:pymupdf-linear"
    )

    envelopes: List[Dict[str, Any]] = []
    paper_repairs: Dict[str, int] = {}
    by_warning: Dict[str, int] = {}
    question_types: Dict[str, int] = {}
    blocking_count = 0

    for row in raw_rows:
        qno = int(row["qno"])
        pages = row.get("pages", [1])
        first_page = pages[0] if pages else 1
        last_page = pages[-1] if pages else first_page
        bboxes = row.get("bboxes", {})
        fig_regions = row.get("figure_regions", [])
        passage_ref = row.get("passage_ref")
        cells = row.get("cells", {})

        row_repairs: Dict[str, int] = {}
        row_warnings: List[str] = []
        for w in row.get("warnings", []):
            if w == "G_PASSAGE_MISSING":
                row_warnings.append(w)

        # Step 1: Character normalization on cells
        q_raw = cells.get("question", "")
        q_norm, row_repairs = repair_characters(
            q_raw, bboxes.get("question"), pdf_path, row_repairs
        )

        ans_raw = cells.get("answer", "")
        ans_norm, row_repairs = repair_characters(
            ans_raw, bboxes.get("answer"), pdf_path, row_repairs
        )

        exp_raw = cells.get("explanation", "")
        exp_norm = None
        if exp_raw and exp_raw.strip():
            exp_norm, row_repairs = repair_characters(
                exp_raw, bboxes.get("explanation"), pdf_path, row_repairs
            )
            # check unresolved glyphs in explanation
            unresolved_exp = exp_norm.count("\ufffd")
            if unresolved_exp > 0:
                row_repairs["explanation_glyphs_unresolved"] = (
                    row_repairs.get("explanation_glyphs_unresolved", 0) + unresolved_exp
                )

        # Passage normalization if present
        passage_norm = None
        orig_passage_norm = None
        if passage_ref and passage_ref in passages_map:
            p_obj = passages_map[passage_ref]
            p_raw = p_obj.get("text", "")
            p_norm, row_repairs = repair_characters(
                p_raw, p_obj.get("bboxes"), pdf_path, row_repairs
            )
            orig_passage_norm = p_norm
            passage_norm = join_lines(p_norm, vocab, standalone_tokens, is_table_stem=False)

        # Step 2: Question cell structure
        text_dict, parse_diag, q_warnings = parse_question_cell(
            q_norm, vocab, standalone_tokens, passage_ref
        )
        row_warnings.extend(q_warnings)
        if passage_norm:
            text_dict["passage"] = passage_norm

        # Step 3: Answer cell
        ans_clean = ans_norm.strip()
        m_ans = re.match(r"^\s*\(?([a-dA-D])\)?\s*\.?\s*$", ans_clean)
        if m_ans:
            key = m_ans.group(1).lower()
            disputed_with = None
        else:
            key = None
            disputed_with = sorted(list(set(re.findall(r"\b[a-dA-D]\b", ans_clean.lower()))))
            row_warnings.append("G_ANSWER_CELL")

        # Step 4: Evidence & Explanation
        evidence = {
            "source_document_id": doc_id,
            "source_url": census_row.get("pdf_url", ""),
            "sha256": sha,
            "retrieved_at": acq_row.get("retrieved_at", "1970-01-01T00:00:00Z"),
            "page": first_page,
            "region": f"pages {first_page}-{last_page}; fields question/answer",
            "language": "en",
            "extraction_method": extraction_method,
            "extraction_version": "086F-1",
        }

        explanation_claim = None
        if exp_norm and exp_norm.strip():
            joined_exp = join_lines(exp_norm, vocab, standalone_tokens, is_table_stem=False)
            explanation_claim = {
                "text": joined_exp,
                "provenance": "editorial",
                "review_state": "unreviewed",
                "source_refs": [evidence],
            }

        # Step 5: Annotations
        section_val = cells.get("section")
        topic_val = cells.get("topic")
        motivation_val = cells.get("motivation")

        def norm_simple(s: Optional[str]) -> Optional[str]:
            if not s or not s.strip():
                return None
            n = unicodedata.normalize("NFC", s).replace("\u00a0", " ")
            return join_lines(n, vocab, standalone_tokens, is_table_stem=False)

        annotations: Dict[str, Any] = {
            "section": norm_simple(section_val),
            "topic": norm_simple(topic_val),
            "motivation": norm_simple(motivation_val),
        }

        for annot_field in ("level", "nature", "source_type"):
            val = cells.get(annot_field)
            if val and val.strip():
                raw_code = re.sub(r"\s+", " ", val).strip()
                if raw_code in legend_map:
                    canonical = legend_map[raw_code]
                else:
                    canonical = None
                    row_warnings.append("annotation_code_unmapped")
                annotations[annot_field] = {"raw": raw_code, "canonical": canonical}
            else:
                annotations[annot_field] = {"raw": None, "canonical": None}

        source_cell_val = cells.get("source", "")
        extracted_urls = extract_source_urls(source_cell_val)
        if not extracted_urls and explanation_claim and explanation_claim.get("text"):
            extracted_urls = extract_source_urls(explanation_claim["text"])
        annotations["source_urls"] = extracted_urls

        # Step 6: Guards
        # G_CONTAMINATION
        contam_re = re.compile(
            r"vision\s*ias|www\.|https?://|©|all india test series|\bAITS\b|sandhan|abhyaas|PT\s?365|\bTest\s+\d{3,5}\b|Page\s+\d+|Grand\s+Total|Number\s+of\s+Questions",
            re.IGNORECASE,
        )
        contam_targets = [text_dict["stem"]]
        if text_dict.get("statements"):
            contam_targets.extend(text_dict["statements"])
        for opt in text_dict.get("options", []):
            contam_targets.append(opt["text"])
        if text_dict.get("passage"):
            contam_targets.append(text_dict["passage"])

        if any(contam_re.search(t) for t in contam_targets):
            row_warnings.append("G_CONTAMINATION")

        # G_FIDELITY
        fid_source_q = fid(q_norm)
        fidelity_fail = False
        if not (fid(text_dict["stem"]) in fid_source_q):
            fidelity_fail = True
        if text_dict.get("statements"):
            for s in text_dict["statements"]:
                if not (fid(s) in fid_source_q):
                    fidelity_fail = True
                    break
        for opt in text_dict.get("options", []):
            if not (fid(opt["text"]) in fid_source_q):
                fidelity_fail = True
                break
        if text_dict.get("instruction_refs"):
            for inst in text_dict["instruction_refs"]:
                if not (fid(inst) in fid_source_q):
                    fidelity_fail = True
                    break
        if text_dict.get("passage") and orig_passage_norm:
            if not (fid(text_dict["passage"]) in fid(orig_passage_norm)):
                fidelity_fail = True

        if fidelity_fail:
            row_warnings.append("G_FIDELITY")

        # G_FIGURE
        stem_stmts_text = text_dict["stem"] + " " + " ".join(text_dict.get("statements") or [])
        if re.search(r"\b(figure|diagram|map|graph|chart|picture)\b", stem_stmts_text, re.IGNORECASE):
            if not fig_regions:
                row_warnings.append("G_FIGURE")

        # G_GLYPH
        glyph_targets = [text_dict["stem"]]
        if text_dict.get("statements"):
            glyph_targets.extend(text_dict["statements"])
        for opt in text_dict.get("options", []):
            glyph_targets.append(opt["text"])
        if text_dict.get("passage"):
            glyph_targets.append(text_dict["passage"])

        if any("\ufffd" in t for t in glyph_targets):
            row_warnings.append("G_GLYPH")

        # Merge repairs and warnings
        unique_warnings = sorted(list(set(row_warnings)))
        for w in unique_warnings:
            by_warning[w] = by_warning.get(w, 0) + 1
        for k, v in row_repairs.items():
            paper_repairs[k] = paper_repairs.get(k, 0) + v

        q_type = parse_diag["question_type"]
        question_types[q_type] = question_types.get(q_type, 0) + 1

        if any(w in BLOCKING_WARNINGS for w in unique_warnings):
            blocking_count += 1

        # Step 7: Envelope
        occurrence_id = f"{doc_id}_p{first_page}_q{qno}"
        key_claim: Dict[str, Any] = {
            "authority": "secondary-claimed",
            "key": key,
            "source_ref": evidence,
        }
        if disputed_with:
            key_claim["disputed_with"] = disputed_with

        occurrence = {
            "occurrence_id": occurrence_id,
            "canonical_id": None,
            "identity": {
                "exam": "UPSC_CSE",
                "stage": "Prelims",
                "year": year,
                "paper": paper,
                "language": "en",
                "question_number": qno,
            },
            "text": text_dict,
            "key_claim": key_claim,
            "evidence": evidence,
        }

        envelope = {
            "occurrence": occurrence,
            "explanation_claim": explanation_claim,
            "annotations": annotations,
            "parse": {
                "question_type": q_type,
                "has_roman_and_arabic_labels": parse_diag["has_roman_and_arabic_labels"],
                "repairs": row_repairs,
                "warnings": unique_warnings,
            },
            "figure_regions": fig_regions,
            "bboxes": bboxes,
        }
        envelopes.append(envelope)

    envelopes.sort(key=lambda x: int(x["occurrence"]["identity"]["question_number"]))

    out_dir = r_dir / "occurrences" / publisher
    out_file = out_dir / f"{year}-{paper}.jsonl"
    write_jsonl_atomic(out_file, envelopes)

    total_items = len(envelopes)
    paper_report = {
        "items": total_items,
        "by_warning": by_warning,
        "question_types": question_types,
        "repairs": paper_repairs,
        "blocking_count": blocking_count,
        "blocking_rate": round(blocking_count / total_items, 4) if total_items > 0 else 0.0,
    }
    return envelopes, paper_report


def main() -> None:
    assert_run_dir_safe()
    r_dir = run_dir()

    census_path = r_dir / "manifest" / "census.json"
    if not census_path.exists():
        raise FileNotFoundError(f"Missing census.json at {census_path}")

    with open(census_path, "r", encoding="utf-8") as f:
        census_data = json.load(f)

    census_rows = [
        row for row in census_data.get("rows", [])
        if row.get("stage") == "Prelims"
    ]

    acq_map = latest_acquisitions()

    paper_reports: Dict[str, Any] = {}
    total_items = 0
    total_blocking = 0
    total_warnings: Dict[str, int] = {}
    total_qtypes: Dict[str, int] = {}
    total_repairs: Dict[str, int] = {}

    for c_row in census_rows:
        doc_id = c_row["document_id"]
        acq_entry = acq_map.get(doc_id, {}).get("acquisition", {})
        _, prep = process_paper(c_row, acq_entry, r_dir)
        paper_reports[doc_id] = prep

        total_items += prep["items"]
        total_blocking += prep["blocking_count"]
        for w, cnt in prep["by_warning"].items():
            total_warnings[w] = total_warnings.get(w, 0) + cnt
        for qt, cnt in prep["question_types"].items():
            total_qtypes[qt] = total_qtypes.get(qt, 0) + cnt
        for rk, cnt in prep["repairs"].items():
            total_repairs[rk] = total_repairs.get(rk, 0) + cnt

    totals = {
        "items": total_items,
        "by_warning": total_warnings,
        "question_types": total_qtypes,
        "repairs": total_repairs,
        "blocking_count": total_blocking,
        "blocking_rate": round(total_blocking / total_items, 4) if total_items > 0 else 0.0,
    }

    full_report = {
        "papers": paper_reports,
        "totals": totals,
    }

    report_path = r_dir / "reports" / "parse.json"
    write_json_atomic(report_path, full_report)
    print(f"Parsed {total_items} items across {len(census_rows)} papers.")
    print(f"Totals blocking rate: {totals['blocking_rate']} ({total_blocking}/{total_items})")


if __name__ == "__main__":
    main()
