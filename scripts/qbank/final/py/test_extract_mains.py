import json
from pathlib import Path
import tempfile
import unittest

import pymupdf

from scripts.qbank.final.py.extract_mains import (
    extract_single_mains_doc,
    run_mains_extractor,
)


class TestExtractMains(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.tmp_path = Path(self.tmp_dir.name)

    def tearDown(self):
        self.tmp_dir.cleanup()

    def test_case_a_basic_three_questions(self):
        # (a) 3 questions, each with a garbled line starting N. followed by an English line
        # ending (Answer in 150 words) 10 -> numbers 1-3, word_limit 150, marks 10, prompt clean
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        y = 100
        for i in range(1, 4):
            page.insert_text(pymupdf.Point(72, y), f"{i}. ÐÞßÆ Ðßà ÆÐÞ")
            y += 20
            page.insert_text(
                pymupdf.Point(72, y),
                f"Question {i} examines the major physiological adaptations in plants. (Answer in 150 words) 10"
            )
            y += 40

        pdf_path = self.tmp_path / "case_a.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:a", "test-paper", pdf_path, is_essay=False
        )

        self.assertEqual(len(items), 3)
        self.assertEqual(marks_sum, 30)
        self.assertEqual(status, "FAIL")  # 30 != 250
        self.assertEqual(reason, "marks_sum")

        for idx, it in enumerate(items, 1):
            self.assertEqual(it["question_number"], idx)
            self.assertIsNone(it["subpart"])
            self.assertEqual(it["word_limit"], 150)
            self.assertEqual(it["marks_allotted"], 10)
            self.assertNotIn("(Answer in 150 words)", it["prompt"])
            self.assertFalse(it["prompt"].endswith("10"))
            self.assertIn("physiological adaptations", it["prompt"])

    def test_case_b_subparts_counting(self):
        # (b) Subparts (a) and (b), worth 10 each, under one number -> two records, and sum counts both
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        y = 100
        page.insert_text(pymupdf.Point(72, y), "1. (a) ÐÞßÆ Ðßà ÆÐÞ")
        y += 20
        page.insert_text(
            pymupdf.Point(72, y),
            "Discuss the ethical dilemmas faced by public officials. (Answer in 150 words) 10"
        )
        y += 30
        page.insert_text(pymupdf.Point(72, y), "(b) ÐÞßÆ Ðßà ÆÐÞ")
        y += 20
        page.insert_text(
            pymupdf.Point(72, y),
            "Explain the role of institutional empathy in public delivery. (Answer in 150 words) 10"
        )

        pdf_path = self.tmp_path / "case_b.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:b", "test-paper", pdf_path, is_essay=False
        )

        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["question_number"], 1)
        self.assertEqual(items[0]["subpart"], "(a)")
        self.assertEqual(items[0]["marks_allotted"], 10)

        self.assertEqual(items[1]["question_number"], 1)
        self.assertEqual(items[1]["subpart"], "(b)")
        self.assertEqual(items[1]["marks_allotted"], 10)

        self.assertEqual(marks_sum, 20)

    def test_case_c_marks_sum_gate_failure(self):
        # (c) A marks total that is not 250 -> FAIL marks_sum
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        y = 80
        for i in range(1, 11):
            page.insert_text(pymupdf.Point(72, y), f"{i}. ÐÞßÆ Ðßà ÆÐÞ")
            y += 18
            page.insert_text(
                pymupdf.Point(72, y),
                f"Evaluate the policy impact on industrial growth and employment. (Answer in 150 words) 10"
            )
            y += 25

        pdf_path = self.tmp_path / "case_c.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:c", "test-paper", pdf_path, is_essay=False
        )

        self.assertEqual(len(items), 10)
        self.assertEqual(marks_sum, 100)
        self.assertEqual(status, "FAIL")
        self.assertEqual(reason, "marks_sum")

    def test_case_d_essay_sections_and_limits(self):
        # (d) An essay with SECTION A/B, 8 topics, 1000-1200 words and 125 marks
        # -> 8 records, word_limit 1200, marks 125, sections A and B
        doc = pymupdf.open()
        p1 = doc.new_page(width=595, height=842)
        p1.insert_text(
            pymupdf.Point(72, 100),
            "Write two essays choosing one from each section in about 1000-1200 words. 125 marks each."
        )

        p2 = doc.new_page(width=595, height=842)
        y = 80
        p2.insert_text(pymupdf.Point(72, y), "SECTION - A")
        y += 25
        for i in range(1, 5):
            p2.insert_text(pymupdf.Point(72, y), f"{i}. ÐÞßÆ Ðßà ÆÐÞ")
            y += 18
            p2.insert_text(pymupdf.Point(72, y), f"Philosophical enquiry into ethical governance topic {i}.")
            y += 25

        p2.insert_text(pymupdf.Point(72, y), "SECTION - B")
        y += 25
        for i in range(5, 9):
            p2.insert_text(pymupdf.Point(72, y), f"{i}. ÐÞßÆ Ðßà ÆÐÞ")
            y += 18
            p2.insert_text(pymupdf.Point(72, y), f"Scientific progress and socio-ecological balance topic {i}.")
            y += 25

        pdf_path = self.tmp_path / "case_d.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:d", "test-essay", pdf_path, is_essay=True
        )

        self.assertEqual(len(items), 8)
        self.assertEqual(status, "PASS")
        self.assertIsNone(reason)

        for i, it in enumerate(items[:4], 1):
            self.assertEqual(it["question_number"], i)
            self.assertEqual(it["word_limit"], 1200)
            self.assertEqual(it["marks_allotted"], 125)
            self.assertEqual(it["section"], "A")

        for i, it in enumerate(items[4:], 5):
            self.assertEqual(it["question_number"], i)
            self.assertEqual(it["word_limit"], 1200)
            self.assertEqual(it["marks_allotted"], 125)
            self.assertEqual(it["section"], "B")

    def test_case_e_scanned_unresolved(self):
        # (e) A document whose profile is SCANNED -> UNRESOLVED
        # Tested through run_mains_extractor or simulated profiler check
        r_dir = self.tmp_path / "run_dir"
        manifest_dir = r_dir / "manifest"
        profiles_dir = r_dir / "profiles"
        manifest_dir.mkdir(parents=True)
        profiles_dir.mkdir(parents=True)

        census_json = {
            "rows": [
                {
                    "document_id": "test:scanned:doc",
                    "stage": "Mains",
                    "year": 2018,
                    "paper": "GS-M1",
                    "publisher": "mock",
                }
            ]
        }
        with open(manifest_dir / "census.json", "w", encoding="utf-8") as f:
            json.dump(census_json, f)

        acq_jsonl = [
            {
                "document_id": "test:scanned:doc",
                "sha256": "mocksha12345",
                "status": "ok",
                "path": "test.pdf",
            }
        ]
        with open(manifest_dir / "acquisition.jsonl", "w", encoding="utf-8") as f:
            for r in acq_jsonl:
                f.write(json.dumps(r) + "\n")

        with open(profiles_dir / "mocksha12345.json", "w", encoding="utf-8") as f:
            json.dump({"family": "SCANNED"}, f)

        import os
        old_env = os.environ.get("QBANK_RUN_DIR")
        os.environ["QBANK_RUN_DIR"] = str(r_dir)
        try:
            report = run_mains_extractor()
            unresolved = report.get("unresolved", [])
            self.assertEqual(len(unresolved), 1)
            self.assertEqual(unresolved[0]["document_id"], "test:scanned:doc")
            self.assertEqual(unresolved[0]["family"], "SCANNED")
            self.assertEqual(unresolved[0]["reason"], "missing_source (not digitised)")
        finally:
            if old_env is not None:
                os.environ["QBANK_RUN_DIR"] = old_env
            else:
                os.environ.pop("QBANK_RUN_DIR", None)

    def test_case_f_inner_spaces_word_limit(self):
        # (Answer in 150 words ) is parsed with inner spaces
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        page.insert_text(pymupdf.Point(72, 80), "1. ÐÞßÆ")
        page.insert_text(pymupdf.Point(72, 100), "Evaluate the socio-economic impacts of urbanization. (Answer in 150 words ) 10")
        pdf_path = self.tmp_path / "case_f.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:f", "test-paper", pdf_path, is_essay=False
        )
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["word_limit"], 150)
        self.assertEqual(items[0]["marks_allotted"], 10)
        self.assertNotIn("Answer in", items[0]["prompt"])

    def test_case_g_separate_block_marks(self):
        # A marks number placed in a separate block on the same baseline is still captured
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        page.insert_text(pymupdf.Point(72, 80), "1. ÐÞßÆ")
        # Block 1: Question text
        page.insert_textbox(pymupdf.Rect(72, 100, 450, 150), "Discuss the conservation of coastal wetlands in India. (Answer in 150 words)")
        # Block 2: Marks number in separate block on same vertical baseline
        page.insert_textbox(pymupdf.Rect(500, 100, 550, 150), "10")
        pdf_path = self.tmp_path / "case_g.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:g", "test-paper", pdf_path, is_essay=False
        )
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["marks_allotted"], 10)
        self.assertEqual(items[0]["word_limit"], 150)


    def test_spec_a_bilingual_garbled_subpart_b(self):
        # (a) A (b) label on a garbled non-English line, followed by English text, produces subpart (b) with its own marks.
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        y = 100
        page.insert_text(pymupdf.Point(72, y), "1. (a) गैर-अंग्रेजी पंक्ति")
        y += 20
        page.insert_text(
            pymupdf.Point(72, y),
            "Discuss the ethical dilemmas faced by public officials. (Answer in 150 words) 10"
        )
        y += 30
        page.insert_text(pymupdf.Point(72, y), "1.(b) गैर-अंग्रेजी पंक्ति")
        y += 20
        page.insert_text(
            pymupdf.Point(72, y),
            "Explain the role of constitutional morality in governance. (Answer in 150 words) 10"
        )

        pdf_path = self.tmp_path / "spec_a.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:spec_a", "test-paper", pdf_path, is_essay=False
        )

        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["question_number"], 1)
        self.assertEqual(items[0]["subpart"], "(a)")
        self.assertEqual(items[0]["marks_allotted"], 10)
        self.assertEqual(items[1]["question_number"], 1)
        self.assertEqual(items[1]["subpart"], "(b)")
        self.assertEqual(items[1]["marks_allotted"], 10)

    def test_spec_b_case_study_single_record(self):
        # (b) A case study with narrative, sub-questions (a)(b)(c) and a single trailing 20 produces
        # one record with marks 20, the narrative in case_study, and the three labelled sub-questions in prompt.
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        y = 80
        page.insert_text(pymupdf.Point(72, y), "7. You are a senior civil servant dealing with a severe natural disaster in an ecologically fragile region.")
        y += 30
        page.insert_text(pymupdf.Point(72, y), "(a) Discuss the ethical issues involved in this situation.")
        y += 20
        page.insert_text(pymupdf.Point(72, y), "(b) Examine the options available to you.")
        y += 20
        page.insert_text(pymupdf.Point(72, y), "(c) What would be your final course of action? (Answer in 250 words) 20")

        pdf_path = self.tmp_path / "spec_b.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:spec_b", "test-paper", pdf_path, is_essay=False
        )

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["question_number"], 7)
        self.assertIsNone(items[0]["subpart"])
        self.assertEqual(items[0]["marks_allotted"], 20)
        self.assertEqual(items[0]["word_limit"], 250)
        self.assertIn("severe natural disaster", items[0]["case_study"])
        self.assertIn("(a) Discuss the ethical issues", items[0]["prompt"])
        self.assertIn("(b) Examine the options", items[0]["prompt"])
        self.assertIn("(c) What would be your final course", items[0]["prompt"])
        self.assertNotIn("20", items[0]["prompt"])

    def test_spec_c_right_margin_marks_stripped(self):
        # (c) A right-margin 10 in the middle of a block is never kept in prompt text.
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        # Line 1: prompt text on left, 10 at right margin (e.g. x0=500 >= 0.8 * 595 = 476)
        page.insert_text(pymupdf.Point(72, 100), "1. Evaluate the socio-economic impacts of urbanization.")
        page.insert_text(pymupdf.Point(500, 100), "10")
        # Line 2: closing prompt
        page.insert_text(pymupdf.Point(72, 125), "Suggest measures for balanced regional growth. (Answer in 150 words)")

        pdf_path = self.tmp_path / "spec_c.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:spec_c", "test-paper", pdf_path, is_essay=False
        )

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["marks_allotted"], 10)
        self.assertNotIn(" 10 ", items[0]["prompt"])
        self.assertFalse(items[0]["prompt"].endswith("10"))

    def test_spec_d_bilingual_section_a_header(self):
        # (d) SECTION – A on a bilingual line sets section A.
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        page.insert_text(pymupdf.Point(72, 80), "SECTION - A")
        page.insert_text(pymupdf.Point(72, 110), "1. Discuss constitutional morality in governance. (Answer in 150 words) 10")

        pdf_path = self.tmp_path / "spec_d.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:spec_d", "test-paper", pdf_path, is_essay=False
        )

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["section"], "A")

    def test_spec_e_subparts_individual_marks(self):
        # (e) A question whose subparts each print marks yields one record per subpart.
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)
        y = 100
        page.insert_text(pymupdf.Point(72, y), "1. (a)")
        y += 20
        page.insert_text(pymupdf.Point(72, y), "Critically evaluate the role of public vigilance. (Answer in 150 words) 10")
        y += 30
        page.insert_text(pymupdf.Point(72, y), "(b)")
        y += 20
        page.insert_text(pymupdf.Point(72, y), "Assess the ethical dilemmas in technology deployment. (Answer in 150 words) 10")

        pdf_path = self.tmp_path / "spec_e.pdf"
        doc.save(pdf_path)

        status, reason, items, marks_sum, warnings = extract_single_mains_doc(
            "test:doc:spec_e", "test-paper", pdf_path, is_essay=False
        )

        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["subpart"], "(a)")
        self.assertEqual(items[0]["marks_allotted"], 10)
        self.assertEqual(items[1]["subpart"], "(b)")
        self.assertEqual(items[1]["marks_allotted"], 10)


if __name__ == "__main__":
    unittest.main()
