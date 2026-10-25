/**
 * Model factory: the single place the renderer gets a 3D model for a service type.
 *
 * Realistic Blender-built models come from the model library once loaded. Until then (or if a
 * file fails to load) the procedural voxel model stands in, so a block is never invisible;
 * BlockLayer swaps the stand-in for the real model when it arrives.
 */

import * as THREE from 'three';
import type { ServiceType } from '../engine';
import { modelLibrary } from './assets/library';
import { createComponentVoxelModel } from './assets/voxelAssets';

export interface ServiceModel {
  root: THREE.Group;
  /** Height of the model's bounding box, for labels and effects. */
  height: number;
  /** Parts with idle animation (fans, dishes, floating cores). */
  animated: THREE.Object3D[];
  /** Per-instance LED material that shows the block's health (realistic models only). */
  led: THREE.MeshStandardMaterial | null;
  /** False while the procedural stand-in is shown. */
  realistic: boolean;
}

const heights = new Map<ServiceType, number>();

export function createServiceModel(type: ServiceType): ServiceModel {
  const real = modelLibrary.instantiate(type);
  if (real) return { ...real, realistic: true };
  void modelLibrary.load(type);

  const root = createComponentVoxelModel(type);
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  const animated: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (obj.userData?.spinY || obj.userData?.bobY) animated.push(obj);
  });
  let height = heights.get(type);
  if (height === undefined) {
    height = new THREE.Box3().setFromObject(root).max.y;
    heights.set(type, height);
  }
  return { root, height, animated, led: null, realistic: false };
}

/** Advance idle animation for one model. */
export function animateModel(model: ServiceModel, dt: number, elapsed: number): void {
  for (const part of model.animated) {
    const data = part.userData as { spinY?: number; bobY?: boolean; baseY?: number };
    if (data.spinY) part.rotation.y += dt * data.spinY;
    if (data.bobY) part.position.y = (data.baseY ?? 0.9) + Math.sin(elapsed * 3) * 0.06;
  }
}
