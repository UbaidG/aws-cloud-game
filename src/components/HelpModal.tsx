import React from 'react';
import { X, MousePointer, Cable, Play, Shield, Compass } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117]/80 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#151B23] border border-[#263040] rounded-lg max-w-xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-[#1C2430] border-b border-[#263040] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#F59E0B]" />
            <h2 className="text-sm font-bold text-[#F8FAFC]">
              How to Play CloudCraft
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#263040] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 text-xs text-[#CBD5E1] overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-md bg-[#0F141A] border border-[#263040]">
              <div className="flex items-center gap-2 font-semibold text-[#F8FAFC] mb-1">
                <MousePointer className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>1. Place &amp; Inspect Hardware</span>
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                Pick an AWS block from the bottom dock and tap a tile on the 3D board. In Levels 1–10, glowing green rings show you the exact recommended spot.
              </p>
            </div>

            <div className="p-3.5 rounded-md bg-[#0F141A] border border-[#263040]">
              <div className="flex items-center gap-2 font-semibold text-[#F8FAFC] mb-1">
                <Cable className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>2. Connect Network Wires</span>
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                Select the <strong>Wire</strong> tool, tap the starting block (like User Traffic), then tap the destination block to plug in a network cable.
              </p>
            </div>

            <div className="p-3.5 rounded-md bg-[#0F141A] border border-[#263040]">
              <div className="flex items-center gap-2 font-semibold text-[#F8FAFC] mb-1">
                <Shield className="w-3.5 h-3.5 text-[#10B981]" />
                <span>3. Open Firewall Ports</span>
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                Tap any server on the board to open the Inspector. Tap <strong>+ Allow Inbound Port 80 (HTTP)</strong> so traffic isn&apos;t blocked.
              </p>
            </div>

            <div className="p-3.5 rounded-md bg-[#0F141A] border border-[#263040]">
              <div className="flex items-center gap-2 font-semibold text-[#F8FAFC] mb-1">
                <Play className="w-3.5 h-3.5 text-[#10B981]" />
                <span>4. Run Traffic Test</span>
              </div>
              <p className="text-[#94A3B8] leading-relaxed">
                Tap <strong>Test Traffic</strong> to send live packets down your wires and verify all mission objectives pass.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-md bg-[#0F141A] border border-[#263040] space-y-1 text-[11px] text-[#94A3B8]">
            <div>
              <strong className="text-[#F8FAFC]">Mobile Touch Controls:</strong> 1-finger drag to rotate · 2-finger pinch to zoom · 2-finger drag to pan board · Tap block to inspect
            </div>
            <div>
              <strong className="text-[#F8FAFC]">Desktop Controls:</strong> Left-drag to rotate · Scroll to zoom · WASD / Arrow keys to pan board
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#0F141A] border-t border-[#263040] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-[#0F141A] font-semibold text-xs transition-colors cursor-pointer"
          >
            Back to Board
          </button>
        </div>
      </div>
    </div>
  );
};
