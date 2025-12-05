// WebGL context recovery system for mobile devices
// Automatically recovers from context loss and reloads essential models

import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { ProgressiveLoader } from '../utils/progressiveLoader';
import { MobileMemoryManager } from '../utils/memoryManager';
import { PerfFlags } from '../perf/PerfFlags';

export const WebGLContextRecovery: React.FC = () => {
  const { gl, scene } = useThree();
  const contextLostCount = useRef(0);
  const isRecovering = useRef(false);

  useEffect(() => {
    if (!gl?.domElement) return;

    const canvas = gl.domElement;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLostCount.current++;
      isRecovering.current = true;
      
      console.error(`🚨🚨🚨 WEBGL CONTEXT LOST - THIS IS THE CRASH! 🚨🚨🚨`);
      console.error('Context loss event:', event);
      console.error('Canvas details:', canvas);
      console.error('Call stack at context loss:', new Error().stack);
      console.error(`🚨 WebGL context lost: ${event}`);
      console.error(`🚨 WebGL context lost! (${contextLostCount.current} times)`);
      
      // IMMEDIATE: Stop all rendering to prevent further errors
      try {
        if (scene) {
          scene.traverse((obj: any) => {
            if (obj.dispose) obj.dispose();
          });
        }
      } catch (e) {
        console.warn('Error during scene cleanup:', e);
      }
      
      // Immediate cleanup to help recovery
      const memoryManager = MobileMemoryManager.getInstance();
      memoryManager.aggressiveCleanup();
      
      // On mobile, unload non-essential models to prevent recurring context loss
      if (PerfFlags.isMobile) {
        const loader = ProgressiveLoader.getInstance();
        const unloadedPaths = loader.unloadOptionalModels();
        console.log(`🧹 Unloaded ${unloadedPaths.length} optional models to aid recovery`);
      }
      
      // Force page reload if context loss happens too frequently (prevents infinite crash loops)
      if (contextLostCount.current >= 3) {
        console.error('🚨 Too many context losses - forcing page reload to prevent crash loop');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    const handleContextRestored = () => {
      console.log('✅ WebGL context restored!');
      isRecovering.current = false;
      
      // Give the system time to stabilize before allowing new loads
      setTimeout(() => {
        console.log('🔄 WebGL recovery complete - system ready');
        
        // If we've lost context multiple times, stay in ultra-conservative mode
        if (contextLostCount.current >= 2) {
          console.warn('⚠️ Multiple context losses detected - staying in conservative mode');
          // Could emit an event here to update global settings
        }
      }, 2000);
    };

    const handleWebGLError = (event: Event) => {
      console.error('🚨 WebGL error detected:', event);
      
      // If we're getting WebGL errors, try to prevent context loss
      if (PerfFlags.isMobile) {
        const memoryManager = MobileMemoryManager.getInstance();
        memoryManager.aggressiveCleanup();
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    canvas.addEventListener('webglcontextcreationerror', handleWebGLError);

    // Monitor for context health
    const healthCheck = setInterval(() => {
      if (gl && gl.getError && !isRecovering.current) {
        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
          console.warn(`⚠️ WebGL error detected: ${error}`);
          
          // If errors are accumulating, do preventive cleanup
          if (PerfFlags.isMobile) {
            const memoryManager = MobileMemoryManager.getInstance();
            memoryManager.aggressiveCleanup();
          }
        }
      }
    }, 5000); // Check every 5 seconds

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      canvas.removeEventListener('webglcontextcreationerror', handleWebGLError);
      clearInterval(healthCheck);
    };
  }, [gl, scene]);

  // Component doesn't render anything - just provides context recovery
  return null;
};