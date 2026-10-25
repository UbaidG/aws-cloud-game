import { FastForward, Play } from 'lucide-react';
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { CAST, cutsceneOf, type CastId, type CutsceneSpec, type Tone } from '../../content/cutscene';
import { moduleOf } from '../../content/modules';
import { analyzeBoard } from '../../engine';
import type { BoardRenderer } from '../../render';
import { EMPTY_UI, finalBoard, playCutscene, storyLines, type CutsceneUi, type StatChip } from '../lib/cutscenePlayer';
import { useRenderer } from '../play/RendererContext';
import { useGame } from '../store/GameProvider';

const TONE_TEXT: Record<Tone, string> = { info: 'text-signal', good: 'text-ok', bad: 'text-bad', warn: 'text-gold' };
const HOLD_TO_SKIP_MS = 600;

/**
 * The level's opening story, played on the real board with letterbox bars, captions, speech
 * bubbles and stat counters. Esc, the Skip button or holding Space skips to the mission card.
 * With reduced motion the story is shown as still panels instead.
 */
export function Cutscene() {
  const { state, dispatch, level } = useGame();
  const renderer = useRenderer();
  const reduced = useReducedMotion() ?? false;
  const spec = level ? cutsceneOf(level) : null;
  const open = state.overlay === 'cutscene' && !!spec;
  const done = () => dispatch({ type: 'overlay', overlay: 'briefing' });

  return (
    <AnimatePresence>
      {open && spec && renderer && level && (
        <motion.div key={level.id} className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {reduced ? (
            <StoryPanels spec={spec} renderer={renderer} onDone={done} title={level.title} />
          ) : (
            <Player spec={spec} renderer={renderer} onDone={done} eyebrow={`${moduleOf(level.id) ? `Module ${moduleOf(level.id)!.id} · ` : ''}Mission ${level.id}`} title={level.title} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Player({ spec, renderer, onDone, eyebrow, title }: { spec: CutsceneSpec; renderer: BoardRenderer; onDone: () => void; eyebrow: string; title: string }) {
  const [ui, setUi] = useState<CutsceneUi>(EMPTY_UI);
  const [holding, setHolding] = useState(false);
  const finish = useRef(onDone);
  finish.current = onDone;

  useEffect(() => {
    const ctrl = new AbortController();
    playCutscene(spec, renderer, setUi, ctrl.signal).then(
      () => finish.current(),
      () => {}, // Aborted: whoever closed the overlay already moved on.
    );
    return () => ctrl.abort(new DOMException('Cutscene closed', 'AbortError'));
  }, [spec, renderer]);

  // Hold Space to skip (a tap does nothing, so nobody skips by accident).
  useEffect(() => {
    let timer = 0;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      setHolding(true);
      timer = window.setTimeout(() => finish.current(), HOLD_TO_SKIP_MS);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      setHolding(false);
      clearTimeout(timer);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col" role="dialog" aria-label={`Story: ${title}`}>
      {/* Letterbox */}
      <motion.div className="bg-black shrink-0 flex items-end justify-between px-4 sm:px-8 pb-2" initial={{ height: 0 }} animate={{ height: '11vh' }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <div className="min-w-0">
          <div className="eyebrow !text-faint truncate">{eyebrow}</div>
          <div className="display font-bold text-[15px] sm:text-lg truncate">{title}</div>
        </div>
        <button className="btn btn-ghost !text-[12px] shrink-0" onClick={() => finish.current()}>
          <FastForward className="size-3.5" /> Skip
          <span className="hidden sm:inline text-faint font-mono">· hold Space</span>
        </button>
      </motion.div>

      <div className="relative flex-1">
        <div className="absolute right-3 sm:right-6 top-3 flex flex-col items-end gap-2">
          <AnimatePresence>
            {ui.stats.map((s) => (
              <StatPill key={s.key} stat={s} />
            ))}
          </AnimatePresence>
        </div>
        <div className="absolute left-3 sm:left-6 bottom-4 max-w-[min(26rem,calc(100%-1.5rem))]">
          <AnimatePresence mode="wait">{ui.speech && <Speech key={ui.speech.text} who={ui.speech.who} text={ui.speech.text} />}</AnimatePresence>
        </div>
      </div>

      <motion.div className="bg-black shrink-0 relative flex items-center justify-center px-4 sm:px-10" initial={{ height: 0 }} animate={{ height: '15vh' }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <AnimatePresence mode="wait">
          {ui.caption && (
            <motion.p
              key={ui.caption}
              className="text-center text-[14px] sm:text-[17px] leading-snug max-w-3xl text-text"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
            >
              {ui.caption}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="absolute left-0 bottom-0 h-0.5 bg-white/10 w-full">
          <motion.div className="h-full bg-signal" animate={{ width: `${ui.progress * 100}%` }} transition={{ duration: 0.4 }} />
        </div>
        {holding && <motion.div className="absolute left-0 top-0 h-0.5 bg-gold" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: HOLD_TO_SKIP_MS / 1000, ease: 'linear' }} />}
      </motion.div>
    </div>
  );
}

function Speech({ who, text }: { who: CastId; text: string }) {
  const person = CAST[who];
  return (
    <motion.div
      className="panel !bg-ink-900/90 backdrop-blur p-3 flex gap-3 items-start shadow-xl"
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      <span className="size-9 shrink-0 rounded-full grid place-items-center font-bold text-ink-950 display" style={{ background: person.color }} aria-hidden>
        {person.name[0]}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-mono">
          <span className="font-bold" style={{ color: person.color }}>
            {person.name}
          </span>
          <span className="text-faint"> · {person.role}</span>
        </div>
        <p className="text-[13.5px] leading-snug mt-0.5">{text}</p>
      </div>
    </motion.div>
  );
}

function StatPill({ stat }: { stat: StatChip }) {
  const value = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const decimals = Number.isInteger(stat.value) ? 0 : 1;
    const controls = animate(0, stat.value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (value.current) value.current.textContent = v.toLocaleString(undefined, { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
      },
    });
    return () => controls.stop();
  }, [stat.value]);
  return (
    <motion.div
      layout
      className="panel !bg-ink-900/90 backdrop-blur px-3 py-2 text-right"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    >
      <div className="eyebrow">{stat.label}</div>
      <div className={`font-mono font-bold text-xl ${TONE_TEXT[stat.tone]}`}>
        {stat.prefix}
        <span ref={value}>0</span>
        {stat.unit && <span className="text-[13px] ml-0.5">{stat.unit}</span>}
      </div>
    </motion.div>
  );
}

/** Reduced motion: the finished scene as a still, with the story as text. */
function StoryPanels({ spec, renderer, onDone, title }: { spec: CutsceneSpec; renderer: BoardRenderer; onDone: () => void; title: string }) {
  useEffect(() => {
    const board = finalBoard(spec);
    renderer.beginLevel();
    renderer.setScene({
      board,
      analysis: analyzeBoard(board),
      tool: 'select',
      placingType: null,
      selectedId: null,
      wireSourceId: null,
      targets: [],
      highlightIds: [],
      callouts: [],
    });
  }, [spec, renderer]);
  const lines = storyLines(spec);
  return (
    <div className="absolute inset-0 bg-black/40 flex items-end sm:items-center justify-center p-3" role="dialog" aria-label={`Story: ${title}`}>
      <div className="panel w-full max-w-lg p-4 flex flex-col gap-3 max-h-[80dvh] overflow-y-auto scroll-thin">
        <div className="eyebrow">The story so far</div>
        <ol className="flex flex-col gap-2">
          {lines.map((line, i) => (
            <li key={i} className="text-[13.5px] leading-snug">
              {line.who ? (
                <>
                  <span className="font-bold" style={{ color: CAST[line.who].color }}>
                    {CAST[line.who].name}:
                  </span>{' '}
                  “{line.text}”
                </>
              ) : (
                <span className="text-muted">{line.text}</span>
              )}
            </li>
          ))}
        </ol>
        <button className="btn btn-gold display self-end" onClick={onDone} data-autofocus autoFocus>
          <Play className="size-4" /> Continue
        </button>
      </div>
    </div>
  );
}
