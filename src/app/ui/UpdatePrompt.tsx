import { RefreshCw } from 'lucide-react';
import { useUpdateAvailable } from '../pwa';
import { flushSave, useGame } from '../store/GameProvider';

/** A new version is ready. The board is saved before reloading so nothing is lost. */
export function UpdatePrompt() {
  const { available, apply, dismiss } = useUpdateAvailable();
  const { state } = useGame();
  if (!available) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 panel px-4 py-3 flex items-center gap-3 animate-rise" role="status">
      <RefreshCw className="size-4 text-signal" />
      <span className="text-[13px]">A new version of CloudCraft is ready.</span>
      <button
        className="btn btn-primary !py-1"
        onClick={() => {
          flushSave(state);
          apply();
        }}
        disabled={state.running}
      >
        Update
      </button>
      <button className="btn btn-ghost !py-1" onClick={dismiss}>
        Later
      </button>
    </div>
  );
}
