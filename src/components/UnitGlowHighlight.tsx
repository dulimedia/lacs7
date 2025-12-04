import { useEffect, useRef } from 'react';
import { useGLBState } from '../store/glbState';
import * as THREE from 'three';
import { createGlowMaterial } from '../materials/glowMaterial';

export const UnitGlowHighlight = () => {
  const { selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, getGLBByUnit, glbNodes } = useGLBState();
  const glowGroupRef = useRef<THREE.Group>(null);
  const glowMeshesRef = useRef<THREE.Mesh[]>([]);
  const glowMaterialRef = useRef<THREE.Material | null>(null);

  // Create the blue glow material once with proper depth settings
  useEffect(() => {
    if (!glowMaterialRef.current) {
      glowMaterialRef.current = createGlowMaterial(0x3b82f6); // Blue glow
      console.log('✨ Created glow material with depthTest:false, AdditiveBlending');
    }
  }, []);

  // Helper function to create glow mesh from unit GLB
  const createGlowMeshFromUnit = (unitGLB: any): THREE.Mesh[] => {
    const glowMeshes: THREE.Mesh[] = [];
    
    if (!unitGLB.object || !glowMaterialRef.current) return glowMeshes;

    unitGLB.object.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Clone the geometry to create glow mesh
        const glowMesh = new THREE.Mesh(
          child.geometry.clone(),
          glowMaterialRef.current!
        );
        
        // Copy transform from original mesh
        glowMesh.position.copy(child.position);
        glowMesh.rotation.copy(child.rotation);
        glowMesh.scale.copy(child.scale);
        glowMesh.matrixWorld.copy(child.matrixWorld);
        
        // Key settings for glow-through effect
        glowMesh.renderOrder = 999; // Render on top of everything
        glowMesh.visible = false; // Start hidden
        
        // Store unit key for tracking
        glowMesh.userData.unitKey = unitGLB.key;
        
        glowMeshes.push(glowMesh);
      }
    });

    return glowMeshes;
  };

  // Initialize glow meshes for all units
  useEffect(() => {
    if (!glowGroupRef.current || !glowMaterialRef.current) return;
    
    // Clear existing glow meshes
    glowMeshesRef.current.forEach(mesh => {
      glowGroupRef.current?.remove(mesh);
      mesh.geometry?.dispose();
    });
    glowMeshesRef.current = [];

    // Create glow meshes for all loaded units
    const allNodes = Array.from(glbNodes.values());
    
    allNodes.forEach(unitGLB => {
      if (unitGLB.object && unitGLB.isLoaded) {
        try {
          const glowMeshes = createGlowMeshFromUnit(unitGLB);
          
          glowMeshes.forEach(mesh => {
            glowGroupRef.current?.add(mesh);
          });
          
          glowMeshesRef.current.push(...glowMeshes);
        } catch (error) {
          console.error(`Error creating glow for ${unitGLB.key}:`, error);
        }
      }
    });
    
    console.log(`✅ Created ${glowMeshesRef.current.length} glow meshes with renderOrder 999`);
  }, [glbNodes, glowMaterialRef]);

  // Update glow visibility based on selection/hover
  useEffect(() => {
    if (!glowGroupRef.current) return;
    
    console.log('[GLOW] selectedUnit =', selectedUnit, 'selectedBuilding =', selectedBuilding, 'selectedFloor =', selectedFloor);
    
    // Hide all glow meshes first
    glowMeshesRef.current.forEach(mesh => {
      mesh.visible = false;
    });

    // Show glow for selected unit
    if (selectedUnit && selectedBuilding && selectedFloor !== null && selectedFloor !== undefined) {
      const unitGLB = getGLBByUnit(selectedBuilding, selectedFloor, selectedUnit);
      console.log('[GLOW MATCH]', unitGLB ? 'Found GLB for' : 'No GLB found for', selectedUnit);
      
      if (unitGLB) {
        // Find glow meshes for this unit
        const unitGlowMeshes = glowMeshesRef.current.filter(
          mesh => mesh.userData.unitKey === unitGLB.key
        );
        
        unitGlowMeshes.forEach(mesh => {
          mesh.visible = true;
        });
        
        if (unitGlowMeshes.length > 0) {
          console.log(`🔵 Applied blue glow to ${selectedUnit} (${unitGlowMeshes.length} meshes)`);
        }
      }
    }
    
    // Also show glow for hovered unit (if no selection)
    else if (hoveredUnit && !selectedUnit) {
      const hoveredUnitGLB = glbNodes.get(hoveredUnit);
      if (hoveredUnitGLB) {
        const unitGlowMeshes = glowMeshesRef.current.filter(
          mesh => mesh.userData.unitKey === hoveredUnitGLB.key
        );
        
        unitGlowMeshes.forEach(mesh => {
          mesh.visible = true;
        });
        
        if (unitGlowMeshes.length > 0) {
          console.log(`🔵 Applied blue glow to hovered ${hoveredUnit}`);
        }
      }
    }
  }, [selectedUnit, selectedBuilding, selectedFloor, hoveredUnit, getGLBByUnit, glbNodes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (glowMaterialRef.current) {
        glowMaterialRef.current.dispose();
      }
      
      glowMeshesRef.current.forEach(mesh => {
        mesh.geometry?.dispose();
      });
    };
  }, []);

  return (
    <group ref={glowGroupRef}>
      {/* Glow meshes are added dynamically via useEffect */}
    </group>
  );
};