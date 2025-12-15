import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerfFlags } from '../perf/PerfFlags';

export function CanvasResizeHandler() {
  const { camera, size, gl, invalidate, setSize } = useThree();

  useEffect(() => {
    // Use R3F's gl.domElement instead of DOM queries to prevent getContext errors
    const canvas = gl.domElement;
    
    // Mobile-only log ONCE to confirm canvas resolved correctly
    if (PerfFlags.isMobile) {
      console.log('✅ iOS canvas resolved: CANVAS element confirmed', {
        tagName: canvas?.tagName,
        isCanvas: canvas instanceof HTMLCanvasElement
      });
    }

    // CRITICAL DEBUG: Monitor canvas size changes continuously
    if (canvas) {
      console.log('📐 INITIAL CANVAS SIZE:', {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight
      });

      // Monitor canvas size, but be less aggressive on mobile to prevent layout interference
      const monitorInterval = PerfFlags.isMobile ? 1000 : 100; // 1s on mobile, 100ms on desktop
      let zeroSizeCount = 0;
      
      // Helper function to get reliable canvas dimensions
      const getCanvasDimensions = () => {
        // Prefer getBoundingClientRect over clientWidth/clientHeight as per CODEX guidelines
        const rect = canvas.getBoundingClientRect();
        let width = rect.width;
        let height = rect.height;
        
        // Fallback to clientWidth/clientHeight if rect is empty
        if (width === 0 || height === 0) {
          width = canvas.clientWidth;
          height = canvas.clientHeight;
        }
        
        // iOS Safari fallback: use visualViewport when available and canvas dimensions are 0
        if ((width === 0 || height === 0) && typeof window !== 'undefined' && window.visualViewport) {
          const vp = window.visualViewport;
          console.log('📱 Using visualViewport fallback for iOS Safari');
          width = vp.width;
          height = vp.height;
        }
        
        return { width, height, rect };
      };
      
      const sizeMonitor = setInterval(() => {
        const { width, height, rect } = getCanvasDimensions();
        
        if (width === 0 || height === 0) {
          zeroSizeCount++;
          
          // Only log errors after multiple consecutive zero size detections
          // This prevents noise from normal layout transitions
          if (zeroSizeCount >= (PerfFlags.isMobile ? 3 : 5)) {
            console.error('🚨 PERSISTENT CANVAS SIZE ISSUE!', {
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              clientWidth: canvas.clientWidth,
              clientHeight: canvas.clientHeight,
              rectWidth: rect.width,
              rectHeight: rect.height,
              finalWidth: width,
              finalHeight: height,
              visualViewport: window.visualViewport ? {
                width: window.visualViewport.width,
                height: window.visualViewport.height,
                scale: window.visualViewport.scale
              } : null,
              style: canvas.style.cssText,
              parentStyle: canvas.parentElement?.style.cssText,
              zeroSizeCount,
              isMobile: PerfFlags.isMobile,
              timestamp: Date.now()
            });
            
            // Mobile Safari: Retry resize via proper R3F renderer path (no direct CSS manipulation)
            if (PerfFlags.isMobile && width > 0 && height > 0) {
              console.log('📱 iOS Safari: Scheduling renderer resize retry via R3F (no direct CSS)');
              
              // Schedule resize retry on next animation frame using R3F's setSize directly
              requestAnimationFrame(() => {
                const container = canvas.parentElement;
                if (container) {
                  const containerRect = container.getBoundingClientRect();
                  if (containerRect.width > 0 && containerRect.height > 0) {
                    console.log(`🔄 iOS Safari: R3F setSize retry to ${containerRect.width}x${containerRect.height}`);
                    
                    // Use R3F's setSize directly with proper DPR handling (no CSS manipulation)
                    setSize(containerRect.width, containerRect.height);
                    invalidate(); // Force a frame render
                  }
                }
              });
            }
            
            zeroSizeCount = 0; // Reset counter after logging
          }
        } else {
          zeroSizeCount = 0; // Reset counter when size is normal
        }
      }, monitorInterval);

      return () => clearInterval(sizeMonitor);
    }

    const handleTransitionEnd = (e: TransitionEvent) => {
      console.log('🖼️ CANVAS RESIZE HANDLER - transition end:', {
        property: e.propertyName,
        targetTag: (e.target as HTMLElement)?.tagName,
        targetClass: (e.target as HTMLElement)?.className,
        isSceneShell: e.target === sceneShell,
        timestamp: Date.now()
      });

      if (e.propertyName === 'transform' && e.target === sceneShell) {
        console.log('🎯 HANDLING SCENE SHELL TRANSFORM - POTENTIAL CRASH TRIGGER!');
        
        const container = sceneShell;
        // Use same reliable dimension detection as in monitor
        const rect = container.getBoundingClientRect();
        let width = rect.width;
        let height = rect.height;
        
        // Fallback to clientWidth/clientHeight if rect is empty
        if (width === 0 || height === 0) {
          width = container.clientWidth;
          height = container.clientHeight;
        }
        
        // iOS Safari fallback: use visualViewport when available
        if ((width === 0 || height === 0) && typeof window !== 'undefined' && window.visualViewport) {
          const vp = window.visualViewport;
          console.log('📱 Using visualViewport fallback for container sizing');
          width = vp.width;
          height = vp.height;
        }
        
        console.log('📐 Container dimensions:', { 
          width, 
          height,
          rectWidth: rect.width,
          rectHeight: rect.height,
          clientWidth: container.clientWidth,
          clientHeight: container.clientHeight 
        });
        
        if (width > 0 && height > 0 && camera && 'aspect' in camera) {
          const currentAspect = (camera as any).aspect;
          const newAspect = width / height;
          const aspectDiff = Math.abs(currentAspect - newAspect);
          
          console.log('📷 Camera aspect change:', { 
            current: currentAspect, 
            new: newAspect, 
            diff: aspectDiff,
            willUpdate: aspectDiff > 0.01
          });
          
          if (aspectDiff > 0.01) {
            try {
              console.log('🔄 UPDATING CAMERA PROJECTION MATRIX...');
              (camera as any).aspect = newAspect;
              camera.updateProjectionMatrix();
              console.log('✅ Camera projection matrix updated successfully');
            } catch (error) {
              console.error('❌ ERROR updating camera projection matrix:', error);
              // This could be the cause of the crash!
            }
          }
        } else {
          console.warn('⚠️ Invalid dimensions or camera for resize');
        }
      }
    };

    sceneShell.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      sceneShell.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, [camera]);

  return null;
}
