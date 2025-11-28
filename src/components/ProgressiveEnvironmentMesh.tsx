import { useGLTF } from '@react-three/drei';
import { useMemo, useEffect } from 'react';
import { useProgressiveEnvLoader, ENV_MODELS } from '../hooks/useProgressiveEnvLoader';
import { assetUrl } from '../lib/assets';
import { logSafari } from '../debug/safariLogger';
import * as THREE from 'three';
import { makeFacesBehave } from '../utils/makeFacesBehave';

const DRACO_DECODER_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

function useDracoGLTF(path: string) {
  return useGLTF(path, DRACO_DECODER_CDN);
}

export function ProgressiveEnvironmentMesh() {
  const { loadedCount, progress, allLoaded } = useProgressiveEnvLoader(assetUrl(''));

  logSafari('ProgressiveEnvironmentMesh render', { loadedCount, progress, allLoaded });

  const road = useDracoGLTF(assetUrl('models/environment/road.glb'));
  const hqSidewalk = useDracoGLTF(assetUrl('models/environment/hq sidewalk 2.glb'));
  const whiteWall = useDracoGLTF(assetUrl('models/environment/white wall.glb'));
  const frame = useDracoGLTF(assetUrl('models/environment/frame-raw-14.glb'));
  const roof = useDracoGLTF(assetUrl('models/environment/roof and walls.glb'));
  const transparentSidewalk = useDracoGLTF(assetUrl('models/environment/transparents sidewalk.glb'));
  const transparentBuildings = useDracoGLTF(assetUrl('models/environment/transparent buildings.glb'));
  const accessory = useDracoGLTF(assetUrl('models/environment/accessory concrete.glb'));
  const palms = useDracoGLTF(assetUrl('models/environment/palms.glb'));
  const stages = useDracoGLTF(assetUrl('models/environment/stages.glb'));

  const optimizeModel = (scene: THREE.Object3D) => {
    if (!scene) return;
    makeFacesBehave(scene, true);
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat: any) => {
            if (mat.normalMap) {
              mat.normalMap.dispose();
              mat.normalMap = null;
            }
            if (mat.roughnessMap) {
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
    if (roof.scene) optimizeModel(roof.scene);
  }, [roof.scene]);

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

  return (
    <>
      {loadedCount >= 1 && road.scene && <primitive object={road.scene} />}
      {loadedCount >= 2 && hqSidewalk.scene && <primitive object={hqSidewalk.scene} />}
      {loadedCount >= 3 && whiteWall.scene && <primitive object={whiteWall.scene} />}
      {loadedCount >= 4 && frame.scene && <primitive object={frame.scene} />}
      {loadedCount >= 5 && roof.scene && <primitive object={roof.scene} />}
      {loadedCount >= 6 && transparentSidewalk.scene && <primitive object={transparentSidewalk.scene} />}
      {loadedCount >= 7 && transparentBuildings.scene && <primitive object={transparentBuildings.scene} />}
      {loadedCount >= 8 && accessory.scene && <primitive object={accessory.scene} />}
      {loadedCount >= 9 && palms.scene && <primitive object={palms.scene} />}
      {loadedCount >= 10 && stages.scene && <primitive object={stages.scene} />}
    </>
  );
}
