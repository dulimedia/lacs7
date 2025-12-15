/** Spec reference:
 * See ./docs/AGENT_SPEC.md (§10 Acceptance) and ./docs/INTERACTION_CONTRACT.md (§3-4).
 * Do not change ids/schema without updating docs.
 */
import React, { useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { configureGLTFLoader } from '../three/loaders';
import { postprocessLoadedScene } from '../three/pipeline/postprocessLoadedScene';
import { useGLBState, type GLBNodeInfo } from '../store/glbState';
import { useFilterStore } from '../stores/useFilterStore';
import { SELECTED_MATERIAL_CONFIG, HOVERED_MATERIAL_CONFIG, FILTER_HIGHLIGHT_CONFIG } from '../config/ghostMaterialConfig';
import { logger } from '../utils/logger';
import { MobileDiagnostics } from '../debug/mobileDiagnostics';
import { ProgressiveLoader } from '../utils/progressiveLoader';
import { PerfFlags } from '../perf/PerfFlags';

interface GLBUnitProps {
  node: GLBNodeInfo;
}

const FADE_DURATION = 0.8;

// MOBILE FIX: Share materials globally across all GLBUnit instances
// Creating materials per-unit causes GPU memory fragmentation on mobile
const sharedMaterialsCache = {
  selected: null as THREE.MeshStandardMaterial | null,
  hovered: null as THREE.MeshStandardMaterial | null,
  filtered: null as THREE.MeshStandardMaterial | null,
};

const getSharedSelectedMaterial = (): THREE.MeshStandardMaterial => {
  if (!sharedMaterialsCache.selected) {
    sharedMaterialsCache.selected = new THREE.MeshStandardMaterial({
      color: SELECTED_MATERIAL_CONFIG.color,
      emissive: SELECTED_MATERIAL_CONFIG.emissive,
      emissiveIntensity: 0,
      metalness: SELECTED_MATERIAL_CONFIG.metalness,
      roughness: SELECTED_MATERIAL_CONFIG.roughness,
      transparent: true,
      opacity: 0,
    });
    console.log('📦 Created shared SELECTED material (mobile optimization)');
  }
  return sharedMaterialsCache.selected;
};

const getSharedHoveredMaterial = (): THREE.MeshStandardMaterial => {
  if (!sharedMaterialsCache.hovered) {
    sharedMaterialsCache.hovered = new THREE.MeshStandardMaterial({
      color: HOVERED_MATERIAL_CONFIG.color || '#ffffff',
      emissive: HOVERED_MATERIAL_CONFIG.emissive,
      emissiveIntensity: 0,
      metalness: HOVERED_MATERIAL_CONFIG.metalness || 0.5,
      roughness: HOVERED_MATERIAL_CONFIG.roughness || 0.5,
      transparent: true,
      opacity: 0.8,
    });
    console.log('📦 Created shared HOVERED material (mobile optimization)');
  }
  return sharedMaterialsCache.hovered;
};

const getSharedFilteredMaterial = (): THREE.MeshStandardMaterial => {
  if (!sharedMaterialsCache.filtered) {
    sharedMaterialsCache.filtered = new THREE.MeshStandardMaterial({
      color: FILTER_HIGHLIGHT_CONFIG.color,
      emissive: FILTER_HIGHLIGHT_CONFIG.emissive,
      emissiveIntensity: 0,
      metalness: FILTER_HIGHLIGHT_CONFIG.metalness,
      roughness: FILTER_HIGHLIGHT_CONFIG.roughness,
      transparent: FILTER_HIGHLIGHT_CONFIG.transparent,
      opacity: 0,
    });
    console.log('📦 Created shared FILTERED material (mobile optimization)');
  }
  return sharedMaterialsCache.filtered;
};

const GLBUnitInner: React.FC<GLBUnitProps> = React.memo(({ node }) => {
  const { selectedUnit, selectedBuilding, selectedFloor, hoveredUnit } = useGLBState();
  const { isUnitActive } = useFilterStore();

  const isHovered = hoveredUnit === node.key && !selectedUnit;
  const isSelected = selectedUnit === node.unitName &&
    selectedBuilding === node.building &&
    selectedFloor === node.floor;
  const isFiltered = isUnitActive(node.key) && !isSelected && !isHovered;

  // Load the model - this will suspend if not loaded
  const { gl } = useThree();
  const { scene } = useLoader(GLTFLoader, node.path, (loader) => configureGLTFLoader(loader, gl));

  // NEW: Refactored hygiene pass
  useMemo(() => {
    // FIXED: Do not center units! They must stay in world coordinates for camera focus.
    if (scene) postprocessLoadedScene(scene, { center: false });
  }, [scene]);

  // Register with progressive loader when model loads
  useEffect(() => {
    if (scene) {
      const loader = ProgressiveLoader.getInstance();
      loader.registerLoaded(node.path);
    }
  }, [scene, node.path]);

  const groupRef = useRef<THREE.Group>(null);
  const originalMaterialsRef = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());
  const fadeProgressRef = useRef(0);
  const targetStateRef = useRef<'none' | 'selected' | 'hovered' | 'filtered'>('none');
  const hasAppliedInitialHideRef = useRef(false);

  // Ensure the GLB stays hidden until our fade/material logic takes over.
  useLayoutEffect(() => {
    if (groupRef.current && !hasAppliedInitialHideRef.current) {
      groupRef.current.visible = false;
      hasAppliedInitialHideRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (scene && originalMaterialsRef.current.size === 0) {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          originalMaterialsRef.current.set(child.uuid, child.material);
        }
      });
      MobileDiagnostics.log('glb', 'Cached original materials', {
        node: node.key,
        meshCount: originalMaterialsRef.current.size,
      });
    }
  }, [scene, node.key]);

  const { updateGLBObject } = useGLBState();

  useEffect(() => {
    if (groupRef.current) {
      updateGLBObject(node.key, groupRef.current);
      MobileDiagnostics.log('glb', 'Registered GLB group', { node: node.key });
    }
  }, [node.key, updateGLBObject]);

  useEffect(() => {
    // DISABLED: Double material fix - rely on UnitGlowHighlightFixed for selection glow
    /* 
    if (isSelected) {
      targetStateRef.current = 'selected';
    } else */
    if (isHovered) {
      targetStateRef.current = 'hovered';
    } else if (isFiltered) {
      targetStateRef.current = 'filtered';
    } else {
      targetStateRef.current = 'none';
    }
  }, [isSelected, isHovered, isFiltered]);

  // Clean up materials when component unmounts to prevent "dirty" GLTF cache
  useEffect(() => {
    return () => {
      if (groupRef.current) {
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const originalMaterial = originalMaterialsRef.current.get(child.uuid);
            if (originalMaterial) {
              child.material = originalMaterial;
              delete (child.material as any).__isAnimatedMaterial;
            }
          }
        });
      }
    };
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const targetProgress = targetStateRef.current !== 'none' ? 1 : 0;
    const fadeSpeed = 1 / FADE_DURATION;

    // ATOMIC FRAME SYNC: Set visibility before fade calculations to prevent flash gap
    groupRef.current.visible = targetProgress > 0 || fadeProgressRef.current > 0;

    if (fadeProgressRef.current !== targetProgress) {
      if (fadeProgressRef.current < targetProgress) {
        fadeProgressRef.current = Math.min(1, fadeProgressRef.current + delta * fadeSpeed);
      } else {
        fadeProgressRef.current = Math.max(0, fadeProgressRef.current - delta * fadeSpeed);
      }
    }

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMaterial = originalMaterialsRef.current.get(child.uuid);

        if (targetStateRef.current === 'selected') {
          const sharedMaterial = getSharedSelectedMaterial();
          if (!child.material || !(child.material as any).__isAnimatedMaterial) {
            (sharedMaterial as any).__isAnimatedMaterial = true;
            child.material = sharedMaterial;
            // Start with 0 opacity and fade in to prevent white flash
            sharedMaterial.opacity = 0;
            sharedMaterial.emissiveIntensity = 0;
          }
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.opacity = fadeProgressRef.current;
          mat.emissiveIntensity = SELECTED_MATERIAL_CONFIG.emissiveIntensity * fadeProgressRef.current;
          // Keep visible during transition to prevent flash gap
          child.visible = true;
        } else if (targetStateRef.current === 'hovered') {
          const sharedMaterial = getSharedHoveredMaterial();
          if (!child.material || !(child.material as any).__isAnimatedMaterial) {
            (sharedMaterial as any).__isAnimatedMaterial = true;
            child.material = sharedMaterial;
            // Start with 0 opacity to prevent flash
            sharedMaterial.emissiveIntensity = 0;
          }
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = HOVERED_MATERIAL_CONFIG.emissiveIntensity * fadeProgressRef.current;
          // Keep visible during transition to prevent flash gap
          child.visible = true;
        } else if (targetStateRef.current === 'filtered') {
          const sharedMaterial = getSharedFilteredMaterial();
          if (!child.material || !(child.material as any).__isAnimatedMaterial) {
            (sharedMaterial as any).__isAnimatedMaterial = true;
            child.material = sharedMaterial;
            // Start with 0 opacity and fade in to prevent white flash
            sharedMaterial.opacity = 0;
            sharedMaterial.emissiveIntensity = 0;
          }
          const mat = child.material as THREE.MeshStandardMaterial;
          mat.opacity = FILTER_HIGHLIGHT_CONFIG.opacity * fadeProgressRef.current;

          const time = state.clock.elapsedTime;
          const pulse = (Math.sin(time * 3.0) + 1.0) * 0.5;
          mat.emissiveIntensity = FILTER_HIGHLIGHT_CONFIG.emissiveIntensity * fadeProgressRef.current * (0.5 + pulse * 0.5);
          // Keep visible during transition to prevent flash gap
          child.visible = true;
        } else if (fadeProgressRef.current === 0 && originalMaterial) {
          child.material = originalMaterial;
          delete (child.material as any).__isAnimatedMaterial;
          // child.visible = true; // Handled by group visibility
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
});

