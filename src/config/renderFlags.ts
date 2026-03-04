export const RENDER_FLAGS = {
    ENABLE_POSTPROCESSING: false,   // bloom/composer etc - DISABLED for stabilization
    ENABLE_BLOOM: false,            // explicitly bloom - DISABLED
    OPAQUE_CANVAS: true,            // critical: canvas alpha off to prevent flashes/leaks
    CLEAR_COLOR: 0xd0e0f0,          // light sky color — matches fog, prevents dark flash on unit swap
    CLEAR_ALPHA: 1.0,               // 1 = opaque
};
