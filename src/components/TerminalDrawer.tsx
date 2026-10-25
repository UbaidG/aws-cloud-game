import React from 'react';
import { Terminal, X, Trash2 } from 'lucide-react';

export interface DiagnosticLog {
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  message: string;
}

interface TerminalDrawerProps {
  isOpen: boolean;
  logs: DiagnosticLog[];
  onClose: () => void;
  onClear: () => void;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({
  isOpen,
  logs,
  onClose,
  onClear,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-2 bottom-28 sm:inset-x-auto sm:bottom-20 sm:left-4 z-30 sm:w-full sm:max-w-lg bg-[#151B23] border border-[#263040] rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-150">
      <div className="px-4 py-2.5 bg-[#1C2430] border-b border-[#263040] flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F8FAFC]">
          <Terminal className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Traffic Diagnostic Log</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClear}
            className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] rounded transition-colors cursor-pointer"
            title="Clear Logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] rounded transition-colors cursor-pointer"
            title="Close Log Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3.5 max-h-56 overflow-y-auto space-y-1.5 font-mono text-[11px] bg-[#0F141A]">
        {logs.length === 0 ? (
          <div className="text-[#64748B] py-4 text-center font-sans text-xs">
            Click &ldquo;Run Traffic Test&rdquo; to trace packets across your architecture.
          </div>
        ) : (
          logs.map((log, idx) => {
            const colorClass =
              log.level === 'SUCCESS'
                ? 'text-[#10B981]'
                : log.level === 'ERROR'
                ? 'text-[#EF4444]'
                : log.level === 'WARN'
                ? 'text-[#F59E0B]'
                : 'text-[#CBD5E1]';
            return (
              <div key={idx} className="leading-relaxed">
                <span className="text-[#64748B] mr-2">[{log.timestamp}]</span>
                <span className={`font-semibold mr-1.5 ${colorClass}`}>
                  {log.level}:
                </span>
                <span className={colorClass}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
