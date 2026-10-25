import React from 'react';
import { CheckCircle2, ArrowRight, RotateCcw, BookOpen } from 'lucide-react';
import { LevelDefinition } from '../game/types';

interface VictoryModalProps {
  isOpen: boolean;
  level: LevelDefinition;
  stars: number;
  onNextLevel: () => void;
  onReplay: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  level,
  stars,
  onNextLevel,
  onReplay,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117]/80 flex items-center justify-center p-4">
      <div className="bg-[#151B23] border border-[#263040] rounded-lg max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-[#1C2430] border-b border-[#263040] flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-[#10B981] flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                MODULE {level.chapterId} · LEVEL {level.id} OF 130 COMPLETE
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#F8FAFC] tracking-tight">
              {level.title}
            </h2>
          </div>
          <div className="text-right font-mono">
            <div className="text-2xl font-bold text-[#F59E0B]">
              {'★'.repeat(stars)}
              <span className="text-[#263040]">{'★'.repeat(3 - stars)}</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] tabular-nums">
              {stars} / 3 Stars
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Concepts Mastered */}
          <div className="p-3.5 rounded-md bg-[#0F141A] border border-[#263040]">
            <div className="text-[11px] text-[#94A3B8] mb-1">
              {level.chapterTitle} — Concepts Applied
            </div>
            <div className="text-xs font-semibold text-[#F8FAFC]">
              {level.concepts.join(' · ')}
            </div>
          </div>

          {/* What You Learned Summary */}
          <div className="p-4 rounded-md bg-[#0F141A] border border-[#263040] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F59E0B]">
              <BookOpen className="w-4 h-4" />
              <span>Architecture Takeaway</span>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              {level.conceptCard
                ? level.conceptCard.keyTakeaway
                : level.docTips[0] || level.tagline}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#0F141A] border-t border-[#263040] flex items-center justify-between">
          <button
            onClick={onReplay}
            className="px-4 py-2 rounded-md bg-[#151B23] hover:bg-[#1E2631] text-[#CBD5E1] border border-[#263040] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Stay on Board</span>
          </button>

          {level.id < 130 && (
            <button
              onClick={onNextLevel}
              className="px-5 py-2.5 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-[#0F141A] font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Next Mission (Level {level.id + 1})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
