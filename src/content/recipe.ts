/**
 * Level recipes: a compact way to author a level as "what's on the board, and what the player
 * changes in each stage". The compiler turns a recipe into a full `LevelSpec`, derives the
 * reference solution by replaying every stage's changes, and writes the step-by-step hint
 * from those same changes, so the hint can never disagree with the solution.
 */

import { zoneAt, zoneSpec } from '../engine/board';
import { CATALOG } from '../engine/catalog';
import type {
  Block,
  BlockConfig,
  Board,
  ConceptCard,
  GameMode,
  LevelSpec,
  LoadProfile,
  Objective,
  ObjectiveRule,
  ServiceType,
  Stage,
} from '../engine/types';
import { block, users, wire } from './build';

/** An objective rule, optionally with its own label and hint. */
export type Goal = ObjectiveRule & { label?: string; hint?: string };

export interface StageRecipe {
  title: string;
  brief: string;
  goal: string;
  /** Blocks the player places, as "id:type@x,z" separated by spaces. */
  add?: string;
  /** Wires the player draws, as "a-b" separated by spaces. */
  wire?: string;
  /** Wires the player deletes, as "a-b" matching a pre-placed wire. */
  unwire?: string;
  /** Config the player changes, keyed by block id. */
  set?: Record<string, Partial<BlockConfig>>;
  /** Block ids the player deletes. */
  remove?: string[];
  /** Defaults to the types in `add`. */
  palette?: ServiceType[];
  goals: Goal[];
  load?: LoadProfile;
  /** First (gentlest) hint. Defaults to the stage goal. */
  hint?: string;
}

export interface LevelRecipe {
  id: number;
  /**
   * Pre-placed blocks, as "id:type@x,z". Prefix `~` for a removable block, `!` for a crashed one.
   * Everything else is locked. Internet Users are always added at (-6, 0).
   */
  given?: string;
  givenWires?: string;
  givenConfig?: Record<string, Partial<BlockConfig>>;
  /** Display names for pre-placed blocks. */
  names?: Record<string, string>;
  /** Who the traffic comes from, when it isn't the public (e.g. "Head Office"). */
  clientName?: string;
  stages: StageRecipe[];
  limits?: LevelSpec['limits'];
  inspector?: LevelSpec['inspectorMode'];
  mode?: GameMode;
}

/** Text carried over from the original game until each level gets its Phase 6 rewrite. */
export interface LegacyText {
  id: number;
  moduleId: number;
  title: string;
  tagline: string;
  difficulty: LevelSpec['difficulty'];
  isAssessment: boolean;
  gameMode: GameMode;
  concepts: string[];
  briefing: string;
  docTips: string[];
  conceptCard: ConceptCard | null;
  iacSnippet: string | null;
}

// ---------------------------------------------------------------------------
// Parsing

const BLOCK_RE = /^([~!]?)([\w-]+):(\w+)@(-?\d+),(-?\d+)$/;

interface ParsedBlock {
  id: string;
  type: ServiceType;
  x: number;
  z: number;
  flag: '' | '~' | '!';
}

export function parseBlocks(spec: string | undefined, levelId: number): ParsedBlock[] {
  if (!spec) return [];
  return spec
    .trim()
    .split(/\s+/)
    .map((token) => {
      const m = BLOCK_RE.exec(token);
      if (!m) throw new Error(`Level ${levelId}: bad block "${token}"`);
      const type = m[3] as ServiceType;
      if (!(type in CATALOG)) throw new Error(`Level ${levelId}: unknown service "${type}"`);
      return { flag: m[1] as ParsedBlock['flag'], id: m[2], type, x: Number(m[4]), z: Number(m[5]) };
    });
}

export function parseWires(spec: string | undefined, levelId: number): [string, string][] {
  if (!spec) return [];
  return spec
    .trim()
    .split(/\s+/)
    .map((token) => {
      const parts = token.split('-');
      if (parts.length !== 2) throw new Error(`Level ${levelId}: bad wire "${token}" (use a-b; ids may not contain "-")`);
      return [parts[0], parts[1]];
    });
}

