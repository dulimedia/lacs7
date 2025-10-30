import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PerformanceGovernor } from '../runtime/Governor';
import { PerfFlags } from '../perf/PerfFlags';

export function PerformanceGovernorComponent() {
  const { gl } = useThree();
  const governorRef = useRef<PerformanceGovernor | null>(null);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    if (PerfFlags.isMobileUA) {
      governorRef.current = new PerformanceGovernor(gl);
      
      const handleDropLevel = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        console.warn('🔽 Performance drop detected:', detail);
      };

      const handleLowFps = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        console.warn('⚠️ Low FPS detected:', detail);
      };

      window.addEventListener('perf/dropLevel', handleDropLevel);
      window.addEventListener('perf/lowFps', handleLowFps);

      return () => {
        window.removeEventListener('perf/dropLevel', handleDropLevel);
        window.removeEventListener('perf/lowFps', handleLowFps);
      };
    }
  }, [gl]);

  useFrame(() => {
    if (governorRef.current) {
      const now = performance.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;
      governorRef.current.update(deltaTime);
    }
  });

  return null;
}
