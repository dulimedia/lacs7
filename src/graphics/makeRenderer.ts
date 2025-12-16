import * as THREE from 'three';
import { logSafari } from '../debug/safariLogger';
import { RENDER_FLAGS } from '../config/renderFlags';
import { RendererConfig } from '../config/RendererConfig';
import { PerfFlags } from '../perf/PerfFlags';

export type RendererType = 'webgpu' | 'webgl2';

export interface RendererResult {
  renderer: THREE.WebGLRenderer;
  type: RendererType;
}

function createWebGLRenderer(canvas: HTMLCanvasElement, tier: string): THREE.WebGLRenderer {
  const isMobile = tier.startsWith('mobile');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  const isFirefox = /FxiOS/.test(navigator.userAgent);
  const isOrion = /Orion/.test(navigator.userAgent);

  logSafari('createWebGLRenderer called', { tier, isIOS, isSafari, isFirefox, isOrion });

  const config: any = {
    canvas,
    alpha: !RENDER_FLAGS.OPAQUE_CANVAS,
    antialias: false,
    powerPreference: 'default',
    logarithmicDepthBuffer: false,
    preserveDrawingBuffer: true, // FIXED: Align with App.tsx to prevent white flashing
    failIfMajorPerformanceCaveat: false,
    stencil: false,
    depth: true,
    premultipliedAlpha: false
  };

  logSafari('WebGL config', config);
  console.log(`🎨 Creating WebGL renderer (tier: ${tier}, iOS: ${isIOS}, Safari: ${isSafari})`);

  try {
    const renderer = new THREE.WebGLRenderer(config);

    if (!renderer.getContext() || renderer.getContext().isContextLost()) {
      throw new Error('WebGL context creation failed or lost');
    }

    logSafari('✅ WebGL context created successfully');
    return configureRenderer(renderer, canvas, tier, isIOS, isSafari);
  } catch (error) {
    console.error('❌ WebGL context creation failed:', error);

    // Fallback config
    const fallbackConfig = {
      canvas,
      alpha: false,
      antialias: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false
    };

    console.log('🔄 Attempting fallback WebGL context creation');
    const renderer = new THREE.WebGLRenderer(fallbackConfig);
    return configureRenderer(renderer, canvas, tier, isIOS, isSafari);
  }
}

function configureRenderer(renderer: THREE.WebGLRenderer, canvas: HTMLCanvasElement, tier: string, isIOS: boolean, isSafari: boolean): THREE.WebGLRenderer {

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.useLegacyLights = false;

  // Set clear color
  renderer.setClearColor(RENDER_FLAGS.CLEAR_COLOR, RENDER_FLAGS.CLEAR_ALPHA);

  // Shader error handling
  const originalShaderError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('THREE.WebGLProgram: Shader Error')) {
      console.warn('🚨 SHADER ERROR DETECTED:', message);
      return;
    }
    originalShaderError.apply(console, args);
  };

  // Compile test
  try {
    const testScene = new THREE.Scene();
    const testCamera = new THREE.Camera();
    renderer.compile(testScene, testCamera);
  } catch (error) {
    console.warn('⚠️ Tone mapping validation failed', error);
  }

  renderer.shadowMap.enabled = true;
  // Dynamic shadow type from config
  const shadowTypeStr = RendererConfig.shadows.type || 'pcf-soft';
  if (shadowTypeStr === 'basic') renderer.shadowMap.type = THREE.BasicShadowMap;
  else if (shadowTypeStr === 'pcf') renderer.shadowMap.type = THREE.PCFShadowMap;
  else if (shadowTypeStr === 'vsm') renderer.shadowMap.type = THREE.VSMShadowMap;
  else renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Default

  renderer.shadowMap.autoUpdate = true; // Ensure shadows update

  let DPR = 1.0;
  if (tier === 'mobile-high') DPR = Math.min(1.25, window.devicePixelRatio);
  else if (tier === 'mobile-low') DPR = 1.0;
  else DPR = Math.min(2.0, window.devicePixelRatio); // Will be clamped to 1.5 by PerfFlags later usually, but this is initial

  renderer.setPixelRatio(DPR);

  function resize() {
    const sceneContainer = document.querySelector('.scene-shell') as HTMLElement;

    let w, h;
    if (sceneContainer) {
      const rect = sceneContainer.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
    } else {
      w = Math.max(1, Math.floor(window.innerWidth));
      h = Math.max(1, Math.floor(window.innerHeight));
    }

    if (w > 0 && h > 0) {
      renderer.setSize(w, h, false);  // Only set renderer buffer
      // Let CSS/R3F handle DOM size (width/height: 100%)
    }
  }
  window.addEventListener('resize', () => requestAnimationFrame(resize));
  resize();

  // Context loss handling
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.error('❌ WebGL context lost! Reloading...');
    location.reload();
  }, false);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
    }
  }, { passive: true });

  return renderer;
}

export async function makeRenderer(
  canvas: HTMLCanvasElement,
  tier: string
): Promise<RendererResult> {
  // Hardcoded to WebGL2 to avoid WebGPU import errors
  return {
    renderer: createWebGLRenderer(canvas, tier),
    type: 'webgl2'
  };
}
