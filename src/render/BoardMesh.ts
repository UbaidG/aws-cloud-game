/**
 * The board diorama: a raised floor of tiles per zone, the VPC enclosure, the AZ divider, and
 * the overlays drawn on tiles (hover, legal placement, target ghosts, selection ring).
 *
 * Tiles are one InstancedMesh, so recolouring the whole board is a single buffer upload.
 */

import * as THREE from 'three';
import { BOARD, CATALOG, ZONES, gridToWorld, inBounds, zoneAt } from '../engine';
import type { ServiceType, TargetPlacement } from '../engine';
import { disposeObject, markShared } from './disposal';

const TILE = BOARD.tileSize;
const TILE_TOP = 0.12;
const COLS = BOARD.maxX - BOARD.minX + 1;
const ROWS = BOARD.maxZ - BOARD.minZ + 1;

const tileIndex = (gx: number, gz: number) => (gx - BOARD.minX) * ROWS + (gz - BOARD.minZ);

/** Raised-floor steel, tinted just enough that each zone reads as its own room. */
const FLOOR = new THREE.Color(0x6b7280);
const ZONE_TILE: Record<string, THREE.Color> = Object.fromEntries(
  ZONES.map((z) => [z.id, FLOOR.clone().lerp(new THREE.Color(z.color), 0.14)]),
);

let perforated: THREE.CanvasTexture | null = null;
/** A perforated data-centre floor panel: bevelled rim, a grid of airflow holes. Shared by every tile. */
function perforatedTexture(): THREE.CanvasTexture {
  if (perforated) return perforated;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#c9ccd2';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#e4e6ea';
  g.fillRect(0, 0, size, 4);
  g.fillRect(0, 0, 4, size);
  g.fillStyle = '#8e939c';
  g.fillRect(0, size - 4, size, 4);
  g.fillRect(size - 4, 0, 4, size);
  g.fillStyle = '#7c818a';
  const step = 10;
  for (let y = 24; y <= size - 24; y += step) {
    for (let x = 24; x <= size - 24; x += step) {
      g.beginPath();
      g.arc(x, y, 2.2, 0, Math.PI * 2);
      g.fill();
    }
  }
  perforated = new THREE.CanvasTexture(canvas);
  perforated.colorSpace = THREE.SRGBColorSpace;
  perforated.anisotropy = 4;
  return markShared(perforated);
}

const LEGAL = new THREE.Color(0x22c55e);
const ILLEGAL = new THREE.Color(0x7f1d1d);
const HOVER = new THREE.Color(0xffffff);

export class BoardMesh {
  readonly group = new THREE.Group();
  /** Invisible plane used to pick tiles. */
  readonly pickPlane: THREE.Mesh;
  private readonly tiles: THREE.InstancedMesh;
  private readonly baseColors: THREE.Color[] = [];
  private readonly targetGroup = new THREE.Group();
  private readonly selectionRing: THREE.Mesh;
  private readonly wireSourceRing: THREE.Mesh;
  private hover: { gx: number; gz: number } | null = null;
  private placing: ServiceType | null = null;
  private targetKey = '';
  private elapsed = 0;

