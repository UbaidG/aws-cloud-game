import { useGame } from '../store/GameProvider';
import { Modal } from '../ui/Modal';

const KEYS: [string, string][] = [
  ['Space', 'Run traffic'],
  ['Esc', 'Cancel / close'],
  ['V', 'Select tool'],
  ['C', 'Wire tool'],
  ['X', 'Delete tool'],
  ['Delete', 'Delete the selected block'],
  ['W A S D / arrows', 'Orbit and zoom the camera'],
];

export function HelpModal() {
  const { state, dispatch } = useGame();
  return (
    <Modal open={state.overlay === 'help'} onClose={() => dispatch({ type: 'overlay', overlay: null })} eyebrow="Field manual" title="How to play">
      <div className="flex flex-col gap-4 text-[13px] leading-relaxed">
        <ol className="flex flex-col gap-2 list-decimal pl-5">
          <li>
            <b>Read the mission.</b> The left column tells you what's wrong and what "done" looks like.
          </li>
          <li>
            <b>Build.</b> Pick a part from the toolbelt and tap a tile. Green tiles are legal for that part.
          </li>
          <li>
            <b>Wire.</b> Choose the Wire tool, tap one block, then another. Requests flow from the internet (left) toward your data (right).
          </li>
          <li>
            <b>Configure.</b> Tap a block to open its settings and firewall.
          </li>
          <li>
            <b>Run traffic.</b> Packets follow your wires. Where one stops, a callout explains why.
          </li>
        </ol>
        <div>
          <div className="eyebrow mb-1.5">The board</div>
          <p className="text-muted">
            Left to right: the <b className="text-zone-internet">Internet</b>, the <b className="text-zone-edge">Edge</b> (DNS, CDN, firewalls), the{' '}
            <b className="text-zone-public">Public subnet</b> (things the internet may reach) and the <b className="text-zone-private">Private subnet</b> (things
            it must not). The back half of the VPC is Availability Zone A, the front half is Zone B.
          </p>
        </div>
        <div>
          <div className="eyebrow mb-1.5">Stars</div>
          <p className="text-muted">★ Complete the mission · ★ Stay under budget · ★ Clean run: no hints and at most one failed test.</p>
        </div>
        <div>
          <div className="eyebrow mb-1.5">Mouse & touch</div>
          <p className="text-muted">Drag to orbit, right-drag (or two fingers) to pan, scroll or pinch to zoom.</p>
        </div>
        <div>
          <div className="eyebrow mb-1.5">Keyboard</div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {KEYS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt>
                  <span className="kbd">{k}</span>
                </dt>
                <dd className="text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Modal>
  );
}
