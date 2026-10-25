/**
 * Cutscenes: short animated stories that open a level (the real-world situation, what goes
 * wrong, and the player's mission). Stored in `level.presentation.cutscene`.
 *
 * A cutscene plays on the real board with the real engine. `stage` holds every block and wire
 * that will ever appear; beats reveal, remove, break and test them in order. Traffic beats run
 * `analyzeBoard` on whatever is visible, so even the story obeys the game's rules.
 */

import { CATALOG } from '../engine/catalog';
import { zoneAt } from '../engine/board';
import type { Board, LevelSpec } from '../engine/types';

/** The recurring cast. Speech bubbles show the name, role and colour. */
export const CAST = {
  cto: { name: 'Maya', role: 'CTO', color: '#f59e0b' },
  oncall: { name: 'Dev', role: 'On-call engineer', color: '#38bdf8' },
  founder: { name: 'Rio', role: 'Founder', color: '#a78bfa' },
  security: { name: 'Ines', role: 'Security lead', color: '#ef4444' },
  finance: { name: 'Tom', role: 'Finance', color: '#22c55e' },
  customer: { name: 'A customer', role: 'Out on the internet', color: '#94a3b8' },
} as const;

export type CastId = keyof typeof CAST;

export type Shot =
  /** The level's home framing. */
  | 'wide'
  /** Close on one block. */
  | 'close'
  /** Low and dramatic, looking across the board at a block. */
  | 'low'
  /** High overhead. */
  | 'top'
  /** A slow arc around the current target. */
  | 'orbit';

export type Tone = 'info' | 'good' | 'bad' | 'warn';

export type Beat =
  | { t: 'camera'; shot: Shot; on?: string; hold?: number }
  | { t: 'spawn'; ids: string[]; hold?: number }
  | { t: 'remove'; ids: string[]; hold?: number }
  /** Reveal wires by id (wire ids are `a--b`). */
  | { t: 'wire'; ids: string[]; hold?: number }
  /** Inject a fault: the block crashes. */
  | { t: 'crash'; id: string; hold?: number }
  /** Run the engine on the visible board and animate the real trace. */
  | { t: 'traffic'; rps?: number; botRps?: number; hold?: number; expect?: 'served' | 'blocked' }
  /** Point at a block: flash, plus a callout bubble above it. */
  | { t: 'callout'; on: string; title: string; body?: string; tone?: Tone; hold?: number }
  | { t: 'caption'; text: string; hold?: number }
  | { t: 'speech'; who: CastId; text: string; hold?: number }
  /** An animated counter chip, e.g. p99 latency or the monthly bill. */
  | { t: 'stat'; label: string; value: number; unit?: string; prefix?: string; tone?: Tone; hold?: number }
  /** Clear captions, speech, stats and callouts. */
  | { t: 'clear'; hold?: number }
  | { t: 'wait'; ms: number };

export interface CutsceneSpec {
  /** Every block and wire the story uses. */
  stage: Board;
  /** Ids visible when the scene opens (default: none). */
  start?: string[];
  beats: Beat[];
  /** Blocks deliberately placed somewhere illegal (the story is about that mistake). */
  illegal?: string[];
}

/** The stage as it stands after some beats: what's visible, wired and broken. */
export class StageState {
  readonly visible: Set<string>;
  readonly wires = new Set<string>();
  readonly crashed = new Set<string>();

  constructor(private readonly spec: CutsceneSpec) {
    this.visible = new Set(spec.start ?? []);
  }

  apply(beat: Beat): void {
    if (beat.t === 'spawn') for (const id of beat.ids) this.visible.add(id);
    if (beat.t === 'remove') for (const id of beat.ids) this.visible.delete(id);
    if (beat.t === 'wire') for (const id of beat.ids) this.wires.add(id);
    if (beat.t === 'crash') this.crashed.add(beat.id);
  }

  board(): Board {
    const blocks = this.spec.stage.blocks
      .filter((b) => this.visible.has(b.id))
      .map((b) => (this.crashed.has(b.id) ? { ...b, fault: 'crashed' as const } : b));
    const wires = this.spec.stage.wires.filter((w) => this.wires.has(w.id) && this.visible.has(w.a) && this.visible.has(w.b));
    return { blocks, wires };
  }
}

