import React from 'react';
import {
  MousePointer,
  Cable,
  Trash2,
  Play,
  RotateCcw,
  FileCode2,
  Terminal,
  ArrowDown,
} from 'lucide-react';
import { AWSComponentType, CoachStep } from '../game/types';
import { COMPONENT_METAS } from '../game/levels';
import { AwsServiceIcon } from './AwsServiceIcon';

export type ToolMode = 'select' | 'cable' | 'delete' | 'place';

interface BottomDockProps {
  toolMode: ToolMode;
  selectedPaletteType: AWSComponentType | null;
  allowedPalette: AWSComponentType[];
  isSimulating: boolean;
  terminalOpen: boolean;
  unreadErrors: number;
  activeCoachStep?: CoachStep | null;
  showIacButton: boolean;
  onSelectTool: (mode: ToolMode, type?: AWSComponentType) => void;
  onSimulate: () => void;
  onReset: () => void;
  onOpenIac: () => void;
  onToggleTerminal: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  toolMode,
  selectedPaletteType,
  allowedPalette,
  isSimulating,
  terminalOpen,
  unreadErrors,
  activeCoachStep,
  showIacButton,
  onSelectTool,
  onSimulate,
  onReset,
  onOpenIac,
  onToggleTerminal,
}) => {
  const isTargetHighlighted = (targetKey: string) => {
    return activeCoachStep?.targetButton === targetKey;
  };

  return (
    <div className="fixed bottom-2 inset-x-2 sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 z-30 flex flex-col items-center gap-1.5 sm:max-w-[96vw] pb-[env(safe-area-inset-bottom)] pointer-events-none">
      {/* Active Step-by-Step Coach Callout Banner */}
      {activeCoachStep && (
        <div className="pointer-events-auto bg-[#151B23] border border-[#F59E0B] px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-[11px] sm:text-xs text-[#F8FAFC] shadow-lg flex items-center gap-2 max-w-xl w-full sm:w-auto">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B] shrink-0" />
          <span className="font-medium leading-snug">{activeCoachStep.text}</span>
        </div>
      )}

      {/* Contextual Tool Status Banner */}
      {toolMode === 'cable' && !activeCoachStep && (
        <div className="pointer-events-auto bg-[#151B23] border border-[#38BDF8]/50 px-3 py-1.5 rounded-md text-[11px] sm:text-xs text-[#E2E8F0] shadow-md flex items-center gap-2">
          <Cable className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
          <span>Wire Mode · Tap source block first, then destination block</span>
        </div>
      )}

      {toolMode === 'place' && selectedPaletteType && (
        <div className="pointer-events-auto bg-[#151B23] border border-[#10B981]/50 px-3 py-1.5 rounded-md text-[11px] sm:text-xs text-[#E2E8F0] shadow-md flex items-center gap-2 max-w-full">
          <AwsServiceIcon type={selectedPaletteType} size={18} />
          <span className="text-[#10B981] font-semibold shrink-0">
            Placing {COMPONENT_METAS[selectedPaletteType]?.shortLabel || selectedPaletteType}:
          </span>
          <span className="text-[#94A3B8] truncate">
            Tap any tile on the 3D board to deploy
          </span>
        </div>
      )}

      {/* Main Dock Container - Responsive 2-row on Mobile, 1-row on Desktop */}
      <div className="pointer-events-auto bg-[#151B23] border border-[#263040] rounded-lg p-1.5 shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 w-full sm:w-auto">
        {/* Top Row on Mobile / Center Section on Desktop: Component Palette + Primary Test CTA on Mobile */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 order-1 sm:order-2">
          {allowedPalette.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 pr-1 sm:border-r sm:border-[#263040] sm:pr-2">
              {allowedPalette.map((type) => {
                const meta = COMPONENT_METAS[type];
                if (!meta) return null;
                const isSelected = toolMode === 'place' && selectedPaletteType === type;
                const isCoachTarget =
                  isTargetHighlighted(`palette-${type}`) ||
                  (activeCoachStep?.targetButton === 'palette-ec2' && type === 'ec2');

                return (
                  <button
                    key={type}
                    onClick={() => onSelectTool('place', type)}
                    className={`relative flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-md text-xs transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#1E2631] text-[#F8FAFC] border border-[#10B981]'
                        : isCoachTarget
                        ? 'bg-[#F59E0B]/15 text-[#F8FAFC] border border-[#F59E0B]'
                        : 'bg-[#0F141A] text-[#CBD5E1] hover:text-[#F8FAFC] hover:bg-[#1E2631] border border-[#263040]'
                    }`}
                    title={`${meta.name}: ${meta.plainEnglishTip}`}
                  >
                    {isCoachTarget && (
                      <ArrowDown className="w-3.5 h-3.5 text-[#F59E0B] animate-bounce shrink-0" />
                    )}
                    <AwsServiceIcon type={type} size={24} />
                    <div className="text-left">
                      <div className="font-semibold leading-none text-[#F8FAFC] whitespace-nowrap">
                        + {meta.shortLabel}
                      </div>
                      <div className="hidden sm:block text-[10px] text-[#94A3B8] mt-0.5">
                        {meta.category}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-2.5 py-1.5 text-[11px] sm:text-xs text-[#94A3B8] sm:border-r sm:border-[#263040] truncate">
              Board ready · Inspect or test traffic
            </div>
          )}

          {/* Mobile-only Primary Run Traffic Test Button (Right side of Row 1 for instant thumb access) */}
          <button
            onClick={onSimulate}
            disabled={isSimulating}
            className={`sm:hidden flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
              isSimulating
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                : isTargetHighlighted('run-test')
                ? 'bg-[#F59E0B] text-[#0F141A] ring-2 ring-[#F59E0B]/50'
                : 'bg-[#10B981] text-[#0F141A]'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>{isSimulating ? 'Testing...' : 'Test Traffic'}</span>
          </button>
        </div>

        {/* Bottom Row on Mobile / Left+Right Sections on Desktop: Core Tools & Utilities */}
        <div className="flex items-center justify-between sm:justify-start gap-1 border-t border-[#263040] pt-1.5 sm:border-t-0 sm:pt-0 order-2 sm:order-1">
          <div className="flex items-center gap-1 sm:pr-2 sm:border-r sm:border-[#263040]">
            <button
              onClick={() => onSelectTool('select')}
              className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                toolMode === 'select'
                  ? 'bg-[#263040] text-[#F8FAFC] border border-[#38BDF8]/50'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2631] border border-transparent'
              }`}
              title="Select & Inspect Component"
            >
              <MousePointer className="w-3.5 h-3.5 shrink-0" />
              <span>Inspect</span>
            </button>

            <button
              onClick={() => onSelectTool('cable')}
              className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                toolMode === 'cable'
                  ? 'bg-[#263040] text-[#38BDF8] border border-[#38BDF8]'
                  : isTargetHighlighted('tool-cable')
                  ? 'bg-[#F59E0B]/15 text-[#F8FAFC] border border-[#F59E0B]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E2631] border border-transparent'
              }`}
              title="Connect Network Wire between two blocks"
            >
              {isTargetHighlighted('tool-cable') && (
                <ArrowDown className="w-3.5 h-3.5 text-[#F59E0B] animate-bounce shrink-0" />
              )}
              <Cable className="w-3.5 h-3.5 shrink-0" />
              <span>Wire</span>
            </button>

            <button
              onClick={() => onSelectTool('delete')}
              className={`flex items-center gap-1.5 px-2.5 py-2 sm:px-3 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                toolMode === 'delete'
                  ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]'
                  : isTargetHighlighted('tool-delete')
                  ? 'bg-[#F59E0B]/15 text-[#F8FAFC] border border-[#F59E0B]'
                  : 'text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#1E2631] border border-transparent'
              }`}
              title="Remove Component from Board"
            >
              {isTargetHighlighted('tool-delete') && (
                <ArrowDown className="w-3.5 h-3.5 text-[#F59E0B] animate-bounce shrink-0" />
              )}
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Delete</span>
            </button>
          </div>

          {/* Mobile Secondary Actions (Terraform, Logs, Reset) */}
          <div className="flex sm:hidden items-center gap-1">
            {showIacButton && (
              <button
                onClick={onOpenIac}
                className="p-2 rounded-md bg-[#0F141A] text-[#38BDF8] border border-[#263040] text-xs cursor-pointer"
                title="View Terraform Blueprint"
              >
                <FileCode2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onToggleTerminal}
              className={`relative flex items-center gap-1 px-2.5 py-2 rounded-md border text-xs font-medium cursor-pointer ${
                terminalOpen
                  ? 'bg-[#1E2631] text-[#F8FAFC] border-[#38BDF8]/50'
                  : 'bg-[#0F141A] text-[#CBD5E1] border-[#263040]'
              }`}
              title="Toggle Diagnostic Log"
            >
              <Terminal className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>Logs</span>
              {unreadErrors > 0 && (
                <span className="px-1 bg-[#EF4444] text-[#F8FAFC] rounded text-[10px] font-mono font-bold">
                  {unreadErrors}
                </span>
              )}
            </button>

            <button
              onClick={onReset}
              className="p-2 rounded-md bg-[#0F141A] text-[#94A3B8] border border-[#263040] cursor-pointer"
              title="Reset Level Board"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Desktop Simulation & Diagnostic Actions (order-3 on desktop) */}
        <div className="hidden sm:flex items-center gap-1.5 pl-1 order-3">
          <button
            onClick={onSimulate}
            disabled={isSimulating}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              isSimulating
                ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 cursor-wait'
                : isTargetHighlighted('run-test')
                ? 'bg-[#F59E0B] hover:bg-[#D97706] text-[#0F141A] ring-2 ring-[#F59E0B]/50'
                : 'bg-[#10B981] hover:bg-[#059669] text-[#0F141A]'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulating ? 'Testing Traffic...' : 'Run Traffic Test'}</span>
          </button>

          {showIacButton && (
            <button
              onClick={onOpenIac}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0F141A] hover:bg-[#1E2631] text-[#CBD5E1] hover:text-[#F8FAFC] border border-[#263040] text-xs font-medium transition-colors cursor-pointer"
              title="View Plain-English & Terraform Infrastructure Code"
            >
              <FileCode2 className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="hidden md:inline">Terraform Code</span>
            </button>
          )}

          <button
            onClick={onToggleTerminal}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              terminalOpen
                ? 'bg-[#1E2631] text-[#F8FAFC] border-[#38BDF8]/50'
                : 'bg-[#0F141A] hover:bg-[#1E2631] text-[#CBD5E1] hover:text-[#F8FAFC] border-[#263040]'
            }`}
            title="Toggle Traffic Diagnostic Log"
          >
            <Terminal className="w-3.5 h-3.5 text-[#94A3B8]" />
            <span className="hidden md:inline">Logs</span>
            {unreadErrors > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-[#EF4444] text-[#F8FAFC] rounded text-[10px] font-mono tabular-nums font-bold">
                {unreadErrors}
              </span>
            )}
          </button>

          <button
            onClick={onReset}
            className="p-2 rounded-md bg-[#0F141A] hover:bg-[#1E2631] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263040] transition-colors cursor-pointer"
            title="Reset Level Board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
