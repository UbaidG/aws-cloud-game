import { describe, expect, it } from 'vitest';
import { applyAction, createSession, runTest, type SessionAction } from '../../engine';
import type { Board, LevelSpec, Session } from '../../engine/types';
import { getLevel, LEVELS, textFor } from '../levels';
import { RECIPES } from '../levels/recipes';
import { MODULES } from '../modules';
import { compileRecipeDetailed, type RecipeStep } from '../recipe';
import { STORIES } from '../stories';
import { applyChange, withStageText } from '../story';

const sessionWith = (level: LevelSpec, board: Board, stageIdx: number): Session => ({
  ...createSession(level),
  board: structuredClone(board),
  stageIdx,
});

const failureSummary = (level: LevelSpec, board: Board, stageIdx: number) => {
  const r = runTest(level, sessionWith(level, board, stageIdx));
  return {
    failedGoals: r.objectives.filter((o) => !o.passed).map((o) => `${o.label}: ${o.detail}`),
    violations: r.blockingViolations.map((v) => `${v.code}: ${v.title}`),
  };
};

describe('course structure', () => {
  it('has 130 levels numbered 1–130, ten per module', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 130 }, (_, i) => i + 1));
    for (const m of MODULES) {
      for (const id of m.levelIds) expect(getLevel(id).moduleId).toBe(m.id);
      expect(getLevel(m.assessmentLevelId).isAssessment).toBe(true);
    }
  });

  it('every level has its own title', () => {
    const titles = LEVELS.map((l) => l.title);
    expect(titles.filter((t, i) => titles.indexOf(t) !== i)).toEqual([]);
  });

  it('every stage has a goal, objectives and three hints', () => {
    for (const level of LEVELS) {
      for (const stage of level.stages) {
        expect(stage.objectives.length, `level ${level.id}`).toBeGreaterThan(0);
        expect(stage.hints.every((h) => h.length > 0), `level ${level.id}`).toBe(true);
      }
      const ids = level.stages.flatMap((s) => s.objectives.map((o) => o.id));
      expect(new Set(ids).size, `level ${level.id} objective ids`).toBe(ids.length);
    }
  });
});

describe.each(LEVELS.map((l) => [l.id, l] as const))('level %i', (_, level) => {
  it('the reference solution completes the level', () => {
    // Earlier stages may use a different load (e.g. scale up, then back down), so the final
    // board is checked against the final stage, whose objectives include every earlier one.
    const last = level.stages.length - 1;
    const r = runTest(level, sessionWith(level, level.solution, last));
    expect(r.levelComplete, JSON.stringify(failureSummary(level, level.solution, last))).toBe(true);
  });

  it('the starting board does not already pass', () => {
    const r = runTest(level, createSession(level));
    expect(r.stagePassed).toBe(!!level.startsSolved);
  });
});

/** Replays a recipe's moves through the real reducer, mapping recipe ids to the ids the game assigns. */
function replay(level: LevelSpec, session: Session, moves: RecipeStep[], ids: Map<string, string>): Session {
  const id = (x: string) => ids.get(x) ?? x;
  for (const move of moves) {
    let action: SessionAction;
    switch (move.type) {
      case 'remove':
        action = { type: 'remove', id: id(move.id) };
        break;
      case 'unwire': {
        const w = session.board.wires.find(
          (w) => (w.a === id(move.a) && w.b === id(move.b)) || (w.a === id(move.b) && w.b === id(move.a))
        );
        if (!w) throw new Error(`Level ${level.id}: no wire ${move.a}-${move.b} to delete`);
        action = { type: 'disconnect', wireId: w.id };
        break;
      }
      case 'place':
        action = { type: 'place', service: move.service, gridX: move.gridX, gridZ: move.gridZ };
        break;
      case 'set':
        action = { type: 'updateConfig', id: id(move.id), patch: move.patch };
        break;
      case 'wire':
        action = { type: 'connect', a: id(move.a), b: id(move.b) };
        break;
    }
    const result = applyAction(level, session, action);
    if (!result.ok) throw new Error(`Level ${level.id}: ${move.type} ${JSON.stringify(move)} rejected: ${result.message}`);
    if (move.type === 'place' && result.createdId) ids.set(move.id, result.createdId);
    session = result.session;
  }
  return session;
}

describe.each(RECIPES.map((r) => [r.id, r] as const))('recipe %i', (id, recipe) => {
  const { level, stageBoards, stageMoves } = compileRecipeDetailed(withStageText(recipe, STORIES[id]), textFor(id));

  it('each stage needs new work: the previous stage’s board fails it', () => {
    stageBoards.forEach((board, i) => {
      const before = i === 0 ? level.initial : stageBoards[i - 1];
      expect(runTest(level, sessionWith(level, before, i)).stagePassed, `stage ${i + 1} passes for free`).toBe(false);
      expect(runTest(level, sessionWith(level, board, i)).stagePassed, JSON.stringify(failureSummary(level, board, i))).toBe(true);
    });
  });

  it('can be played start to finish through the session reducer for three stars', () => {
    let session = createSession(level);
    const ids = new Map<string, string>();
    stageMoves.forEach((moves, i) => {
      session = replay(level, session, moves, ids);
      const report = runTest(level, session);
      expect(report.stagePassed, `stage ${i + 1}: ${JSON.stringify(failureSummary(level, session.board, i))}`).toBe(true);
      session = applyAction(level, session, { type: 'applyTest', report }).session;
      if (i === stageMoves.length - 1) {
        expect(report.levelComplete).toBe(true);
        expect(report.starCount).toBe(3);
      }
    });
    expect(session.completed).toBe(true);
  });
});

it('every recipe level has a story', () => {
  expect(Object.keys(STORIES).map(Number).sort((a, b) => a - b)).toEqual(RECIPES.map((r) => r.id).sort((a, b) => a - b));
});

describe.each(Object.entries(STORIES).map(([id, story]) => [Number(id), story] as const))('story %i', (id, story) => {
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) throw new Error(`Story ${id} has no recipe`);
  const { level, stageBoards } = compileRecipeDetailed(withStageText(recipe, story), textFor(id));
  const { wrong } = story;

  it(`teaches the right thing: "${wrong.why}" fails ${wrong.fails}`, () => {
    const stageIdx = wrong.stage - 1;
    expect(stageBoards[stageIdx], `stage ${wrong.stage} exists`).toBeDefined();
    const board = applyChange(stageBoards[stageIdx], wrong.change, id);
    const r = runTest(level, sessionWith(level, board, stageIdx));
    expect(r.stagePassed).toBe(false);
    const reasons = [...r.objectives.filter((o) => !o.passed).map((o) => o.id), ...r.blockingViolations.map((v) => v.code)];
    expect(reasons, JSON.stringify(failureSummary(level, board, stageIdx))).toContain(wrong.fails);
  });

  it('has text for every stage and a concept card', () => {
    expect(story.stages?.length ?? recipe.stages.length).toBe(recipe.stages.length);
    expect(story.text.docTips.length).toBeGreaterThanOrEqual(recipe.stages.length);
    expect(story.text.conceptCard.keyTakeaway.length).toBeGreaterThan(0);
  });
});
