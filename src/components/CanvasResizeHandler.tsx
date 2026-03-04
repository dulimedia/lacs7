import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerfFlags } from '../perf/PerfFlags';

export function CanvasResizeHandler() {
  const { camera, gl, invalidate, setSize } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    if (PerfFlags.isMobile) {
      console.log('✅ CanvasResizeHandler: canvas resolved', {
        tagName: canvas.tagName,
        isCanvas: canvas instanceof HTMLCanvasElement
      });
    }

    // Reliable dimension detection with fallbacks
    const getCanvasDimensions = () => {
      const sceneContainer = document.querySelector('.scene-shell') as HTMLElement;
      if (sceneContainer) {
        const rect = sceneContainer.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { width: rect.width, height: rect.height };
        }
      }

      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }

      // iOS Safari fallback
      if (window.visualViewport) {
        return { width: window.visualViewport.width, height: window.visualViewport.height };
      }

      return { width: window.innerWidth, height: window.innerHeight };
    };

    // Debounced resize handler for orientation changes on mobile.
    // Waits for CSS layout to settle before reading dimensions.
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);

      // Wait for CSS media queries and layout to settle
      const delay = PerfFlags.isMobile ? 300 : 100;
      resizeTimer = setTimeout(() => {
        const { width, height } = getCanvasDimensions();
        if (width > 0 && height > 0) {
          setSize(width, height);

          // Update camera aspect ratio
          if (camera && 'aspect' in camera) {
            const newAspect = width / height;
            (camera as any).aspect = newAspect;
            camera.updateProjectionMatrix();
          }

          invalidate();
        }
      }, delay);
    };

    // Listen for orientation changes specifically (more reliable than resize on mobile)
    const handleOrientationChange = () => {
      // Orientation changes need extra delay — screen dimensions aren't updated immediately
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        handleResize();
      }, PerfFlags.isMobile ? 500 : 200);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Also listen to visualViewport resize on mobile (more reliable on iOS)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [camera, gl, invalidate, setSize]);

  return null;
}
