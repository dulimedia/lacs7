import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLBState } from '../store/glbState';
import * as THREE from 'three';
import { createGlowMaterial } from '../materials/glowMaterial';

export const UnitGlowHighlightFixed = () => {
  const { selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, getGLBByUnit, glbNodes } = useGLBState();
  const glowGroupRef = useRef<THREE.Group>(null);
  const currentGlowMeshesRef = useRef<THREE.Mesh[]>([]);
  const glowMaterialRef = useRef<THREE.Material | null>(null);
  const glowFadeRef = useRef<number>(0); // 0 = invisible, 1 = fully visible

  // Create the blue glow material once with proper depth settings
  useEffect(() => {
    if (!glowMaterialRef.current) {
      glowMaterialRef.current = createGlowMaterial(0x3b82f6); // Blue glow
      console.log('✨ Created selective glow material with depthTest:false');
    }
  }, []);

  // Helper function to safely create glow mesh from a single unit
  const createGlowMeshFromUnit = (unitGLB: any): THREE.Mesh[] => {
    const glowMeshes: THREE.Mesh[] = [];

    if (!unitGLB?.object || !glowMaterialRef.current) {
      console.warn('❌ Cannot create glow: missing unit object or material');
      return glowMeshes;
    }

    // DEBUG: Special logging for T-310
    const isT310 = unitGLB.key.includes('T-310');
    if (isT310) {
      console.log('🔍 [T-310 DEBUG] Starting glow creation for:', unitGLB.key);
      console.log('🔍 [T-310 DEBUG] GLB object structure:', unitGLB.object);
    }

    let meshCount = 0;
    unitGLB.object.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        try {
          // Safety check: skip if geometry is too large (likely environment mesh)
          const vertexCount = child.geometry.attributes.position?.count || 0;

          // DEBUG: Log all meshes for T-310
          if (isT310) {
            console.log(`🔍 [T-310 DEBUG] Found mesh:`, {
              name: child.name,
              vertices: vertexCount,
              material: child.material,
              userData: child.userData,
              parent: child.parent?.name
            });
          }

          if (vertexCount > 10000) {
            if (isT310) {
              console.warn(`🔍 [T-310 DEBUG] Skipping large mesh "${child.name}" with ${vertexCount} vertices (likely environment)`);
            } else {
              console.warn(`⚠️ Skipping large mesh with ${vertexCount} vertices (likely environment)`);
            }
            return;
          }

          // Clone the geometry and material to prevent sharing corruption
          const clonedGeometry = child.geometry.clone();
          const clonedMaterial = glowMaterialRef.current!.clone();

          // Determine target opacity (dimmed for specific bright units)
          let targetOpacity = 1.0;
          if (unitGLB.key === 'F-250' || unitGLB.key === 'F-290') {
            targetOpacity = 0.4;
          }

          // Start at 0 opacity to prevent white flash from Bloom blowout
          clonedMaterial.opacity = 0;

          const glowMesh = new THREE.Mesh(clonedGeometry, clonedMaterial);

          // Copy transform from original mesh
          glowMesh.position.copy(child.position);
          glowMesh.rotation.copy(child.rotation);
          glowMesh.scale.copy(child.scale);

          // Key settings for glow-through effect
          glowMesh.renderOrder = 999; // Render on top of everything
          glowMesh.visible = true; // Visible when created

          // Store metadata
          glowMesh.userData.unitKey = unitGLB.key;
          glowMesh.userData.originalMesh = child.uuid;
          glowMesh.userData.isGlowMesh = true;
          glowMesh.userData.targetOpacity = targetOpacity;

          glowMeshes.push(glowMesh);
          meshCount++;
        } catch (error) {
          console.error('❌ Failed to clone geometry for glow:', error);
        }
      }
    });

    if (isT310) {
      console.log(`🔍 [T-310 DEBUG] Final summary: Created ${meshCount} glow meshes for ${unitGLB.key}`);
      console.log(`🔍 [T-310 DEBUG] Glow meshes:`, glowMeshes);
    }

    console.log(`✅ Created ${meshCount} glow meshes for unit ${unitGLB.key}`);
    return glowMeshes;
  };

  // Dispose a list of glow meshes (remove from scene + free GPU memory)
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

  // Update glow: CREATE new meshes first, THEN remove old ones (no black flash gap)
  useEffect(() => {
    if (!glowGroupRef.current || !glowMaterialRef.current) return;

    // 1. Snapshot old meshes
    const oldMeshes = [...currentGlowMeshesRef.current];

    // 2. Create new glow meshes
    let newMeshes: THREE.Mesh[] = [];

    if (selectedUnit && selectedBuilding && selectedFloor !== null && selectedFloor !== undefined) {
      const unitGLB = getGLBByUnit(selectedBuilding, selectedFloor, selectedUnit);
      if (unitGLB) {
        newMeshes = createGlowMeshFromUnit(unitGLB);
      }
    } else if (hoveredUnit && !selectedUnit) {
      const hoveredUnitGLB = glbNodes.get(hoveredUnit);
      if (hoveredUnitGLB) {
        newMeshes = createGlowMeshFromUnit(hoveredUnitGLB);
      }
    }

    // 3. Add new meshes with initial opacity BEFORE removing old ones
    newMeshes.forEach(mesh => {
      const target = mesh.userData.targetOpacity ?? 1.0;
      if (mesh.material && 'opacity' in mesh.material) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * target;
      }
      glowGroupRef.current?.add(mesh);
    });
    currentGlowMeshesRef.current = newMeshes;
    glowFadeRef.current = 0.85;

    // 4. NOW remove old meshes (new ones are already visible)
    disposeMeshes(oldMeshes);
  }, [selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, getGLBByUnit, glbNodes]);

  // Fade in glow meshes gradually to prevent Bloom blowout / white flash
  useFrame((_, delta) => {
    if (currentGlowMeshesRef.current.length === 0) return;
    if (glowFadeRef.current >= 1) return;

    // Ramp to 1 quickly (~100ms) — bloom is disabled so no blowout risk
    glowFadeRef.current = Math.min(1, glowFadeRef.current + delta * 10);
    const t = glowFadeRef.current;

    currentGlowMeshesRef.current.forEach(mesh => {
      if (mesh.material && 'opacity' in mesh.material) {
        const target = mesh.userData.targetOpacity ?? 1.0;
        (mesh.material as THREE.MeshBasicMaterial).opacity = t * target;
      }
    });
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