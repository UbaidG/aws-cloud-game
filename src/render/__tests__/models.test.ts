import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVICE_TYPES } from '../../engine/catalog';
import manifest from '../assets/models.json';

/** Budgets for the Blender-built models (`art/build.mjs`). Models load per level, on demand. */
const MAX_TRIANGLES = 4000;
const MAX_BYTES = 90 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;

const models = manifest as unknown as Record<string, { triangles: number; bytes: number; height: number; sockets: Record<string, number[]> }>;

describe('realistic model manifest', () => {
  it('has a model for every service type', () => {
    expect(SERVICE_TYPES.filter((t) => !models[t])).toEqual([]);
  });

  it.each(Object.entries(models))('%s stays within budget and matches its file', (name, meta) => {
    expect(meta.triangles).toBeLessThanOrEqual(MAX_TRIANGLES);
    expect(meta.bytes).toBeLessThanOrEqual(MAX_BYTES);
    expect(meta.height).toBeGreaterThan(0.3);
    expect(meta.sockets.status).toBeDefined();
    const file = resolve(__dirname, '../../../public/models', `${name}.glb`);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBe(meta.bytes);
  });

  it('keeps the whole set small enough to precache', () => {
    const total = Object.values(models).reduce((sum, m) => sum + m.bytes, 0);
    expect(total).toBeLessThanOrEqual(MAX_TOTAL_BYTES);
  });
});
