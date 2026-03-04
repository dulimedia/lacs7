#!/usr/bin/env node
/**
 * Convert all pages of "Suite and Floor Plan" PDFs to individual PNGs.
 * Output: public/floorplans/converted/{unitkey}_page_{n}.png
 *
 * Usage: node scripts/convertFloorplanPages.mjs
 */

import { pdfToPng } from 'pdf-to-png-converter';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PDF_ROOT = path.join(ROOT, 'public', 'floorplans', 'pdf-originals');
const OUTPUT_DIR = path.join(ROOT, 'public', 'floorplans', 'converted');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Extract unit key from filename like "LACS_F-360_Suite and Floor Plan.pdf" -> "f360"
function extractUnitKey(filename) {
  // Match patterns like LACS_F-360_, LACS_T-200_, LACS_M-130_
  const match = filename.match(/LACS_([A-Z])-?(\d+)/i);
  if (match) {
    return `${match[1].toLowerCase()}${match[2]}`;
  }
  return null;
}

// Recursively find all combined floorplan PDFs
function findCombinedPDFs(dir) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...findCombinedPDFs(fullPath));
    } else if (
      item.name.endsWith('.pdf') &&
      (item.name.includes('Suite and Floor Plan') || item.name.includes('Floor and Suite Plan')) &&
      !item.name.includes('_HVAC') &&
      !item.name.includes('_NEW')
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

async function main() {
  const pdfs = findCombinedPDFs(PDF_ROOT);
  console.log(`Found ${pdfs.length} combined floorplan PDFs to convert.\n`);

  let converted = 0;
  let skipped = 0;
  let failed = 0;

  for (const pdfPath of pdfs) {
    const filename = path.basename(pdfPath);
    const unitKey = extractUnitKey(filename);

    if (!unitKey) {
      console.log(`  SKIP: Could not extract unit key from "${filename}"`);
      skipped++;
      continue;
    }

    // Check if already converted (page 1 exists and is newer than PDF)
    const page1Path = path.join(OUTPUT_DIR, `${unitKey}_page_1.png`);
    if (fs.existsSync(page1Path)) {
      const pdfStat = fs.statSync(pdfPath);
      const pngStat = fs.statSync(page1Path);
      if (pngStat.mtimeMs > pdfStat.mtimeMs) {
        console.log(`  SKIP: ${unitKey} already converted (up to date)`);
        skipped++;
        continue;
      }
    }

    try {
      console.log(`  Converting ${unitKey} (${filename})...`);
      const pages = await pdfToPng(pdfPath, {
        disableFontFace: true,
        useSystemFonts: false,
        viewportScale: 2.0,
      });

      for (let i = 0; i < pages.length; i++) {
        const outputPath = path.join(OUTPUT_DIR, `${unitKey}_page_${i + 1}.png`);
        fs.writeFileSync(outputPath, pages[i].content);
      }

      console.log(`    -> ${pages.length} pages written for ${unitKey}`);
      converted++;
    } catch (err) {
      console.error(`  FAIL: ${unitKey} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Converted: ${converted}, Skipped: ${skipped}, Failed: ${failed}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
