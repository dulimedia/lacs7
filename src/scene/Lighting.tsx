import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { DirectionalLight, AmbientLight } from "three";
import { configureDirectionalShadows } from "../three/renderer/configureShadows";
import { useFitDirectionalLightShadow } from "./ShadowFit";
import { logger } from "../utils/logger";
import { PerfFlags } from "../perf/PerfFlags";

export interface LightingProps {
  shadowBias?: number;
  shadowNormalBias?: number;
  shadowMaxExtent?: number;
  shadowMargin?: number;
  sunPosition?: [number, number, number];
  onLightCreated?: (light: DirectionalLight) => void;
}

export function Lighting({
  shadowBias,
  shadowNormalBias,
  shadowMaxExtent,
  shadowMargin,
  sunPosition,
  onLightCreated
}: LightingProps = {}) {
  const { scene, gl } = useThree();
  const sunRef = useRef<DirectionalLight | null>(null);
  const isMobileRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const setupLighting = () => {
      const tier = PerfFlags.qualityTier === 'LOW'
        ? 'mobile-low'
        : PerfFlags.qualityTier === 'BALANCED'
          ? 'mobile-high'
          : 'desktop-high';
      const isMobileLow = tier === 'mobile-low';
      const isMobileHigh = tier === 'mobile-high';
      const isMobile = isMobileLow || isMobileHigh;
      isMobileRef.current = isMobile;
      if (cancelled) return;

      const resolvedSunPosition: [number, number, number] = sunPosition ?? [-40, 30, 20];

      const oldLights = scene.children.filter(o => o.userData.__sunLight || o.userData.__ambientLight);
      oldLights.forEach(o => scene.remove(o));

      // 1. DIRECTIONAL SUN
      const sun = new DirectionalLight(0xffffff, isMobile ? 3.2 : 7.2);
      sun.position.set(...resolvedSunPosition);
      sun.userData.__sunLight = true;

      // New: Centralized configuration logic
      configureDirectionalShadows(sun, gl);

      // Standard PCF Soft cleanup - no VSM radius
      if (!isMobile) {
        // sun.shadow.radius = 3; // Ineffective on PCFSoft without custom shader
      }

      scene.add(sun);
      sunRef.current = sun;

      // 2. AMBIENT LIGHT (Kept logic for intensity/color tiers)
      if (isMobileLow) {
        const ambient = new AmbientLight(0x404040, 0.4);
        ambient.userData.__ambientLight = true;
        scene.add(ambient);
      } else if (isMobileHigh) {
        const ambient = new AmbientLight(0x303030, 0.3);
        ambient.userData.__ambientLight = true;
        scene.add(ambient);
      } else {
        const ambient = new AmbientLight(0x404040, 0.1);
        ambient.userData.__ambientLight = true;
        scene.add(ambient);
      }

      onLightCreated?.(sun);
      console.log(`Lighting configured for ${tier} (Shadows: ${sun.castShadow ? 'ON' : 'OFF'})`);
    };

    setupLighting();

    return () => {
      cancelled = true;
      const lights = scene.children.filter(o => o.userData.__sunLight || o.userData.__ambientLight);
      lights.forEach(l => scene.remove(l));
      sunRef.current = null;
    };
  }, [scene, gl, shadowBias, shadowNormalBias, sunPosition, onLightCreated]);

  useFitDirectionalLightShadow(
    isMobileRef.current ? null : sunRef.current,
    {
      maxExtent: shadowMaxExtent ?? PerfFlags.SHADOW_MAX_EXTENT,
      margin: shadowMargin ?? PerfFlags.SHADOW_MARGIN,
      mapSize: PerfFlags.SHADOW_MAP_SIZE,
      snap: true
    }
  );

  return null;
}