/** How long a beat holds before the next one starts, in ms. */
export function beatHold(beat: Beat): number {
  if (beat.t === 'wait') return beat.ms;
  if (beat.hold !== undefined) return beat.hold;
  switch (beat.t) {
    case 'caption':
    case 'speech':
      return 1400 + beat.text.length * 38;
    case 'callout':
      return 1600 + ((beat.body?.length ?? 0) + beat.title.length) * 25;
    case 'traffic':
      return 3800;
    case 'stat':
      return 1300;
    case 'spawn':
      return 650;
    case 'remove':
    case 'wire':
      return 450;
    case 'crash':
      return 900;
    case 'camera':
    case 'clear':
      return 0;
  }
}

export function cutsceneDuration(spec: CutsceneSpec): number {
  return spec.beats.reduce((ms, b) => ms + beatHold(b), 0);
}

export function cutsceneOf(level: LevelSpec): CutsceneSpec | null {
  return (level.presentation?.cutscene as CutsceneSpec | undefined) ?? null;
}

/** Problems with a cutscene (empty when it's sound). Used by tests. */
export function validateCutscene(spec: CutsceneSpec): string[] {
  const problems: string[] = [];
  const blocks = new Set(spec.stage.blocks.map((b) => b.id));
  const byId = new Map(spec.stage.blocks.map((b) => [b.id, b]));
  const wires = new Map(spec.stage.wires.map((w) => [w.id, w]));
  for (const w of spec.stage.wires) {
    if (!blocks.has(w.a) || !blocks.has(w.b)) problems.push(`wire ${w.id} joins a block that isn't on the stage`);
  }
  const illegal = new Set(spec.illegal ?? []);
  for (const b of spec.stage.blocks) {
    const legal = CATALOG[b.type].zones.includes(zoneAt(b.gridX));
    if (!legal && !illegal.has(b.id)) problems.push(`${b.id} (${b.type}) sits in the ${zoneAt(b.gridX)} zone`);
  }
  const visible = new Set(spec.start ?? []);
  for (const id of visible) if (!blocks.has(id)) problems.push(`start: unknown block ${id}`);
  const shown = new Set<string>();
  spec.beats.forEach((beat, i) => {
    const at = `beat ${i} (${beat.t})`;
    const needBlock = (id: string) => {
      if (!blocks.has(id)) problems.push(`${at}: unknown block ${id}`);
      else if (!visible.has(id)) problems.push(`${at}: ${id} isn't visible yet`);
    };
    switch (beat.t) {
      case 'spawn':
        for (const id of beat.ids) {
          if (!blocks.has(id)) problems.push(`${at}: unknown block ${id}`);
          const b = byId.get(id);
          const clash = b && [...visible].find((v) => v !== id && byId.get(v)?.gridX === b.gridX && byId.get(v)?.gridZ === b.gridZ);
          if (clash) problems.push(`${at}: ${id} lands on the same tile as ${clash}`);
          visible.add(id);
        }
        break;
      case 'remove':
        for (const id of beat.ids) {
          needBlock(id);
          visible.delete(id);
        }
        break;
      case 'wire':
        for (const id of beat.ids) {
          const w = wires.get(id);
          if (!w) problems.push(`${at}: unknown wire ${id}`);
          else if (!visible.has(w.a) || !visible.has(w.b)) problems.push(`${at}: wire ${id} before both ends are visible`);
          else shown.add(id);
        }
        break;
      case 'crash':
        needBlock(beat.id);
        break;
      case 'callout':
        needBlock(beat.on);
        break;
      case 'camera':
        if (beat.on) needBlock(beat.on);
        else if (beat.shot === 'close' || beat.shot === 'low') problems.push(`${at}: a ${beat.shot} shot needs a block`);
        break;
      case 'traffic':
        if (shown.size === 0) problems.push(`${at}: traffic with no wires shown`);
        break;
    }
  });
  return problems;
}
