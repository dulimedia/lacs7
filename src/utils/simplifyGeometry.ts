import * as THREE from 'three';

// Downscale textures for mobile to reduce memory usage
export function downscaleTexturesForMobile(material: THREE.Material, maxSize = 256): void {
  const processTexture = (texture: THREE.Texture | null, name: string) => {
    if (!texture || !texture.image) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = texture.image;
    const originalWidth = img.width || img.videoWidth || 512;
    const originalHeight = img.height || img.videoHeight || 512;
    
    // Calculate new size while maintaining aspect ratio
    const scale = Math.min(maxSize / originalWidth, maxSize / originalHeight, 1);
    const newWidth = Math.floor(originalWidth * scale);
    const newHeight = Math.floor(originalHeight * scale);
    
    if (newWidth < originalWidth || newHeight < originalHeight) {
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      try {
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Create new texture from downscaled canvas
        const newTexture = new THREE.CanvasTexture(canvas);
        newTexture.format = texture.format;
        newTexture.type = texture.type;
        newTexture.wrapS = texture.wrapS;
        newTexture.wrapT = texture.wrapT;
        newTexture.magFilter = texture.magFilter;
        newTexture.minFilter = texture.minFilter;
        newTexture.anisotropy = Math.min(texture.anisotropy, 2); // Reduce anisotropy
        
        // Dispose original texture
        texture.dispose();
        
        console.log(`📉 Downscaled ${name}: ${originalWidth}x${originalHeight} → ${newWidth}x${newHeight}`);
        
        return newTexture;
      } catch (error) {
        console.warn(`⚠️ Failed to downscale ${name}:`, error);
        return texture;
      }
    }
    
    return texture;
  };
  
  if ((material as any).map) {
    (material as any).map = processTexture((material as any).map, 'diffuse map');
  }
  if ((material as any).normalMap) {
    (material as any).normalMap = processTexture((material as any).normalMap, 'normal map');
  }
  if ((material as any).roughnessMap) {
    (material as any).roughnessMap = processTexture((material as any).roughnessMap, 'roughness map');
  }
  if ((material as any).metalnessMap) {
    (material as any).metalnessMap = processTexture((material as any).metalnessMap, 'metalness map');
  }
  if ((material as any).emissiveMap) {
    (material as any).emissiveMap = processTexture((material as any).emissiveMap, 'emissive map');
  }
  if ((material as any).aoMap) {
    (material as any).aoMap = processTexture((material as any).aoMap, 'AO map');
  }
  
  material.needsUpdate = true;
}

