import * as THREE from 'three';

export interface FresnelMaterialOptions {
  fresnelColor?: string;
  baseColor?: string;
  amount?: number;
  offset?: number;
  intensity?: number;
  fresnelAlpha?: number;
  alpha?: boolean;
  time?: number;
}

class FresnelMaterial extends THREE.ShaderMaterial {
  private _time: number = 0;
  private _animationSpeed: number = 2.0;
  private _pulseIntensity: number = 0.5;

  constructor(options: FresnelMaterialOptions = {}) {
    const uniforms = {
      uFresnelColor: { value: new THREE.Color(options.fresnelColor || '#00d5ff') },
      uBaseColor: { value: new THREE.Color(options.baseColor || '#0777fd') },
      uFresnelAmt: { value: options.amount || 1.5 },
      uFresnelOffset: { value: options.offset || 0.05 },
      uFresnelIntensity: { value: options.intensity || 1.5 },
      uFresnelAlpha: { value: options.fresnelAlpha || 1.0 },
      uTime: { value: 0.0 }
    };

    const vertexShader = /*glsl*/ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec3 vView;
      varying vec3 vNormal;

      void main() {
        vec3 objectPosition = (modelMatrix * vec4(position, 1.0)).xyz;

        vView = normalize(cameraPosition - objectPosition);
        vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        #include <logdepthbuf_vertex>
      }
    `;

    const fragmentShader = /*glsl*/ `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      uniform vec3 uFresnelColor;
      uniform vec3 uBaseColor;
      uniform float uFresnelAmt;
      uniform float uFresnelOffset;
      uniform float uFresnelIntensity;
      uniform float uFresnelAlpha;
      uniform float uTime;

      varying vec3 vView;
      varying vec3 vNormal;

      float lambertLighting(vec3 normal, vec3 viewDirection) {
        return max(dot(normal, viewDirection), 0.0);
      }

      float fresnelFunc(float amount, float offset, vec3 normal, vec3 view) {
        return offset + (1.0 - offset) * pow(1.0 - dot(normal, view), amount);
      }

      void main() {
        // Add pulsating effect
        float pulse = sin(uTime * 3.0) * 0.3 + 0.7; // Oscillates between 0.4 and 1.0
        
        // Fresnel effect
        float fresnel = fresnelFunc(uFresnelAmt, uFresnelOffset, vNormal, vView);
        vec3 fresnelColor = (uFresnelColor * fresnel) * uFresnelIntensity * pulse;

        // Lambert diffuse lighting
        float diffuse = lambertLighting(vNormal, vView);
        vec3 diffuseColor = uBaseColor * diffuse * pulse;

        vec3 finalColor = mix(diffuseColor, fresnelColor, fresnel * uFresnelAlpha);
        
        // Add some transparency variation for holographic effect
        float alpha = ${options.alpha ? 'fresnel * pulse' : 'pulse'};

        gl_FragColor = vec4(finalColor, alpha);
        #include <logdepthbuf_fragment>
      }
    `;

    super({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });

    // Store animation parameters
    this._animationSpeed = options.time || 2.0;
  }

  update() {
    this._time += 0.016; // Roughly 60 FPS
    this.uniforms.uTime.value = this._time * this._animationSpeed;
    this.needsUpdate = true;
  }

  // Getter/setter for easy color changes
  get fresnelColor(): THREE.Color {
    return this.uniforms.uFresnelColor.value;
  }

  set fresnelColor(color: THREE.Color | string) {
    this.uniforms.uFresnelColor.value = typeof color === 'string' 
      ? new THREE.Color(color) 
      : color;
  }

  get intensity(): number {
    return this.uniforms.uFresnelIntensity.value;
  }

  set intensity(value: number) {
    this.uniforms.uFresnelIntensity.value = value;
  }
}

export default FresnelMaterial;