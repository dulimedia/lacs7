import * as THREE from 'three';
import { log } from './debugFlags';

/**
 * Configuration for texture resizing
 */
const TEXTURE_OPTS = {
    // Max dimension for textures (1024 for aggressive optimization to fix washed-out appearance)
    MAX_SIZE: 1024,
    // Quality for JPEG encoding if we were exporting, but for Three.js we draw to canvas
    // For offscreen canvas resize, we just control dimensions.
};

// Global log of resized textures for the Memory Profiler to consume
export const resizedTexturesLog: string[] = [];

/**
 * Resizes a texture if it exceeds the maximum dimensions.
 * Returns a new CanvasTexture (or the original if no resize needed).
 * 
 * NOTE: This is an expensive operation! Call this only once per unique texture if possible,
 * or during an idle/background/loading phase.
 */
export function resizeTexture(texture: THREE.Texture, maxSize: number = TEXTURE_OPTS.MAX_SIZE): THREE.Texture {
    if (!texture || !texture.image) return texture;

    const image = texture.image;
    // Check if image is valid (has width/height)
    if (!image || !image.width || !image.height) {
        console.warn(`⚠️ Texture ${texture.name} has no valid image dimensions`, image);
        return texture;
    }

    // Force log for large textures
    if (image.width > 2048 || image.height > 2048) {
        console.log(`🚨 FOUND GIANT TEXTURE: ${texture.name} (${image.width}x${image.height}) - Attempting resize to ${maxSize}`);
    }

    // If texture is already small enough, return it
    if (image.width <= maxSize && image.height <= maxSize) {
        return texture;
    }

    // Calculate new dimensions
    let width = image.width;
    let height = image.height;

    if (width > height) {
        if (width > maxSize) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
        }
    } else {
        if (height > maxSize) {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
        }
    }

    console.log(`📉 Resizing texture ${texture.name || 'unnamed'} from ${image.width}x${image.height} to ${width}x${height}`);
    resizedTexturesLog.push(`[RESIZE] ${texture.name || 'unnamed'} (${image.width}x${image.height}) -> ${width}x${height}`);

    // Create an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        console.warn('❌ Could not get 2D context for texture resize');
        return texture;
    }

    // Draw image to canvas (resizing it)
    ctx.drawImage(image, 0, 0, width, height);

    // Create new texture from canvas
    const newTexture = new THREE.CanvasTexture(canvas);

    // Copy relevant properties from original texture
    newTexture.colorSpace = texture.colorSpace;
    newTexture.wrapS = texture.wrapS;
    newTexture.wrapT = texture.wrapT;
    newTexture.minFilter = texture.minFilter;
    newTexture.magFilter = texture.magFilter;
    newTexture.anisotropy = texture.anisotropy;
    newTexture.flipY = texture.flipY;
    newTexture.name = texture.name;
    newTexture.userData = { ...texture.userData, resized: true, originalSize: [image.width, image.height] };

    // Mark for update
    newTexture.needsUpdate = true;

    // Dispose the original texture to free memory? 
    // This is risky if the texture is shared. 
    // ideally we strictly check if we can dispose it or if we are replacing it everywhere.
    // For now, let's assume we are replacing the specific instance we found on a unique material.

    return newTexture;
}

const ALL_TEXTURE_KEYS = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
    'emissiveMap', 'alphaMap', 'lightMap', 'bumpMap', 'displacementMap',
    'specularMap', 'envMap', 'clearcoatMap', 'clearcoatNormalMap',
    'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap',
    'transmissionMap', 'thicknessMap', 'iridescenceMap', 'iridescenceThicknessMap'
] as const;

/**
 * Safely optimize a material's textures
 */
export function optimizeMaterialTextures(material: THREE.Material, maxSize: number = 2048) {
    if (!material) return;
    const mat = material as any;

    ALL_TEXTURE_KEYS.forEach(mapName => {
        if (mat[mapName]) {
            // Skip lightmaps and AO maps to preserve baked shadow quality
            if (mapName === 'lightMap' || mapName === 'aoMap' || mapName === 'shadowMap') {
                return;
            }

            const original = mat[mapName];

            // Check if it is actually a texture
            if (!original.isTexture) return;

            // SKIP compressed textures (KTX2, etc) - they are already optimized and cannot be resized via Canvas
            // Also skip CubeTextures and DataTextures
            if (original.isCompressedTexture || original.isCubeTexture || original.isDataTexture) {
                // console.log(`[SKIP] Skipping compressed/special texture ${mapName} on ${mat.name}`);
                return;
            }

            // Check if already processed
            if (original.userData?.resized) return;

            const resized = resizeTexture(original, maxSize);

            if (resized !== original) {
                console.log(`✅ [Material: ${mat.name}] Replaced ${mapName} with resized version`);
                mat[mapName] = resized;
                mat.needsUpdate = true;

                // Dispose original
                try {
                    original.dispose();
                    resizedTexturesLog.push(`[DISPOSE] Disposed original ${mapName} for ${mat.name}`);
                } catch (e) {
                    console.warn(`[DISPOSE FAIL] Could not dispose ${mapName} on ${mat.name}`, e);
                }
            } else {
                // Even if not resized, log it was checked
                // console.log(`[CHECKED] ${mapName} on ${mat.name} - OK`);
            }
        }
    });

    mat.needsUpdate = true;
}
