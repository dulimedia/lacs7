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

  // MOBILE SAFE-MODE PRESET
  // ULTRA-AGGRESSIVE settings to prevent WebGL context loss
  const safeModeSettings: MobileRenderingPreset = {
    pixelRatio: 1, // Always 1 on mobile to reduce GPU memory
    antialias: false, // Expensive on mobile
    shadows: false, // Very expensive, major GPU memory consumer
    postProcessing: false, // Can cause context loss
    maxLights: 1, // Single light only to minimize shader complexity
    textureSize: 256, // Ultra-conservative for stability over quality
    modelComplexity: 'low',
    preserveDrawingBuffer: false, // Can cause memory leaks on iOS
    powerPreference: 'low-power', // Prioritize battery/stability over performance
    failIfMajorPerformanceCaveat: false, // Don't fail, just use software rendering if needed
    useSimpleLighting: true, // Use basic ambient + directional, no fancy lighting
    hdriResolution: 64, // Extremely small HDRI to prevent context loss
    disableFog: true, // Fog adds shader complexity
    disableBloom: true, // Post-processing effect
    disableSSAO: true // Post-processing effect
  };

  // Check device capabilities to determine appropriate settings
  const deviceMemory = (navigator as any).deviceMemory || 4; // fallback to 4GB
  const maxTextureSize = device.maxTextureSize || 2048;
  const isLowEndDevice = deviceMemory <= 2 || maxTextureSize < 4096;

  console.log('📱 Mobile device capabilities:', {
    memory: deviceMemory + 'GB',
    maxTextureSize,
    isLowEnd: isLowEndDevice
  });

  // iOS Safari - aggressive settings to prevent context loss
  if (device.isIOS) {
    console.log('📱 ULTRA-AGGRESSIVE MOBILE MODE: iOS context loss prevention');
    return {
      ...safeModeSettings,
      // Even lower for context loss prevention
      textureSize: isLowEndDevice ? 128 : 256,
      hdriResolution: 32, // Extremely small to prevent memory issues
      pixelRatio: 0.75 // Sub-pixel rendering to save memory
    };
  }

  // Android - slightly less aggressive but still very conservative
  if (device.isAndroid) {
    return {
      ...safeModeSettings,
      textureSize: isLowEndDevice ? 128 : 256,
      maxLights: 1, // Reduce to 1 for stability
      hdriResolution: 32,
      pixelRatio: 0.85
    };
  }

  return safeModeSettings;
};