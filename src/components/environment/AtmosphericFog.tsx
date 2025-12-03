import { useThree } from '@react-three/fiber';
import { FogExp2 } from 'three';
import { useEffect, useRef } from 'react';

export function AtmosphericFog() {
  const { scene } = useThree();
  const fogCreated = useRef(false);

  useEffect(() => {
    // Only create fog once to prevent constant re-renders
    if (!fogCreated.current) {
      scene.fog = new FogExp2(0xc0d6e8, 0.0008);
      fogCreated.current = true;
    }
  }, [scene]);

  return null;
}