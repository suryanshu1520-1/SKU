#!/usr/bin/env python3
"""
Batch PDF to Markdown converter with OCR support
Handles both text-based and scanned PDFs
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Tuple
import pymupdf  # PyMuPDF

try:
    from pytesseract import pytesseract
    from pdf2image import convert_from_path
    HAS_OCR = True
except ImportError:
    HAS_OCR = False


def extract_text_pymupdf(pdf_path: str) -> str:
    """Extract text using PyMuPDF (fast, reliable for text-based PDFs)"""
    try:
        doc = pymupdf.open(pdf_path)
        text = ""
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            text += page.get_text()
            text += "\n---PAGE_BREAK---\n"
        
        doc.close()
        return text
    except Exception as e:
        print(f"    ❌ PyMuPDF extraction failed: {e}")
        return ""


def extract_text_ocr(pdf_path: str) -> str:
    """Extract text using Tesseract OCR for scanned PDFs"""
    if not HAS_OCR:
        return ""
    
    try:
        images = convert_from_path(pdf_path, dpi=150, first_page=1, last_page=min(5, 999))
        text = ""
        
        for idx, image in enumerate(images):
            try:
                page_text = pytesseract.image_to_string(image)
                text += page_text
                text += "\n---PAGE_BREAK---\n"
            except Exception:
                pass
        
        return text
    except Exception:
        return ""


def is_boilerplate_only(text: str) -> bool:
    """Detect if text is mostly repeated watermarks/boilerplate"""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if len(lines) < 10:
        return True
    
    # Count line frequency - high repetition = boilerplate
    from collections import Counter
    line_counts = Counter(lines)
    repeated = sum(1 for count in line_counts.values() if count > len(lines) * 0.1)
    
    return repeated > len(line_counts) * 0.3  # >30% repeated lines

def clean_text(text: str) -> str:
    """Clean and normalize extracted text"""
    # Remove excessive whitespace
    lines = [line.strip() for line in text.split("\n")]
    lines = [line for line in lines if line]  # Remove empty lines
    
    # Fix common OCR artifacts
    cleaned = []
    for line in lines:
        # Skip page breaks and form feeds
        if "---PAGE_BREAK---" in line or "\f" in line:
            cleaned.append("\n")
            continue
        
        # Remove control characters
        line = "".join(char for char in line if ord(char) >= 32 or char in "\n\t")
        if line.strip():
            cleaned.append(line)
    
    return "\n".join(cleaned)


def text_to_markdown(text: str, filename: str) -> str:
    """Convert plain text to well-structured Markdown"""
    lines = text.split("\n")
    
    # Create title from filename
    title = Path(filename).stem
    title = title.lstrip("0123456789_")
    title = title.replace("_", " ").title()
    
    markdown = [f"# {title}\n"]
    
    current_section = []
    
    for line in lines:
        stripped = line.strip()
        
        # Skip empty lines
        if not stripped:
            if current_section:
                markdown.append(" ".join(current_section) + "\n")
                current_section = []
            continue
        
        # Detect headers (short, all caps, or numbered)
        is_header = (
            (len(stripped) < 80 and stripped.isupper() and len(stripped) > 5) or
            (stripped[0].isdigit() and "." in stripped[:3]) or
            (len(stripped) < 60 and stripped.startswith(tuple("ABCDEFGHIJKLMNOPQRSTUVWXYZ")))
        )
        
        if is_header:
            if current_section:
                markdown.append(" ".join(current_section) + "\n")
                current_section = []
            markdown.append(f"## {stripped}\n\n")
        else:
            current_section.append(stripped)
    
    if current_section:
        markdown.append(" ".join(current_section) + "\n")
    
    return "\n".join(markdown)


def convert_pdf(pdf_path: str, output_dir: str) -> Tuple[str, str, str]:
    """
    Convert single PDF to Markdown
    Returns: (filename, status, message)
    """
    filename = Path(pdf_path).name
    output_filename = Path(pdf_path).stem + ".md"
    output_path = Path(output_dir) / output_filename
    
    # Check if already converted
    if output_path.exists() and output_path.stat().st_size > 100:
        return filename, "skipped", "Already converted"
    
    try:
        # Try primary extraction
        text = extract_text_pymupdf(pdf_path)
        
        # Check if extracted text is mostly boilerplate/watermarks
        if text and is_boilerplate_only(text):
            if HAS_OCR:
                ocr_text = extract_text_ocr(pdf_path)
                if ocr_text and len(ocr_text.strip()) > len(text.strip()) * 2:
                    text = ocr_text
            else:
                return filename, "failed", "Likely watermark/boilerplate, OCR unavailable"
        
        # If insufficient text, try OCR
        elif not text or len(text.strip()) < 500:
            if HAS_OCR:
                ocr_text = extract_text_ocr(pdf_path)
                if ocr_text and len(ocr_text.strip()) > 100:
                    text = ocr_text
            elif not text or len(text.strip()) < 50:
                return filename, "failed", "No text extracted, OCR not available"
        
        # Final validation: require substantial unique content
        if not text or len(text.strip()) < 100 or is_boilerplate_only(text):
            return filename, "failed", "Insufficient unique content after extraction"
        
        # Clean and convert
        cleaned_text = clean_text(text)
        markdown = text_to_markdown(cleaned_text, filename)
        
        # Write output
        output_path.write_text(markdown, encoding="utf-8")
        
        word_count = len(markdown.split())
        return filename, "success", f"{word_count} words"
        
    except Exception as e:
        return filename, "failed", str(e)[:100]


def batch_convert(input_dir: str, output_dir: str) -> None:
    """Batch convert all PDFs in directory"""
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Find all PDFs recursively
    pdf_files = sorted(list(input_path.glob("**/*.pdf")) + list(input_path.glob("**/*.PDF")))
    
    print("\n[*] PDF to Markdown Batch Converter")
    print(f"Input:  {input_dir}")
    print(f"Output: {output_dir}")
    print(f"Found {len(pdf_files)} PDF files\n")
    
    if not pdf_files:
        print("No PDF files found!")
        return
    
    results = []
    success_count = failed_count = skipped_count = 0
    
    for idx, pdf_file in enumerate(pdf_files, 1):
        rel_path = pdf_file.relative_to(input_path)
        print(f"[{idx}/{len(pdf_files)}] {rel_path}", end=" ", flush=True)
        
        filename, status, message = convert_pdf(str(pdf_file), str(output_path))
        results.append({"file": filename, "status": status, "message": message})
        
        if status == "success":
            success_count += 1
            print(f"[OK] ({message})")
        elif status == "failed":
            failed_count += 1
            print(f"[FAIL] ({message})")
        else:
            skipped_count += 1
            print(f"[SKIP] ({message})")
    
    # Print report
    print(f"\n\n[REPORT] CONVERSION RESULTS")
    print("=" * 50)
    print(f"[OK] Successful: {success_count}/{len(pdf_files)}")
    print(f"[FAIL] Failed: {failed_count}/{len(pdf_files)}")
    print(f"[SKIP] Skipped: {skipped_count}/{len(pdf_files)}")
    print(f"Output: {output_dir}")
    
    # Save report
    report_path = output_path / "_conversion_report.json"
    report_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nReport saved: {report_path}")
    
    # List failures
    failures = [r for r in results if r["status"] == "failed"]
    if failures:
        print(f"\n[WARN] Failed conversions ({len(failures)}):")
        for r in failures[:10]:
            print(f"   - {r['file']}: {r['message']}")
        if len(failures) > 10:
            print(f"   ... and {len(failures) - 10} more")
    print("")


if __name__ == "__main__":
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    input_dir = sys.argv[1] if len(sys.argv) > 1 else "/input"
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "/output"
    
    batch_convert(input_dir, output_dir)
