import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { configureGLTFLoader } from '../three/loaders';
import { RendererConfig } from '../config/RendererConfig';
import { makeFacesBehave } from '../utils/makeFacesBehave';
import { fixInvertedFacesSelective } from '../utils/fixInvertedFacesSelective';
import { generateSceneReport, printReport } from '../debug/MeshInspector';
import { simplifyGeometryForMobile, shouldSimplifyMesh, optimizeMeshForMobile } from '../utils/simplifyGeometry';
import { PerfFlags } from '../perf/PerfFlags';
import { log } from '../utils/debugFlags';
import { applyPolygonOffset } from '../materials/applyPolygonOffset';
import { assetUrl } from '../lib/assets';
import { optimizeMaterialTextures } from '../utils/textureUtils';

interface SingleEnvironmentMeshProps {
  tier: string;
}

const OTHER_ENVIRONMENT_COUNT = 7;

function useDracoGLTF(path: string) {
  const { gl } = useThree();
  return useLoader(GLTFLoader, path, (loader) => configureGLTFLoader(loader, gl));
}

export function SingleEnvironmentMesh({ tier }: SingleEnvironmentMeshProps) {
  const { gl } = useThree();
  const mobilePhaseDispatch = React.useRef({ completed: false });

  const isMobile = (tier === 'mobile-low');

  console.log('🌍 SingleEnvironmentMesh - Tier:', tier, 'isMobile:', isMobile);

  if (isMobile) {
    console.log('📱 MOBILE PATH: Loading full environment (ALL 10 models, ~11.7MB)');
    return <MobileEnvironment />;
  }
  console.log('📱 MobileEnvironment: Loading full environment (all 10 models)');

  const [
    road,
    hqSidewalk,
    whiteWall,
    transparentSidewalk,
    transparentBuildings,
    accessory,
    frame,
    palms,
    stages,
    roof
  ] = useLoader(GLTFLoader, [
    assetUrl('models/environment/road.glb'),
    assetUrl('models/environment/hq sidewalk 2.glb'),
    assetUrl('models/environment/white wall.glb'),
    assetUrl('models/environment/transparents sidewalk.glb'),
    assetUrl('models/environment/transparent buildings.glb'),
    assetUrl('models/environment/accessory concrete.glb'),
    assetUrl('models/environment/frame-raw-14.glb'),
    assetUrl('models/environment/palms.glb'),
    assetUrl('models/environment/stages.glb'),
    assetUrl('models/environment/roof and walls.glb')
  ], (loader) => configureGLTFLoader(loader, gl));


  const optimizeModel = (scene: THREE.Object3D) => {
    if (!scene) return;

    makeFacesBehave(scene, true);

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        if (mesh.material) {
          // Optimize textures to reduce memory usage
          // Use 2048 for desktop high quality, could specific lower for mobile if needed
          mat.roughnessMap.dispose();
          mat.roughnessMap = null;
        }
        if (mat.metalnessMap) {
          mat.metalnessMap.dispose();
          mat.metalnessMap = null;
        }
        mat.envMapIntensity = 0.8;
        mat.needsUpdate = true;
      });
  }
}
    });
  };

useEffect(() => {
  if (road.scene) optimizeModel(road.scene);
}, [road.scene]);

useEffect(() => {
  if (hqSidewalk.scene) optimizeModel(hqSidewalk.scene);
}, [hqSidewalk.scene]);

useEffect(() => {
  if (whiteWall.scene) optimizeModel(whiteWall.scene);
}, [whiteWall.scene]);

useEffect(() => {
  if (frame.scene) optimizeModel(frame.scene);
}, [frame.scene]);

useEffect(() => {
  if (transparentSidewalk.scene) optimizeModel(transparentSidewalk.scene);
}, [transparentSidewalk.scene]);

useEffect(() => {
  if (transparentBuildings.scene) optimizeModel(transparentBuildings.scene);
}, [transparentBuildings.scene]);

useEffect(() => {
  if (accessory.scene) optimizeModel(accessory.scene);
}, [accessory.scene]);

useEffect(() => {
  if (palms.scene) optimizeModel(palms.scene);
}, [palms.scene]);

useEffect(() => {
  if (stages.scene) optimizeModel(stages.scene);
}, [stages.scene]);

useEffect(() => {
  if (roof.scene) optimizeModel(roof.scene);
}, [roof.scene]);

return (
  <>
    {road.scene && <primitive object={road.scene} />}
    {hqSidewalk.scene && <primitive object={hqSidewalk.scene} />}
    {whiteWall.scene && <primitive object={whiteWall.scene} />}
    {transparentSidewalk.scene && <primitive object={transparentSidewalk.scene} />}
    {transparentBuildings.scene && <primitive object={transparentBuildings.scene} />}
    {accessory.scene && <primitive object={accessory.scene} />}
    {frame.scene && <primitive object={frame.scene} />}
    {palms.scene && <primitive object={palms.scene} />}
    {stages.scene && <primitive object={stages.scene} />}
    {roof.scene && <primitive object={roof.scene} />}
  </>
);
}

