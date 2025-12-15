// Memory management utilities for mobile Safari optimization
import * as THREE from 'three';
export class MobileMemoryManager {
  private static instance: MobileMemoryManager;
  private textureCache = new Map<string, THREE.Texture>();
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  private materialCache = new Map<string, THREE.Material>();
  private memoryCheckInterval: number | null = null;

  static getInstance(): MobileMemoryManager {
    if (!MobileMemoryManager.instance) {
      MobileMemoryManager.instance = new MobileMemoryManager();
    }
    return MobileMemoryManager.instance;
  }

  // Start memory monitoring for mobile devices
  startMemoryMonitoring() {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      this.memoryCheckInterval = window.setInterval(() => {
        this.checkMemoryUsage();
      }, 5000); // Check every 5 seconds
    }
  }

  // Stop memory monitoring
  stopMemoryMonitoring() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  // Check memory usage and clean up if necessary
  private checkMemoryUsage() {
    const perf = (window.performance as any);
    if (perf && perf.memory) {
      const memoryUsage = perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit;
      
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const aggressiveThreshold = isIOS ? 0.40 : 0.65; // Much more aggressive on iOS
      const gentleThreshold = isIOS ? 0.30 : 0.45; // Start cleanup earlier
      
      // If memory usage is above threshold, start aggressive cleanup
      if (memoryUsage > aggressiveThreshold) {
        console.warn(`High memory usage detected (${(memoryUsage * 100).toFixed(1)}%), cleaning up...`);
        this.aggressiveCleanup();
      }
      // If memory usage is above gentle threshold, do gentle cleanup
      else if (memoryUsage > gentleThreshold) {
        this.gentleCleanup();
      }
    }
  }

  // Gentle cleanup - remove unused cached resources
  private gentleCleanup() {
    // Clear texture cache if it gets too large
    if (this.textureCache.size > 10) {
      const entries = Array.from(this.textureCache.entries());
      // Remove oldest 50% of textures
      for (let i = 0; i < entries.length / 2; i++) {
        const [key, texture] = entries[i];
        texture.dispose();
        this.textureCache.delete(key);
      }
    }
  }

  // Aggressive cleanup - force garbage collection (now public for external access)
  aggressiveCleanup() {
    // Clear all caches
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
    
    this.geometryCache.forEach(geometry => geometry.dispose());
    this.geometryCache.clear();
    
    this.materialCache.forEach(material => material.dispose());
    this.materialCache.clear();

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  // Cache texture with very strict memory limit for mobile
  cacheTexture(key: string, texture: THREE.Texture) {
    const isMobile = /Mobi|Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
    const maxCacheSize = isMobile ? 5 : 20; // Much smaller cache on mobile
    
    if (this.textureCache.size < maxCacheSize) {
      this.textureCache.set(key, texture);
    } else {
      // If cache is full, dispose and replace oldest
      const oldestKey = this.textureCache.keys().next().value;
      const oldTexture = this.textureCache.get(oldestKey);
      if (oldTexture) {
        oldTexture.dispose();
        this.textureCache.delete(oldestKey);
      }
      this.textureCache.set(key, texture);
    }
  }

  // Get cached texture
  getCachedTexture(key: string): THREE.Texture | undefined {
    return this.textureCache.get(key);
  }

  // Dispose of all resources
  dispose() {
    this.stopMemoryMonitoring();
    this.aggressiveCleanup();
  }
}

// iOS Safari specific optimizations
export const iOSSafariOptimizations = {
  // Ultra-aggressive texture size reduction for mobile
  getOptimizedTextureSize: (originalSize: number): number => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMobile = /Mobi|Mobile|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS gets smallest possible textures
      return Math.max(64, Math.floor(originalSize * 0.125)); // 1/8 size
    } else if (isMobile) {
      // Android gets slightly larger but still very small
      return Math.max(128, Math.floor(originalSize * 0.25)); // 1/4 size
    }
    return originalSize;
  },

  // Setup WebGL context with iOS-specific settings
  setupWebGLContext: (canvas: HTMLCanvasElement) => {
    // MOBILE FIX: Strict canvas validation even with typed parameter
    if (!(canvas instanceof HTMLCanvasElement) || typeof canvas.getContext !== "function") {
      console.warn("[MOBILE] invalid canvas passed to setupWebGLContext", { 
        type: typeof canvas, 
        tag: canvas?.tagName 
      });
      return null;
    }

    const contextAttributes = {
      alpha: false,
      antialias: false,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference: 'low-power' as WebGLPowerPreference,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false
    };

    return canvas.getContext('webgl2', contextAttributes) || 
           canvas.getContext('webgl', contextAttributes) ||
           canvas.getContext('experimental-webgl', contextAttributes);
  },

  // Handle iOS Safari visibility changes to pause/resume rendering
  setupVisibilityHandler: (onVisibilityChange: (visible: boolean) => void) => {
    const handleVisibilityChange = () => {
      onVisibilityChange(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // iOS specific handlers
    window.addEventListener('pagehide', () => onVisibilityChange(false));
    window.addEventListener('pageshow', () => onVisibilityChange(true));

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', () => onVisibilityChange(false));
      window.removeEventListener('pageshow', () => onVisibilityChange(true));
    };
  }
};