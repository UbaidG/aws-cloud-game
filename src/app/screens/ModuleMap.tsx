import { ArrowLeft, Check, Lock, Play, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { MAX_LEVEL, getLevel } from '../../content/levels';
import { MODULES, moduleOf } from '../../content/modules';
import { isUnlocked, nextLevelId, rankFor } from '../progress';
import { useGame } from '../store/GameProvider';
import { AwsServiceIcon } from '../ServiceIcon';
import { Meter, Stars } from '../ui/bits';

/** The campaign map: 13 modules, each a winding path of 10 missions ending in an assessment. */
export function ModuleMap() {
  const { state, dispatch } = useGame();
  const { save } = state;
  const next = nextLevelId(save, MAX_LEVEL);
  const [openModule, setOpenModule] = useState(moduleOf(state.session?.levelId ?? next)?.id ?? 1);
  const current = useRef<HTMLButtonElement>(null);
  const rank = rankFor(save.xp);
  const totalStars = Object.values(save.stars).reduce((a, b) => a + b, 0);

  useEffect(() => {
    current.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [openModule]);

  const play = (levelId: number) => dispatch({ type: 'startLevel', levelId, resume: save.inProgress?.levelId === levelId });

  return (
    <div className="h-dvh flex flex-col bg-ink-950 bg-[radial-gradient(ellipse_at_top,rgb(56_189_248/0.12),transparent_60%)]">
      <header className="h-14 shrink-0 flex items-center gap-3 px-4 border-b border-line bg-ink-900/80 backdrop-blur">
        <button className="btn btn-ghost !px-2" onClick={() => dispatch({ type: 'go', screen: 'title' })} aria-label="Title screen">
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="display font-bold text-lg flex-1">Mission Map</h1>
        <div className="hidden sm:flex items-center gap-1.5 text-[12px] font-mono text-muted">
          <Trophy className="size-4 text-gold" /> {totalStars}/{MAX_LEVEL * 3}
        </div>
        <div className="flex flex-col w-36 sm:w-44">
          <div className="flex justify-between text-[10px]">
            <span className="font-bold text-gold truncate">{rank.title}</span>
            <span className="font-mono text-muted">{save.xp} XP</span>
          </div>
          <Meter value={rank.into} max={rank.span ?? 1} tone="gold" className="mt-1" />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scroll-thin">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-3">
          {MODULES.map((mod) => {
            const done = mod.levelIds.filter((id) => save.completed.includes(id)).length;
            const stars = mod.levelIds.reduce((s, id) => s + (save.stars[id] ?? 0), 0);
            const unlocked = isUnlocked(save, mod.levelIds[0]);
            const open = openModule === mod.id;
            const mastered = done === mod.levelIds.length;
            return (
              <section key={mod.id} className={`panel overflow-hidden ${unlocked ? '' : 'opacity-60'}`}>
                <button className="w-full flex items-center gap-3 p-3 sm:p-4 text-left" onClick={() => setOpenModule(open ? 0 : mod.id)} aria-expanded={open}>
                  <div className="relative">
                    <AwsServiceIcon type={mod.badge} size={44} />
                    {mastered && (
                      <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-gold text-ink-950 grid place-items-center">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="eyebrow">Module {mod.id}</div>
                    <div className="display font-bold text-[15px] truncate">{mod.title}</div>
                    <div className="text-[12px] text-muted line-clamp-1">{mod.summary}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[12px]">
                      {done}/{mod.levelIds.length}
                    </div>
                    <div className="font-mono text-[11px] text-gold">★ {stars}</div>
                  </div>
                </button>
                {open && (
                  <motion.ol className="px-4 pb-5 pt-1 grid grid-cols-1 gap-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    {mod.levelIds.map((id, i) => {
                      const level = getLevel(id);
                      const complete = save.completed.includes(id);
                      const available = isUnlocked(save, id);
                      const isNext = id === next;
                      const offset = ['ml-0', 'ml-8', 'ml-16', 'ml-8'][i % 4];
                      return (
                        <li key={id} className={`${offset} transition-[margin]`}>
                          <button
                            ref={isNext ? current : undefined}
                            disabled={!available}
                            data-level-id={id}
                            onClick={() => play(id)}
                            className={`group w-full max-w-md flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                              isNext
                                ? 'border-gold/70 bg-gold/10 shadow-[0_0_24px_-6px_rgb(251_191_36/0.6)]'
                                : complete
                                  ? 'border-ok/30 bg-ok/5 hover:bg-ok/10'
                                  : available
                                    ? 'border-line-strong bg-ink-800 hover:bg-ink-700'
                                    : 'border-line bg-ink-900/60'
                            }`}
                          >
                            <span
                              className={`size-9 shrink-0 rounded-full grid place-items-center font-mono font-bold text-[12px] ${
                                level.isAssessment ? 'rounded-lg rotate-45' : ''
                              } ${complete ? 'bg-ok/20 text-ok' : isNext ? 'bg-gold text-ink-950' : available ? 'bg-ink-600' : 'bg-ink-800 text-faint'}`}
                            >
                              <span className={level.isAssessment ? '-rotate-45' : ''}>
                                {!available ? <Lock className="size-3.5" /> : isNext ? <Play className="size-3.5 fill-current" /> : id}
                              </span>
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block font-semibold text-[13.5px] truncate">{level.title}</span>
                              <span className="block text-[11.5px] text-muted truncate">
                                {level.isAssessment ? 'Assessment · ' : ''}
                                {level.tagline}
                              </span>
                            </span>
                            {complete ? <Stars count={save.stars[id] ?? 0} size={12} /> : save.inProgress?.levelId === id ? <span className="chip !text-signal">In progress</span> : null}
                          </button>
                        </li>
                      );
                    })}
                  </motion.ol>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
