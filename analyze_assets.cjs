#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Asset analysis script
console.log('=== TASK 1 — LARGE ASSETS ANALYSIS ===\n');

const assetExtensions = ['.glb', '.gltf', '.png', '.jpg', '.jpeg', '.webp', '.ktx2', '.hdr', '.exr'];
const searchDirs = ['public', 'src', 'dist'];

function getFileSizeInBytes(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function estimateGPUMemory(filePath, bytes) {
  const ext = path.extname(filePath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    // Rough estimate: assume 4 bytes per pixel (RGBA), estimate 1024x1024 for unknown images
    const estimatedPixels = 1024 * 1024; // Will need actual dimensions for accuracy
    return estimatedPixels * 4;
  }
  if (['.hdr', '.exr'].includes(ext)) {
    // HDR typically 16 bytes per pixel (RGBA16F)
    const estimatedPixels = 2048 * 1024; // Common HDR size
    return estimatedPixels * 16;
  }
  if (['.glb', '.gltf'].includes(ext)) {
    // GLB can contain embedded textures, rough multiplier
    return bytes * 3; // Estimate 3x inflation for GPU
  }
  return bytes;
}

function scanDirectory(dir, allFiles = []) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        scanDirectory(fullPath, allFiles);
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (assetExtensions.includes(ext)) {
          const size = getFileSizeInBytes(fullPath);
          const gpuEstimate = estimateGPUMemory(fullPath, size);
          allFiles.push({
            path: fullPath,
            size: size,
            sizeFormatted: formatBytes(size),
            gpuEstimate: gpuEstimate,
            gpuFormatted: formatBytes(gpuEstimate),
            extension: ext,
            name: item.name
          });
        }
      }
    }
  } catch (error) {
    console.log(`Cannot read directory ${dir}: ${error.message}`);
  }
  return allFiles;
}

// Scan all directories
let allAssets = [];
const projectRoot = '/mnt/c/Users/drews/final_lacs';

for (const searchDir of searchDirs) {
  const fullPath = path.join(projectRoot, searchDir);
  if (fs.existsSync(fullPath)) {
    console.log(`\n📁 Scanning ${searchDir}/...`);
    scanDirectory(fullPath, allAssets);
  }
}

// Sort by size (largest first)
allAssets.sort((a, b) => b.size - a.size);

console.log(`\n🔍 Found ${allAssets.length} assets\n`);
console.log('📊 ASSETS BY SIZE (largest → smallest):\n');

let totalDiskSize = 0;
let totalGPUEstimate = 0;

for (const asset of allAssets) {
  console.log(`${asset.sizeFormatted.padEnd(10)} | GPU: ${asset.gpuFormatted.padEnd(10)} | ${asset.extension.padEnd(6)} | ${asset.path}`);
  totalDiskSize += asset.size;
  totalGPUEstimate += asset.gpuEstimate;
}

console.log('\n📈 SUMMARY:');
console.log(`Total disk size: ${formatBytes(totalDiskSize)}`);
console.log(`Estimated GPU memory: ${formatBytes(totalGPUEstimate)}`);

// Group by type
const byType = {};
allAssets.forEach(asset => {
  if (!byType[asset.extension]) byType[asset.extension] = [];
  byType[asset.extension].push(asset);
});

console.log('\n📂 BY FILE TYPE:');
Object.keys(byType).sort().forEach(ext => {
  const files = byType[ext];
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`${ext.padEnd(8)} | ${files.length.toString().padEnd(4)} files | ${formatBytes(totalSize)}`);
});