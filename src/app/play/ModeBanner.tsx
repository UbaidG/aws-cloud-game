import { CATALOG } from '../../engine';
import { useGame } from '../store/GameProvider';

/** Tells the player what the next tap will do, with the way out. */
export function ModeBanner() {
  const { state } = useGame();
  const { tool, placingType, wireSourceId, movingId, session, running } = state;
  const name = (id: string) => session?.board.blocks.find((b) => b.id === id)?.name ?? '';

  let text: string | null = null;
  let tone = 'border-signal/50 text-signal';
  if (running) text = 'Traffic is flowing…';
  else if (movingId) text = `Moving ${name(movingId)}: tap a green tile`;
  else if (tool === 'place' && placingType) {
    text = `Placing ${CATALOG[placingType].shortLabel}: tap a green tile`;
    tone = 'border-gold/60 text-gold';
  } else if (tool === 'wire') text = wireSourceId ? `Wiring from ${name(wireSourceId)}: tap the block to connect` : 'Wire tool: tap the first block';
  else if (tool === 'delete') {
    text = 'Delete tool: tap a block or wire to remove it';
    tone = 'border-bad/60 text-red-300';
  }
  if (!text) return null;

  return (
    <div className={`pointer-events-auto panel !rounded-full border px-3.5 py-1.5 text-[12px] font-semibold flex items-center gap-2 animate-rise ${tone}`} role="status">
      {text}
      {!running && <span className="kbd">Esc</span>}
    </div>
  );
}
