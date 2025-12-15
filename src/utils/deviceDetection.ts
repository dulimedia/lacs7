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
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      maxTextureSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), maxTextureSize);
      supportsWebGL2 = !!canvas.getContext('webgl2');
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
  // EXPERIMENT: Use same settings for mobile and desktop to test if texture downsizing is the issue
  console.log('🧪 EXPERIMENTAL: Using desktop-quality settings on mobile to test texture issues');
  
  return {
    pixelRatio: Math.min(window.devicePixelRatio, 2),
    antialias: device.isMobile ? false : true, // Keep antialias off on mobile for performance
    shadows: false, // Keep shadows off on mobile for stability
    postProcessing: false, // Keep post-processing off on mobile for stability
    maxLights: device.isMobile ? 2 : 8, // Slightly reduce lights on mobile
    textureSize: 2048, // FULL DESKTOP QUALITY - no downsizing!
    modelComplexity: 'high',
    preserveDrawingBuffer: false,
    powerPreference: device.isMobile ? 'low-power' : 'high-performance',
    failIfMajorPerformanceCaveat: false,
    useSimpleLighting: device.isMobile ? true : false, // Slightly simpler lighting on mobile
    hdriResolution: 1024, // FULL DESKTOP QUALITY - no downsizing!
    disableFog: device.isMobile ? true : false,
    disableBloom: true, // Keep bloom off on mobile
    disableSSAO: true // Keep SSAO off on mobile
  };
};