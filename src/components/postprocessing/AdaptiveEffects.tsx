import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import type { Tier } from '../../lib/graphics/tier';

interface AdaptiveEffectsProps {
  tier: Tier;
}

import { RENDER_FLAGS } from '../../config/renderFlags';

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

  return (
    <EffectComposer resolutionScale={tier.startsWith('desktop') ? 0.75 : 0.5}>
      {RENDER_FLAGS.ENABLE_BLOOM ? (
        <Bloom
          intensity={tier.startsWith('desktop') ? 0.6 : 0.35}
          luminanceThreshold={0.7}
          mipmapBlur
          height={Math.floor(window.innerHeight * (tier.startsWith('desktop') ? 0.75 : 0.5))}
        />
      ) : null}
      <Noise opacity={0.02} />
    </EffectComposer>
  );
}