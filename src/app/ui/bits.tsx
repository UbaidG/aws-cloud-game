import { Star } from 'lucide-react';
import { motion } from 'motion/react';

export function Stars({ count, max = 3, size = 14, animate = false }: { count: number; max?: number; size?: number; animate?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => {
        const earned = i < count;
        const star = (
          <Star
            style={{ width: size, height: size }}
            className={earned ? 'fill-gold text-gold drop-shadow-[0_0_6px_rgb(251_191_36/0.6)]' : 'text-ink-500'}
          />
        );
        return animate && earned ? (
          <motion.span key={i} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2 + i * 0.25, type: 'spring', stiffness: 400, damping: 14 }}>
            {star}
          </motion.span>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </span>
  );
}

export function Meter({ value, max, tone = 'signal', className = '' }: { value: number; max: number; tone?: 'signal' | 'gold' | 'ok' | 'bad'; className?: string }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const color = { signal: 'bg-signal', gold: 'bg-gold', ok: 'bg-ok', bad: 'bg-bad' }[tone];
  return (
    <div className={`h-1.5 rounded-full bg-ink-600/80 overflow-hidden ${className}`}>
      <motion.div className={`h-full rounded-full ${color}`} initial={false} animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
    </div>
  );
}
