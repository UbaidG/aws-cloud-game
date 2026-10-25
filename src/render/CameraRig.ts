/**
 * Orbit camera for the board. Owns pointer and keyboard input for the canvas and tells taps apart
 * from drags, so a tap never fires after an orbit, pan or pinch.
 *
 * Mouse: left-drag orbits, right/middle-drag pans, wheel zooms.
 * Touch: one finger orbits, two fingers pinch-zoom and pan.
 * Keys: WASD / arrows orbit and zoom (ignored while typing or with modifier keys held).
 */

import * as THREE from 'three';
import { BOARD } from '../engine';

const TAP_SLOP_PX = 6;
const MIN_RADIUS = 9;
const MAX_RADIUS = 40;
const MIN_PHI = 0.32;
const MAX_PHI = 1.25;
const PAN_LIMIT_X = (BOARD.maxX + 1) * BOARD.tileSize;
const PAN_LIMIT_Z = (BOARD.maxZ + 1) * BOARD.tileSize;

const HOME = { theta: 0.42, phi: 0.92, radius: 25, target: new THREE.Vector3(0, 0, 0.6) };
/**
 * Portrait screens look down the board's long axis instead, so traffic flows top (internet) to
 * bottom (private subnet). The target sits toward the viewer to keep the board clear of the
 * mobile mission sheet and toolbelt.
 */
const HOME_PORTRAIT = { theta: Math.PI / 2 - 0.12, phi: 0.78, radius: 35, target: new THREE.Vector3(3.4, 0, -0.3) };

export interface PointerTap {
  clientX: number;
  clientY: number;
}

export interface CameraRigCallbacks {
  onTap: (tap: PointerTap) => void;
  onHover: (tap: PointerTap | null) => void;
}

interface Orbit {
  theta: number;
  phi: number;
  radius: number;
  target: THREE.Vector3;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly el: HTMLElement;
  private readonly callbacks: CameraRigCallbacks;

  private home: Orbit = { ...HOME };
  private goal: Orbit = { ...HOME, target: HOME.target.clone() };
  private current: Orbit = { ...HOME, target: HOME.target.clone() };

  private pointers = new Map<number, { x: number; y: number; button: number }>();
  private downAt: { x: number; y: number } | null = null;
  private moved = false;
  private pinchDistance = 0;
  private heldKeys = new Set<string>();
  /** Cinematic control (cutscenes, focus): user input is ignored while set. */
  locked = false;
  /** Damping speed multiplier: below 1 for slow cinematic moves, back to 1 once settled. */
  private pace = 1;

