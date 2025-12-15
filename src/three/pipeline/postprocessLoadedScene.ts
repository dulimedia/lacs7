import * as THREE from 'three';
import { RendererConfig, getCurrentShadowConfig } from '../../config/RendererConfig';
import { PerfFlags } from '../../perf/PerfFlags';

/**
 * Apply mobile-specific material fixes for iOS Safari stability
 */
function applyMobileMaterialFix(material: THREE.MeshStandardMaterial): void {
    if (!material) return;
    
    // Fix colorSpace and texture settings for all maps
    const allMaps = [
        { map: material.map, name: 'map', shouldBeSRGB: true },
        { map: material.emissiveMap, name: 'emissiveMap', shouldBeSRGB: true },
        { map: material.normalMap, name: 'normalMap', shouldBeSRGB: false },
        { map: material.roughnessMap, name: 'roughnessMap', shouldBeSRGB: false },
        { map: material.metalnessMap, name: 'metalnessMap', shouldBeSRGB: false },
        { map: material.aoMap, name: 'aoMap', shouldBeSRGB: false },
        { map: material.alphaMap, name: 'alphaMap', shouldBeSRGB: false },
    ];
    
    allMaps.forEach(({ map, name, shouldBeSRGB }) => {
        if (map) {
            // Set correct colorSpace
            map.colorSpace = shouldBeSRGB ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            
            // Set anisotropy to 1 for mobile stability
            map.anisotropy = 1;
            
            // Handle huge textures
            const img = map.image;
            if (img && Math.max(img.width, img.height) > 2048) {
                console.log(`📱 iOS Safari: Fixing huge texture ${name} (${img.width}x${img.height}) on ${material.name}`);
                map.generateMipmaps = false;
                map.minFilter = THREE.LinearFilter;
            }
            
            // Force texture update
            map.needsUpdate = true;
        }
    });
    
    // Force material update
    material.needsUpdate = true;
}

/**
 * Apply transparent material fixes specifically for sidewalk materials
 */
function applyTransparentSidewalkFix(material: THREE.MeshStandardMaterial): void {
    if (!material) return;
    
    // Check if this is a transparent material
    if (material.transparent === true || material.opacity < 1) {
        console.log(`📱 iOS Safari: Applying transparent sidewalk fix to ${material.name}`);
        
        // Fix depth settings for transparency
        material.depthWrite = false;
        material.depthTest = true;
        
        // Set alpha test based on whether there's an alpha texture
        if (material.alphaMap) {
            material.alphaTest = 0.5; // Cutout alpha texture
        } else {
            material.alphaTest = 0.0; // Smooth transparency
        }
        
        // Force update
        material.needsUpdate = true;
    }
}

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

            // MOBILE DEBUG: Log broken asset materials specifically
            if (PerfFlags.isMobile && PerfFlags.isSafariIOS) {
                const brokenAssetNames = ["roof", "wall", "frame", "sidewalk", "road", "transparent"];
                const meshName = mesh.name?.toLowerCase() || '';
                const materialName = material?.name?.toLowerCase() || '';
                
                const isBrokenAsset = brokenAssetNames.some(name => 
                    meshName.includes(name) || materialName.includes(name)
                );
                
                if (isBrokenAsset) {
                    console.log(`🚨 BROKEN ASSET DETECTED - Mesh: ${mesh.name}, Material: ${material?.name}`);
                    
                    if (material) {
                        const materialMaps = {
                            map: material.map,
                            normalMap: material.normalMap,
                            roughnessMap: material.roughnessMap,
                            metalnessMap: material.metalnessMap,
                            aoMap: material.aoMap,
                            emissiveMap: material.emissiveMap,
                            alphaMap: material.alphaMap,
                        };
                        
                        const mapDetails: Record<string, any> = {};
                        Object.entries(materialMaps).forEach(([mapName, map]) => {
                            if (map) {
                                const img = map.image;
                                mapDetails[mapName] = {
                                    exists: true,
                                    imageSize: img ? `${img.width}x${img.height}` : 'no-image',
                                    colorSpace: map.colorSpace,
                                    generateMipmaps: map.generateMipmaps,
                                    minFilter: map.minFilter,
                                    magFilter: map.magFilter,
                                    anisotropy: map.anisotropy,
                                    isHugeTexture: img ? Math.max(img.width, img.height) > 2048 : false
                                };
                            } else {
                                mapDetails[mapName] = { exists: false };
                            }
                        });
                        
                        console.log(`📱 BROKEN ASSET DETAILS:`, {
                            meshName: mesh.name,
                            materialName: material.name,
                            transparent: material.transparent,
                            opacity: material.opacity,
                            alphaTest: material.alphaTest,
                            depthWrite: material.depthWrite,
                            depthTest: material.depthTest,
                            blending: material.blending,
                            maps: mapDetails
                        });
                        
                        // Apply mobile-specific fixes to broken assets
                        applyMobileMaterialFix(material);
                        
                        // Apply transparent fixes specifically for sidewalk materials
                        if (meshName.includes('sidewalk') || materialName.includes('sidewalk')) {
                            applyTransparentSidewalkFix(material);
                        }
                        
                        // Log confirmation
                        console.log(`✅ iOS Safari fix applied to: ${material.name} (mesh: ${mesh.name})`);
                    }
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
