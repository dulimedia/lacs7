/** Spec reference:
 * See ./docs/AGENT_SPEC.md (§10 Acceptance) and ./docs/INTERACTION_CONTRACT.md (§3-4).
 * Do not change ids/schema without updating docs.
 */
import React, { useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLBState, type GLBNodeInfo } from '../store/glbState';
import { useExploreState } from '../store/exploreState';
import { useFilterStore } from '../stores/useFilterStore';
import { SELECTED_MATERIAL_CONFIG, HOVERED_MATERIAL_CONFIG, FILTER_HIGHLIGHT_CONFIG } from '../config/ghostMaterialConfig';
import { logger } from '../utils/logger';
import { PerfFlags } from '../perf/PerfFlags';
import { MobileDiagnostics } from '../debug/mobileDiagnostics';
import { ProgressiveLoader, shouldRenderUnit } from '../utils/progressiveLoader';

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

const GLBUnit: React.FC<GLBUnitProps> = React.memo(({ node }) => {
  const { selectedUnit, selectedBuilding, selectedFloor, hoveredUnit } = useGLBState();
  const { selectedUnitKey, hoveredUnitKey } = useExploreState();
  const { isUnitActive } = useFilterStore();
  
  const isHovered = hoveredUnit === node.key && !selectedUnit;
  const isSelected = selectedUnit === node.unitName && 
                    selectedBuilding === node.building && 
                    selectedFloor === node.floor;
  const isFiltered = isUnitActive(node.key) && !isSelected && !isHovered;
  
  // MOBILE OPTIMIZATION: Only load models that pass progressive loading check
  const shouldLoadBase = isSelected || isHovered || isFiltered;
  const canLoadOnMobile = shouldRenderUnit(node.path);
  const shouldLoad = shouldLoadBase && (PerfFlags.isMobile ? canLoadOnMobile : true);
  
  // MOBILE FIX: useGLTF has internal caching - don't dispose the scene
  // The leak was from repeatedly creating/unmounting components
  const { scene } = useGLTF(node.path);
  
  // Register with progressive loader when model loads
  useEffect(() => {
    if (scene && shouldLoad) {
      const loader = ProgressiveLoader.getInstance();
      loader.registerLoaded(node.path);
    }
  }, [scene, shouldLoad, node.path]);
  
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
  
  const { selectUnit, updateGLBObject } = useGLBState();
  const { setSelected } = useExploreState();
  
  useEffect(() => {
    if (groupRef.current) {
      updateGLBObject(node.key, groupRef.current);
      MobileDiagnostics.log('glb', 'Registered GLB group', { node: node.key });
    }
  }, [node.key, updateGLBObject]);

  useEffect(() => {
    if (isSelected) {
      targetStateRef.current = 'selected';
    } else if (isHovered) {
      targetStateRef.current = 'hovered';
    } else if (isFiltered) {
      targetStateRef.current = 'filtered';
    } else {
      targetStateRef.current = 'none';
    }
  }, [isSelected, isHovered, isFiltered]);

  useFrame((state, delta) => {
    if (!groupRef.current || !shouldLoad) return;

    const targetProgress = targetStateRef.current !== 'none' ? 1 : 0;
    const fadeSpeed = 1 / FADE_DURATION;
    
    // ATOMIC FRAME SYNC: Set visibility before fade calculations to prevent flash gap
    groupRef.current.visible = targetProgress > 0;
    
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
            child.visible = true;
          }
        }
      });
    });

  // Material cleanup handled globally now - don't dispose shared materials per-component
  // Don't dispose useGLTF scenes - they're cached by drei internally

  // Don't render at all if mobile and shouldn't load
  if (PerfFlags.isMobile && !canLoadOnMobile && !shouldLoad) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
});

const GLBInitializer: React.FC = () => {
  const { glbNodes, initializeGLBNodes } = useGLBState();
  
  useEffect(() => {
    if (glbNodes.size === 0) {
      logger.log('LOADING', '🔧', 'GLBManager: Initializing GLB nodes...');
      MobileDiagnostics.log('glb-manager', 'Initializing GLB nodes');
      initializeGLBNodes();
    } else {
      MobileDiagnostics.log('glb-manager', 'GLB nodes already initialized', {
        count: glbNodes.size,
      });
    }
  }, [glbNodes.size, initializeGLBNodes]);

  return null;
};

export const GLBManager: React.FC = () => {
  const { glbNodes, selectedUnit, selectedBuilding, selectedFloor, hoveredUnit } = useGLBState();
  const { isUnitActive } = useFilterStore();
  
  const isMobile = PerfFlags.isMobile;
  
  // Load only valid units to prevent GPU overload, but use stable keys to prevent remounting
  const nodesToRender = useMemo(() => {
    const allNodes = Array.from(glbNodes.values());
    
    const activeNodes = allNodes.filter(node => {
      const isHovered = hoveredUnit === node.key && !selectedUnit;
      const isSelected = selectedUnit === node.unitName && 
                        selectedBuilding === node.building && 
                        selectedFloor === node.floor;
      const isFiltered = isUnitActive(node.key) && !isSelected && !isHovered;
      
      return isSelected || isHovered || isFiltered;
    });
    
    console.log(`📦 Loading ${activeNodes.length}/${allNodes.length} units on demand (mobile: ${isMobile})`);
    MobileDiagnostics.log('glb-manager', 'Lazy loading GLB units', { 
      total: allNodes.length,
      rendering: activeNodes.length,
      isMobile,
      optimization: 'lazy load with stable keys to prevent remounting'
    });
    return activeNodes;
  }, [glbNodes, isMobile, selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, isUnitActive]);
  
  return (
    <group>
      <GLBInitializer />
      {nodesToRender.map(node => (
        <GLBUnit key={node.key} node={node} />
      ))}
    </group>
  );
};

export { GLBUnit, GLBInitializer };