  constructor() {
    this.group.name = 'board';

    // Plinth under the whole board.
    const width = COLS * TILE + 1.2;
    const depth = ROWS * TILE + 1.2;
    const plinth = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.6, depth),
      new THREE.MeshStandardMaterial({ color: 0x1b1f27, roughness: 0.7, metalness: 0.4 }),
    );
    plinth.position.y = -0.3;
    plinth.receiveShadow = true;
    this.group.add(plinth);

    // Floor tiles.
    const tileGeo = new THREE.BoxGeometry(TILE * 0.97, TILE_TOP, TILE * 0.97);
    tileGeo.translate(0, TILE_TOP / 2, 0);
    const tileMat = new THREE.MeshStandardMaterial({ map: perforatedTexture(), roughness: 0.62, metalness: 0.45 });
    this.tiles = new THREE.InstancedMesh(tileGeo, tileMat, COLS * ROWS);
    this.tiles.receiveShadow = true;
    const m = new THREE.Matrix4();
    for (let gx = BOARD.minX; gx <= BOARD.maxX; gx++) {
      for (let gz = BOARD.minZ; gz <= BOARD.maxZ; gz++) {
        const { x, z } = gridToWorld(gx, gz);
        const i = tileIndex(gx, gz);
        m.makeTranslation(x, 0, z);
        this.tiles.setMatrixAt(i, m);
        const base = ZONE_TILE[zoneAt(gx)].clone();
        // A faint checker so individual tiles read at a glance.
        if ((gx + gz) % 2 === 0) base.multiplyScalar(1.06);
        this.baseColors[i] = base;
        this.tiles.setColorAt(i, base);
      }
    }
    this.group.add(this.tiles);

    this.addZoneTrim();

    const pickGeo = new THREE.PlaneGeometry(width, depth);
    pickGeo.rotateX(-Math.PI / 2);
    this.pickPlane = new THREE.Mesh(pickGeo, new THREE.MeshBasicMaterial({ visible: false }));
    this.pickPlane.position.y = TILE_TOP;
    this.group.add(this.pickPlane);

    this.group.add(this.targetGroup);

    const ring = (color: number) => {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.62, 0.74, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }),
      );
      mesh.position.y = TILE_TOP + 0.02;
      mesh.visible = false;
      this.group.add(mesh);
      return mesh;
    };
    this.selectionRing = ring(0x38bdf8);
    this.wireSourceRing = ring(0xfacc15);
  }

  /** Glowing floor markings around each zone, the VPC wall and the AZ divider. */
  private addZoneTrim(): void {
    const zMin = (BOARD.minZ - 0.5) * TILE;
    const zMax = (BOARD.maxZ + 0.5) * TILE;
    const depth = zMax - zMin;
    const line = 0.06;
    for (const zone of ZONES) {
      const x0 = (zone.minX - 0.5) * TILE + 0.08;
      const x1 = (zone.maxX + 0.5) * TILE - 0.08;
      const mat = new THREE.MeshStandardMaterial({ color: zone.color, emissive: zone.color, emissiveIntensity: 0.75, roughness: 0.4 });
      const sides: [number, number, number, number][] = [
        [(x0 + x1) / 2, zMin + 0.08, x1 - x0, line],
        [(x0 + x1) / 2, zMax - 0.08, x1 - x0, line],
        [x0, (zMin + zMax) / 2, line, depth - 0.16],
        [x1, (zMin + zMax) / 2, line, depth - 0.16],
      ];
      for (const [cx, cz, sx, sz] of sides) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.012, sz), mat);
        strip.position.set(cx, TILE_TOP + 0.006, cz);
        this.group.add(strip);
      }
      // A lit band on the plinth's front face, so the zone colour reads from any angle.
      const band = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.08, 0.02), mat);
      band.position.set((x0 + x1) / 2, -0.12, zMax + 0.61);
      this.group.add(band);
    }

    // VPC enclosure: low glass walls around the public and private subnets.
    const vpcX0 = (ZONES.find((z) => z.id === 'public')!.minX - 0.5) * TILE;
    const vpcX1 = (BOARD.maxX + 0.5) * TILE;
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.12,
      roughness: 0.1,
      metalness: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const wallH = 0.5;
    const walls: [number, number, number, number][] = [
      // [cx, cz, sx, sz]
      [(vpcX0 + vpcX1) / 2, zMin, vpcX1 - vpcX0, 0.04],
      [(vpcX0 + vpcX1) / 2, zMax, vpcX1 - vpcX0, 0.04],
      [vpcX0, (zMin + zMax) / 2, 0.04, depth],
      [vpcX1, (zMin + zMax) / 2, 0.04, depth],
    ];
    for (const [cx, cz, sx, sz] of walls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, wallH, sz), glass);
      wall.position.set(cx, TILE_TOP + wallH / 2, cz);
      this.group.add(wall);
    }

    // Subnet divider inside the VPC.
    const privateX = (ZONES.find((z) => z.id === 'private')!.minX - 0.5) * TILE;
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.04, wallH * 0.6, depth), glass);
    divider.position.set(privateX, TILE_TOP + wallH * 0.3, (zMin + zMax) / 2);
    this.group.add(divider);

    // AZ divider: a dashed line between z=0 and z=1 across the VPC.
    const azZ = 0.5 * TILE;
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.5 });
    const dashGeo = new THREE.BoxGeometry(0.3, 0.01, 0.04);
    for (let x = vpcX0 + 0.2; x < vpcX1 - 0.2; x += 0.55) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.position.set(x + 0.15, TILE_TOP + 0.01, azZ);
      this.group.add(dash);
    }
  }

  setHover(cell: { gx: number; gz: number } | null): void {
    if (cell && !inBounds(cell.gx, cell.gz)) cell = null;
    if (cell?.gx === this.hover?.gx && cell?.gz === this.hover?.gz) return;
    this.hover = cell;
    this.recolor();
  }

  /** While placing, legal tiles glow green and illegal ones dim red. */
  setPlacing(type: ServiceType | null): void {
    if (type === this.placing) return;
    this.placing = type;
    this.recolor();
  }

  private recolor(): void {
    const zones = this.placing ? CATALOG[this.placing].zones : null;
    const c = new THREE.Color();
    for (let gx = BOARD.minX; gx <= BOARD.maxX; gx++) {
      for (let gz = BOARD.minZ; gz <= BOARD.maxZ; gz++) {
        const i = tileIndex(gx, gz);
        c.copy(this.baseColors[i]);
        if (zones) c.lerp(zones.includes(zoneAt(gx)) ? LEGAL : ILLEGAL, 0.22);
        if (this.hover && this.hover.gx === gx && this.hover.gz === gz) c.lerp(HOVER, 0.25);
        this.tiles.setColorAt(i, c);
      }
    }
    this.tiles.instanceColor!.needsUpdate = true;
  }

  setTargets(targets: TargetPlacement[]): void {
    const key = targets.map((t) => `${t.type}@${t.gridX},${t.gridZ}`).join('|');
    if (key === this.targetKey) return;
    this.targetKey = key;
    for (const child of [...this.targetGroup.children]) disposeObject(child);
    for (const t of targets) {
      const { x, z } = gridToWorld(t.gridX, t.gridZ);
      const marker = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.62, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85, depthWrite: false }),
      );
      marker.position.set(x, TILE_TOP + 0.03, z);
      this.targetGroup.add(marker);
    }
  }

  setSelection(selected: THREE.Vector3 | null, wireSource: THREE.Vector3 | null): void {
    this.selectionRing.visible = !!selected;
    if (selected) this.selectionRing.position.set(selected.x, TILE_TOP + 0.02, selected.z);
    this.wireSourceRing.visible = !!wireSource;
    if (wireSource) this.wireSourceRing.position.set(wireSource.x, TILE_TOP + 0.025, wireSource.z);
  }

  update(dt: number): void {
    this.elapsed += dt;
    const pulse = 1 + Math.sin(this.elapsed * 4) * 0.06;
    for (const marker of this.targetGroup.children) {
      marker.scale.setScalar(pulse);
      marker.rotation.y += dt * 0.6;
    }
    if (this.wireSourceRing.visible) this.wireSourceRing.scale.setScalar(pulse);
    if (this.selectionRing.visible) this.selectionRing.rotation.y += dt * 0.8;
  }

  /** World point → grid cell, or null when outside the board. */
  static cellAt(point: THREE.Vector3): { gx: number; gz: number } | null {
    const gx = Math.round(point.x / TILE);
    const gz = Math.round(point.z / TILE);
    return inBounds(gx, gz) ? { gx, gz } : null;
  }

  dispose(): void {
    disposeObject(this.group);
  }
}

export const BOARD_TOP = TILE_TOP;
