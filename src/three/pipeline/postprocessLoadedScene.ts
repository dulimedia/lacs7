import * as THREE from 'three';
import { RendererConfig, getCurrentShadowConfig } from '../../config/RendererConfig';
import { PerfFlags } from '../../perf/PerfFlags';

/**
 * REMOVED: Mobile material mutations that caused texture corruption
 * These functions were causing wrong metalness/roughness maps to appear on wrong meshes
 */

/**
 * Standardizes a loaded scene or model according to the renderer configuration.
 * Steals the "traverse and setup" logic from standard examples.
 */
export function postprocessLoadedScene(
    scene: THREE.Object3D,
    options: {
        center?: boolean;
        // can add 'isEnvironment' later if needed
    } = {}
): void {
    const { center = false } = options;
    const shadowConfig = getCurrentShadowConfig();

    // 1. Compute bounds and optionally center
    if (center) {
        const box = new THREE.Box3().setFromObject(scene);
        const centerVec = box.getCenter(new THREE.Vector3());

        // Move scene so its center is at (0,0,0) - helpful for unit viewers
        scene.position.sub(centerVec);
    }

    // 2. Traverse and Hygiene
    scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const material = mesh.material as THREE.MeshStandardMaterial;

            // MOBILE DEBUG: Log but don't mutate broken asset materials
            if (PerfFlags.isMobile && PerfFlags.isSafariIOS) {
                const brokenAssetNames = ["roof", "wall", "frame", "sidewalk", "road", "transparent"];
                const meshName = mesh.name?.toLowerCase() || '';
                const materialName = material?.name?.toLowerCase() || '';
                
                const isBrokenAsset = brokenAssetNames.some(name => 
                    meshName.includes(name) || materialName.includes(name)
                );
                
                if (isBrokenAsset && material) {
                    console.log(`🚨 BROKEN ASSET DETECTED - Mesh: ${mesh.name}, Material: ${material.name} [DEBUG ONLY - NO MUTATIONS]`);
                }
            }

            // SHADOWS
            // Only cast shadows if enabled in config and for non-environment meshes (usually)
            if (shadowConfig.castShadows) {
                // EXCLUSION: Prevent shadows on materials known to cause shader crashes
                const matName = material.name?.toLowerCase() || '';
                const skipShadows = matName.includes('transparent') ||
                    matName.includes('sidewalk') ||
                    matName.includes('transparents') ||
                    matName.includes('glass') ||
                    matName.includes('window');

                if (skipShadows) {
                    mesh.castShadow = false;
                    mesh.receiveShadow = false;
                } else {
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                }
            } else {
                mesh.castShadow = false;
                mesh.receiveShadow = false;
            }

            // TEXTURES & MATERIALS
            if (material) {
                // MOBILE DEBUG: Log material and texture details (debug only, no mutations)
                if (PerfFlags.isMobile && PerfFlags.isSafariIOS) {
                    console.log(`📱 iOS Safari Material Debug: ${material.name || 'unnamed'} [DEBUG ONLY - NO MUTATIONS]`);
                }

                // Enforce anisotropy on all textures
                [
                    material.map,
                    material.emissiveMap,
                    material.bumpMap,
                    material.normalMap,
                    material.displacementMap,
                    material.roughnessMap,
                    material.metalnessMap,
                    material.alphaMap,
                ].forEach((map, index) => {
                    if (map) {
                        // Desktop: use full anisotropy (no mobile mutations)
                        map.anisotropy = RendererConfig.materials.anisotropy;
                        
                        // Let Three.js GLTFLoader handle colorSpace automatically
                        // No manual colorSpace setting to prevent texture corruption
                    }
                });

                // PBR Tweak (optional): prevent pitch black materials if env map missing
                if (material.envMapIntensity === undefined) {
                    material.envMapIntensity = RendererConfig.materials.envMapIntensity;
                }
            }
        }
    });

    // 3. (Optional) Static batching or merging could happen here
}
