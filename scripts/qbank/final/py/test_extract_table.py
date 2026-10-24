import os
from pathlib import Path
import tempfile
import unittest

import pymupdf

try:
    from scripts.qbank.final.py.extract_table import extract_table_document
except ModuleNotFoundError:
    from extract_table import extract_table_document


class TestExtractTable(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.dir_path = Path(self.temp_dir.name)

    def tearDown(self):
        self.temp_dir.cleanup()

    def _create_synthetic_table_pdf(self) -> Path:
        """
        Creates a 2-page ruled PDF:
        Columns: Q.No. (50-100), Question (100-300), Answer (300-400), Explanation (400-550), VisionIAS (550-650, EXCLUDED)
        Page 1:
          Row 0: Header
          Row 1: Q1
          Row 2: Q2 (Part 1 explanation)
        Page 2:
          Row 0: Header repeat
          Row 1: Continuation of Q2 (empty Q.No., Part 2 explanation)
          Row 2: Q3
        """
        doc = pymupdf.open()
        p1 = doc.new_page(width=700, height=800)

        # Draw grid on Page 1
        x_cuts = [50, 100, 300, 400, 550, 650]
        y_cuts = [100, 150, 250, 350]

        for y in y_cuts:
            p1.draw_line((x_cuts[0], y), (x_cuts[-1], y))
        for x in x_cuts:
            p1.draw_line((x, y_cuts[0]), (x, y_cuts[-1]))

        # Row 0 (Header)
        p1.insert_text((60, 130), "Q.No.")
        p1.insert_text((110, 130), "Question")
        p1.insert_text((310, 130), "Answer")
        p1.insert_text((410, 130), "Explanation")
        p1.insert_text((560, 130), "VisionIAS TestSeries")

        # Row 1 (Q1)
        p1.insert_text((60, 200), "1.")
        p1.insert_text((110, 200), "Question 1 text")
        p1.insert_text((310, 200), "A")
        p1.insert_text((410, 200), "Exp 1")
        p1.insert_text((560, 200), "Ad text 1")

        # Row 2 (Q2 part 1)
        p1.insert_text((60, 300), "2.")
        p1.insert_text((110, 300), "Question 2 text")
        p1.insert_text((310, 300), "B")
        p1.insert_text((410, 300), "Exp 2 Part 1")
        p1.insert_text((560, 300), "Ad text 2")

        # Add image to Q1 question cell
        pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 30, 30), False)
        p1.insert_image(pymupdf.Rect(110, 210, 140, 240), pixmap=pix)

        # Add full-page watermark image (>60% page area)
        big_pix = pymupdf.Pixmap(
            pymupdf.csRGB, pymupdf.IRect(0, 0, 600, 700), False
        )
        p1.insert_image(pymupdf.Rect(50, 50, 650, 750), pixmap=big_pix)

        # Page 2
        p2 = doc.new_page(width=700, height=800)
        y_cuts_p2 = [100, 150, 250, 350]
        for y in y_cuts_p2:
            p2.draw_line((x_cuts[0], y), (x_cuts[-1], y))
        for x in x_cuts:
            p2.draw_line((x, y_cuts_p2[0]), (x, y_cuts_p2[-1]))

        # Row 0 (Header repeat)
        p2.insert_text((60, 130), "Q.No.")
        p2.insert_text((110, 130), "Question")
        p2.insert_text((310, 130), "Answer")
        p2.insert_text((410, 130), "Explanation")
        p2.insert_text((560, 130), "VisionIAS TestSeries")

        # Row 1 (Q2 continuation)
        p2.insert_text((410, 200), "Exp 2 Part 2")

        # Row 2 (Q3)
        p2.insert_text((60, 300), "3.")
        p2.insert_text((110, 300), "Question 3 text")
        p2.insert_text((310, 300), "C")
        p2.insert_text((410, 300), "Exp 3")

        pdf_path = self.dir_path / "synthetic_test.pdf"
        doc.save(str(pdf_path))
        doc.close()
        return pdf_path

    def test_synthetic_table_extraction(self):
        pdf_path = self._create_synthetic_table_pdf()
        profile_data = {
            "family": "TABLE",
            "header_page": 1,
            "unmapped_headers": [],
        }

        status, items, rep = extract_table_document(
            doc_id="test:syn:solution:en",
            sha256="dummy_sha",
            pdf_path=pdf_path,
            profile_data=profile_data,
            expected_n=3,
        )

        # (a) 3 items, Q2 continuation holds both parts in order, pages=[1, 2]
        self.assertEqual(status, "PASS")
        self.assertEqual(len(items), 3)

        q2 = items[1]
        self.assertEqual(q2["qno"], 2)
        self.assertIn("Exp 2 Part 1", q2["cells"]["explanation"])
        self.assertIn("Exp 2 Part 2", q2["cells"]["explanation"])
        self.assertEqual(
            q2["cells"]["explanation"], "Exp 2 Part 1\nExp 2 Part 2"
        )
        self.assertEqual(q2["pages"], [1, 2])

        # (b) Header repeat at top of page 2 was skipped (items remain 3, not extra questions)
        self.assertEqual(rep["missing"], [])
        self.assertEqual(rep["duplicates"], [])

        # (c) Text in EXCLUDED column never appears in output
        for item in items:
            for cell_val in item["cells"].values():
                self.assertNotIn("Ad text", cell_val)
                self.assertNotIn("VisionIAS", cell_val)

        # (f) Small image inside Q1's question cell appears in figure_regions; full-page does not
        q1 = items[0]
        self.assertEqual(len(q1["figure_regions"]), 1)
        fig = q1["figure_regions"][0]
        self.assertEqual(fig[0], 1)  # page 1
        self.assertEqual(fig[1], 110.0)  # x0
        self.assertEqual(fig[3], 140.0)  # x1

    def test_unmapped_header_blocks(self):
        # (d) An unmapped header -> BLOCKED_UNMAPPED_HEADER
        pdf_path = self._create_synthetic_table_pdf()
        profile_data = {
            "family": "TABLE",
            "header_page": 1,
            "unmapped_headers": ["Unrecognized Header"],
        }
        status, items, rep = extract_table_document(
            doc_id="test:syn:solution:en",
            sha256="dummy_sha",
            pdf_path=pdf_path,
            profile_data=profile_data,
            expected_n=3,
        )
        self.assertEqual(status, "BLOCKED_UNMAPPED_HEADER")
        self.assertEqual(len(items), 0)
        self.assertEqual(rep["status"], "BLOCKED_UNMAPPED_HEADER")

    def test_numbering_missing_fails(self):
        # (e) Numbering 1, 2, 4 -> FAIL with missing: [3]
        doc = pymupdf.open()
        p1 = doc.new_page(width=600, height=800)
        x_cuts = [50, 100, 350, 450]
        y_cuts = [100, 150, 200, 250, 300]
        for y in y_cuts:
            p1.draw_line((x_cuts[0], y), (x_cuts[-1], y))
        for x in x_cuts:
            p1.draw_line((x, y_cuts[0]), (x, y_cuts[-1]))

        p1.insert_text((60, 130), "Q.No.")
        p1.insert_text((110, 130), "Question")
        p1.insert_text((360, 130), "Answer")

        p1.insert_text((60, 180), "1.")
        p1.insert_text((110, 180), "Question 1")
        p1.insert_text((360, 180), "A")

        p1.insert_text((60, 230), "2.")
        p1.insert_text((110, 230), "Question 2")
        p1.insert_text((360, 230), "B")

        p1.insert_text((60, 280), "4.")
        p1.insert_text((110, 280), "Question 4")
        p1.insert_text((360, 280), "D")

        pdf_path = self.dir_path / "missing_num.pdf"
        doc.save(str(pdf_path))
        doc.close()

        profile_data = {
            "family": "TABLE",
            "header_page": 1,
            "unmapped_headers": [],
        }
        status, items, rep = extract_table_document(
            doc_id="test:syn:solution:en",
            sha256="dummy_sha",
            pdf_path=pdf_path,
            profile_data=profile_data,
            expected_n=4,
        )
        self.assertEqual(status, "FAIL")
        self.assertEqual(rep["missing"], [3])

    def test_foreign_summary_table_skipped(self):
        # (g) 2-column summary table below the last question is skipped, and last item unchanged
        doc = pymupdf.open()
        p1 = doc.new_page(width=700, height=800)
        x_cuts = [50, 100, 300, 400, 600]
        for y in [100, 150, 250]:
            p1.draw_line((x_cuts[0], y), (x_cuts[-1], y))
        for x in x_cuts:
            p1.draw_line((x, 100), (x, 250))

        p1.insert_text((60, 130), "Q.No.")
        p1.insert_text((110, 130), "Question")
        p1.insert_text((310, 130), "Answer")
        p1.insert_text((410, 130), "Explanation")

        p1.insert_text((60, 200), "1.")
        p1.insert_text((110, 200), "Question 1 text")
        p1.insert_text((310, 200), "A")
        p1.insert_text((410, 200), "Explanation 1 text")

        # 2-column foreign summary table further down the page
        sum_x = [50, 350, 650]
        for y in [400, 450, 500]:
            p1.draw_line((sum_x[0], y), (sum_x[-1], y))
        for x in sum_x:
            p1.draw_line((x, 400), (x, 500))

        p1.insert_text((60, 430), "Difficulty Level")
        p1.insert_text((360, 430), "Number of Questions")
        p1.insert_text((60, 480), "Medium")
        p1.insert_text((360, 480), "1")

        pdf_path = self.dir_path / "summary_table.pdf"
        doc.save(str(pdf_path))
        doc.close()

        profile_data = {
            "family": "TABLE",
            "header_page": 1,
            "unmapped_headers": [],
        }
        status, items, rep = extract_table_document(
            doc_id="test:syn:solution:en",
            sha256="dummy_sha",
            pdf_path=pdf_path,
            profile_data=profile_data,
            expected_n=1,
        )

        self.assertEqual(status, "PASS")
        self.assertEqual(len(items), 1)
        self.assertGreaterEqual(rep["foreign_tables_skipped"], 1)
        q1 = items[0]
        self.assertEqual(q1["cells"]["question"], "Question 1 text")
        self.assertEqual(q1["cells"]["explanation"], "Explanation 1 text")
        self.assertNotIn("Difficulty Level", q1["cells"]["question"])
        self.assertNotIn("Number of Questions", q1["cells"]["explanation"])

    def test_legitimate_continuation_table_merged(self):
        # (h) Legitimate continuation table on the next page is still merged
        doc = pymupdf.open()
        x_cuts = [50, 100, 300, 400, 600]

        # Page 1
        p1 = doc.new_page(width=700, height=800)
        for y in [100, 150, 250]:
            p1.draw_line((x_cuts[0], y), (x_cuts[-1], y))
        for x in x_cuts:
            p1.draw_line((x, 100), (x, 250))
        p1.insert_text((60, 130), "Q.No.")
        p1.insert_text((110, 130), "Question")
        p1.insert_text((310, 130), "Answer")
        p1.insert_text((410, 130), "Explanation")

        p1.insert_text((60, 200), "1.")
        p1.insert_text((110, 200), "Question 1 text")
        p1.insert_text((310, 200), "A")
        p1.insert_text((410, 200), "Exp part 1")

        # Page 2: continuation table with same columns
        p2 = doc.new_page(width=700, height=800)
        for y in [100, 150, 200]:
            p2.draw_line((x_cuts[0], y), (x_cuts[-1], y))
        for x in x_cuts:
            p2.draw_line((x, 100), (x, 200))
        p2.insert_text((410, 180), "Exp part 2 continuation")

        pdf_path = self.dir_path / "continuation_table.pdf"
        doc.save(str(pdf_path))
        doc.close()

        profile_data = {
            "family": "TABLE",
            "header_page": 1,
            "unmapped_headers": [],
        }
        status, items, rep = extract_table_document(
            doc_id="test:syn:solution:en",
            sha256="dummy_sha",
            pdf_path=pdf_path,
            profile_data=profile_data,
            expected_n=1,
        )

        self.assertEqual(status, "PASS")
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["pages"], [1, 2])
        self.assertIn("Exp part 2 continuation", items[0]["cells"]["explanation"])
        self.assertGreaterEqual(rep["continuation_rows_merged"], 1)

    def test_gap_fill_restores_missing_line_and_band_bbox(self):
        # (i) Cell whose middle line has no sub-cell box: restored in order, covered by band bbox
        doc = pymupdf.open()
        p1 = doc.new_page(width=700, height=800)
        x_cuts = [50, 100, 300, 400]

        # Table 1: Header + Q1 top subcell (y=100..200)
        for y in [100, 150, 200]:
            p1.draw_line((x_cuts[0], y), (x_cuts[-1], y))
        for x in x_cuts:
            p1.draw_line((x, 100), (x, 200))

        p1.insert_text((60, 130), "Q.No.")
        p1.insert_text((110, 130), "Question")
        p1.insert_text((310, 130), "Answer")

        p1.insert_text((60, 180), "1.")
        p1.insert_text((110, 180), "First line of question")
        p1.insert_text((310, 180), "A")

        # Missing line inserted in y-gap (200..250) without cell box
        p1.insert_text((110, 225), "Middle line of question")

        # Table 2: Q1 continuation row (y=250..300)
        for y in [250, 300]:
            p1.draw_line((x_cuts[0], y), (x_cuts[-1], y))
        for x in x_cuts:
            p1.draw_line((x, 250), (x, 300))
        p1.insert_text((110, 280), "Third line of question")

        pdf_path = self.dir_path / "gap_line.pdf"
        doc.save(str(pdf_path))
        doc.close()

        profile_data = {
            "family": "TABLE",
            "header_page": 1,
            "unmapped_headers": [],
        }
        status, items, rep = extract_table_document(
            doc_id="test:syn:solution:en",
            sha256="dummy_sha",
            pdf_path=pdf_path,
            profile_data=profile_data,
            expected_n=1,
        )

        self.assertEqual(status, "PASS")
        self.assertGreaterEqual(rep["cell_gap_fill"], 1)
        expected_text = "First line of question\nMiddle line of question\nThird line of question"
        self.assertEqual(items[0]["cells"]["question"], expected_text)

        # Assert band bbox covers the middle line y=225
        q_bands = items[0]["bboxes"]["question"]
        self.assertEqual(len(q_bands), 1)
        band = q_bands[0]
        self.assertLessEqual(band[2], 225.0)  # top_y0 <= 225
        self.assertGreaterEqual(band[4], 225.0)  # bottom_y1 >= 225

    def test_right_clipped_word_restored(self):
        # (j) Right-clipped word ('sources o') restored to 'sources of' by gap-fill
        doc = pymupdf.open()
        p1 = doc.new_page(width=700, height=800)

        # Header table
        for y in [100, 150]:
            p1.draw_line((50, y), (400, y))
        for x in [50, 100, 300, 400]:
            p1.draw_line((x, 100), (x, 150))
        p1.insert_text((60, 130), "Q.No.")
        p1.insert_text((110, 130), "Question")
        p1.insert_text((310, 130), "Answer")

        # Row 1: Question cell border at bx=152 so 'sources of' is extracted as 'sources o'
        for y in [150, 200]:
            p1.draw_line((50, y), (152, y))
            p1.draw_line((300, y), (400, y))
        for x in [50, 100, 152, 300, 400]:
            p1.draw_line((x, 150), (x, 200))

        p1.insert_text((60, 180), "1.")
        p1.insert_text((105, 180), "sources of")
        p1.insert_text((310, 180), "A")

        # Dropped line in gap (200..250) triggering gap-fill
        p1.insert_text((105, 225), "financial assistance")

        # Row 2 continuation: 250..300
        for y in [250, 300]:
            p1.draw_line((50, y), (400, y))
        for x in [50, 100, 300, 400]:
            p1.draw_line((x, 250), (x, 300))
        p1.insert_text((105, 280), "for startups")

        pdf_path = self.dir_path / "clipped_word.pdf"
        doc.save(str(pdf_path))
        doc.close()

        profile_data = {
            "family": "TABLE",
            "header_page": 1,
            "unmapped_headers": [],
        }
        status, items, rep = extract_table_document(
            doc_id="test:syn:solution:en",
            sha256="dummy_sha",
            pdf_path=pdf_path,
            profile_data=profile_data,
            expected_n=1,
        )

        self.assertEqual(status, "PASS")
        self.assertGreaterEqual(rep["cell_gap_fill"], 1)
        self.assertIn("sources of", items[0]["cells"]["question"])
        self.assertNotIn("sources o\n", items[0]["cells"]["question"])

    def test_geometry_unverifiable_flagged_and_unchanged(self):
        # (k) Synthetic document whose geometry makes doc_agreement < 0.80 is flagged and unchanged
        doc = pymupdf.open()
        p1 = doc.new_page(width=700, height=800)
        x_cuts = [50, 100, 200, 400, 500]

        for y in [100, 150, 200]:
            p1.draw_line((50, y), (500, y))
        for x in x_cuts:
            p1.draw_line((x, 100), (x, 200))

        p1.insert_text((60, 130), "Q.No.")
        p1.insert_text((110, 130), "Question")
        p1.insert_text((210, 130), "VisionIAS")
        p1.insert_text((410, 130), "Answer")

        p1.insert_text((60, 180), "1.")
        # Long word spanning past Question cell width (100..200) into 336 pt
        p1.insert_text((105, 180), "antidisestablishmentarianism", fontsize=18)
        p1.insert_text((410, 180), "A")

        pdf_path = self.dir_path / "unverifiable.pdf"
        doc.save(str(pdf_path))
        doc.close()

        profile_data = {
            "family": "TABLE",
            "header_page": 1,
            "unmapped_headers": [],
        }
        status, items, rep = extract_table_document(
            doc_id="test:syn:solution:en",
            sha256="dummy_sha",
            pdf_path=pdf_path,
            profile_data=profile_data,
            expected_n=1,
        )

        self.assertEqual(status, "PASS")
        self.assertEqual(rep["doc_agreement"], 0.0)
        self.assertTrue(rep["geometry_unverifiable"])
        self.assertEqual(rep["cell_gap_fill"], 0)
        self.assertEqual(items[0]["cells"]["question"], "antidisestab")


if __name__ == "__main__":
    unittest.main()

