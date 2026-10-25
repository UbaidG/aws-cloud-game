import { describe, expect, it } from 'vitest';
import { freshSave } from '../../engine';
import { getLevel } from '../../content/levels';
import { gameReducer, initialGameState, type GameAction, type GameState } from '../store/game';
import { isUnlocked, nextLevelId, rankFor } from '../progress';

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);
const start = (levelId: number) => run(initialGameState(freshSave()), { type: 'startLevel', levelId });

describe('game store', () => {
  it('starts a level with a fresh session and its story playing', () => {
    const s = start(2);
    expect(s.screen).toBe('play');
    expect(s.session?.levelId).toBe(2);
    expect(s.overlay).toBe('cutscene');
    expect(s.save.lastLevelId).toBe(2);
  });

  it('skipping the story still shows the mission card', () => {
    const s = gameReducer(start(2), { type: 'escape' });
    expect(s.overlay).toBe('briefing');
  });

  it('places a block through the engine, auto-wires it, and selects it', () => {
    const s = run(start(2), { type: 'pickService', service: 'ec2' }, { type: 'tap', hit: { kind: 'tile', gridX: 1, gridZ: 0 } });
    const ec2 = s.session!.board.blocks.find((b) => b.type === 'ec2');
    expect(ec2).toBeDefined();
    expect(s.session!.board.wires).toHaveLength(1);
    expect(s.selectedId).toBe(ec2!.id);
    expect(s.tool).toBe('select');
    expect(s.fx?.cue).toBe('place');
  });

  it('reports engine rejections as a toast and a deny cue', () => {
    const s = run(start(2), { type: 'pickService', service: 'ec2' }, { type: 'tap', hit: { kind: 'tile', gridX: -6, gridZ: 0 } });
    expect(s.toasts.at(-1)?.tone).toBe('warn');
    expect(s.fx?.cue).toBe('deny');
    expect(s.session!.version).toBe(0);
  });

  it('runs a test, then completes the level, saves progress and awards XP once', () => {
    let s = run(start(2), { type: 'pickService', service: 'ec2' }, { type: 'tap', hit: { kind: 'tile', gridX: 1, gridZ: 0 } }, { type: 'runStart' });
    expect(s.running).toBe(true);
    // Board taps are ignored while traffic runs.
    const frozen = gameReducer(s, { type: 'tap', hit: { kind: 'tile', gridX: 2, gridZ: 0 } });
    expect(frozen).toBe(s);
    s = gameReducer(s, { type: 'runFinish' });
    expect(s.running).toBe(false);
    expect(s.overlay).toBe('debrief');
    expect(s.save.completed).toContain(2);
    expect(s.save.inProgress).toBeNull();
    const firstXp = s.save.xp;
    expect(firstXp).toBeGreaterThanOrEqual(100);
    expect(s.reward?.firstClear).toBe(true);

    // Replaying with the same result pays nothing extra.
    s = run(s, { type: 'startLevel', levelId: 2 }, { type: 'pickService', service: 'ec2' }, { type: 'tap', hit: { kind: 'tile', gridX: 1, gridZ: 0 } }, { type: 'runStart' }, { type: 'runFinish' });
    expect(s.save.xp).toBe(firstXp);
    expect(s.reward?.xpGained).toBe(0);
  });

  it('a failed test keeps the report and counts the failure', () => {
    const s = run(start(3), { type: 'runStart' }, { type: 'runFinish' });
    expect(s.report?.stagePassed).toBe(false);
    expect(s.session!.failedTests).toBe(1);
    expect(s.fx?.cue).toBe('fail');
  });

  it('wires two blocks with the wire tool', () => {
    const level = getLevel(3);
    const [a, b] = level.initial.blocks;
    const s = run(start(3), { type: 'setTool', tool: 'wire' }, { type: 'tap', hit: { kind: 'block', id: a.id } }, { type: 'tap', hit: { kind: 'block', id: b.id } });
    expect(s.session!.board.wires).toHaveLength(level.initial.wires.length + 1);
    expect(s.wireSourceId).toBeNull();
    expect(s.fx?.cue).toBe('connect');
  });

  it('cannot delete locked scenario blocks', () => {
    const s = run(start(3), { type: 'setTool', tool: 'delete' }, { type: 'tap', hit: { kind: 'block', id: 'users' } });
    expect(s.session!.board.blocks.some((b) => b.id === 'users')).toBe(true);
    expect(s.fx?.cue).toBe('deny');
  });

  it('moves a block to a new tile', () => {
    let s = run(start(2), { type: 'pickService', service: 'ec2' }, { type: 'tap', hit: { kind: 'tile', gridX: 1, gridZ: 0 } });
    const id = s.selectedId!;
    s = run(s, { type: 'beginMove', id }, { type: 'tap', hit: { kind: 'tile', gridX: 2, gridZ: 1 } });
    const moved = s.session!.board.blocks.find((b) => b.id === id)!;
    expect([moved.gridX, moved.gridZ]).toEqual([2, 1]);
    expect(s.movingId).toBeNull();
  });

  it('Escape unwinds one layer at a time', () => {
    let s = run(start(2), { type: 'pickService', service: 'ec2' });
    expect(s.overlay).toBe('cutscene');
    s = gameReducer(s, { type: 'escape' });
    expect(s.overlay).toBe('briefing');
    s = gameReducer(s, { type: 'escape' });
    expect(s.overlay).toBeNull();
    expect(s.placingType).toBe('ec2');
    s = gameReducer(s, { type: 'escape' });
    expect(s.placingType).toBeNull();
    expect(s.tool).toBe('select');
  });

  it('discards a test result if the board changed mid-run', () => {
    let s = run(start(2), { type: 'pickService', service: 'ec2' }, { type: 'tap', hit: { kind: 'tile', gridX: 1, gridZ: 0 } }, { type: 'runStart' });
    // Simulate a change that slipped in (e.g. a config edit from another device tab).
    s = { ...s, session: { ...s.session!, version: s.session!.version + 1 } };
    s = gameReducer(s, { type: 'runFinish' });
    expect(s.save.completed).not.toContain(2);
    expect(s.toasts.at(-1)?.tone).toBe('warn');
  });
});

describe('progression', () => {
  it('unlocks levels in order', () => {
    const save = { ...freshSave(), completed: [1, 2] };
    expect(isUnlocked(save, 3)).toBe(true);
    expect(isUnlocked(save, 4)).toBe(false);
    expect(nextLevelId(save, 130)).toBe(3);
  });

  it('ranks rise with XP', () => {
    expect(rankFor(0).title).toBe('Cloud Intern');
    expect(rankFor(600).index).toBe(1);
    expect(rankFor(99999).span).toBeNull();
  });
});
