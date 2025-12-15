import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { configureGLTFLoader } from '../three/loaders';
import { RendererConfig } from '../config/RendererConfig';
import { makeFacesBehave } from '../utils/makeFacesBehave';
import { fixInvertedFacesSelective } from '../utils/fixInvertedFacesSelective';
import { simplifyGeometryForMobile, shouldSimplifyMesh, optimizeMeshForMobile } from '../utils/simplifyGeometry';
import { PerfFlags } from '../perf/PerfFlags';
import { log } from '../utils/debugFlags';
import { applyPolygonOffset } from '../materials/applyPolygonOffset';
import { assetUrl } from '../lib/assets';
import { optimizeMaterialTextures } from '../utils/textureUtils';

interface SingleEnvironmentMeshProps {
  tier: string;
}

function useDracoGLTF(path: string) {
  const { gl } = useThree();
  return useLoader(GLTFLoader, path, (loader) => configureGLTFLoader(loader, gl));
}

export function SingleEnvironmentMesh({ tier }: SingleEnvironmentMeshProps) {
  const { gl } = useThree();

  const isMobile = (tier === 'mobile-low');

  console.log('🌍 SingleEnvironmentMesh - Tier:', tier, 'isMobile:', isMobile);
  console.log('🔄 Loading Consolidated Environment: full environment .glb');

  // LOAD SINGLE CONSOLIDATED ASSET
  const fullEnv = useDracoGLTF(assetUrl('models/environment/one/full environment .glb'));

  const shadowsEnabled = gl && (gl as any).shadowMap?.enabled !== false;

  useEffect(() => {
    if (fullEnv.scene) {
      const scene = fullEnv.scene;
      console.log('✅ Processing Consolidated Environment Scene...');

      // 1. Geometry Fixes
      makeFacesBehave(scene, true);

      // 2. Traverse and Optimize
      let meshCount = 0;
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          meshCount++;

          // Mobile Geometry Simplification
          if (isMobile && mesh.geometry && mesh.geometry.attributes.position) {
            optimizeMeshForMobile(mesh);
          }

          // Shadow Logic
          if (shadowsEnabled) {
            const meshNameLower = (mesh.name || '').toLowerCase();
            const mat = mesh.material as THREE.Material;
            const matNameLower = (mat && mat.name) ? mat.name.toLowerCase() : '';

            // Exclude risky transparent materials from shadows
            const isRisky = meshNameLower.includes('transparent') ||
              meshNameLower.includes('glass') ||
              matNameLower.includes('transparent') ||
              matNameLower.includes('sidewalk') ||
              matNameLower.includes('window');

            if (isRisky) {
              mesh.castShadow = false;
              mesh.receiveShadow = false;
            } else {
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          } else if (isMobile) {
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            if (shadowsEnabled) {
              mat.shadowSide = THREE.FrontSide;
            }

            // Polygon Offset for ground-like meshes to prevent z-fighting
            const meshNameLower = (mesh.name || '').toLowerCase();
            if (meshNameLower.includes('road') || meshNameLower.includes('plaza') ||
              meshNameLower.includes('roof') || meshNameLower.includes('floor') ||
              meshNameLower.includes('ground') || meshNameLower.includes('deck')) {
              applyPolygonOffset(mat);
            }

            // Mobile specific material reductions
            if (isMobile) {
              if (mat.normalMap) { mat.normalMap.dispose(); mat.normalMap = null; }
              if (mat.roughnessMap) { mat.roughnessMap.dispose(); mat.roughnessMap = null; }
              if (mat.metalnessMap) { mat.metalnessMap.dispose(); mat.metalnessMap = null; }
              mat.envMapIntensity = RendererConfig.materials.envMapIntensity;
            }

            // Ensure updates
            if (!isMobile) {
              mat.envMapIntensity = RendererConfig.materials.envMapIntensity;
            }

            if (mat.map) mat.map.needsUpdate = true;
            mat.needsUpdate = true;
          });
    }
  }
      });

console.log(`✨ Environment Configuration Complete. Processed ${meshCount} meshes.`);

// Cleanup for Mobile
if (isMobile) {
  if ((window as any).gc) (window as any).gc();
}
    }
  }, [fullEnv.scene, isMobile, shadowsEnabled]);

return (
  <>
    {fullEnv.scene && <primitive object={fullEnv.scene} />}
  </>
);
}
