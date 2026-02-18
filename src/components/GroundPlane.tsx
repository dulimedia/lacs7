import React from 'react';
import * as THREE from 'three';

/**
 * Ground Plane Component for Shadow Reception
 * Provides a large invisible ground plane to receive shadows from buildings
 */
export const GroundPlane: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  return (
    <>
      {/* Main visual ground - no shadows on mobile to prevent artifacts */}
      <mesh 
        receiveShadow={!isMobile} // Only receive shadows on desktop
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]}
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          color="#808080"
          transparent={false}
          opacity={1}
          shadowSide={THREE.DoubleSide}
          visible={true}
        />
      </mesh>
      
      {/* Shadow catcher for mobile - separate shadow-only plane */}
      {isMobile && (
        <mesh 
          receiveShadow={true}
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, 0.01, 0]} // Slightly offset to prevent z-fighting
        >
          <planeGeometry args={[180, 180]} />
          <primitive object={new THREE.ShadowMaterial({ opacity: 0.35 })} />
        </mesh>
      )}
    </>
  );
};