import * as THREE from 'three';

export const createGlowMaterial = (color = 0x3b82f6) => {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 1.0,
    depthTest: false,   // key: ignore depth tests - shows through everything
    depthWrite: false,  // key: don't write to depth buffer
    blending: THREE.AdditiveBlending, // makes it feel like light
    side: THREE.FrontSide,
    emissive: new THREE.Color(color), // makes it glow and respond to bloom
    emissiveIntensity: 0.5, // boost emissive for stronger bloom effect
  });
};

// Alternative fresnel-based glow material for more sophisticated effect
export const createFresnelGlowMaterial = (options: {
  color?: string;
  opacity?: number;
  bias?: number;
  scale?: number;
  power?: number;
}) => {
  const {
    color = '#3b82f6',
    opacity = 0.8,
    bias = 0.1,
    scale = 1.5,
    power = 3.0
  } = options;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uBias: { value: bias },
      uScale: { value: scale },
      uPower: { value: power },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uBias;
      uniform float uScale;
      uniform float uPower;
      
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      
      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = uBias + uScale * pow(1.0 - max(dot(viewDir, vNormal), 0.0), uPower);
        
        // Make it emissive for bloom
        vec3 emissive = uColor * fresnel * 2.0;
        
        gl_FragColor = vec4(emissive, fresnel * uOpacity);
      }
    `,
    transparent: true,
    depthTest: false,    // key: shows through everything
    depthWrite: false,   // key: doesn't affect depth buffer
    blending: THREE.AdditiveBlending, // additive for glow effect
    side: THREE.DoubleSide,
  });

  return material;
};