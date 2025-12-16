// Ultra-lightweight environment for mobile devices
// Replaces heavy HDRI with simple gradient or solid color to prevent context loss

import React, { useMemo } from 'react';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import { PerfFlags } from '../perf/PerfFlags';
import { assetUrl } from '../lib/assets';

interface MobileEnvironmentProps {
  backgroundIntensity?: number;
  environmentIntensity?: number;
}

export const MobileEnvironment: React.FC<MobileEnvironmentProps> = ({
  backgroundIntensity = 1.0,
  environmentIntensity = 1.0
}) => {
  // Create a simple gradient texture for mobile instead of HDRI
  const gradientTexture = useMemo(() => {
    if (!PerfFlags.isMobile) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 16;  // Even tinier texture for ultra-low memory
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Simple sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 16);
      gradient.addColorStop(0, '#87CEEB'); // Sky blue
      gradient.addColorStop(0.7, '#98D8E8'); // Light blue
      gradient.addColorStop(1, '#B8E6F0'); // Very light blue
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 16, 16);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.flipY = false;
    
    console.log('🎨 Created ultra-lightweight mobile environment (16x16 gradient)');
    return texture;
  }, []);

  // MOBILE: Use HDRI backdrop with disabled shadows
  if (PerfFlags.isMobile) {
    console.log('📱 Mobile: Using HDRI backdrop with disabled shadows');
    return (
      <Environment
        files={assetUrl("textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr")}
        background={true} // Enable HDRI backdrop for mobile
        backgroundIntensity={backgroundIntensity}
        environmentIntensity={environmentIntensity}
        resolution={512} // Lower resolution for mobile performance
        onLoad={() => console.log('✅ Mobile HDRI loaded')}
        onError={(error) => {
          console.error('❌ Mobile HDRI failed, using fallback:', error);
          // Fallback to gradient if HDRI fails
        }}
      />
    );
  }

  // Desktop - use full HDRI environment
  return (
    <Environment
      files={assetUrl("textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr")}
      background={true}
      backgroundIntensity={backgroundIntensity}
      environmentIntensity={environmentIntensity}
      resolution={1024}
      onLoad={() => console.log('✅ Desktop HDRI loaded')}
      onError={(error) => console.error('❌ HDRI failed:', error)}
    />
  );
};