/**
 * The 3D board. A pure view of engine state: React hands it a `SceneState`, it diffs and draws,
 * and reports taps back as `BoardHit`s. It never decides a rule.
 *
 *   const r = new BoardRenderer(container, { onTap, onHover });
 *   r.setScene({ board, analysis, ... });
 *   await r.playTraffic(report.analysis.trace);
 *   r.dispose();
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CATALOG, gridToWorld } from '../engine';
import type { Block, BoardAnalysis, Board, Hop, ServiceType, TargetPlacement, ToolMode, TrafficTrace } from '../engine';
import { BlockLayer } from './BlockLayer';
import { BOARD_TOP, BoardMesh } from './BoardMesh';
import { CameraRig, type PointerTap } from './CameraRig';
import { disposeObject } from './disposal';
import { Effects } from './Effects';
import { Environment } from './Environment';
import { LabelLayer, type Callout } from './LabelLayer';
import type { PostFx } from './PostFx';
import { detectQuality, type QualitySettings, type QualityTier } from './quality';
import { TrafficAnimator } from './TrafficAnimator';
import { Tweens } from './tween';
import { WireLayer } from './WireLayer';

export type BoardHit =
  | { kind: 'block'; id: string }
  | { kind: 'wire'; id: string }
  | { kind: 'tile'; gridX: number; gridZ: number }
  | { kind: 'none' };

export interface SceneState {
  board: Board;
  analysis: BoardAnalysis | null;
  tool: ToolMode;
  placingType: ServiceType | null;
  selectedId: string | null;
  wireSourceId: string | null;
  targets: TargetPlacement[];
  /** Blocks and wires to spotlight (coach steps, the failing hop of the last test). */
  highlightIds: string[];
  callouts: SceneCallout[];
}

export interface SceneCallout {
  key: string;
  title: string;
  body: string;
  tone: Callout['tone'];
  /** Anchor on a block or the middle of a wire. */
  blockId?: string;
  wireId?: string;
}

/** Cinematic camera shots for cutscenes. */
export type CameraShot = 'wide' | 'close' | 'low' | 'top' | 'orbit';

export interface BoardRendererCallbacks {
  onTap: (hit: BoardHit) => void;
  onHover?: (hit: BoardHit) => void;
}

export interface BoardRendererOptions {
  quality?: QualityTier | null;
  /** Skip in-world animation (prefers-reduced-motion). */
  reducedMotion?: boolean;
}

export interface RendererStats {
  geometries: number;
  textures: number;
  drawCalls: number;
  triangles: number;
  quality: QualityTier;
}

const SHORT_NAMES = Object.fromEntries(Object.values(CATALOG).map((s) => [s.type, s.shortLabel])) as Record<ServiceType, string>;

function metaFor(block: Block): string {
  const parts = [SHORT_NAMES[block.type] ?? block.type];
  if (block.config.instanceType) parts.push(String(block.config.instanceType));
  return parts.join(' · ');
}

export class BoardRenderer {
  private readonly container: HTMLElement;
  private readonly callbacks: BoardRendererCallbacks;
  private readonly quality: QualitySettings;
  private readonly reducedMotion: boolean;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly rig: CameraRig;
  private readonly tweens = new Tweens();
  private readonly boardMesh: BoardMesh;
  private readonly environment: Environment;
  private readonly blocks: BlockLayer;
  private readonly wires: WireLayer;
  private readonly effects: Effects;
  private readonly traffic: TrafficAnimator;
  private readonly labels: LabelLayer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly resizeObserver: ResizeObserver;
  private readonly timer = new THREE.Timer();
  private postFx: PostFx | null = null;

  private state: SceneState | null = null;
  private hoverPoint: THREE.Vector3 | null = null;
  private width = 1;
  private height = 1;
  /** Pixels on the right covered by UI (an open side panel); the board centres in what's left. */
  private insetRight = 0;
  private insetShown = 0;
  private frame = 0;
  private running = false;
  private disposed = false;
  /** First sync after construction or a level change shouldn't drop every block in. */
  private animateNextSync = false;

