import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Play, Award, Sparkles } from 'lucide-react';
import { LevelDefinition } from '../game/types';
import { GAME_MODE_METAS } from '../game/scenarioGenerator';
import { AwsServiceIcon } from './AwsServiceIcon';

interface StoryboardModalProps {
  isOpen: boolean;
  level: LevelDefinition;
  onClose: () => void;
}

export const StoryboardModal: React.FC<StoryboardModalProps> = ({
  isOpen,
  level,
  onClose,
}) => {
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setSlideIdx(0);
    }
  }, [isOpen, level.id]);

  if (!isOpen || !level.storyboard) return null;

  const { storyboard } = level;
  const panels = storyboard.panels;
  const activePanel = panels[slideIdx] || panels[0];
  const modeMeta = GAME_MODE_METAS[level.gameMode || 'outage_repair'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/85 animate-in fade-in duration-150">
      {/* Outer Corrugated Cardboard Diorama Box */}
      <div className="w-full max-w-2xl max-h-[92dvh] bg-[#1C1917] border-4 border-[#C29B6B] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden relative">
        {/* Top Kraft Cardboard Header Strip */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-[#29231E] border-b-2 border-[#8C6D46] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-[#C29B6B] text-[#1C1917] font-extrabold uppercase tracking-wider">
                MODULE {level.chapterId} · LV {level.id}/130
              </span>
              {level.isAssessment && (
                <span className="px-2 py-0.5 rounded bg-[#F59E0B] text-[#0F141A] font-extrabold flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  GRADED BOSS ASSESSMENT
                </span>
              )}
              <span
                className="font-bold uppercase tracking-wider"
                style={{ color: modeMeta.accentColor }}
              >
                {modeMeta.shortBadge}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#FBF7F0] truncate mt-1">
              {level.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-md bg-[#3A312A] hover:bg-[#4E4239] border border-[#8C6D46] text-xs font-bold text-[#FBF7F0] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            title="Skip Storyboard & Play"
          >
            <span>Skip</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Step Slide Selector Tabs (Swipeable / Clickable) */}
        <div className="px-4 py-2 bg-[#231E1A] border-b border-[#57442E] grid grid-cols-3 gap-2">
          {['1. Real-World Story', '2. What Breaks', '3. Your AWS Fix'].map((tabLabel, idx) => {
            const active = idx === slideIdx;
            return (
              <button
                key={idx}
                onClick={() => setSlideIdx(idx)}
                className={`py-1.5 px-2 rounded text-[11px] font-mono font-bold transition-all cursor-pointer truncate ${
                  active
                    ? 'bg-[#E7C9A0] text-[#1C1917] shadow-[2px_3px_0px_#0B0908]'
                    : 'bg-[#2E2722] text-[#A89882] hover:text-[#FBF7F0]'
                }`}
              >
                {tabLabel}
              </button>
            );
          })}
        </div>

        {/* Cardboard-Cutout Diorama Stage Area (Single Slide -> Zero Horizontal Clipping!) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#181512] flex flex-col justify-between gap-4">
          {/* Paper Cutout Stage Backdrop */}
          <div className="relative bg-[#F5E6CC] text-[#1C1917] border-2 border-[#8C6D46] rounded-lg p-4 sm:p-5 shadow-[6px_6px_0px_#0B0908]">
            {/* Masking-Tape Corner Accents */}
            <div className="w-14 h-4 bg-[#E5D3B3]/90 border border-[#B89F78] -rotate-6 absolute -top-2 left-4 shadow-sm pointer-events-none" />
            <div className="w-14 h-4 bg-[#E5D3B3]/90 border border-[#B89F78] rotate-6 absolute -top-2 right-4 shadow-sm pointer-events-none" />

            {/* Case Study Tag & Slide Title */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2 py-0.5 rounded bg-[#1C1917] text-[#F5E6CC] font-mono text-[10px] font-bold uppercase tracking-wider">
                {storyboard.realWorldCompany}
              </span>
              <span className="font-mono text-[11px] font-bold text-[#6E5638]">
                STEP {slideIdx + 1} OF 3
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-extrabold text-[#1C1917] leading-snug mb-3">
              {activePanel.title}
            </h3>

            {/* Comic Speech Bubble (Short, Simple Plain English) */}
            <div className="relative bg-[#FFFDF9] border-2 border-[#1C1917] rounded-lg px-3.5 py-2.5 mb-4 shadow-[3px_3px_0px_#1C1917]">
              <p className="text-xs sm:text-sm font-bold text-[#1C1917] leading-snug flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <span>
                  {activePanel.speechBubble || activePanel.caption}
                </span>
              </p>
            </div>

            {/* Cardboard-Cutout Puppet Props Row (Wraps cleanly, never clips!) */}
            <div className="py-4 px-3 rounded-lg bg-[#E6D2B0] border-2 border-dashed border-[#8C6D46] flex flex-wrap items-center justify-center gap-2.5 sm:gap-4">
              {activePanel.nodes.map((node, nIdx) => {
                const cardBg =
                  node.status === 'fail'
                    ? 'bg-[#FEE2E2] border-[#DC2626]'
                    : node.status === 'warn'
                    ? 'bg-[#FEF3C7] border-[#D97706]'
                    : 'bg-[#FFFDF9] border-[#1C1917]';

                const badgeBg =
                  node.status === 'fail'
                    ? 'bg-[#DC2626] text-white'
                    : node.status === 'warn'
                    ? 'bg-[#D97706] text-white'
                    : 'bg-[#10B981] text-[#0B0E14]';

                return (
                  <React.Fragment key={nIdx}>
                    {/* Paper Cutout Prop Piece */}
                    <div
                      className={`flex flex-col items-center gap-1.5 px-3.5 py-3 rounded-lg border-2 ${cardBg} shadow-[4px_4px_0px_#1C1917] min-w-[92px] sm:min-w-[110px] text-center`}
                    >
                      <div className="p-1.5 rounded-md bg-[#1C1917] shadow-inner">
                        <AwsServiceIcon type={node.type} size={38} />
                      </div>
                      <span className="text-xs font-extrabold text-[#1C1917] leading-tight">
                        {node.label}
                      </span>
                      {node.metric && (
                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[10px] font-extrabold ${badgeBg}`}
                        >
                          {node.metric}
                        </span>
                      )}
                    </div>

                    {nIdx < activePanel.nodes.length - 1 && (
                      <div className="flex flex-col items-center">
                        <ArrowRight
                          className={`w-5 h-5 shrink-0 ${
                            node.status === 'fail' ? 'text-[#DC2626]' : 'text-[#1C1917]'
                          }`}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Short 1-Line Takeaway Caption */}
            <p className="mt-3.5 text-xs sm:text-sm font-medium text-[#3D2E1E] leading-relaxed">
              {activePanel.caption}
            </p>
          </div>
        </div>

        {/* Bottom Navigation Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t-2 border-[#8C6D46] bg-[#29231E] flex items-center justify-between gap-3">
          <button
            onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
            disabled={slideIdx === 0}
            className="px-3.5 py-2 rounded-md bg-[#3A312A] hover:bg-[#4E4239] disabled:opacity-35 border border-[#8C6D46] text-xs font-bold text-[#FBF7F0] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {/* Dot Indicators */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((dot) => (
              <button
                key={dot}
                onClick={() => setSlideIdx(dot)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  dot === slideIdx ? 'w-7 bg-[#F59E0B]' : 'w-2.5 bg-[#6E5638]'
                }`}
                title={`Go to Slide ${dot + 1}`}
              />
            ))}
          </div>

          {slideIdx < 2 ? (
            <button
              onClick={() => setSlideIdx((i) => Math.min(2, i + 1))}
              className="px-4 py-2 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-[#1C1917] font-extrabold text-xs flex items-center gap-1.5 shadow-[3px_3px_0px_#0B0908] transition-colors cursor-pointer"
            >
              <span>Next Cutout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-md bg-[#10B981] hover:bg-[#059669] text-[#0B0E14] font-extrabold text-xs flex items-center gap-1.5 shadow-[3px_3px_0px_#0B0908] transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Building!</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
