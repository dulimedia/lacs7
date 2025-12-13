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
  console.log('🖥️ DESKTOP PATH: Loading full environment (10 models, 11.5MB)');

  /* 
   * OPTIMIZATION: Load all environment assets in PARALLEL.
   * Passing an array to useLoader triggers simultaneous downloads, verified to prevent waterfall.
   */
  const [
    accessory,
    hqSidewalk,
    road,
    transparentBuildings,
    transparentSidewalk,
    whiteWall,
    palms,
    frame,
    roof,
    stages
  ] = useLoader(GLTFLoader, [
    assetUrl('models/environment/accessory concrete.glb'),
    assetUrl('models/environment/hq sidewalk 2.glb'),
    assetUrl('models/environment/road.glb'),
    assetUrl('models/environment/transparent buildings.glb'),
    assetUrl('models/environment/transparents sidewalk.glb'),
    assetUrl('models/environment/white wall.glb'),
    assetUrl('models/environment/palms.glb'),
    assetUrl('models/environment/frame-raw-14.glb'),
    assetUrl('models/environment/roof and walls.glb'),
    assetUrl('models/environment/stages.glb')
  ], (loader) => configureGLTFLoader(loader, gl));



  const otherScenes = useMemo(

    () =>

      [

        accessory.scene,

        hqSidewalk.scene,

        road.scene,

        transparentBuildings.scene,

        transparentSidewalk.scene,

        whiteWall.scene,

        palms.scene

      ].filter((scene): scene is THREE.Group => Boolean(scene)),

    [

      accessory.scene,

      hqSidewalk.scene,

      road.scene,

      transparentBuildings.scene,

      transparentSidewalk.scene,

      whiteWall.scene,

      palms.scene

    ]

  );



  const othersReady = otherScenes.length === OTHER_ENVIRONMENT_COUNT;

  const frameReady = Boolean(frame.scene);

  const roofReady = Boolean(roof.scene);

  const stagesReady = Boolean(stages.scene);



  const shadowsEnabled = gl && (gl as any).shadowMap?.enabled !== false;


  useEffect(() => {

    if (!isMobile) return;

    if (othersReady && frameReady && roofReady && stagesReady && !mobilePhaseDispatch.current.completed) {

      mobilePhaseDispatch.current.completed = true;

      if (window.dispatchEvent) {

        window.dispatchEvent(new CustomEvent('mobile-loading-complete', {

          detail: {

            phase: 'complete',

            progress: 100,

            message: 'All environment models loaded!'

          }

        }));

      }

    }

  }, [isMobile, othersReady, frameReady, roofReady, stagesReady]);



  // Process environment models when loaded

  useEffect(() => {

    if (!otherScenes.length) return;

    console.log('dY"? Processing environment set (others)...');

    otherScenes.forEach((scene) => {

      makeFacesBehave(scene, true);



      scene.traverse((child) => {

        if ((child as THREE.Mesh).isMesh) {

          const mesh = child as THREE.Mesh;



          if (mesh.geometry && mesh.geometry.attributes.position && isMobile) {

            log.verbose(`  Mesh: ${mesh.name || 'unnamed'} (${mesh.geometry.attributes.position.count} vertices)`);

            optimizeMeshForMobile(mesh);

          }



          if (shadowsEnabled) {
            // SAFETY: Exclude materials that cause WebGL crashes in r182
            const meshNameLower = (mesh.name || '').toLowerCase();
            const matNameLower = (mesh.material && !Array.isArray(mesh.material) && mesh.material.name)
              ? mesh.material.name.toLowerCase()
              : '';

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

          }



          if (mesh.material) {

            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

            materials.forEach((mat: any) => {
              // Optimize textures for ALL Tiers (Desktop & Mobile)
              // Aggressive 1024 limit to solve 2GB memory usage
              optimizeMaterialTextures(mat, 1024);

              if (shadowsEnabled) {

                mat.shadowSide = THREE.FrontSide;

              }



              const meshNameLower = (mesh.name || '').toLowerCase();

              if (meshNameLower.includes('road') || meshNameLower.includes('plaza') ||

                meshNameLower.includes('roof') || meshNameLower.includes('floor') ||

                meshNameLower.includes('ground') || meshNameLower.includes('deck')) {

                applyPolygonOffset(mat);

              }



              if (isMobile) {

                if (mat.normalMap) {

                  mat.normalMap.dispose();

                  mat.normalMap = null as any;

                }

                if (mat.roughnessMap) {

                  mat.roughnessMap.dispose();

                  mat.roughnessMap = null as any;

                }

                if (mat.metalnessMap) {
                  mat.metalnessMap.dispose();
                  mat.metalnessMap = null as any;
                }
                // Use global config for intensity
                mat.envMapIntensity = RendererConfig.materials.envMapIntensity;
              }

              // Also apply to desktop to ensure darkness
              if (!isMobile) {
                mat.envMapIntensity = RendererConfig.materials.envMapIntensity;
              }



              if (mat.map) mat.map.needsUpdate = true;

              mat.needsUpdate = true;

            });

          }

        }

      });

    });



    if (isMobile) {

      if ((window as any).gc) {

        (window as any).gc();

      }

      if (window.requestIdleCallback) {

        window.requestIdleCallback(() => {

          console.log('dYO? Mobile: Idle cleanup after environment processing');

        });

      }

    }

  }, [otherScenes, isMobile, shadowsEnabled]);



  // Process frame model when loaded

  useEffect(() => {

    const scene = frame.scene;

    if (scene) {

      console.log('dY"? Processing Frame model...');

      if (isMobile) console.log('dY"? Mobile: Processing Frame with optimizations');



      makeFacesBehave(scene);

      log.verbose('dY"? Running selective face fixer on Frame...');

      fixInvertedFacesSelective(scene);



      if (isMobile) {

        scene.traverse((child) => {

          if ((child as THREE.Mesh).isMesh) {

            const mesh = child as THREE.Mesh;

            mesh.castShadow = false;

            mesh.receiveShadow = false;



            if (shouldSimplifyMesh(mesh, isMobile) && mesh.geometry) {

              const originalVerts = mesh.geometry.attributes.position.count;

              mesh.geometry = simplifyGeometryForMobile(mesh.geometry, 0.7);

              const newVerts = mesh.geometry.attributes.position.count;

              console.log(`dY"% Frame simplified ${mesh.name}: ${originalVerts} ?+' ${newVerts} vertices`);

            }

          }

        });

      }



      if (isMobile) {

        console.log('dY-`?,? Mobile: Cleanup after Frame processing');

        if ((window as any).gc) {

          (window as any).gc();

        }

      }

    }

  }, [frame.scene, isMobile]);



  // Process roof model when loaded

  useEffect(() => {

    const scene = roof.scene;

    if (scene) {

      console.log('dY"? Processing Roof model...');

      if (isMobile) console.log('dY"? Mobile: Processing Roof with optimizations');



      makeFacesBehave(scene);



      scene.traverse((child) => {

        if ((child as THREE.Mesh).isMesh) {

          const mesh = child as THREE.Mesh;



          if (shadowsEnabled) {

            mesh.castShadow = true;

            mesh.receiveShadow = true;



            if (mesh.material) {

              if (Array.isArray(mesh.material)) {

                mesh.material.forEach(mat => {

                  mat.shadowSide = THREE.FrontSide;

                });

              } else {

                mesh.material.shadowSide = THREE.FrontSide;

              }

            }

          } else if (isMobile) {

            mesh.castShadow = false;

            mesh.receiveShadow = false;



            if (shouldSimplifyMesh(mesh, isMobile) && mesh.geometry) {

              const originalVerts = mesh.geometry.attributes.position.count;

              mesh.geometry = simplifyGeometryForMobile(mesh.geometry, 0.7);

              const newVerts = mesh.geometry.attributes.position.count;

              console.log(`dY"% Roof simplified ${mesh.name}: ${originalVerts} ?+' ${newVerts} vertices`);

            }

          }

        }

      });



      if (isMobile) {

        console.log('dY-`?,? Mobile: Cleanup after Roof processing');

        if ((window as any).gc) {

          (window as any).gc();

        }

      }

    }

  }, [roof.scene, isMobile]);



  // Process stages model when loaded

  useEffect(() => {

    const scene = stages.scene;

    if (scene) {

      console.log('dY"? Processing Stages model...');

      if (isMobile) console.log('dY"? Mobile: Processing Stages with optimizations');



      makeFacesBehave(scene);



      let meshCount = 0;

      scene.traverse((child) => {

        if ((child as THREE.Mesh).isMesh) {

          const mesh = child as THREE.Mesh;

          meshCount++;



          mesh.visible = true;

          mesh.frustumCulled = false;



          if (mesh.material) {

            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

            materials.forEach((mat: any) => {

              mat.visible = true;

              mat.transparent = false;

              mat.opacity = 1.0;

              mat.side = THREE.FrontSide;

              mat.depthWrite = true;

              mat.depthTest = true;

              mat.needsUpdate = true;

            });

          }



          if (shadowsEnabled) {

            mesh.castShadow = true;

            mesh.receiveShadow = true;



            if (mesh.material) {

              if (Array.isArray(mesh.material)) {

                mesh.material.forEach(mat => {

                  mat.shadowSide = THREE.FrontSide;

                });

              } else {

                mesh.material.shadowSide = THREE.FrontSide;

              }

            }

          } else if (isMobile) {

            mesh.castShadow = false;

            mesh.receiveShadow = false;



            if (shouldSimplifyMesh(mesh, isMobile) && mesh.geometry) {

              const originalVerts = mesh.geometry.attributes.position.count;

              mesh.geometry = simplifyGeometryForMobile(mesh.geometry, 0.7);

              const newVerts = mesh.geometry.attributes.position.count;

              console.log(`dY"% Stages simplified ${mesh.name}: ${originalVerts} ?+' ${newVerts} vertices`);

            }

          }

        }

      });



      console.log('?o. Stages configured: ' + meshCount + ' meshes, all set to visible');



      if (isMobile) {

        console.log('dY-`?,? Mobile: Final cleanup after Stages processing');

        if ((window as any).gc) {

          (window as any).gc();

        }



        if (navigator && (navigator as any).deviceMemory) {

          console.log(`dY"S Device memory: ${(navigator as any).deviceMemory}GB`);

        }



        if (gl && gl.info) {

          const info = gl.info;

          console.log('dY"S WebGL memory:', {

            geometries: info.memory.geometries,

            textures: info.memory.textures,

            programs: info.programs?.length || 0

          });

        }



        console.log('?o. Mobile: All models loaded and optimized successfully!');

      }

    }

  }, [stages.scene, isMobile, gl]);



  return (
    <>
      {otherScenes.map((scene, index) => (
        <primitive key={scene.uuid} object={scene} />
      ))}
      {frame.scene && <primitive object={frame.scene} />}
      {roof.scene && <primitive object={roof.scene} />}
      {stages.scene && <primitive object={stages.scene} />}
    </>
  );
}

function MobileEnvironment() {
  const { gl } = useThree();
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
          const maxTextureSize = 1024;

          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat: any) => {
            // Optimize textures first
            optimizeMaterialTextures(mat, maxTextureSize);

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

