import { Check, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useGame } from '../store/GameProvider';
import { buildTerraform } from '../lib/terraform';
import { Modal } from '../ui/Modal';

/** Your board as Terraform, plus the level's reference snippet when it has one. */
export function IacModal() {
  const { state, dispatch, level } = useGame();
  const [tab, setTab] = useState<'board' | 'reference'>('board');
  const [copied, setCopied] = useState(false);
  const open = state.overlay === 'iac';
  const code = useMemo(() => (open && level && state.session ? buildTerraform(state.session.board, level.title) : ''), [open, level, state.session]);
  if (!level) return null;
  const shown = tab === 'board' ? code : (level.iacSnippet ?? '');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked; the code is still selectable.
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => dispatch({ type: 'overlay', overlay: null })}
      eyebrow="Infrastructure as code"
      title="main.tf"
      width="max-w-3xl"
      footer={
        <button className="btn" onClick={copy}>
          {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />} {copied ? 'Copied' : 'Copy'}
        </button>
      }
    >
      <p className="text-[12.5px] text-muted mb-3">
        Engineers don't click servers into existence; they describe them in files like this and let Terraform build them. Every block on your board becomes
        real AWS resources below.
      </p>
      {level.iacSnippet && (
        <div className="flex gap-1 mb-2" role="tablist">
          {(['board', 'reference'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`btn !py-1 !text-[11.5px] ${tab === t ? '!border-signal/60 text-signal' : 'btn-ghost'}`} onClick={() => setTab(t)}>
              {t === 'board' ? 'Your board' : 'Reference snippet'}
            </button>
          ))}
        </div>
      )}
      <pre className="font-mono text-[11.5px] leading-relaxed bg-void/70 border border-line rounded-lg p-3 overflow-auto max-h-[55dvh] whitespace-pre">{shown}</pre>
    </Modal>
  );
}
