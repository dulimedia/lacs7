export const RENDER_FLAGS = {
    ENABLE_POSTPROCESSING: false,   // bloom/composer etc - DISABLED for stabilization
    ENABLE_BLOOM: false,            // explicitly bloom - DISABLED
    OPAQUE_CANVAS: true,            // critical: canvas alpha off to prevent flashes/leaks
    CLEAR_COLOR: 0x0b0f14,          // darker background color to match site theme
    CLEAR_ALPHA: 1.0,               // 1 = opaque
};
