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

  // Use ultra-low-res HDRI on mobile, full HDRI on desktop
  if (PerfFlags.isMobile && PerfFlags.isSafariIOS) {
    // iOS Safari - use solid color background to prevent context loss (preserve existing behavior)
    return (
      <>
        <color attach="background" args={['#87CEEB']} />
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={2.0} 
          castShadow={false}
        />
      </>
    );
  }


  if (PerfFlags.isMobile) {
    // EXPERIMENT: Use desktop-quality HDRI on mobile to test if downsizing causes texture issues
    console.log('🧪 EXPERIMENTAL: Using desktop-quality HDRI (1024px) on mobile');
    return (
      <Environment
        files={assetUrl("textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr")}
        background={true}
        backgroundIntensity={backgroundIntensity}
        environmentIntensity={environmentIntensity}
        resolution={1024} // FULL DESKTOP QUALITY
        onLoad={() => console.log('✅ Mobile HDRI loaded at desktop quality (1024px)')}
        onError={(error) => {
          console.error('❌ HDRI failed on mobile, using gradient fallback:', error);
        }}
      >
        {/* Fallback lighting if HDRI fails */}
        {gradientTexture && <primitive attach="background" object={gradientTexture} />}
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={2.0} 
          castShadow={false}
        />
      </Environment>
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