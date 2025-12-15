import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState, useRef, Component } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { detectTier, type Tier } from '../lib/graphics/tier';
import { AdaptivePerf } from './AdaptivePerf';
import { makeRenderer, type RendererType } from '../graphics/makeRenderer';
import { RendererInfo } from '../graphics/getRendererInfo';
import { MobilePerfScope } from '../perf/MobileGuard';
import { attachContextGuard } from '../perf/WebGLContextGuard';
import { installErrorProbe } from '../perf/ErrorProbe';
import { installDegradePolicy } from '../perf/FrameGovernor';
import { log, SAFE } from '../lib/debug';
import { MobileDiagnostics } from '../debug/mobileDiagnostics';
import { PerfFlags } from '../perf/PerfFlags';
import { MemoryProfiler } from '../debug/MemoryProfiler';

export type RootCanvasProps = Omit<CanvasProps, 'children' | 'gl' | 'dpr'> & {
  children: ReactNode | ((tier: Tier) => ReactNode);
  gl?: CanvasProps['gl'];
  onTierChange?: (tier: Tier) => void;
};

function Fallback({ reason }: { reason?: string }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#dc2626',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.2)',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
          🚨 3D Scene Crashed
        </h1>
        <p style={{ fontSize: '16px', marginBottom: '20px', lineHeight: '1.5' }}>
          The WebGL canvas failed to initialize or encountered a critical error.
        </p>
        {reason && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '12px',
            wordBreak: 'break-word',
            textAlign: 'left',
            maxHeight: '150px',
            overflow: 'auto'
          }}>
            {reason}
          </div>
        )}
        <button
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: 'white',
            color: '#dc2626',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onClick={() => location.reload()}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}

class CanvasErrorBoundary extends Component<any, { err?: any }> {
  state = { err: undefined };
  componentDidCatch(err: any, errorInfo: any) {
    this.setState({ err });
    console.error('🚨🚨🚨 CANVAS ERROR BOUNDARY TRIGGERED 🚨🚨🚨');
    console.error('Error:', err);
    console.error('Error message:', err?.message);
    console.error('Error stack:', err?.stack);
    console.error('Component stack:', errorInfo?.componentStack);
    log.err('CanvasErrorBoundary caught error', err);
    MobileDiagnostics.error('root-canvas', 'Canvas error boundary triggered', {
      message: String(err?.message || err),
      stack: err?.stack,
      componentStack: errorInfo?.componentStack
    });

    alert(`CANVAS CRASH: ${err?.message || err}`);
  }
  render() {
    return this.state.err ? <Fallback reason={String(this.state.err)} /> : this.props.children;
  }
}

function CanvasWatchdog({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        log.err('Watchdog: canvas never mounted in 12s');
        MobileDiagnostics.error('watchdog', 'Canvas failed to mount within 12s');
        setOk(false);
      } else {
        log.info('Watchdog: canvas detected successfully');
        MobileDiagnostics.layout('watchdog', canvas);
      }
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  if (!ok) return <Fallback reason="Canvas load timeout (12s watchdog)" />;
  return <>{children}</>;
}

