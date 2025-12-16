import { pickTier, type QualityTier } from './QualityTier';
import { MobileDiagnostics } from '../debug/mobileDiagnostics';

export type Tier = "mobileLow" | "desktopHigh";

export const PerfFlags = (() => {
  const userAgent = navigator.userAgent;
  // ENHANCED: More explicit mobile/tablet detection including all iPad variants
  const isMobileUA = /iPhone|iPad|iPod|Android|Mobile|Tablet|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Tablet|Android(?=.*Mobile)|Kindle|Silk/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
  const isFirefox = /Firefox|FxiOS/i.test(userAgent);
  const isFirefoxMobile = isFirefox && isMobileUA;
  const isSafariIOS = isIOS && isSafari;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isNarrowViewport = window.innerWidth < 768;
  const hasLowMemory = (navigator as any).deviceMemory ? (navigator as any).deviceMemory <= 4 : false;
  const isSimulatorSize = window.innerWidth < 600 || window.innerHeight < 600;

  // FIXED: Include tablets explicitly in mobile detection for GLB loading
  const isMobile = isMobileUA || isTablet || (isTouchDevice && isNarrowViewport) || hasLowMemory || isSimulatorSize;
  const tier: Tier = (isMobile || isIOS) ? "mobileLow" : "desktopHigh";

  MobileDiagnostics.log('perf', 'PerfFlags initialized', {
    isIOS,
    isTablet,
    isSafari,
    isSafariIOS,
    isFirefox,
    isFirefoxMobile,
    isMobile,
    tier,
    userAgent: userAgent.substring(0, 80),
    isTouchDevice,
    isNarrowViewport,
    hasLowMemory,
    isSimulatorSize,
  });

  const qualityTier: QualityTier = isMobile ? 'LOW' : pickTier();

  const isLow = qualityTier === 'LOW';
  const isBalanced = qualityTier === 'BALANCED';
  const isHigh = qualityTier === 'HIGH';

  return {
    tier,
    qualityTier,
    isMobile,
    isMobileUA,
    isTablet,
    isIOS,
    isSafari,
    isSafariIOS,
    isFirefox,
    isFirefoxMobile,
    isTouch: isTouchDevice,

    DPR_MAX: isLow ? 1.25 : isBalanced ? 1.3 : 1.5,
    pixelRatio: isLow ? 1.25 : isBalanced ? 1.3 : 1.5,

    // 🔥 Texture & shadow caps - no shadows at all on mobile
    maxTextureSize: isLow ? 1024 : 4096, // Reverted to 4K for stability
    MAX_TEXTURE_DIM: isLow ? 1024 : 4096,
    SHADOW_MAP_SIZE: isLow ? 1024 : 4096, // 4K for desktop
    SHADOWS_ENABLED: true,
    SHADOW_MAX_EXTENT: isLow ? 60 : isBalanced ? 80 : 80, // ULTRA-TIGHT: 80m extent for 50px/m resolution
    SHADOW_MARGIN: isLow ? 4 : isBalanced ? 5.5 : 6,
    SHADOW_BIAS: -0.0001, // Almost zero bias (CustomShadowMaterial handles acne)
    SHADOW_NORMAL_BIAS: 0.01, // Minimal normal bias for maximum accuracy

    // 🔥 Post FX flags - none on mobile
    dynamicShadows: !isLow && isHigh,
    ssr: false,
    ssgi: !isLow && isHigh,
    ao: !isLow && isHigh,
    bloom: !isLow && isHigh,

    // 🔥 Renderer knobs
    antialiasing: !isLow && !isMobile,
    anisotropy: isLow ? 1 : isBalanced ? 2 : 8,
    powerPreference: isMobile ? 'low-power' : 'high-performance',

    useLogDepth: false,
    originRebase: false,
    useDracoCompressed: false,

    USE_PROGRESSIVE_LOADING: false,
  };
})();
