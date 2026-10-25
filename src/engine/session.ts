/**
 * Session reducer: the only way the board changes. Every action is validated here, so the UI
 * can never put the game into a state the rules don't allow.
 */

import { inBounds } from './board';
import { CATALOG, defaultConfigFor } from './catalog';
import type { Block, BlockConfig, Board, LevelSpec, ServiceType, Session, TestReport, Wire } from './types';

export type SessionAction =
  | { type: 'place'; service: ServiceType; gridX: number; gridZ: number }
  | { type: 'move'; id: string; gridX: number; gridZ: number }
  | { type: 'remove'; id: string }
  | { type: 'connect'; a: string; b: string }
  | { type: 'disconnect'; wireId: string }
  | { type: 'updateConfig'; id: string; patch: Partial<BlockConfig> }
  | { type: 'revealHint' }
  | { type: 'applyTest'; report: TestReport };

export interface ActionResult {
  session: Session;
  ok: boolean;
  /** Why the action was rejected, in plain English. */
  message?: string;
  /** Id of the block or wire the action created. */
  createdId?: string;
  /** Wires created automatically as a side effect (tutorial auto-wiring). */
  autoWireIds?: string[];
}

export function cloneBoard(board: Board): Board {
  return structuredClone(board);
}

export function createSession(level: LevelSpec): Session {
  return {
    levelId: level.id,
    stageIdx: 0,
    board: cloneBoard(level.initial),
    version: 0,
    hintsRevealed: 0,
    testsRun: 0,
    failedTests: 0,
    completed: false,
  };
}

/** Service types the player may place right now: the stage palette plus any pre-placed type they deleted. */
export function paletteFor(level: LevelSpec, session: Session): ServiceType[] {
  const stage = level.stages[Math.min(session.stageIdx, level.stages.length - 1)];
  const set = new Set<ServiceType>(stage.palette);
  for (const b of level.initial.blocks) {
    if (b.type !== 'client' && !b.locked && !b.fault) set.add(b.type);
  }
  return [...set];
}

function nextBlockId(board: Board, type: ServiceType): { id: string; n: number } {
  const used = new Set(board.blocks.map((b) => b.id));
  let n = 1;
  while (used.has(`${type}-${n}`)) n++;
  return { id: `${type}-${n}`, n };
}

function nextWireId(board: Board): string {
  const used = new Set(board.wires.map((w) => w.id));
  let n = board.wires.length + 1;
  while (used.has(`w${n}`)) n++;
  return `w${n}`;
}

function occupant(board: Board, gridX: number, gridZ: number): Block | undefined {
  return board.blocks.find((b) => b.gridX === gridX && b.gridZ === gridZ);
}

function wireExists(board: Board, a: string, b: string): boolean {
  return board.wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
}

function withBoard(session: Session, board: Board): Session {
  return { ...session, board, version: session.version + 1 };
}

const reject = (session: Session, message: string): ActionResult => ({ session, ok: false, message });

