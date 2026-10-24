from pathlib import Path
import tempfile
import unittest

import pymupdf

try:
    from scripts.qbank.final.py.extract_linear import extract_linear_document
except ModuleNotFoundError:
    from extract_linear import extract_linear_document


class TestExtractLinear(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.dir_path = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_a_five_items_inline_and_stacked_options(self):
        """(a) 5 items with options both inline ((a) 4 (b) 5) and stacked, each followed by Answer: (c) -> 5 items, each with its answer."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)
        y = 50
        # Q1 (inline options)
        p.insert_text((50, y), "1. Question 1 text")
        p.insert_text((50, y + 20), "(a) 1 (b) 2 (c) 3 (d) 4")
        p.insert_text((50, y + 40), "Answer: (c)")
        y += 70

        # Q2 (stacked options)
        p.insert_text((50, y), "2. Question 2 text")
        p.insert_text((50, y + 20), "(a) Alpha")
        p.insert_text((50, y + 40), "(b) Beta")
        p.insert_text((50, y + 60), "(c) Gamma")
        p.insert_text((50, y + 80), "(d) Delta")
        p.insert_text((50, y + 100), "Answer: (a)")
        y += 130

        # Q3 (inline)
        p.insert_text((50, y), "3. Question 3 text")
        p.insert_text((50, y + 20), "(a) 10 (b) 20")
        p.insert_text((50, y + 40), "Answer: (b)")
        y += 70

        # Q4 (stacked)
        p.insert_text((50, y), "4. Question 4 text")
        p.insert_text((50, y + 20), "(a) X (b) Y")
        p.insert_text((50, y + 40), "Answer: (d)")
        y += 70

        # Q5 (inline)
        p.insert_text((50, y), "5. Question 5 text")
        p.insert_text((50, y + 20), "(a) Yes (b) No")
        p.insert_text((50, y + 40), "Answer: (c)")

        pdf_path = self.dir_path / "test_a.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:a", "dummy_sha", pdf_path, {}, 5
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(len(items), 5)
        self.assertEqual([it["cells"]["answer"] for it in items], ["c", "a", "b", "d", "c"])

    def test_b_indented_statement_lines_not_new_questions(self):
        """(b) Statement lines 1. ... and 2. ... indented 20 pt beyond margin are not treated as new questions."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)
        margin = 50

        # Q1 at margin 50
        p.insert_text((margin, 60), "1. Consider the following statements:")
        # Indented statements at margin + 20 = 70
        p.insert_text((margin + 20, 85), "1. First statement.")
        p.insert_text((margin + 20, 110), "2. Second statement.")
        p.insert_text((margin, 135), "Which is correct? (a) 1 only (b) 2 only")
        p.insert_text((margin, 160), "Answer: (a)")

        # Q2 at margin 50
        p.insert_text((margin, 190), "2. Question 2 text")
        p.insert_text((margin, 215), "Answer: (b)")

        pdf_path = self.dir_path / "test_b.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:b", "dummy_sha", pdf_path, {}, 2
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["qno"], 1)
        self.assertEqual(items[1]["qno"], 2)
        self.assertIn("1. First statement.", items[0]["cells"]["question"])
        self.assertIn("2. Second statement.", items[0]["cells"]["question"])

    def test_c_passage_linking(self):
        """(c) Directions for the next 2 (two) items: + Passage + text before Q3 -> applies_to is [3, 4], and items 3 and 4 carry passage_ref."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)

        # Q1 & Q2
        p.insert_text((50, 50), "1. Q1 text")
        p.insert_text((50, 70), "Answer: (a)")
        p.insert_text((50, 95), "2. Q2 text")
        p.insert_text((50, 115), "Answer: (b)")

        # Passage for Q3 and Q4
        p.insert_text((50, 145), "Directions for the next 2 (two) items:")
        p.insert_text((50, 165), "Read the following passage and answer the items:")
        p.insert_text((50, 185), "Passage content text here.")

        # Q3
        p.insert_text((50, 215), "3. Q3 based on passage")
        p.insert_text((50, 235), "Answer: (c)")

        # Q4
        p.insert_text((50, 265), "4. Q4 based on passage")
        p.insert_text((50, 285), "Answer: (d)")

        pdf_path = self.dir_path / "test_c.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:c", "dummy_sha", pdf_path, {}, 4
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(len(passages), 1)
        self.assertEqual(passages[0]["applies_to"], [3, 4])
        self.assertEqual(items[0].get("passage_ref"), None)
        self.assertEqual(items[1].get("passage_ref"), None)
        self.assertEqual(items[2]["passage_ref"], passages[0]["passage_id"])
        self.assertEqual(items[3]["passage_ref"], passages[0]["passage_id"])

    def test_d_footer_and_page_numbers_removed(self):
        """(d) The footer www.visionias.in and page numbers are removed."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)

        p.insert_text((50, 50), "1. Question 1 text")
        p.insert_text((50, 80), "Answer: (a)")
        p.insert_text((50, 780), "1 www.visionias.in (c) Vision IAS")

        pdf_path = self.dir_path / "test_d.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:d", "dummy_sha", pdf_path, {}, 1
        )
        self.assertEqual(status, "PASS")
        q_text = items[0]["cells"]["question"]
        self.assertNotIn("visionias", q_text.lower())
        self.assertNotIn("www.", q_text.lower())

    def test_e_missing_answer_fails(self):
        """(e) An item with no answer line -> FAIL, with that qno in no_answer."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)

        p.insert_text((50, 50), "1. Question 1 text without answer")

        pdf_path = self.dir_path / "test_e.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:e", "dummy_sha", pdf_path, {}, 1
        )
        self.assertEqual(status, "FAIL")
        self.assertIn(1, rep["no_answer"])

    def test_f_prefix_mode(self):
        """(f) Prefix mode: Q.1. ... Q.3., with 1. and 2. statement lines inside Q1 -> 3 items, statements not taken as question starts."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)

        # Simulate prefix mode by having 60 Q-lines or prefix format
        # In prefix mode, candidate lines require Q.
        p.insert_text((50, 40), "Q.1. Question 1 with statements:")
        p.insert_text((50, 60), "1. First statement at margin.")
        p.insert_text((50, 80), "2. Second statement at margin.")
        p.insert_text((50, 100), "Answer: (a)")

        p.insert_text((50, 130), "Q.2. Question 2 text")
        p.insert_text((50, 150), "Answer: (b)")

        p.insert_text((50, 180), "Q.3. Question 3 text")
        p.insert_text((50, 200), "Answer: (c)")

        # Add dummy Q lines to trigger prefix_mode >= 60
        y = 220
        for k in range(4, 65):
            p.insert_text((50, y), f"Q.{k}. Dummy question text")
            p.insert_text((50, y + 10), "Answer: (d)")
            y += 20
            if y > 760:
                p = doc.new_page(width=600, height=800)
                y = 40

        pdf_path = self.dir_path / "test_f.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:f", "dummy_sha", pdf_path, {}, 64
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(items[0]["qno"], 1)
        self.assertEqual(items[1]["qno"], 2)
        self.assertEqual(items[2]["qno"], 3)
        self.assertIn("1. First statement at margin.", items[0]["cells"]["question"])
        self.assertIn("2. Second statement at margin.", items[0]["cells"]["question"])

    def test_g_answer_letter_on_next_line(self):
        """(g) Ans. with the letter B on the next line -> answer b."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)

        p.insert_text((50, 50), "1. Question 1 text")
        p.insert_text((50, 70), "Ans.")
        p.insert_text((50, 90), "B")

        pdf_path = self.dir_path / "test_g.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:g", "dummy_sha", pdf_path, {}, 1
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(items[0]["cells"]["answer"], "b")

    def test_h_question_number_alone_on_line(self):
        """(h) A question number alone on its line, with the text on the next line."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)

        p.insert_text((50, 50), "1.")
        p.insert_text((50, 75), "This is the question body on next line.")
        p.insert_text((50, 100), "Answer: (c)")

        pdf_path = self.dir_path / "test_h.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:h", "dummy_sha", pdf_path, {}, 1
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(items[0]["cells"]["question"], "This is the question body on next line.")
        self.assertEqual(items[0]["cells"]["answer"], "c")

    def test_i_explanation_captured(self):
        """(i) Explanation: ... after the answer is captured into cells.explanation."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)

        p.insert_text((50, 50), "1. Question 1 text")
        p.insert_text((50, 70), "Answer: (a)")
        p.insert_text((50, 90), "Explanation: This is the detailed explanation.")

        pdf_path = self.dir_path / "test_i.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:i", "dummy_sha", pdf_path, {}, 1
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(items[0]["cells"].get("explanation"), "This is the detailed explanation.")

    def test_j_margin_aligned_2_before_q1_answer_not_q2(self):
        """(j) A margin-aligned 2. that appears before Q1's answer marker is not taken as Q2."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)
        margin = 50

        p.insert_text((margin, 50), "1. Consider:")
        # Statement 2 at exact margin before Answer
        p.insert_text((margin, 70), "2. Statement two at margin.")
        p.insert_text((margin, 90), "Answer: (d)")

        p.insert_text((margin, 120), "2. Real question 2 text")
        p.insert_text((margin, 140), "Answer: (b)")

        pdf_path = self.dir_path / "test_j.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:j", "dummy_sha", pdf_path, {}, 2
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]["qno"], 1)
        self.assertEqual(items[1]["qno"], 2)
        self.assertIn("2. Statement two at margin.", items[0]["cells"]["question"])
        self.assertEqual(items[1]["cells"]["question"], "Real question 2 text")

    def test_k_plural_directions_three_headed_passages(self):
        """(k) A plural-directions block with 3 headed passages and 3 items: each item links to its own passage, and no explanation contains 'Passage'."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=1000)
        y = 50

        # Directions line
        p.insert_text((50, y), "Directions for the next 3 (three) items:")
        p.insert_text((50, y + 20), "Read the following three passages and answer the items that follow each passage:")
        y += 45

        # Passage 1
        p.insert_text((50, y), "Passage - 1")
        p.insert_text((50, y + 20), "This is the first passage text discussing economic growth.")
        y += 45

        # Q1
        p.insert_text((50, y), "1. Question 1 text based on first passage")
        p.insert_text((50, y + 20), "Answer: (a)")
        p.insert_text((50, y + 40), "Explanation: Explanation for question 1.")
        y += 65

        # Passage 2
        p.insert_text((50, y), "Passage - 2")
        p.insert_text((50, y + 20), "This is the second passage text discussing environmental issues.")
        y += 45

        # Q2
        p.insert_text((50, y), "2. Question 2 text based on second passage")
        p.insert_text((50, y + 20), "Answer: (b)")
        p.insert_text((50, y + 40), "Explanation: Explanation for question 2.")
        y += 65

        # Passage 3
        p.insert_text((50, y), "Passage - 3")
        p.insert_text((50, y + 20), "This is the third passage text discussing education.")
        y += 45

        # Q3
        p.insert_text((50, y), "3. Question 3 text based on third passage")
        p.insert_text((50, y + 20), "Answer: (c)")
        p.insert_text((50, y + 40), "Explanation: Explanation for question 3.")

        pdf_path = self.dir_path / "test_k.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:k", "dummy_sha", pdf_path, {}, 3
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(len(items), 3)
        self.assertEqual(len(passages), 3)
        self.assertEqual(passages[0]["applies_to"], [1])
        self.assertEqual(passages[1]["applies_to"], [2])
        self.assertEqual(passages[2]["applies_to"], [3])
        self.assertEqual(items[0]["passage_ref"], passages[0]["passage_id"])
        self.assertEqual(items[1]["passage_ref"], passages[1]["passage_id"])
        self.assertEqual(items[2]["passage_ref"], passages[2]["passage_id"])
        for it in items:
            exp = it["cells"].get("explanation", "")
            self.assertNotIn("Passage", exp)

    def test_l_single_passage_no_heading_two_items(self):
        """(l) A single-passage block with no heading and 2 items: both link to the same passage."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)
        y = 50

        # Directions line
        p.insert_text((50, y), "Directions for the next 2 (two) items:")
        p.insert_text((50, y + 20), "Read the following passage and answer the items:")
        p.insert_text((50, y + 40), "Fig trees are considered sacred in many cultures and provide critical food.")
        y += 70

        # Q1
        p.insert_text((50, y), "1. Question 1 text based on fig trees")
        p.insert_text((50, y + 20), "Answer: (a)")
        y += 45

        # Q2
        p.insert_text((50, y), "2. Question 2 text also based on fig trees")
        p.insert_text((50, y + 20), "Answer: (c)")

        pdf_path = self.dir_path / "test_l.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:l", "dummy_sha", pdf_path, {}, 2
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(len(items), 2)
        self.assertEqual(len(passages), 1)
        self.assertEqual(passages[0]["applies_to"], [1, 2])
        self.assertEqual(items[0]["passage_ref"], passages[0]["passage_id"])
        self.assertEqual(items[1]["passage_ref"], passages[0]["passage_id"])

    def test_m_wrapped_directions_line(self):
        """(m) A directions line wrapped across two lines is detected."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)
        y = 50

        # Wrapped directions line
        p.insert_text((50, y), "Directions for the")
        p.insert_text((50, y + 20), "following 2 items:")
        p.insert_text((50, y + 40), "Passage - 1")
        p.insert_text((50, y + 60), "Content of passage wrapped after directions.")
        y += 90

        # Q1
        p.insert_text((50, y), "1. Question 1 under wrapped directions")
        p.insert_text((50, y + 20), "Answer: (d)")
        y += 45

        # Q2
        p.insert_text((50, y), "2. Question 2 under wrapped directions")
        p.insert_text((50, y + 20), "Answer: (a)")

        pdf_path = self.dir_path / "test_m.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:m", "dummy_sha", pdf_path, {}, 2
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(len(passages), 1)
        self.assertEqual(passages[0]["applies_to"], [1, 2])
        self.assertEqual(items[0]["passage_ref"], passages[0]["passage_id"])
        self.assertEqual(items[1]["passage_ref"], passages[0]["passage_id"])

    def test_n_missing_passage_warning(self):
        """(n) An item that says 'passage given above' with nothing linked -> G_PASSAGE_MISSING."""
        doc = pymupdf.open()
        p = doc.new_page(width=600, height=800)

        p.insert_text((50, 50), "1. On the basis of the passage given above, which conclusion is valid?")
        p.insert_text((50, 75), "Answer: (b)")

        pdf_path = self.dir_path / "test_n.pdf"
        doc.save(pdf_path)

        status, items, passages, rep = extract_linear_document(
            "test:n", "dummy_sha", pdf_path, {}, 1
        )
        self.assertEqual(status, "PASS")
        self.assertEqual(len(items), 1)
        self.assertIsNone(items[0].get("passage_ref"))
        self.assertIn("G_PASSAGE_MISSING", items[0]["warnings"])


if __name__ == "__main__":
    unittest.main()
