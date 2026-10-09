import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraControls } from '@react-three/drei';
import { detectDevice, getMobileOptimizedSettings } from './utils/deviceDetection';
import { MobileMemoryManager } from './utils/memoryManager';
import { PerfFlags } from './perf/PerfFlags';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { assetUrl } from './lib/assets';
import { SingleEnvironmentMesh } from './components/SingleEnvironmentMesh';
import Sidebar from './ui/Sidebar/Sidebar';
import { GLBManager } from './components/GLBManager';
import { FrustumCuller } from './components/FrustumCuller';
import { UnitRequestSidebar } from './components/UnitRequestSidebar';
import { ShareFloorplanModal } from './components/ShareFloorplanModal';
import { FloorplanPopup } from './components/FloorplanPopup';
import { UnitGlowHighlightFixed } from './components/UnitGlowHighlightFixed';
import { CanvasResizeHandler } from './components/CanvasResizeHandler';
import { HoverToast } from './ui/HoverToast';
import { SafariErrorBoundary } from './components/SafariErrorBoundary';
import { MobileErrorBoundary } from './components/MobileErrorBoundary';
import { SafariDebugBanner } from './components/SafariDebugBanner';
import { FloorplanContext } from './contexts/FloorplanContext';
// Performance-based lighting and effects
import { AdaptiveLighting } from './components/lighting/AdaptiveLighting';
import { SoftShadowsController } from './components/lighting/SoftShadowsController';
import { AdaptiveEffects } from './components/postprocessing/AdaptiveEffects';
import { MobileEnvironment } from './components/MobileEnvironment';
import { useFaceDebugHotkey } from './hooks/useFaceDebugHotkey';
import { useUnitStore } from './stores/useUnitStore';
import { useSidebarState } from './ui/Sidebar/useSidebarState';
import { useExploreState, buildUnitsIndex, type UnitRecord } from './store/exploreState';
import { useGLBState } from './store/glbState';
import { useCsvUnitData } from './hooks/useCsvUnitData';
import { emitEvent, getTimestamp } from './lib/events';
import { validateAllMaterials, setupRendererSafety } from './dev/MaterialValidator';
import { logger } from './utils/logger';
import { RootCanvas } from './ui/RootCanvas';
import type { Tier } from './lib/graphics/tier';
import { ErrorLogDisplay } from './components/ErrorLogDisplay';
import { PerformanceGovernorComponent } from './components/PerformanceGovernorComponent';
import { WebGLContextRecovery } from './components/WebGLContextRecovery';
import { log as debugLog, SAFE, Q } from './lib/debug';
import { MobileDiagnostics } from './debug/mobileDiagnostics';


// Component to capture scene and gl refs + setup safety
const SceneCapture = ({ sceneRef, glRef }: { sceneRef: React.RefObject<THREE.Scene>, glRef: React.RefObject<THREE.WebGLRenderer> }) => {
  const { gl, scene } = useThree();
  const setupComplete = useRef(false);
  const validationComplete = useRef(false);
  useFaceDebugHotkey();

  useEffect(() => {
    sceneRef.current = scene;
    glRef.current = gl;

    // Setup renderer safety once
    if (!setupComplete.current) {
      setupRendererSafety(gl);
      setupComplete.current = true;
    }
  }, [scene, gl, sceneRef, glRef]);

  // Run material validation after scene loads - ONCE per session to prevent degradation loops
  useEffect(() => {
    if (!validationComplete.current) {
      validationComplete.current = true;
      const timer = setTimeout(() => {
        validateAllMaterials(scene);
      }, 2000); // After models load

      return () => clearTimeout(timer);
    }
  }, [scene]);

  return null;
};


// Google Sheets CSV export URL - live data source
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSeevbF2MkJT1nwQWjtv69cGMSELhP8kO61aTI1BHT29rKNImpQXIqJ3NjdIfewPwYW1JKmZ1TKdVkU/pub?output=csv';

