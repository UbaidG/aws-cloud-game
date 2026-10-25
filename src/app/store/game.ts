/**
 * The app store: one pure reducer that wraps the engine session plus UI state (tool, selection,
 * overlays, toasts). It never plays sounds or touches the renderer; it emits `fx` cues that the
 * effect hooks turn into audio and animation. Every board change goes through engine/applyAction.
 */

import {
  applyAction,
  CATALOG,
  createSession,
  runTest,
  zoneSpec,
  zoneAt,
  type BlockConfig,
  type SaveData,
  type SaveSettings,
  type ServiceType,
  type Session,
  type SessionAction,
  type TestReport,
  type ToolMode,
} from '../../engine';
import { cutsceneOf } from '../../content/cutscene';
import { getLevel } from '../../content/levels';
import { rankFor, xpAlreadyEarned } from '../progress';
import type { BoardHit } from '../../render';

export type Screen = 'title' | 'map' | 'play';
export type Overlay = 'menu' | 'help' | 'iac' | 'debrief' | 'cutscene' | 'briefing' | 'settings' | null;
export type Tone = 'info' | 'ok' | 'warn' | 'bad';

export type Cue =
  | 'click'
  | 'pick'
  | 'place'
  | 'connect'
  | 'remove'
  | 'deny'
  | 'runStart'
  | 'fail'
  | 'stageClear'
  | 'victory'
  | 'hint';

export interface Toast {
  id: number;
  tone: Tone;
  text: string;
}

export interface LogEntry {
  id: number;
  tone: Tone;
  text: string;
}

export interface FxEvent {
  id: number;
  cue: Cue;
  /** Block to flash on the board (rejections, coach nudges). */
  blockId?: string;
}

export interface Reward {
  levelId: number;
  starCount: number;
  xpGained: number;
  rankUp: boolean;
  firstClear: boolean;
}

export interface GameState {
  screen: Screen;
  save: SaveData;
  session: Session | null;
  tool: ToolMode;
  placingType: ServiceType | null;
  selectedId: string | null;
  selectedWireId: string | null;
  wireSourceId: string | null;
  /** A block waiting for the player to pick its new tile. */
  movingId: string | null;
  /** 'running' while the traffic animation plays; the report is applied when it ends. */
  running: boolean;
  report: TestReport | null;
  overlay: Overlay;
  toasts: Toast[];
  log: LogEntry[];
  fx: FxEvent | null;
  reward: Reward | null;
  seq: number;
}

export type GameAction =
  | { type: 'go'; screen: Screen }
  | { type: 'startLevel'; levelId: number; resume?: boolean }
  | { type: 'restartLevel' }
  | { type: 'setTool'; tool: ToolMode }
  | { type: 'pickService'; service: ServiceType }
  | { type: 'tap'; hit: BoardHit }
  | { type: 'select'; id: string | null }
  | { type: 'beginMove'; id: string }
  | { type: 'beginWire'; id: string }
  | { type: 'updateConfig'; id: string; patch: Partial<BlockConfig> }
  | { type: 'rename'; id: string; name: string }
  | { type: 'remove'; id: string }
  | { type: 'disconnect'; wireId: string }
  | { type: 'connect'; a: string; b: string }
  | { type: 'revealHint' }
  | { type: 'runStart' }
  | { type: 'runFinish' }
  | { type: 'overlay'; overlay: Overlay }
  | { type: 'escape' }
  | { type: 'dismissToast'; id: number }
  | { type: 'settings'; patch: Partial<SaveSettings> };

const MAX_TOASTS = 3;
const MAX_LOG = 60;

