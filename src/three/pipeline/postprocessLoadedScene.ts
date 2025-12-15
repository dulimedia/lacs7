import * as THREE from 'three';
import { RendererConfig, getCurrentShadowConfig } from '../../config/RendererConfig';
import { PerfFlags } from '../../perf/PerfFlags';

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
                // MOBILE DEBUG: Log material and texture details
                if (PerfFlags.isMobile && PerfFlags.isSafariIOS) {
                    const materialMaps = {
                        map: material.map,
                        emissiveMap: material.emissiveMap,
                        bumpMap: material.bumpMap,
                        normalMap: material.normalMap,
                        displacementMap: material.displacementMap,
                        roughnessMap: material.roughnessMap,
                        metalnessMap: material.metalnessMap,
                        alphaMap: material.alphaMap,
                    };
                    
                    const mapStatus: Record<string, any> = {};
                    Object.entries(materialMaps).forEach(([mapName, map]) => {
                        if (map) {
                            const img = map.image;
                            mapStatus[mapName] = {
                                exists: true,
                                imageSize: img ? `${img.width}x${img.height}` : 'no-image',
                                colorSpace: map.colorSpace,
                                minFilter: map.minFilter,
                                magFilter: map.magFilter,
                                generateMipmaps: map.generateMipmaps,
                                anisotropy: map.anisotropy,
                                isUndefinedImage: !img || img.width === 0 || img.height === 0
                            };
                        } else {
                            mapStatus[mapName] = { exists: false };
                        }
                    });
                    
                    console.log(`📱 iOS Safari Material Debug: ${material.name || 'unnamed'}`, mapStatus);
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
                        // MOBILE TEXTURE MITIGATION: Apply iOS Safari stability fixes
                        if (PerfFlags.isMobile && PerfFlags.isSafariIOS) {
                            const img = map.image;
                            
                            // Debug broken textures
                            if (!img || img.width === 0 || img.height === 0) {
                                console.error(`🚨 iOS Safari: BROKEN TEXTURE detected on ${material.name}`, {
                                    mapIndex: index,
                                    hasImage: !!img,
                                    imageSize: img ? `${img.width}x${img.height}` : 'null',
                                    textureUuid: map.uuid,
                                    textureUrl: map.source?.data?.src
                                });
                            }
                            
                            // Apply mobile-specific texture stability fixes
                            if (img && img.width > 0 && img.height > 0) {
                                // 1. Reduce anisotropy to 1 on mobile to prevent memory pressure
                                map.anisotropy = 1;
                                
                                // 2. Clamp large textures to prevent memory issues
                                const maxDimension = Math.max(img.width, img.height);
                                if (maxDimension > 2048) {
                                    console.warn(`📱 iOS Safari: Large texture detected (${img.width}x${img.height}) on ${material.name} - applying mobile optimizations`);
                                    
                                    // Disable mipmaps for large textures to save memory
                                    map.generateMipmaps = false;
                                    
                                    // Use linear filtering to avoid mipmap issues
                                    map.minFilter = THREE.LinearFilter;
                                    map.magFilter = THREE.LinearFilter;
                                } else {
                                    // For smaller textures, still be conservative with mipmaps on iOS Safari
                                    if (maxDimension > 1024) {
                                        map.generateMipmaps = false;
                                        map.minFilter = THREE.LinearFilter;
                                    }
                                }
                                
                                // 3. Ensure correct colorSpace for baseColor and emissive maps only
                                if (index === 0 && material.map === map) { // baseColor map
                                    map.colorSpace = THREE.SRGBColorSpace;
                                } else if (index === 1 && material.emissiveMap === map) { // emissive map
                                    map.colorSpace = THREE.SRGBColorSpace;
                                } else {
                                    // Normal, roughness, metalness maps should be Linear
                                    map.colorSpace = THREE.NoColorSpace;
                                }
                                
                                console.log(`🔧 iOS Safari texture fix applied: ${material.name} - anisotropy=${map.anisotropy}, generateMipmaps=${map.generateMipmaps}, minFilter=${map.minFilter}`);
                            }
                        } else {
                            // Desktop: use full anisotropy
                            map.anisotropy = RendererConfig.materials.anisotropy;
                        }
                        
                        // Let Three.js GLTFLoader handle colorSpace automatically on desktop - manual colorSpace setting was causing mobile issues
                        // map.colorSpace = THREE.SRGBColorSpace; // REMOVED: This was breaking mobile textures
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
