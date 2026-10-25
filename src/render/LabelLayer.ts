/**
 * HTML labels over the canvas: block names with health, zone titles, and failure callouts.
 * Labels never take pointer events, so they can't steal clicks from the board. Overlapping block
 * labels are stacked upwards each frame so names never sit on top of each other.
 */

import * as THREE from 'three';
import { BOARD, ZONES, gridToWorld } from '../engine';
import type { Health } from '../engine';
import './labels.css';

export interface BlockLabel {
  id: string;
  name: string;
  meta: string;
  health: Health;
  anchor: THREE.Vector3;
  emphasis: boolean;
}

export interface Callout {
  key: string;
  title: string;
  body: string;
  anchor: THREE.Vector3;
  tone: 'error' | 'warning' | 'info';
}

const HEALTH_TEXT: Record<Health, string> = {
  healthy: 'Healthy',
  overloaded: 'Overloaded',
  down: 'Down',
  unreachable: 'No traffic',
  idle: 'Idle',
};

interface Placed {
  el: HTMLElement;
  anchor: THREE.Vector3;
  kind: 'block' | 'zone' | 'callout';
  emphasis: boolean;
}

const projected = new THREE.Vector3();

export class LabelLayer {
  readonly root: HTMLDivElement;
  private blocks = new Map<string, { el: HTMLElement; data: BlockLabel; placed: Placed; size: { w: number; h: number } | null }>();
  private callouts = new Map<string, Placed>();
  private zones: Placed[] = [];
  /** Portrait framing runs the board top to bottom; zone titles then sit just inside its left edge. */
  private portrait = false;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'cc-labels';
    container.appendChild(this.root);