export function RootCanvas({ children, gl: glProp, onTierChange, ...canvasProps }: RootCanvasProps) {
  const [tier, setTier] = useState<Tier | null>(null);
  const [rendererType, setRendererType] = useState<RendererType | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => installErrorProbe(), []);

  // MOBILE DEBUG: WebGL error monitoring for iOS Safari
  useEffect(() => {
    if (!PerfFlags.isMobile || !PerfFlags.isSafariIOS) return;

    let errorCheckInterval: number;
    let frameCount = 0;

    const checkWebGLErrors = () => {
      const canvas = document.querySelector('.scene-canvas');
      if (!canvas) return;
      
      // MOBILE FIX: Strict canvas validation to prevent getContext on non-canvas
      if (!(canvas instanceof HTMLCanvasElement)) {
        if (PerfFlags.isMobile && PerfFlags.isSafariIOS) {
          console.warn("[MOBILE] prevented getContext on non-canvas", { 
            type: typeof canvas, 
            tag: canvas?.tagName,
            className: (canvas as Element)?.className 
          });
        }
        return;
      }
      if (typeof canvas.getContext !== "function") {
        if (PerfFlags.isMobile && PerfFlags.isSafariIOS) {
          console.warn("[MOBILE] canvas missing getContext function", { 
            type: typeof canvas, 
            tag: canvas?.tagName 
          });
        }
        return;
      }

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return;

      const error = gl.getError();
      if (error !== gl.NO_ERROR) {
        console.error('🚨 iOS Safari WebGL Error:', {
          errorCode: error,
          errorName: getWebGLErrorName(error, gl),
          frameCount,
          rendererInfo: gl.getParameter(gl.RENDERER),
          timestamp: Date.now()
        });
      }

      // Log memory info periodically
      if (frameCount % 60 === 0) { // Every ~1 second at 60fps
        const info = (gl as any).getExtension('WEBGL_debug_renderer_info');
        console.log('📱 iOS Safari GPU Status:', {
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
          renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown',
          vendor: info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : 'unknown',
          frameCount
        });
      }

      frameCount++;
    };

    const getWebGLErrorName = (error: number, gl: WebGLRenderingContext) => {
      switch (error) {
        case gl.INVALID_ENUM: return 'INVALID_ENUM';
        case gl.INVALID_VALUE: return 'INVALID_VALUE';
        case gl.INVALID_OPERATION: return 'INVALID_OPERATION';
        case gl.INVALID_FRAMEBUFFER_OPERATION: return 'INVALID_FRAMEBUFFER_OPERATION';
        case gl.OUT_OF_MEMORY: return 'OUT_OF_MEMORY';
        case gl.CONTEXT_LOST_WEBGL: return 'CONTEXT_LOST_WEBGL';
        default: return `UNKNOWN_ERROR_${error}`;
      }
    };

    // Check for WebGL errors every 500ms on mobile to avoid performance impact
    errorCheckInterval = window.setInterval(checkWebGLErrors, 500);

    return () => {
      if (errorCheckInterval) clearInterval(errorCheckInterval);
    };
  }, []);

  // MOBILE DEBUG: Renderer capabilities logging
  const logRendererCapabilities = useCallback((renderer: THREE.WebGLRenderer) => {
    if (!PerfFlags.isMobile || !PerfFlags.isSafariIOS) return;

    console.log('📱 iOS Safari Renderer Capabilities:', {
      maxTextureSize: renderer.capabilities.maxTextureSize,
      maxTextures: renderer.capabilities.maxTextures,
      maxVertexTextures: renderer.capabilities.maxVertexTextures,
      maxCubemapSize: renderer.capabilities.maxCubemapSize,
      maxAttributes: renderer.capabilities.maxAttributes,
      maxSamples: renderer.capabilities.maxSamples,
      isWebGL2: renderer.capabilities.isWebGL2,
      precision: renderer.capabilities.precision,
      logarithmicDepthBuffer: renderer.capabilities.logarithmicDepthBuffer,
      floatFragmentTextures: renderer.capabilities.floatFragmentTextures,
      floatVertexTextures: renderer.capabilities.floatVertexTextures
    });

    // Monitor memory usage periodically
    setInterval(() => {
      console.log('📱 iOS Safari Memory:', renderer.info.memory);
    }, 5000);
  }, []);

  useEffect(() => {
    let cancelled = false;

    detectTier()
      .then((value) => {
        if (cancelled) return;
        setTier(value);
        onTierChange?.(value);
        MobileDiagnostics.log('tier', 'Tier detection resolved', { tier: value });
      })
      .catch(() => {
        if (cancelled) return;
        setTier('mobile-low');
        onTierChange?.('mobile-low');
        MobileDiagnostics.warn('tier', 'Tier detection failed, defaulting to mobile-low');
      });

    return () => {
      cancelled = true;
    };
  }, [onTierChange]);

  useEffect(() => {
    if (canvasRef.current) {
      return attachContextGuard(canvasRef.current);
    }
  }, []);

  const createRenderer = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!canvas) {
      log.err('Canvas element is null/undefined!');
      throw new Error('Canvas not ready');
    }

    log.info('Canvas element ready, creating renderer...');
    canvasRef.current = canvas;

    canvas.addEventListener('webglcontextlost', (e: Event) => {
      e.preventDefault();
      console.error('🚨🚨🚨 WEBGL CONTEXT LOST - THIS IS THE CRASH! 🚨🚨🚨');
      console.error('Context loss event:', e);
      console.error('Canvas details:', {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        style: canvas.style.cssText,
        timestamp: Date.now()
      });
      console.error('Call stack at context loss:', new Error().stack);
      log.warn('webglcontextlost event');
      MobileDiagnostics.warn('root-canvas', 'webglcontextlost');

      // Show user-friendly recovery instead of alert
      const recoverButton = document.createElement('div');
      recoverButton.innerHTML = `
        <div style="
          position: fixed; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px 30px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          text-align: center;
          z-index: 10000;
          font-family: system-ui;
        ">
          <h3 style="margin: 0 0 10px 0; color: #333;">3D Viewer Needs Recovery</h3>
          <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
            The 3D graphics encountered a memory issue.<br/>
            Click below to reload with optimized settings.
          </p>
          <button onclick="window.location.reload()" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            min-height: 44px;
            min-width: 120px;
          ">
            Reload App
          </button>
        </div>
      `;
      document.body.appendChild(recoverButton);
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
      console.warn('✅ WEBGL CONTEXT RESTORED');
      console.log('Attempting to recover from context loss...');
      log.info('webglcontextrestored event');
      MobileDiagnostics.log('root-canvas', 'webglcontextrestored');
    }, false);

    if (typeof glProp === 'function') {
      return (glProp as (canvas: HTMLCanvasElement) => unknown)(canvas);
    }

    if (glProp) {
      return glProp as unknown;
    }

    if (!tier) {
      throw new Error('Tier not detected yet');
    }

    try {
      const result = await makeRenderer(canvas, tier);
      setRendererType(result.type);
      MobileDiagnostics.log('renderer', 'Renderer created', {
        type: result.type,
        tier,
      });

      const caps = result.renderer.capabilities as any;
      log.info('Renderer created', {
        type: result.type,
        tier,
        isWebGL2: caps.isWebGL2 ?? false,
        maxTextures: caps.maxTextures,
        maxTextureSize: caps.maxTextureSize,
        SAFE,
      });

      installDegradePolicy({
        setShadows: (v) => result.renderer.shadowMap.enabled = v,
        setBloom: (v) => log.info('[DegradePolicy] Bloom:', v),
        setAO: (v) => log.info('[DegradePolicy] AO:', v),
        setSSR: (v) => log.info('[DegradePolicy] SSR:', v),
        setSSGI: (v) => log.info('[DegradePolicy] SSGI:', v),
        setMaxAnisotropy: (n) => log.info('[DegradePolicy] Max Anisotropy:', n),
      });

      // MOBILE DEBUG: Log renderer capabilities for iOS Safari
      logRendererCapabilities(result.renderer);

      return result.renderer;
    } catch (err) {
      log.err('Renderer creation failed', err);
      MobileDiagnostics.error('renderer', 'Renderer creation failed', { message: String(err) });
      throw err;
    }
  }, [glProp, tier]);

  const resolvedChildren = useMemo(() => {
    if (!tier) return null;
    if (rendererType) {
      console.log(`🎨 RootCanvas rendering with ${rendererType.toUpperCase()} (tier: ${tier})`);
      MobileDiagnostics.log('renderer', 'Rendering with renderer', { rendererType, tier });
    }
    return typeof children === 'function' ? (children as (value: Tier) => ReactNode)(tier) : children;
  }, [children, tier, rendererType]);

  if (!tier) {
    return null;
  }

  const isMobile = typeof window !== 'undefined' && matchMedia('(max-width:768px)').matches;
  MobileDiagnostics.log('root-canvas', 'Render props resolved', {
    tier,
    rendererType,
    isMobile,
    frameloop: SAFE || isMobile ? 'demand' : canvasProps.frameloop || 'always',
  });

  return (
    <CanvasErrorBoundary>
      <CanvasWatchdog>
        <Canvas
          {...canvasProps}
          className="scene-canvas"
          gl={createRenderer}
          dpr={[1, PerfFlags.DPR_MAX]}
          frameloop={SAFE || PerfFlags.isMobile ? 'demand' : canvasProps.frameloop || 'always'}
          performance={PerfFlags.isMobile ? { min: 0.25, max: 0.75, debounce: 200 } : { min: 0.5, max: 1, debounce: 40 }}
          shadows={SAFE ? false : PerfFlags.SHADOWS_ENABLED}
        >
          <MobilePerfScope />
          <AdaptivePerf tier={tier} />
          <RendererInfo />
          {/* MemoryProfiler disabled after successful optimization */}
          {/* <MemoryProfiler /> */}
          {resolvedChildren}
        </Canvas>
      </CanvasWatchdog>
    </CanvasErrorBoundary>
  );
}
