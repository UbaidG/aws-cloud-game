import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useGame } from '../store/GameProvider';

const TONE = {
  info: 'border-signal/50',
  ok: 'border-ok/60 text-green-100',
  warn: 'border-warn/60 text-amber-100',
  bad: 'border-bad/60 text-red-100',
};

function ToastItem({ id, tone, text }: { id: number; tone: keyof typeof TONE; text: string }) {
  const { dispatch } = useGame();
  useEffect(() => {
    const timer = window.setTimeout(() => dispatch({ type: 'dismissToast', id }), tone === 'warn' || tone === 'bad' ? 4500 : 3000);
    return () => window.clearTimeout(timer);
  }, [id, tone, dispatch]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      className={`panel pointer-events-auto border px-3.5 py-2 text-[12.5px] max-w-sm ${TONE[tone]}`}
      role={tone === 'warn' || tone === 'bad' ? 'alert' : 'status'}
      onClick={() => dispatch({ type: 'dismissToast', id })}
    >
      {text}
    </motion.div>
  );
}

export function Toasts() {
  const { state } = useGame();
  return (
    <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2" aria-live="polite">
      <AnimatePresence>
        {state.toasts.map((t) => (
          <ToastItem key={t.id} {...t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
