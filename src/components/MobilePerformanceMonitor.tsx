import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerfFlags } from '../perf/PerfFlags';

interface MemoryInfo {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
}

export function MobilePerformanceMonitor() {
  const { gl } = useThree();

  useEffect(() => {
    if (!PerfFlags.isMobile) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 60;
    
    // Track FPS
    const trackFPS = () => {
      const now = performance.now();
      frameCount++;
      
      if (now - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;
      }
      
      requestAnimationFrame(trackFPS);
    };
    
    requestAnimationFrame(trackFPS);

    const logPerformance = () => {
      const info = gl.info;
      const memory = info.memory;
      const render = info.render;
      
      // Enhanced memory tracking
      const performanceObj = performance as PerformanceWithMemory;
      const jsMemory = performanceObj.memory;
      
      // Device memory (if available)
      const deviceMemory = (navigator as any).deviceMemory;
      
      // Calculate memory usage percentages
      const jsUsedMB = jsMemory ? Math.round(jsMemory.usedJSHeapSize / 1024 / 1024) : 0;
      const jsTotalMB = jsMemory ? Math.round(jsMemory.totalJSHeapSize / 1024 / 1024) : 0;
      const jsLimitMB = jsMemory ? Math.round(jsMemory.jsHeapSizeLimit / 1024 / 1024) : 0;
      const jsUsagePercent = jsMemory ? Math.round((jsMemory.usedJSHeapSize / jsMemory.jsHeapSizeLimit) * 100) : 0;
      
      const performanceStats = {
        // WebGL Stats
        webgl: {
          geometries: memory.geometries,
          textures: memory.textures,
          calls: render.calls,
          triangles: render.triangles,
          points: render.points,
          lines: render.lines
        },
        // Performance Stats
        performance: {
          fps: fps,
          frameTime: Math.round(1000 / fps * 100) / 100
        },
        // Memory Stats
        memory: {
          jsUsedMB,
          jsTotalMB,
          jsLimitMB,
          jsUsagePercent,
          deviceMemoryGB: deviceMemory || 'unknown'
        }
      };
      
      
      // Enhanced memory pressure detection
      const isMemoryPressure = jsUsagePercent > 80;
      const isLowMemoryDevice = deviceMemory && deviceMemory <= 2;
      const isHighGeometryCount = memory.geometries > 1000;
      const isHighTextureCount = memory.textures > 50;
      const isHighTriangleCount = render.triangles > 300000; // Lowered for mobile
      const isLowFPS = fps < 20;
      
      // Memory warnings
      if (isMemoryPressure) {
        window.dispatchEvent(new CustomEvent('mobile-memory-warning', {
          detail: {
            type: 'js-memory-high',
            usage: jsUsagePercent,
            usedMB: jsUsedMB,
            limitMB: jsLimitMB
          }
        }));
      }
      
      
      
      
      
      if (isLowFPS) {
        window.dispatchEvent(new CustomEvent('mobile-performance-warning', {
          detail: {
            type: 'low-fps',
            fps: fps,
            triangles: render.triangles,
            textures: memory.textures
          }
        }));
      }
      
      // Temporarily disable context loss detection to test flash fix
      // const ctx = gl.getContext();
      // if (ctx.isContextLost()) {
      //   window.dispatchEvent(new CustomEvent('mobile-webgl-context-lost'));
      // }
      
    };

    // Log on mount and every 5 seconds (more frequent for mobile)
    logPerformance();
    const interval = setInterval(logPerformance, 5000);

    return () => clearInterval(interval);
  }, [gl]);

  return null;
}