  constructor(el: HTMLElement, aspect: number, callbacks: CameraRigCallbacks) {
    this.el = el;
    this.callbacks = callbacks;
    this.camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 160);
    this.apply();

    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerCancel);
    el.addEventListener('pointerleave', this.onPointerLeave);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearKeys);
  }

  /** `fitAspect` is the aspect of the area the board should fit in (the canvas minus covering UI). */
  setAspect(aspect: number, fitAspect = aspect): void {
    this.camera.aspect = aspect;
    const portrait = aspect < 0.8;
    // Narrow screens need a wider vertical FOV to fit the board's width.
    this.camera.fov = portrait ? 44 : aspect < 1.2 ? 36 + (1.2 - aspect) * 25 : 36;
    this.camera.updateProjectionMatrix();
    // Landscape: pull back on squarer viewports so the board's full width stays in frame.
    const home = portrait ? HOME_PORTRAIT : { ...HOME, radius: HOME.radius * Math.max(1, 1.55 / fitAspect) };
    const zoomOnly = !portrait && this.home !== HOME_PORTRAIT;
    if (zoomOnly) {
      const fresh = Math.abs(this.goal.radius - this.home.radius) < 0.5;
      this.home = home;
      // Keep a user's own zoom; otherwise follow the new fit.
      if (fresh) this.goal.radius = home.radius;
    } else if (home !== this.home) {
      // Orientation changed: snap to the new framing instead of swinging across the board.
      this.home = home;
      this.reset();
      this.current = { ...home, target: home.target.clone() };
      this.apply();
    }
  }

  reset(): void {
    this.goal = { ...this.home, target: this.home.target.clone() };
  }

  /** Level intro: start high and wide, then glide down into the home framing. */
  intro(): void {
    const home = this.home;
    this.current = { theta: home.theta - 0.75, phi: 0.38, radius: home.radius * 1.7, target: home.target.clone().setY(-2) };
    this.reset();
    this.pace = 0.32;
    this.apply();
  }

  /** Victory: a slow arc around the board. Call `reset` (or `returnHome`) to come back. */
  sweep(): void {
    this.goal = { ...this.home, theta: this.home.theta + 0.55, phi: this.home.phi - 0.12, radius: this.home.radius * 0.9, target: this.home.target.clone() };
    this.pace = 0.22;
  }

  /** Glide back to the home framing at cinematic pace. */
  returnHome(): void {
    this.reset();
    this.pace = 0.3;
  }

  /** Swing the camera to frame a world point. */
  focus(point: THREE.Vector3, radius = 14): void {
    this.goal.target.set(point.x, 0, point.z);
    this.goal.radius = radius;
  }

  /** Cinematic move relative to the home framing, at a slow `pace` (cutscenes). */
  cinematic(orbit: Partial<{ theta: number; phi: number; radius: number; target: THREE.Vector3 }>, pace = 0.35): void {
    this.goal = { ...this.home, target: this.home.target.clone() };
    this.setGoal(orbit);
    this.pace = pace;
  }

  /** Keep turning from wherever the camera is heading now. */
  drift(dTheta: number, pace = 0.15): void {
    this.goal.theta += dTheta;
    this.pace = pace;
  }

  get homeOrbit(): Readonly<Orbit> {
    return this.home;
  }

  /** Set the goal orbit directly (cutscenes). Angles in radians. */
  setGoal(orbit: Partial<{ theta: number; phi: number; radius: number; target: THREE.Vector3 }>): void {
    if (orbit.theta !== undefined) this.goal.theta = orbit.theta;
    if (orbit.phi !== undefined) this.goal.phi = THREE.MathUtils.clamp(orbit.phi, 0.1, 1.45);
    if (orbit.radius !== undefined) this.goal.radius = orbit.radius;
    if (orbit.target) this.goal.target.copy(orbit.target);
  }

  get isSettled(): boolean {
    return (
      Math.abs(this.goal.theta - this.current.theta) < 1e-3 &&
      Math.abs(this.goal.phi - this.current.phi) < 1e-3 &&
      Math.abs(this.goal.radius - this.current.radius) < 1e-2 &&
      this.goal.target.distanceToSquared(this.current.target) < 1e-4
    );
  }

  /** Returns true if the camera moved this frame (so the caller knows to redraw). */
  update(dt: number): boolean {
    if (!this.locked && this.heldKeys.size > 0) {
      const k = this.heldKeys;
      if (k.has('KeyA') || k.has('ArrowLeft')) this.goal.theta -= 1.4 * dt;
      if (k.has('KeyD') || k.has('ArrowRight')) this.goal.theta += 1.4 * dt;
      if (k.has('KeyW') || k.has('ArrowUp')) this.zoomBy(-10 * dt);
      if (k.has('KeyS') || k.has('ArrowDown')) this.zoomBy(10 * dt);
    }
    if (this.isSettled) {
      this.pace = 1;
      return false;
    }
    const pace = this.pace;
    const damp = (a: number, b: number, l: number) => THREE.MathUtils.damp(a, b, l * pace, dt);
    this.current.theta = damp(this.current.theta, this.goal.theta, 7);
    this.current.phi = damp(this.current.phi, this.goal.phi, 7);
    this.current.radius = damp(this.current.radius, this.goal.radius, 7);
    this.current.target.set(
      damp(this.current.target.x, this.goal.target.x, 6),
      damp(this.current.target.y, this.goal.target.y, 6),
      damp(this.current.target.z, this.goal.target.z, 6),
    );
    this.apply();
    return true;
  }

  dispose(): void {
    const el = this.el;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerCancel);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearKeys);
  }

  private apply(): void {
    const { theta, phi, radius, target } = this.current;
    this.camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta),
    );
    this.camera.lookAt(target);
  }

  private zoomBy(delta: number): void {
    this.pace = 1;
    this.goal.radius = THREE.MathUtils.clamp(this.goal.radius + delta, MIN_RADIUS, MAX_RADIUS);
  }

  private orbitBy(dx: number, dy: number): void {
    this.pace = 1;
    this.goal.theta -= dx * 0.008;
    this.goal.phi = THREE.MathUtils.clamp(this.goal.phi - dy * 0.006, MIN_PHI, MAX_PHI);
  }

  private panBy(dx: number, dy: number): void {
    this.pace = 1;
    // Pan in the camera's ground-plane frame so "drag right" always moves the board right.
    const scale = this.goal.radius * 0.0016;
    const sin = Math.sin(this.goal.theta);
    const cos = Math.cos(this.goal.theta);
    const t = this.goal.target;
    t.x = THREE.MathUtils.clamp(t.x - (dx * cos + dy * sin) * scale, -PAN_LIMIT_X, PAN_LIMIT_X);
    t.z = THREE.MathUtils.clamp(t.z - (-dx * sin + dy * cos) * scale, -PAN_LIMIT_Z, PAN_LIMIT_Z);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.el.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
    if (this.pointers.size === 1) {
      this.downAt = { x: e.clientX, y: e.clientY };
      this.moved = false;
    } else {
      // A second finger means a gesture, never a tap.
      this.moved = true;
      this.pinchDistance = this.currentPinchDistance();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === 'mouse') this.callbacks.onHover({ clientX: e.clientX, clientY: e.clientY });
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (this.downAt && Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > TAP_SLOP_PX) {
      this.moved = true;
    }
    if (this.pointers.size === 2) {
      const before = this.midpoint();
      prev.x = e.clientX;
      prev.y = e.clientY;
      const after = this.midpoint();
      const distance = this.currentPinchDistance();
      if (!this.locked) {
        if (this.pinchDistance > 0) this.zoomBy((this.pinchDistance - distance) * 0.05);
        this.panBy(after.x - before.x, after.y - before.y);
      }
      this.pinchDistance = distance;
      return;
    }
    prev.x = e.clientX;
    prev.y = e.clientY;
    if (!this.moved || this.locked) return;
    if (prev.button === 0) this.orbitBy(dx, dy);
    else this.panBy(dx, dy);
  };

  private onPointerUp = (e: PointerEvent): void => {
    const wasTap = this.pointers.size === 1 && !this.moved && e.button === 0;
    this.release(e.pointerId);
    if (wasTap) this.callbacks.onTap({ clientX: e.clientX, clientY: e.clientY });
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.release(e.pointerId);
  };

  private onPointerLeave = (e: PointerEvent): void => {
    if (e.pointerType === 'mouse' && !this.pointers.has(e.pointerId)) this.callbacks.onHover(null);
  };

  private release(pointerId: number): void {
    this.pointers.delete(pointerId);
    if (this.el.hasPointerCapture?.(pointerId)) this.el.releasePointerCapture(pointerId);
    if (this.pointers.size === 0) this.downAt = null;
    this.pinchDistance = this.pointers.size === 2 ? this.currentPinchDistance() : 0;
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.locked) return;
    // Trackpad pinch arrives as ctrl+wheel with small deltas.
    this.zoomBy(e.deltaY * (e.ctrlKey ? 0.08 : 0.02));
  };

  private onContextMenu = (e: Event): void => e.preventDefault();

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey) {
      this.clearKeys();
      return;
    }
    const target = e.target as HTMLElement | null;
    if (target && (/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName) || target.isContentEditable)) return;
    if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)) {
      // Arrow keys would otherwise scroll a focused panel.
      if (e.code.startsWith('Arrow') && target === document.body) e.preventDefault();
      this.heldKeys.add(e.code);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private clearKeys = (): void => {
    this.heldKeys.clear();
  };

  private midpoint(): { x: number; y: number } {
    const pts = [...this.pointers.values()];
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  }

  private currentPinchDistance(): number {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }
}
