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
  // Use low-res HDRI on mobile, full HDRI on desktop
  // We avoid the 16x16 gradient because it breaks accurate PBR reflections

  if (PerfFlags.isMobile) {
    return (
      <Environment
        files={assetUrl("textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr")}
        background={true}
        backgroundIntensity={backgroundIntensity}
        environmentIntensity={environmentIntensity}
        resolution={256} // Clamp to low resolution for mobile memory savings
        onLoad={() => console.log('✅ Mobile HDRI loaded (256px)')}
        onError={(error) => console.error('❌ Mobile HDRI failed:', error)}
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