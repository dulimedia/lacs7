import React from 'react';
import * as THREE from 'three';

/**
 * Ground Plane Component for Shadow Reception
 * Provides a large invisible ground plane to receive shadows from buildings
 */
export const GroundPlane: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  // DIAGNOSTIC TEST: Disable shadow reception on mobile to isolate artifact type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const shouldReceiveShadows = !isMobile; // Disable on mobile for testing
  
  console.log(`🧪 DIAGNOSTIC: GroundPlane receiveShadow = ${shouldReceiveShadows} (isMobile: ${isMobile})`);
  
  return (
    <mesh 
      receiveShadow={shouldReceiveShadows}
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
  );
};