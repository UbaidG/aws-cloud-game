/**
 * Pooled one-shot effects: spark bursts, ground pulses, firewall shield flashes and confetti.
 * Particles share one InstancedMesh, so a burst never allocates GPU resources.
 */

import * as THREE from 'three';
import { disposeObject } from './disposal';

const MAX_PARTICLES = 600;
const GRAVITY = -9.8;

interface Particle {
  alive: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  rot: THREE.Euler;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
}

interface Pulse {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  age: number;
  duration: number;
  maxScale: number;
}

export interface BurstOptions {
  count?: number;
  speed?: number;
  size?: number;
  life?: number;
  gravity?: number;
  /** Spread upward only (sparks) or in every direction. */
  upward?: boolean;
  colors?: number[];
}

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpColor = new THREE.Color();

export class Effects {
  readonly group = new THREE.Group();
  private readonly particles: Particle[] = [];
  private readonly mesh: THREE.InstancedMesh;
  private next = 0;
  private live = 0;
  private pulses: Pulse[] = [];
  private readonly pulseGeo = new THREE.RingGeometry(0.4, 0.5, 48).rotateX(-Math.PI / 2);
  private readonly shieldGeo = new THREE.CircleGeometry(0.7, 6);

  constructor() {
    this.group.name = 'effects';
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.25 });
    this.mesh = new THREE.InstancedMesh(geometry, material, MAX_PARTICLES);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        alive: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        rot: new THREE.Euler(),
        life: 0,
        maxLife: 1,
        size: 0.1,
        gravity: GRAVITY,
      });
      this.mesh.setColorAt(i, tmpColor.setHex(0xffffff));
    }
    this.group.add(this.mesh);
  }

  get busy(): boolean {
    return this.live > 0 || this.pulses.length > 0;
  }

  burst(at: THREE.Vector3, color: number, opts: BurstOptions = {}): void {
    const count = opts.count ?? 18;
    const speed = opts.speed ?? 3;
    for (let n = 0; n < count; n++) {
      const p = this.particles[this.next];
      const index = this.next;
      this.next = (this.next + 1) % MAX_PARTICLES;
      if (!p.alive) this.live++;
      p.alive = true;
      p.pos.copy(at);
      const theta = Math.random() * Math.PI * 2;
      const up = (opts.upward ?? true) ? 0.4 + Math.random() * 0.8 : Math.random() * 2 - 1;
      p.vel.set(Math.cos(theta), up, Math.sin(theta)).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.7));
      p.spin.set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      p.life = p.maxLife = (opts.life ?? 0.7) * (0.7 + Math.random() * 0.6);
      p.size = (opts.size ?? 0.08) * (0.6 + Math.random() * 0.8);
      p.gravity = opts.gravity ?? GRAVITY;
      const palette = opts.colors;
      this.mesh.setColorAt(index, tmpColor.setHex(palette ? palette[n % palette.length] : color));
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }

  /** An expanding ring on the floor. */
  pulse(at: THREE.Vector3, color: number, maxScale = 2.4, duration = 0.6): void {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
    const mesh = new THREE.Mesh(this.pulseGeo, material);
    mesh.position.set(at.x, at.y + 0.03, at.z);
    this.group.add(mesh);
    this.pulses.push({ mesh, material, age: 0, duration, maxScale });
  }

  /** A hexagonal shield flash: a firewall turned the packet away. */
  shield(at: THREE.Vector3, facing: THREE.Vector3): void {
    const material = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(this.shieldGeo, material);
    mesh.position.copy(at);
    mesh.lookAt(facing);
    this.group.add(mesh);
    this.pulses.push({ mesh, material, age: 0, duration: 0.7, maxScale: 1.3 });
  }

  confetti(center: THREE.Vector3, spread = 8): void {
    const colors = [0xfacc15, 0x38bdf8, 0x22c55e, 0xf472b6, 0xa78bfa, 0xfb923c];
    for (let i = 0; i < 6; i++) {
      const at = center.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, 4 + Math.random() * 2, (Math.random() - 0.5) * spread * 0.5));
      this.burst(at, 0xffffff, { count: 40, speed: 4, size: 0.1, life: 2.2, gravity: -4, upward: false, colors });
    }
  }

  update(dt: number): void {
    if (this.live > 0) {
      let highest = -1;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = this.particles[i];
        if (!p.alive) {
          tmpMatrix.makeScale(0, 0, 0);
          this.mesh.setMatrixAt(i, tmpMatrix);
          continue;
        }
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          this.live--;
          tmpMatrix.makeScale(0, 0, 0);
          this.mesh.setMatrixAt(i, tmpMatrix);
          continue;
        }
        highest = i;
        p.vel.y += p.gravity * dt;
        p.vel.multiplyScalar(1 - dt * 0.8);
        p.pos.addScaledVector(p.vel, dt);
        if (p.pos.y < 0.12) {
          p.pos.y = 0.12;
          p.vel.y *= -0.3;
        }
        p.rot.x += p.spin.x * dt;
        p.rot.y += p.spin.y * dt;
        p.rot.z += p.spin.z * dt;
        const s = p.size * Math.min(1, (p.life / p.maxLife) * 2);
        tmpQuat.setFromEuler(p.rot);
        tmpMatrix.compose(p.pos, tmpQuat, tmpScale.set(s, s, s));
        this.mesh.setMatrixAt(i, tmpMatrix);
      }
      this.mesh.count = highest + 1;
      this.mesh.instanceMatrix.needsUpdate = true;
    } else if (this.mesh.count !== 0) {
      this.mesh.count = 0;
    }

    if (this.pulses.length) {
      this.pulses = this.pulses.filter((p) => {
        p.age += dt;
        const t = Math.min(1, p.age / p.duration);
        p.mesh.scale.setScalar(0.4 + (p.maxScale - 0.4) * (1 - Math.pow(1 - t, 3)));
        p.material.opacity = 0.9 * (1 - t);
        if (t >= 1) {
          p.mesh.removeFromParent();
          p.material.dispose();
          return false;
        }
        return true;
      });
    }
  }

  clear(): void {
    for (const p of this.particles) p.alive = false;
    this.live = 0;
    this.mesh.count = 0;
    for (const p of this.pulses) {
      p.mesh.removeFromParent();
      p.material.dispose();
    }
    this.pulses = [];
  }

  dispose(): void {
    this.clear();
    this.pulseGeo.dispose();
    this.shieldGeo.dispose();
    disposeObject(this.group);
  }
}