export function initialGameState(save: SaveData): GameState {
  return {
    screen: 'title',
    save,
    session: null,
    tool: 'select',
    placingType: null,
    selectedId: null,
    selectedWireId: null,
    wireSourceId: null,
    movingId: null,
    running: false,
    report: null,
    overlay: null,
    toasts: [],
    log: [],
    fx: null,
    reward: null,
    seq: 0,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cue(state: GameState, c: Cue, blockId?: string): GameState {
  const id = state.seq + 1;
  return { ...state, seq: id, fx: { id, cue: c, blockId } };
}

function toast(state: GameState, tone: Tone, text: string): GameState {
  const id = state.seq + 1;
  return { ...state, seq: id, toasts: [...state.toasts, { id, tone, text }].slice(-MAX_TOASTS) };
}

function log(state: GameState, tone: Tone, text: string): GameState {
  const id = state.seq + 1;
  return { ...state, seq: id, log: [...state.log, { id, tone, text }].slice(-MAX_LOG) };
}

const clearPointer = {
  tool: 'select' as ToolMode,
  placingType: null,
  wireSourceId: null,
  movingId: null,
};

function blockName(session: Session, id: string): string {
  return session.board.blocks.find((b) => b.id === id)?.name ?? id;
}

/**
 * Run an engine action. On success, apply `onOk` to the new state; on rejection, toast the
 * engine's reason, play the deny cue and flash `flashId`.
 */
function engine(
  state: GameState,
  action: SessionAction,
  onOk: (next: GameState, createdId?: string) => GameState,
  flashId?: string,
): GameState {
  if (!state.session || state.running) return state;
  const level = getLevel(state.session.levelId);
  const result = applyAction(level, state.session, action);
  if (!result.ok) {
    const text = result.message ?? 'That move is not allowed.';
    return cue(log(toast(state, 'warn', text), 'warn', text), 'deny', flashId);
  }
  return onOk({ ...state, session: result.session }, result.createdId);
}

function place(state: GameState, service: ServiceType, gridX: number, gridZ: number): GameState {
  return engine(state, { type: 'place', service, gridX, gridZ }, (next, id) => {
    const zone = zoneSpec(zoneAt(gridX)).label;
    const placed = id ? blockName(next.session!, id) : CATALOG[service].shortLabel;
    return cue(log({ ...next, ...clearPointer, selectedId: id ?? null, selectedWireId: null }, 'info', `Placed ${placed} in ${zone}.`), 'place', id);
  });
}

function connect(state: GameState, a: string, b: string): GameState {
  return engine(
    state,
    { type: 'connect', a, b },
    (next) => {
      const s = next.session!;
      return cue(log({ ...next, wireSourceId: null }, 'info', `Wired ${blockName(s, a)} to ${blockName(s, b)}.`), 'connect', b);
    },
    b,
  );
}

function remove(state: GameState, id: string): GameState {
  const name = state.session ? blockName(state.session, id) : id;
  return engine(
    state,
    { type: 'remove', id },
    (next) =>
      cue(
        log({ ...next, selectedId: next.selectedId === id ? null : next.selectedId, wireSourceId: null, movingId: null }, 'info', `Deleted ${name}.`),
        'remove',
      ),
    id,
  );
}

function disconnect(state: GameState, wireId: string): GameState {
  return engine(state, { type: 'disconnect', wireId }, (next) =>
    cue(log({ ...next, selectedWireId: null }, 'info', 'Removed a wire.'), 'remove'),
  );
}

function handleTap(state: GameState, hit: BoardHit): GameState {
  if (!state.session || state.running) return state;

  if (state.movingId) {
    const id = state.movingId;
    if (hit.kind === 'tile') {
      return engine(
        state,
        { type: 'move', id, gridX: hit.gridX, gridZ: hit.gridZ },
        (next) => cue(log({ ...next, movingId: null, selectedId: id }, 'info', `Moved ${blockName(next.session!, id)} to ${zoneSpec(zoneAt(hit.gridX)).label}.`), 'place', id),
        id,
      );
    }
    return { ...state, movingId: null };
  }

  switch (state.tool) {
    case 'place': {
      if (hit.kind === 'tile' && state.placingType) return place(state, state.placingType, hit.gridX, hit.gridZ);
      if (hit.kind === 'block') return cue({ ...state, ...clearPointer, selectedId: hit.id, selectedWireId: null }, 'click');
      return { ...state, ...clearPointer };
    }
    case 'wire': {
      if (hit.kind === 'block') {
        if (!state.wireSourceId) return cue({ ...state, wireSourceId: hit.id, selectedId: null, selectedWireId: null }, 'pick');
        if (state.wireSourceId === hit.id) return { ...state, wireSourceId: null };
        return connect(state, state.wireSourceId, hit.id);
      }
      if (hit.kind === 'wire') return cue({ ...state, wireSourceId: null, selectedWireId: hit.id, selectedId: null }, 'click');
      return { ...state, wireSourceId: null };
    }
    case 'delete': {
      if (hit.kind === 'block') return remove(state, hit.id);
      if (hit.kind === 'wire') return disconnect(state, hit.id);
      return state;
    }
    case 'select': {
      if (hit.kind === 'block') {
        const same = state.selectedId === hit.id;
        return cue({ ...state, selectedId: same ? null : hit.id, selectedWireId: null }, 'click');
      }
      if (hit.kind === 'wire') return cue({ ...state, selectedWireId: hit.id, selectedId: null }, 'click');
      return { ...state, selectedId: null, selectedWireId: null };
    }
  }
}

function finishRun(state: GameState): GameState {
  const { session, report } = state;
  if (!session || !report || !state.running) return { ...state, running: false };
  const level = getLevel(session.levelId);
  const result = applyAction(level, session, { type: 'applyTest', report });
  let next: GameState = { ...state, running: false };
  if (!result.ok) {
    const text = result.message ?? 'The test result was discarded.';
    return toast(log(next, 'warn', text), 'warn', text);
  }
  next = { ...next, session: result.session };

  if (report.levelComplete) {
    const save = next.save;
    const starCount = report.starCount ?? 1;
    const already = xpAlreadyEarned(save, level.id);
    const xpGained = Math.max(0, (report.xp ?? 0) - already);
    const xp = save.xp + xpGained;
    const firstClear = !save.completed.includes(level.id);
    const updated: SaveData = {
      ...save,
      completed: firstClear ? [...save.completed, level.id].sort((a, b) => a - b) : save.completed,
      stars: { ...save.stars, [level.id]: Math.max(save.stars[level.id] ?? 0, starCount) },
      xp,
      lastLevelId: level.id,
      inProgress: null,
    };
    next = {
      ...next,
      save: updated,
      overlay: 'debrief',
      ...clearPointer,
      selectedId: null,
      selectedWireId: null,
      reward: { levelId: level.id, starCount, xpGained, rankUp: rankFor(xp).index > rankFor(save.xp).index, firstClear },
    };
    return cue(log(next, 'ok', `Mission complete: ${level.title}.`), 'victory');
  }

  if (report.stagePassed) {
    const stage = level.stages[result.session.stageIdx];
    const text = `Stage ${report.stageIdx + 1} cleared! Next: ${stage.title}`;
    return cue(toast(log({ ...next, report: null }, 'ok', text), 'ok', text), 'stageClear');
  }

  const failing = report.objectives.filter((o) => !o.passed).length + report.blockingViolations.length;
  return cue(log(next, 'bad', `Test failed: ${failing} issue${failing === 1 ? '' : 's'} to fix.`), 'fail');
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'go':
      return { ...state, screen: action.screen, overlay: null, running: false };

    case 'startLevel': {
      const level = getLevel(action.levelId);
      const saved = state.save.inProgress;
      const session = action.resume && saved?.levelId === level.id && !saved.completed ? saved : createSession(level);
      return {
        ...state,
        ...clearPointer,
        screen: 'play',
        session,
        selectedId: null,
        selectedWireId: null,
        running: false,
        report: null,
        reward: null,
        // A fresh start opens with the story (if the level has one), then the mission card.
        overlay: session.version === 0 && session.stageIdx === 0 ? (cutsceneOf(level) ? 'cutscene' : 'briefing') : null,
        toasts: [],
        log: [{ id: state.seq + 1, tone: 'info', text: `Mission ${level.id}: ${level.title}` }],
        seq: state.seq + 1,
        save: { ...state.save, lastLevelId: level.id },
      };
    }

    case 'restartLevel': {
      if (!state.session) return state;
      const level = getLevel(state.session.levelId);
      return log(
        { ...state, ...clearPointer, session: createSession(level), selectedId: null, selectedWireId: null, running: false, report: null, overlay: null, reward: null },
        'info',
        'Board reset to the starting layout.',
      );
    }

    case 'setTool': {
      if (state.running) return state;
      const tool = state.tool === action.tool && action.tool !== 'select' ? 'select' : action.tool;
      return cue({ ...state, tool, placingType: tool === 'place' ? state.placingType : null, wireSourceId: null, movingId: null }, 'click');
    }

    case 'pickService': {
      if (state.running) return state;
      if (state.tool === 'place' && state.placingType === action.service) return { ...state, ...clearPointer };
      return cue({ ...state, tool: 'place', placingType: action.service, wireSourceId: null, movingId: null, selectedWireId: null }, 'pick');
    }

    case 'tap':
      return handleTap(state, action.hit);

    case 'select':
      return { ...state, selectedId: action.id, selectedWireId: null };

    case 'beginMove':
      if (state.running) return state;
      return cue({ ...state, tool: 'select', placingType: null, wireSourceId: null, movingId: action.id }, 'pick');

    case 'beginWire':
      if (state.running) return state;
      return cue({ ...state, tool: 'wire', placingType: null, movingId: null, wireSourceId: action.id, selectedId: null, selectedWireId: null }, 'pick');

    case 'updateConfig':
      return engine(state, { type: 'updateConfig', id: action.id, patch: action.patch }, (next) => next);

    case 'rename': {
      const name = action.name.trim().slice(0, 40);
      if (!state.session || !name) return state;
      // Names are presentation only, so they skip the engine's versioning.
      const blocks = state.session.board.blocks.map((b) => (b.id === action.id ? { ...b, name } : b));
      return { ...state, session: { ...state.session, board: { ...state.session.board, blocks } } };
    }

    case 'remove':
      return remove(state, action.id);

    case 'disconnect':
      return disconnect(state, action.wireId);

    case 'connect':
      return connect(state, action.a, action.b);

    case 'revealHint':
      return engine(state, { type: 'revealHint' }, (next) => cue(next, 'hint'));

    case 'runStart': {
      if (!state.session || state.running) return state;
      const level = getLevel(state.session.levelId);
      const report = runTest(level, state.session);
      return cue({ ...state, ...clearPointer, running: true, report, overlay: null }, 'runStart');
    }

    case 'runFinish':
      return finishRun(state);

    case 'overlay':
      return { ...state, overlay: action.overlay };

    case 'escape': {
      // Skipping a cutscene still shows the mission card.
      if (state.overlay === 'cutscene') return { ...state, overlay: 'briefing' };
      if (state.overlay) return { ...state, overlay: null };
      if (state.movingId || state.wireSourceId || state.placingType || state.tool !== 'select') return { ...state, ...clearPointer };
      if (state.selectedId || state.selectedWireId) return { ...state, selectedId: null, selectedWireId: null };
      return state;
    }

    case 'dismissToast':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };

    case 'settings':
      return { ...state, save: { ...state.save, settings: { ...state.save.settings, ...action.patch } } };
  }
}
