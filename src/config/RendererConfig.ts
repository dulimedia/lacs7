import { PerfFlags } from '../perf/PerfFlags';

/**
 * Centralized configuration for the Three.js renderer and scene.
 * Steals the "config object" pattern from standard examples.
 */
export const RendererConfig = {
    // Feature Flags
    features: {
        useKTX2: true,
        useDraco: true,
        useMeshopt: true,
        usePMREM: true, // Environment map pre-filtering
        usePostProcessing: PerfFlags.tier === 'desktopHigh',
        useRectAreaLight: PerfFlags.tier === 'desktopHigh',
    },

    // Shadow Configuration (Tiered)
    shadows: {
        enabled: true, // Master switch
        type: 'pcf-soft', // Reverted to PCFSoft for stability (VSM crashed repeatedly)
        mapSize: PerfFlags.SHADOW_MAP_SIZE,
        bias: PerfFlags.SHADOW_BIAS,
        normalBias: PerfFlags.SHADOW_NORMAL_BIAS,
        maxExtent: PerfFlags.SHADOW_MAX_EXTENT,
        margin: PerfFlags.SHADOW_MARGIN,

        // Tier-specific overrides
        tiers: {
            mobileLow: {
                castShadows: false, // PHASE 1 FIX: Disable shadows on low-end mobile to prevent black roofs at distance
                mapSize: 1024,
                allowPointLights: false,
            },
            mobileHigh: {
                castShadows: true, // Keep shadows on higher-end mobile but with conservative settings
                mapSize: 1024, // PHASE 1 FIX: Reduced from 2048 to prevent shadow artifacts on roofs
                allowPointLights: false,
            },
            desktopHigh: {
                castShadows: true,
                mapSize: 4096, // Kept high for desktop
                allowPointLights: true,
            },
        }
    },

    // Texture & Material Settings
    materials: {
        anisotropy: PerfFlags.anisotropy,
        envMapIntensity: 0.5, // Balanced darkness (was 0.2)
    },

    // Debug / Dev flags
    debug: {
        showShadowCamera: false,
        logAssetLoading: false,
    }
};

// Helper to get current tier config easily
export const getCurrentShadowConfig = () => {
    const tier = (PerfFlags.qualityTier === 'LOW' ? 'mobileLow' :
        PerfFlags.qualityTier === 'BALANCED' ? 'mobileHigh' : 'desktopHigh') as keyof typeof RendererConfig.shadows.tiers;

    // Fallback to mobileHigh if tier mapping fails or doesn't exist (safety)
    return RendererConfig.shadows.tiers[tier] || RendererConfig.shadows.tiers.mobileHigh;
};
