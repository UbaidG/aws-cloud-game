/**
 * GPU resource cleanup. Three.js never frees geometry, materials or textures on its own, so every
 * object the renderer removes goes through `disposeObject`. Resources shared between many objects
 * (pooled materials, cached icon textures) are registered with `markShared` and left alone.
 */

import * as THREE from 'three';

type Resource = THREE.BufferGeometry | THREE.Material | THREE.Texture;

const shared = new WeakSet<Resource>();

export function markShared<T extends Resource>(resource: T): T {
  shared.add(resource);
  return resource;
}

const TEXTURE_KEYS = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'emissiveMap',
  'lightMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'specularIntensityMap',
  'transmissionMap',
] as const;

function disposeMaterial(material: THREE.Material): void {
  if (shared.has(material)) return;
  const record = material as unknown as Record<string, unknown>;
  for (const key of TEXTURE_KEYS) {
    const tex = record[key];
    if (tex instanceof THREE.Texture && !shared.has(tex)) tex.dispose();
  }
  material.dispose();
}

/** Remove `root` from its parent and free every GPU resource under it that isn't shared. */
export function disposeObject(root: THREE.Object3D): void {
  root.removeFromParent();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !shared.has(mesh.geometry)) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach(disposeMaterial);
    else if (material) disposeMaterial(material);
    if (obj instanceof THREE.InstancedMesh) obj.dispose();
  });
}
