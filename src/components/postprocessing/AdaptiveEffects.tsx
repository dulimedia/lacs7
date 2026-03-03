import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Tier } from '../../lib/graphics/tier';
import { useGLBState } from '../../store/glbState';

interface AdaptiveEffectsProps {
  tier: Tier;
}

import { RENDER_FLAGS } from '../../config/renderFlags';

// Inner component that uses useFrame to smoothly transition bloom intensity
function AnimatedBloom({ baseIntensity, height }: { baseIntensity: number; height: number }) {
  const bloomRef = useRef<any>(null);
  const currentIntensity = useRef(baseIntensity);

  useFrame((_, delta) => {
    if (!bloomRef.current) return;
    const isCameraAnimating = useGLBState.getState().isCameraAnimating;
    const target = isCameraAnimating ? 0 : baseIntensity;
    // Ease toward target: fast suppress (0.1s), slow restore (0.5s)
    const speed = isCameraAnimating ? 10 : 2;
    currentIntensity.current += (target - currentIntensity.current) * Math.min(1, delta * speed);
    bloomRef.current.intensity = currentIntensity.current;
  });

  return (
    <Bloom
      ref={bloomRef}
      intensity={baseIntensity}
      luminanceThreshold={0.7}
      mipmapBlur
      height={height}
    />
  );
}

export function AdaptiveEffects({ tier }: AdaptiveEffectsProps) {
  // Master switch for post-processing
  if (!RENDER_FLAGS.ENABLE_POSTPROCESSING) return null;

  if (tier === 'mobile-low') {
    return (
      <EffectComposer>
        <Noise opacity={0.015} />
      </EffectComposer>
    );
  }

  const isDesktop = tier.startsWith('desktop');
  const baseIntensity = isDesktop ? 0.6 : 0.35;
  const height = Math.floor(window.innerHeight * (isDesktop ? 0.75 : 0.5));

  return (
    <EffectComposer resolutionScale={isDesktop ? 0.75 : 0.5}>
      {RENDER_FLAGS.ENABLE_BLOOM ? (
        <AnimatedBloom baseIntensity={baseIntensity} height={height} />
      ) : null}
      <Noise opacity={0.02} />
    </EffectComposer>
  );
}