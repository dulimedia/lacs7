import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLBState } from '../store/glbState';
import * as THREE from 'three';
import { createGlowMaterial } from '../materials/glowMaterial';

export const UnitGlowHighlightFixed = () => {
  const glowGroupRef = useRef<THREE.Group>(null);
  const currentGlowMeshesRef = useRef<THREE.Mesh[]>([]);
  const glowMaterialRef = useRef<THREE.Material | null>(null);

  // The selectionKey that the CURRENT glow meshes were successfully built for.
  // This is only updated when glow meshes are actually created (or selection cleared).
  // It differs from the live selectionKey when the GLB object hasn't loaded yet.
  const resolvedKeyRef = useRef<string>('');

  // Create the blue glow material once
  useEffect(() => {
    if (!glowMaterialRef.current) {
      glowMaterialRef.current = createGlowMaterial(0x3b82f6);
    }
  }, []);

  // Helper: create glow meshes from a unit's GLB
  const createGlowMeshFromUnit = (unitGLB: any): THREE.Mesh[] => {
    const glowMeshes: THREE.Mesh[] = [];
    if (!unitGLB?.object || !glowMaterialRef.current) return glowMeshes;

    unitGLB.object.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        try {
          const vertexCount = child.geometry.attributes.position?.count || 0;
          if (vertexCount > 10000) return; // Skip environment meshes

          const clonedGeometry = child.geometry.clone();
          const clonedMaterial = glowMaterialRef.current!.clone();

          let targetOpacity = 1.0;
          if (unitGLB.key === 'F-250' || unitGLB.key === 'F-290') {
            targetOpacity = 0.4;
          }

          // Start at full target opacity — no fade needed, bloom is disabled
          clonedMaterial.opacity = targetOpacity;

          const glowMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);
          glowMesh.position.copy(child.position);
          glowMesh.rotation.copy(child.rotation);
          glowMesh.scale.copy(child.scale);
          glowMesh.renderOrder = 999;
          glowMesh.visible = true;

          glowMesh.userData.unitKey = unitGLB.key;
          glowMesh.userData.isGlowMesh = true;
          glowMesh.userData.targetOpacity = targetOpacity;

          glowMeshes.push(glowMesh);
        } catch (error) {
          console.error('Failed to clone geometry for glow:', error);
        }
      }
    });

    return glowMeshes;
  };

  // Dispose glow meshes (remove from scene + free GPU memory)
  const disposeMeshes = (meshes: THREE.Mesh[]) => {
    meshes.forEach(mesh => {
      glowGroupRef.current?.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    });
  };

  // ALL glow logic in useFrame — reads DIRECTLY from Zustand store (not React
  // closure) so state changes are visible in the SAME frame, with zero delay.
  useFrame(() => {
    if (!glowGroupRef.current || !glowMaterialRef.current) return;

    // Read DIRECTLY from the Zustand store — bypasses React render cycle.
    const state = useGLBState.getState();
    const { selectedUnit, selectedBuilding, selectedFloor, hoveredUnit } = state;

    // Build a key representing the desired glow target
    const selectionKey = `${selectedUnit}|${selectedBuilding}|${selectedFloor}|${hoveredUnit}`;

    // Only act if the glow doesn't match the current selection yet.
    // resolvedKeyRef tracks what we SUCCESSFULLY built glow for — it stays
    // stale when the GLB object isn't loaded yet, so we keep retrying each
    // frame. Meanwhile, old glow meshes remain visible to prevent flash.
    if (selectionKey === resolvedKeyRef.current) return;

    // Determine which unit needs glow
    let newMeshes: THREE.Mesh[] = [];

    if (selectedUnit && selectedBuilding && selectedFloor !== null && selectedFloor !== undefined) {
      const unitGLB = state.getGLBByUnit(selectedBuilding, selectedFloor, selectedUnit);
      if (unitGLB) {
        newMeshes = createGlowMeshFromUnit(unitGLB);
      }
    } else if (hoveredUnit && !selectedUnit) {
      const hoveredUnitGLB = state.glbNodes.get(hoveredUnit);
      if (hoveredUnitGLB) {
        newMeshes = createGlowMeshFromUnit(hoveredUnitGLB);
      }
    }

    const hasActiveSelection = !!(selectedUnit && selectedBuilding && selectedFloor !== null && selectedFloor !== undefined)
      || !!(hoveredUnit && !selectedUnit);

    if (newMeshes.length > 0) {
      // SUCCESS — swap glow meshes
      const oldMeshes = [...currentGlowMeshesRef.current];
      newMeshes.forEach(mesh => glowGroupRef.current?.add(mesh));
      currentGlowMeshesRef.current = newMeshes;
      resolvedKeyRef.current = selectionKey;
      disposeMeshes(oldMeshes);
    } else if (!hasActiveSelection) {
      // Selection cleared — remove all glow
      const oldMeshes = [...currentGlowMeshesRef.current];
      currentGlowMeshesRef.current = [];
      resolvedKeyRef.current = selectionKey;
      disposeMeshes(oldMeshes);
    }
    // else: active selection but object not loaded yet — keep old glow visible,
    // DON'T update resolvedKeyRef so we retry next frame
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeMeshes(currentGlowMeshesRef.current);
      currentGlowMeshesRef.current = [];
      if (glowMaterialRef.current) {
        glowMaterialRef.current.dispose();
      }
    };
  }, []);

  return (
    <group ref={glowGroupRef}>
      {/* Selective glow meshes are added dynamically only for selected unit */}
    </group>
  );
};
