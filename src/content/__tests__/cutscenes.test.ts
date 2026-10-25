import { describe, expect, it } from 'vitest';
import { analyzeBoard } from '../../engine';
import { StageState, cutsceneDuration, cutsceneOf, validateCutscene } from '../cutscene';
import { LEVELS } from '../levels';

const withCutscenes = LEVELS.flatMap((level) => {
  const spec = cutsceneOf(level);
  return spec ? [{ level, spec }] : [];
});

describe('cutscenes', () => {
  it.each(Array.from({ length: 13 }, (_, i) => i + 1))('module %i has a story for every level', (moduleId) => {
    const first = (moduleId - 1) * 10 + 1;
    expect(withCutscenes.filter(({ level }) => level.moduleId === moduleId).map(({ level }) => level.id)).toEqual(
      Array.from({ length: 10 }, (_, i) => first + i),
    );
  });

  describe.each(withCutscenes.map(({ level, spec }) => [`${level.id} ${level.title}`, spec] as const))('%s', (_, spec) => {
    it('references only blocks and wires on its stage, in legal zones', () => {
      expect(validateCutscene(spec)).toEqual([]);
    });

    it('runs 15–35 seconds', () => {
      const ms = cutsceneDuration(spec);
      expect(ms).toBeGreaterThanOrEqual(15_000);
      expect(ms).toBeLessThanOrEqual(35_000);
    });

    it('shows traffic the engine agrees with', () => {
      const stage = new StageState(spec);
      for (const beat of spec.beats) {
        stage.apply(beat);
        if (beat.t !== 'traffic' || !beat.expect) continue;
        const analysis = analyzeBoard(stage.board(), { load: { rps: beat.rps ?? 200, botRps: beat.botRps ?? 0 } });
        expect(analysis.trace.served ? 'served' : 'blocked').toBe(beat.expect);
      }
    });
  });
});
