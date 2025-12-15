// Device detection utilities for mobile optimization
export interface DeviceCapabilities {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isLowPowerDevice: boolean;
  isUltraLowMemory: boolean;
  deviceMemoryGB: number;
  maxTextureSize: number;
  supportsWebGL2: boolean;
  devicePixelRatio: number;
}

let cachedCapabilities: DeviceCapabilities | null = null;

export const detectDevice = (): DeviceCapabilities => {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /Mobi|Mobile/i.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  
  const nav = navigator as any;
  const deviceMemoryGB = nav.deviceMemory || (isMobile ? 2 : 8);
  
  const isOlderIPhone = /iPhone (6|7|8|X|SE|11)/.test(userAgent);
  const isUltraLowMemory = (deviceMemoryGB < 4) || (isMobile && isOlderIPhone);
  
  const isLowPowerDevice = isMobile && (
    /iPhone [1-9]|iPad[1-4]/.test(userAgent) || 
    /Android [1-6]/.test(userAgent) ||
    isUltraLowMemory
  );

  let maxTextureSize = isUltraLowMemory ? 1024 : 2048;
  let supportsWebGL2 = false;
  
  try {
    const canvas = document.createElement('canvas');
    // MOBILE FIX: Strict canvas validation even for created canvas
    if (canvas instanceof HTMLCanvasElement && typeof canvas.getContext === "function") {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        maxTextureSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), maxTextureSize);
        supportsWebGL2 = !!canvas.getContext('webgl2');
      }
    }
  } catch (e) {
    console.warn('WebGL detection failed:', e);
  }

  if (!isMobile) {
    console.log(`📱 Device Memory: ${deviceMemoryGB}GB, Ultra-Low: ${isUltraLowMemory}, Mobile: ${isMobile}`);
  }

  cachedCapabilities = {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isLowPowerDevice,
    isUltraLowMemory,
    deviceMemoryGB,
    maxTextureSize,
    supportsWebGL2,
    devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2)
  };
  
  return cachedCapabilities;
};

export interface MobileRenderingPreset {
  pixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  postProcessing: boolean;
  maxLights: number;
  textureSize: number;
  modelComplexity: 'low' | 'medium' | 'high';
  preserveDrawingBuffer?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  failIfMajorPerformanceCaveat?: boolean;
  useSimpleLighting: boolean;
  hdriResolution: number;
  disableFog: boolean;
  disableBloom: boolean;
  disableSSAO: boolean;
}

export const getMobileOptimizedSettings = (device: DeviceCapabilities): MobileRenderingPreset => {
  if (!device.isMobile) {
    return {
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      antialias: true,
      shadows: true,
      postProcessing: true,
      maxLights: 8,
      textureSize: 2048,
      modelComplexity: 'high',
      useSimpleLighting: false,
      hdriResolution: 1024,
      disableFog: false,
      disableBloom: false,
      disableSSAO: false
    };
  }

  // RESTORED: Mobile settings that were working at 7797c6f (before we broke them)
  console.log('📱 RESTORED: Using mobile settings that worked at commit 7797c6f');
  
  return {
    pixelRatio: 1, // Keep at 1 for mobile stability
    antialias: false, // Expensive on mobile
    shadows: false, // Major GPU memory consumer
    postProcessing: false, // Can cause context loss
    maxLights: 1, // Single light only
    textureSize: 512, // Moderate size - not too small, not too big
    modelComplexity: 'low',
    preserveDrawingBuffer: false, // Can cause memory leaks on iOS
    powerPreference: 'low-power',
    failIfMajorPerformanceCaveat: false,
    useSimpleLighting: true,
    hdriResolution: 256, // Small but functional for non-Safari mobile
    disableFog: true,
    disableBloom: true,
    disableSSAO: true
  };
};