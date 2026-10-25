/** Every level in the game, in order. */

import type { LevelSpec } from '../../engine/types';
import legacyText from '../legacy/levelText.json';
import { MODULE_1_CUTSCENES } from '../cutscenes/module1';
import type { CutsceneSpec } from '../cutscene';
import { compileRecipe, type LegacyText } from '../recipe';
import { withStageText, withText } from '../story';
import { STORIES } from '../stories';
import { MODULE_1_LEVELS } from './module1';
import { RECIPES } from './recipes';

const textById = new Map((legacyText as LegacyText[]).map((t) => [t.id, t]));

export function legacyTextFor(id: number): LegacyText {
  const text = textById.get(id);
  if (!text) throw new Error(`No text for level ${id}`);
  return text;
}

/** A recipe level's text: the legacy words, with its Phase 6 story on top where written. */
export function textFor(id: number): LegacyText {
  return withText(legacyTextFor(id), STORIES[id]);
}

const compiled = RECIPES.map((recipe) => compileRecipe(withStageText(recipe, STORIES[recipe.id]), textFor(recipe.id)));

const CUTSCENES: Record<number, CutsceneSpec> = {
  ...MODULE_1_CUTSCENES,
  ...Object.fromEntries(Object.entries(STORIES).map(([id, story]) => [id, story.cutscene])),
};

const withStory = (level: LevelSpec): LevelSpec =>
  CUTSCENES[level.id] ? { ...level, presentation: { ...level.presentation, cutscene: CUTSCENES[level.id] } } : level;

export const LEVELS: LevelSpec[] = [...MODULE_1_LEVELS, ...compiled].map(withStory).sort((a, b) => a.id - b.id);

export const MAX_LEVEL = LEVELS.length;

const byId = new Map(LEVELS.map((l) => [l.id, l]));

export function getLevel(id: number): LevelSpec {
  const level = byId.get(id);
  if (!level) throw new Error(`Unknown level ${id}`);
  return level;
}
