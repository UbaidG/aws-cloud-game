/**
 * Realistic model library. Loads the Blender-built models (`public/models/<type>.glb`, built by
 * `art/build.mjs`) on demand and turns each into a template:
 *
 * - every `cc_<name>` material becomes a shared Three.js material built from `art/palette.json`
 *   (accent colours come from the model's manifest entry), keeping the model's baked AO map;
 * - `badge` meshes get the service icon texture, with planar UVs generated here;
 * - all geometry, materials and textures are marked shared, so instances are cheap clones.
 *
 * Instances get their own LED material so each block can show its own health.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import palette from '../../../art/palette.json';
import type { ServiceType } from '../../engine';
import { markShared } from '../disposal';
import { getAwsServiceTileTexture } from './awsIconCanvas';
import manifestJson from './models.json';

interface PaletteEntry {
  color: string;
  metal?: number;
  rough?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
}

export interface ModelMeta {
  name: string;
  accent: string;
  height: number;
  footprint: [number, number];
  triangles: number;
  sockets: Record<string, [number, number, number]>;
  groups: string[];
  bytes: number;
}

export const MODEL_MANIFEST = manifestJson as unknown as Record<string, ModelMeta>;
const PALETTE = palette as unknown as Record<string, PaletteEntry>;

export interface ModelInstance {
  root: THREE.Group;
  height: number;
  /** Parts with idle animation (userData.spinY / bobY). */
  animated: THREE.Object3D[];
  /** This instance's LED material (health colour), if the model has LEDs. */
  led: THREE.MeshStandardMaterial | null;
}

interface Template {
  scene: THREE.Group;
  meta: ModelMeta;
}

function darker(hex: string, f = 0.55): THREE.Color {
  return new THREE.Color(hex).multiplyScalar(f);
}

/** Material for one palette key, for one model (the AO map and accent colour are per model). */
function paletteMaterial(key: string, meta: ModelMeta, aoMap: THREE.Texture | null): THREE.Material {
  const spec = PALETTE[key] ?? PALETTE.steel;
  const color =
    key === 'accent' || key === 'accent_glow'
      ? new THREE.Color(meta.accent)
      : key === 'accent_dark'
        ? darker(meta.accent)
        : new THREE.Color(spec.color);
  const mat = new THREE.MeshStandardMaterial({
    name: `cc_${key}`,
    color,
    metalness: spec.metal ?? 0,
    roughness: spec.rough ?? 0.5,
  });
  if (spec.emissive) {
    mat.emissive = key === 'accent_glow' ? new THREE.Color(meta.accent) : new THREE.Color(spec.emissive);
    mat.emissiveIntensity = spec.emissiveIntensity ?? 1;
  }
  if (spec.opacity !== undefined) {
    mat.transparent = true;
    mat.opacity = spec.opacity;
    mat.depthWrite = false;
  }
  if (aoMap) {
    mat.aoMap = aoMap;
    mat.aoMapIntensity = 1;
  }
  return markShared(mat);
}

const badgeMaterials = new Map<ServiceType, THREE.Material>();
function badgeMaterial(type: ServiceType): THREE.Material {
  let mat = badgeMaterials.get(type);
  if (!mat) {
    const map = getAwsServiceTileTexture(type);
    mat = markShared(
      new THREE.MeshStandardMaterial({ name: 'cc_badge', map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.5 }),
    );
    badgeMaterials.set(type, mat);
  }
  return mat;
}