// Enhanced Camera controller with CameraControls for smooth navigation
const CameraController: React.FC<{
  selectedUnit: string | null;
  controlsRef: React.RefObject<any>;
}> = ({ controlsRef }) => {
  const { camera, size } = useThree();
  const isMobile = typeof window !== 'undefined' && matchMedia('(max-width:768px)').matches;

  useEffect(() => {
    camera.position.set(isMobile ? 9 : -10, isMobile ? 7 : 10, isMobile ? 9 : -14);
    camera.lookAt(0, 0, 0);
  }, [camera, isMobile]);

  useEffect(() => {
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
  }, [size.width, size.height, camera]);

  useEffect(() => {
    const checkControls = () => {
      if (controlsRef?.current) {
        return true;
      }
      return false;
    };

    if (!checkControls()) {
      const timeout = setTimeout(() => {
        checkControls();
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [controlsRef]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      target={[0, 0, 0]}
      minPolarAngle={0}
      maxPolarAngle={Math.PI * 0.48}
      minDistance={8}
      maxDistance={25}
      dollySpeed={isMobile ? 0.8 : 0.5}
      truckSpeed={isMobile ? 1.2 : 1}
      azimuthRotateSpeed={isMobile ? 0.35 : 0.15}
      polarRotateSpeed={isMobile ? 0.35 : 0.15}
      draggingSmoothTime={isMobile ? 0.25 : 0.4}
      smoothTime={isMobile ? 0.25 : 0.4}
      enablePan={true}
      touches={{
        one: 1,  // Single touch for orbit
        two: 2,  // Two-finger touch for dolly (zoom) and truck (pan)
        three: 0 // Three-finger disabled
      }}
    />
  );
};


function App() {
  const [canvasReady, setCanvasReady] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [scenePolicy] = useState(() => {
    const param = Q.get('scene');
    const enabled = param === '0' ? false : true;
    const reason = enabled ? null : 'forced-off';
    MobileDiagnostics.log('scene', 'Scene policy resolved', { param, enabled, reason, isMobile: PerfFlags.isMobile });
    return { enabled, reason, param };
  });

  // Deep link handling for unit selection
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);
  const { enabled: sceneEnabled, reason: sceneDisableReason, param: sceneParam } = scenePolicy;
  const { selectedUnit } = useUnitStore();

  useEffect(() => {
    debugLog.info('App mounted', { SAFE, isMobile: PerfFlags.isMobile, tier: PerfFlags.tier });
  }, []);
  const {
    drawerOpen, setDrawerOpen
  } = useExploreState();
  const { setCameraControlsRef } = useGLBState();
  const { floorPlanExpanded, setFloorPlanExpanded } = useSidebarState();


  // Debug logging for state changes

  const [modelsLoading, setModelsLoading] = useState(true);
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);


  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('initializing'); // Track loading phase
  const [effectsReady, setEffectsReady] = useState(false); // Delay post-processing effects
  const [renderTier, setRenderTier] = useState<Tier>(PerfFlags.tier === 'mobileLow' ? 'mobile-low' : 'desktop-high');
  const debugState = {
    tier: renderTier,
    ao: true,
    ssr: true,
    ssgi: false,
    composerScale: 1.0,
    shadowBias: -0.0005,
    shadowNormalBias: 0.05,
    polygonOffsetEnabled: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
    polygonOffsetRegex: 'slat|louver|mullion|trim|glass|window|panel',
  };

  // Refs to store Three.js instances for shadow settings callback
  const sceneRef = useRef<THREE.Scene | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const [showFloorplanPopup, setShowFloorplanPopup] = useState(false);
  const [floorplanPopupData, setFloorplanPopupData] = useState<{
    floorplanUrl: string;
    unitName: string;
    unitData?: any;
  } | null>(null);

  // Camera controls ref for navigation
  const orbitControlsRef = useRef<CameraControls>(null);

  // DISABLED: Preload loop was causing React hook violations and crashes
  // Calling useGLTF.preload() 10 times in a loop triggered Suspense issues
  // Will implement sequential lazy loading after Canvas mounts
  useEffect(() => {
    const isMobile = PerfFlags.isMobile;
    if (isMobile) {
      console.log('📦 GLB preload disabled for mobile - will load lazily');
    }
  }, []);

  // Add global error handler for mobile crashes with visible overlay
  useEffect(() => {
    const isMobile = PerfFlags.isMobile;

    const errorHandler = (event: ErrorEvent) => {
      const msg = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      console.error('🚨 GLOBAL ERROR:', event.error);
      console.error('🚨 Message:', event.message);
      console.error('🚨 Filename:', event.filename);
      console.error('🚨 Line:', event.lineno, 'Col:', event.colno);
      setErrorLog(prev => [...prev, msg]);
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const msg = `Promise rejected: ${event.reason}`;
      console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason);
      setErrorLog(prev => [...prev, msg]);
    };

    if (isMobile) {
      console.log('📱 MOBILE DEVICE DETECTED - Enhanced logging enabled');
      console.log('📱 Device info:', {
        isIOS: PerfFlags.isIOS,
        userAgent: navigator.userAgent,
        memory: (navigator as any).deviceMemory || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        maxTouchPoints: navigator.maxTouchPoints || 'unknown'
      });
    }

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  // CRITICAL FIX: Delay Canvas mount by 3000ms to let page load settle (iOS requires this)
  useEffect(() => {
    const delay = PerfFlags.isIOS ? 3000 : 500; // 3 seconds for iOS to fully settle
    console.log('🚀 Canvas delay:', delay + 'ms', 'iOS:', PerfFlags.isIOS);

    const timer = setTimeout(() => {
      console.log('✅ Canvas ready - mounting WebGL');
      setCanvasReady(true);
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  // Mobile device detection and optimization settings
  const deviceCapabilities = useMemo(() => {
    const caps = detectDevice();
    return caps;
  }, []);

  // Force shadow initialization on app start - moved after deviceCapabilities definition
  useEffect(() => {
    // Ensure shadows are properly initialized when app starts - ALWAYS enable for all devices
    // Shadow settings are now handled by SimpleShadowDebug component directly
  }, []);
  const mobileSettings = useMemo(() => getMobileOptimizedSettings(deviceCapabilities), [deviceCapabilities]);

  useEffect(() => {
    if (!sceneEnabled) {
      MobileDiagnostics.warn('scene', '3D scene disabled', {
        reason: sceneDisableReason,
        param: sceneParam,
        isMobile: PerfFlags.isMobile,
      });
    }
  }, [sceneEnabled, sceneDisableReason, sceneParam]);

  // Shadow-enabled renderer configuration (iOS-optimized)
  const glConfig = useMemo(() => {
    const config: any = {
      powerPreference: PerfFlags.isIOS ? "low-power" : "high-performance",
      antialias: false,
      alpha: false,
      logarithmicDepthBuffer: true,
      preserveDrawingBuffer: true, // FIXED: Prevents white flashing on context loss/frame miss
      stencil: false,
      depth: true,
      premultipliedAlpha: false,
      failIfMajorPerformanceCaveat: false,
    };

    // Always use highp — mediump wrecks depth math and shadow stability
    config.precision = "highp";

    return config;
  }, []);

  // Initialize memory manager for mobile devices
  useEffect(() => {
    if (deviceCapabilities.isMobile) {
      const memoryManager = MobileMemoryManager.getInstance();
      memoryManager.startMemoryMonitoring();

      // Add iOS low memory warning handler
      if (deviceCapabilities.isIOS) {
        const handleLowMemory = () => {
          console.error('🚨 iOS LOW MEMORY WARNING - Running cleanup (NO AUTO-RELOAD)');
          memoryManager.aggressiveCleanup();
          // REMOVED: window.location.reload() - Was causing infinite crash loop
          // Let user manually reload if needed
          alert('Low memory detected. Please close other apps or reload manually.');
        };

        // Listen for low memory events (iOS specific)
        window.addEventListener('memorywarning', handleLowMemory);

        return () => {
          memoryManager.stopMemoryMonitoring();
          window.removeEventListener('memorywarning', handleLowMemory);
        };
      }

      return () => {
        memoryManager.stopMemoryMonitoring();
      };
    }
  }, [deviceCapabilities.isMobile, deviceCapabilities.isIOS]);

  // Optimized camera controls initialization with faster polling and shorter timeout
  useEffect(() => {
    setCameraControlsRef(orbitControlsRef);

    let hasLogged = false;
    let timeoutId: NodeJS.Timeout;

    // Set initial target position when controls are ready
    const setupInitialTarget = () => {
      if (orbitControlsRef.current && orbitControlsRef.current.target && typeof orbitControlsRef.current.target.set === 'function') {
        if (!hasLogged) {
          hasLogged = true;
        }
        orbitControlsRef.current.target.set(0, 0, 0);
        orbitControlsRef.current.update();
        return true;
      }
      return false;
    };

    // Try immediate setup (camera controls should work regardless of HDRI load status)
    if (!setupInitialTarget()) {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max (increased for mobile)

      const interval = setInterval(() => {
        attempts++;
        if (setupInitialTarget()) {
          clearInterval(interval);
          clearTimeout(timeoutId);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          // Don't block the app - just set fallback target
          if (orbitControlsRef.current) {
            try {
              orbitControlsRef.current.target.set(0, 0, 0);
              orbitControlsRef.current.update();
            } catch (e) {
            }
          }
        }
      }, 100);

      // Alternative: try using requestAnimationFrame for faster checking
      const trySetupRAF = () => {
        if (!setupInitialTarget() && attempts < maxAttempts) {
          requestAnimationFrame(trySetupRAF);
        }
      };
      requestAnimationFrame(trySetupRAF);

      return () => {
        clearInterval(interval);
        clearTimeout(timeoutId);
      };
    }
  }, [setCameraControlsRef]);

  // Use new CSV-based data fetching
  const { data: csvUnitData, loading: isUnitDataLoading, error } = useCsvUnitData(CSV_URL);


  // ENHANCED: Deep link handling for both ?unit= and ?sel= parameters
  useEffect(() => {
    if (!deepLinkHandled && csvUnitData && Object.keys(csvUnitData).length > 0 && !isUnitDataLoading) {
      // Support both ?unit= and ?sel= parameters - use dynamic URLSearchParams
      const urlParams = new URLSearchParams(window.location.search);
      const selectedUnitParam = urlParams.get('unit') || urlParams.get('sel');

      if (selectedUnitParam) {
        console.log('🔗 Processing deep link for unit:', selectedUnitParam);

        // Find unit in CSV data
        const unitKey = selectedUnitParam.toLowerCase();
        const unitData = csvUnitData[unitKey];

        if (unitData) {
          console.log('✅ Deep link unit found, triggering proper sidebar selection:', unitData);

          // FIXED: Use exploreState.setSelected for proper sidebar integration
          // This triggers: sidebar expand → scroll to unit → highlight → 3D glow → full details
          const exploreSetSelected = useExploreState.getState().setSelected;
          exploreSetSelected(selectedUnitParam);
          setDrawerOpen(true);
          // REMOVED: setUnitDetailsOpen(true) - This was causing the unwanted popup modal

          // Clean URL after successful selection (optional)
          setTimeout(() => {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('unit');
            cleanUrl.searchParams.delete('sel');
            window.history.replaceState({}, '', cleanUrl.toString());
            setDeepLinkHandled(true);
          }, 1500);
        } else {
          console.warn('⚠️ Deep link unit not found in CSV:', selectedUnitParam);
          setDeepLinkHandled(true);
        }
      } else {
        setDeepLinkHandled(true);
      }
    }
  }, [csvUnitData, isUnitDataLoading, deepLinkHandled, setDrawerOpen]);

  // Initialize viewer and emit ready event when models are loaded
  useEffect(() => {
    if (!modelsLoading) {
      emitEvent('evt.viewer.ready', {
        ts: getTimestamp(),
        assets: {
          env: 'warehouse',
          overlays: 'units'
        }
      });
    }
  }, [modelsLoading]);

  // Aggressive fallback for mobile Safari - if loading takes too long, bail out
  useEffect(() => {
    const timeout = deviceCapabilities.isMobile ? 8000 : 10000; // Faster timeout
    const fallbackTimer = setTimeout(() => {
      if (loadingPhase !== 'complete') {
        setLoadingProgress(100);
        setLoadingPhase('complete');
        setEffectsReady(true);
        setTimeout(() => {
          setModelsLoading(false);
          setInitialLoadCompleted(true);
          console.log('✅ Initial load completed - loading screen disabled permanently');
        }, 300);
      }
    }, timeout);

    return () => clearTimeout(fallbackTimer);
  }, [deviceCapabilities, loadingPhase]);

  // Mobile memory monitoring and WebGL context loss handling
  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;

    let memoryCheckInterval: NodeJS.Timeout | null = null;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      logger.warn('WebGL context lost - cleaning up for recovery', event);

      // Clear all GLB objects to free memory
      const glbState = useGLBState.getState();
      glbState.clearSelection();

      // Force garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }
    };

    // Mobile memory monitoring
    if (deviceCapabilities.isMobile) {
      let lastMemoryWarning = 0;

      memoryCheckInterval = setInterval(() => {
        // Check memory usage if available
        if ('memory' in performance && (performance as any).memory) {
          const memory = (performance as any).memory;
          const usedMB = memory.usedJSHeapSize / (1024 * 1024);
          const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
          const usagePercent = (usedMB / limitMB) * 100;

          // Aggressive cleanup when memory usage is high
          if (usagePercent > 70 && Date.now() - lastMemoryWarning > 5000) {
            console.warn(`📱 High memory usage: ${usedMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
            lastMemoryWarning = Date.now();

            // Trigger aggressive cleanup
            const glbState = useGLBState.getState();
            glbState.clearSelection();

            // Clear selections through explore state instead
            const exploreState = useExploreState.getState();
            if (exploreState.setSelected) {
              exploreState.setSelected(null);
            }

            // Force garbage collection
            if ('gc' in window && typeof (window as any).gc === 'function') {
              (window as any).gc();
            }
          }
        }
      }, 2000); // Check every 2 seconds on mobile
    }

    canvas.addEventListener('webglcontextlost', handleContextLost);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
      }
    };
  }, [deviceCapabilities.isMobile]);

  // DISABLED: Context health monitor was causing "Canvas has existing context" error
  // The webglcontextlost/restored event handlers above are sufficient
  // useEffect(() => {
  //   // Context health check disabled - was conflicting with R3F
  // }, [canvasReady, sceneEnabled, selectedUnitKey]);

  // Handle window resize for proper canvas resizing
  useEffect(() => {
    const handleResize = () => {
      // Force canvas to recalculate size
      if (orbitControlsRef.current) {
        orbitControlsRef.current.update();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add class to body for CSS-based sidebar transitions
  useEffect(() => {
    if (deviceCapabilities.isMobile) return;

    document.body.classList.toggle('sidebar-desktop-open', drawerOpen);

    return () => {
      document.body.classList.remove('sidebar-desktop-open');
    };
  }, [drawerOpen, deviceCapabilities.isMobile]);

  useEffect(() => {
    if (!drawerOpen && floorPlanExpanded) {
      setFloorPlanExpanded(false);
    }
  }, [drawerOpen, floorPlanExpanded, setFloorPlanExpanded]);

  // Handle smooth transitions when sidebar width changes (floorplan expand/collapse)
  useEffect(() => {
    console.log('🔄 Floorplan expanded state changed:', floorPlanExpanded);

    if (floorPlanExpanded) {
      console.log('✅ Adding floorplan-expanded class');
      document.body.classList.add('floorplan-expanded');
    } else {
      console.log('❌ Removing floorplan-expanded class');
      document.body.classList.remove('floorplan-expanded');
    }
  }, [floorPlanExpanded]);

  // Adjust camera when sidebar/drawer opens or closes
  useEffect(() => {
    if (!orbitControlsRef.current) return;

    // Small delay to let the transition start
    const timer = setTimeout(() => {
      if (orbitControlsRef.current) {
        orbitControlsRef.current.update();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [drawerOpen, deviceCapabilities.isMobile]);

  // Use CSV data if available, otherwise fallback data
  const hasValidUnitData = csvUnitData && Object.keys(csvUnitData).length > 0;
  const effectiveUnitData = useMemo(() => {
    // Performance: removed debug logging
    return hasValidUnitData ? csvUnitData : {};
  }, [hasValidUnitData, csvUnitData]);

  // REMOVED: This was causing the mini popup issue
  // The proper deep link handling is done below using exploreState.setSelected

  // Log unit data for debugging
  useEffect(() => {
    // Performance: debug logging removed

    if (error) {
      console.warn('[CSV] Failed to load unit data:', error);
    }
  }, [csvUnitData, hasValidUnitData, effectiveUnitData, error]);

  // Get explore state actions
  const { setUnitsData, setUnitsIndex } = useExploreState();

  // Integrate CSV data into explore state
  useEffect(() => {
    if (hasValidUnitData && csvUnitData) {

      // Convert CSV data to UnitRecord format for explore state
      const unitsMap = new Map<string, UnitRecord>();

      // Only include desired buildings
      const allowedBuildings = ['Fifth Street Building', 'Maryland Building', 'Tower Building'];

      Object.entries(csvUnitData).forEach(([unitKey, unitData]) => {
        // Skip buildings we don't want to show
        if (!allowedBuildings.includes(unitData.building)) {
          return;
        }


        // Skip duplicate entries (we store multiple keys for same unit)
        const primaryKey = unitData.unit_key || unitKey;
        if (unitsMap.has(primaryKey)) {
          return; // Skip duplicate
        }



        // Ensure floor data is present - default to "Main Floor" for Tower Building if missing
        let floorValue = unitData.floor?.toString() || '';
        if (!floorValue && unitData.building === 'Tower Building') {
          floorValue = 'Main Floor';
        } else if (!floorValue) {
          console.warn(`⚠️ Unit ${unitData.unit_name} (${unitData.building}) has no floor data in CSV!`);
        }

        // Correct known CSV floor assignment errors
        const floorCorrections: Record<string, string> = {
          'T-1100': 'Eleventh Floor',
          'T-1200': 'Twelfth Floor',
          'T-1000': 'Tenth Floor',
        };
        const correctedFloor = floorCorrections[(unitData.unit_name || '').toUpperCase()] || floorCorrections[unitData.unit_name || ''];
        if (correctedFloor) {
          floorValue = correctedFloor;
        }

        const unitRecord: UnitRecord = {
          unit_key: primaryKey,
          building: unitData.building || 'Unknown',
          floor: floorValue,
          unit_name: unitData.unit_name || unitData.name,
          status: unitData.status === true, // Convert to boolean as expected by UnitStatus type
          area_sqft: unitData.area_sqft || undefined,
          floorplan_url: unitData.floorplan || unitData.floorPlanUrl || unitData.floorplan_url,
          recipients: unitData.email_recipients ? [unitData.email_recipients] : ['owner@lacenter.com'], // Use CSV email or default
          unit_type: unitData.unit_type || 'Suite', // Copy unit type from CSV data
          private_offices: unitData.private_offices,
          plug_and_play: unitData.plug_and_play,
          build_to_suit: unitData.build_to_suit,
          is_production_office: unitData.is_production_office,
          has_kitchen: unitData.has_kitchen,
          full_floor_floorplan_url: unitData.full_floor_floorplan_url,
          tour_3d_url: unitData.tour_3d_url
        };

        // Store with the primary key
        unitsMap.set(primaryKey, unitRecord);

        // Also store with GLB variations for easier lookup
        unitsMap.set(`${primaryKey}.glb`, unitRecord);
        unitsMap.set(unitData.name, unitRecord);
        unitsMap.set(`${unitData.name}.glb`, unitRecord);

      });


      // Build hierarchical index
      const unitsIndex = buildUnitsIndex(unitsMap);


      // Update explore state
      setUnitsData(unitsMap);
      setUnitsIndex(unitsIndex);

    }
  }, [hasValidUnitData, csvUnitData, setUnitsData, setUnitsIndex]);

  // Log selected unit when it changes

  // Log sphere data when it changes






  // Navigation control functions with CameraControls
  const handleRotateLeft = useCallback(() => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      controls.rotate(-Math.PI / 8, 0, true); // 22.5 degrees left
    }
  }, []);

  const handleRotateRight = useCallback(() => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      controls.rotate(Math.PI / 8, 0, true); // 22.5 degrees right
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      controls.dolly(0.85, true); // Zoom in (less than 1.0 to move camera closer)
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      controls.dolly(-0.35, true); // Zoom out (negative value to move camera away)
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      controls.reset(true); // Reset to initial position
    }
  }, []);

  const handleExpandFloorplan = useCallback((floorplanUrl: string, unitName: string, unitData?: any) => {
    console.log('📋 Opening floorplan:', { floorplanUrl, unitName, isMobile: deviceCapabilities.isMobile });

    setFloorplanPopupData({
      floorplanUrl,
      unitName,
      unitData
    });
    setShowFloorplanPopup(true);
  }, []);

  const handleCloseFloorplanPopup = useCallback(() => {
    setShowFloorplanPopup(false);
    setFloorplanPopupData(null);
  }, []);

  // Listen for mobile progressive loading events
  useEffect(() => {
    if (!PerfFlags.isMobile) return;

    const handleLoadingUpdate = (event: CustomEvent) => {
      const { progress, message, phase } = event.detail;
      setLoadingProgress(progress);
      setLoadingPhase(phase);
      console.log(`📱 Mobile loading: ${progress}% - ${message}`);
    };

    const handleLoadingComplete = (event: CustomEvent) => {
      const { progress, message } = event.detail;
      setLoadingProgress(100);
      setLoadingPhase('complete');
      setEffectsReady(true);
      console.log(`✅ Mobile loading complete: ${message}`);

      setTimeout(() => {
        setModelsLoading(false);
        setInitialLoadCompleted(true);
        console.log('✅ Initial load completed (500ms timeout) - loading screen disabled permanently');
      }, 500);
    };

    window.addEventListener('mobile-loading-update' as any, handleLoadingUpdate);
    window.addEventListener('mobile-loading-complete' as any, handleLoadingComplete);

    return () => {
      window.removeEventListener('mobile-loading-update' as any, handleLoadingUpdate);
      window.removeEventListener('mobile-loading-complete' as any, handleLoadingComplete);
    };
  }, []);

  // Start loading progress immediately on mount with guard to prevent infinite loop and failsafe timeout
  const loadingInitialized = useRef(false);
  useEffect(() => {
    if (loadingInitialized.current) return;
    loadingInitialized.current = true;

    console.log('⏳ Loading initialized, iOS:', PerfFlags.isIOS, 'isMobile:', PerfFlags.isMobile);
    setLoadingPhase('initializing');
    setLoadingProgress(5);

    // Mobile: Listen for progressive loading events instead of simulating
    if (PerfFlags.isMobile) {
      console.log('📱 Mobile: Waiting for progressive loading events...');
      // Start at 5% and let the events drive progress
      setLoadingPhase('loading-models');
      return;
    }

    // Desktop: Normal loading simulation
    const earlyProgress = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev < 15) return prev + 1;
        return prev;
      });
    }, 100);

    setTimeout(() => {
      setLoadingPhase('loading-assets');
      clearInterval(earlyProgress);
    }, 1000);

    // Failsafe: force complete after 12 seconds on mobile (10s on desktop)
    const failsafeTimeout = setTimeout(() => {
      if (loadingPhase !== 'complete') {
        console.warn('⚠️ Loading failsafe triggered');
        setLoadingPhase('complete');
        setLoadingProgress(100);
        setEffectsReady(true);
        setTimeout(() => {
          setModelsLoading(false);
          setInitialLoadCompleted(true);
          console.log('✅ Initial load completed - loading screen disabled permanently');
        }, 300);
      }
    }, deviceCapabilities.isMobile ? 12000 : 10000);

    return () => {
      clearInterval(earlyProgress);
      clearTimeout(failsafeTimeout);
    };
  }, [deviceCapabilities.isMobile, loadingPhase]);

  const floorplanContextValue = {
    openFloorplan: handleExpandFloorplan
  };

  return (
    <FloorplanContext.Provider value={floorplanContextValue}>
      <SafariErrorBoundary>
        {/* FlashKiller REMOVED - was causing black screen interruptions */}
        {/* Loading screen - Portaled to body for true full-screen centering */}
        {modelsLoading && console.log('🚨 FLASH: Loading overlay is visible! (no more white flash)')}
        {modelsLoading && ReactDOM.createPortal(
          <div className="fixed inset-0 flex justify-center items-center"
            style={{
              background: 'white',
              zIndex: 9999,
              transition: 'opacity 0.3s ease-in-out'
            }}>
            <div className="text-center">

              {/* Pulsating GIF Logo */}
              <div className="mb-8">
                <div style={{
                  overflow: 'hidden',
                  maxWidth: '20rem',
                  margin: '0 auto 1rem'
                }}>
                  <img
                    src={assetUrl('textures/333999.gif')}
                    alt="Loading"
                    className="w-full"
                    style={{
                      filter: 'none',
                      animation: 'pulse 2s ease-in-out infinite',
                      marginBottom: '-3px'
                    }}
                  />
                </div>
              </div>

              {/* Loading Progress */}
              <div className="mb-6">
                <div className="bg-gray-200 rounded-full h-3 w-80 mx-auto overflow-hidden">
                  <div
                    className="bg-gray-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>

                {/* Loading Phase Text */}
                <p className="text-gray-600 text-sm mt-3">
                  {loadingPhase === 'initializing' && 'Initializing...'}
                  {loadingPhase === 'loading-assets' && 'Loading assets...'}
                  {loadingPhase === 'loading-models' && `Loading models... ${loadingProgress}%`}
                  {loadingPhase === 'validating-materials' && 'Validating materials...'}
                  {loadingPhase === 'compiling-shaders' && 'Compiling shaders...'}
                  {loadingPhase === 'enabling-effects' && 'Enabling post-processing...'}
                  {loadingPhase === 'complete' && 'Ready!'}
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}



        <div className="app-viewport">
          <div className="app-layout">
            {/* Sidebar - Moved to top for CSS Grid Layout (Left/Top slot) */}
            {!modelsLoading && (
              <Sidebar />
            )}

            <div
              className="scene-shell"
            >
              {/* CSV loads in background - logo screen moved outside viewport */}







              {/* CRITICAL FIX: Wrap canvas in error boundary to catch mobile crashes */}
              {canvasReady && sceneEnabled && (
                <MobileErrorBoundary
                  onError={() => {
                    console.log('🚨 Error Boundary triggered - forcing loading screen off');
                    setModelsLoading(false);
                  }}
                >
                  {/* Mobile pointer-events wrapper - prevents canvas from blocking HTML UI */}
                  <div style={deviceCapabilities.isMobile ? { pointerEvents: 'none' } : {}}>
                    {console.log('🎬 Rendering RootCanvas - canvasReady:', canvasReady, 'sceneEnabled:', sceneEnabled)}
                    <RootCanvas
                      shadows={mobileSettings.shadows}
                      camera={{ position: [-10, 10, -14], fov: 45, near: 0.1, far: 1000 }}
                      style={{
                        width: '100%',
                        height: '100%',
                        filter: "none",
                        backgroundColor: 'transparent' // Prevent white canvas background
                      }}
                      gl={glConfig}
                      frameloop={PerfFlags.isIOS && showFloorplanPopup ? "demand" : "always"}
                      onTierChange={setRenderTier}
                      onCreated={({ camera }) => {
                        console.log('🎨 Canvas created - Mobile safe-mode:', deviceCapabilities.isMobile);
                        console.log('  - DPR:', mobileSettings.pixelRatio);
                        console.log('  - Shadows:', mobileSettings.shadows);
                        console.log('  - HDRI res:', mobileSettings.hdriResolution);
                        console.log('  - Texture max:', mobileSettings.textureSize);
                        camera.lookAt(0, 0, 0);
                      }}
                    >
                      {(tier) => (
                        <>
                          {/* MOBILE-OPTIMIZED Environment - Prevents context loss on mobile */}
                          <MobileEnvironment
                            backgroundIntensity={deviceCapabilities.isMobile ? 1.0 : 1.6}
                            environmentIntensity={deviceCapabilities.isMobile ? 0.8 : 1.2}
                          />

                          {/* Lighting System - Mobile-safe preset uses simple lighting */}
                          {mobileSettings.useSimpleLighting ? (
                            <>
                              {/* MOBILE SAFE-MODE: Basic ambient + directional only */}
                              <ambientLight intensity={0.4} />
                              <directionalLight
                                position={[-34, 78, 28]}
                                intensity={4.0}
                                castShadow={false}
                              />
                              {console.log('💡 Using SIMPLE LIGHTING (mobile safe-mode)')}
                            </>
                          ) : (
                            <>
                              {/* DESKTOP: Adaptive lighting with shadows */}
                              {sceneRef.current && (
                                <>
                                  <AdaptiveLighting scene={sceneRef.current} tier={tier} />
                                  <SoftShadowsController tier={tier} />
                                </>
                              )}
                            </>
                          )}


                          {/* Fog - Lightweight Volumetric Fog (replaces God Rays) */}
                          {!mobileSettings.disableFog && (
                            <>
                              <fogExp2 attach="fog" args={['#d0e0f0', 0.0025]} />
                            </>
                          )}

                          {/* Capture scene and gl for external callbacks */}
                          <SceneCapture sceneRef={sceneRef} glRef={glRef} />

                          {/* 3D Scene - Testing Single Environment Mesh */}
                          <SingleEnvironmentMesh tier={renderTier} />

                          {/* GLB Manager for unit highlighting and interaction */}
                          <GLBManager />

                          {/* Frustum Culling for performance - only render visible objects */}
                          <FrustumCuller />

                          {/* Unit Glow Highlight - FIXED: Only glows selected unit, no mass mesh creation */}
                          <UnitGlowHighlightFixed />
                          {/* OLD BROKEN VERSION: <UnitGlowHighlight /> */}


                          {/* Canvas Resize Handler for smooth sidebar transitions */}
                          <CanvasResizeHandler />


                          {/* God Rays Effect - REMOVED per user request (bandwidth/performance) */}
                          {/* {effectsReady && <GodRays />} */}

                          {/* Enhanced Camera Controls with proper object framing */}
                          <CameraController selectedUnit={selectedUnit} controlsRef={orbitControlsRef} />



                          {/* Performance Governor - mobile FPS enforcement */}
                          <PerformanceGovernorComponent />


                          {/* Enhanced Context Recovery for Mobile */}
                          <WebGLContextRecovery />

                          {/* Post-processing - Disabled on mobile per safe-mode preset */}
                          {!mobileSettings.postProcessing && !SAFE && effectsReady && debugState.ao && (
                            <AdaptiveEffects tier={tier} />
                          )}
                          {mobileSettings.postProcessing && console.log('⚠️ Post-processing DISABLED (mobile safe-mode)')}

                        </>
                      )}
                    </RootCanvas>
                  </div>

                  {/* Flash Prevention System - OUTSIDE Canvas but overlays entire screen */}
                  {/* Enabled: FlashKiller freezes frame during heavy state changes to prevent white flashes */}
                  {/* Flash Prevention System - DISABLED to fix black screen freeze issues
                  {/* <FlashKiller isActive={preventFlash} duration={400} /> */}

                  {/* Transition Mask - DISABLED: Was causing black flash when clicking units */}
                  {/* <TransitionMask /> */}

                </MobileErrorBoundary>
              )}

              {!sceneEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 border border-dashed border-slate-300 rounded-2xl text-center px-6 py-8">
                  <p className="font-semibold text-slate-800">3D scene disabled for mobile UI focus</p>
                  <p className="text-sm text-slate-600 mt-2 max-w-sm">
                    {sceneDisableReason === 'forced-off'
                      ? 'The ?scene=0 flag is active. Remove it or set ?scene=1 to re-enable the 3D environment.'
                      : 'Mobile safe mode temporarily disables the 3D environment. Append ?scene=1 to the URL if you need to test it.'}
                  </p>
                </div>
              )}



            </div>  {/* Close scene-shell */}




            {/* Camera Controls - Desktop Only (Mobile uses pointer-events CSS pattern) */}
            {sceneEnabled && !modelsLoading && !deviceCapabilities.isMobile && (
              <div
                className="fixed bottom-6 z-40 camera-controls-overlay"
              >
                <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-black/5 p-3">
                  <div className="grid grid-cols-5 gap-2">
                    <button
                      className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs shadow-sm hover:shadow transition flex items-center justify-center"
                      onClick={handleRotateLeft}
                      title="Rotate Left"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs shadow-sm hover:shadow transition flex items-center justify-center"
                      onClick={handleRotateRight}
                      title="Rotate Right"
                    >
                      <RotateCw size={14} />
                    </button>
                    <button
                      className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs shadow-sm hover:shadow transition flex items-center justify-center"
                      onClick={handleZoomIn}
                      title="Zoom In"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs shadow-sm hover:shadow transition flex items-center justify-center"
                      onClick={handleZoomOut}
                      title="Zoom Out"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs shadow-sm hover:shadow transition flex items-center justify-center"
                      onClick={handleResetView}
                      title="Reset View"
                    >
                      <Home size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}







            {/* Hover Toast - using new component */}
            <HoverToast />


            {/* Shadow Debug UI - DISABLED (using RealisticSun instead) */}

            {/* Floorplan Popup */}
            <FloorplanPopup
              isOpen={showFloorplanPopup && !!floorplanPopupData}
              onClose={handleCloseFloorplanPopup}
              floorplanUrl={floorplanPopupData?.floorplanUrl || ''}
              unitName={floorplanPopupData?.unitName || ''}
              unitData={floorplanPopupData?.unitData}
            />

            {/* Share Floorplan Modal */}
            <ShareFloorplanModal />

            {/* Debug info removed */}


            {/* Sun Position Controls - Removed, values hard-coded */}


            {/* Error Log Display - Shows persisted errors for mobile debugging */}
            <ErrorLogDisplay />

            {/* Safari Debug Banner - On-screen debugging for real iOS devices */}
            <SafariDebugBanner />

            {/* Unit Request Sidebar - Replaces modal to prevent WebGL context loss */}
            <UnitRequestSidebar />

          </div>  {/* Close app-layout */}
        </div>  {/* Close app-viewport */}
      </SafariErrorBoundary>
    </FloorplanContext.Provider>
  );
}

export default App;
