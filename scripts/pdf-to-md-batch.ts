import fs from "fs";
import path from "path";

interface ConversionResult {
  file: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
  outputPath?: string;
}

// Dynamic import for pdfjs
let pdfjs: any;
let canvasModule: any;

async function initModules() {
  if (!pdfjs) {
    const pdfModule = await import("pdfjs-dist");
    pdfjs = pdfModule.default;
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfModule.version}/pdf.worker.min.js`;
  }

  if (!canvasModule) {
    canvasModule = await import("canvas");
  }

  return { pdfjs, canvasModule };
}

async function extractTextFromPDF(pdfPath: string): Promise<string> {
  try {
    const { pdfjs } = await initModules();

    const dataBuffer = fs.readFileSync(pdfPath);
    const pdf = await pdfjs.getDocument(new Uint8Array(dataBuffer)).promise;

    let extractedText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str || "").join(" ");
      extractedText += pageText + "\n\n";
    }

    return extractedText;
  } catch (error: any) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }
}

function cleanMarkdown(text: string): string {
  // Remove excessive whitespace
  text = text.replace(/\n\n\n+/g, "\n\n");

  // Fix common OCR artifacts
  text = text.replace(/\s+/g, " "); // Normalize spaces
  text = text.replace(/([a-z])\s+([A-Z])/g, "$1 $2"); // Fix spacing

  // Convert form feeds and special chars
  text = text.replace(/\f/g, "\n---\n"); // Page breaks
  text = text.replace(/\x00/g, ""); // Remove null chars

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n");

  return text;
}

function textToMarkdown(text: string, filename: string): string {
  // Add title from filename
  const title = path
    .parse(filename)
    .name.replace(/^[\d_]+/, "") // Remove leading numbers
    .replace(/_/g, " ")
    .trim();

  let markdown = `# ${title}\n\n`;

  // Split into logical sections
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  let currentParagraph: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentParagraph.length > 0) {
        markdown += currentParagraph.join(" ") + "\n\n";
        currentParagraph = [];
      }
      continue;
    }

    // Detect headers (short lines, numbered, or all caps)
    if (
      (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && trimmed.length > 5) ||
      /^\d+[\.\)]\s+/.test(trimmed) ||
      /^[A-Z][A-Z\s]+$/.test(trimmed)
    ) {
      if (currentParagraph.length > 0) {
        markdown += currentParagraph.join(" ") + "\n\n";
        currentParagraph = [];
      }
      markdown += `## ${trimmed}\n\n`;
    } else {
      currentParagraph.push(trimmed);
    }
  }

  if (currentParagraph.length > 0) {
    markdown += currentParagraph.join(" ") + "\n\n";
  }

  return markdown;
}

async function convertPDFToMarkdown(
  inputPath: string,
  outputDir: string
): Promise<ConversionResult> {
  const filename = path.basename(inputPath);
  const outputFilename = path
    .basename(inputPath)
    .replace(/\.pdf$/i, ".md");
  const outputPath = path.join(outputDir, outputFilename);

  try {
    // Skip if already converted
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 100) {
        return {
          file: filename,
          status: "skipped",
          reason: "Already converted",
          outputPath,
        };
      }
    }

    // Extract text from PDF
    const extractedText = await extractTextFromPDF(inputPath);

    if (!extractedText || extractedText.trim().length === 0) {
      return {
        file: filename,
        status: "failed",
        reason: "No text extracted from PDF",
      };
    }

    // Clean and convert to markdown
    const cleanedText = cleanMarkdown(extractedText);
    const markdown = textToMarkdown(cleanedText, filename);

    // Write markdown file
    fs.writeFileSync(outputPath, markdown, "utf-8");

    return {
      file: filename,
      status: "success",
      outputPath,
    };
  } catch (error: any) {
    return {
      file: filename,
      status: "failed",
      reason: error.message.substring(0, 100),
    };
  }
}

async function batchConvertPDFs(inputDir: string, outputDir: string): Promise<void> {
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Find all PDFs recursively
  function findPDFs(dir: string): string[] {
    let pdfs: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        pdfs = pdfs.concat(findPDFs(fullPath));
      } else if (entry.name.toLowerCase().endsWith(".pdf")) {
        pdfs.push(fullPath);
      }
    }

    return pdfs;
  }

  const pdfFiles = findPDFs(inputDir);
  console.log(`\n📄 Found ${pdfFiles.length} PDF files\n`);

  if (pdfFiles.length === 0) {
    console.log("No PDFs found in directory.");
    return;
  }

  const results: ConversionResult[] = [];
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfFile = pdfFiles[i];
    const relPath = path.relative(inputDir, pdfFile);
    process.stdout.write(`\n[${i + 1}/${pdfFiles.length}] ${relPath}`);

    const result = await convertPDFToMarkdown(pdfFile, outputDir);
    results.push(result);

    if (result.status === "success") {
      successCount++;
      console.log(" ✅");
    } else if (result.status === "failed") {
      failedCount++;
      console.log(` ❌ (${result.reason})`);
    } else {
      skippedCount++;
      console.log(" ⏭️");
    }
  }

  // Generate report
  console.log("\n\n📊 CONVERSION REPORT\n" + "=".repeat(50));
  console.log(`✅ Successful: ${successCount}/${pdfFiles.length}`);
  console.log(`❌ Failed: ${failedCount}/${pdfFiles.length}`);
  console.log(`⏭️  Skipped: ${skippedCount}/${pdfFiles.length}`);
  console.log(`📁 Output directory: ${path.resolve(outputDir)}`);

  // Save detailed report
  const reportPath = path.join(outputDir, "_conversion_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), "utf-8");

  // List failed files for retry
  const failedFiles = results.filter((r) => r.status === "failed");
  if (failedFiles.length > 0) {
    console.log("\n⚠️  Failed conversions:");
    failedFiles.forEach((r) => {
      console.log(`   - ${r.file}: ${r.reason}`);
    });
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Report saved to: ${reportPath}`);
}

// Main execution
const inputDir =
  process.argv[2] ||
  "C:\\Users\\bentn\\OneDrive\\Desktop\\SKU\\_raw_source_archive\\manjunath-study-material-ocr";
const outputDir =
  process.argv[3] ||
  path.join(path.dirname(inputDir), "manjunath-study-material-md");

console.log(`\n🚀 PDF to Markdown Batch Converter\n`);
console.log(`Input:  ${inputDir}`);
console.log(`Output: ${outputDir}\n`);

batchConvertPDFs(inputDir, outputDir).catch(console.error);
