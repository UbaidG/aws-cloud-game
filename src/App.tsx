import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Map,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  Circle,
  BookOpen,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Smartphone,
  WifiOff,
  AlertTriangle,
  Layers,
  Film,
  Activity,
} from 'lucide-react';
import { VoxelEngine } from './game/VoxelEngine';
import { LEVELS, COMPONENT_METAS } from './game/levels';
import {
  VoxelBlock,
  Connection,
  ArchitectureState,
  AWSComponentType,
  ComponentConfig,
  CoachStep,
  SubnetType,
} from './game/types';
import {
  computeLiveTelemetry,
  evaluateArchitectureDiagnostics,
  evaluateConnectionPhysics,
} from './game/networkPhysics';
import { GAME_MODE_METAS } from './game/scenarioGenerator';
import { sound } from './game/audio';
import { TitleScreen } from './components/TitleScreen';
import { LevelSelectModal } from './components/LevelSelectModal';
import { InspectorDrawer } from './components/InspectorDrawer';
import { BottomDock, ToolMode } from './components/BottomDock';
import { TerminalDrawer, DiagnosticLog } from './components/TerminalDrawer';
import { VictoryModal } from './components/VictoryModal';
import { HelpModal } from './components/HelpModal';
import { IacViewerModal } from './components/IacViewerModal';
import { ConceptCardModal } from './components/ConceptCardModal';
import { StoryboardModal } from './components/StoryboardModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { useOnlineStatus } from './hooks/usePWAInstall';

const STORAGE_KEY = 'cloudcraft_60levels_progress_v2';

interface SavedProgress {
  completedLevels: number[];
  levelStars: Record<number, number>;
  lastLevelId: number;
}

function getSubnetForGridX(gx: number): SubnetType {
  if (gx < -4) return 'external';
  if (gx >= -4 && gx < -1) return 'edge';
  if (gx >= -1 && gx <= 2) return 'public';
  return 'private';
}