    // Zone titles hang below the near edge, where perspective gives them the most room.
    const frontZ = (BOARD.maxZ + 0.75) * BOARD.tileSize;
    for (const zone of ZONES) {
      const el = document.createElement('div');
      el.className = 'cc-zone';
      el.style.setProperty('--zone', zone.color);
      el.innerHTML = `<b></b><span></span>`;
      el.querySelector('b')!.textContent = zone.label;
      el.querySelector('span')!.textContent = zone.sublabel;
      this.root.appendChild(el);
      const cx = ((zone.minX + zone.maxX) / 2) * BOARD.tileSize;
      this.zones.push({ el, anchor: new THREE.Vector3(cx, -0.6, frontZ), kind: 'zone', emphasis: false });
    }
    // Availability Zone tags on the VPC's left wall.
    const vpcX = gridToWorld(ZONES.find((z) => z.id === 'public')!.minX, 0).x - BOARD.tileSize * 0.5;
    for (const [label, gz] of [
      ['AZ us-east-1a', BOARD.minZ],
      ['AZ us-east-1b', BOARD.maxZ],
    ] as const) {
      const el = document.createElement('div');
      el.className = 'cc-az';
      el.textContent = label;
      this.root.appendChild(el);
      this.zones.push({ el, anchor: new THREE.Vector3(vpcX + 0.3, 0.2, gz * BOARD.tileSize), kind: 'zone', emphasis: false });
    }
  }

  setPortrait(portrait: boolean): void {
    if (portrait === this.portrait) return;
    this.portrait = portrait;
    this.root.classList.toggle('is-portrait', portrait);
    const z = (portrait ? BOARD.maxZ + 0.2 : BOARD.maxZ + 0.75) * BOARD.tileSize;
    for (const zone of this.zones) if (zone.el.classList.contains('cc-zone')) zone.anchor.z = z;
  }

  setBlocks(labels: BlockLabel[]): void {
    const seen = new Set<string>();
    for (const label of labels) {
      seen.add(label.id);
      let entry = this.blocks.get(label.id);
      if (!entry) {
        const el = document.createElement('div');
        el.className = 'cc-label';
        el.innerHTML = '<i class="cc-label__dot"></i><span class="cc-label__name"></span><span class="cc-label__meta"></span>';
        this.root.appendChild(el);
        entry = { el, data: label, placed: { el, anchor: label.anchor, kind: 'block', emphasis: label.emphasis }, size: null };
        this.blocks.set(label.id, entry);
        this.write(entry.el, label, null);
      } else if (this.write(entry.el, label, entry.data)) {
        entry.size = null;
      }
      entry.data = label;
      entry.placed.anchor = label.anchor;
      entry.placed.emphasis = label.emphasis;
    }
    for (const [id, entry] of this.blocks) {
      if (!seen.has(id)) {
        entry.el.remove();
        this.blocks.delete(id);
      }
    }
  }

  /** Only touch the DOM for fields that changed. Returns true if the label's size may have changed. */
  private write(el: HTMLElement, next: BlockLabel, prev: BlockLabel | null): boolean {
    if (prev?.name !== next.name) el.querySelector('.cc-label__name')!.textContent = next.name;
    const meta = `${next.meta} · ${HEALTH_TEXT[next.health]}`;
    if (!prev || prev.meta !== next.meta || prev.health !== next.health) el.querySelector('.cc-label__meta')!.textContent = meta;
    if (prev?.health !== next.health) el.dataset.health = next.health;
    if (prev?.emphasis !== next.emphasis) el.classList.toggle('is-emphasis', next.emphasis);
    return !prev || prev.name !== next.name || prev.meta !== next.meta || prev.health !== next.health || prev.emphasis !== next.emphasis;
  }

  setCallouts(callouts: Callout[]): void {
    const seen = new Set<string>();
    for (const c of callouts) {
      seen.add(c.key);
      let placed = this.callouts.get(c.key);
      if (!placed) {
        const el = document.createElement('div');
        el.className = 'cc-callout';
        el.innerHTML = '<b></b><span></span>';
        this.root.appendChild(el);
        placed = { el, anchor: c.anchor, kind: 'callout', emphasis: true };
        this.callouts.set(c.key, placed);
      }
      placed.anchor = c.anchor;
      placed.el.dataset.tone = c.tone;
      placed.el.querySelector('b')!.textContent = c.title;
      placed.el.querySelector('span')!.textContent = c.body;
    }
    for (const [key, placed] of this.callouts) {
      if (!seen.has(key)) {
        placed.el.remove();
        this.callouts.delete(key);
      }
    }
  }

  /** Forget measured sizes (after web fonts load or the UI scale changes). */
  invalidateSizes(): void {
    for (const entry of this.blocks.values()) entry.size = null;
  }

  setVisible(visible: boolean): void {
    this.root.style.visibility = visible ? 'visible' : 'hidden';
  }

  /** Project every label and resolve overlaps. Call once per rendered frame. */
  layout(camera: THREE.Camera, width: number, height: number): void {
    const place = (p: Placed) => {
      projected.copy(p.anchor).project(camera);
      const behind = projected.z > 1;
      return { x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height, behind };
    };

    // Measure first (DOM reads), then position (DOM writes), so the browser lays out once.
    const entries = [...this.blocks.values()];
    for (const e of entries) {
      if (!e.size) e.size = { w: e.el.offsetWidth || 96, h: e.el.offsetHeight || 22 };
    }

    for (const z of this.zones) {
      const s = place(z);
      const isZone = z.el.classList.contains('cc-zone');
      const anchor = !isZone ? '-50%, -100%' : this.portrait ? '0%, -50%' : '-50%, 0%';
      z.el.style.transform = `translate(${anchor}) translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
      z.el.style.display = s.behind ? 'none' : '';
    }

    // Labels nearest the viewer (lowest on screen) keep their spot; ones behind them lift up
    // until they no longer overlap anything already placed.
    const ordered = entries.map((e) => ({ e, s: place(e.placed) })).sort((a, b) => b.s.y - a.s.y);
    const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
    for (const { e, s } of ordered) {
      const { w, h } = e.size!;
      let y = s.y;
      for (let guard = 0; guard < 8; guard++) {
        const box = { x0: s.x - w / 2, x1: s.x + w / 2, y0: y - h, y1: y };
        const hit = boxes.find((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
        if (!hit) break;
        y = hit.y0 - 2;
      }
      boxes.push({ x0: s.x - w / 2, x1: s.x + w / 2, y0: y - h, y1: y });
      e.el.style.transform = `translate(-50%, -100%) translate(${s.x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      e.el.style.display = s.behind ? 'none' : '';
      e.el.classList.toggle('is-lifted', y < s.y - 1);
    }

    for (const c of this.callouts.values()) {
      const s = place(c);
      c.el.style.transform = `translate(-50%, -100%) translate(${s.x.toFixed(1)}px, ${(s.y - 8).toFixed(1)}px)`;
      c.el.style.display = s.behind ? 'none' : '';
    }
  }

  dispose(): void {
    this.root.remove();
    this.blocks.clear();
    this.callouts.clear();
    this.zones = [];
  }
}