  constructor(container: HTMLElement, callbacks: BoardRendererCallbacks, options: BoardRendererOptions = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.quality = detectQuality(options.quality);
    this.reducedMotion = options.reducedMotion ?? false;

    this.renderer = new THREE.WebGLRenderer({ antialias: this.quality.antialias, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.quality.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps the AWS category colours true (ACES pushes orange towards yellow).
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    // Stats cover the whole frame, post-processing passes included (reset in tick).
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-label', 'Architecture board');
    // Labels are positioned against the container; only add positioning if it has none.
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.appendChild(canvas);

    this.buildScene();

    this.rig = new CameraRig(canvas, 1, {
      onTap: (tap) => this.callbacks.onTap(this.pick(tap)),
      onHover: (tap) => this.handleHover(tap),
    });

    this.boardMesh = new BoardMesh();
    this.environment = new Environment(this.quality.tier);
    this.effects = new Effects();
    this.blocks = new BlockLayer(this.tweens, this.effects);
    this.wires = new WireLayer(this.tweens);
    this.traffic = new TrafficAnimator(this.wires, this.effects, (id) => this.blocks.positionOf(id), this.quality.maxPackets);
    this.scene.add(this.environment.group, this.boardMesh.group, this.blocks.group, this.wires.group, this.effects.group, this.traffic.group);

    this.labels = new LabelLayer(container);
    document.fonts?.ready.then(() => !this.disposed && this.labels.invalidateSizes());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.loadPostFx();

    document.addEventListener('visibilitychange', this.onVisibility);
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.start();
  }

  /** Bloom and AO are a separate chunk; the board renders plainly until it arrives. */
  private loadPostFx(): void {
    const { bloom, ao } = this.quality;
    if (!bloom && !ao) return;
    void import('./PostFx')
      .then(({ PostFx }) => {
        if (this.disposed) return;
        this.postFx = new PostFx(this.renderer, this.scene, this.rig.camera, { bloom, ao });
        this.postFx.setSize(this.width, this.height, this.renderer.getPixelRatio());
      })
      .catch((err) => console.warn('[render] post-processing unavailable', err));
  }

  private buildScene(): void {
    const bg = new THREE.Color(0x070a10);
    this.scene.background = bg;
    this.scene.fog = new THREE.Fog(bg, 38, 80);

    if (this.quality.environment) {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      this.scene.environment = pmrem.fromScene(room, 0.04).texture;
      this.scene.environmentIntensity = 0.55;
      disposeObject(room);
      pmrem.dispose();
    }

    this.scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b1020, 0.7));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.6);
    key.position.set(12, 22, 14);
    key.castShadow = this.quality.shadows;
    if (key.castShadow) {
      key.shadow.mapSize.setScalar(this.quality.shadowMapSize);
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.02;
      key.shadow.radius = 3;
      const cam = key.shadow.camera;
      cam.near = 1;
      cam.far = 60;
      cam.left = -14;
      cam.right = 14;
      cam.top = 10;
      cam.bottom = -10;
    }
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    rim.position.set(-16, 10, -12);
    this.scene.add(rim);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setScene(state: SceneState): void {
    const prev = this.state;
    this.state = state;
    const animate = !this.reducedMotion && this.animateNextSync;
    this.animateNextSync = true;
    const highlight = new Set(state.highlightIds);
    const health = state.analysis?.health ?? {};

    if (prev?.board !== state.board || prev?.analysis !== state.analysis || prev?.highlightIds !== state.highlightIds) {
      this.blocks.sync(state.board.blocks, health, highlight, animate);
      this.wires.sync(state.board.wires, state.analysis?.links ?? [], (id) => this.blocks.restingPositionOf(id), highlight, animate);
    }

    this.boardMesh.setPlacing(state.tool === 'place' ? state.placingType : null);
    this.boardMesh.setTargets(state.targets);
    const selected = state.selectedId ? this.blocks.restingPositionOf(state.selectedId) : null;
    const source = state.wireSourceId ? this.blocks.restingPositionOf(state.wireSourceId) : null;
    this.boardMesh.setSelection(selected, source);
    if (!source) this.wires.setPreview(null, null);

    this.labels.setBlocks(
      state.board.blocks.map((b) => ({
        id: b.id,
        name: b.name,
        meta: metaFor(b),
        health: b.fault === 'crashed' ? 'down' : (health[b.id] ?? 'idle'),
        anchor: this.labelAnchor(b.id),
        emphasis: b.id === state.selectedId || highlight.has(b.id),
      })),
    );
    this.labels.setCallouts(
      state.callouts.flatMap((c) => {
        const anchor = this.calloutAnchor(c);
        return anchor ? [{ key: c.key, title: c.title, body: c.body, tone: c.tone, anchor }] : [];
      }),
    );
  }

  /** Call when a new level loads: the next sync snaps blocks into place instead of dropping them in. */
  beginLevel(): void {
    this.animateNextSync = false;
    this.traffic.stop();
    this.effects.clear();
    this.tweens.clear();
    this.rig.reset();
  }