// ---------------------------------------------------------------------------
// Labels

const label = (t: ServiceType) => CATALOG[t].shortLabel;

const CONFIG_LABELS: Record<string, (v: unknown) => string> = {
  multiAZ: (v) => (v ? 'Multi-AZ on' : 'Multi-AZ off'),
  encrypted: (v) => (v ? 'encryption on' : 'encryption off'),
  readReplica: (v) => (v ? 'read replica on' : 'read replica off'),
  blockPublicAccess: (v) => (v ? 'public access blocked' : 'public access allowed'),
  versioning: (v) => (v ? 'versioning on' : 'versioning off'),
  originAccessControl: (v) => (v ? 'origin access control on' : 'origin access control off'),
  instanceType: (v) => `size ${String(v)}`,
  routingPolicy: (v) => `${String(v)} routing`,
  desiredCount: (v) => `${String(v)} tasks`,
  minCapacity: (v) => `minimum ${String(v)} servers`,
  maxCapacity: (v) => `maximum ${String(v)} servers`,
};

function configText(key: string, value: unknown): string {
  return CONFIG_LABELS[key]?.(value) ?? `${key} = ${JSON.stringify(value)}`;
}

function goalLabel(g: Goal): string {
  switch (g.kind) {
    case 'place':
      return `Place ${g.count && g.count > 1 ? `${g.count} ` : 'a '}${label(g.type)}${g.zone ? ` in the ${zoneSpec(g.zone).label}` : ''}`;
    case 'maxCount':
      return `No more than ${g.max} ${label(g.type)}`;
    case 'wire':
      return `Wire ${label(g.a)} to ${label(g.b)}${g.count && g.count > 1 ? ` ×${g.count}` : ''}`;
    case 'path':
      return `Traffic flows ${g.through.map(label).join(' → ')}`;
    case 'reach':
      return `Traffic reaches ${g.count && g.count > 1 ? `${g.count} ` : ''}${label(g.type)}`;
    case 'azSpread':
      return `${label(g.type)} serving from two Availability Zones`;
    case 'config':
      return `${label(g.type)}: ${configText(g.key, g.equals)}`;
    case 'firewall':
      return `Port ${g.port} on ${label(g.type)} ${g.open ? 'open to' : 'closed to'} the internet`;
    case 'removed':
      return 'Remove the broken or wasted blocks';
    case 'apart':
      return `${label(g.a)} no longer wired to ${label(g.b)}`;
    case 'sla': {
      const parts: string[] = [];
      if (g.maxLatencyMs !== undefined) parts.push(`latency ≤ ${g.maxLatencyMs}ms`);
      if (g.minCapacityRps !== undefined) parts.push(`capacity ≥ ${g.minCapacityRps} req/s`);
      if (g.maxErrorRatePercent !== undefined) parts.push(`errors ≤ ${g.maxErrorRatePercent}%`);
      if (g.maxCostUsd !== undefined) parts.push(`bill ≤ $${g.maxCostUsd}/mo`);
      if (g.minSecurityScore !== undefined) parts.push(`security ≥ ${g.minSecurityScore}`);
      const text = parts.join(', ');
      return text.charAt(0).toUpperCase() + text.slice(1);
    }
  }
}

