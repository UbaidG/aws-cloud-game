/**
 * Dev-only model gallery (`/?gallery`, optional `&q=low|medium|high`): every service model on the
 * real board under the game's lighting, for judging colour and materials at play distance.
 * Driven by art review scripts through `window.__gallery`.
 */
import { useEffect, useRef } from 'react';
import { analyzeBoard, CATALOG, type Block, type Board, type ServiceType } from '../../engine';
import { BoardRenderer, type QualityTier } from '../../render';
import { modelLibrary } from '../../render/assets/library';

const TYPES = Object.keys(CATALOG) as ServiceType[];

/** Every model in a grid, or just `types` in a compact cluster (`&types=ec2,rds`). */
function galleryBoard(types: ServiceType[]): Board {
  const cols = types.length === TYPES.length ? 8 : Math.min(4, types.length);
  const blocks: Block[] = types.map((type, i) => ({
    id: type,
    type,
    name: CATALOG[type].name,
    gridX: (types.length === TYPES.length ? -7 : -(cols - 1)) + (i % cols) * 2,
    gridZ: (types.length === TYPES.length ? -3 : -1) + Math.floor(i / cols) * 2,
    config: {},
  }));
  return { blocks, wires: [] };
}

export default function Gallery() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const quality = (params.get('q') as QualityTier | null) ?? undefined;
    const renderer = new BoardRenderer(host.current!, { onTap: () => {} }, { quality, reducedMotion: true });
    const only = params.get('types')?.split(',').filter((t): t is ServiceType => t in CATALOG);
    const types = only?.length ? only : TYPES;
    const board = galleryBoard(types);
    const render = () =>
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
    render();
    const ready = Promise.all(types.map((t) => modelLibrary.load(t)));
    (window as unknown as { __gallery: unknown }).__gallery = { renderer, ready, types };
    return () => renderer.dispose();
  }, []);
  return <div ref={host} className="fixed inset-0 bg-ink-950" />;
}