  /** The level-intro camera fly-in (call once the board is actually visible). */
  playIntro(): void {
    if (!this.reducedMotion) this.rig.intro();
  }

  /** Animate a test run. Resolves when every packet has arrived or been stopped. */
  playTraffic(trace: TrafficTrace, onDrop?: (hop: Hop) => void): Promise<void> {
    if (!this.state) return Promise.resolve();
    this.traffic.speed = this.reducedMotion ? 3 : 1;
    return this.traffic.play(trace, this.state.board.blocks, { onDrop, onArrive: (id) => this.blocks.flare(id) });
  }

  stopTraffic(): void {
    this.traffic.stop();
  }

  celebrate(): void {
    if (this.reducedMotion) return;
    this.effects.confetti(new THREE.Vector3(0, 0, 0), 14);
    this.rig.sweep();
    this.tweens.add({ duration: 3200, update: () => {}, complete: () => this.rig.returnHome() });
  }

  /** A short burst on a block (placement errors, coach nudges). */
  flashBlock(id: string, color = 0xef4444): void {
    const at = this.blocks.positionOf(id);
    if (at) this.effects.pulse(at, color, 2, 0.5);
  }

  resetCamera(): void {
    this.rig.reset();
  }

  /** Lock out user camera input (cutscenes drive the camera). */
  setCameraLocked(locked: boolean): void {
    this.rig.locked = locked;
  }

  /** Move the camera for a cutscene shot, optionally framing a block. */
  shot(kind: CameraShot, blockId?: string): void {
    const home = this.rig.homeOrbit;
    const at = blockId ? this.blocks.restingPositionOf(blockId)?.setY(0) : undefined;
    const pace = this.reducedMotion ? 4 : 0.35;
    switch (kind) {
      case 'wide':
        this.rig.cinematic({}, pace);
        break;
      case 'close':
        this.rig.cinematic({ target: at, theta: home.theta + 0.25, phi: 0.88, radius: Math.min(11, home.radius * 0.5) }, pace);
        break;
      case 'low':
        this.rig.cinematic({ target: at, theta: home.theta - 0.3, phi: 1.18, radius: Math.min(15, home.radius * 0.65) }, pace);
        break;
      case 'top':
        this.rig.cinematic({ target: at, phi: 0.36, radius: home.radius * 1.05 }, pace);
        break;
      case 'orbit':
        this.rig.drift(0.7, this.reducedMotion ? 4 : 0.12);
        break;
    }
  }

  focusBlock(id: string): void {
    const at = this.blocks.restingPositionOf(id);
    if (at) this.rig.focus(at);
  }

  /** World position of a block (screen-space overlays, cutscenes). */
  screenPositionOf(id: string): { x: number; y: number } | null {
    const at = this.labelAnchor(id).clone().project(this.rig.camera);
    if (at.z > 1) return null;
    return { x: (at.x * 0.5 + 0.5) * this.width, y: (-at.y * 0.5 + 0.5) * this.height };
  }

  /** Screen position of a tile's centre (tests, tutorials pointing at a tile). */
  screenPositionOfTile(gridX: number, gridZ: number): { x: number; y: number } | null {
    const { x, z } = gridToWorld(gridX, gridZ);
    const at = new THREE.Vector3(x, BOARD_TOP, z).project(this.rig.camera);
    if (at.z > 1) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    return { x: rect.left + (at.x * 0.5 + 0.5) * this.width, y: rect.top + (-at.y * 0.5 + 0.5) * this.height };
  }

  /** Tell the renderer how much of the canvas UI covers on the right, so it can recentre. */
  setInsets(insets: { right: number }): void {
    this.insetRight = Math.max(0, insets.right);
  }

