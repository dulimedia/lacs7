import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MobileDiagnostics } from './mobileDiagnostics';

export const TextureDebugger = () => {
    const { scene } = useThree();

    useEffect(() => {
        if (!MobileDiagnostics.enabled) return;

        const logStats = () => {
            let textureCount = 0;
            let materialCount = 0;
            let distinctTextures = new Set<string>();
            let sharedTextureCount = 0;

            scene.traverse((object) => {
                if ((object as THREE.Mesh).isMesh) {
                    const mesh = object as THREE.Mesh;
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

                    materials.forEach((mat) => {
                        materialCount++;
                        for (const key in mat) {
                            const value = (mat as any)[key];
                            if (value && value.isTexture) {
                                textureCount++;
                                if (distinctTextures.has(value.uuid)) {
                                    sharedTextureCount++;
                                } else {
                                    distinctTextures.add(value.uuid);
                                }
                            }
                        }
                    });
                }
            });

            MobileDiagnostics.log('stats', 'Texture/Material Stats', {
                materials: materialCount,
                textures: textureCount,
                distinctTextures: distinctTextures.size,
                sharedTextures: sharedTextureCount,
                ratio: (textureCount / (distinctTextures.size || 1)).toFixed(2)
            });
        };

        // Log immediately and then every 5 seconds
        logStats();
        const interval = setInterval(logStats, 5000);

        return () => clearInterval(interval);
    }, [scene]);

    return null;
};
