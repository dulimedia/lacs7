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

export function SingleEnvironmentMesh({ tier }: SingleEnvironmentMeshProps) {
  return (
    <group>
      {FRAGMENTS.map((file) => (
        <EnvironmentFragment key={file} filename={file} tier={tier} />
      ))}
    </group>
  );
}
