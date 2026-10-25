import React from 'react';
import { Play, Map, Compass, Layers, Server, Smartphone } from 'lucide-react';
import { CHAPTERS } from '../game/levels';

interface TitleScreenProps {
  completedCount: number;
  currentLevelId: number;
  onStartGame: () => void;
  onOpenLevelSelect: () => void;
  onOpenInstall: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  completedCount,
  currentLevelId,
  onStartGame,
  onOpenLevelSelect,
  onOpenInstall,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 pointer-events-none">
      <div className="bg-[#151B23] border border-[#263040] rounded-lg max-w-2xl w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-8 shadow-2xl pointer-events-auto">
        {/* Clean Editorial Kicker */}
        <div className="text-[11px] sm:text-xs font-medium text-[#94A3B8] mb-2 sm:mb-3 tracking-wide">
          COURSERA AWS CLOUD PRACTITIONER SYLLABUS · 13 MODULES · 130 MISSIONS
        </div>

        {/* Hero Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight leading-[1.1] mb-3 sm:mb-4">
          CloudCraft: AWS &amp; DevOps Architect
        </h1>

        <p className="text-xs sm:text-base text-[#CBD5E1] leading-relaxed mb-5 sm:mb-6 max-w-xl">
          Master the complete 13-Module AWS Cloud Practitioner curriculum on a tactile 3D hardware board. Every level starts with a cardboard-cutout visual story, enforces real AWS zone &amp; FinOps physics, and culminates in Graded Module Boss Assessments.
        </p>

        {/* Feature Overview Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-5 sm:mb-7">
          <div className="p-3 sm:p-3.5 rounded-md bg-[#0F141A] border border-[#263040]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F8FAFC] mb-1">
              <Compass className="w-4 h-4 text-[#F59E0B] shrink-0" />
              <span>1. 13 Coursera Modules</span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#94A3B8] leading-relaxed">
              10 progressive levels per module—from Intro to Cloud &amp; EC2 to AI/ML, Security, FinOps &amp; Well-Architected.
            </p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-md bg-[#0F141A] border border-[#263040]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F8FAFC] mb-1">
              <Server className="w-4 h-4 text-[#38BDF8] shrink-0" />
              <span>2. Real Zone &amp; FinOps Physics</span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#94A3B8] leading-relaxed">
              Place blocks anywhere—running traffic catches invalid AWS zones, blocked ports, and idle unwired server waste.
            </p>
          </div>

          <div className="p-3 sm:p-3.5 rounded-md bg-[#0F141A] border border-[#263040]">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#F8FAFC] mb-1">
              <Layers className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>3. Cardboard Cutout Stories</span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#94A3B8] leading-relaxed">
              Swipe through simple 3-step paper-cutout dioramas before each mission to see real-world cloud architecture in action.
            </p>
          </div>
        </div>

        {/* Curriculum Progress Summary */}
        <div className="mb-5 sm:mb-7 p-3.5 sm:p-4 rounded-md bg-[#0F141A] border border-[#263040] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-[#F8FAFC]">
              Syllabus Progress ·{' '}
              <span className="font-mono tabular-nums text-[#F59E0B]">
                {completedCount} / 130
              </span>{' '}
              Missions Completed (All 13 Modules Open)
            </div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">
              {CHAPTERS.slice(0, 4)
                .map((c) => c.shortTitle)
                .join(' · ')}{' '}
              &amp; 9 more modules
            </div>
          </div>
          <div className="w-full sm:w-44 h-2 bg-[#1E2631] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10B981] transition-all duration-300"
              style={{ width: `${Math.max(2, (completedCount / 130) * 100)}%` }}
            />
          </div>
        </div>

        {/* Primary CTA Row (Full-width stacked buttons on mobile, inline on desktop) */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          <button
            onClick={onStartGame}
            className="px-5 py-3 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-[#0F141A] font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>
              {completedCount === 0
                ? 'Start Module 1 (Level 1: First Steps)'
                : `Continue Level ${currentLevelId} of 130`}
            </span>
          </button>

          <button
            onClick={onOpenLevelSelect}
            className="px-5 py-3 rounded-md bg-[#0F141A] hover:bg-[#1E2631] text-[#F8FAFC] border border-[#263040] font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Map className="w-4 h-4 text-[#94A3B8] shrink-0" />
            <span>Browse All 13 Modules (130 Levels)</span>
          </button>

          <button
            onClick={onOpenInstall}
            className="px-4 py-3 rounded-md bg-[#0F141A] hover:bg-[#1E2631] text-[#10B981] border border-[#10B981]/40 hover:border-[#10B981] font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            title="Install CloudCraft directly onto your Android phone"
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Install on Phone / Android</span>
          </button>
        </div>
      </div>
    </div>
  );
};