// Wrapper component to handle Lazy Loading and Delayed Unmount
const GLBUnit: React.FC<GLBUnitProps> = React.memo(({ node }) => {
  const { selectedUnit, selectedBuilding, selectedFloor, hoveredUnit } = useGLBState();
  const { isUnitActive } = useFilterStore();

  const isHovered = hoveredUnit === node.key && !selectedUnit;
  const isSelected = selectedUnit === node.unitName &&
    selectedBuilding === node.building &&
    selectedFloor === node.floor;
  const isFiltered = isUnitActive(node.key) && !isSelected && !isHovered;

  const isActive = isSelected || isHovered || isFiltered;
  const [shouldRender, setShouldRender] = React.useState(isActive);

  useEffect(() => {
    if (isActive) {
      setShouldRender(true);
    } else {
      // Delay unmount to allow fade-out animation to complete
      // FADE_DURATION is 0.8s, so we wait 1s to be safe
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, (FADE_DURATION * 1000) + 200);
      return () => clearTimeout(timeout);
    }
  }, [isActive]);

  if (!shouldRender) {
    return null;
  }

  return <GLBUnitInner node={node} />;
});

const GLBInitializer: React.FC = () => {
  const { glbNodes, initializeGLBNodes } = useGLBState();

  useEffect(() => {
    if (glbNodes.size === 0) {
      logger.log('LOADING', '🔧', 'GLBManager: Initializing GLB nodes...');
      MobileDiagnostics.log('glb-manager', 'Initializing GLB nodes');
      
      // Add delay for mobile to ensure proper initialization
      const initDelay = PerfFlags.isMobile ? 500 : 0;
      
      const timeoutId = setTimeout(() => {
        try {
          initializeGLBNodes();
          
          // Verify initialization after a short delay
          setTimeout(() => {
            const currentCount = useGLBState.getState().glbNodes.size;
            console.log(`📦 GLB initialization verification: ${currentCount} nodes registered`);
            
            if (currentCount === 0) {
              console.warn('⚠️ GLB initialization failed, retrying...');
              initializeGLBNodes();
            }
          }, 100);
          
        } catch (error) {
          console.error('❌ GLB initialization error:', error);
          // Retry after delay
          setTimeout(initializeGLBNodes, 1000);
        }
      }, initDelay);
      
      return () => clearTimeout(timeoutId);
    } else {
      MobileDiagnostics.log('glb-manager', 'GLB nodes already initialized', {
        count: glbNodes.size,
      });
    }
  }, [glbNodes.size, initializeGLBNodes]);

  return null;
};

// Error Boundary for individual GLB units
class GLBErrorBoundary extends React.Component<{ children: React.ReactNode, nodeKey: string }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode, nodeKey: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(`❌ Error loading GLB unit ${this.props.nodeKey}:`, error);
    MobileDiagnostics.log('glb-error', `Failed to load ${this.props.nodeKey}`, { error: error.message });
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export const GLBManager: React.FC = () => {
  const { glbNodes } = useGLBState();

  // Render all nodes, but GLBUnit wrapper will handle lazy loading
  const nodesToRender = useMemo(() => {
    const allNodes = Array.from(glbNodes.values());
    console.log(`📦 GLBManager: Registered ${allNodes.length} units (Lazy Loading Enabled)`);
    return allNodes;
  }, [glbNodes]);

  return (
    <group>
      <GLBInitializer />
      {nodesToRender.map(node => (
        <GLBErrorBoundary key={node.key} nodeKey={node.key}>
          <GLBUnit node={node} />
        </GLBErrorBoundary>
      ))}
    </group>
  );
};

export { GLBUnit, GLBInitializer };