export default function App() {
  const [screen, setScreen] = useState<'title' | 'playing'>('title');

  // Saved Player Progress
  const [progress, setProgress] = useState<SavedProgress>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore storage errors
    }
    return {
      completedLevels: [],
      levelStars: {},
      lastLevelId: 1,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore storage errors
    }
  }, [progress]);

  // Current Level & Multi-Stage State
  const [currentLevelId, setCurrentLevelId] = useState<number>(progress.lastLevelId || 1);
  const currentLevel = useMemo(
    () => LEVELS.find((l) => l.id === currentLevelId) || LEVELS[0],
    [currentLevelId]
  );

  const [currentStageIdx, setCurrentStageIdx] = useState<number>(0);
  const [revealedHints, setRevealedHints] = useState<number>(0);
  const [stageBannerMessage, setStageBannerMessage] = useState<string | null>(null);

  const [archState, setArchState] = useState<ArchitectureState>(() => {
    const raw: ArchitectureState = {
      components: JSON.parse(JSON.stringify(currentLevel.initialState.components)),
      connections: JSON.parse(JSON.stringify(currentLevel.initialState.connections)),
    };
    const { updatedConnections } = evaluateArchitectureDiagnostics(raw, currentLevel.id);
    return { ...raw, connections: updatedConnections };
  });

  // Tool & UI Drawer State
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedPaletteType, setSelectedPaletteType] = useState<AWSComponentType | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [unreadErrors, setUnreadErrors] = useState(0);

  // Modals
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isIacOpen, setIsIacOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isConceptOpen, setIsConceptOpen] = useState(false);
  const [isStoryboardOpen, setIsStoryboardOpen] = useState(false);
  const [isPWAInstallOpen, setIsPWAInstallOpen] = useState(false);
  const [isMissionExpandedMobile, setIsMissionExpandedMobile] = useState(false);
  const isOnline = useOnlineStatus();

  // Refs for Three.js Engine
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const currentLevelRef = useRef(currentLevel);
  currentLevelRef.current = currentLevel;

  const stages = useMemo(
    () =>
      currentLevel.stages && currentLevel.stages.length > 0
        ? currentLevel.stages
        : [
            {
              stageNumber: 1,
              title: 'Mission Objectives',
              incidentAlert: currentLevel.briefing,
              objectiveSummary: currentLevel.tagline,
              unlockedPalette: currentLevel.allowedPalette,
              hints: [
                currentLevel.requirements[0]?.hint || 'Inspect the 3D board.',
                currentLevel.docTips[0] || 'Check subnet zones.',
                currentLevel.taskDescription,
              ] as [string, string, string],
              requirements: currentLevel.requirements,
            },
          ],
    [currentLevel]
  );

  const activeStage = stages[Math.min(currentStageIdx, stages.length - 1)] || stages[0];
  const gameMode = currentLevel.gameMode || 'outage_repair';
  const gameModeMeta = GAME_MODE_METAS[gameMode];

  // Live Network Physics Diagnostics & Production Telemetry
  const diagnostics = useMemo(
    () => evaluateArchitectureDiagnostics(archState, currentLevel.id),
    [archState, currentLevel.id]
  );

  const liveTelemetry = useMemo(
    () => computeLiveTelemetry(archState, gameMode, activeStage.stageNumber),
    [archState, gameMode, activeStage.stageNumber]
  );

  // Dynamic Soft-Lock Prevention: Combine active stage palette + any missing initial component types
  const effectivePalette = useMemo(() => {
    const set = new Set<AWSComponentType>(activeStage.unlockedPalette);
    currentLevel.initialState.components.forEach((initComp) => {
      if (initComp.type !== 'client' && !initComp.deletable) {
        const stillOnBoard = archState.components.some((c) => c.type === initComp.type);
        if (!stillOnBoard) {
          set.add(initComp.type);
        }
      }
    });
    return Array.from(set);
  }, [activeStage.unlockedPalette, currentLevel.initialState.components, archState.components]);

  const selectedComponent = useMemo(
    () => archState.components.find((c) => c.id === selectedComponentId) || null,
    [archState.components, selectedComponentId]
  );

  // Evaluate active step-by-step coach instruction for beginner levels
  const activeCoachStep: CoachStep | null = useMemo(() => {
    if (!currentLevel.coachSteps || currentLevel.coachSteps.length === 0) return null;
    for (const step of currentLevel.coachSteps) {
      const done = step.completed(
        archState,
        selectedComponentId,
        toolMode,
        selectedPaletteType
      );
      if (!done) return step;
    }
    return null;
  }, [currentLevel, archState, selectedComponentId, toolMode, selectedPaletteType]);

  // Append Diagnostic Log
  const appendLog = useCallback((level: DiagnosticLog['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setLogs((prev) => [...prev.slice(-45), { timestamp, level, message }]);
    if (level === 'ERROR') {
      setUnreadErrors((n) => n + 1);
    }
  }, []);

  // Initialize Three.js VoxelEngine once on mount
  useEffect(() => {
    if (!canvasMountRef.current || engineRef.current) return;

    const engine = new VoxelEngine(canvasMountRef.current, {
      onSelectComponent: (comp) => {
        setSelectedComponentId(comp ? comp.id : null);
        if (comp) {
          setIsMissionExpandedMobile(false);
        }
      },
      onConnect: (fromId, toId) => {
        setArchState((prev) => {
          const exists = prev.connections.some(
            (c) =>
              (c.fromId === fromId && c.toId === toId) ||
              (c.fromId === toId && c.toId === fromId)
          );
          if (exists) return prev;

          const fromComp = prev.components.find((c) => c.id === fromId);
          const toComp = prev.components.find((c) => c.id === toId);
          if (!fromComp || !toComp) return prev;

          const phys = evaluateConnectionPhysics(fromComp, toComp);

          const newConn: Connection = {
            id: `conn-${Date.now()}`,
            fromId,
            toId,
            port: phys.port,
            protocol: 'tcp',
            allowed: phys.allowed,
            failureReason: phys.failureReason,
          };

          if (phys.allowed) {
            appendLog(
              'INFO',
              `Connected valid wire: ${fromComp.name} → ${toComp.name} (Port ${phys.port})`
            );
          } else {
            sound.playFail();
            appendLog(
              'ERROR',
              `${phys.failureTitle}: ${phys.failureReason} Fix: ${phys.howToFix}`
            );
          }

          return {
            ...prev,
            connections: [...prev.connections, newConn],
          };
        });
      },
      onDelete: (componentId) => {
        setArchState((prev) => {
          const target = prev.components.find((c) => c.id === componentId);
          if (target?.locked) {
            appendLog(
              'WARN',
              `Protected Component: "${target.name}" is part of the baseline scenario and cannot be removed.`
            );
            return prev;
          }
          return {
            components: prev.components.filter((c) => c.id !== componentId),
            connections: prev.connections.filter(
              (c) => c.fromId !== componentId && c.toId !== componentId
            ),
          };
        });
        setSelectedComponentId((prevId) => (prevId === componentId ? null : prevId));
        appendLog('INFO', `Removed block ${componentId} from the board.`);
      },
      onPlace: (type, gx, gz) => {
        const meta = COMPONENT_METAS[type] || COMPONENT_METAS.ec2;
        const subnet = getSubnetForGridX(gx);
        const newId = `${type}-${Date.now().toString(36).slice(-4)}`;

        const newBlock: VoxelBlock = {
          id: newId,
          type,
          name: `${meta.shortLabel} (${gx},${gz})`,
          gridX: gx,
          gridZ: gz,
          subnet,
          az: gx > 0 && gz > 0 ? 'us-east-1b' : 'us-east-1a',
          config: JSON.parse(JSON.stringify(meta.defaultConfig || {})),
          status: 'healthy',
        };

        setArchState((prev) => {
          const nextConnections = [...prev.connections];
          const alreadyHasEc2 = prev.components.some((c) => c.type === 'ec2');
          if (currentLevelRef.current.id === 2 && type === 'ec2' && !alreadyHasEc2) {
            const client = prev.components.find((c) => c.type === 'client');
            if (client) {
              const phys = evaluateConnectionPhysics(client, newBlock);
              nextConnections.push({
                id: `conn-auto-lvl2-${newId}`,
                fromId: client.id,
                toId: newId,
                port: 80,
                protocol: 'tcp',
                allowed: phys.allowed,
                failureReason: phys.failureReason,
              });
            }
          }
          return {
            components: [...prev.components, newBlock],
            connections: nextConnections,
          };
        });

        setSelectedComponentId(newId);
        setToolMode('select');
        setSelectedPaletteType(null);
        appendLog(
          'INFO',
          `Placed ${meta.name} in ${subnet.toUpperCase()} zone at grid (${gx}, ${gz}).`
        );
      },
      onPacketResult: (success, message) => {
        appendLog(success ? 'SUCCESS' : 'ERROR', message);
      },
    });

    engineRef.current = engine;
    engine.updateState(archState);
    engine.setTargetPlacements(currentLevel.targetPlacements || []);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [appendLog]);

  // Synchronize board state, 3D failure callouts & target placement rings with 3D engine
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.updateState({
      components: archState.components,
      connections: diagnostics.updatedConnections,
    });

    const errorViolations = diagnostics.violations.filter((v) => v.severity === 'error');
    if (errorViolations.length > 0) {
      engineRef.current.showViolationsIn3D(errorViolations);
    } else {
      engineRef.current.clearViolationsIn3D();
    }

    const remainingTargets = (currentLevel.targetPlacements || []).filter(
      (tp) =>
        !archState.components.some(
          (c) => c.type === tp.type && c.gridX === tp.gridX && c.gridZ === tp.gridZ
        )
    );
    engineRef.current.setTargetPlacements(remainingTargets);
  }, [archState, diagnostics, currentLevel]);

  // Synchronize active tool with 3D engine
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.activeTool = toolMode;
    engineRef.current.placingType = selectedPaletteType;
  }, [toolMode, selectedPaletteType]);

  // Load a specific level
  const handleLoadLevel = useCallback((levelId: number, openStoryboard = true) => {
    const target = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    setCurrentLevelId(target.id);
    setCurrentStageIdx(0);
    setRevealedHints(0);
    setStageBannerMessage(null);
    setProgress((prev) => ({ ...prev, lastLevelId: target.id }));

    const rawState: ArchitectureState = {
      components: JSON.parse(JSON.stringify(target.initialState.components)),
      connections: JSON.parse(JSON.stringify(target.initialState.connections)),
    };
    const { updatedConnections } = evaluateArchitectureDiagnostics(rawState, target.id);
    const freshState: ArchitectureState = {
      ...rawState,
      connections: updatedConnections,
    };

    setArchState(freshState);
    setSelectedComponentId(null);
    setToolMode('select');
    setSelectedPaletteType(null);
    setIsVictoryOpen(false);
    setIsStoryboardOpen(openStoryboard);
    setLogs([
      {
        timestamp: new Date().toLocaleTimeString([], { hour12: false }),
        level: 'INFO',
        message: `Loaded Level ${target.id} of 60: ${target.title}`,
      },
    ]);
    setUnreadErrors(0);

    if (engineRef.current) {
      engineRef.current.resetCamera();
      engineRef.current.clearViolationsIn3D();
      engineRef.current.updateState(freshState);
      engineRef.current.setTargetPlacements(target.targetPlacements || []);
    }
  }, []);

  // Run Traffic Simulation & Evaluate Current Progressive Stage
  const handleSimulate = useCallback(() => {
    if (isSimulating) return;
    setIsSimulating(true);
    setIsVictoryOpen(false);
    setStageBannerMessage(null);
    appendLog(
      'INFO',
      `Running traffic test on Level ${currentLevel.id} (${activeStage.title})...`
    );

    engineRef.current?.simulateTraffic(() => {
      setIsSimulating(false);

      // 1. Check strict AWS network physics violations first
      const errorViolations = diagnostics.violations.filter((v) => v.severity === 'error');
      if (errorViolations.length > 0) {
        sound.playFail();
        engineRef.current?.showViolationsIn3D(errorViolations);
        errorViolations.forEach((v) => {
          appendLog('ERROR', `${v.title} — ${v.plainEnglishReason} (${v.howToFix})`);
        });
        return;
      }

      // 2. Check active stage requirements
      const results = activeStage.requirements.map((req) => ({
        req,
        passed: req.check({
          components: archState.components,
          connections: diagnostics.updatedConnections,
        }),
      }));

      const stagePassed = results.every((r) => r.passed);

      results.forEach((r) => {
        if (r.passed) {
          appendLog('SUCCESS', `Verified: ${r.req.label}`);
        } else {
          appendLog('WARN', `Incomplete: ${r.req.label} — Hint: ${r.req.hint}`);
        }
      });

      if (stagePassed) {
        // Check if there is a next stage in this multi-stage mission!
        if (currentStageIdx + 1 < stages.length) {
          const nextIdx = currentStageIdx + 1;
          const nextStage = stages[nextIdx];
          sound.playVictory();
          setCurrentStageIdx(nextIdx);
          setRevealedHints(0);
          setStageBannerMessage(
            `Stage ${activeStage.stageNumber} Passed! Advancing to ${nextStage.title} — New AWS components unlocked in your dock!`
          );
          appendLog(
            'SUCCESS',
            `Stage ${activeStage.stageNumber} Complete! Triggering ${nextStage.title}: ${nextStage.incidentAlert}`
          );
          return;
        }

        // Final Stage Passed -> Complete Level!
        appendLog('SUCCESS', '100% Traffic & SLA Verified! All mission stages complete.');
        engineRef.current?.spawnCelebration();

        setProgress((prev) => {
          const completed = prev.completedLevels.includes(currentLevel.id)
            ? prev.completedLevels
            : [...prev.completedLevels, currentLevel.id];
          return {
            ...prev,
            completedLevels: completed,
            levelStars: {
              ...prev.levelStars,
              [currentLevel.id]: 3,
            },
          };
        });

        setTimeout(() => {
          setIsVictoryOpen(true);
        }, 900);
      } else {
        sound.playFail();
        // Automatically reveal the next progressive hint if the user is on a multi-stage level and failed a test
        setRevealedHints((h) => Math.min(3, h + 1));
        appendLog(
          'ERROR',
          'Traffic test did not meet all stage requirements. A diagnostic hint has been unlocked in the Mission card.'
        );
      }
    });
  }, [
    isSimulating,
    currentLevel,
    activeStage,
    stages,
    currentStageIdx,
    archState.components,
    diagnostics,
    appendLog,
  ]);

  // Spacebar shortcut to run traffic test
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'playing') return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleSimulate();
      } else if (e.code === 'Escape') {
        setSelectedComponentId(null);
        setIsLevelSelectOpen(false);
        setIsHelpOpen(false);
        setIsIacOpen(false);
        setIsConceptOpen(false);
        setIsStoryboardOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, handleSimulate]);

  // Inspector Handlers
  const handleUpdateConfig = useCallback(
    (componentId: string, updates: Partial<ComponentConfig>) => {
      setArchState((prev) => {
        const nextComponents = prev.components.map((c) =>
          c.id === componentId
            ? {
                ...c,
                status: 'healthy' as const,
                config: { ...c.config, ...updates },
              }
            : c
        );
        const { updatedConnections } = evaluateArchitectureDiagnostics(
          { components: nextComponents, connections: prev.connections },
          currentLevelRef.current.id
        );
        return {
          components: nextComponents,
          connections: updatedConnections,
        };
      });
    },
    []
  );

  const handleDeleteComponent = useCallback((componentId: string) => {
    setArchState((prev) => {
      const target = prev.components.find((c) => c.id === componentId);
      if (target?.locked) return prev;
      return {
        components: prev.components.filter((c) => c.id !== componentId),
        connections: prev.connections.filter(
          (c) => c.fromId !== componentId && c.toId !== componentId
        ),
      };
    });
    setSelectedComponentId(null);
  }, []);

  const handleDeleteConnection = useCallback((connectionId: string) => {
    setArchState((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== connectionId),
    }));
  }, []);

  const handleConnectFromInspector = useCallback(
    (targetId: string) => {
      if (!selectedComponentId || selectedComponentId === targetId) return;
      setArchState((prev) => {
        const exists = prev.connections.some(
          (c) =>
            (c.fromId === selectedComponentId && c.toId === targetId) ||
            (c.fromId === targetId && c.toId === selectedComponentId)
        );
        if (exists) return prev;
        const fromComp = prev.components.find((c) => c.id === selectedComponentId);
        const toComp = prev.components.find((c) => c.id === targetId);
        if (!fromComp || !toComp) return prev;

        const phys = evaluateConnectionPhysics(fromComp, toComp);

        return {
          ...prev,
          connections: [
            ...prev.connections,
            {
              id: `conn-${Date.now()}`,
              fromId: selectedComponentId,
              toId: targetId,
              port: phys.port,
              protocol: 'tcp',
              allowed: phys.allowed,
              failureReason: phys.failureReason,
            },
          ],
        };
      });
    },
    [selectedComponentId]
  );

  // Live requirement checklist status for current stage
  const requirementResults = useMemo(
    () =>
      activeStage.requirements.map((req) => ({
        req,
        passed: req.check({
          components: archState.components,
          connections: diagnostics.updatedConnections,
        }),
      })),
    [activeStage, archState.components, diagnostics.updatedConnections]
  );

  const passedCount = requirementResults.filter((r) => r.passed).length;
  const inspectorMode =
    currentLevel.inspectorMode || (currentLevel.id <= 9 ? 'basic' : 'full');
  const errorViolations = diagnostics.violations.filter((v) => v.severity === 'error');
  const isTutorialLevel = currentLevel.id <= 10;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0D1117] text-[#F8FAFC] select-none">
      {/* 1. Full-Viewport 3D Diorama Canvas */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* 2. Title Screen Overlay */}
      {screen === 'title' && (
        <TitleScreen
          completedCount={progress.completedLevels.length}
          currentLevelId={currentLevelId}
          onStartGame={() => {
            setScreen('playing');
            handleLoadLevel(currentLevelId, true);
          }}
          onOpenLevelSelect={() => setIsLevelSelectOpen(true)}
          onOpenInstall={() => setIsPWAInstallOpen(true)}
        />
      )}

      {/* 3. Active Game HUD */}
      {screen === 'playing' && (
        <>
          {/* Zone 1: Top Header Bar */}
          <header className="fixed top-2 inset-x-2 sm:top-3 sm:inset-x-4 z-30 flex items-center justify-between gap-1.5 pointer-events-none">
            {/* Left Cluster: Brand + Level Switcher + Game Mode Badge */}
            <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto bg-[#151B23] border border-[#263040] px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg shadow-lg min-w-0">
              <button
                onClick={() => setScreen('title')}
                className="text-xs font-bold tracking-tight text-[#F8FAFC] hover:text-[#F59E0B] transition-colors cursor-pointer shrink-0"
                title="Return to Title Screen"
              >
                CloudCraft
              </button>

              <span className="text-[#263040] shrink-0">|</span>

              <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">
                <button
                  onClick={() => handleLoadLevel(Math.max(1, currentLevel.id - 1), true)}
                  disabled={currentLevel.id <= 1}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 cursor-pointer shrink-0"
                  title="Previous Level"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsLevelSelectOpen(true)}
                  className="text-xs font-medium text-[#E2E8F0] hover:text-[#F59E0B] px-1 py-0.5 rounded transition-colors cursor-pointer truncate max-w-[130px] xs:max-w-[175px] sm:max-w-[260px] md:max-w-md"
                  title="Open All 13 Coursera Modules (130 Levels)"
                >
                  <span className="font-mono tabular-nums text-[#F59E0B] font-semibold">
                    <span className="sm:hidden">
                      M{currentLevel.chapterId} · Lv {currentLevel.id}/130
                    </span>
                    <span className="hidden sm:inline">
                      Mod {currentLevel.chapterId} · Level {currentLevel.id}/130
                    </span>
                  </span>{' '}
                  · {currentLevel.title}
                </button>
                <button
                  onClick={() => handleLoadLevel(Math.min(130, currentLevel.id + 1), true)}
                  disabled={currentLevel.id >= 130}
                  className="p-1 rounded text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 cursor-pointer shrink-0"
                  title="Next Level"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="hidden md:inline text-[#263040] shrink-0">|</span>
              <span
                className="hidden md:inline font-mono text-[10px] font-bold uppercase tracking-wider shrink-0"
                style={{ color: gameModeMeta.accentColor }}
              >
                {gameModeMeta.shortBadge}
              </span>
            </div>

            {/* Right Cluster: Live Telemetry Strip + Storyboard Comic + Navigation */}
            <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
              {/* Live Production Telemetry Readout (Latency, RPS, $/mo Cost) */}
              <div className="hidden xl:flex items-center gap-3 bg-[#151B23] border border-[#263040] px-3 py-1.5 rounded-lg text-[11px] font-mono shadow-lg">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-[#38BDF8]" />
                  <span className="text-[#94A3B8]">p99:</span>
                  <strong
                    className={
                      liveTelemetry.latencyMs <= 85
                        ? 'text-[#10B981]'
                        : liveTelemetry.latencyMs <= 220
                        ? 'text-[#F59E0B]'
                        : 'text-[#EF4444]'
                    }
                  >
                    {liveTelemetry.latencyMs}ms
                  </strong>
                </span>
                <span className="text-[#263040]">|</span>
                <span>
                  <span className="text-[#94A3B8]">Cap:</span>{' '}
                  <strong className="text-[#F8FAFC]">{liveTelemetry.capacityRps} RPS</strong>
                </span>
                <span className="text-[#263040]">|</span>
                <span>
                  <span className="text-[#94A3B8]">Bill:</span>{' '}
                  <strong className="text-[#F59E0B]">${liveTelemetry.monthlyCostUsd}/mo</strong>
                </span>
              </div>

              <button
                onClick={() => setIsStoryboardOpen(true)}
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg bg-[#151B23] hover:bg-[#1E2631] border border-[#38BDF8]/50 text-xs font-medium text-[#38BDF8] shadow-lg transition-colors cursor-pointer"
                title="View Real-World Case Study & Storyboard Comic"
              >
                <Film className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Case Study</span>
              </button>

              {currentLevel.conceptCard && (
                <button
                  onClick={() => setIsConceptOpen(true)}
                  className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg bg-[#151B23] hover:bg-[#1E2631] border border-[#F59E0B]/50 text-xs font-medium text-[#F59E0B] shadow-lg transition-colors cursor-pointer"
                  title="Read Plain-English Concept Card"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Concept</span>
                </button>
              )}

              <button
                onClick={() => setIsPWAInstallOpen(true)}
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg bg-[#151B23] hover:bg-[#1E2631] border border-[#10B981]/40 text-xs font-medium text-[#10B981] shadow-lg transition-colors cursor-pointer"
                title="Install CloudCraft on Android or Phone"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Install App</span>
              </button>

              <button
                onClick={() => setIsLevelSelectOpen(true)}
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-lg bg-[#151B23] hover:bg-[#1E2631] border border-[#263040] text-xs font-medium text-[#E2E8F0] shadow-lg transition-colors cursor-pointer"
                title="Browse All 60 Levels"
              >
                <Map className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span className="hidden md:inline">Levels</span>
              </button>

              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-2 rounded-lg bg-[#151B23] hover:bg-[#1E2631] border border-[#263040] text-[#94A3B8] hover:text-[#F8FAFC] shadow-lg transition-colors cursor-pointer"
                title="How to Play"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <button
                onClick={() => engineRef.current?.resetCamera()}
                className="p-2 rounded-lg bg-[#151B23] hover:bg-[#1E2631] border border-[#263040] text-[#94A3B8] hover:text-[#F8FAFC] shadow-lg transition-colors cursor-pointer"
                title="Reset 3D Camera Angle"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Stage Transition Toast Banner */}
          {stageBannerMessage && (
            <div className="fixed top-15 left-1/2 -translate-x-1/2 z-40 bg-[#10B981] text-[#0F141A] text-xs font-bold px-4 py-2 rounded-md shadow-xl flex items-center gap-2 animate-in fade-in duration-200 max-w-[92vw]">
              <Layers className="w-4 h-4 shrink-0" />
              <span>{stageBannerMessage}</span>
            </div>
          )}

          {/* Offline Indicator Banner */}
          {!isOnline && (
            <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 bg-[#F59E0B] text-[#0F141A] text-xs font-semibold px-3 py-1.5 rounded-md shadow-lg flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>Offline Mode — Playing from Service Worker cache</span>
            </div>
          )}

          {/* Zone 2: Top-Left Mission, Multi-Stage Progress & Physics Diagnostics Card */}
          <aside className="fixed top-13 inset-x-2 sm:inset-x-auto sm:top-16 sm:left-4 z-20 sm:w-88 pointer-events-auto bg-[#151B23] border border-[#263040] rounded-lg shadow-xl overflow-hidden">
            {/* Compact Header Bar */}
            <div
              onClick={() => setIsMissionExpandedMobile((prev) => !prev)}
              className="px-3 py-2 sm:px-4 sm:pt-3 sm:pb-2 bg-[#0F141A] border-b border-[#263040] flex items-center justify-between gap-2 cursor-pointer sm:cursor-default"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="font-mono text-[10px] font-bold uppercase tracking-wider shrink-0"
                  style={{ color: gameModeMeta.accentColor }}
                >
                  {stages.length > 1
                    ? `STAGE ${activeStage.stageNumber}/${stages.length}`
                    : `${passedCount}/${activeStage.requirements.length} GOALS`}
                </span>
                <span className="text-[#263040]">·</span>
                <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                  {errorViolations.length > 0
                    ? `${errorViolations.length} Network Violation!`
                    : activeStage.title}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMissionExpandedMobile((prev) => !prev);
                }}
                className="sm:hidden flex items-center gap-1 text-[11px] font-medium text-[#F59E0B] shrink-0 px-1.5 py-0.5 rounded bg-[#151B23] border border-[#263040]"
              >
                <span>{isMissionExpandedMobile ? 'Hide' : 'Details'}</span>
                {isMissionExpandedMobile ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>

            {/* Expandable Body */}
            <div
              className={`${
                isMissionExpandedMobile ? 'block' : 'hidden'
              } sm:block px-3 pb-3 pt-2.5 sm:px-4 sm:pb-4 sm:pt-3 space-y-2.5 max-h-[52dvh] sm:max-h-[70dvh] overflow-y-auto`}
            >
              {/* Multi-Stage Stepper Dots for Campaign Levels (11-60) */}
              {stages.length > 1 && (
                <div className="flex items-center gap-1.5 pb-1">
                  {stages.map((st, idx) => {
                    const isDone = idx < currentStageIdx;
                    const isCurrent = idx === currentStageIdx;
                    return (
                      <div
                        key={st.stageNumber}
                        className={`flex-1 h-1.5 rounded-sm transition-colors ${
                          isDone
                            ? 'bg-[#10B981]'
                            : isCurrent
                            ? 'bg-[#F59E0B]'
                            : 'bg-[#263040]'
                        }`}
                        title={st.title}
                      />
                    );
                  })}
                </div>
              )}

              {/* Live SLA Telemetry Bar inside Mission Card */}
              <div className="grid grid-cols-3 gap-1.5 p-2 rounded bg-[#0F141A] border border-[#263040] font-mono text-[10px]">
                <div>
                  <div className="text-[#64748B]">p99 LATENCY</div>
                  <div
                    className={`font-bold text-xs ${
                      liveTelemetry.latencyMs <= 85 ? 'text-[#10B981]' : 'text-[#F59E0B]'
                    }`}
                  >
                    {liveTelemetry.latencyMs}ms
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B]">CAPACITY</div>
                  <div className="font-bold text-xs text-[#38BDF8]">
                    {liveTelemetry.capacityRps} RPS
                  </div>
                </div>
                <div>
                  <div className="text-[#64748B]">CLOUD BILL</div>
                  <div className="font-bold text-xs text-[#F8FAFC]">
                    ${liveTelemetry.monthlyCostUsd}/mo
                  </div>
                </div>
              </div>

              {/* Plain-English Live Failure Diagnosis Alert (When player wires an invalid route!) */}
              {errorViolations.length > 0 && (
                <div className="p-2.5 rounded-md bg-[#EF4444]/15 border border-[#EF4444] space-y-1.5">
                  {errorViolations.map((v) => (
                    <div key={v.id} className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#FCA5A5]">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                        <span>{v.title}</span>
                      </div>
                      <p className="text-[11px] text-[#F8FAFC] leading-snug">
                        {v.plainEnglishReason}
                      </p>
                      <p className="text-[11px] text-[#F59E0B] font-medium leading-snug">
                        Fix: {v.howToFix}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Stage Incident Brief */}
              <p className="text-xs text-[#E2E8F0] leading-relaxed">
                {activeStage.incidentAlert}
              </p>

              {/* For Tutorials (Levels 1-10): Show direct checklist.
                  For Campaign Missions (Levels 11-60): Show investigative goal + 3-Tier Progressive Hints */}
              {isTutorialLevel ? (
                <div className="pt-2 border-t border-[#263040] space-y-1.5">
                  {requirementResults.map(({ req, passed }) => (
                    <div
                      key={req.id}
                      className="flex items-start gap-2 text-xs leading-snug"
                    >
                      {passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-[#64748B] shrink-0 mt-0.5" />
                      )}
                      <span
                        className={
                          passed ? 'text-[#94A3B8] line-through' : 'text-[#F8FAFC]'
                        }
                      >
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-2 border-t border-[#263040] space-y-2">
                  <div className="p-2.5 rounded bg-[#0F141A] border border-[#263040]">
                    <div className="text-[10px] font-mono uppercase text-[#38BDF8] font-bold mb-0.5">
                      STAGE {activeStage.stageNumber} GOAL
                    </div>
                    <div className="text-xs text-[#F8FAFC] font-medium leading-snug">
                      {activeStage.objectiveSummary}
                    </div>
                    <div className="mt-1.5 text-[11px] font-mono text-[#10B981]">
                      Readiness: {passedCount}/{activeStage.requirements.length} checks verified
                    </div>
                  </div>
                </div>
              )}

              {/* 3-Tier Progressive Hint Discovery System */}
              <div className="pt-2 border-t border-[#263040] flex items-center justify-between gap-2">
                <button
                  onClick={() => setRevealedHints((h) => (h >= 3 ? 0 : h + 1))}
                  className="text-[11px] font-semibold text-[#F59E0B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>
                    {revealedHints === 0
                      ? 'Reveal Clue (0/3)'
                      : revealedHints < 3
                      ? `Reveal Next Clue (${revealedHints}/3)`
                      : 'Hide Clues (3/3)'}
                  </span>
                </button>

                <button
                  onClick={() => setIsStoryboardOpen(true)}
                  className="text-[11px] font-medium text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Story Comic</span>
                </button>
              </div>

              {revealedHints > 0 && (
                <div className="p-2.5 rounded bg-[#0F141A] border border-[#F59E0B]/40 text-[11px] text-[#CBD5E1] leading-relaxed space-y-2">
                  {activeStage.hints.slice(0, revealedHints).map((hintText, idx) => (
                    <div key={idx} className="border-l-2 border-[#F59E0B] pl-2">
                      <span className="font-mono text-[10px] text-[#F59E0B] font-bold block">
                        CLUE {idx + 1} OF 3:
                      </span>
                      <span>{hintText}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Contextual Right-Hand Inspector Drawer */}
          <InspectorDrawer
            component={selectedComponent}
            connections={diagnostics.updatedConnections}
            allComponents={archState.components}
            inspectorMode={inspectorMode}
            activeCoachStep={activeCoachStep}
            onClose={() => setSelectedComponentId(null)}
            onUpdateConfig={handleUpdateConfig}
            onDeleteComponent={handleDeleteComponent}
            onDeleteConnection={handleDeleteConnection}
            onConnectTo={handleConnectFromInspector}
          />

          {/* Collapsible Diagnostic Log Drawer */}
          <TerminalDrawer
            isOpen={isTerminalOpen}
            logs={logs}
            onClose={() => setIsTerminalOpen(false)}
            onClear={() => setLogs([])}
          />

          {/* Zone 3: Bottom Hardware Dock & Coach Banner */}
          <BottomDock
            toolMode={toolMode}
            selectedPaletteType={selectedPaletteType}
            allowedPalette={effectivePalette}
            isSimulating={isSimulating}
            terminalOpen={isTerminalOpen}
            unreadErrors={unreadErrors}
            activeCoachStep={activeCoachStep}
            showIacButton={currentLevel.id >= 10}
            onSelectTool={(mode, type) => {
              setToolMode(mode);
              setSelectedPaletteType(type || null);
            }}
            onSimulate={handleSimulate}
            onReset={() => handleLoadLevel(currentLevel.id, false)}
            onOpenIac={() => setIsIacOpen(true)}
            onToggleTerminal={() => {
              setIsTerminalOpen((o) => !o);
              setUnreadErrors(0);
            }}
          />
        </>
      )}

      {/* Modals */}
      <StoryboardModal
        isOpen={isStoryboardOpen}
        level={currentLevel}
        onClose={() => setIsStoryboardOpen(false)}
      />

      <LevelSelectModal
        isOpen={isLevelSelectOpen}
        currentLevelId={currentLevel.id}
        completedLevels={progress.completedLevels}
        levelStars={progress.levelStars}
        onSelectLevel={(id) => {
          setScreen('playing');
          handleLoadLevel(id, true);
        }}
        onClose={() => setIsLevelSelectOpen(false)}
      />

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      <IacViewerModal
        isOpen={isIacOpen}
        level={currentLevel}
        state={archState}
        onClose={() => setIsIacOpen(false)}
      />

      {isConceptOpen && currentLevel.conceptCard && (
        <ConceptCardModal
          card={currentLevel.conceptCard}
          levelNumber={currentLevel.id}
          onClose={() => setIsConceptOpen(false)}
        />
      )}

      <VictoryModal
        isOpen={isVictoryOpen}
        level={currentLevel}
        stars={3}
        onReplay={() => setIsVictoryOpen(false)}
        onNextLevel={() => {
          setIsVictoryOpen(false);
          if (currentLevel.id < 130) {
            handleLoadLevel(currentLevel.id + 1, true);
          }
        }}
      />

      <PWAInstallModal
        isOpen={isPWAInstallOpen}
        onClose={() => setIsPWAInstallOpen(false)}
      />
    </div>
  );
}
