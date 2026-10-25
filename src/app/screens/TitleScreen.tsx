import { HelpCircle, Map as MapIcon, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { MAX_LEVEL, getLevel } from '../../content/levels';
import { nextLevelId, rankFor } from '../progress';
import { useGame } from '../store/GameProvider';
import { HelpModal } from '../overlays/HelpModal';

export function TitleScreen() {
  const { state, dispatch } = useGame();
  const { save } = state;
  const resume = save.inProgress && !save.inProgress.completed ? save.inProgress.levelId : null;
  const target = resume ?? nextLevelId(save, MAX_LEVEL);
  const fresh = save.completed.length === 0 && !resume;
  const rank = rankFor(save.xp);

  return (
    <div className="relative h-dvh overflow-hidden bg-void flex items-center justify-center">
      {/* Animated grid floor */}
      <div
        aria-hidden
        className="absolute inset-x-[-50%] bottom-[-30%] h-[90%] opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(rgb(56 189 248 / 0.25) 1px, transparent 1px), linear-gradient(90deg, rgb(56 189 248 / 0.25) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          transform: 'perspective(600px) rotateX(62deg)',
          maskImage: 'linear-gradient(to top, black 10%, transparent 85%)',
          animation: 'cc-grid-scroll 6s linear infinite',
        }}
      />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(56_189_248/0.18),transparent_55%)]" />
      <style>{`@keyframes cc-grid-scroll { from { background-position: 0 0; } to { background-position: 0 56px; } }`}</style>

      <div className="relative z-10 flex flex-col items-center text-center px-6 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="eyebrow !text-signal mb-3">An AWS strategy game</div>
          <h1 className="display font-bold text-5xl sm:text-7xl tracking-tight bg-gradient-to-b from-white to-sky-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgb(56_189_248/0.35)]">
            CloudCraft
          </h1>
          <p className="mt-3 max-w-md text-muted text-[15px]">Build real cloud architectures. Send traffic through them. Fix what breaks.</p>
        </motion.div>

        <motion.div className="flex flex-col items-center gap-2.5 w-full max-w-xs" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <button
            className="btn btn-gold display w-full !py-3 !text-base"
            onClick={() => dispatch({ type: 'startLevel', levelId: target, resume: resume === target })}
            autoFocus
          >
            <Play className="size-5 fill-current" />
            {fresh ? 'Start your first mission' : resume ? `Resume: ${getLevel(target).title}` : `Continue: ${getLevel(target).title}`}
          </button>
          <button className="btn w-full !py-2.5" onClick={() => dispatch({ type: 'go', screen: 'map' })}>
            <MapIcon className="size-4" /> Mission map
          </button>
          <button className="btn btn-ghost w-full" onClick={() => dispatch({ type: 'overlay', overlay: 'help' })}>
            <HelpCircle className="size-4" /> How to play
          </button>
        </motion.div>

        {!fresh && (
          <div className="text-[12px] text-muted font-mono">
            {rank.title} · {save.xp} XP · {save.completed.length}/{MAX_LEVEL} missions
          </div>
        )}
      </div>
      <HelpModal />
    </div>
  );
}
