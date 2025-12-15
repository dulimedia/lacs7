import { SoftShadows } from '@react-three/drei';
import type { Tier } from '../../lib/graphics/tier';

interface SoftShadowsControllerProps {
  tier: Tier;
}

export function SoftShadowsController({ tier }: SoftShadowsControllerProps) {
  // Re-enabling PCSS for soft, blurred shadows
  console.log('☁️ SoftShadows Active');
  return (
    <SoftShadows
      size={25}
      focus={0}
      samples={25}
    />
  );
}