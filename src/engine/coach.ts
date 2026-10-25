/** Step-by-step coach for tutorial levels. Steps are data; this decides which one is active. */

import type { Board, CoachCondition, CoachStep, ObjectiveResult, ServiceType, ToolMode } from './types';

export interface CoachContext {
  board: Board;
  objectives: readonly ObjectiveResult[];
  selectedId: string | null;
  tool: ToolMode;
  placingType: ServiceType | null;
}

export function coachConditionMet(cond: CoachCondition, ctx: CoachContext): boolean {
  switch (cond.kind) {
    case 'selected': {
      if (!ctx.selectedId) return false;
      const block = ctx.board.blocks.find((b) => b.id === ctx.selectedId);
      if (!block) return false;
      return (!cond.id || block.id === cond.id) && (!cond.type || block.type === cond.type);
    }
    case 'tool':
      return ctx.tool === cond.tool;
    case 'placing':
      return ctx.tool === 'place' && ctx.placingType === cond.type;
    case 'objective':
      return ctx.objectives.find((o) => o.id === cond.id)?.passed ?? false;
    case 'any':
      return cond.of.some((c) => coachConditionMet(c, ctx));
    case 'never':
      return false;
  }
}

/** The first step that isn't done yet, or null when the coach has nothing left to say. */
export function activeCoachStep(steps: readonly CoachStep[] | undefined, ctx: CoachContext): CoachStep | null {
  if (!steps) return null;
  return steps.find((s) => !coachConditionMet(s.done, ctx)) ?? null;
}
