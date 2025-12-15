import { PerfFlags } from '../../perf/PerfFlags';

export type Tier = 'desktop-webgpu' | 'desktop-webgl2' | 'mobile-high' | 'mobile-low';

export async function detectTier(): Promise<Tier> {
  if (typeof window === 'undefined') {
    return 'desktop-webgl2';
  }

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const isMobile = !!nav && /Mobi|Android|iPhone|iPad/i.test(nav.userAgent);
  
  // CRITICAL FIX: Force mobile-low tier for ALL mobile devices to prevent memory crash
  // Mobile devices were loading desktop environment models (11.5MB) causing 45s crash
  if (isMobile) {
    console.log('🚨 MOBILE DETECTED - Forcing tier to mobile-low for stability');
    console.log('📱 User Agent:', nav?.userAgent);
    return 'mobile-low';
  }
  
  const hasWebGPU = !!(navigator as any).gpu;
  const canvas = document.createElement('canvas');
  
  // MOBILE FIX: Strict canvas validation for tier detection
  let webgl2 = false;
  if (canvas instanceof HTMLCanvasElement && typeof canvas.getContext === "function") {
    const gl2 = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
    webgl2 = !!gl2;
  } else if (PerfFlags.isMobile && PerfFlags.isSafariIOS) {
    console.warn("[MOBILE] prevented getContext in tier detection", { 
      type: typeof canvas, 
      tag: canvas?.tagName,
      hasGetContext: typeof canvas.getContext 
    });
  }

  if (hasWebGPU) {
    console.log('🎨 Desktop tier: webgpu');
    return 'desktop-webgpu';
  }
  if (webgl2) {
    console.log('🎨 Desktop tier: webgl2');
    return 'desktop-webgl2';
  }
  
  console.log('🎨 Fallback tier: desktop-webgl2');
  return 'desktop-webgl2';
}
