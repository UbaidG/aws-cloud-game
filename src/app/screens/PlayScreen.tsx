import { useState } from 'react';
import type { BoardRenderer } from '../../render';
import { useGame } from '../store/GameProvider';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BoardView } from '../play/BoardView';
import { ContextPanel } from '../play/ContextPanel';
import { MissionPanel } from '../play/MissionPanel';
import { ModeBanner } from '../play/ModeBanner';
import { RendererContext } from '../play/RendererContext';
import { TelemetryHud } from '../play/TelemetryHud';
import { Toolbelt } from '../play/Toolbelt';
import { TopBar } from '../play/TopBar';
import { Briefing } from '../overlays/Briefing';
import { Cutscene } from '../overlays/Cutscene';
import { Debrief } from '../overlays/Debrief';
import { HelpModal } from '../overlays/HelpModal';
import { IacModal } from '../overlays/IacModal';
import { MenuModal } from '../overlays/MenuModal';

/**
 * Wide: Mission column | board with HUD, context panel on the right, toolbelt at the bottom.
 * Narrow: board fills the screen; mission and details become bottom sheets above the toolbelt.
 */
export function PlayScreen() {
  const { state } = useGame();
  const wide = useMediaQuery('(min-width: 1024px)');
  const [renderer, setRenderer] = useState<BoardRenderer | null>(null);
  const hasDetails = !!(state.selectedId || state.selectedWireId);
  // The story gets the whole screen; the game UI comes back with the mission card.
  const story = state.overlay === 'cutscene';

  return (
    <RendererContext.Provider value={renderer}>
      <div className="h-dvh flex flex-col bg-ink-950">
        {!story && <TopBar />}
        <div className="flex flex-1 min-h-0">
          {wide && !story && <MissionPanel variant="column" />}
          <main className="relative flex-1 min-w-0 overflow-hidden">
            <BoardView key={state.save.settings.quality} onRenderer={setRenderer} />
            <div className={`pointer-events-none absolute inset-0 flex flex-col gap-2 p-2 sm:p-3 ${story ? 'invisible' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <ModeBanner />
                <div className="w-full sm:w-auto sm:ml-auto">
                  <TelemetryHud />
                </div>
              </div>
              <div className="flex-1 min-h-0 flex justify-end">{wide && <ContextPanel variant="side" />}</div>
              <div className="flex flex-col items-stretch gap-2 sm:items-center">
                {!wide && (hasDetails ? <ContextPanel variant="sheet" /> : <MissionPanel variant="sheet" />)}
                {!wide && !hasDetails && <ContextPanel variant="sheet" />}
                <Toolbelt />
              </div>
            </div>
          </main>
        </div>
      </div>
      <Cutscene />
      <Briefing />
      <Debrief />
      <MenuModal />
      <IacModal />
      <HelpModal />
    </RendererContext.Provider>
  );
}
