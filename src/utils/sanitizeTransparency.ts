import * as THREE from 'three';
import { log } from './debugFlags';

export function sanitizeTransparency(root: THREE.Object3D, boostOpacity = false) {
  let fixed = 0;
  let potentialIssues = 0;
  
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    
    const hasTransparent = mats.some((m: any) => m && m.transparent);
    if (hasTransparent && o.frustumCulled !== false) {
      o.frustumCulled = false;
      log.verbose(`🔧 Disabled frustum culling on transparent mesh: ${o.name || 'unnamed'}`);
      fixed++;
    }
    
    mats.forEach((m: any) => {
      if (!m) return;
      
      log.verbose(`🔍 Material on ${o.name || 'unnamed'}: transparent=${m.transparent}, opacity=${m.opacity}, depthWrite=${m.depthWrite}, depthTest=${m.depthTest}, side=${m.side}`);
      
      if (m.transparent && m.opacity >= 0.99) {
        m.transparent = false;
        m.depthWrite = true;
        m.needsUpdate = true;
        fixed++;
      }
      
      if (m.transparent && m.opacity < 0.01) {
        potentialIssues++;
      }
      
      if (m.transparent && m.depthWrite === false) {
        m.depthWrite = true;
        m.needsUpdate = true;
        fixed++;
      }
      
      if (m.transparent && m.opacity < 1.0 && m.opacity > 0.01) {
        if (boostOpacity && m.opacity < 0.7) {
          const oldOpacity = m.opacity;
          m.opacity = Math.min(0.85, m.opacity * 1.5);
          log.verbose(`🔆 Boosted opacity on ${o.name || 'unnamed'}: ${oldOpacity.toFixed(2)} → ${m.opacity.toFixed(2)}`);
          fixed++;
        }
        
        if (m.alphaTest === 0) {
          m.depthWrite = true;
          m.depthTest = true;
          log.verbose(`🔧 Fixed transparent material on: ${o.name || 'unnamed'}`);
          fixed++;
        } else {
          m.transparent = false;
          m.alphaToCoverage = true;
          log.verbose(`🔧 Converted to cutout material on: ${o.name || 'unnamed'}`);
          fixed++;
        }
        m.needsUpdate = true;
      }
    });
  });
  
}

export function addPolyOffset(mesh: THREE.Mesh, factor = 1, units = 1) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  mats.forEach((m: any) => {
    if (!m) return;
    m.polygonOffset = true;
    m.polygonOffsetFactor = factor;
    m.polygonOffsetUnits = units;
    m.needsUpdate = true;
  });
}

export function nudgeMaterial(mat: THREE.Material & any, amount = 0.0008) {
  mat.onBeforeCompile = (shader: any) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed += normal * ${amount.toFixed(6)};`
    );
  };
  mat.needsUpdate = true;
}
