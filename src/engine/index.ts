/**
 * CloudCraft game engine — the ground truth for every rule in the game.
 * Import from here rather than from individual files.
 */

export * from './types';
export * from './board';
export * from './catalog';
export { cidrContains, portMatches, isValidCidr } from './cidr';
export { orient, sourceCidrOf } from './rules/connection';
export { analyzeBoard, blockingViolations } from './analyze';
export type { AnalyzeOptions } from './analyze';
export { DEFAULT_LOAD } from './telemetry';
export { evaluateObjectives } from './objectives';
export { activeCoachStep, coachConditionMet } from './coach';
export type { CoachContext } from './coach';
export { awardStars, boardCost, levelBudget, xpFor, XP } from './scoring';
export { applyAction, cloneBoard, createSession, paletteFor } from './session';
export type { ActionResult, SessionAction } from './session';
export { currentStage, evaluateSession, objectivesUpTo, runTest } from './simulate';
export type { LiveState } from './simulate';
export * from './save';
