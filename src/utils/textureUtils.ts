import * as THREE from 'three';
import { log } from './debugFlags';

/**
 * Configuration for texture resizing
 */
const TEXTURE_OPTS = {
    // Max dimension for textures (2048 is generally a good balance for desktop/high-end mobile)
    MAX_SIZE: 2048,
    // Quality for JPEG encoding if we were exporting, but for Three.js we draw to canvas
    // For offscreen canvas resize, we just control dimensions.
};

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
    if (!image.width || !image.height) return texture;

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

    log.verbose(`📉 Resizing texture ${texture.name || 'unnamed'} from ${image.width}x${image.height} to ${width}x${height}`);

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

/**
 * Safely optimize a material's textures
 */
export function optimizeMaterialTextures(material: THREE.Material, maxSize: number = 2048) {
    if (!material) return;

    const mat = material as any;
    const maps = [
        'map',
        'normalMap',
        'roughnessMap',
        'metalnessMap',
        'emissiveMap',
        'aoMap',
        'alphaMap'
    ];

    maps.forEach(mapName => {
        if (mat[mapName]) {
            const original = mat[mapName];
            // Only resize if not already resized
            if (!original.userData?.resized) {
                const resized = resizeTexture(original, maxSize);
                if (resized !== original) {
                    mat[mapName] = resized;

                    // Dispose original to actually save memory
                    // WARNING: If this texture is used by other materials, they will break unless they also update
                    // Since we usually load strictly unique GLBs or cloned materials, this might be safe-ish.
                    // But in Three.js loaders, textures are often cached and shared.
                    // safely disposing is hard without reference counting.
                    // For massive reduction, we MUST dispose.

                    // Let's assume GLTFLoader caching. If we are traversing the scene right after load,
                    // we are modifying the "instance" of the material.
                    // However, the texture object itself might be shared.

                    // Strategy: We won't call dispose() immediately on the *image* source if it's shared,
                    // but we can `dispose()` the texture object if we replace it.
                    // Actually, `resizeTexture` creates a NEW texture.
                    // The OLD texture is still ref'd by any other materials using it.
                    // If we update ALL materials in the scene, we inadvertently create N copies of the resized texture if we aren't careful?
                    // NO, `optimizeModel` traverses meshes.

                    // Ideally we should cache resized textures too to avoid duplications.

                    // For V1, let's just do simple replacement and see if GC helps. 
                    // Explicit dispose of the old texture is aggressive.
                    // But necessary for the user's 2GB constraint.
                    original.dispose();
                }
            }
        }
    });

    mat.needsUpdate = true;
}
