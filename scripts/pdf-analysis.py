#!/usr/bin/env python3
"""Clean PDF analysis - identify scanned vs text-based PDFs"""

import sys
import json
from pathlib import Path
from collections import Counter
import pymupdf

def analyze_pdf(pdf_path: str) -> dict:
    """Analyze a single PDF"""
    filename = Path(pdf_path).name
    
    try:
        doc = pymupdf.open(pdf_path)
        page_count = len(doc)
        
        total_text_chars = 0
        text_pages = 0
        image_count = 0
        
        # Check first 5 pages
        for page_num in range(min(5, page_count)):
            page = doc[page_num]
            text = page.get_text().strip()
            images = page.get_images()
            
            if len(text) > 50:  # Meaningful text (not just watermark)
                total_text_chars += len(text)
                text_pages += 1
            
            image_count += len(images)
        
        doc.close()
        
        # Classify
        if image_count > 0 and total_text_chars < 100:
            return {
                "file": filename,
                "pages": page_count,
                "images": image_count,
                "text_chars": total_text_chars,
                "status": "SCANNED",
                "detail": f"Image-only ({image_count} images, {total_text_chars} chars)"
            }
        elif total_text_chars < 100:
            return {
                "file": filename,
                "pages": page_count,
                "images": image_count,
                "text_chars": total_text_chars,
                "status": "EMPTY",
                "detail": f"No meaningful content ({total_text_chars} chars)"
            }
        else:
            return {
                "file": filename,
                "pages": page_count,
                "images": image_count,
                "text_chars": total_text_chars,
                "status": "OK",
                "detail": f"Extractable ({total_text_chars} chars in {text_pages} pages)"
            }
    
    except Exception as e:
        return {
            "file": filename,
            "status": "ERROR",
            "detail": str(e)
        }


def main():
    input_dir = r"C:\Users\bentn\OneDrive\Desktop\SKU\_raw_source_archive\manjunath-study-material-ocr"
    
    pdf_files = sorted(list(Path(input_dir).glob("**/*.pdf")) + list(Path(input_dir).glob("**/*.PDF")))
    
    print(f"\n[*] PDF Cleanliness Analysis")
    print(f"Found {len(pdf_files)} PDFs\n")
    
    results = []
    status_counts = Counter()
    
    for idx, pdf_file in enumerate(pdf_files, 1):
        rel_path = pdf_file.relative_to(input_dir)
        print(f"[{idx:2d}/{len(pdf_files)}] {str(rel_path):<60}", end=" ", flush=True)
        
        result = analyze_pdf(str(pdf_file))
        results.append(result)
        status = result["status"]
        status_counts[status] += 1
        
        print(result["detail"])
    
    # Summary
    print(f"\n[SUMMARY]")
    print("=" * 60)
    for status in ["OK", "SCANNED", "EMPTY", "ERROR"]:
        if status in status_counts:
            print(f"  {status}: {status_counts[status]}")
    
    # Save report
    report_path = Path(input_dir).parent / "pdf_cleanliness_report.json"
    report_path.write_text(json.dumps(results, indent=2))
    
    # Identify problematic files
    scanned = [r for r in results if r["status"] == "SCANNED"]
    empty = [r for r in results if r["status"] == "EMPTY"]
    
    if scanned:
        print(f"\n[SCANNED PDFs - Need OCR]")
        for r in scanned[:10]:
            print(f"  {r['file']}")
        if len(scanned) > 10:
            print(f"  ... and {len(scanned) - 10} more")
    
    if empty:
        print(f"\n[EMPTY/UNREADABLE PDFs]")
        for r in empty[:10]:
            print(f"  {r['file']}")
        if len(empty) > 10:
            print(f"  ... and {len(empty) - 10} more")
    
    print(f"\nReport saved: {report_path}\n")


if __name__ == "__main__":
    main()
