import * as THREE from 'three';
import { RendererConfig, getCurrentShadowConfig } from '../../config/RendererConfig';

/**
 * Applies tiered shadow configuration to a DirectionalLight.
 * Steals the "shadow discipline" pattern: strict budgets, no ad-hoc settings.
 */
export function configureDirectionalShadows(
    light: THREE.DirectionalLight,
    renderer?: THREE.WebGLRenderer
): void {
    const shadowConfig = getCurrentShadowConfig();

    // 1. Enable/Disable
    if (shadowConfig.castShadows && RendererConfig.shadows.enabled) {
        light.castShadow = true;
    } else {
        light.castShadow = false;
        return; // Done if shadows disabled
    }

    // 2. Map Size Budget
    const mapSize = shadowConfig.mapSize;
    light.shadow.mapSize.set(mapSize, mapSize);

    // 3. Bias & Contact Hardening - Mobile needs higher bias values
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        // Higher bias values for mobile to prevent shadow acne
        light.shadow.bias = -0.001; // More aggressive bias for mobile
        light.shadow.normalBias = 0.04; // 2x higher normalBias for mobile GPUs
    } else {
        light.shadow.bias = RendererConfig.shadows.bias;
        light.shadow.normalBias = RendererConfig.shadows.normalBias;
    }

    // Radius - irrelevant for standard PCF, but good to reset
    light.shadow.radius = 1;

    // 4. Frustum / Camera (The "Extent" budget)
    // We keep the camera logic here or let Lighting.tsx handle position/frustum?
    // Ideally, basic params here. `Lighting.tsx` might tweak bounds if dynamic.
    const extent = RendererConfig.shadows.maxExtent;
    const cam = light.shadow.camera;
    cam.left = -extent;
    cam.right = extent;
    cam.top = extent;
    cam.bottom = -extent;
    // Tighter frustum for mobile to improve precision
    if (isMobile) {
        cam.near = 1.0;
        cam.far = 150; // Much tighter for mobile precision
    } else {
        cam.near = 1.0;
        cam.far = 250; // Desktop can handle larger frustum
    }

    cam.updateProjectionMatrix();

    // 5. Global Renderer Shadow Map Settings (One-time setup helper)
    // 5. Global Renderer Shadow Map Settings (One-time setup helper)
    if (renderer) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use Soft shadows as requested
        // renderer.shadowMap.autoUpdate = true; // Default
    }
}
