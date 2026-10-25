import { useMemo } from 'react';
import { activeCoachStep, type CoachStep } from '../../engine';
import { useGame } from '../store/GameProvider';

/** The tutorial step the player is on, or null when the level has no coach (or it's finished). */
export function useCoach(): CoachStep | null {
  const { state, level, live } = useGame();
  const { session, selectedId, tool, placingType } = state;
  return useMemo(
    () =>
      level && session && live
        ? activeCoachStep(level.coachSteps, { board: session.board, objectives: live.objectives, selectedId, tool, placingType })
        : null,
    [level, session, live, selectedId, tool, placingType],
  );
}

/** Spread onto a UI element so the coach can spotlight it: `<button {...coachTarget(step, 'run-test')}>`. */
export function coachTarget(step: CoachStep | null, id: string) {
  return { 'data-coach-target': id, 'data-coach-active': step?.target === id ? 'true' : undefined };
}
