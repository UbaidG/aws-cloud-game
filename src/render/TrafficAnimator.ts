/**
 * Plays an engine TrafficTrace as packets flowing along the wires. Every packet follows a real
 * path the engine traced: successful hops pulse green on arrival, and a dropped hop stops the
 * packet partway along the wire with a firewall shield or a red spark at the exact failure.
 */

import * as THREE from 'three';
import { CATALOG } from '../engine';
import type { Block, Hop, TrafficPath, TrafficTrace } from '../engine';
import { disposeObject } from './disposal';
import type { Effects } from './Effects';
import type { WireLayer } from './WireLayer';

const HOP_SECONDS = 0.42;
const PACKETS_PER_PATH = 3;
const PACKET_GAP_SECONDS = 0.22;
const PATH_GAP_SECONDS = 0.12;
const TRAIL = 3;
const DROP_AT = 0.6;

const COLOR_REQUEST = new THREE.Color(0x7dd3fc);
const COLOR_ASYNC = new THREE.Color(0xf9a8d4);
const COLOR_DROP = new THREE.Color(0xef4444);

interface Packet {
  path: TrafficPath;
  /** Seconds since this packet launched (negative while waiting to launch). */
  clock: number;
  /** First packet of each path triggers arrival pulses; the rest just flow. */
  lead: boolean;
  /** Index of the hop after which the packet is in async (background) territory. */
  asyncFrom: number;
  finished: boolean;
}

export interface TrafficCallbacks {
  /** A packet arrived successfully at a block. */
  onArrive?: (blockId: string) => void;
  /** A packet was stopped on a hop. */
  onDrop?: (hop: Hop) => void;
}

const tmpMatrix = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const identity = new THREE.Quaternion();
const tmpColor = new THREE.Color();

