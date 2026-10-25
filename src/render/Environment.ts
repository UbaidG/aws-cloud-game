/**
 * The world around the board: the data hall it stands in. A dark polished floor, rows of server
 * racks with blinking LEDs behind the VPC, and a lit city skyline behind the internet zone (where
 * the users live). Everything is instanced and static, and counts scale with the quality tier.
 */

import * as THREE from 'three';
import { BOARD } from '../engine';
import { disposeObject } from './disposal';
import type { QualityTier } from './quality';

const TILE = BOARD.tileSize;
const FLOOR_Y = -0.6;

/** Deterministic pseudo-random numbers, so the skyline is the same on every load. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Office windows: mostly dark, some warm, a few cool. Used as both colour and glow. */
function windowTexture(): THREE.CanvasTexture {
  const rand = rng(7);
  return canvasTexture(64, 128, (g) => {
    g.fillStyle = '#0b0f17';
    g.fillRect(0, 0, 64, 128);
    for (let y = 4; y < 124; y += 8) {
      for (let x = 4; x < 60; x += 8) {
        const r = rand();
        g.fillStyle = r < 0.55 ? '#141a24' : r < 0.85 ? '#f6c56b' : '#9cd3ff';
        g.fillRect(x, y, 5, 5);
      }
    }
  });
}

/** A rack front: dark bezel with rows of status LEDs. */
function rackTexture(): THREE.CanvasTexture {
  const rand = rng(11);
  return canvasTexture(32, 128, (g) => {
    g.fillStyle = '#05070b';
    g.fillRect(0, 0, 32, 128);
    for (let y = 3; y < 125; y += 6) {
      g.fillStyle = '#10141c';
      g.fillRect(2, y, 28, 4);
      if (rand() < 0.7) {
        g.fillStyle = rand() < 0.8 ? '#22c55e' : '#38bdf8';
        g.fillRect(4 + Math.floor(rand() * 3) * 3, y + 1, 2, 2);
      }
    }
  });
}

export class Environment {
  readonly group = new THREE.Group();
  private readonly rackGlow: THREE.MeshStandardMaterial | null = null;
  private elapsed = 0;

  constructor(tier: QualityTier) {
    this.group.name = 'environment';
    const halfW = ((BOARD.maxX - BOARD.minX + 1) * TILE) / 2 + 0.6;
    const halfD = ((BOARD.maxZ - BOARD.minZ + 1) * TILE) / 2 + 0.6;

    // Hall floor: dark, slightly glossy, with a faint tile grid.
    const grid = canvasTexture(64, 64, (g) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#c4c8d0';
      g.fillRect(0, 0, 64, 1);
      g.fillRect(0, 0, 1, 64);
    });
    grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
    grid.repeat.set(60, 60);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 140).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x0e1219, map: grid, roughness: 0.35, metalness: 0.6 }),
    );
    floor.position.y = FLOOR_Y;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Rack rows behind the board (the VPC's side of the hall).
    const rows = tier === 'low' ? 1 : 2;
    const perRow = tier === 'low' ? 10 : 16;
    const rackW = 0.9;
    const rackGeo = new THREE.BoxGeometry(rackW, 2.3, 1.1);
    rackGeo.translate(0, 1.15, 0);
    const face = rackTexture();
    const glow = new THREE.MeshStandardMaterial({ color: 0x1a1f28, map: face, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 1.2, roughness: 0.5, metalness: 0.5 });
    const body = new THREE.MeshStandardMaterial({ color: 0x151a22, roughness: 0.55, metalness: 0.6 });
    // Box faces: +x, -x, +y, -y, +z (front), -z.
    const racks = new THREE.InstancedMesh(rackGeo, [body, body, body, body, glow, body], rows * perRow);
    this.rackGlow = glow;
    const m = new THREE.Matrix4();
    let i = 0;
    for (let r = 0; r < rows; r++) {
      const z = -halfD - 7 - r * 3.4;
      for (let k = 0; k < perRow; k++) {
        const x = -2 + (k - perRow / 2) * (rackW + 0.04) + TILE * 2;
        m.makeTranslation(x, FLOOR_Y, z);
        racks.setMatrixAt(i++, m);
      }
    }
    racks.castShadow = tier === 'high';
    this.group.add(racks);

    // Cable tray above each row.
    for (let r = 0; r < rows; r++) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(perRow * (rackW + 0.04), 0.08, 0.5), body);
      tray.position.set(-2 + TILE * 2 - (rackW + 0.04) / 2, FLOOR_Y + 2.6, -halfD - 7 - r * 3.4);
      this.group.add(tray);
    }

    // Skyline behind the internet zone: towers fanned out on the left and back-left.
    const towers = tier === 'low' ? 14 : tier === 'medium' ? 26 : 36;
    const windows = windowTexture();
    windows.wrapS = windows.wrapT = THREE.RepeatWrapping;
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x2a3140, map: windows, emissive: 0xffffff, emissiveMap: windows, emissiveIntensity: 0.7, roughness: 0.6, metalness: 0.3 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.8 });
    const towerGeo = new THREE.BoxGeometry(1, 1, 1);
    towerGeo.translate(0, 0.5, 0);
    const city = new THREE.InstancedMesh(towerGeo, [towerMat, towerMat, roofMat, roofMat, towerMat, towerMat], towers);
    const rand = rng(3);
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    for (let t = 0; t < towers; t++) {
      // Arc from the left side round to the back-left corner.
      const a = Math.PI * (0.55 + rand() * 0.55);
      const dist = halfW + 16 + rand() * 22;
      pos.set(Math.cos(a) * dist - 4, FLOOR_Y, Math.sin(-a) * dist * 0.6 - 2);
      const h = 4 + rand() * rand() * 18;
      const w = 1.4 + rand() * 2.2;
      scale.set(w, h, w * (0.7 + rand() * 0.6));
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 0.4);
      city.setMatrixAt(t, m.compose(pos, q, scale));
    }
    this.group.add(city);
    // Window rows stay roughly square whatever the tower's scale.
    towerMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
        #ifdef USE_INSTANCING
          vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
          float across = abs(normal.x) > 0.5 ? s.z : s.x;
          vMapUv = uv * vec2(across * 0.8, s.y * 0.45);
          vEmissiveMapUv = vMapUv;
        #endif`,
      );
    };
  }

  update(dt: number): void {
    this.elapsed += dt;
    // A slow shimmer across the rack LEDs.
    if (this.rackGlow) this.rackGlow.emissiveIntensity = 1.1 + Math.sin(this.elapsed * 1.7) * 0.15;
  }

  dispose(): void {
    disposeObject(this.group);
  }
}
