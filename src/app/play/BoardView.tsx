import { useEffect, useMemo, useRef, useState } from 'react';
import { BoardRenderer, type SceneState } from '../../render';
import { useGame } from '../store/GameProvider';
import { coachBlockId, failureFocus, isReportCurrent, openTargets } from '../lib/boardOverlays';
import { sound } from '../audio';
import { useCoach } from '../hooks/useCoach';

const EMPTY: string[] = [];

/** Hosts the 3D board. Pushes store state into the renderer and turns taps into store actions. */
export function BoardView({ onRenderer }: { onRenderer?: (r: BoardRenderer | null) => void }) {
  const { state, dispatch, level, live } = useGame();
  const host = useRef<HTMLDivElement>(null);
  const [renderer, setRenderer] = useState<BoardRenderer | null>(null);
  const { session, report, running } = state;

  // Create the renderer once; dispose everything on unmount.
  useEffect(() => {
    if (!host.current) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const quality = state.save.settings.quality === 'auto' ? null : state.save.settings.quality;
    const r = new BoardRenderer(host.current, { onTap: (hit) => dispatch({ type: 'tap', hit }) }, { quality, reducedMotion });
    setRenderer(r);
    onRenderer?.(r);
    if (import.meta.env.DEV) (window as unknown as { __board?: BoardRenderer }).__board = r;
    return () => {
      onRenderer?.(null);
      r.dispose();
      setRenderer(null);
    };
    // The quality tier is fixed for a renderer's lifetime; changing it remounts this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A new level snaps into place instead of every block dropping in.
  const levelKey = session ? `${session.levelId}` : '';
  const introPending = useRef(false);
  useEffect(() => {
    renderer?.beginLevel();
    introPending.current = true;
  }, [renderer, levelKey]);

  // While a cutscene owns the board, the session isn't drawn; when it ends, the level snaps back.
  const inCutscene = state.overlay === 'cutscene';
  const wasCutscene = useRef(false);
  useEffect(() => {
    if (wasCutscene.current && !inCutscene) renderer?.beginLevel();
    wasCutscene.current = inCutscene;
  }, [renderer, inCutscene]);

  // The camera flies in once the board is uncovered (after the story and briefing, or straight away).
  const covered = state.overlay === 'briefing' || inCutscene;
  useEffect(() => {
    if (!renderer || covered || !introPending.current) return;
    introPending.current = false;
    renderer.playIntro();
  }, [renderer, levelKey, covered]);

  const coach = useCoach();

  const focus = useMemo(() => (!running && isReportCurrent(report, session) ? failureFocus(report) : null), [running, report, session]);
  const coachBlock = coachBlockId(coach);
  const highlightIds = useMemo(() => {
    const ids = [...(focus?.highlightIds ?? EMPTY)];
    if (coachBlock) ids.push(coachBlock);
    return ids.length ? ids : EMPTY;
  }, [focus, coachBlock]);

  const targets = useMemo(() => (level && session ? openTargets(level, session) : []), [level, session]);

  useEffect(() => {
    if (!renderer || !session || inCutscene) return;
    const scene: SceneState = {
      board: session.board,
      analysis: live?.analysis ?? null,
      tool: state.movingId ? 'place' : state.tool,
      placingType: state.movingId ? (session.board.blocks.find((b) => b.id === state.movingId)?.type ?? null) : state.placingType,
      selectedId: state.selectedId ?? state.movingId,
      wireSourceId: state.wireSourceId,
      targets,
      highlightIds,
      callouts: focus?.callouts ?? [],
    };
    renderer.setScene(scene);
  }, [renderer, session, live, state.tool, state.placingType, state.selectedId, state.wireSourceId, state.movingId, targets, highlightIds, focus, inCutscene]);

  // Play the test: animate the engine's trace, then hand the result back to the store.
  useEffect(() => {
    if (!renderer || !running || !report) return;
    let cancelled = false;
    let drops = 0;
    renderer
      .playTraffic(report.analysis.trace, () => {
        if (drops++ < 3) sound.packetDrop();
      })
      .then(() => {
        if (!cancelled) dispatch({ type: 'runFinish' });
      });
    return () => {
      cancelled = true;
      renderer.stopTraffic();
    };
  }, [renderer, running, report, dispatch]);

  // Celebrate a completed level; flash blocks the engine refused to touch.
  useEffect(() => {
    if (!renderer || !state.fx) return;
    if (state.fx.cue === 'victory') renderer.celebrate();
    if (state.fx.cue === 'deny' && state.fx.blockId) renderer.flashBlock(state.fx.blockId);
  }, [renderer, state.fx]);

  return <div ref={host} className="absolute inset-0" data-coach-target="grid" />;
}
