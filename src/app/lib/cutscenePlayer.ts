/**
 * Runs a cutscene timeline against the board renderer. The world (blocks, wires, packets, camera)
 * plays in 3D; captions, speech and stat chips are reported through `onUi` for React to draw.
 *
 * Traffic beats use the engine's own `analyzeBoard` on the visible board, so the story never
 * shows something the game's rules wouldn't do.
 */

import { analyzeBoard } from '../../engine';
import type { Board } from '../../engine';
import { beatHold, StageState, type CastId, type CutsceneSpec, type Tone } from '../../content/cutscene';
import type { BoardRenderer, SceneCallout } from '../../render';

export interface StatChip {
  key: string;
  label: string;
  value: number;
  unit?: string;
  prefix?: string;
  tone: Tone;
}

export interface CutsceneUi {
  caption: string | null;
  speech: { who: CastId; text: string } | null;
  stats: StatChip[];
  /** 0..1 through the timeline. */
  progress: number;
}

export const EMPTY_UI: CutsceneUi = { caption: null, speech: null, stats: [], progress: 0 };

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

const TONE_CALLOUT: Record<Tone, SceneCallout['tone']> = { info: 'info', good: 'info', bad: 'error', warn: 'warning' };

export async function playCutscene(
  spec: CutsceneSpec,
  renderer: BoardRenderer,
  onUi: (ui: CutsceneUi) => void,
  signal: AbortSignal,
): Promise<void> {
  const stage = new StageState(spec);
  const total = spec.beats.reduce((ms, b) => ms + beatHold(b), 0) || 1;
  let elapsed = 0;
  let ui: CutsceneUi = { ...EMPTY_UI };
  let callouts: SceneCallout[] = [];
  const setUi = (patch: Partial<CutsceneUi>) => {
    ui = { ...ui, ...patch, progress: Math.min(1, elapsed / total) };
    onUi(ui);
  };

  const draw = (load?: { rps: number; botRps: number }) => {
    const board = stage.board();
    const analysis = analyzeBoard(board, load ? { load } : {});
    renderer.setScene({
      board,
      analysis,
      tool: 'select',
      placingType: null,
      selectedId: null,
      wireSourceId: null,
      targets: [],
      highlightIds: callouts.flatMap((c) => (c.blockId ? [c.blockId] : [])),
      callouts,
    });
    return analysis;
  };

  renderer.beginLevel();
  renderer.setCameraLocked(true);
  draw();
  renderer.shot('wide');
  setUi({});

  try {
    for (const beat of spec.beats) {
      stage.apply(beat);
      switch (beat.t) {
        case 'spawn':
        case 'remove':
        case 'wire':
          draw();
          break;
        case 'crash':
          draw();
          renderer.flashBlock(beat.id);
          break;
        case 'camera':
          renderer.shot(beat.shot, beat.on);
          break;
        case 'callout':
          callouts = [
            ...callouts.filter((c) => c.blockId !== beat.on),
            { key: `${beat.on}:${beat.title}`, title: beat.title, body: beat.body ?? '', tone: TONE_CALLOUT[beat.tone ?? 'info'], blockId: beat.on },
          ];
          draw();
          renderer.flashBlock(beat.on, beat.tone === 'good' ? 0x22c55e : beat.tone === 'bad' ? 0xef4444 : 0x38bdf8);
          break;
        // Narration and dialogue take turns, so neither lingers under the other.
        case 'caption':
          setUi({ caption: beat.text, speech: null });
          break;
        case 'speech':
          setUi({ speech: { who: beat.who, text: beat.text }, caption: null });
          break;
        case 'stat': {
          const chip: StatChip = { key: beat.label, label: beat.label, value: beat.value, unit: beat.unit, prefix: beat.prefix, tone: beat.tone ?? 'info' };
          setUi({ stats: [...ui.stats.filter((s) => s.key !== chip.key), chip].slice(-3) });
          break;
        }
        case 'clear':
          callouts = [];
          draw();
          setUi({ caption: null, speech: null, stats: [] });
          break;
        case 'traffic': {
          const analysis = draw({ rps: beat.rps ?? 200, botRps: beat.botRps ?? 0 });
          const started = performance.now();
          await Promise.race([renderer.playTraffic(analysis.trace), sleep(9000, signal)]);
          const spent = performance.now() - started;
          // Keep the timeline honest: count the real time spent, then hold for whatever's left.
          elapsed += spent;
          setUi({});
          await sleep(Math.max(300, beatHold(beat) - spent), signal);
          elapsed += Math.max(0, beatHold(beat) - spent);
          continue;
        }
        case 'wait':
          break;
      }
      const hold = beatHold(beat);
      if (hold > 0) await sleep(hold, signal);
      elapsed += hold;
      setUi({});
    }
    elapsed = total;
    setUi({});
  } finally {
    renderer.stopTraffic();
    renderer.setCameraLocked(false);
  }
}

/** Every line of text in the scene, in order (reduced-motion story panels, accessibility). */
export function storyLines(spec: CutsceneSpec): { who: CastId | null; text: string }[] {
  return spec.beats.flatMap((b): { who: CastId | null; text: string }[] =>
    b.t === 'caption' ? [{ who: null, text: b.text }] : b.t === 'speech' ? [{ who: b.who, text: b.text }] : [],
  );
}

/** The stage as it looks once every beat has played (the backdrop for story panels). */
export function finalBoard(spec: CutsceneSpec): Board {
  const stage = new StageState(spec);
  for (const beat of spec.beats) stage.apply(beat);
  return stage.board();
}
