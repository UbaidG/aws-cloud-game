import React, { useState } from 'react';
import { X, CheckCircle2, Play, Search, Award } from 'lucide-react';
import { LEVELS, CHAPTERS } from '../game/levels';
import { GAME_MODE_METAS } from '../game/scenarioGenerator';
import { AwsServiceIcon } from './AwsServiceIcon';

interface LevelSelectModalProps {
  isOpen: boolean;
  currentLevelId: number;
  completedLevels: number[];
  levelStars: Record<number, number>;
  onSelectLevel: (levelId: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  currentLevelId,
  completedLevels,
  levelStars,
  onSelectLevel,
  onClose,
}) => {
  const currentLevelObj = LEVELS.find((l) => l.id === currentLevelId);
  const [selectedModule, setSelectedModule] = useState<number>(
    currentLevelObj?.chapterId || 1
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const activeModuleMeta = CHAPTERS.find((c) => c.id === selectedModule);

  const filteredLevels = LEVELS.filter((lvl) => {
    const matchesModule = selectedModule === 0 || lvl.chapterId === selectedModule;
    const matchesSearch =
      searchQuery.trim() === '' ||
      lvl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lvl.chapterTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lvl.concepts.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(lvl.id) === searchQuery.trim();
    return matchesModule && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117]/85 flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-[#151B23] border border-[#263040] rounded-lg max-w-6xl w-full max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#263040] flex flex-wrap items-center justify-between gap-4 bg-[#1C2430]">
          <div>
            <div className="text-[11px] font-mono text-[#F59E0B] font-bold uppercase tracking-wider">
              COURSERA AWS CLOUD PRACTITIONER SYLLABUS · ALL 13 MODULES UNLOCKED
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F8FAFC] tracking-tight mt-0.5">
              13 Modules · 130 Interactive Cloud Missions &amp; Graded Boss Assessments
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Completed{' '}
              <span className="font-mono tabular-nums text-[#10B981] font-semibold">
                {completedLevels.length} / {LEVELS.length}
              </span>{' '}
              levels · Jump freely into any module or Graded Assessment (Levels 10, 20... 130)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] ml-2.5 mr-1.5" />
              <input
                type="text"
                placeholder="Search service or level..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim() !== '') setSelectedModule(0);
                }}
                className="bg-[#0F141A] border border-[#263040] rounded-md px-3 py-1.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8] w-44 sm:w-56"
              />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#263040] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 13 Coursera Module Syllabus Tabs */}
        <div className="px-4 py-2.5 bg-[#0F141A] border-b border-[#263040] flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedModule(0)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              selectedModule === 0
                ? 'bg-[#F59E0B] text-[#0F141A] font-bold'
                : 'bg-[#151B23] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263040]'
            }`}
          >
            All 13 Modules (130)
          </button>
          {CHAPTERS.map((mod) => {
            const doneInMod = mod.levels.filter((id) => completedLevels.includes(id)).length;
            return (
              <button
                key={mod.id}
                onClick={() => setSelectedModule(mod.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedModule === mod.id
                    ? 'bg-[#F59E0B] text-[#0F141A] font-bold'
                    : 'bg-[#151B23] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#263040]'
                }`}
              >
                <AwsServiceIcon type={mod.badgeIcon} size={16} />
                <span>
                  Mod {mod.id}: {mod.shortTitle}
                </span>
                <span
                  className={`font-mono text-[10px] px-1 rounded ${
                    selectedModule === mod.id
                      ? 'bg-[#0F141A]/20 text-[#0F141A]'
                      : 'bg-[#0F141A] text-[#94A3B8]'
                  }`}
                >
                  {doneInMod}/10
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Module Syllabus Banner */}
        {activeModuleMeta && (
          <div className="px-4 py-3 bg-[#121820] border-b border-[#263040] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AwsServiceIcon type={activeModuleMeta.badgeIcon} size={32} />
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-[#F8FAFC]">
                  {activeModuleMeta.title} (Levels {activeModuleMeta.levels[0]}–
                  {activeModuleMeta.levels[activeModuleMeta.levels.length - 1]})
                </div>
                <p className="text-xs text-[#94A3B8] truncate">
                  {activeModuleMeta.syllabusSummary}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onSelectLevel(activeModuleMeta.assessmentLevelId);
                onClose();
              }}
              className="px-3 py-1.5 rounded-md bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#F59E0B] text-xs font-bold text-[#F59E0B] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Jump to Module {activeModuleMeta.id} Assessment (Lv {activeModuleMeta.assessmentLevelId})</span>
            </button>
          </div>
        )}

        {/* Level Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredLevels.map((lvl) => {
            const isCompleted = completedLevels.includes(lvl.id);
            const isCurrent = lvl.id === currentLevelId;
            const stars = levelStars[lvl.id] || 0;
            const modeMeta = GAME_MODE_METAS[lvl.gameMode || 'outage_repair'];
            const stageCount = lvl.stages?.length || 1;
            const previewTypes =
              lvl.allowedPalette.length > 0 ? lvl.allowedPalette.slice(0, 3) : ['ec2' as const];
            const lessonIndexInMod = ((lvl.id - 1) % 10) + 1;

            return (
              <button
                key={lvl.id}
                onClick={() => {
                  onSelectLevel(lvl.id);
                  onClose();
                }}
                className={`text-left p-4 rounded-md border transition-colors flex flex-col justify-between cursor-pointer ${
                  isCurrent
                    ? 'bg-[#1E2631] border-[#F59E0B]'
                    : lvl.isAssessment
                    ? 'bg-[#1A1612] border-[#F59E0B]/60 hover:border-[#F59E0B]'
                    : isCompleted
                    ? 'bg-[#0F141A] border-[#10B981]/40 hover:border-[#10B981]'
                    : 'bg-[#0F141A] border-[#263040] hover:border-[#38BDF8]/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1.5">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <strong className="font-mono tabular-nums text-[#F8FAFC]">
                        M{lvl.chapterId}.{lessonIndexInMod} (Lv {lvl.id})
                      </strong>
                      {lvl.isAssessment ? (
                        <span className="px-1.5 py-0.5 rounded bg-[#F59E0B] text-[#0F141A] font-mono text-[10px] font-extrabold flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          ASSESSMENT
                        </span>
                      ) : (
                        <span
                          className="font-mono font-bold"
                          style={{ color: modeMeta.accentColor }}
                        >
                          {modeMeta.shortBadge}
                        </span>
                      )}
                      <span className="font-mono text-[#CBD5E1]">
                        · {stageCount > 1 ? `${stageCount} Stages` : 'Guided'}
                      </span>
                    </span>
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-[#10B981] font-medium shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="font-mono">{stars}★</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#F8FAFC] mb-1 leading-snug">
                    {lvl.title}
                  </h3>
                  <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed">
                    {lvl.tagline}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#263040] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {previewTypes.map((t) => (
                      <AwsServiceIcon key={t} type={t} size={20} />
                    ))}
                    <span className="text-[#94A3B8] truncate max-w-[130px] ml-1">
                      {lvl.concepts[0]}
                    </span>
                  </div>
                  <span className="text-[#F59E0B] font-semibold flex items-center gap-1">
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isCurrent ? 'Playing' : 'Load'}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
