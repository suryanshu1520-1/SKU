import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest

import pymupdf

try:
    from scripts.qbank.final.py.crops import run_crops, safe_id
except ModuleNotFoundError:
    from crops import run_crops, safe_id


class TestCrops(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.r_dir = Path(self.temp_dir.name)
        # Set QBANK_RUN_DIR for assert_run_dir_safe if needed
        self.orig_env = os.environ.get("QBANK_RUN_DIR")
        os.environ["QBANK_RUN_DIR"] = str(self.r_dir)

    def tearDown(self):
        if self.orig_env is not None:
            os.environ["QBANK_RUN_DIR"] = self.orig_env
        else:
            os.environ.pop("QBANK_RUN_DIR", None)
        self.temp_dir.cleanup()

    def test_synthetic_crop_and_figure(self):
        # 1. Create synthetic PDF
        doc = pymupdf.open()
        page = doc.new_page(width=600, height=800)
        page.insert_text(
            (72, 120),
            "1. What is the capital of India?\n(a) Mumbai\n(b) New Delhi\n(c) Kolkata\n(d) Chennai",
            fontsize=12,
        )
        page.draw_rect(pymupdf.Rect(72, 250, 300, 450), color=(1, 0, 0), fill=(0, 1, 0))
        for y_off in range(260, 440, 15):
            page.insert_text((80, y_off), f"Synthetic diagram line {y_off} pattern data", fontsize=10)

        sources_dir = self.r_dir / "sources" / "synth"
        sources_dir.mkdir(parents=True, exist_ok=True)
        pdf_bytes = doc.tobytes()
        doc.close()

        sha256 = hashlib.sha256(pdf_bytes).hexdigest()
        pdf_path = sources_dir / f"{sha256}.pdf"
        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        # 2. Create envelope occurrence with bboxes and figure_regions
        occ_id = "mock:2024-GS-1:solution:en_p1_q1"
        env = {
            "occurrence": {
                "occurrence_id": occ_id,
                "identity": {
                    "exam": "UPSC_CSE",
                    "stage": "Prelims",
                    "year": 2024,
                    "paper": "GS-1",
                    "language": "en",
                    "question_number": 1,
                },
                "text": {
                    "stem": "What is the capital of India?",
                    "options": [{"key": "a", "text": "Mumbai"}],
                },
                "evidence": {
                    "source_document_id": "mock:doc",
                    "sha256": sha256,
                    "page": 1,
                },
            },
            "bboxes": {
                "question": [[1, 70.0, 100.0, 400.0, 200.0]],
                "answer": [[1, 70.0, 200.0, 400.0, 220.0]],
            },
            "figure_regions": [
                [1, 72.0, 250.0, 200.0, 350.0],  # 128x100 pt > 5pt
            ],
        }

        occ_dir = self.r_dir / "occurrences" / "synth"
        occ_dir.mkdir(parents=True, exist_ok=True)
        with open(occ_dir / "mock.jsonl", "w", encoding="utf-8") as f:
            f.write(json.dumps(env) + "\n")

        # 3. Create queue item
        item_id = "UPSC_CSE_Prelims_2024_GS-1_Q001_en:G_OPTIONS"
        queue_item = {
            "item_id": item_id,
            "canonical_id": "UPSC_CSE_Prelims_2024_GS-1_Q001_en",
            "occurrence_id": occ_id,
            "gate": "G_OPTIONS",
            "reason_code": "placeholder_options",
            "detail": "Test queue item",
            "candidates": [],
            "evidence": [
                {
                    "source_document_id": "mock:doc",
                    "sha256": sha256,
                    "page": 1,
                }
            ],
            "crop": None,
        }

        conflicts_dir = self.r_dir / "conflicts"
        conflicts_dir.mkdir(parents=True, exist_ok=True)
        with open(conflicts_dir / "queue.jsonl", "w", encoding="utf-8") as f:
            f.write(json.dumps(queue_item) + "\n")

        # 4. Run crops
        rep = run_crops(self.r_dir)

        # 5. Assertions
        self.assertEqual(rep["queue_crops"], 1)
        self.assertEqual(rep["figure_crops"], 1)
        self.assertEqual(rep["missing_pdf"], 0)

        crop_file = self.r_dir / "crops" / f"{safe_id(item_id)}.png"
        self.assertTrue(crop_file.exists(), "Item crop PNG should exist")
        self.assertGreater(crop_file.stat().st_size, 1024, "PNG size should be > 1 KB")

        fig_file = self.r_dir / "crops" / f"fig-{safe_id(occ_id)}-1.png"
        self.assertTrue(fig_file.exists(), "Figure crop PNG should exist")
        self.assertGreater(fig_file.stat().st_size, 1024, "Figure PNG size should be > 1 KB")

        # Check queue item updated in queue.jsonl
        with open(conflicts_dir / "queue.jsonl", "r", encoding="utf-8") as f:
            updated_item = json.loads(f.readline())
        self.assertEqual(updated_item["crop"], f"crops/{safe_id(item_id)}.png")


if __name__ == "__main__":
    unittest.main()
