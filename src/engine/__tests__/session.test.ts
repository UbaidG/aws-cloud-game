import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeBoard } from '../analyze';
import { evaluateObjectives } from '../objectives';
import { migrateLegacySave, parseSave, serializeSave, freshSave } from '../save';
import { applyAction, createSession } from '../session';
import { runTest } from '../simulate';
import type { LevelSpec, Session } from '../types';
import { block, board, users, wire } from './helpers';

const twoStage: LevelSpec = {
  id: 99,
  moduleId: 1,
  title: 'Test level',
  tagline: '',
  difficulty: 'Novice',
  gameMode: 'packet_tracer',
  concepts: [],
  briefing: '',
  docTips: [],
  inspectorMode: 'basic',
  initial: board([block('users', 'client', -6, 0, {}, { locked: true })]),
  solution: board(
    [users(), block('ec2-1', 'ec2', 0), block('rds-1', 'rds', 4), block('redis-1', 'redis', 4, 1)],
    [wire('users', 'ec2-1'), wire('ec2-1', 'rds-1'), wire('ec2-1', 'redis-1')]
  ),
  stages: [
    {
      title: 'Serve users',
      brief: '',
      goal: '',
      palette: ['ec2', 'rds'],
      hints: ['', '', ''],
      objectives: [
        { id: 'web', label: 'Users reach EC2', hint: '', kind: 'path', through: ['client', 'ec2'] },
        { id: 'db', label: 'EC2 reaches RDS', hint: '', kind: 'path', through: ['client', 'ec2', 'rds'] },
      ],
    },
    {
      title: 'Go fast',
      brief: '',
      goal: '',
      palette: ['ec2', 'rds', 'redis'],
      hints: ['', '', ''],
      objectives: [{ id: 'fast', label: 'Under 85ms', hint: '', kind: 'sla', maxLatencyMs: 85 }],
    },
  ],
  autoWire: [{ onPlace: 'ec2', from: 'client', firstOnly: true }],
};

function act(s: Session, ...actions: Parameters<typeof applyAction>[2][]): Session {
  for (const a of actions) {
    const r = applyAction(twoStage, s, a);
    expect(r.ok, r.message).toBe(true);
    s = r.session;
  }
  return s;
}

describe('session reducer', () => {
  it('places with deterministic ids and auto-wires only the first EC2', () => {
    let s = createSession(twoStage);
    const first = applyAction(twoStage, s, { type: 'place', service: 'ec2', gridX: 0, gridZ: 0 });
    expect(first.createdId).toBe('ec2-1');
    expect(first.autoWireIds).toHaveLength(1);
    s = first.session;
    const second = applyAction(twoStage, s, { type: 'place', service: 'ec2', gridX: 1, gridZ: 0 });
    expect(second.createdId).toBe('ec2-2');
    expect(second.autoWireIds).toHaveLength(0);
  });

  it('rejects occupied tiles, off-board tiles and services outside the palette', () => {
    const s = act(createSession(twoStage), { type: 'place', service: 'ec2', gridX: 0, gridZ: 0 });
    expect(applyAction(twoStage, s, { type: 'place', service: 'ec2', gridX: 0, gridZ: 0 }).ok).toBe(false);
    expect(applyAction(twoStage, s, { type: 'place', service: 'ec2', gridX: 99, gridZ: 0 }).ok).toBe(false);
    expect(applyAction(twoStage, s, { type: 'place', service: 'redis', gridX: 4, gridZ: 0 }).ok).toBe(false);
  });

  it('protects locked blocks', () => {
    const r = applyAction(twoStage, createSession(twoStage), { type: 'remove', id: 'users' });
    expect(r.ok).toBe(false);
  });

  it('bumps the version on every board change', () => {
    const s0 = createSession(twoStage);
    const s1 = act(s0, { type: 'place', service: 'ec2', gridX: 0, gridZ: 0 });
    expect(s1.version).toBe(s0.version + 1);
  });
});

