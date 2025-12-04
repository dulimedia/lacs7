#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('\n=== TASK 2 — GLB INSPECTION ===\n');

// Find all GLB files
function findGLBFiles(dir, files = []) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        findGLBFiles(fullPath, files);
      } else if (item.isFile() && path.extname(item.name).toLowerCase() === '.glb') {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.log(`Cannot read directory ${dir}: ${error.message}`);
  }
  return files;
}

async function analyzeGLB(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    
    // GLB header (12 bytes)
    const magic = view.getUint32(0, true);
    const version = view.getUint32(4, true);
    const length = view.getUint32(8, true);
    
    if (magic !== 0x46546C67) { // "glTF"
      console.log(`${filePath}: Not a valid GLB file`);
      return null;
    }
    
    // First chunk (JSON)
    let offset = 12;
    const jsonChunkLength = view.getUint32(offset, true);
    const jsonChunkType = view.getUint32(offset + 4, true);
    
    if (jsonChunkType !== 0x4E4F534A) { // "JSON"
      console.log(`${filePath}: Invalid JSON chunk`);
      return null;
    }
    
    const jsonData = new TextDecoder().decode(buffer.slice(offset + 8, offset + 8 + jsonChunkLength));
    const gltf = JSON.parse(jsonData);
    
    // Analyze materials and textures
    const materials = gltf.materials || [];
    const textures = gltf.textures || [];
    const images = gltf.images || [];
    const meshes = gltf.meshes || [];
    
    let textureCount = 0;
    let estimatedGPUMemory = 0;
    const materialInfo = [];
    
    materials.forEach((material, idx) => {
      const matInfo = {
        name: material.name || `Material_${idx}`,
        textures: []
      };
      
      // Check common texture properties
      const textureProps = ['baseColorTexture', 'metallicRoughnessTexture', 'normalTexture', 'occlusionTexture', 'emissiveTexture'];
      textureProps.forEach(prop => {
        if (material.pbrMetallicRoughness && material.pbrMetallicRoughness[prop]) {
          matInfo.textures.push(prop);
          textureCount++;
        } else if (material[prop]) {
          matInfo.textures.push(prop);
          textureCount++;
        }
      });
      
      materialInfo.push(matInfo);
    });
    
    // Estimate memory based on file size and texture count
    // Very rough estimate: 1KB GLB ≈ 10KB GPU, textures inflate more
    const baseMemory = buffer.length * 3;
    const textureMemory = textureCount * 256 * 256 * 4; // Assume 256x256 RGBA textures
    estimatedGPUMemory = baseMemory + textureMemory;
    
    return {
      path: filePath,
      size: buffer.length,
      materials: materialInfo,
      textureCount,
      meshCount: meshes.length,
      estimatedGPU: estimatedGPUMemory,
      hasAnimations: !!(gltf.animations && gltf.animations.length > 0),
      nodeCount: gltf.nodes ? gltf.nodes.length : 0
    };
    
  } catch (error) {
    console.log(`${filePath}: Error reading GLB - ${error.message}`);
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function main() {
  const projectRoot = '/mnt/c/Users/drews/final_lacs';
  const glbFiles = [];
  
  // Search in public and src directories (avoid dist duplicates)
  findGLBFiles(path.join(projectRoot, 'public'), glbFiles);
  // findGLBFiles(path.join(projectRoot, 'src'), glbFiles); // Usually no GLBs in src
  
  console.log(`📦 Found ${glbFiles.length} GLB files\n`);
  
  const results = [];
  for (const glbFile of glbFiles.slice(0, 20)) { // Limit to first 20 for speed
    const analysis = await analyzeGLB(glbFile);
    if (analysis) {
      results.push(analysis);
    }
  }
  
  // Sort by GPU memory estimate
  results.sort((a, b) => b.estimatedGPU - a.estimatedGPU);
  
  console.log('📊 GLB ANALYSIS (by estimated GPU memory):\n');
  
  let totalGPU = 0;
  let totalTextures = 0;
  
  for (const result of results) {
    const relativePath = result.path.replace(projectRoot, '');
    console.log(`${formatBytes(result.estimatedGPU).padEnd(12)} | Textures: ${result.textureCount.toString().padEnd(3)} | Meshes: ${result.meshCount.toString().padEnd(3)} | ${relativePath}`);
    
    if (result.materials.length > 0) {
      result.materials.forEach((mat, idx) => {
        if (mat.textures.length > 0) {
          console.log(`  └─ ${mat.name}: [${mat.textures.join(', ')}]`);
        }
      });
    }
    
    totalGPU += result.estimatedGPU;
    totalTextures += result.textureCount;
    console.log('');
  }
  
  console.log('📈 GLB SUMMARY:');
  console.log(`Total GLBs analyzed: ${results.length}`);
  console.log(`Total estimated GPU memory: ${formatBytes(totalGPU)}`);
  console.log(`Total textures: ${totalTextures}`);
  console.log(`Average GPU per GLB: ${formatBytes(totalGPU / results.length)}`);
  
  // Find largest GLBs
  console.log('\n🏆 TOP 10 LARGEST GLBs:');
  results.slice(0, 10).forEach((result, idx) => {
    const name = path.basename(result.path);
    console.log(`${(idx + 1).toString().padEnd(3)} ${name.padEnd(40)} ${formatBytes(result.estimatedGPU)}`);
  });
}

main().catch(console.error);