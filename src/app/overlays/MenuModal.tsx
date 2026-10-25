import { Download, FileCode2, HelpCircle, Map as MapIcon, Play, RotateCcw } from 'lucide-react';
import type { SaveSettings } from '../../engine';
import { usePWAInstall } from '../pwa';
import { useGame } from '../store/GameProvider';
import { Modal } from '../ui/Modal';

const QUALITY: { value: SaveSettings['quality']; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function MenuModal() {
  const { state, dispatch } = useGame();
  const { canInstall, install } = usePWAInstall();
  const close = () => dispatch({ type: 'overlay', overlay: null });
  const settings = state.save.settings;
  const item = 'btn justify-start w-full !py-2.5';
  return (
    <Modal open={state.overlay === 'menu'} onClose={close} eyebrow="Paused" title="Menu" width="max-w-sm">
      <div className="flex flex-col gap-1.5">
        <button className={`${item} btn-primary`} onClick={close} data-autofocus>
          <Play className="size-4" /> Resume
        </button>
        <button className={item} onClick={() => dispatch({ type: 'overlay', overlay: 'iac' })}>
          <FileCode2 className="size-4" /> View as Terraform
        </button>
        <button className={item} onClick={() => dispatch({ type: 'overlay', overlay: 'help' })}>
          <HelpCircle className="size-4" /> How to play
        </button>
        <button className={item} onClick={() => dispatch({ type: 'restartLevel' })}>
          <RotateCcw className="size-4" /> Restart mission
        </button>
        <button className={item} onClick={() => dispatch({ type: 'go', screen: 'map' })}>
          <MapIcon className="size-4" /> Mission map
        </button>
        {canInstall && (
          <button className={item} onClick={() => void install()}>
            <Download className="size-4" /> Install app
          </button>
        )}

        <div className="mt-3 pt-3 border-t border-line flex flex-col gap-3">
          <label className="flex items-center justify-between text-[13px]">
            <span>Sound</span>
            <input type="checkbox" className="size-4 accent-signal" checked={!settings.muted} onChange={(e) => dispatch({ type: 'settings', patch: { muted: !e.target.checked } })} />
          </label>
          <label className="flex items-center justify-between gap-3 text-[13px]">
            <span>Graphics</span>
            <select className="field !w-32" value={settings.quality} onChange={(e) => dispatch({ type: 'settings', patch: { quality: e.target.value as SaveSettings['quality'] } })}>
              {QUALITY.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </Modal>
  );
}