describe('runTest', () => {
  it('advances through stages and only completes on the last one', () => {
    let s = act(
      createSession(twoStage),
      { type: 'place', service: 'ec2', gridX: 0, gridZ: 0 },
      { type: 'place', service: 'rds', gridX: 4, gridZ: 0 },
      { type: 'connect', a: 'ec2-1', b: 'rds-1' }
    );
    const stage1 = runTest(twoStage, s);
    expect(stage1.stagePassed).toBe(true);
    expect(stage1.levelComplete).toBe(false);
    s = act(s, { type: 'applyTest', report: stage1 });
    expect(s.stageIdx).toBe(1);

    // Stage 2 must not pass on the stage-1 board.
    const tooSlow = runTest(twoStage, s);
    expect(tooSlow.stagePassed).toBe(false);
    expect(tooSlow.objectives.find((o) => o.id === 'fast')?.passed).toBe(false);
    s = act(s, { type: 'applyTest', report: tooSlow });

    s = act(s, { type: 'place', service: 'redis', gridX: 4, gridZ: 1 }, { type: 'connect', a: 'ec2-1', b: 'redis-1' });
    const done = runTest(twoStage, s);
    expect(done.levelComplete).toBe(true);
    expect(done.starCount).toBeGreaterThanOrEqual(1);
    expect(done.xp).toBeGreaterThan(0);
  });

  it('discards a test result if the board changed while traffic was running', () => {
    let s = act(createSession(twoStage), { type: 'place', service: 'ec2', gridX: 0, gridZ: 0 });
    const report = runTest(twoStage, s);
    s = act(s, { type: 'place', service: 'rds', gridX: 4, gridZ: 0 });
    const r = applyAction(twoStage, s, { type: 'applyTest', report });
    expect(r.ok).toBe(false);
    expect(r.session).toBe(s);
  });

  it('never passes with a blocking violation even if objectives are met', () => {
    const s = act(
      createSession(twoStage),
      { type: 'place', service: 'ec2', gridX: 0, gridZ: 0 },
      { type: 'place', service: 'rds', gridX: 4, gridZ: 0 },
      { type: 'connect', a: 'ec2-1', b: 'rds-1' },
      { type: 'place', service: 'ec2', gridX: 1, gridZ: 2 }
    );
    const report = runTest(twoStage, s);
    expect(report.objectives.every((o) => o.passed)).toBe(true);
    expect(report.stagePassed).toBe(false);
    expect(report.blockingViolations.map((v) => v.code)).toContain('finops.idle');
  });
});

describe('save data', () => {
  it('round-trips and survives garbage', () => {
    const save = { ...freshSave(), completed: [1, 2], stars: { 1: 3 }, xp: 250 };
    expect(parseSave(serializeSave(save), 130)).toEqual(save);
    expect(parseSave('not json', 130)).toEqual(freshSave());
    expect(parseSave('{"version":3,"completed":"oops"}', 130).completed).toEqual([]);
  });

  it('migrates the legacy v2 progress', () => {
    const legacy = JSON.stringify({ completedLevels: [1, 2, 999], levelStars: { 1: 3, 2: 9 }, lastLevelId: 5 });
    const save = migrateLegacySave(legacy, 130);
    expect(save).toMatchObject({ completed: [1, 2], stars: { 1: 3 }, lastLevelId: 5 });
  });
});

describe('engine purity', () => {
  it('never imports React, Three.js, or app code', () => {
    const root = join(__dirname, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts') && !path.includes('__tests__')) files.push(path);
      }
    };
    walk(root);
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/from ['"](react|three|motion|lucide-react)/);
      expect(src, file).not.toMatch(/from ['"]\.\.\/\.\.\//);
      expect(src, file).not.toMatch(/\b(window|document|localStorage)\./);
    }
  });
});

describe('availability zone objective', () => {
  it('needs working blocks in two AZs', () => {
    const goal = [{ id: 'az', label: '', hint: '', kind: 'azSpread' as const, type: 'ec2' as const }];
    const sameAz = board([users(), block('a', 'ec2', 0, -1), block('b', 'ec2', 0, -2)], [wire('users', 'a'), wire('users', 'b')]);
    const split = board([users(), block('a', 'ec2', 0, -1), block('b', 'ec2', 0, 1)], [wire('users', 'a'), wire('users', 'b')]);
    expect(evaluateObjectives(goal, sameAz, analyzeBoard(sameAz))[0].passed).toBe(false);
    expect(evaluateObjectives(goal, split, analyzeBoard(split))[0].passed).toBe(true);
  });
});
