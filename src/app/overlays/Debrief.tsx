import { ArrowRight, Check, Map as MapIcon, RotateCcw, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { MAX_LEVEL, getLevel } from '../../content/levels';
import { sound } from '../audio';
import { rankFor } from '../progress';
import { useGame } from '../store/GameProvider';
import { Meter, Stars } from '../ui/bits';
import { Modal } from '../ui/Modal';

/** Mission complete: stars land one by one with their reasons, then XP and rank. */
export function Debrief() {
  const { state, dispatch, level } = useGame();
  const open = state.overlay === 'debrief';
  const report = state.report;
  const reward = state.reward;

  useEffect(() => {
    if (!open || !reward) return;
    const timers = Array.from({ length: reward.starCount }, (_, i) => window.setTimeout(() => sound.star(i), 250 + i * 250));
    if (reward.rankUp) timers.push(window.setTimeout(() => sound.levelUp(), 1300));
    return () => timers.forEach(clearTimeout);
  }, [open, reward]);

  if (!level || !report?.stars || !reward) return null;
  const rank = rankFor(state.save.xp);
  const nextId = level.id < MAX_LEVEL ? level.id + 1 : null;
  const t = report.analysis.telemetry;

  return (
    <Modal
      open={open}
      onClose={() => dispatch({ type: 'overlay', overlay: null })}
      eyebrow={level.isAssessment ? 'Assessment passed' : 'Mission complete'}
      title={level.title}
      footer={
        <>
          <button className="btn btn-ghost" onClick={() => dispatch({ type: 'go', screen: 'map' })}>
            <MapIcon className="size-4" /> Map
          </button>
          <button className="btn" onClick={() => dispatch({ type: 'restartLevel' })}>
            <RotateCcw className="size-4" /> Replay
          </button>
          {nextId && (
            <button className="btn btn-gold display" onClick={() => dispatch({ type: 'startLevel', levelId: nextId })} data-autofocus>
              Next: {getLevel(nextId).title} <ArrowRight className="size-4" />
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <Stars count={reward.starCount} size={44} animate />
        <ul className="w-full flex flex-col gap-1.5">
          {report.stars.map((s, i) => (
            <motion.li
              key={s.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.25 }}
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[12.5px] ${s.earned ? 'border-gold/40 bg-gold/5' : 'border-line bg-ink-900/40 text-muted'}`}
            >
              {s.earned ? <Check className="size-4 text-gold shrink-0 mt-px" /> : <X className="size-4 text-faint shrink-0 mt-px" />}
              <span>
                <span className="font-semibold">{s.label}</span> · {s.detail}
              </span>
            </motion.li>
          ))}
        </ul>

        <div className="w-full grid grid-cols-3 gap-2 text-center">
          {[
            ['Latency', `${t.latencyMs}ms`],
            ['Capacity', `${t.capacityRps} rps`],
            ['Monthly bill', `$${t.monthlyCostUsd}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-ink-900/60 border border-line py-2">
              <div className="text-[10px] uppercase tracking-wider text-muted font-bold">{k}</div>
              <div className="font-mono font-bold">{v}</div>
            </div>
          ))}
        </div>

        <motion.div className="w-full rounded-xl border border-gold/30 bg-gold/5 p-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-gold flex items-center gap-1.5">
              <Sparkles className="size-4" /> {reward.xpGained > 0 ? `+${reward.xpGained} XP` : 'No new XP (beat your best stars to earn more)'}
            </span>
            <span className="font-mono text-[11px] text-muted">{state.save.xp} XP total</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11.5px]">
            <span className="font-semibold">{reward.rankUp ? `Promoted to ${rank.title}!` : rank.title}</span>
            {rank.span && (
              <span className="font-mono text-muted">
                {rank.into}/{rank.span}
              </span>
            )}
          </div>
          <Meter value={rank.into} max={rank.span ?? 1} tone="gold" className="mt-1" />
        </motion.div>
      </div>
    </Modal>
  );
}
