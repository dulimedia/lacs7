import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

export function CanvasSizeProbe() {
  const { gl, size } = useThree();
  const lastLogRef = useRef<string>('');

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    // TEMPORARILY DISABLED TO STOP SPAM
    return;

    const logSizes = (eventType: string) => {
      const canvasRect = canvas.getBoundingClientRect();
      const r3fSize = size;
      const bufferSize = {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight
      };

      // CRITICAL: Log container vs canvas dimensions to detect aspect ratio lock
      const sceneShell = document.querySelector('.scene-shell');
      const appViewport = document.querySelector('.app-viewport');
      const canvasParent = canvas.parentElement;
      
      const containerRects = {
        sceneShell: sceneShell ? sceneShell.getBoundingClientRect() : null,
        appViewport: appViewport ? appViewport.getBoundingClientRect() : null,
        canvasParent: canvasParent ? canvasParent.getBoundingClientRect() : null
      };

      const logData = {
        event: eventType,
        canvasRect: { width: canvasRect.width, height: canvasRect.height },
        r3fSize: { width: r3fSize.width, height: r3fSize.height },
        bufferSize,
        containerRects,
        aspectRatioLockDetected: containerRects.sceneShell ? 
          (containerRects.sceneShell.height > canvasRect.height + 50) : false,
        heightDiff: containerRects.sceneShell ? 
          (containerRects.sceneShell.height - canvasRect.height) : 0,
        timestamp: new Date().toISOString()
      };

      const logString = JSON.stringify(logData);
      
      // Only log if different from last log to prevent spam
      if (logString !== lastLogRef.current) {
        console.log('🔍 CANVAS SIZE PROBE:', logData);
        if (logData.aspectRatioLockDetected) {
          console.warn(`⚠️ ASPECT RATIO LOCK DETECTED! Container height (${containerRects.sceneShell?.height}) > canvas height (${canvasRect.height}) by ${logData.heightDiff}px`);
        }
        lastLogRef.current = logString;
      }
    };

    // Log initial state
    logSizes('MOUNT');

    // Log on resize
    const resizeObserver = new ResizeObserver(() => {
      logSizes('RESIZE');
    });

    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [gl, size]);

  // Also log when R3F size changes
  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const bufferSize = {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight
    };

    const logData = {
      event: 'R3F_SIZE_CHANGE',
      cssRect: { width: rect.width, height: rect.height },
      r3fSize: { width: size.width, height: size.height },
      bufferSize,
      timestamp: new Date().toISOString()
    };

    const logString = JSON.stringify(logData);
    
    if (logString !== lastLogRef.current) {
      console.log('🔍 CANVAS SIZE PROBE:', logData);
      lastLogRef.current = logString;
    }
  }, [size.width, size.height, gl]);

  return null;
}