import * as THREE from 'three';

/**
 * Creates a custom MeshDepthMaterial for robust shadow casting.
 * This material includes a "Normal Nudge" in the vertex shader to prevent self-shadowing acne,
 * allowing us to use much tighter biases for sharper shadows.
 * 
import * as THREE from 'three';

/**
 * Creates a custom MeshDepthMaterial for robust shadow casting.
 * This material includes a "Normal Nudge" in the vertex shader to prevent self-shadowing acne,
 * allowing us to use much tighter biases for sharper shadows.
 * 
 * Logic based on "The Perfect Shadow" architecture:
 * 1. RGBADepthPacking for precision.
 * 2. PolygonOffset to push depth back slightly.
 * 3. Vertex Normal offset to push geometry out slightly during shadow pass.
 */
export function createCustomShadowMaterial(
  { offset = 0.0008 }: { offset?: number } = {}
): THREE.MeshDepthMaterial {

  const material = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
  });

  // Small polygon offset to handle coplanar surfaces
  material.polygonOffset = true;
  material.polygonOffsetFactor = 1;
  material.polygonOffsetUnits = 2;

  material.onBeforeCompile = (shader) => {
    // Inject the "Normal Nudge" logic into <begin_vertex>
    // <begin_vertex> normally contains: "vec3 transformed = vec3( position );"
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      vec3 transformed = vec3( position );
      
      // Push vertex along normal to reduce shadow acne
      // We use the 'normal' attribute which is available in MeshDepthMaterial
      vec3 objectNormal = normalize( normal );
      transformed += objectNormal * ${offset.toFixed(5)};
      `
    );
  };

  return material;
}
