/**
 * Level stories: the Phase 6 rewrite of a recipe level's words, its opening cutscene, and a
 * "wrong board" that proves the level teaches what it claims to.
 *
 * A story sits beside its recipe rather than inside it, so the rules (recipes) and the writing
 * (stories) can change independently. `src/content/levels/index.ts` merges the two.
 */

import type { BlockConfig, Board, ConceptCard, LevelSpec } from '../engine/types';
import { block, wire } from './build';
import type { CutsceneSpec } from './cutscene';
import { parseBlocks, parseWires, type LegacyText, type LevelRecipe, type StageRecipe } from './recipe';

/** Everything a player reads about a level outside the stage cards. */
export interface LevelText {
  title: string;
  /** One line under the title on the map. */
  tagline: string;
  concepts: string[];
  /** The mission card after the cutscene: the situation and the job, two or three sentences. */
  briefing: string;
  /** Real-world tips. A stage's second hint is `docTips[stageIdx]`. */
  docTips: string[];
  conceptCard: ConceptCard;
  difficulty?: LevelSpec['difficulty'];
  /** Terraform for the finished board. `null` removes the legacy snippet. */
  iacSnippet?: string | null;
}

/**
 * Changes to a stage's finished board, using the recipe's block ids. Applied in the order
 * remove, unwire, add, move, set, wire.
 */
export interface BoardChange {
  remove?: string[];
  /** Wires to delete, as "a-b". */
  unwire?: string;
  /** Extra blocks, as "id:type@x,z". */
  add?: string;
  /** New grid positions. */
  move?: Record<string, [number, number]>;
  set?: Record<string, Partial<BlockConfig>>;
  /** Extra wires, as "a-b". */
  wire?: string;
}

/**
 * The tempting mistake for a stage: the finished board with one plausible thing done wrong.
 * It must fail, and fail for the reason the level is about.
 */
export interface WrongBoard {
  /** 1-based stage number. */
  stage: number;
  /** The misconception, in a few words (shown in test names). */
  why: string;
  change: BoardChange;
  /** An objective id the board must fail (e.g. `s2-1`) or a blocking violation code (e.g. `zone.db_exposed`). */
  fails: string;
}

/** Rewrites of a stage's card. Goals stay in the recipe. */
export type StageText = Partial<Pick<StageRecipe, 'title' | 'brief' | 'goal' | 'hint'>>;

export interface LevelStory {
  text: LevelText;
  cutscene: CutsceneSpec;
  wrong: WrongBoard;
  /** Per-stage text overrides, by stage index. */
  stages?: StageText[];
}

/** The recipe with its stage cards rewritten. */
export function withStageText(recipe: LevelRecipe, story: LevelStory | undefined): LevelRecipe {
  if (!story?.stages) return recipe;
  return { ...recipe, stages: recipe.stages.map((s, i) => ({ ...s, ...story.stages![i] })) };
}

/** The legacy text with a story's rewrite on top. */
export function withText(legacy: LegacyText, story: LevelStory | undefined): LegacyText {
  if (!story) return legacy;
  const { iacSnippet, ...text } = story.text;
  return { ...legacy, ...text, iacSnippet: iacSnippet === undefined ? legacy.iacSnippet : iacSnippet };
}

export function applyChange(board: Board, change: BoardChange, levelId: number): Board {
  let blocks = structuredClone(board.blocks);
  let wires = structuredClone(board.wires);
  const need = (id: string) => {
    if (!blocks.some((b) => b.id === id)) throw new Error(`Level ${levelId}: wrong board refers to unknown block "${id}"`);
  };
  for (const id of change.remove ?? []) {
    need(id);
    blocks = blocks.filter((b) => b.id !== id);
    wires = wires.filter((w) => w.a !== id && w.b !== id);
  }
  for (const [a, b] of parseWires(change.unwire, levelId)) {
    const before = wires.length;
    wires = wires.filter((w) => !((w.a === a && w.b === b) || (w.a === b && w.b === a)));
    if (wires.length === before) throw new Error(`Level ${levelId}: wrong board unwires missing wire "${a}-${b}"`);
  }
  for (const p of parseBlocks(change.add, levelId)) blocks.push(block(p.id, p.type, p.x, p.z));
  for (const [id, [x, z]] of Object.entries(change.move ?? {})) {
    need(id);
    blocks = blocks.map((b) => (b.id === id ? { ...b, gridX: x, gridZ: z } : b));
  }
  for (const [id, patch] of Object.entries(change.set ?? {})) {
    need(id);
    blocks = blocks.map((b) => (b.id === id ? { ...b, config: { ...b.config, ...patch } } : b));
  }
  for (const [a, b] of parseWires(change.wire, levelId)) {
    need(a);
    need(b);
    wires.push(wire(a, b));
  }
  return { blocks, wires };
}
