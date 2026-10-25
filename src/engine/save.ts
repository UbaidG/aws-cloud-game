/**
 * Versioned save data. Parsing never throws: anything malformed falls back to a fresh save.
 * Storage I/O lives in the app; this module only converts between strings and validated data.
 */

import { isServiceType } from './catalog';
import type { Board, Session } from './types';

export const SAVE_KEY = 'cloudcraft_save_v3';
export const LEGACY_SAVE_KEYS = ['cloudcraft_60levels_progress_v2'] as const;

export interface SaveSettings {
  muted: boolean;
  quality: 'auto' | 'low' | 'medium' | 'high';
}

export interface SaveData {
  version: 3;
  completed: number[];
  stars: Record<number, number>;
  xp: number;
  lastLevelId: number;
  inProgress: Session | null;
  settings: SaveSettings;
}

export function freshSave(): SaveData {
  return {
    version: 3,
    completed: [],
    stars: {},
    xp: 0,
    lastLevelId: 1,
    inProgress: null,
    settings: { muted: false, quality: 'auto' },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

function levelIds(v: unknown, maxLevel: number): number[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is number => isInt(x) && x >= 1 && x <= maxLevel))].sort((a, b) => a - b);
}

function starMap(v: unknown, maxLevel: number): Record<number, number> {
  const out: Record<number, number> = {};
  if (!isObj(v)) return out;
  for (const [k, s] of Object.entries(v)) {
    const id = Number(k);
    if (isInt(id) && id >= 1 && id <= maxLevel && isInt(s) && s >= 0 && s <= 3) out[id] = s;
  }
  return out;
}

function parseBoard(v: unknown): Board | null {
  if (!isObj(v) || !Array.isArray(v.blocks) || !Array.isArray(v.wires)) return null;
  const blocks = v.blocks.filter(
    (b): b is Board['blocks'][number] =>
      isObj(b) && typeof b.id === 'string' && isServiceType(b.type) && typeof b.name === 'string' && isInt(b.gridX) && isInt(b.gridZ) && isObj(b.config)
  );
  const ids = new Set(blocks.map((b) => b.id));
  const wires = v.wires.filter(
    (w): w is Board['wires'][number] => isObj(w) && typeof w.id === 'string' && typeof w.a === 'string' && typeof w.b === 'string' && ids.has(w.a) && ids.has(w.b)
  );
  return { blocks, wires };
}

function parseSession(v: unknown, maxLevel: number): Session | null {
  if (!isObj(v)) return null;
  const board = parseBoard(v.board);
  if (!board || !isInt(v.levelId) || v.levelId < 1 || v.levelId > maxLevel) return null;
  const nat = (x: unknown) => (isInt(x) && x >= 0 ? x : 0);
  return {
    levelId: v.levelId,
    stageIdx: nat(v.stageIdx),
    board,
    version: nat(v.version),
    hintsRevealed: Math.min(3, nat(v.hintsRevealed)),
    testsRun: nat(v.testsRun),
    failedTests: nat(v.failedTests),
    completed: v.completed === true,
  };
}

export function parseSave(raw: string | null, maxLevel: number): SaveData {
  if (!raw) return freshSave();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return freshSave();
  }
  if (!isObj(data) || data.version !== 3) return freshSave();

  const base = freshSave();
  const settings = isObj(data.settings) ? data.settings : {};
  const quality = settings.quality;
  return {
    version: 3,
    completed: levelIds(data.completed, maxLevel),
    stars: starMap(data.stars, maxLevel),
    xp: isInt(data.xp) && data.xp >= 0 ? data.xp : 0,
    lastLevelId: isInt(data.lastLevelId) && data.lastLevelId >= 1 && data.lastLevelId <= maxLevel ? data.lastLevelId : 1,
    inProgress: parseSession(data.inProgress, maxLevel),
    settings: {
      muted: settings.muted === true,
      quality: quality === 'low' || quality === 'medium' || quality === 'high' ? quality : base.settings.quality,
    },
  };
}

/** Converts the old `{completedLevels, levelStars, lastLevelId}` progress into a v3 save. */
export function migrateLegacySave(raw: string | null, maxLevel: number): SaveData | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(data)) return null;
  const save = freshSave();
  save.completed = levelIds(data.completedLevels, maxLevel);
  save.stars = starMap(data.levelStars, maxLevel);
  save.xp = save.completed.length * 100;
  if (isInt(data.lastLevelId) && data.lastLevelId >= 1 && data.lastLevelId <= maxLevel) save.lastLevelId = data.lastLevelId;
  return save;
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save);
}