function goalHint(g: Goal): string {
  switch (g.kind) {
    case 'place':
      return `Pick ${label(g.type)} from the toolbelt${g.zone ? ` and drop it in the ${zoneSpec(g.zone).label}` : ''}.`;
    case 'maxCount':
      return `Delete extra ${label(g.type)} blocks.`;
    case 'wire':
      return `Use the Wire tool between ${label(g.a)} and ${label(g.b)}.`;
    case 'path':
      return `Every hop on ${g.through.map(label).join(' → ')} needs a legal wire. Run Traffic shows where packets stop.`;
    case 'reach':
      return `Wire each ${label(g.type)} into the request path.`;
    case 'azSpread':
      return 'The board is split into two Availability Zones, us-east-1a and us-east-1b. Put one on each side of the line.';
    case 'config':
      return `Select the ${label(g.type)} and change it in the inspector.`;
    case 'firewall':
      return `Select the ${label(g.type)} and edit its security group.`;
    case 'removed':
      return 'Use the Delete tool.';
    case 'apart':
      return `Select the wire between ${label(g.a)} and ${label(g.b)} and delete it.`;
    case 'sla':
      return 'Watch the gauges after each test: they tell you which number is off.';
  }
}

// ---------------------------------------------------------------------------
// Compilation

function toBlock(p: ParsedBlock, names: Record<string, string> | undefined, fromPlayer: boolean, n: number): Block {
  if (fromPlayer) {
    return block(p.id, p.type, p.x, p.z, { name: `${label(p.type)} ${n}` });
  }
  return block(p.id, p.type, p.x, p.z, {
    name: names?.[p.id],
    locked: p.flag === '' ? true : undefined,
    fault: p.flag === '!' ? 'crashed' : undefined,
  });
}

/** One player move in a recipe's solution, using recipe block ids. */
export type RecipeStep =
  | { type: 'remove'; id: string }
  | { type: 'unwire'; a: string; b: string }
  | { type: 'place'; id: string; service: ServiceType; gridX: number; gridZ: number }
  | { type: 'set'; id: string; patch: Partial<BlockConfig> }
  | { type: 'wire'; a: string; b: string };

interface AppliedStage {
  board: Board;
  /** Plain-English walkthrough, used as the final hint. */
  steps: string[];
  moves: RecipeStep[];
}

function applyStage(level: number, board: Board, s: StageRecipe, counters: Map<ServiceType, number>): AppliedStage {
  const steps: string[] = [];
  const moves: RecipeStep[] = [];
  let blocks = [...board.blocks];
  let wires = [...board.wires];
  const nameOf = (id: string) => {
    const b = blocks.find((x) => x.id === id);
    if (!b) throw new Error(`Level ${level}: stage "${s.title}" refers to unknown block "${id}"`);
    return b.locked || b.type === 'client' ? `"${b.name}"` : `the ${b.name.startsWith(label(b.type)) ? label(b.type) : b.name}`;
  };

  for (const id of s.remove ?? []) {
    steps.push(`Delete ${nameOf(id)}.`);
    moves.push({ type: 'remove', id });
    blocks = blocks.filter((b) => b.id !== id);
    wires = wires.filter((w) => w.a !== id && w.b !== id);
  }
  for (const [a, b] of parseWires(s.unwire, level)) {
    const before = wires.length;
    wires = wires.filter((w) => !((w.a === a && w.b === b) || (w.a === b && w.b === a)));
    if (wires.length === before) throw new Error(`Level ${level}: stage "${s.title}" unwires missing wire "${a}-${b}"`);
    steps.push(`Delete the wire between ${nameOf(a)} and ${nameOf(b)}.`);
    moves.push({ type: 'unwire', a, b });
  }
  for (const p of parseBlocks(s.add, level)) {
    if (blocks.some((b) => b.id === p.id)) throw new Error(`Level ${level}: duplicate block id "${p.id}"`);
    const n = (counters.get(p.type) ?? 0) + 1;
    counters.set(p.type, n);
    blocks.push(toBlock(p, undefined, true, n));
    steps.push(`Place ${label(p.type)} in the ${zoneSpec(zoneAt(p.x)).label}.`);
    moves.push({ type: 'place', id: p.id, service: p.type, gridX: p.x, gridZ: p.z });
  }
  for (const [id, patch] of Object.entries(s.set ?? {})) {
    const target = blocks.find((b) => b.id === id);
    if (!target) throw new Error(`Level ${level}: stage "${s.title}" configures unknown block "${id}"`);
    blocks = blocks.map((b) => (b.id === id ? { ...b, config: { ...b.config, ...patch } } : b));
    const changes = Object.entries(patch).map(([k, v]) =>
      k === 'securityGroupInbound' ? 'fix its security group rules' : `set ${configText(k, v)}`
    );
    steps.push(`Select ${nameOf(id)} and ${changes.join(', ')}.`);
    moves.push({ type: 'set', id, patch });
  }
  for (const [a, b] of parseWires(s.wire, level)) {
    steps.push(`Wire ${nameOf(a)} to ${nameOf(b)}.`);
    moves.push({ type: 'wire', a, b });
    wires.push(wire(a, b));
  }
  steps.push('Run Traffic.');
  return { board: { blocks, wires }, steps, moves };
}

