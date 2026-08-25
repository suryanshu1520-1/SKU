import os, json, re
import fitz

MD_DIR = os.path.join(os.getcwd(), '_raw_source_archive', 'manjunath-study-material-md')
OCR_DIR = os.path.join(os.getcwd(), '_raw_source_archive', 'manjunath-study-material-ocr')

WEAK_FILES = [
    ('17_IAS Prelims 2019_ General Studies Paper II.md', 80),
    ('19_IAS Prelims 2018_ General Studies Paper II.md', 80),
    ('20_IAS Prelims 2016_ General Studies Paper I.md', 100),
    ('21_IAS Prelims 2016_ General Studies Paper II.md', 80),
    ('23_IAS Prelims 2015_ General Studies Paper II.md', 80),
    ('25_IAS Prelims 2014_ General Studies Paper II.md', 80),
    ('26_IAS Prelims 2014_ General Studies Paper II (X Series).md', 80),
    ('28_IAS Prelims 2013_ General Studies Paper II.md', 80),
    ('29_IAS Prelims 2012_ General Studies Paper I.md', 100),
    ('30_IAS Prelims 2012_ General Studies Paper II.md', 80),
    ('31_IAS Prelims 2012_ General Studies Paper II (X Series).md', 80),
    ('33_IAS Prelims 2009_ General Studies Paper.md', 150),
]

audit_results = []

for filename, maxQ in WEAK_FILES:
    md_path = os.path.join(MD_DIR, filename)
    pdf_name = re.sub(r'\.md$', '.pdf', filename)
    pdf_path = os.path.join(OCR_DIR, pdf_name)
    
    pdf_pages = 0
    if os.path.exists(pdf_path):
        try:
            doc = fitz.open(pdf_path)
            pdf_pages = len(doc)
        except Exception:
            pass
            
    content = ""
    if os.path.exists(md_path):
        with open(md_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
    # Check for leaked model thoughts/reasoning
    has_leaked = bool(re.search(r'Analyze the Images|Formulate the Output|The user wants|I need to look|Wait, let me|Block \d+|Top image:|Looking at the layout', content, re.I))
    
    # Check for garbled OCR / mojibake
    has_garbled = bool(re.search(r'Mauxtmuim|NCOBE|wadtarar|vaftaron|DO MOP|gfetrent|HyRRA|crften|Srren|fo\)|fa\)|\\\(a\)|ff\}|—_—_a ww', content, re.I))
    
    # Extract concrete representative failure excerpt
    excerpt = ""
    lines = [l.strip() for l in content.split('\n') if len(l.strip()) > 15 and not l.strip().startswith('---')]
    
    # Find matching corrupted or leaked line
    for l in lines:
        if re.search(r'Analyze the Images|Formulate the Output|The user wants|Mauxtmuim|NCOBE|wadtarar|vaftaron|DO MOP|gfetrent|HyRRA|fo\)|fa\)|—_—_a ww', l, re.I):
            excerpt = l[:160]
            break
            
    if not excerpt and lines:
        excerpt = lines[0][:160]
        
    mode = "other_genuine"
    if has_leaked and has_garbled:
        mode = "both"
    elif has_leaked:
        mode = "leaked_reasoning"
    elif has_garbled:
        mode = "garbled_ocr"
    elif pdf_pages < 30 and maxQ >= 80:
        mode = "other_genuine"
        
    audit_results.append({
        "file": filename,
        "pdf_pages": pdf_pages,
        "max_q": maxQ,
        "failure_mode": mode,
        "has_leaked_reasoning": has_leaked,
        "has_garbled_ocr": has_garbled,
        "concrete_excerpt": excerpt
    })

print(json.dumps(audit_results, indent=2))
