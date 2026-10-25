import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type Dispatch, type ReactNode } from 'react';
import { evaluateSession, type LevelSpec, type LiveState } from '../../engine';
import { getLevel } from '../../content/levels';
import { sound } from '../audio';
import { gameReducer, initialGameState, type Cue, type GameAction, type GameState } from './game';
import { loadSave, writeSave } from './persistence';

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  level: LevelSpec | null;
  /** Live analysis and objective status for the current board. */
  live: LiveState | null;
}

const GameContext = createContext<GameContextValue | null>(null);

const CUES: Record<Cue, () => void> = {
  click: () => sound.click(),
  pick: () => sound.pick(),
  place: () => sound.place(),
  connect: () => sound.connect(),
  remove: () => sound.remove(),
  deny: () => sound.deny(),
  runStart: () => sound.runStart(),
  fail: () => sound.fail(),
  stageClear: () => sound.stageClear(),
  victory: () => sound.victory(),
  hint: () => sound.hint(),
};

const SAVE_DELAY_MS = 400;

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => initialGameState(loadSave()));
  const { session, save, fx } = state;

  const level = useMemo(() => (session ? getLevel(session.levelId) : null), [session?.levelId]);
  const live = useMemo(() => (level && session ? evaluateSession(level, session) : null), [level, session]);

  // Sound follows the store's cues.
  useEffect(() => sound.setMuted(save.settings.muted), [save.settings.muted]);
  useEffect(() => {
    if (fx) CUES[fx.cue]();
  }, [fx]);

  const latest = useRef(state);
  latest.current = state;

  // Persist progress plus the board in progress, debounced so drags and edits don't hammer storage.
  const pending = useRef<number | undefined>(undefined);
  useEffect(() => {
    const inProgress = session && !session.completed ? session : session?.completed ? null : save.inProgress;
    window.clearTimeout(pending.current);
    pending.current = window.setTimeout(() => writeSave({ ...save, inProgress }), SAVE_DELAY_MS);
  }, [save, session]);
  // Flush on the way out (tab close, PWA update reload).
  useEffect(() => {
    const flush = () => {
      window.clearTimeout(pending.current);
      flushSave(latest.current);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const value = useMemo(() => ({ state, dispatch, level, live }), [state, level, live]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}

/** Flush the save immediately (before a service-worker reload). */
export function flushSave(state: GameState): void {
  writeSave({ ...state.save, inProgress: state.session && !state.session.completed ? state.session : state.save.inProgress });
}
