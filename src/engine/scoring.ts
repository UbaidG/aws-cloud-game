/** Stars and XP for a completed level. */

import { blockCost } from './catalog';
import type { Board, LevelSpec, Session, StarAward, Telemetry } from './types';

export const XP = {
  complete: 100,
  perBonusStar: 50,
  assessmentBonus: 200,
} as const;

export function boardCost(board: Board): number {
  return board.blocks.reduce((sum, b) => sum + blockCost(b.type, b.config), 0);
}

/** The level's monthly budget for the efficiency star: explicit, or the reference solution's cost + 15%. */
export function levelBudget(level: LevelSpec): number {
  return level.limits?.budgetUsd ?? Math.ceil(boardCost(level.solution) * 1.15);
}

export function awardStars(level: LevelSpec, session: Session, telemetry: Telemetry): StarAward[] {
  const budget = levelBudget(level);
  const cleanRun = session.hintsRevealed === 0 && session.failedTests <= 1;
  return [
    { earned: true, label: 'Mission complete', detail: 'Every goal met with zero violations.' },
    {
      earned: telemetry.monthlyCostUsd <= budget,
      label: 'Under budget',
      detail: `Monthly bill $${telemetry.monthlyCostUsd} (budget $${budget}).`,
    },
    {
      earned: cleanRun,
      label: 'Clean run',
      detail: cleanRun
        ? 'No hints and at most one failed test.'
        : `${session.hintsRevealed} hint${session.hintsRevealed === 1 ? '' : 's'} used, ${session.failedTests} failed test${session.failedTests === 1 ? '' : 's'}.`,
    },
  ];
}

export function xpFor(level: LevelSpec, stars: readonly StarAward[]): number {
  const bonus = stars.filter((s, i) => i > 0 && s.earned).length;
  return XP.complete + bonus * XP.perBonusStar + (level.isAssessment ? XP.assessmentBonus : 0);
}
