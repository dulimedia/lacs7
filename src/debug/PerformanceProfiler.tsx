import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memoryUsed: number;
  memoryLimit: number;
  gpuEstimate: number;
  triangles: number;
  drawCalls: number;
  textures: number;
  geometries: number;
}

interface FeatureToggles {
  shadows: boolean;
  shadowResolution: 1024 | 2048 | 4096;
  bloom: boolean;
  geometrySimplification: number;
  textureQuality: 1024 | 2048 | 4096;
  anisotropy: 2 | 4 | 8;
  antialiasing: boolean;
}

export function PerformanceProfiler() {
  const [gl, setGl] = useState<THREE.WebGLRenderer | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (canvas && (canvas as any).__r3f) {
      const store = (canvas as any).__r3f;
      setGl(store.gl);
      setScene(store.scene);
    }
  }, []);
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    memoryUsed: 0,
    memoryLimit: 0,
    gpuEstimate: 0,
    triangles: 0,
    drawCalls: 0,
    textures: 0,
    geometries: 0,
  });
  
  const [showUI, setShowUI] = useState(false);
  const [features, setFeatures] = useState<FeatureToggles>({
    shadows: false,
    shadowResolution: 1024,
    bloom: false,
    geometrySimplification: 0.5,
    textureQuality: 1024,
    anisotropy: 2,
    antialiasing: false,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const fpsRef = useRef(0);
  const rafIdRef = useRef<number>();

  useEffect(() => {
    const updateFPS = () => {
      const now = performance.now();
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }
      
      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      fpsRef.current = 1000 / avgFrameTime;
      
      rafIdRef.current = requestAnimationFrame(updateFPS);
    };
    
    rafIdRef.current = requestAnimationFrame(updateFPS);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (!gl || !scene) return;
    
    const interval = setInterval(() => {
      const memory = (performance as any).memory;
      const info = gl.info;
      
      let triangles = 0;
      let gpuMemoryEstimate = 0;
      
      scene.traverse((obj: any) => {
        if (obj.isMesh && obj.geometry) {
          const geo = obj.geometry;
          if (geo.index) {
            triangles += geo.index.count / 3;
          } else if (geo.attributes.position) {
            triangles += geo.attributes.position.count / 3;
          }
          
          if (geo.attributes.position) {
            const vertexSize = geo.attributes.position.count * geo.attributes.position.itemSize * 4;
            gpuMemoryEstimate += vertexSize;
          }
          if (geo.index) {
            gpuMemoryEstimate += geo.index.count * 4;
          }
        }
        
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((mat: any) => {
            if (mat.map) {
              const tex = mat.map;
              const width = tex.image?.width || 1024;
              const height = tex.image?.height || 1024;
              gpuMemoryEstimate += width * height * 4;
            }
            if (mat.normalMap) gpuMemoryEstimate += (mat.normalMap.image?.width || 1024) * (mat.normalMap.image?.height || 1024) * 4;
            if (mat.roughnessMap) gpuMemoryEstimate += (mat.roughnessMap.image?.width || 1024) * (mat.roughnessMap.image?.height || 1024) * 4;
            if (mat.metalnessMap) gpuMemoryEstimate += (mat.metalnessMap.image?.width || 1024) * (mat.metalnessMap.image?.height || 1024) * 4;
          });
        }
      });

      setStats({
        fps: Math.round(fpsRef.current),
        frameTime: Math.round(1000 / fpsRef.current * 100) / 100,
        memoryUsed: memory ? Math.round(memory.usedJSHeapSize / 1048576) : 0,
        memoryLimit: memory ? Math.round(memory.jsHeapSizeLimit / 1048576) : 0,
        gpuEstimate: Math.round(gpuMemoryEstimate / 1048576),
        triangles: Math.round(triangles),
        drawCalls: info.render.calls,
        textures: info.memory.textures,
        geometries: info.memory.geometries,
      });
    }, 500);

    return () => clearInterval(interval);
  }, [gl, scene]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'p' && e.ctrlKey) {
        e.preventDefault();
        setShowUI(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const toggleFeature = (feature: keyof FeatureToggles, value?: any) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: value !== undefined ? value : !prev[feature]
    }));
  };

  const exportStats = () => {
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      features,
      device: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        pixelRatio: window.devicePixelRatio,
      }
    };
    console.log('📊 Performance Report:', report);
    localStorage.setItem('perfReport', JSON.stringify(report, null, 2));
  };

  if (!showUI) {
    return (
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        padding: '8px 12px',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 12,
        zIndex: 9999,
        cursor: 'pointer',
      }} onClick={() => setShowUI(true)}>
        {stats.fps} FPS | {stats.frameTime}ms | {stats.memoryUsed}MB
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.95)',
      color: '#0f0',
      padding: 16,
      borderRadius: 8,
      fontFamily: 'monospace',
      fontSize: 12,
      zIndex: 9999,
      minWidth: 320,
      maxHeight: '90vh',
      overflow: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#fff' }}>⚡ Performance Profiler</h3>
        <button onClick={() => setShowUI(false)} style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 16,
        }}>×</button>
      </div>

      <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #333' }}>
        <div style={{ color: '#fff', marginBottom: 8, fontWeight: 'bold' }}>Performance</div>
        <div>FPS: <span style={{ color: stats.fps >= 50 ? '#0f0' : stats.fps >= 30 ? '#ff0' : '#f00' }}>{stats.fps}</span></div>
        <div>Frame Time: {stats.frameTime}ms</div>
        <div>JS Memory: {stats.memoryUsed}MB / {stats.memoryLimit}MB ({Math.round(stats.memoryUsed/stats.memoryLimit*100)}%)</div>
        <div>GPU Est.: ~{stats.gpuEstimate}MB</div>
      </div>

      <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #333' }}>
        <div style={{ color: '#fff', marginBottom: 8, fontWeight: 'bold' }}>Scene Stats</div>
        <div>Triangles: {stats.triangles.toLocaleString()}</div>
        <div>Draw Calls: {stats.drawCalls}</div>
        <div>Textures: {stats.textures}</div>
        <div>Geometries: {stats.geometries}</div>
      </div>

      <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #333' }}>
        <div style={{ color: '#fff', marginBottom: 8, fontWeight: 'bold' }}>Feature Costs (Estimated)</div>
        <div style={{ fontSize: 11, color: '#999' }}>
          <div>• Shadows (1024): ~20-25% GPU, ~150MB</div>
          <div>• Shadows (4096): ~35-40% GPU, ~300MB</div>
          <div>• Bloom: ~10-15% GPU, ~80MB</div>
          <div>• AO (N8AO): ~15-20% GPU, ~100MB</div>
          <div>• Antialiasing: ~5-10% GPU</div>
          <div>• Normal Maps: ~5-8% GPU, ~200MB</div>
          <div>• Tex 4096 vs 1024: ~500MB VRAM</div>
        </div>
      </div>

      <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #333' }}>
        <div style={{ color: '#fff', marginBottom: 8, fontWeight: 'bold' }}>Feature Toggles (Coming Soon)</div>
        <div style={{ fontSize: 11, color: '#666' }}>
          Toggle shadows, bloom, etc. to test performance impact.
          Requires deeper integration with renderer/effects.
        </div>
      </div>

      <button onClick={exportStats} style={{
        width: '100%',
        padding: '8px 12px',
        background: '#0f0',
        color: '#000',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: 'bold',
      }}>
        Export Report to Console
      </button>
      
      <div style={{ marginTop: 8, fontSize: 10, color: '#666', textAlign: 'center' }}>
        Ctrl+P to toggle | Click stats to expand
      </div>
    </div>
  );
}
