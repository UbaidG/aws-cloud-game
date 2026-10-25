import { Cable, MousePointer2, Play, Trash2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { CATALOG, blockCost, paletteFor, type ToolMode } from '../../engine';
import { useGame } from '../store/GameProvider';
import { AwsServiceIcon } from '../ServiceIcon';
import { coachTarget, useCoach } from '../hooks/useCoach';

const TOOLS: { tool: ToolMode; label: string; key: string; icon: typeof MousePointer2; coach: string }[] = [
  { tool: 'select', label: 'Select', key: 'V', icon: MousePointer2, coach: 'tool-select' },
  { tool: 'wire', label: 'Wire', key: 'C', icon: Cable, coach: 'tool-wire' },
  { tool: 'delete', label: 'Delete', key: 'X', icon: Trash2, coach: 'tool-delete' },
];

/** The bottom toolbelt: tools, the parts palette for this stage, and the big Run Traffic button. */
export function Toolbelt() {
  const { state, dispatch, level } = useGame();
  const coach = useCoach();
  if (!level || !state.session) return null;
  const palette = paletteFor(level, state.session);
  const { running } = state;

  return (
    <div className="pointer-events-auto panel flex items-stretch gap-2 p-2 max-w-full">
      <div className="flex gap-1 shrink-0" role="toolbar" aria-label="Tools">
        {TOOLS.map(({ tool, label, key, icon: Icon, coach: id }) => {
          const active = state.tool === tool && !state.placingType;
          return (
            <button
              key={tool}
              {...coachTarget(coach, id)}
              className={`btn flex-col !gap-0.5 !px-2.5 !py-1.5 min-w-14 ${active ? '!bg-signal/15 !border-signal/70 text-signal' : ''}`}
              aria-pressed={active}
              disabled={running}
              onClick={() => dispatch({ type: 'setTool', tool })}
              title={`${label} (${key})`}
            >
              <Icon className="size-4" />
              <span className="text-[10px]">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-px bg-line shrink-0" />

      <div className="flex gap-1 overflow-x-auto scroll-thin min-w-0 flex-1" role="toolbar" aria-label="Parts">
        {palette.map((type) => {
          const spec = CATALOG[type];
          const active = state.placingType === type;
          return (
            <button
              key={type}
              {...coachTarget(coach, `palette-${type}`)}
              className={`btn flex-col !gap-0.5 !px-2 !py-1.5 min-w-[68px] shrink-0 ${active ? '!bg-gold/15 !border-gold/70' : ''}`}
              aria-pressed={active}
              disabled={running}
              onClick={() => dispatch({ type: 'pickService', service: type })}
              title={`${spec.name}: ${spec.description}`}
            >
              <AwsServiceIcon type={type} size={22} />
              <span className="text-[10px] leading-tight truncate max-w-[64px]">{spec.shortLabel}</span>
              <span className="text-[9px] font-mono text-muted">${blockCost(type, spec.defaultConfig)}/mo</span>
            </button>
          );
        })}
      </div>

      <motion.button
        {...coachTarget(coach, 'run-test')}
        whileTap={{ scale: 0.95 }}
        className="btn btn-gold display !text-sm !px-4 shrink-0 min-w-28"
        disabled={running}
        onClick={() => dispatch({ type: 'runStart' })}
        title="Run traffic (Space)"
      >
        {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 fill-current" />}
        <span className="flex flex-col items-start leading-none">
          <span>{running ? 'Running…' : 'Run Traffic'}</span>
          {!running && <span className="text-[9px] font-mono opacity-70 mt-0.5">SPACE</span>}
        </span>
      </motion.button>
    </div>
  );
}