/** Pick a readable sample of paths: every distinct failure first, then successes. */
function samplePaths(trace: TrafficTrace, max: number): TrafficPath[] {
  const seen = new Set<string>();
  const unique = trace.paths.filter((p) => {
    const key = p.hops.map((h) => h.wireId).join('>');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const failed = unique.filter((p) => !p.ok);
  const ok = unique.filter((p) => p.ok);
  return [...failed, ...ok].slice(0, max);
}

export class TrafficAnimator {
  readonly group = new THREE.Group();
  private readonly mesh: THREE.InstancedMesh;
  private readonly capacity: number;
  private packets: Packet[] = [];
  private resolve: (() => void) | null = null;
  private callbacks: TrafficCallbacks = {};
  private blocks = new Map<string, Block>();
  private firedArrivals = new Set<string>();
  private firedDrops = new Set<string>();
  speed = 1;

  constructor(
    private readonly wires: WireLayer,
    private readonly effects: Effects,
    private readonly blockTop: (id: string) => THREE.Vector3 | null,
    maxPackets: number,
  ) {
    this.group.name = 'traffic';
    this.capacity = maxPackets * TRAIL;
    const geometry = new THREE.SphereGeometry(0.11, 12, 10);
    const material = new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.2 });
    this.mesh = new THREE.InstancedMesh(geometry, material, this.capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.setColorAt(0, COLOR_REQUEST);
    this.group.add(this.mesh);
  }

  get playing(): boolean {
    return this.packets.length > 0;
  }

  /** Animate `trace`. Resolves once every packet has arrived or dropped. */
  play(trace: TrafficTrace, blocks: Block[], callbacks: TrafficCallbacks = {}): Promise<void> {
    this.stop();
    this.callbacks = callbacks;
    this.blocks = new Map(blocks.map((b) => [b.id, b]));
    this.firedArrivals.clear();
    this.firedDrops.clear();
    const maxPaths = Math.max(1, Math.floor(this.capacity / TRAIL / PACKETS_PER_PATH));
    const paths = samplePaths(trace, maxPaths);
    if (paths.length === 0) return Promise.resolve();

    paths.forEach((path, pi) => {
      const asyncIdx = path.hops.findIndex((h) => CATALOG[this.blocks.get(h.toId)?.type ?? 'client'].tier === 'async');
      for (let k = 0; k < PACKETS_PER_PATH; k++) {
        this.packets.push({
          path,
          clock: -(pi * PATH_GAP_SECONDS + k * PACKET_GAP_SECONDS),
          lead: k === 0,
          asyncFrom: asyncIdx === -1 ? Infinity : asyncIdx + 1,
          finished: false,
        });
      }
    });
    return new Promise((resolve) => (this.resolve = resolve));
  }

  stop(): void {
    this.packets = [];
    this.mesh.count = 0;
    const resolve = this.resolve;
    this.resolve = null;
    resolve?.();
  }

  update(dt: number): void {
    if (this.packets.length === 0) return;
    let slot = 0;
    for (const packet of this.packets) {
      if (packet.finished) continue;
      packet.clock += dt * this.speed;
      if (packet.clock < 0) continue;
      const hops = packet.path.hops;
      const hopIndex = Math.floor(packet.clock / HOP_SECONDS);
      const t = (packet.clock % HOP_SECONDS) / HOP_SECONDS;

      // Fire arrival for any hop just completed.
      if (packet.lead && hopIndex > 0 && hopIndex <= hops.length) {
        const arrived = hops[hopIndex - 1];
        if (arrived.ok && !this.firedArrivals.has(arrived.toId)) {
          this.firedArrivals.add(arrived.toId);
          this.arrive(arrived.toId, hopIndex - 1 >= packet.asyncFrom - 1);
        }
      }
      if (hopIndex >= hops.length) {
        packet.finished = true;
        continue;
      }

      const hop = hops[hopIndex];
      if (!hop.ok && t >= DROP_AT) {
        packet.finished = true;
        this.drop(hop);
        continue;
      }
      const isAsync = hopIndex >= packet.asyncFrom;
      const color = !hop.ok ? tmpColor.copy(COLOR_REQUEST).lerp(COLOR_DROP, t / DROP_AT) : isAsync ? COLOR_ASYNC : COLOR_REQUEST;
      for (let trail = 0; trail < TRAIL && slot < this.capacity; trail++) {
        const along = t - trail * 0.045;
        if (along < 0) break;
        if (!this.pointOn(hop, along, tmpPos)) break;
        const s = 1 - trail * 0.28;
        tmpMatrix.compose(tmpPos, identity, tmpScale.set(s, s, s));
        this.mesh.setMatrixAt(slot, tmpMatrix);
        this.mesh.setColorAt(slot, color);
        slot++;
      }
    }
    this.mesh.count = slot;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    if (this.packets.every((p) => p.finished)) {
      this.packets = [];
      this.mesh.count = 0;
      const resolve = this.resolve;
      this.resolve = null;
      resolve?.();
    }
  }

  private pointOn(hop: Hop, t: number, out: THREE.Vector3): boolean {
    const wire = this.wires.curveOf(hop.wireId);
    if (!wire) return false;
    const along = wire.fromId === hop.fromId ? t : 1 - t;
    wire.curve.getPoint(along, out);
    return true;
  }

  private arrive(blockId: string, isAsync: boolean): void {
    const top = this.blockTop(blockId);
    if (top) this.effects.pulse(top, isAsync ? 0xf472b6 : 0x22c55e, 1.6, 0.5);
    this.callbacks.onArrive?.(blockId);
  }

  private drop(hop: Hop): void {
    if (this.firedDrops.has(hop.wireId)) return;
    this.firedDrops.add(hop.wireId);
    const at = new THREE.Vector3();
    if (this.pointOn(hop, DROP_AT, at)) {
      const firewall = hop.dropCode?.startsWith('firewall.') ?? false;
      if (firewall) {
        const toward = new THREE.Vector3();
        this.pointOn(hop, 0, toward);
        this.effects.shield(at, toward);
        this.effects.burst(at, 0xef4444, { count: 10, speed: 1.6, size: 0.06 });
      } else {
        this.effects.burst(at, 0xef4444, { count: 22, speed: 2.8, size: 0.08 });
      }
    }
    this.callbacks.onDrop?.(hop);
  }

  dispose(): void {
    this.stop();
    disposeObject(this.group);
  }
}
