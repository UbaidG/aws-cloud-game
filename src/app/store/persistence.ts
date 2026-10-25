/** Reads and writes the save in localStorage. Storage can throw (private mode, quota); it never breaks the game. */

import { LEGACY_SAVE_KEYS, SAVE_KEY, freshSave, migrateLegacySave, parseSave, serializeSave, type SaveData } from '../../engine';
import { MAX_LEVEL } from '../../content/levels';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function loadSave(): SaveData {
  const current = read(SAVE_KEY);
  if (current) return parseSave(current, MAX_LEVEL);
  for (const key of LEGACY_SAVE_KEYS) {
    const migrated = migrateLegacySave(read(key), MAX_LEVEL);
    if (migrated) return migrated;
  }
  return freshSave();
}

export function writeSave(save: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, serializeSave(save));
  } catch {
    // Out of space or storage disabled: progress for this session only.
  }
}
