import { useState, useEffect } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { logSafari } from '../debug/safariLogger';

export interface EnvModel {
  id: string;
  path: string;
  priority: number;
}

export const ENV_MODELS: EnvModel[] = [
  { id: 'road', path: 'models/environment/road.glb', priority: 1 },
  { id: 'hq-sidewalk', path: 'models/environment/hq sidewalk 2.glb', priority: 2 },
  { id: 'white-wall', path: 'models/environment/white wall.glb', priority: 3 },
  { id: 'frame', path: 'models/environment/frame-raw-14.glb', priority: 4 },
  { id: 'roof', path: 'models/environment/roof and walls.glb', priority: 5 },
  { id: 'transparent-sidewalk', path: 'models/environment/transparents sidewalk.glb', priority: 6 },
  { id: 'transparent-buildings', path: 'models/environment/transparent buildings.glb', priority: 7 },
  { id: 'accessory', path: 'models/environment/accessory concrete.glb', priority: 8 },
  { id: 'palms', path: 'models/environment/palms.glb', priority: 9 },
  { id: 'stages', path: 'models/environment/stages.glb', priority: 10 },
];

const DRACO_DECODER_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

export function useProgressiveEnvLoader(baseUrl: string = '') {
  const [loadedCount, setLoadedCount] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState<Record<string, 'pending' | 'loading' | 'loaded' | 'error'>>({});
  const [allLoaded, setAllLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    logSafari('Progressive loader started', { modelCount: ENV_MODELS.length });

    async function loadSequentially() {
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(DRACO_DECODER_CDN);
      loader.setDRACOLoader(dracoLoader);

      for (let i = 0; i < ENV_MODELS.length; i++) {
        if (cancelled) {
          logSafari('Progressive loader cancelled');
          return;
        }

        const model = ENV_MODELS[i];
        const fullPath = baseUrl + model.path;

        logSafari(`Loading env model ${i + 1}/${ENV_MODELS.length}`, { id: model.id, path: model.path });
        
        setLoadingStatus(prev => ({ ...prev, [model.id]: 'loading' }));

        try {
          await new Promise<void>((resolve, reject) => {
            loader.load(
              fullPath,
              (gltf) => {
                if (!cancelled) {
                  logSafari(`✅ Loaded env model ${i + 1}/${ENV_MODELS.length}`, { id: model.id });
                  setLoadingStatus(prev => ({ ...prev, [model.id]: 'loaded' }));
                  setLoadedCount(i + 1);
                }
                resolve();
              },
              (progress) => {
                if (progress.total > 0) {
                  const percent = Math.round((progress.loaded / progress.total) * 100);
                  if (percent % 25 === 0) {
                    logSafari(`Loading ${model.id}: ${percent}%`);
                  }
                }
              },
              (err) => {
                logSafari(`ERROR loading env model ${i + 1}/${ENV_MODELS.length}`, { id: model.id, error: String(err) });
                setLoadingStatus(prev => ({ ...prev, [model.id]: 'error' }));
                resolve();
              }
            );
          });
        } catch (err) {
          logSafari(`ERROR in progressive load`, { id: model.id, error: String(err) });
        }

        if (cancelled) return;

        await new Promise(r => setTimeout(r, 100));
      }

      if (!cancelled) {
        logSafari('✅ All env models queued for load', { total: ENV_MODELS.length });
        setAllLoaded(true);
      }
    }

    loadSequentially();

    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  return { 
    loadedCount, 
    loadingStatus, 
    allLoaded,
    totalModels: ENV_MODELS.length,
    progress: Math.round((loadedCount / ENV_MODELS.length) * 100)
  };
}
