/**
 * Blocks on the board. Diffs the engine's block list by id: new blocks drop in, moved blocks
 * glide, removed blocks shrink away and are disposed. Health from the analysis drives the status
 * ring, tint and wobble. Nothing here decides health; it only shows what the engine derived.
 */

import * as THREE from 'three';
import { gridToWorld } from '../engine';
import type { Block, Health } from '../engine';
import { BOARD_TOP } from './BoardMesh';
import { disposeObject, markShared } from './disposal';
import type { Effects } from './Effects';
import { modelLibrary } from './assets/library';
import { animateModel, createServiceModel, type ServiceModel } from './models';
import { ease, type Tweens } from './tween';

const ledLevel = (health: Health) => (health === 'unreachable' || health === 'idle' ? 0.6 : 3);

export const HEALTH_COLOR: Record<Health, number> = {
  healthy: 0x22c55e,
  overloaded: 0xf97316,
  down: 0xef4444,
  unreachable: 0x64748b,
  idle: 0x94a3b8,
};

const ringGeo = markShared(new THREE.RingGeometry(0.5, 0.58, 40).rotateX(-Math.PI / 2));
const hitGeo = markShared(new THREE.BoxGeometry(1.2, 1.6, 1.2).translate(0, 0.8, 0));
const hitMat = markShared(new THREE.MeshBasicMaterial({ visible: false }));

interface BlockView {
  block: Block;
  holder: THREE.Group;
  model: ServiceModel;
  hitbox: THREE.Mesh;
  ring: THREE.Mesh;
  ringMat: THREE.MeshBasicMaterial;
  health: Health;
  highlight: boolean;
  /** Overload / fault wobble phase. */
  phase: number;
  /** Seconds until the next ember / smoke puff. */
  emitIn: number;
  /** LED flare from a passing packet, decaying to 0. */
  flare: number;
}

const DUST = [0x9ca3af, 0x6b7280, 0xd1d5db];
const EMBERS = [0xf97316, 0xfbbf24, 0xef4444];
const SMOKE = [0x1f2937, 0x374151, 0x2b3240];

export class BlockLayer {
  readonly group = new THREE.Group();
  private views = new Map<string, BlockView>();
  private readonly tweens: Tweens;
  private readonly effects: Effects;
  private elapsed = 0;

  private readonly unsubscribe: () => void;

  constructor(tweens: Tweens, effects: Effects) {
    this.tweens = tweens;
    this.effects = effects;
    this.group.name = 'blocks';
    this.unsubscribe = modelLibrary.onLoaded((type) => this.upgrade(type));
  }

  /** Swap procedural stand-ins for the realistic model once it has loaded. */
  private upgrade(type: Block['type']): void {
    for (const view of this.views.values()) {
      if (view.block.type !== type || view.model.realistic) continue;
      const next = createServiceModel(type);
      if (!next.realistic) continue;
      const old = view.model.root;
      next.root.position.copy(old.position);
      next.root.rotation.copy(old.rotation);
      next.root.scale.copy(old.scale);
      view.holder.add(next.root);
      disposeObject(old);
      view.model = next;
      this.applyHealth(view, view.health, true);
    }
  }

  /** Hit targets for raycasting (one invisible box per block). */
  get hitboxes(): THREE.Object3D[] {
    return [...this.views.values()].map((v) => v.hitbox);
  }

  /** World position of a block's base, or null if it isn't on the board. */
  positionOf(id: string): THREE.Vector3 | null {
    const view = this.views.get(id);
    return view ? view.holder.position.clone() : null;
  }

  /** Where a block's target position is, ignoring in-flight move tweens. */
  restingPositionOf(id: string): THREE.Vector3 | null {
    const view = this.views.get(id);
    if (!view) return null;
    const { x, z } = gridToWorld(view.block.gridX, view.block.gridZ);
    return new THREE.Vector3(x, BOARD_TOP, z);
  }

  heightOf(id: string): number {
    return this.views.get(id)?.model.height ?? 1;
  }

  sync(blocks: Block[], health: Record<string, Health>, highlightIds: ReadonlySet<string>, animate: boolean): void {
    const seen = new Set<string>();
    for (const block of blocks) {
      seen.add(block.id);
      let view = this.views.get(block.id);
      if (view && view.block.type !== block.type) {
        this.remove(view, false);
        view = undefined;
      }
      if (!view) {
        view = this.create(block, animate);
      } else if (view.block.gridX !== block.gridX || view.block.gridZ !== block.gridZ) {
        this.moveTo(view, block, animate);
      }
      view.block = block;
      view.highlight = highlightIds.has(block.id);
      this.applyHealth(view, block.fault === 'crashed' ? 'down' : (health[block.id] ?? 'idle'));
    }
    for (const view of [...this.views.values()]) {
      if (!seen.has(view.block.id)) this.remove(view, animate);
    }
  }

