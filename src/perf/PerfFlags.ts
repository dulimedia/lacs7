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
  const hasLowMemory = (navigator as any).deviceMemory ? (navigator as any).deviceMemory <= 4 : false;
  // Use input capabilities, not viewport size, to determine mobile.
  // A desktop browser resized small is NOT a phone.
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;

  const isMobile = isMobileUA || isTablet || (isTouchDevice && isCoarsePointer) || hasLowMemory;
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
    isCoarsePointer,
    hasLowMemory,
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

    DPR_MAX: isLow ? 1.5 : isBalanced ? 1.75 : 1.5, // PHASE 3 FIX: Increased DPR for better mobile clarity
    pixelRatio: isLow ? 1.5 : isBalanced ? 1.75 : 1.5, // PHASE 3 FIX: Improved mobile pixelRatio

    // 🔥 Texture & shadow caps - no shadows at all on mobile
    maxTextureSize: isLow ? 1024 : 4096, // Reverted to 4K for stability
    MAX_TEXTURE_DIM: isLow ? 1024 : 4096,
    SHADOW_MAP_SIZE: isLow ? 1024 : 4096, // 4K for desktop
    SHADOWS_ENABLED: true,
    SHADOW_MAX_EXTENT: isLow ? 60 : isBalanced ? 80 : 80, // ULTRA-TIGHT: 80m extent for 50px/m resolution
    SHADOW_MARGIN: isLow ? 4 : isBalanced ? 5.5 : 6,
    SHADOW_BIAS: -0.00005, // Tiny bias — normalBias does the real work
    SHADOW_NORMAL_BIAS: 0.02, // Consistent across all tiers

    // 🔥 Post FX flags - none on mobile
    dynamicShadows: !isLow && isHigh,
    ssr: false,
    ssgi: !isLow && isHigh,
    ao: !isLow && isHigh,
    bloom: !isLow && isHigh,

    // 🔥 Renderer knobs
    antialiasing: true, // PHASE 3 FIX: Enable antialiasing on all devices for better visual quality
    anisotropy: isLow ? 1 : isBalanced ? 2 : 8,
    powerPreference: isMobile ? 'low-power' : 'high-performance',

    useLogDepth: isMobile, // PHASE 2 FIX: Enable log depth on mobile to prevent Z-fighting on coplanar surfaces
    originRebase: false,
    useDracoCompressed: false,

    USE_PROGRESSIVE_LOADING: false,
  };
})();
