import fitz
import os
import sys

def main():
    if len(sys.argv) < 3:
        print("Usage: python render_pdf_pages.py <pdf_path> <output_dir>")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    out_dir = sys.argv[2]
    
    os.makedirs(out_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    count = 0
    for i in range(len(doc)):
        page = doc[i]
        pix = page.get_pixmap(dpi=180)
        out_file = os.path.join(out_dir, f"page_{i+1:03d}.png")
        pix.save(out_file)
        count += 1
    print(f"Rendered {count} pages to {out_dir}")

if __name__ == "__main__":
    main()
