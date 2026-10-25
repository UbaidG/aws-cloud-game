/** Player progression: unlocks and ranks. Pure functions over the save. */

import { XP, type SaveData } from '../engine';
import { getLevel } from '../content/levels';

export function isUnlocked(save: SaveData, levelId: number): boolean {
  return levelId === 1 || save.completed.includes(levelId) || save.completed.includes(levelId - 1);
}

/** The next level to play: the first unlocked level that isn't complete. */
export function nextLevelId(save: SaveData, maxLevel: number): number {
  for (let id = 1; id <= maxLevel; id++) {
    if (!save.completed.includes(id) && isUnlocked(save, id)) return id;
  }
  return maxLevel;
}

const RANKS = [
  { xp: 0, title: 'Cloud Intern' },
  { xp: 500, title: 'Cloud Practitioner' },
  { xp: 1500, title: 'Associate Architect' },
  { xp: 3500, title: 'Solutions Architect' },
  { xp: 6500, title: 'Senior Architect' },
  { xp: 10500, title: 'Principal Architect' },
  { xp: 16000, title: 'Distinguished Engineer' },
] as const;

export interface Rank {
  index: number;
  title: string;
  /** XP into the current rank and needed for the next (null at max rank). */
  into: number;
  span: number | null;
}

export function rankFor(xp: number): Rank {
  let index = 0;
  while (index + 1 < RANKS.length && xp >= RANKS[index + 1].xp) index++;
  const next = RANKS[index + 1];
  return {
    index,
    title: RANKS[index].title,
    into: xp - RANKS[index].xp,
    span: next ? next.xp - RANKS[index].xp : null,
  };
}

/** XP a level has already paid out for its best star count, so replays only award the difference. */
export function xpAlreadyEarned(save: SaveData, levelId: number): number {
  const stars = save.stars[levelId] ?? 0;
  if (!save.completed.includes(levelId) || stars === 0) return 0;
  return XP.complete + (stars - 1) * XP.perBonusStar + (getLevel(levelId).isAssessment ? XP.assessmentBonus : 0);
}