export interface CompiledRecipe {
  level: LevelSpec;
  /** The board at the end of each stage. */
  stageBoards: Board[];
  /** The player moves that solve each stage. */
  stageMoves: RecipeStep[][];
}

export function compileRecipe(recipe: LevelRecipe, text: LegacyText): LevelSpec {
  return compileRecipeDetailed(recipe, text).level;
}

export function compileRecipeDetailed(recipe: LevelRecipe, text: LegacyText): CompiledRecipe {
  const id = recipe.id;
  const givenBlocks = parseBlocks(recipe.given, id).map((p) => {
    const b = toBlock(p, recipe.names, false, 0);
    const patch = recipe.givenConfig?.[p.id];
    return patch ? { ...b, config: { ...b.config, ...patch } } : b;
  });
  const givenWires = parseWires(recipe.givenWires, id).map(([a, b]) => wire(a, b));
  const client = recipe.clientName ? { ...users(), name: recipe.clientName } : users();
  const initial: Board = { blocks: [client, ...givenBlocks], wires: givenWires };

  const counters = new Map<ServiceType, number>();
  for (const b of givenBlocks) counters.set(b.type, (counters.get(b.type) ?? 0) + 1);

  let board = structuredClone(initial);
  const stageBoards: Board[] = [];
  const stageMoves: RecipeStep[][] = [];
  const stages: Stage[] = recipe.stages.map((s, stageIdx) => {
    const applied = applyStage(id, board, s, counters);
    board = applied.board;
    stageBoards.push(board);
    stageMoves.push(applied.moves);
    const objectives: Objective[] = s.goals.map((g, i) => {
      const { label: customLabel, hint: customHint, ...rule } = g;
      return {
        ...(rule as ObjectiveRule),
        id: `s${stageIdx + 1}-${i + 1}`,
        label: customLabel ?? goalLabel(g),
        hint: customHint ?? goalHint(g),
      } as Objective;
    });
    const palette = s.palette ?? [...new Set(parseBlocks(s.add, id).map((p) => p.type))];
    return {
      title: s.title,
      brief: s.brief,
      goal: s.goal,
      palette,
      objectives,
      load: s.load,
      hints: [s.hint ?? s.goal, text.docTips[stageIdx % Math.max(1, text.docTips.length)] ?? s.brief, applied.steps.join(' ')],
    };
  });

  const level: LevelSpec = {
    id,
    moduleId: text.moduleId,
    title: text.title,
    tagline: text.tagline,
    difficulty: text.difficulty,
    isAssessment: text.isAssessment || undefined,
    gameMode: recipe.mode ?? text.gameMode,
    concepts: text.concepts,
    briefing: text.briefing,
    docTips: text.docTips,
    conceptCard: text.conceptCard ?? undefined,
    inspectorMode: recipe.inspector ?? (text.moduleId <= 4 ? 'intermediate' : 'full'),
    iacSnippet: text.iacSnippet ?? undefined,
    initial,
    solution: board,
    stages,
    limits: recipe.limits,
  };
  return { level, stageBoards, stageMoves };
}