/** Planar UVs across a flat badge, oriented so the icon reads upright from the board camera. */
function badgeUVs(geometry: THREE.BufferGeometry): void {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = box.getSize(new THREE.Vector3());
  const pos = geometry.getAttribute('position');
  const normal = new THREE.Vector3().fromBufferAttribute(geometry.getAttribute('normal'), 0);
  const uv = new Float32Array(pos.count * 2);
  const axis = size.x < size.y && size.x < size.z ? 'x' : size.y < size.z ? 'y' : 'z';
  for (let i = 0; i < pos.count; i++) {
    const x = (pos.getX(i) - box.min.x) / (size.x || 1);
    const y = (pos.getY(i) - box.min.y) / (size.y || 1);
    const z = (pos.getZ(i) - box.min.z) / (size.z || 1);
    let u: number;
    let v: number;
    if (axis === 'z') [u, v] = [normal.z >= 0 ? x : 1 - x, y];
    else if (axis === 'y') [u, v] = [x, 1 - z];
    else [u, v] = [normal.x >= 0 ? 1 - z : z, y];
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

const IDLE_SPIN = 1.2;

class ModelLibrary {
  private readonly loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  private readonly templates = new Map<ServiceType, Template>();
  private readonly pending = new Map<ServiceType, Promise<Template | null>>();
  private readonly listeners = new Set<(type: ServiceType) => void>();
  /** Base URL for model files (Vite's BASE_URL in the app; overridable for tests). */
  baseUrl = (import.meta.env?.BASE_URL ?? '/') + 'models/';
  enabled = true;

  has(type: ServiceType): boolean {
    return type in MODEL_MANIFEST;
  }

  isLoaded(type: ServiceType): boolean {
    return this.templates.has(type);
  }

  /** Called whenever a model finishes loading, so views can swap placeholders for it. */
  onLoaded(fn: (type: ServiceType) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  load(type: ServiceType): Promise<Template | null> {
    if (!this.enabled || !this.has(type)) return Promise.resolve(null);
    const done = this.templates.get(type);
    if (done) return Promise.resolve(done);
    let p = this.pending.get(type);
    if (!p) {
      const meta = MODEL_MANIFEST[type];
      p = this.loader
        .loadAsync(`${this.baseUrl}${type}.glb?v=${meta.bytes}`)
        .then((gltf) => {
          const template = this.prepare(type, gltf.scene, meta);
          this.templates.set(type, template);
          for (const fn of this.listeners) fn(type);
          return template;
        })
        .catch((err) => {
          console.warn(`[models] ${type} failed to load; keeping the procedural model.`, err);
          return null;
        });
      this.pending.set(type, p);
    }
    return p;
  }

  preload(types: Iterable<ServiceType>): void {
    for (const t of new Set(types)) void this.load(t);
  }

  private prepare(type: ServiceType, scene: THREE.Group, meta: ModelMeta): Template {
    const materials = new Map<string, THREE.Material>();
    let aoMap: THREE.Texture | null = null;
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const m = mesh.material as THREE.MeshStandardMaterial;
      if (m.aoMap && !aoMap) aoMap = markShared(m.aoMap);
    });
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      markShared(mesh.geometry);
      const old = mesh.material as THREE.MeshStandardMaterial;
      const key = old.name.replace(/^cc_/, '');
      if (key === 'badge') {
        badgeUVs(mesh.geometry);
        mesh.material = badgeMaterial(type);
      } else {
        let mat = materials.get(key);
        if (!mat) {
          mat = paletteMaterial(key, meta, ['led', 'glow', 'accent_glow', 'screen', 'glass'].includes(key) ? null : aoMap);
          materials.set(key, mat);
        }
        mesh.material = mat;
        mesh.castShadow = key !== 'glass' && key !== 'led';
        mesh.receiveShadow = true;
      }
      old.dispose();
    });
    scene.traverse((obj) => {
      if (obj.name.startsWith('spin_')) obj.userData.spinY = IDLE_SPIN;
      if (obj.name.startsWith('bob_')) {
        obj.userData.bobY = true;
        obj.userData.baseY = obj.position.y;
      }
    });
    return { scene, meta };
  }

  /** A new instance of a loaded model, or null if it isn't loaded (yet). */
  instantiate(type: ServiceType): ModelInstance | null {
    const t = this.templates.get(type);
    if (!t) return null;
    const root = t.scene.clone(true) as THREE.Group;
    root.name = `model_${type}`;
    let led: THREE.MeshStandardMaterial | null = null;
    const animated: THREE.Object3D[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && (mesh.material as THREE.Material).name === 'cc_led') {
        // Per-instance LED material (not shared): disposed with the block.
        led ??= (mesh.material as THREE.MeshStandardMaterial).clone();
        mesh.material = led;
      }
      if (obj.userData.spinY || obj.userData.bobY) animated.push(obj);
    });
    return { root, height: t.meta.height, animated, led };
  }
}

export const modelLibrary = new ModelLibrary();