export function simplifyGeometryForMobile(geometry: THREE.BufferGeometry, targetRatio = 0.5): THREE.BufferGeometry {
  // DISABLED: Naive simplification algorithm destroys mesh quality
  // TODO: Implement proper mesh decimation algorithm (Quadric Edge Collapse)
  console.log('⚠️ Geometry simplification disabled - use texture reduction instead');
  return geometry;
  
  /* BROKEN CODE - DO NOT USE
  const vertexCount = geometry.attributes.position.count;
  
  // Lower threshold for mobile - more aggressive simplification
  if (vertexCount < 5000) {
    return geometry;
  }
  
  console.log(`🔧 Mobile simplifying geometry: ${vertexCount} vertices → target: ${Math.floor(vertexCount * targetRatio)}`);
  
  const simplified = geometry.clone();
  
  if (simplified.index) {
    const indexCount = simplified.index.count;
    const targetIndexCount = Math.floor(indexCount * targetRatio);
    const step = Math.ceil(indexCount / targetIndexCount);
    
    const newIndices: number[] = [];
    for (let i = 0; i < indexCount; i += step * 3) {
      if (i + 2 < indexCount) {
        newIndices.push(
          simplified.index.array[i],
          simplified.index.array[i + 1],
          simplified.index.array[i + 2]
        );
      }
    }
    
    simplified.setIndex(newIndices);
    console.log(`✅ Mobile simplified to ${newIndices.length / 3} faces (${Math.round(newIndices.length / indexCount * 100)}%)`);
  } else {
    // Handle non-indexed geometry
    const positionAttribute = simplified.attributes.position;
    const faceCount = positionAttribute.count / 3;
    const targetFaceCount = Math.floor(faceCount * targetRatio);
    const step = Math.ceil(faceCount / targetFaceCount);
    
    const newPositions: number[] = [];
    const newNormals: number[] = [];
    const newUvs: number[] = [];
    
    for (let i = 0; i < faceCount; i += step) {
      const startVertex = i * 3;
      if (startVertex + 2 < positionAttribute.count) {
        // Copy 3 vertices for this face
        for (let j = 0; j < 3; j++) {
          const vertexIndex = startVertex + j;
          // Position
          newPositions.push(
            positionAttribute.getX(vertexIndex),
            positionAttribute.getY(vertexIndex),
            positionAttribute.getZ(vertexIndex)
          );
          // Normal
          if (simplified.attributes.normal) {
            newNormals.push(
              simplified.attributes.normal.getX(vertexIndex),
              simplified.attributes.normal.getY(vertexIndex),
              simplified.attributes.normal.getZ(vertexIndex)
            );
          }
          // UV
          if (simplified.attributes.uv) {
            newUvs.push(
              simplified.attributes.uv.getX(vertexIndex),
              simplified.attributes.uv.getY(vertexIndex)
            );
          }
        }
      }
    }
    
    simplified.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    if (newNormals.length > 0) {
      simplified.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    }
    if (newUvs.length > 0) {
      simplified.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
    }
    
    console.log(`✅ Mobile simplified non-indexed geometry: ${faceCount} → ${newPositions.length / 9} faces`);
  }
  
  // Recompute geometry properties
  simplified.computeVertexNormals();
  simplified.computeBoundingSphere();
  simplified.computeBoundingBox();
  
  // Dispose original geometry to free memory
  geometry.dispose();
  
  return simplified;
  */
}

export function shouldSimplifyMesh(mesh: THREE.Mesh, isMobile: boolean): boolean {
  // DISABLED: Geometry simplification causes visual artifacts
  return false;
  
  /* ORIGINAL CODE - DISABLED
  if (!isMobile) return false;
  
  const geometry = mesh.geometry;
  if (!geometry || !geometry.attributes.position) return false;
  
  const vertexCount = geometry.attributes.position.count;
  // Lower threshold for mobile - simplify more aggressively
  return vertexCount > 10000;
  */
}

// Apply comprehensive mobile optimizations to a mesh
export function optimizeMeshForMobile(mesh: THREE.Mesh): void {
  console.log(`🔧 Optimizing mesh for mobile: ${mesh.name || 'unnamed'}`);
  
  // Disable shadows
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  
  // DISABLED: Geometry simplification - causes crashes and artifacts
  // Mobile optimization now relies on:
  // - Texture downscaling (256px)
  // - Material property removal
  // - Shadow disabling
  console.log(`📦 Preserving original geometry for ${mesh.name} (texture-only optimization)`);
  
  // Optimize materials (KEEP THIS - textures are safe to reduce)
  if (mesh.material) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      // Downscale textures to 256px (PRIMARY mobile optimization)
      downscaleTexturesForMobile(material, 256);
      
      // Keep normal/roughness/metalness maps - only downscaled, not removed
      // Removing them causes visual quality loss
      
      // Reduce environment reflection intensity
      if ((material as any).envMapIntensity !== undefined) {
        (material as any).envMapIntensity = 0.3;
      }
      
      material.needsUpdate = true;
    });
  }
  
  // Dispose of unused geometry attributes to save memory
  if (mesh.geometry) {
    // Remove tangent attributes if present (not needed without normal maps)
    if (mesh.geometry.attributes.tangent) {
      mesh.geometry.deleteAttribute('tangent');
    }
    
    // Remove secondary UV channels if present
    if (mesh.geometry.attributes.uv2) {
      mesh.geometry.deleteAttribute('uv2');
    }
    
    // Remove vertex colors if present and not needed
    if (mesh.geometry.attributes.color && !mesh.material) {
      mesh.geometry.deleteAttribute('color');
    }
  }
}
