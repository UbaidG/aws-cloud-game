import { useEffect } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useGame } from '../store/GameProvider';
import { isReportCurrent } from '../lib/boardOverlays';
import { BlockInspector, WireInspector } from './Inspector';
import { ReportPanel } from './ReportPanel';
import { useRenderer } from './RendererContext';

/** One panel for whatever needs the player's attention: the selected block or wire, or the last failed test. */
export function ContextPanel({ variant }: { variant: 'side' | 'sheet' }) {
  const { state, dispatch } = useGame();
  const renderer = useRenderer();
  const { session, selectedId, selectedWireId, report, running } = state;
  const block = selectedId ? session?.board.blocks.find((b) => b.id === selectedId) : undefined;
  const failedReport = session && !running && isReportCurrent(report, session) && !report.stagePassed ? report : null;
  const open = !!session && !!(block || selectedWireId || failedReport);

  // The side panel covers the board's right edge; recentre the 3D view in the space that's left.
  useEffect(() => {
    if (variant !== 'side' || !renderer) return;
    renderer.setInsets({ right: open ? 336 : 0 });
    return () => renderer.setInsets({ right: 0 });
  }, [variant, renderer, open]);

  if (!session) return null;

  let key: string | null = null;
  let content: React.ReactNode = null;
  if (block) {
    key = `block:${block.id}`;
    content = <BlockInspector block={block} />;
  } else if (selectedWireId) {
    key = `wire:${selectedWireId}`;
    content = <WireInspector wireId={selectedWireId} />;
  } else if (failedReport) {
    key = `report:${failedReport.version}`;
    content = <ReportPanel report={failedReport} />;
  }

  const close = () => dispatch({ type: 'escape' });
  const shell =
    variant === 'side'
      ? 'pointer-events-auto panel w-[320px] max-h-full overflow-y-auto scroll-thin p-4 relative'
      : 'pointer-events-auto panel !rounded-b-none w-full max-h-[55dvh] overflow-y-auto scroll-thin p-4 relative';

  return (
    <AnimatePresence mode="wait">
      {key && (
        <motion.aside
          key={key}
          className={shell}
          aria-label="Details"
          initial={variant === 'side' ? { x: 24, opacity: 0 } : { y: 24, opacity: 0 }}
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={variant === 'side' ? { x: 24, opacity: 0 } : { y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          {(block || selectedWireId) && (
            <button className="btn btn-ghost !p-1 absolute top-3 right-3" onClick={close} aria-label="Close details">
              <X className="size-4" />
            </button>
          )}
          {content}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