  getStats(): RendererStats {
    const info = this.renderer.info;
    return {
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      quality: this.quality.tier,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.rig.dispose();
    this.tweens.clear();
    this.traffic.dispose();
    this.effects.dispose();
    this.blocks.dispose();
    this.wires.dispose();
    this.boardMesh.dispose();
    this.environment.dispose();
    this.labels.dispose();
    this.postFx?.dispose();
    this.scene.environment?.dispose();
    for (const child of [...this.scene.children]) disposeObject(child);
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // ---------------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------------

  private setPointer(tap: PointerTap): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((tap.clientX - rect.left) / rect.width) * 2 - 1, -((tap.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.rig.camera);
  }

  private pick(tap: PointerTap): BoardHit {
    this.setPointer(tap);
    const hits = this.raycaster.intersectObjects([...this.blocks.hitboxes, ...this.wires.hitboxes], false);
    // Blocks win over wires that pass in front of them.
    const block = hits.find((h) => h.object.userData.blockId);
    if (block) return { kind: 'block', id: block.object.userData.blockId as string };
    const wire = hits.find((h) => h.object.userData.wireId);
    if (wire) return { kind: 'wire', id: wire.object.userData.wireId as string };
    const ground = this.raycaster.intersectObject(this.boardMesh.pickPlane, false)[0];
    const cell = ground ? BoardMesh.cellAt(ground.point) : null;
    return cell ? { kind: 'tile', gridX: cell.gx, gridZ: cell.gz } : { kind: 'none' };
  }

  private handleHover(tap: PointerTap | null): void {
    if (!tap) {
      this.boardMesh.setHover(null);
      this.hoverPoint = null;
      this.wires.setPreview(null, null);
      this.callbacks.onHover?.({ kind: 'none' });
      return;
    }
    const hit = this.pick(tap);
    const ground = this.raycaster.intersectObject(this.boardMesh.pickPlane, false)[0];
    this.hoverPoint = ground?.point ?? null;
    const cell = this.hoverPoint ? BoardMesh.cellAt(this.hoverPoint) : null;
    this.boardMesh.setHover(this.state?.tool === 'place' ? cell : null);

    const source = this.state?.wireSourceId ? this.blocks.restingPositionOf(this.state.wireSourceId) : null;
    if (source) {
      const target = hit.kind === 'block' ? this.blocks.restingPositionOf(hit.id) : this.hoverPoint?.clone().setY(BOARD_TOP);
      this.wires.setPreview(source, target ?? null);
    }
    this.renderer.domElement.style.cursor = hit.kind === 'block' || hit.kind === 'wire' ? 'pointer' : this.state?.tool === 'place' ? 'copy' : 'grab';
    this.callbacks.onHover?.(hit);
  }

  // ---------------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------------

  private labelAnchor(id: string): THREE.Vector3 {
    const base = this.blocks.restingPositionOf(id) ?? new THREE.Vector3();
    return base.setY(base.y + this.blocks.heightOf(id) + 0.25);
  }

  private calloutAnchor(c: SceneCallout): THREE.Vector3 | null {
    if (c.blockId && this.blocks.restingPositionOf(c.blockId)) return this.labelAnchor(c.blockId).setY(this.labelAnchor(c.blockId).y + 0.6);
    if (c.wireId) {
      const wire = this.wires.curveOf(c.wireId);
      if (wire) return wire.curve.getPoint(0.6).add(new THREE.Vector3(0, 0.3, 0));
    }
    return null;
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
    this.postFx?.setSize(width, height, this.renderer.getPixelRatio());
    this.labels.setPortrait(width / height < 0.8);
    this.applyViewOffset();
  }

  /** Shift the projection centre left by half the covered width (picking and labels follow it). */
  private applyViewOffset(): void {
    const cam = this.rig.camera;
    const covered = Math.min(this.insetShown, this.width * 0.5);
    this.rig.setAspect(this.width / this.height, (this.width - covered) / this.height);
    const shift = covered / 2;
    if (shift < 0.5) cam.clearViewOffset();
    else cam.setViewOffset(this.width, this.height, shift, 0, this.width, this.height);
  }

  private start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.timer.update();
    const loop = () => {
      if (!this.running) return;
      this.frame = requestAnimationFrame(loop);
      this.tick();
    };
    this.frame = requestAnimationFrame(loop);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  private tick(): void {
    // Clamp so a long pause (tab switch, breakpoint) doesn't fast-forward every animation.
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 1 / 20);
    this.renderer.info.reset();
    this.rig.update(dt);
    if (Math.abs(this.insetShown - this.insetRight) > 0.5) {
      this.insetShown += (this.insetRight - this.insetShown) * (1 - Math.exp(-dt * 8));
      this.applyViewOffset();
    }
    this.tweens.update(dt * 1000);
    this.boardMesh.update(dt);
    this.environment.update(dt);
    this.blocks.update(dt);
    this.wires.update(dt);
    this.traffic.update(dt);
    this.effects.update(dt);
    if (this.postFx) this.postFx.render(dt);
    else this.renderer.render(this.scene, this.rig.camera);
    this.labels.layout(this.rig.camera, this.width, this.height);
  }

  private onVisibility = (): void => {
    if (document.hidden) this.stop();
    else this.start();
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.stop();
  };
}

