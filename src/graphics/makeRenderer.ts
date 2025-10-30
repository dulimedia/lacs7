import * as THREE from 'three';

export type RendererType = 'webgpu' | 'webgl2';

export interface RendererResult {
  renderer: THREE.WebGLRenderer | any;
  type: RendererType;
}

async function smokeTestWebGPU(renderer: any): Promise<boolean> {
  try {
    if (!renderer.backend || !renderer.backend.device) {
      console.warn('WebGPU: No backend device found');
      return false;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    renderer.setSize(1, 1);
    renderer.render(scene, camera);
    
    geometry.dispose();
    material.dispose();
    
    console.log('✅ WebGPU smoke test passed');
    return true;
  } catch (error) {
    console.warn('WebGPU smoke test failed:', error);
    return false;
  }
}

function createWebGLRenderer(canvas: HTMLCanvasElement, tier: string): THREE.WebGLRenderer {
  const isMobile = tier.startsWith('mobile');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMobileLow = tier === 'mobile-low';
  
  const config: any = {
    canvas,
    alpha: false,
    antialias: false,
    powerPreference: isMobile ? 'low-power' : 'high-performance',
    logarithmicDepthBuffer: false,
    preserveDrawingBuffer: false,
    failIfMajorPerformanceCaveat: false,
    stencil: false,
    depth: true
  };
  
  if (isIOS && isMobileLow) {
    console.log('🍎 iOS mobile-low: attempting WebGL1 fallback');
    const gl1Context = canvas.getContext('webgl', { 
      alpha: false,
      antialias: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false,
      stencil: false,
      failIfMajorPerformanceCaveat: false
    });
    
    if (gl1Context) {
      config.context = gl1Context;
    }
  }
  
  const renderer = new THREE.WebGLRenderer(config);
  
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.useLegacyLights = false;
  renderer.setClearColor(0x000000, 0);
  
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  
  const context = renderer.getContext();
  if (context.getExtension) {
    context.getExtension('EXT_color_buffer_float');
  }
  
  let DPR = 1.0;
  if (tier === 'mobile-high') {
    DPR = Math.min(1.25, window.devicePixelRatio);
  } else if (tier === 'mobile-low') {
    DPR = 1.0;
  } else {
    DPR = Math.min(2.0, window.devicePixelRatio);
  }
  
  console.log(`📱 Renderer DPR: ${DPR} (tier: ${tier}, device: ${window.devicePixelRatio})`);
  renderer.setPixelRatio(DPR);
  
  function resize() {
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', () => requestAnimationFrame(resize), { passive: true });
  resize();
  
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.error('❌ WebGL context lost! Showing fallback...');
    localStorage.setItem('webglContextLost', 'true');
    
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9); color: white; padding: 20px;
      border-radius: 8px; font-family: sans-serif; text-align: center;
      z-index: 99999; max-width: 80%;
    `;
    banner.innerHTML = `
      <h2>⚠️ Graphics Error</h2>
      <p>Your device ran out of graphics memory.</p>
      <button onclick="location.reload()" style="
        padding: 10px 20px; margin-top: 10px; cursor: pointer;
        background: #4CAF50; color: white; border: none; border-radius: 4px;
      ">Reload Page</button>
    `;
    document.body.appendChild(banner);
  }, false);
  
  canvas.addEventListener('webglcontextrestored', () => {
    console.log('✅ WebGL context restored');
    localStorage.removeItem('webglContextLost');
    location.reload();
  }, false);
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
    }
  }, { passive: true });
  
  return renderer;
}

async function createWebGPURenderer(canvas: HTMLCanvasElement): Promise<any | null> {
  try {
    const { WebGPURenderer } = await import('three/examples/jsm/renderers/webgpu/WebGPURenderer.js');
    
    const renderer = new WebGPURenderer({ 
      canvas, 
      antialias: true,
      forceWebGL: false
    });
    
    await renderer.init();
    
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const smokeOk = await smokeTestWebGPU(renderer);
    
    if (!smokeOk) {
      console.warn('WebGPU smoke test failed, disposing renderer');
      renderer.dispose();
      return null;
    }
    
    console.log('🚀 WebGPU renderer initialized successfully');
    return renderer;
    
  } catch (error) {
    console.warn('WebGPU initialization failed:', error);
    return null;
  }
}

export async function makeRenderer(
  canvas: HTMLCanvasElement, 
  tier: string
): Promise<RendererResult> {
  const hasWebGPU = !!(navigator as any).gpu;
  
  console.log('🔍 makeRenderer called:', { tier, hasWebGPU, userAgent: navigator.userAgent.substring(0, 50) });
  
  if (!hasWebGPU || !tier.includes('webgpu')) {
    console.log('📊 Creating WebGL2 renderer (reason:', !hasWebGPU ? 'no GPU API' : 'tier not webgpu', ')');
    return {
      renderer: createWebGLRenderer(canvas, tier),
      type: 'webgl2'
    };
  }
  
  console.log('🔄 Attempting WebGPU renderer initialization...');
  const webgpuRenderer = await createWebGPURenderer(canvas);
  
  if (webgpuRenderer) {
    console.log('✅ WebGPU renderer created successfully');
    return {
      renderer: webgpuRenderer,
      type: 'webgpu'
    };
  }
  
  console.log('⚠️ WebGPU failed, falling back to WebGL2');
  return {
    renderer: createWebGLRenderer(canvas, tier),
    type: 'webgl2'
  };
}
