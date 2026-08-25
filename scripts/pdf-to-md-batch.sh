#!/bin/bash

# Batch PDF to Markdown converter using Docker
# Supports both text-based and scanned (OCR) PDFs

INPUT_DIR="${1:-./_raw_source_archive/manjunath-study-material-ocr}"
OUTPUT_DIR="${2:-./_raw_source_archive/manjunath-study-material-md}"

mkdir -p "$OUTPUT_DIR"

TOTAL=$(find "$INPUT_DIR" -type f -name "*.pdf" -o -name "*.PDF" | wc -l)
COUNTER=0
SUCCESS=0
FAILED=0

echo "🚀 PDF to Markdown Batch Converter (Docker)"
echo "Input:  $INPUT_DIR"
echo "Output: $OUTPUT_DIR"
echo "📄 Found $TOTAL PDF files"
echo ""

# Find and process all PDFs
find "$INPUT_DIR" -type f \( -name "*.pdf" -o -name "*.PDF" \) | sort | while read pdf; do
  COUNTER=$((COUNTER + 1))
  FILENAME=$(basename "$pdf")
  OUTPUT_FILE="$OUTPUT_DIR/${FILENAME%.*}.md"
  
  # Skip if already converted
  if [ -f "$OUTPUT_FILE" ] && [ -s "$OUTPUT_FILE" ]; then
    echo "[$COUNTER/$TOTAL] ⏭️  $FILENAME (already converted)"
    continue
  fi
  
  echo -n "[$COUNTER/$TOTAL] Converting: $FILENAME ... "
  
  # Extract text using pdftotext (handles both text and OCR'd PDFs)
  TEMP_TEXT=$(mktemp)
  
  if docker run --rm -v "$(cd "$(dirname "$pdf")" && pwd):/input:ro" \
    stedolan/jq pdftotext "/input/$(basename "$pdf")" "$TEMP_TEXT" 2>/dev/null; then
    
    # Convert text to markdown with header detection
    {
      TITLE=$(basename "$pdf" | sed 's/\.pdf$//i; s/^[0-9]*_//; s/_/ /g')
      echo "# $TITLE"
      echo ""
      
      # Process text file
      grep -v "^$" "$TEMP_TEXT" | while read line; do
        # Detect headers (short lines or all caps)
        if [ ${#line} -lt 80 ] && echo "$line" | grep -qE "^[A-Z ]+$|^[0-9]+\. "; then
          echo "## $line"
          echo ""
        else
          echo "$line"
        fi
      done
    } > "$OUTPUT_FILE"
    
    echo "✅"
    ((SUCCESS++))
  else
    echo "❌ (extraction failed)"
    ((FAILED++))
  fi
  
  rm -f "$TEMP_TEXT"
done

echo ""
echo "📊 CONVERSION REPORT"
echo "=================================================="
echo "✅ Successful: $SUCCESS"
echo "❌ Failed: $FAILED"
echo "Total: $TOTAL"
echo "📁 Output: $OUTPUT_DIR"
