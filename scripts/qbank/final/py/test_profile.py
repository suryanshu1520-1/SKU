import os
from pathlib import Path
import tempfile
import unittest

import pymupdf as fitz

from common import map_header, norm_header
from profile_docs import profile_pdf


class TestProfile(unittest.TestCase):
    def test_a_table_headers_and_family(self):
        # Direct header mapping check
        raw_headers = ["Q.N.", "Questions", "A ns w er", "Explanation", "Lev el"]
        canonical = [map_header(h) for h in raw_headers]
        self.assertEqual(canonical, ["qno", "question", "answer", "explanation", "level"])

        # Create synthetic PDF with table grid
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "test_table.pdf"
            doc = fitz.open()

            for p_num in range(2):
                page = doc.new_page(width=600, height=800)
                # Draw table borders
                page.draw_rect(fitz.Rect(50, 50, 550, 200), color=(0, 0, 0), width=1)
                page.draw_line(fitz.Point(50, 80), fitz.Point(550, 80), color=(0, 0, 0), width=1)
                page.draw_line(fitz.Point(100, 50), fitz.Point(100, 200), color=(0, 0, 0), width=1)
                page.draw_line(fitz.Point(250, 50), fitz.Point(250, 200), color=(0, 0, 0), width=1)
                page.draw_line(fitz.Point(320, 50), fitz.Point(320, 200), color=(0, 0, 0), width=1)
                page.draw_line(fitz.Point(450, 50), fitz.Point(450, 200), color=(0, 0, 0), width=1)

                # Header text
                page.insert_text(fitz.Point(60, 70), "Q.N.")
                page.insert_text(fitz.Point(110, 70), "Questions")
                page.insert_text(fitz.Point(260, 70), "A ns w er")
                page.insert_text(fitz.Point(330, 70), "Explanation")
                page.insert_text(fitz.Point(460, 70), "Lev el")

                # Row text
                page.insert_text(fitz.Point(60, 110), str(p_num + 1))
                page.insert_text(fitz.Point(110, 110), f"Question stem content for question {p_num + 1} with lots of descriptive words")
                page.insert_text(fitz.Point(260, 110), "(a)")
                page.insert_text(fitz.Point(330, 110), "Detailed explanation text here")
                page.insert_text(fitz.Point(460, 110), "Moderate")

            doc.save(str(pdf_path))
            doc.close()

            profile = profile_pdf(pdf_path, "sha_test_a", ["test:a"], "Prelims")
            self.assertEqual(profile["family"], "TABLE")
            self.assertEqual(profile["header_canonical"], ["qno", "question", "answer", "explanation", "level"])

    def test_b_excluded_and_unmapped_headers(self):
        self.assertEqual(map_header("Coverage (Complete/Partial)"), "EXCLUDED")
        self.assertEqual(map_header("Weird Column"), None)

        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "test_unmapped.pdf"
            doc = fitz.open()
            page = doc.new_page(width=600, height=800)

            # Table grid
            page.draw_rect(fitz.Rect(50, 50, 550, 200), color=(0, 0, 0), width=1)
            page.draw_line(fitz.Point(50, 80), fitz.Point(550, 80), color=(0, 0, 0), width=1)
            page.draw_line(fitz.Point(120, 50), fitz.Point(120, 200), color=(0, 0, 0), width=1)
            page.draw_line(fitz.Point(240, 50), fitz.Point(240, 200), color=(0, 0, 0), width=1)
            page.draw_line(fitz.Point(360, 50), fitz.Point(360, 200), color=(0, 0, 0), width=1)

            page.insert_text(fitz.Point(60, 70), "Q.No.")
            page.insert_text(fitz.Point(130, 70), "Question")
            page.insert_text(fitz.Point(250, 70), "Answer")
            page.insert_text(fitz.Point(370, 70), "Weird Column")

            page.insert_text(fitz.Point(60, 110), "1")
            page.insert_text(fitz.Point(130, 110), "Stem text is here with plenty of words to fill the cell")
            page.insert_text(fitz.Point(250, 110), "A")
            page.insert_text(fitz.Point(370, 110), "Odd value")

            doc.save(str(pdf_path))
            doc.close()

            profile = profile_pdf(pdf_path, "sha_test_b", ["test:b"], "Prelims")
            self.assertIn("Weird Column", profile["unmapped_headers"])

    def test_c_linear_items_family(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "test_linear.pdf"
            doc = fitz.open()

            # Create 60 items across multiple pages
            items_per_page = 10
            for p in range(6):
                page = doc.new_page(width=600, height=800)
                y = 50
                for i in range(1, items_per_page + 1):
                    item_num = p * items_per_page + i
                    text = (
                        f"{item_num}. Consider the following statements:\n"
                        f"(a) first option (b) second option (c) third option (d) fourth option\n"
                        f"Answer: (b)\n"
                    )
                    page.insert_text(fitz.Point(50, y), text)
                    y += 65

            doc.save(str(pdf_path))
            doc.close()

            profile = profile_pdf(pdf_path, "sha_test_c", ["test:c"], "Prelims")
            self.assertEqual(profile["family"], "LINEAR")

    def test_d_scanned_image_only(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "test_scanned.pdf"
            doc = fitz.open()

            for _ in range(2):
                page = doc.new_page(width=600, height=800)
                # Create a small pixmap image
                pix = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 50, 50), 0)
                pix.clear_with(255)
                page.insert_image(fitz.Rect(50, 50, 500, 700), pixmap=pix)

            doc.save(str(pdf_path))
            doc.close()

            profile = profile_pdf(pdf_path, "sha_test_d", ["test:d"], "Prelims")
            self.assertEqual(profile["family"], "SCANNED")
            self.assertEqual(len(profile["image_only_pages"]), 2)

    def test_e_linear_multiline_number_and_nextline_ans(self):
        # Step 0 test: numbers alone on their lines plus Ans.\nB answers -> LINEAR
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "test_linear_multiline.pdf"
            doc = fitz.open()

            items_per_page = 10
            for p in range(6):
                page = doc.new_page(width=600, height=800)
                y = 50
                for i in range(1, items_per_page + 1):
                    item_num = p * items_per_page + i
                    text = (
                        f"{item_num}.\n"
                        f"Consider the following statements for item {item_num}:\n"
                        f"(a) opt A (b) opt B (c) opt C (d) opt D\n"
                        f"Ans.\n"
                        f"B\n"
                    )
                    page.insert_text(fitz.Point(50, y), text)
                    y += 70

            doc.save(str(pdf_path))
            doc.close()

            profile = profile_pdf(pdf_path, "sha_test_e", ["test:e"], "Prelims")
            self.assertEqual(profile["family"], "LINEAR")

    def test_f_ocr_producer_scanned(self):
        # Synthetic test: text PDF with producer ABBYY FineReader 11 -> SCANNED
        with tempfile.TemporaryDirectory() as tmp_dir:
            pdf_path = Path(tmp_dir) / "test_ocr.pdf"
            doc = fitz.open()
            page = doc.new_page(width=600, height=800)
            page.insert_text(fitz.Point(50, 100), "This is text in an OCR document with plenty of words to exceed threshold.")
            doc.set_metadata({"producer": "ABBYY FineReader 11"})
            doc.save(str(pdf_path))
            doc.close()

            profile = profile_pdf(pdf_path, "sha_test_f", ["test:f"], "Mains")
            self.assertEqual(profile["family"], "SCANNED")
            self.assertTrue(profile["family_evidence"].get("ocr_text_layer"))


if __name__ == "__main__":
    unittest.main()

