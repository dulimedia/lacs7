import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as THREE from 'three';
// assetUrl removed as it is no longer used for Draco path

// Feature flags - can be toggled via local storage or environment
const ENABLE_KTX2 = true; // Enabled by default for upgraded pipeline
const ENABLE_DRACO = true;
const ENABLE_MESHOPT = true;
/**
 * Configures an existing GLTFLoader instance with KTX2, Draco, and Meshopt support.
 */
export function configureGLTFLoader(loader: GLTFLoader, renderer?: THREE.WebGLRenderer): void {
    // Setup Draco
    if (ENABLE_DRACO) {
        const dracoLoader = new DRACOLoader();
        // Use Google CDN for reliable decoder loading (fixes 404s on subpaths)
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.setDecoderConfig({ type: 'js' }); // Use JS decoder for broader compatibility
        loader.setDRACOLoader(dracoLoader);
    }

    // Setup KTX2
    if (ENABLE_KTX2 && renderer) {
        const ktx2Loader = new KTX2Loader();
        ktx2Loader.setTranscoderPath('/basis/');
        ktx2Loader.detectSupport(renderer);
        loader.setKTX2Loader(ktx2Loader);
    }

    // Setup Meshopt
    if (ENABLE_MESHOPT) {
        loader.setMeshoptDecoder(MeshoptDecoder);
    }
}

/**
 * Creates a configured GLTFLoader with optional compression support.
 * @param renderer - Required for KTX2 texture detection
 */
export function createGLTFLoader(renderer?: THREE.WebGLRenderer): GLTFLoader {
    const loader = new GLTFLoader();
    configureGLTFLoader(loader, renderer);
    return loader;
}
