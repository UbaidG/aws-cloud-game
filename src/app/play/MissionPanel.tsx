import { BookOpen, CheckCircle2, ChevronDown, Circle, Clapperboard, Lightbulb, Target, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { currentStage, levelBudget } from '../../engine';
import { cutsceneOf } from '../../content/cutscene';
import { GAME_MODES } from '../../content/modules';
import { useGame } from '../store/GameProvider';
import { useCoach } from '../hooks/useCoach';

/**
 * The Mission column: story, task, live objectives, hints and the concept, as one scrolling flow.
 * On small screens it renders as a collapsible bottom sheet.
 */
export function MissionPanel({ variant }: { variant: 'column' | 'sheet' }) {
  const { state, dispatch, level, live } = useGame();
  const coach = useCoach();
  const [open, setOpen] = useState(false);
  if (!level || !state.session || !live) return null;

  const { session } = state;
  const stage = currentStage(level, session.stageIdx);
  const mode = GAME_MODES[level.gameMode];
  const objectives = live.objectives;
  const doneCount = objectives.filter((o) => o.passed).length;
  const issues = live.analysis.violations.filter((v) => v.severity === 'error');
  const hints = stage.hints.slice(0, session.hintsRevealed);

  const story = cutsceneOf(level) && (
    <button className="chip hover:!text-text hover:!border-line-strong" onClick={() => dispatch({ type: 'overlay', overlay: 'cutscene' })} disabled={state.running}>
      <Clapperboard className="size-3" /> Replay story
    </button>
  );

  const body = (
    <div className="flex flex-col gap-4">
      {variant === 'column' ? (
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="chip !text-signal !border-signal/40">{mode.badge}</span>
            <span className="chip">{level.difficulty}</span>
            {level.isAssessment && <span className="chip !text-gold !border-gold/50">Assessment</span>}
            {story}
          </div>
          <p className="text-[13px] text-muted leading-relaxed">{level.tagline}</p>
        </div>
      ) : (
        story && <div>{story}</div>
      )}

      {coach && (
        <motion.div key={coach.id} className="rounded-xl border border-gold/50 bg-gold/10 p-3 animate-rise" layout>
          <div className="eyebrow !text-gold mb-1">Coach</div>
          <p className="text-[13px] leading-relaxed">{coach.text}</p>
        </motion.div>
      )}

      <section>
        <div className="eyebrow mb-1.5 flex items-center gap-1.5">
          <Target className="size-3.5" /> {level.stages.length > 1 ? `Stage ${session.stageIdx + 1} of ${level.stages.length} · ${stage.title}` : 'Your task'}
        </div>
        <p className="text-[13px] leading-relaxed text-text/90">{stage.brief}</p>
        <p className="mt-2 text-[13px] font-semibold text-signal leading-relaxed">{stage.goal}</p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <span className="eyebrow">Objectives</span>
          <span className="font-mono text-[11px] text-muted">
            {doneCount}/{objectives.length}
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {objectives.map((o) => (
            <li key={o.id} className={`rounded-lg border px-2.5 py-2 text-[12.5px] transition-colors ${o.passed ? 'border-ok/30 bg-ok/5' : 'border-line bg-ink-900/40'}`}>
              <div className="flex gap-2">
                {o.passed ? <CheckCircle2 className="size-4 text-ok shrink-0 mt-px" /> : <Circle className="size-4 text-faint shrink-0 mt-px" />}
                <div className="min-w-0">
                  <div className={o.passed ? 'text-text/80' : 'text-text'}>{o.label}</div>
                  {!o.passed && o.detail && <div className="text-[11.5px] text-muted mt-0.5">{o.detail}</div>}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {issues.length > 0 && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/5 px-2.5 py-2 text-[12px] text-red-200">
            <TriangleAlert className="size-4 text-bad shrink-0 mt-px" />
            <span>
              {issues.length} rule {issues.length === 1 ? 'violation' : 'violations'} on the board: {issues[0].title}
              {issues.length > 1 ? ` and ${issues.length - 1} more` : ''}.
            </span>
          </div>
        )}
        <div className="mt-2 text-[11px] text-muted font-mono">Budget for ★: ${levelBudget(level)}/mo</div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1.5">
          <span className="eyebrow flex items-center gap-1.5">
            <Lightbulb className="size-3.5" /> Hints
          </span>
          {session.hintsRevealed < 3 && (
            <button className="btn btn-ghost !py-0.5 !px-2 !text-[11px]" onClick={() => dispatch({ type: 'revealHint' })}>
              {session.hintsRevealed === 0 ? 'Need a hint?' : 'Another hint'}
            </button>
          )}
        </div>
        {hints.length === 0 ? (
          <p className="text-[11.5px] text-faint">Hints are free, but using one costs the Clean Run star.</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            <AnimatePresence initial={false}>
              {hints.map((h, i) => (
                <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[12.5px] rounded-lg bg-ink-700/60 border border-line px-2.5 py-2 whitespace-pre-line">
                  <span className="font-mono text-gold mr-1.5">{i + 1}.</span>
                  {h}
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </section>

      {level.conceptCard && (
        <details className="group rounded-xl border border-arcane/30 bg-arcane/5 p-3">
          <summary className="flex items-center gap-2 cursor-pointer list-none">
            <BookOpen className="size-4 text-arcane" />
            <span className="font-bold text-[13px] flex-1">{level.conceptCard.title}</span>
            <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 flex flex-col gap-2 text-[12.5px] leading-relaxed text-text/85">
            <p>{level.conceptCard.summary}</p>
            <p className="text-muted">
              <span className="text-arcane font-semibold">Think of it like: </span>
              {level.conceptCard.analogy}
            </p>
            <p className="font-semibold">{level.conceptCard.keyTakeaway}</p>
          </div>
        </details>
      )}

      {level.docTips.length > 0 && (
        <section>
          <div className="eyebrow mb-1.5">Field notes</div>
          <ul className="flex flex-col gap-1 text-[12px] text-muted list-disc pl-4">
            {level.docTips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  if (variant === 'column') {
    return (
      <aside className="w-[340px] shrink-0 border-r border-line bg-ink-900/70 overflow-y-auto scroll-thin p-4" aria-label="Mission">
        {body}
      </aside>
    );
  }

  return (
    <div className={`panel !rounded-b-none pointer-events-auto flex flex-col ${open ? 'max-h-[70dvh]' : ''}`}>
      <button className="flex items-center gap-2 px-4 py-2.5 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Target className="size-4 text-signal shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-[12.5px] font-semibold truncate">{coach?.text ?? stage.goal}</span>
          <span className="block text-[10.5px] text-muted font-mono">
            {doneCount}/{objectives.length} objectives
          </span>
        </span>
        <ChevronDown className={`size-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="overflow-y-auto scroll-thin px-4 pb-4">{body}</div>}
    </div>
  );
}
