/**
 * The referee. `runTest()` is the single place that decides whether a stage passes,
 * whether the level is complete, and what it earned.
 */

import { analyzeBoard, blockingViolations } from './analyze';
import { evaluateObjectives } from './objectives';
import { awardStars, xpFor } from './scoring';
import type { BoardAnalysis, LevelSpec, Objective, ObjectiveResult, Session, Stage, TestReport } from './types';

export function currentStage(level: LevelSpec, stageIdx: number): Stage {
  return level.stages[Math.min(Math.max(stageIdx, 0), level.stages.length - 1)];
}

/** Objectives that must hold at a stage: every earlier stage's goals still count. */
export function objectivesUpTo(level: LevelSpec, stageIdx: number): Objective[] {
  return level.stages.slice(0, Math.min(stageIdx, level.stages.length - 1) + 1).flatMap((s) => s.objectives);
}

export interface LiveState {
  analysis: BoardAnalysis;
  objectives: ObjectiveResult[];
}

/** What the HUD shows between tests. Same rules as a test, without advancing anything. */
export function evaluateSession(level: LevelSpec, session: Session): LiveState {
  const stage = currentStage(level, session.stageIdx);
  const analysis = analyzeBoard(session.board, { limits: level.limits, load: stage.load });
  const objectives = evaluateObjectives(objectivesUpTo(level, session.stageIdx), session.board, analysis);
  return { analysis, objectives };
}

export function runTest(level: LevelSpec, session: Session): TestReport {
  const { analysis, objectives } = evaluateSession(level, session);
  const blocking = blockingViolations(analysis);
  const stagePassed = blocking.length === 0 && objectives.every((o) => o.passed);
  const levelComplete = stagePassed && session.stageIdx >= level.stages.length - 1;

  const report: TestReport = {
    levelId: level.id,
    stageIdx: session.stageIdx,
    version: session.version,
    analysis,
    objectives,
    blockingViolations: blocking,
    stagePassed,
    levelComplete,
  };

  if (levelComplete) {
    const stars = awardStars(level, session, analysis.telemetry);
    report.stars = stars;
    report.starCount = stars.filter((s) => s.earned).length;
    report.xp = xpFor(level, stars);
  }
  return report;
}