  private create(block: Block, animate: boolean): BlockView {
    const holder = new THREE.Group();
    holder.name = `block:${block.id}`;
    const { x, z } = gridToWorld(block.gridX, block.gridZ);
    holder.position.set(x, BOARD_TOP, z);

    const model = createServiceModel(block.type);
    holder.add(model.root);

    const hitbox = new THREE.Mesh(hitGeo, hitMat);
    hitbox.userData.blockId = block.id;
    holder.add(hitbox);

    const ringMat = new THREE.MeshBasicMaterial({ color: HEALTH_COLOR.idle, transparent: true, opacity: 0.85, depthWrite: false });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.015;
    holder.add(ring);

    this.group.add(holder);
    const view: BlockView = { block, holder, model, hitbox, ring, ringMat, health: 'idle', highlight: false, phase: Math.random() * 10, emitIn: Math.random(), flare: 0 };
    this.views.set(block.id, view);

    if (animate) {
      // Drop from above with a settle bounce.
      model.root.position.y = 2.4;
      model.root.scale.setScalar(0.85);
      this.tweens.add({
        duration: 520,
        ease: ease.outBounce,
        update: (t) => {
          model.root.position.y = 2.4 * (1 - t);
        },
        // Landing kicks up a puff of floor dust.
        complete: () => {
          if (!this.views.has(block.id)) return;
          const at = holder.position.clone().setY(BOARD_TOP + 0.05);
          this.effects.burst(at, 0x9ca3af, { count: 14, speed: 1.4, size: 0.07, life: 0.6, gravity: -2, colors: DUST });
          this.effects.pulse(at, 0xcbd5e1, 1.8, 0.45);
        },
      });
      this.tweens.add({
        duration: 420,
        ease: ease.outBack,
        update: (t) => model.root.scale.setScalar(0.85 + 0.15 * t),
      });
    }
    return view;
  }

  private moveTo(view: BlockView, block: Block, animate: boolean): void {
    const { x, z } = gridToWorld(block.gridX, block.gridZ);
    if (!animate) {
      view.holder.position.set(x, BOARD_TOP, z);
      return;
    }
    const from = view.holder.position.clone();
    this.tweens.add({
      duration: 320,
      ease: ease.inOutCubic,
      update: (t) => {
        view.holder.position.set(
          THREE.MathUtils.lerp(from.x, x, t),
          BOARD_TOP + Math.sin(t * Math.PI) * 0.6,
          THREE.MathUtils.lerp(from.z, z, t),
        );
      },
    });
  }

  private remove(view: BlockView, animate: boolean): void {
    this.views.delete(view.block.id);
    view.hitbox.removeFromParent();
    if (!animate) {
      disposeObject(view.holder);
      return;
    }
    const start = view.holder.scale.x;
    this.tweens.add({
      duration: 240,
      ease: ease.inQuad,
      update: (t) => view.holder.scale.setScalar(start * (1 - t)),
      complete: () => disposeObject(view.holder),
    });
  }

  /** A packet reached this block: its LED flares briefly. */
  flare(id: string): void {
    const view = this.views.get(id);
    if (view) view.flare = 1;
  }

  private applyHealth(view: BlockView, health: Health, force = false): void {
    if (view.health === health && !force) return;
    view.health = health;
    view.ringMat.color.setHex(HEALTH_COLOR[health]);
    if (view.model.led) {
      view.model.led.color.setHex(HEALTH_COLOR[health]);
      view.model.led.emissive.setHex(HEALTH_COLOR[health]);
      view.model.led.emissiveIntensity = ledLevel(health);
    }
    const dim = health === 'unreachable' || health === 'idle';
    view.ringMat.opacity = dim ? 0.45 : 0.9;
    // Crashed blocks keel over; everything else stands upright.
    view.model.root.rotation.z = view.block.fault === 'crashed' ? 0.28 : 0;
  }

  update(dt: number): void {
    this.elapsed += dt;
    for (const view of this.views.values()) {
      if (view.health !== 'down') animateModel(view.model, dt, this.elapsed);
      const ringScale = view.highlight ? 1.15 + Math.sin(this.elapsed * 6) * 0.08 : 1;
      view.ring.scale.setScalar(ringScale);
      if (view.health === 'overloaded') {
        // Struggling servers shudder.
        view.phase += dt * 40;
        view.model.root.position.x = Math.sin(view.phase) * 0.02;
      } else if (view.model.root.position.x !== 0) {
        view.model.root.position.x = 0;
      }
      if (view.flare > 0 && view.model.led) {
        view.flare = Math.max(0, view.flare - dt * 3);
        view.model.led.emissiveIntensity = ledLevel(view.health) + view.flare * 6;
      }
      this.emit(view, dt);
    }
  }

  /** Overloaded blocks throw off embers; crashed ones smoke and spark. */
  private emit(view: BlockView, dt: number): void {
    if (view.health !== 'overloaded' && view.health !== 'down') return;
    view.emitIn -= dt;
    if (view.emitIn > 0) return;
    const top = view.holder.position.clone();
    top.y += view.model.height * 0.9;
    if (view.health === 'overloaded') {
      view.emitIn = 0.25 + Math.random() * 0.25;
      this.effects.burst(top, 0xf97316, { count: 4, speed: 0.7, size: 0.08, life: 1.1, gravity: 1.5, colors: EMBERS });
    } else {
      view.emitIn = 0.35 + Math.random() * 0.3;
      this.effects.burst(top, 0x374151, { count: 5, speed: 0.45, size: 0.24, life: 1.8, gravity: 0.9, colors: SMOKE });
      if (Math.random() < 0.35) this.effects.burst(top, 0xfacc15, { count: 6, speed: 2.2, size: 0.04, life: 0.4 });
    }
  }

  dispose(): void {
    this.unsubscribe();
    for (const view of this.views.values()) disposeObject(view.holder);
    this.views.clear();
    this.group.removeFromParent();
  }
}
