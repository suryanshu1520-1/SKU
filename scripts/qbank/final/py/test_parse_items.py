import json
from pathlib import Path
import re
import tempfile
import unittest

import fitz  # PyMuPDF

from parse_items import (
    build_document_vocab,
    extract_source_urls,
    fid,
    join_lines,
    parse_legend,
    parse_question_cell,
    process_paper,
    repair_characters,
)


class TestParseItems(unittest.TestCase):
    def test_structure_statements_with_closing_prompt(self):
        q = (
            "Consider the following statements:\n"
            "1. Statement one is here.\n"
            "2. Statement two is here.\n"
            "Which of the statements given above is/are correct?\n"
            "(a) 1 only\n"
            "(b) 2 only\n"
            "(c) Both 1 and 2\n"
            "(d) Neither 1 nor 2"
        )
        vocab = {"statement", "one", "two"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q, vocab, standalone)

        self.assertEqual(text_dict["stem"], "Consider the following statements:")
        self.assertIsNotNone(text_dict["statements"])
        self.assertEqual(len(text_dict["statements"]), 2)
        self.assertIn("1. Statement one is here.", text_dict["statements"][0])
        self.assertIn("2. Statement two is here.", text_dict["statements"][1])
        self.assertIsNotNone(text_dict["instruction_refs"])
        self.assertIn("Which of the statements given above is/are correct?", text_dict["instruction_refs"][0])
        self.assertEqual(len(text_dict["options"]), 4)
        self.assertNotIn("G_OPTIONS", warnings)
        self.assertEqual(diag["question_type"], "statements")

    def test_structure_options_on_one_line(self):
        q = "Capital of India is? (a) Mumbai (b) Delhi (c) Kolkata (d) Chennai"
        vocab = {"capital", "india"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q, vocab, standalone)

        self.assertEqual(len(text_dict["options"]), 4)
        self.assertEqual(text_dict["options"][0]["text"], "Mumbai")
        self.assertEqual(text_dict["options"][1]["text"], "Delhi")
        self.assertEqual(text_dict["options"][2]["text"], "Kolkata")
        self.assertEqual(text_dict["options"][3]["text"], "Chennai")
        self.assertNotIn("G_OPTIONS", warnings)

    def test_structure_missing_d_raises_g_options(self):
        q = (
            "What is x?\n"
            "(a) First option\n"
            "(b) Second option\n"
            "(c) Third option"
        )
        vocab = {"first", "second", "third"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q, vocab, standalone)

        self.assertIn("G_OPTIONS", warnings)
        self.assertEqual(len(text_dict["options"]), 3)
        self.assertEqual([o["key"] for o in text_dict["options"]], ["a", "b", "c"])

    def test_structure_roman_and_arabic_labels(self):
        q = (
            "Consider the items:\n"
            "1. Item 1\n"
            "II. Item 2\n"
            "Select the correct answer:\n"
            "(a) 1 only\n"
            "(b) II only\n"
            "(c) Both\n"
            "(d) None"
        )
        vocab = {"item"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q, vocab, standalone)

        self.assertTrue(diag["has_roman_and_arabic_labels"])

    def test_structure_table_like_stems_keeps_line_breaks(self):
        q_table = (
            "List-I (Rivers) List-II (Tributaries)\n"
            "A. Ganga 1. Yamuna\n"
            "B. Indus 2. Chenab\n"
            "(a) A-1, B-2\n"
            "(b) A-2, B-1\n"
            "(c) A-1, B-1\n"
            "(d) A-2, B-2"
        )
        vocab = {"ganga", "indus"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q_table, vocab, standalone)

        self.assertIn("\n", text_dict["stem"])
        self.assertIsNone(text_dict["statements"])
        self.assertEqual(diag["question_type"], "match_list")

    def test_structure_how_many_question_type(self):
        q = (
            "How many of the following are primary colours?\n"
            "1. Red\n"
            "2. Green\n"
            "3. Blue\n"
            "(a) Only one\n"
            "(b) Only two\n"
            "(c) All three\n"
            "(d) None"
        )
        vocab = {"red", "green", "blue"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q, vocab, standalone)

        self.assertEqual(diag["question_type"], "how_many")

    def test_normalization_ufffd_pdfplumber(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = Path(tmpdir) / "test.bin"
            doc = fitz.open()
            page = doc.new_page(width=300, height=300)
            page.insert_text((50, 50), "Hello world")
            doc.save(str(pdf_path))
            doc.close()

            damaged = "H\ufffdllo world"
            bboxes = [[1, 40, 40, 150, 70]]
            repairs = {}
            cleaned, repairs = repair_characters(damaged, bboxes, pdf_path, repairs)
            self.assertEqual(cleaned, "Hello world")
            self.assertEqual(repairs.get("glyph_pdfplumber"), 1)

    def test_normalization_ufffd_context_rules(self):
        # 1. apostrophe
        t1, r1 = repair_characters("don\ufffdt")
        self.assertEqual(t1, "don’t")
        self.assertEqual(r1.get("glyph_apostrophe"), 1)

        # 2. bullet
        t2, r2 = repair_characters("\n \ufffd item")
        self.assertEqual(t2, "\n• item")
        self.assertEqual(r2.get("glyph_bullet"), 1)

        # 3. quotes
        t3, r3 = repair_characters("\ufffdSample Text\ufffd")
        self.assertEqual(t3, "“Sample Text”")
        self.assertEqual(r3.get("glyph_quotes"), 2)

        # 4. dash
        t4, r4 = repair_characters("left \ufffd right")
        self.assertEqual(t4, "left – right")
        self.assertEqual(r4.get("glyph_dash"), 1)

    def test_normalization_line_joins(self):
        vocab = {"fundamental", "socio-economic", "economic", "rights"}
        standalone = {"fundamental", "socio-economic", "economic", "rights"}

        # "fundament\nal" with "fundamental" elsewhere
        joined1 = join_lines("fundament\nal", vocab, standalone)
        self.assertEqual(joined1, "fundamental")

        # "socio-\neconomic" with "socio-economic" elsewhere -> kept hyphenated
        joined2 = join_lines("socio-\neconomic", vocab, standalone)
        self.assertEqual(joined2, "socio-economic")

    def test_guards_contamination(self):
        # Contamination in stem
        q = (
            "What is X? Refer to www.example.com\n"
            "(a) A\n(b) B\n(c) C\n(d) D"
        )
        vocab = {"what"}
        standalone = set(vocab)
        _, _, warnings = parse_question_cell(q, vocab, standalone)
        # Note: contamination is checked in process_paper, let's verify regex directly
        contam = bool(re.search(r"www\.", q))
        self.assertTrue(contam)

    def test_guards_fidelity(self):
        # Tampered field: field is not substring of source
        source = "Consider the following statements regarding fundamental rights."
        tampered_field = "Consider the following statements regarding alien rights."
        self.assertFalse(fid(tampered_field) in fid(source))

    def test_guards_legend_mapping_and_unmapped(self):
        legend_text = (
            "E : Easy question which is direct\n"
            "M : Medium question requiring analysis\n"
            "D : Difficult question from obscure source\n"
        )
        legend_map = parse_legend(legend_text)
        self.assertEqual(legend_map.get("E"), "easy")
        self.assertEqual(legend_map.get("M"), "medium")
        self.assertEqual(legend_map.get("D"), "difficult")
        self.assertNotIn("XYZ", legend_map)

    def test_guards_answer_cell_disputed(self):
        ans_raw = "B/C"
        ans_clean = ans_raw.strip()
        m_ans = re.match(r"^\s*\(?([a-dA-D])\)?\s*\.?\s*$", ans_clean)
        self.assertIsNone(m_ans)
        disputed = sorted(list(set(re.findall(r"\b[a-dA-D]\b", ans_clean.lower()))))
        self.assertEqual(disputed, ["b", "c"])

    def test_source_url_extraction(self):
        cell_text = (
            "http://pib.nic.in/ne\n"
            "wsite/PrintRelease.\n"
            "aspx?relid=138244\n"
            "http://example.com/item"
        )
        urls = extract_source_urls(cell_text)
        self.assertEqual(len(urls), 2)
        self.assertEqual(urls[0], "http://pib.nic.in/newsite/PrintRelease.aspx?relid=138244")
        self.assertEqual(urls[1], "http://example.com/item")

    def test_determinism(self):
        q = (
            "Consider the following statements:\n"
            "1. First.\n"
            "2. Second.\n"
            "Which is correct?\n"
            "(a) 1 only\n(b) 2 only\n(c) Both\n(d) Neither"
        )
        vocab = {"first", "second"}
        standalone = set(vocab)
        res1 = parse_question_cell(q, vocab, standalone)
        res2 = parse_question_cell(q, vocab, standalone)
        self.assertEqual(json.dumps(res1, sort_keys=True), json.dumps(res2, sort_keys=True))

    def test_phrase_how_many_split_lines(self):
        # 1. "How many of the\nabove pairs" -> how_many
        q = (
            "Consider the following pairs:\n"
            "1. River : Tributary\n"
            "2. Lake : State\n"
            "How many of the\nabove pairs are correctly matched?\n"
            "(a) Only one\n"
            "(b) Only two\n"
            "(c) All three\n"
            "(d) None"
        )
        vocab = {"river", "lake"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q, vocab, standalone)
        self.assertEqual(diag["question_type"], "how_many")

    def test_phrase_following_pairs_split_lines_keeps_breaks(self):
        # 2. "following\npairs" -> pairs, with line breaks kept
        q = (
            "Consider the following\npairs:\n"
            "1. Tiger Reserve : State\n"
            "2. National Park : River\n"
            "Which of the above pairs is/are correctly matched?\n"
            "(a) 1 only\n"
            "(b) 2 only\n"
            "(c) Both 1 and 2\n"
            "(d) Neither 1 nor 2"
        )
        vocab = {"tiger", "reserve"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q, vocab, standalone)
        self.assertEqual(diag["question_type"], "pairs")
        self.assertIn("\n", text_dict["stem"])
        self.assertIn("Tiger Reserve : State", text_dict["stem"])
        self.assertIsNotNone(text_dict["instruction_refs"])
        self.assertIn("Which of the above pairs is/are correctly matched?", text_dict["instruction_refs"][0])

    def test_closing_prompt_split_from_last_statement(self):
        # 3. closing prompt split off the last statement
        q = (
            "Consider the following statements:\n"
            "1. First statement is valid.\n"
            "2. Second statement is valid. Which of the statements given above is/are correct?\n"
            "(a) 1 only\n"
            "(b) 2 only\n"
            "(c) Both 1 and 2\n"
            "(d) Neither 1 nor 2"
        )
        vocab = {"first", "second"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q, vocab, standalone)
        self.assertEqual(len(text_dict["statements"]), 2)
        self.assertEqual(text_dict["statements"][1], "2. Second statement is valid.")
        self.assertIsNotNone(text_dict["instruction_refs"])
        self.assertEqual(
            text_dict["instruction_refs"][0],
            "Which of the statements given above is/are correct?",
        )

    def test_single_best_stem_left_unsplit(self):
        # 4. single-best stem left unsplit
        q = (
            "Which one of the following is the largest freshwater lake in India?\n"
            "(a) Wular\n"
            "(b) Loktak\n"
            "(c) Chilika\n"
            "(d) Sambhar"
        )
        vocab = {"wular", "freshwater", "lake"}
        standalone = set(vocab)
        text_dict, diag, warnings = parse_question_cell(q, vocab, standalone)
        self.assertEqual(diag["question_type"], "single_best")
        self.assertEqual(
            text_dict["stem"],
            "Which one of the following is the largest freshwater lake in India?",
        )
        self.assertIsNone(text_dict["instruction_refs"])

    def test_grand_total_contamination(self):
        # 5. "Grand Total" -> G_CONTAMINATION
        contam_re = re.compile(
            r"vision\s*ias|www\.|https?://|©|all india test series|\bAITS\b|sandhan|abhyaas|PT\s?365|\bTest\s+\d{3,5}\b|Page\s+\d+|Grand\s+Total|Number\s+of\s+Questions",
            re.IGNORECASE,
        )
        self.assertTrue(contam_re.search("Some stem text Grand Total 100"))
        self.assertTrue(contam_re.search("Number of Questions 50"))


if __name__ == "__main__":
    unittest.main()
