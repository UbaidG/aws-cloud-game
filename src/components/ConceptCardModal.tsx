import React from 'react';
import { BookOpen, Lightbulb, CheckCircle2, X } from 'lucide-react';
import { ConceptCard } from '../game/types';

interface ConceptCardModalProps {
  card: ConceptCard;
  levelNumber: number;
  onClose: () => void;
}

export const ConceptCardModal: React.FC<ConceptCardModalProps> = ({
  card,
  levelNumber,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117]/80 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#151B23] border border-[#263040] rounded-lg max-w-lg w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-[#1C2430] border-b border-[#263040] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#F59E0B] shrink-0" />
            <span className="text-xs font-medium text-[#94A3B8] truncate">
              Level {levelNumber} Concept Guide · Cloud Basics
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#263040] transition-colors"
            title="Close Concept Card"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          <div>
            <h2 className="text-xl font-bold text-[#F8FAFC] tracking-tight mb-2">
              {card.title}
            </h2>
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              {card.summary}
            </p>
          </div>

          {/* Everyday Analogy Box */}
          <div className="p-4 rounded-md bg-[#0F141A] border border-[#263040]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F59E0B] mb-1.5">
              <Lightbulb className="w-4 h-4 shrink-0" />
              <span>Real-World Analogy</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              {card.analogy}
            </p>
          </div>

          {/* Key Takeaway */}
          <div className="p-3.5 rounded-md bg-[#10B981]/10 border border-[#10B981]/30 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-semibold text-[#10B981] uppercase tracking-wider mb-0.5">
                Key Takeaway
              </div>
              <p className="text-xs text-[#E2E8F0] leading-relaxed">
                {card.keyTakeaway}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0F141A] border-t border-[#263040] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-[#0F141A] font-semibold text-xs transition-colors cursor-pointer"
          >
            Got It, Let&apos;s Build
          </button>
        </div>
      </div>
    </div>
  );
};
