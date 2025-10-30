import * as THREE from 'three';
import { PerfFlags } from '../perf/PerfFlags';

export interface GovernorStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
}

export class PerformanceGovernor {
  private renderer: THREE.WebGLRenderer;
  private enabled: boolean;
  private frameCount = 0;
  private lastCheckTime = performance.now();
  private fpsHistory: number[] = [];
  private readonly FPS_THRESHOLD = 50;
  private readonly DRAW_CALL_LIMIT = 250;
  private readonly TRIANGLE_BUDGET = 500000;
  
  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.enabled = PerfFlags.isMobileUA;
    
    if (this.enabled) {
      console.log('🛡️ Performance Governor activated (mobile mode)');
    }
  }

  public update(deltaTime: number) {
    if (!this.enabled) return;
    
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastCheckTime;
    
    if (elapsed >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / elapsed);
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 10) {
        this.fpsHistory.shift();
      }
      
      this.frameCount = 0;
      this.lastCheckTime = now;
      
      this.checkBudgets(fps);
    }
  }

  private checkBudgets(fps: number) {
    const info = this.renderer.info.render;
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    
    if (info.calls > this.DRAW_CALL_LIMIT) {
      console.warn(`⚠️ Draw calls exceeded budget: ${info.calls} > ${this.DRAW_CALL_LIMIT}`);
      window.dispatchEvent(new CustomEvent('perf/dropLevel', { 
        detail: { drawCalls: info.calls, limit: this.DRAW_CALL_LIMIT }
      }));
    }
    
    if (info.triangles > this.TRIANGLE_BUDGET) {
      console.warn(`⚠️ Triangle count exceeded budget: ${info.triangles.toLocaleString()} > ${this.TRIANGLE_BUDGET.toLocaleString()}`);
      window.dispatchEvent(new CustomEvent('perf/dropLevel', { 
        detail: { triangles: info.triangles, limit: this.TRIANGLE_BUDGET }
      }));
    }
    
    if (avgFps < this.FPS_THRESHOLD && this.fpsHistory.length >= 5) {
      console.warn(`⚠️ FPS below threshold: ${avgFps.toFixed(1)} < ${this.FPS_THRESHOLD}`);
      window.dispatchEvent(new CustomEvent('perf/lowFps', { 
        detail: { fps: avgFps, threshold: this.FPS_THRESHOLD }
      }));
    }
  }

  public getStats(): GovernorStats {
    const info = this.renderer.info.render;
    const avgFps = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length 
      : 0;
    
    return {
      fps: Math.round(avgFps),
      frameTime: avgFps > 0 ? 1000 / avgFps : 0,
      drawCalls: info.calls,
      triangles: info.triangles,
    };
  }

  public enable() {
    this.enabled = true;
    console.log('🛡️ Performance Governor enabled');
  }

  public disable() {
    this.enabled = false;
    console.log('🛡️ Performance Governor disabled');
  }
}

export function govern(renderer: THREE.WebGLRenderer, stats?: { fps: number }) {
  const info = renderer.info.render;
  
  if (info.calls > 250) {
    window.dispatchEvent(new CustomEvent('perf/dropLevel', {
      detail: { reason: 'drawCalls', value: info.calls }
    }));
  }
  
  if (stats && stats.fps < 50) {
    window.dispatchEvent(new CustomEvent('perf/lowFps', {
      detail: { fps: stats.fps }
    }));
  }
}
