/**
 * Small builders for authoring level content. They only produce plain data; every rule
 * still lives in `src/engine/`.
 */

import { CATALOG, defaultConfigFor } from '../engine/catalog';
import type { Block, BlockConfig, Board, Objective, ServiceType, Stage, Wire } from '../engine/types';

export function block(
  id: string,
  type: ServiceType,
  gridX: number,
  gridZ = 0,
  opts: { name?: string; config?: Partial<BlockConfig>; locked?: boolean; fault?: 'crashed' } = {}
): Block {
  const { name, config, ...extra } = opts;
  return {
    id,
    type,
    name: name ?? CATALOG[type].name,
    gridX,
    gridZ,
    config: { ...defaultConfigFor(type), ...config },
    ...extra,
  };
}

/** Wire ids are `a--b` so they never collide with the reducer's `w<n>` ids. */
export function wire(a: string, b: string, locked = false): Wire {
  return locked ? { id: `${a}--${b}`, a, b, locked } : { id: `${a}--${b}`, a, b };
}

export function board(blocks: Block[], wires: Wire[] = []): Board {
  return { blocks, wires };
}

/** The Internet Users block every level starts with. */
export const users = (gridZ = 0): Block => block('users', 'client', -6, gridZ, { name: 'Internet Users', locked: true });

/** Clone a board and add blocks and wires to it. */
export function extend(base: Board, blocks: Block[], wires: Wire[] = []): Board {
  return { blocks: [...structuredClone(base.blocks), ...blocks], wires: [...structuredClone(base.wires), ...wires] };
}

export function stage(s: Omit<Stage, 'hints'> & { hints: [string, string, string] }): Stage {
  return s;
}

/** Shorthand for the most common objective: a request makes it through these services. */
export function pathObjective(id: string, through: ServiceType[], label: string, hint: string): Objective {
  return { id, label, hint, kind: 'path', through };
}
