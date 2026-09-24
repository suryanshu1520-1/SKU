"""
Dump native text of a PDF (paper or key) into per-page JSON.

Usage: python scripts/qbank/extract_native_text.py <pdf> <outDir>
Writes <outDir>/pages.json = [{page, chars, text}] and prints a summary.
"""
import json
import os
import sys

import fitz  # pymupdf


def main():
    pdf = sys.argv[1]
    out = sys.argv[2]
    os.makedirs(out, exist_ok=True)

    doc = fitz.open(pdf)
    pages = []
    for i in range(len(doc)):
        text = doc[i].get_text()
        pages.append({"page": i + 1, "chars": len(text), "text": text})

    with open(os.path.join(out, "pages.json"), "w", encoding="utf-8") as f:
        json.dump(pages, f, ensure_ascii=False, indent=1)

    nonempty = [p for p in pages if p["chars"] > 0]
    print(f"pages={len(pages)} nonempty={len(nonempty)} total_chars={sum(p['chars'] for p in pages)}")


if __name__ == "__main__":
    main()
