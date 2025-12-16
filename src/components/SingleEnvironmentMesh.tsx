import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { configureGLTFLoader } from '../three/loaders';
import { RendererConfig } from '../config/RendererConfig';
import { makeFacesBehave } from '../utils/makeFacesBehave';
import { optimizeMeshForMobile } from '../utils/simplifyGeometry';
import { applyPolygonOffset } from '../materials/applyPolygonOffset';
import { assetUrl } from '../lib/assets';
import { createCustomShadowMaterial } from '../materials/CustomShadowMaterial';
import { PerfFlags } from '../perf/PerfFlags';

interface SingleEnvironmentMeshProps {
  tier: string;
}

function useDracoGLTF(path: string) {
  const { gl } = useThree();
  return useLoader(GLTFLoader, path, (loader) => configureGLTFLoader(loader, gl));
}

const FRAGMENTS = [
  'accessory concrete.glb',
  'frame.glb',
  'hq sidewalk.glb',
  'palms.glb',
  'road.glb',
  'roof and walls.glb',
  'stages.glb',
  'transparent buildings.glb',
  'transparent sidewalk.glb',
  'white walls.glb'
];

function EnvironmentFragment({ filename, tier }: { filename: string, tier: string }) {
  const { gl } = useThree();
  const isMobile = (tier === 'mobile-low');
  const glTF = useDracoGLTF(assetUrl(`models/environment/one/${filename}`));
  const shadowsEnabled = gl && (gl as any).shadowMap?.enabled !== false;

  useEffect(() => {
    if (glTF.scene) {
      const scene = glTF.scene;
      console.log(`🧩 Processing Fragment: ${filename}`);

      // 1. Geometry Fixes
      makeFacesBehave(scene, true);

      // 2. Prepare Custom Shadow Material
      const customShadowMat = createCustomShadowMaterial({ offset: 0.0008 });

      // 3. Determine File-Level Rules
      const isTransparentFile = filename.includes('transparent');
      const isRoadFile = filename.includes('road') || filename.includes('sidewalk');

      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;

          if (isMobile && mesh.geometry && mesh.geometry.attributes.position) {
            optimizeMeshForMobile(mesh);
          }

          const mat = mesh.material as THREE.MeshStandardMaterial;

          if (mat && mat.isMeshStandardMaterial) {
            // General Texture Setup
            if (mat.map) {
              mat.map.minFilter = THREE.LinearMipMapLinearFilter;
              mat.map.anisotropy = gl.capabilities.getMaxAnisotropy();
            }

            // SHADOWS
            if (shadowsEnabled) {
              if (isTransparentFile || (mat.transparent && mat.opacity < 0.95)) {
                mesh.castShadow = false;
                mesh.receiveShadow = false;
              } else {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.customDepthMaterial = customShadowMat;
              }
            }

            // Z-FIGHTING (Roads/Sidewalks)
            if (isRoadFile) {
              mat.polygonOffset = true;
              mat.polygonOffsetFactor = -1;
              mat.polygonOffsetUnits = -1;
            }

            // Note: We removed the 'accessory concrete raw' safety check 
            // to test the user's fixed asset.

            mat.needsUpdate = true;
          }
        }
      });

      // Cleanup for Mobile
      if (isMobile && (window as any).gc) (window as any).gc();
    }
  }, [glTF.scene, filename, isMobile, shadowsEnabled, gl]);

  return <primitive object={glTF.scene} />;
}

// Mobile-specific component using the optimized single GLB file
function MobileEnvironmentMesh({ tier }: { tier: string }) {
  const { gl } = useThree();
  // SURGICAL FIX: Load specific mobile GLB
  const glTF = useDracoGLTF(assetUrl('models/environment/mobile/entirescenemobile.glb'));
  const shadowsEnabled = gl && (gl as any).shadowMap?.enabled !== false;

  useEffect(() => {
    if (glTF.scene) {
      const scene = glTF.scene;
      console.log('📱 Processing Mobile Environment: entirescenemobile.glb');

      // SURGICAL FIX: NO runtime mutations (geometry/texture)
      // Only applying necessary rendering flags for shadows/z-fighting

      const customShadowMat = createCustomShadowMaterial({ offset: 0.0008 });

      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;

          // Mobile geometry optimization - REMOVED for SURGICAL FIX
          // if (mesh.geometry && mesh.geometry.attributes.position) {
          //   optimizeMeshForMobile(mesh);
          // }

          const mat = mesh.material as THREE.MeshStandardMaterial;

          if (mat && mat.isMeshStandardMaterial) {
            // Texture setup for mobile
            if (mat.map) {
              mat.map.minFilter = THREE.LinearMipMapLinearFilter;
              mat.map.anisotropy = Math.min(2, gl.capabilities.getMaxAnisotropy()); // Limit anisotropy on mobile
            }

            // Shadow setup - more conservative on mobile
            if (shadowsEnabled) {
              const isTransparent = mat.transparent && mat.opacity < 0.95;
              if (isTransparent) {
                mesh.castShadow = false;
                mesh.receiveShadow = false;
              } else {
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.customDepthMaterial = customShadowMat;
              }
            }

            // Check for road/sidewalk materials by name or properties
            const meshName = mesh.name.toLowerCase();
            if (meshName.includes('road') || meshName.includes('sidewalk') || meshName.includes('concrete')) {
              mat.polygonOffset = true;
              mat.polygonOffsetFactor = -1;
              mat.polygonOffsetUnits = -1;
            }

            mat.needsUpdate = true;
          }
        }
      });

      // Aggressive garbage collection on mobile after processing
      if ((window as any).gc) {
        (window as any).gc();
      }

      console.log('✅ Mobile environment loaded and optimized');
    }
  }, [glTF.scene, shadowsEnabled, gl]);

  return <primitive object={glTF.scene} />;
}

export function SingleEnvironmentMesh({ tier }: SingleEnvironmentMeshProps) {
  // Use mobile-optimized single GLB on mobile devices, desktop fragments otherwise
  if (PerfFlags.isMobile) {
    return <MobileEnvironmentMesh tier={tier} />;
  }

  return (
    <group>
      {FRAGMENTS.map((file) => (
        <EnvironmentFragment key={file} filename={file} tier={tier} />
      ))}
    </group>
  );
}
