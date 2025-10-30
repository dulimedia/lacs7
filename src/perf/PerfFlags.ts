export type Tier = "mobileLow" | "desktopHigh";

export const PerfFlags = (() => {
  const userAgent = navigator.userAgent;
  const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isNarrowViewport = window.innerWidth < 768;
  const hasLowMemory = (navigator as any).deviceMemory ? (navigator as any).deviceMemory <= 4 : false;
  const isSimulatorSize = window.innerWidth < 600 || window.innerHeight < 600;
  
  const isMobile = isMobileUA || (isTouchDevice && isNarrowViewport) || hasLowMemory || isSimulatorSize;
  const tier: Tier = isMobile ? "mobileLow" : "desktopHigh";


  return {
    tier,
    isMobile,
    isMobileUA,
    isIOS,
    isTouch: isTouchDevice,
    
    dynamicShadows: false,
    ssr: false,
    ssgi: false,
    ao: false,
    bloom: false,
    antialiasing: false,
    anisotropy: 2,
    maxTextureSize: 1024,
    pixelRatio: 1.0,
    powerPreference: 'low-power' as const,
    
    useLogDepth: false,
    originRebase: false,
  };
})();