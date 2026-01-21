#!/usr/bin/env node

/**
 * Thumbnail Generation Script for Floorplans
 * 
 * This script generates optimized thumbnail versions of all floorplan images
 * to improve scrolling performance in the sidebar.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  // Input directory (where original floorplans are)
  inputDir: path.join(__dirname, '../public/floorplans/converted'),
  
  // Output directory (where thumbnails will be saved)
  outputDir: path.join(__dirname, '../public/floorplans/thumbnails'),
  
  // Thumbnail dimensions (optimized for sidebar)
  thumbWidth: 400,
  thumbHeight: 300,
  
  // Compression settings
  quality: 85, // JPEG quality (0-100)
  pngCompressionLevel: 6, // PNG compression (0-9)
  
  // Supported formats
  inputFormats: ['.png', '.jpg', '.jpeg'],
  
  // Output format (use WebP for best compression, PNG as fallback)
  outputFormat: 'png', // 'webp' | 'png' | 'jpeg'
};

/**
 * Check if sharp is available (preferred) or use canvas-based fallback
 */
async function getImageProcessor() {
  try {
    // Try to use sharp (best performance)
    const sharp = await import('sharp');
    console.log('✅ Using Sharp for image processing (optimal)');
    return { type: 'sharp', lib: sharp.default };
  } catch (error) {
    console.log('📦 Sharp not available, using Canvas fallback');
    
    try {
      // Try canvas (good performance)
      const { createCanvas, loadImage } = await import('canvas');
      console.log('✅ Using Canvas for image processing');
      return { type: 'canvas', createCanvas, loadImage };
    } catch (canvasError) {
      console.error('❌ Neither Sharp nor Canvas available.');
      console.error('Install one with: npm install sharp OR npm install canvas');
      process.exit(1);
    }
  }
}

/**
 * Generate thumbnail using Sharp (preferred method)
 */
async function generateThumbnailWithSharp(sharp, inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .resize(CONFIG.thumbWidth, CONFIG.thumbHeight, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png({
        compressionLevel: CONFIG.pngCompressionLevel,
        quality: CONFIG.quality
      })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error(`❌ Sharp processing failed for ${path.basename(inputPath)}:`, error.message);
    return false;
  }
}

/**
 * Generate thumbnail using Canvas (fallback method)
 */
async function generateThumbnailWithCanvas(createCanvas, loadImage, inputPath, outputPath) {
  try {
    const image = await loadImage(inputPath);
    
    // Calculate dimensions maintaining aspect ratio
    const aspectRatio = image.width / image.height;
    let newWidth = CONFIG.thumbWidth;
    let newHeight = CONFIG.thumbHeight;
    
    if (aspectRatio > CONFIG.thumbWidth / CONFIG.thumbHeight) {
      newHeight = CONFIG.thumbWidth / aspectRatio;
    } else {
      newWidth = CONFIG.thumbHeight * aspectRatio;
    }
    
    // Create canvas and draw resized image
    const canvas = createCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    
    // Fill background with white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, newWidth, newHeight);
    
    // Draw the resized image
    ctx.drawImage(image, 0, 0, newWidth, newHeight);
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png', { compressionLevel: CONFIG.pngCompressionLevel });
    fs.writeFileSync(outputPath, buffer);
    
    return true;
  } catch (error) {
    console.error(`❌ Canvas processing failed for ${path.basename(inputPath)}:`, error.message);
    return false;
  }
}

/**
 * Get file size in KB
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return Math.round(stats.size / 1024);
  } catch {
    return 0;
  }
}

/**
 * Main function to generate all thumbnails
 */
async function generateThumbnails() {
  console.log('🖼️  Starting thumbnail generation...');
  console.log(`📁 Input: ${CONFIG.inputDir}`);
  console.log(`📁 Output: ${CONFIG.outputDir}`);
  console.log(`📏 Dimensions: ${CONFIG.thumbWidth}x${CONFIG.thumbHeight}`);
  
  // Ensure input directory exists
  if (!fs.existsSync(CONFIG.inputDir)) {
    console.error(`❌ Input directory not found: ${CONFIG.inputDir}`);
    process.exit(1);
  }
  
  // Create output directory
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    console.log(`📂 Created output directory: ${CONFIG.outputDir}`);
  }
  
  // Get image processing library
  const processor = await getImageProcessor();
  
  // Find all image files
  const files = fs.readdirSync(CONFIG.inputDir)
    .filter(file => CONFIG.inputFormats.includes(path.extname(file).toLowerCase()))
    .sort();
  
  if (files.length === 0) {
    console.log('⚠️  No image files found in input directory');
    return;
  }
  
  console.log(`🔍 Found ${files.length} images to process`);
  
  let processed = 0;
  let errors = 0;
  let totalOriginalSize = 0;
  let totalThumbnailSize = 0;
  
  for (const file of files) {
    const inputPath = path.join(CONFIG.inputDir, file);
    const outputPath = path.join(CONFIG.outputDir, `thumb_${file.replace(/\.(jpg|jpeg)$/i, '.png')}`);
    
    // Skip if thumbnail already exists and is newer
    if (fs.existsSync(outputPath)) {
      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      if (outputStats.mtime > inputStats.mtime) {
        console.log(`⏭️  Skipping ${file} (thumbnail is up to date)`);
        continue;
      }
    }
    
    const originalSize = getFileSize(inputPath);
    totalOriginalSize += originalSize;
    
    console.log(`⚙️  Processing ${file} (${originalSize}KB)...`);
    
    let success = false;
    
    if (processor.type === 'sharp') {
      success = await generateThumbnailWithSharp(processor.lib, inputPath, outputPath);
    } else {
      success = await generateThumbnailWithCanvas(
        processor.createCanvas, 
        processor.loadImage, 
        inputPath, 
        outputPath
      );
    }
    
    if (success) {
      const thumbnailSize = getFileSize(outputPath);
      totalThumbnailSize += thumbnailSize;
      const compression = Math.round((1 - thumbnailSize / originalSize) * 100);
      
      console.log(`✅ Generated ${path.basename(outputPath)} (${thumbnailSize}KB, ${compression}% reduction)`);
      processed++;
    } else {
      errors++;
    }
  }
  
  // Summary
  console.log('\n🎉 Thumbnail generation complete!');
  console.log(`✅ Processed: ${processed} images`);
  console.log(`❌ Errors: ${errors} images`);
  
  if (totalOriginalSize > 0) {
    const totalReduction = Math.round((1 - totalThumbnailSize / totalOriginalSize) * 100);
    console.log(`📊 Size reduction: ${totalOriginalSize}KB → ${totalThumbnailSize}KB (${totalReduction}% smaller)`);
  }
  
  console.log(`📁 Thumbnails saved to: ${CONFIG.outputDir}`);
}

// Run the script
generateThumbnails().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});