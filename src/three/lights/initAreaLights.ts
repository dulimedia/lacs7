import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RendererConfig } from '../../config/RendererConfig';

/**
 * Initializes RectAreaLight support globally.
 * Must be called once at app boot.
 */
export function initAreaLights() {
    if (RendererConfig.features.useRectAreaLight) {
        RectAreaLightUniformsLib.init();
        console.log('💡 RectAreaLight initialized (Desktop Only)');
    }
}
