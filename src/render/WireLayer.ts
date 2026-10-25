/**
 * Wires drawn as raised cable arcs. Each arc runs upstream → downstream (as the engine oriented
 * it), so traffic packets can follow the curve from its start. Colour shows the link kind and
 * whether the engine allows it.
 */

import * as THREE from 'three';
import type { LinkResult, Wire } from '../engine';
import { disposeObject, markShared } from './disposal';
import { ease, type Tweens } from './tween';

export const WIRE_COLOR = {
  request: 0x38bdf8,
  egress: 0xf59e0b,
  governance: 0xa78bfa,
  attachment: 0x34d399,
  blocked: 0xef4444,
  pending: 0x64748b,
} as const;

const CABLE_RADIUS = 0.055;
const HIT_RADIUS = 0.24;
const SOCKET_HEIGHT = 0.45;
const PREVIEW_SEGMENTS = 24;
const hitMat = markShared(new THREE.MeshBasicMaterial({ visible: false }));

interface WireView {
  wire: Wire;
  key: string;
  fromId: string;
  toId: string;
  curve: THREE.QuadraticBezierCurve3;
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  hitbox: THREE.Mesh;
  blocked: boolean;
}

export type PositionLookup = (blockId: string) => THREE.Vector3 | null;

export function cableCurve(from: THREE.Vector3, to: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const a = from.clone().setY(from.y + SOCKET_HEIGHT);
  const b = to.clone().setY(to.y + SOCKET_HEIGHT);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.y += 0.5 + a.distanceTo(b) * 0.14;
  return new THREE.QuadraticBezierCurve3(a, mid, b);
}

export class WireLayer {
  readonly group = new THREE.Group();
  private views = new Map<string, WireView>();
  private readonly tweens: Tweens;
  private preview: THREE.Line | null = null;
  private elapsed = 0;

  constructor(tweens: Tweens) {
    this.tweens = tweens;
    this.group.name = 'wires';
  }

  get hitboxes(): THREE.Object3D[] {
    return [...this.views.values()].map((v) => v.hitbox);
  }

  /** The curve a packet follows across this wire, oriented upstream → downstream. */
  curveOf(wireId: string): { curve: THREE.QuadraticBezierCurve3; fromId: string; toId: string } | null {
    const view = this.views.get(wireId);
    return view ? { curve: view.curve, fromId: view.fromId, toId: view.toId } : null;
  }

  sync(wires: Wire[], links: LinkResult[], positionOf: PositionLookup, highlightIds: ReadonlySet<string>, animate: boolean): void {
    const linkById = new Map(links.map((l) => [l.wireId, l]));
    const seen = new Set<string>();
    for (const wire of wires) {
      const link = linkById.get(wire.id);
      const fromId = link?.fromId ?? wire.a;
      const toId = link?.toId ?? wire.b;
      const from = positionOf(fromId);
      const to = positionOf(toId);
      if (!from || !to) continue;
      seen.add(wire.id);
      const key = `${fromId}>${toId}@${from.x.toFixed(2)},${from.z.toFixed(2)}>${to.x.toFixed(2)},${to.z.toFixed(2)}`;
      let view = this.views.get(wire.id);
      if (view && view.key !== key) {
        this.destroy(view);
        view = undefined;
      }
      if (!view) view = this.create(wire, key, fromId, toId, from, to, animate);
      view.wire = wire;
      const blocked = link ? !link.allowed : false;
      view.blocked = blocked;
      const color = !link ? WIRE_COLOR.pending : blocked ? WIRE_COLOR.blocked : WIRE_COLOR[link.kind];
      view.material.color.setHex(color);
      view.material.emissive.setHex(color);
      view.material.emissiveIntensity = highlightIds.has(wire.id) ? 1.4 : blocked ? 0.9 : 0.35;
      view.material.opacity = link?.kind === 'governance' ? 0.55 : 1;
    }
    for (const view of [...this.views.values()]) {
      if (!seen.has(view.wire.id)) this.destroy(view);
    }
  }

  private create(
    wire: Wire,
    key: string,
    fromId: string,
    toId: string,
    from: THREE.Vector3,
    to: THREE.Vector3,
    animate: boolean,
  ): WireView {
    const curve = cableCurve(from, to);
    const geometry = new THREE.TubeGeometry(curve, 40, CABLE_RADIUS, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: WIRE_COLOR.pending,
      emissive: WIRE_COLOR.pending,
      roughness: 0.35,
      metalness: 0.2,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    this.group.add(mesh);

    const hitbox = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, HIT_RADIUS, 5, false), hitMat);
    hitbox.userData.wireId = wire.id;
    this.group.add(hitbox);

    const view: WireView = { wire, key, fromId, toId, curve, mesh, material, hitbox, blocked: false };
    this.views.set(wire.id, view);

    if (animate) {
      // The cable draws itself from the upstream socket.
      const total = geometry.index!.count;
      geometry.setDrawRange(0, 0);
      this.tweens.add({
        duration: 380,
        ease: ease.outCubic,
        update: (t) => geometry.setDrawRange(0, Math.floor((total * t) / 6) * 6),
        complete: () => geometry.setDrawRange(0, Infinity),
      });
    }
    return view;
  }

  private destroy(view: WireView): void {
    this.views.delete(view.wire.id);
    disposeObject(view.mesh);
    disposeObject(view.hitbox);
  }

  /** Rubber-band line from the wire source to the pointer while wiring. */
  setPreview(from: THREE.Vector3 | null, to: THREE.Vector3 | null): void {
    if (!from || !to) {
      if (this.preview) this.preview.visible = false;
      return;
    }
    const points = cableCurve(from, to.clone().setY(from.y)).getPoints(PREVIEW_SEGMENTS);
    if (!this.preview) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((PREVIEW_SEGMENTS + 1) * 3), 3));
      geometry.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(PREVIEW_SEGMENTS + 1), 1));
      const material = new THREE.LineDashedMaterial({ color: 0xfacc15, dashSize: 0.18, gapSize: 0.12 });
      this.preview = new THREE.Line(geometry, material);
      this.preview.frustumCulled = false;
      this.group.add(this.preview);
    }
    // Update the buffer in place; replacing attributes every pointer move would leak GL buffers.
    const position = this.preview.geometry.getAttribute('position') as THREE.BufferAttribute;
    const distance = this.preview.geometry.getAttribute('lineDistance') as THREE.BufferAttribute;
    let run = 0;
    points.forEach((p, i) => {
      if (i > 0) run += p.distanceTo(points[i - 1]);
      position.setXYZ(i, p.x, p.y, p.z);
      distance.setX(i, run);
    });
    position.needsUpdate = true;
    distance.needsUpdate = true;
    this.preview.visible = true;
  }

  update(dt: number): void {
    this.elapsed += dt;
    const flicker = 0.7 + Math.sin(this.elapsed * 8) * 0.4;
    for (const view of this.views.values()) {
      if (view.blocked) view.material.emissiveIntensity = flicker;
    }
  }

  dispose(): void {
    for (const view of this.views.values()) {
      disposeObject(view.mesh);
      disposeObject(view.hitbox);
    }
    this.views.clear();
    if (this.preview) disposeObject(this.preview);
    this.group.removeFromParent();
  }
}
