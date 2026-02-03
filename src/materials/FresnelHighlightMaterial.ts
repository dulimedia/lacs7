import * as THREE from 'three';

export function createFresnelHighlightMaterial({
  color = '#80d4ff',   // much brighter blue
  opacity = 0.55,      // much higher opacity
  bias = 0.1,
  scale = 1.5,
  power = 3.0,
  doubleSide = true,
  depthTest = false,   // disable depth test to always show through
  depthWrite = false,  // keep depth write off to prevent conflicts
}: {
  color?: string;
  opacity?: number;
  bias?: number;
  scale?: number;
  power?: number;
  doubleSide?: boolean;
  depthTest?: boolean;
  depthWrite?: boolean;
} = {}) {
  const uniforms = {
    uColor:   { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uBias:    { value: bias },
    uScale:   { value: scale },
    uPower:   { value: power },
  };

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: depthTest,    // configurable: prevents z-fighting when false
    depthWrite: depthWrite,   // configurable: prevents depth conflicts when false
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    uniforms,
    vertexShader: `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uBias;
      uniform float uScale;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      void main() {
        // View dir in world space
        vec3 cameraToFrag = normalize(cameraPosition - vWorldPos);
        // Fresnel term
        float fresnel = uBias + uScale * pow(1.0 - max(dot(vNormal, cameraToFrag), 0.0), uPower);
        fresnel = clamp(fresnel, 0.0, 1.0);

        // Distance-based dimming for depth perception
        float distanceFromCamera = length(cameraPosition - vWorldPos);
        float distanceFactor = smoothstep(50.0, 200.0, distanceFromCamera); // Dim over distance
        float depthDimming = mix(1.0, 0.4, distanceFactor); // Never goes below 40% brightness
        
        // Maximum visibility translucent edge color - significantly increased intensity
        vec3 col = uColor * (2.5 + 2.5 * fresnel);  // Dramatically increased brightness
        
        // Maximum bloom effect for maximum visibility
        float bloomBoost = fresnel * 8.0; // Much higher bloom intensity
        col = col + uColor * bloomBoost * 1.5; // Massive bloom contribution
        
        // Apply depth-based dimming while maintaining minimum visibility
        col = col * depthDimming;
        
        // Apply enhanced opacity with fresnel-based variation for maximum visibility
        float finalOpacity = uOpacity * (1.2 + 0.8 * fresnel) * max(0.5, depthDimming); // Never less than 50% opacity
        gl_FragColor = vec4(col, finalOpacity);
        #include <logdepthbuf_fragment>
      }
    `
  });

  // Set high render order to ensure it draws on top
  mat.renderOrder = 999;
  return mat;
}