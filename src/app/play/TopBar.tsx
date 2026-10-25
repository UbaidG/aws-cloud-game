import { Map as MapIcon, Menu, Volume2, VolumeX } from 'lucide-react';
import { moduleOf } from '../../content/modules';
import { useGame } from '../store/GameProvider';
import { rankFor } from '../progress';
import { Meter, Stars } from '../ui/bits';

/** Slim top bar: where you are, your best stars, rank/XP, and the menu. */
export function TopBar() {
  const { state, dispatch, level } = useGame();
  if (!level || !state.session) return null;
  const mod = moduleOf(level.id);
  const rank = rankFor(state.save.xp);
  const stageCount = level.stages.length;
  const { stageIdx, completed } = state.session;
  const muted = state.save.settings.muted;

  return (
    <header className="h-14 shrink-0 flex items-center gap-3 px-3 sm:px-4 border-b border-line bg-ink-900/90 backdrop-blur z-20">
      <button className="btn btn-ghost !px-2" onClick={() => dispatch({ type: 'go', screen: 'map' })} aria-label="Mission map">
        <MapIcon className="size-4" />
        <span className="hidden md:inline">Map</span>
      </button>

      <div className="min-w-0 flex-1 flex items-center gap-3">
        <div className="min-w-0">
          <div className="eyebrow truncate">
            {mod ? `Module ${mod.id} · ${mod.shortTitle}` : 'Mission'} · {level.isAssessment ? 'Assessment' : `Mission ${level.id}`}
          </div>
          <h1 className="display font-bold text-[15px] leading-tight truncate">{level.title}</h1>
        </div>
        {stageCount > 1 && (
          <ol className="hidden sm:flex items-center gap-1" aria-label={`Stage ${Math.min(stageIdx + 1, stageCount)} of ${stageCount}`}>
            {level.stages.map((s, i) => {
              const done = completed || i < stageIdx;
              const current = !completed && i === stageIdx;
              return (
                <li
                  key={i}
                  title={`Stage ${i + 1}: ${s.title}`}
                  className={`h-1.5 rounded-full transition-all ${current ? 'w-7 bg-arcane' : done ? 'w-4 bg-ok' : 'w-4 bg-ink-500'}`}
                />
              );
            })}
          </ol>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-2" title="Best result on this mission">
        <Stars count={state.save.stars[level.id] ?? 0} />
      </div>

      <div className="hidden md:flex flex-col w-40" title={`${state.save.xp} XP`}>
        <div className="flex justify-between text-[10px]">
          <span className="font-bold text-gold truncate">{rank.title}</span>
          <span className="font-mono text-muted">{state.save.xp} XP</span>
        </div>
        <Meter value={rank.into} max={rank.span ?? 1} tone="gold" className="mt-1" />
      </div>

      <button
        className="btn btn-ghost !px-2"
        onClick={() => dispatch({ type: 'settings', patch: { muted: !muted } })}
        aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        aria-pressed={muted}
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
      <button className="btn !px-2.5" onClick={() => dispatch({ type: 'overlay', overlay: 'menu' })} aria-label="Menu">
        <Menu className="size-4" />
      </button>
    </header>
  );
}