export function applyAction(level: LevelSpec, session: Session, action: SessionAction): ActionResult {
  const { board } = session;

  switch (action.type) {
    case 'place': {
      if (!paletteFor(level, session).includes(action.service)) {
        return reject(session, `${CATALOG[action.service].shortLabel} isn't available in this stage.`);
      }
      if (!inBounds(action.gridX, action.gridZ)) return reject(session, 'That tile is off the board.');
      const taken = occupant(board, action.gridX, action.gridZ);
      if (taken) return reject(session, `"${taken.name}" already sits on that tile.`);

      const { id, n } = nextBlockId(board, action.service);
      const block: Block = {
        id,
        type: action.service,
        name: `${CATALOG[action.service].shortLabel} ${n}`,
        gridX: action.gridX,
        gridZ: action.gridZ,
        config: defaultConfigFor(action.service),
      };
      let next: Board = { blocks: [...board.blocks, block], wires: board.wires };

      const autoWireIds: string[] = [];
      for (const rule of level.autoWire ?? []) {
        if (rule.onPlace !== action.service) continue;
        if (rule.firstOnly && board.blocks.some((b) => b.type === action.service)) continue;
        const source = next.blocks.find((b) => b.type === rule.from);
        if (!source) continue;
        const wireId = nextWireId(next);
        next = { ...next, wires: [...next.wires, { id: wireId, a: source.id, b: id }] };
        autoWireIds.push(wireId);
      }

      return { session: withBoard(session, next), ok: true, createdId: id, autoWireIds };
    }

    case 'move': {
      const block = board.blocks.find((b) => b.id === action.id);
      if (!block) return reject(session, 'That block no longer exists.');
      if (block.locked) return reject(session, `"${block.name}" is part of the scenario and can't be moved.`);
      if (!inBounds(action.gridX, action.gridZ)) return reject(session, 'That tile is off the board.');
      const taken = occupant(board, action.gridX, action.gridZ);
      if (taken && taken.id !== block.id) return reject(session, `"${taken.name}" already sits on that tile.`);
      const blocks = board.blocks.map((b) => (b.id === block.id ? { ...b, gridX: action.gridX, gridZ: action.gridZ } : b));
      return { session: withBoard(session, { ...board, blocks }), ok: true };
    }

    case 'remove': {
      const block = board.blocks.find((b) => b.id === action.id);
      if (!block) return reject(session, 'That block no longer exists.');
      if (block.locked) return reject(session, `"${block.name}" is part of the scenario and can't be deleted.`);
      const lockedWire = board.wires.find((w) => w.locked && (w.a === block.id || w.b === block.id));
      if (lockedWire) return reject(session, `"${block.name}" has a protected wire and can't be deleted.`);
      return {
        session: withBoard(session, {
          blocks: board.blocks.filter((b) => b.id !== block.id),
          wires: board.wires.filter((w) => w.a !== block.id && w.b !== block.id),
        }),
        ok: true,
      };
    }

    case 'connect': {
      if (action.a === action.b) return reject(session, 'Pick two different blocks to wire together.');
      const a = board.blocks.find((b) => b.id === action.a);
      const b = board.blocks.find((x) => x.id === action.b);
      if (!a || !b) return reject(session, 'That block no longer exists.');
      if (wireExists(board, a.id, b.id)) return reject(session, `"${a.name}" and "${b.name}" are already wired.`);
      const wire: Wire = { id: nextWireId(board), a: a.id, b: b.id };
      return { session: withBoard(session, { ...board, wires: [...board.wires, wire] }), ok: true, createdId: wire.id };
    }

    case 'disconnect': {
      const wire = board.wires.find((w) => w.id === action.wireId);
      if (!wire) return reject(session, 'That wire no longer exists.');
      if (wire.locked) return reject(session, 'That wire is part of the scenario and can\'t be removed.');
      return { session: withBoard(session, { ...board, wires: board.wires.filter((w) => w.id !== wire.id) }), ok: true };
    }

    case 'updateConfig': {
      const block = board.blocks.find((b) => b.id === action.id);
      if (!block) return reject(session, 'That block no longer exists.');
      const blocks = board.blocks.map((b) => (b.id === block.id ? { ...b, config: { ...b.config, ...action.patch } } : b));
      return { session: withBoard(session, { ...board, blocks }), ok: true };
    }

    case 'revealHint': {
      if (session.hintsRevealed >= 3) return reject(session, 'All hints are already revealed.');
      return { session: { ...session, hintsRevealed: session.hintsRevealed + 1 }, ok: true };
    }

    case 'applyTest': {
      const { report } = action;
      if (report.levelId !== session.levelId || report.stageIdx !== session.stageIdx || report.version !== session.version) {
        return reject(session, 'The board changed while traffic was running, so that test result was discarded.');
      }
      const failed = !report.stagePassed;
      let next: Session = {
        ...session,
        testsRun: session.testsRun + 1,
        failedTests: session.failedTests + (failed ? 1 : 0),
      };
      if (report.levelComplete) next = { ...next, completed: true };
      else if (report.stagePassed) next = { ...next, stageIdx: next.stageIdx + 1, hintsRevealed: 0 };
      return { session: next, ok: true };
    }
  }
}
