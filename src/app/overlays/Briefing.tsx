import { Rocket } from 'lucide-react';
import { GAME_MODES, moduleOf } from '../../content/modules';
import { useGame } from '../store/GameProvider';
import { Modal } from '../ui/Modal';

/** The mission card shown when a level starts. Phase 6 adds an animated cutscene ahead of it. */
export function Briefing() {
  const { state, dispatch, level } = useGame();
  if (!level) return null;
  const mode = GAME_MODES[level.gameMode];
  const mod = moduleOf(level.id);
  const close = () => dispatch({ type: 'overlay', overlay: null });
  return (
    <Modal
      open={state.overlay === 'briefing'}
      onClose={close}
      eyebrow={`${mod ? `Module ${mod.id}` : ''} · ${level.isAssessment ? 'Assessment' : `Mission ${level.id}`}`}
      title={level.title}
      footer={
        <button className="btn btn-gold display !px-5" onClick={close} data-autofocus>
          <Rocket className="size-4" /> Start mission
        </button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <span className="chip !text-signal !border-signal/40">{mode.label}</span>
          <span className="chip">{level.difficulty}</span>
          {level.stages.length > 1 && <span className="chip">{level.stages.length} stages</span>}
        </div>
        <p className="text-[14px] leading-relaxed">{level.briefing}</p>
        <p className="text-[12.5px] text-muted leading-relaxed">{mode.description}</p>
        {level.concepts.length > 0 && (
          <div>
            <div className="eyebrow mb-1">You'll learn</div>
            <div className="flex flex-wrap gap-1.5">
              {level.concepts.map((c) => (
                <span key={c} className="chip !text-arcane !border-arcane/40">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
