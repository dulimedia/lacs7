import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

export function CanvasSizeProbe() {
  const { gl, size } = useThree();
  const lastLogRef = useRef<string>('');

  useEffect(() => {
    const canvas = gl.domElement;
    if (!canvas) return;

    const logSizes = (eventType: string) => {
      const rect = canvas.getBoundingClientRect();
      const r3fSize = size;
      const bufferSize = {
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight
      };

      const logData = {
        event: eventType,
        cssRect: { width: rect.width, height: rect.height },
        r3fSize: { width: r3fSize.width, height: r3fSize.height },
        bufferSize,
        timestamp: new Date().toISOString()
      };

      const logString = JSON.stringify(logData);
      
      // Only log if different from last log to prevent spam
      if (logString !== lastLogRef.current) {
        console.log('🔍 CANVAS SIZE PROBE:', logData);
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