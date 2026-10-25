/** What the board should spotlight: coach targets, target tiles, and where the last test failed. */

import type { CoachStep, LevelSpec, Session, TargetPlacement, TestReport } from '../../engine';
import type { SceneCallout } from '../../render';

export function isReportCurrent(report: TestReport | null, session: Session | null): report is TestReport {
  return !!report && !!session && report.version === session.version && report.stageIdx === session.stageIdx && report.levelId === session.levelId;
}

/** Target tiles that still need their block. */
export function openTargets(level: LevelSpec, session: Session): TargetPlacement[] {
  return (level.targetPlacements ?? []).filter(
    (t) => !session.board.blocks.some((b) => b.gridX === t.gridX && b.gridZ === t.gridZ && b.type === t.type),
  );
}

export interface FailureFocus {
  highlightIds: string[];
  callouts: SceneCallout[];
}

const MAX_CALLOUTS = 3;

/** Where the last failed test broke: the exact hops where packets stopped, then block-level violations. */
export function failureFocus(report: TestReport): FailureFocus {
  if (report.stagePassed) return { highlightIds: [], callouts: [] };
  const highlightIds = new Set<string>();
  const callouts: SceneCallout[] = [];
  const seen = new Set<string>();

  for (const path of report.analysis.trace.paths) {
    const drop = path.hops.find((h) => !h.ok);
    if (!drop || seen.has(drop.wireId)) continue;
    seen.add(drop.wireId);
    highlightIds.add(drop.wireId);
    highlightIds.add(drop.toId);
    const [title, ...rest] = (drop.dropReason ?? 'Blocked').split(': ');
    if (callouts.length < MAX_CALLOUTS) {
      callouts.push({ key: `drop:${drop.wireId}`, title, body: rest.join(': ') || title, tone: 'error', wireId: drop.wireId });
    }
  }

  for (const v of report.blockingViolations) {
    if (v.wireId && seen.has(v.wireId)) continue;
    const key = v.wireId ? `v:${v.wireId}` : v.blockId ? `v:${v.blockId}` : null;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (v.wireId) highlightIds.add(v.wireId);
    if (v.blockId) highlightIds.add(v.blockId);
    if (callouts.length < MAX_CALLOUTS) {
      callouts.push({ key, title: v.title, body: v.fix, tone: v.severity === 'error' ? 'error' : 'warning', wireId: v.wireId, blockId: v.wireId ? undefined : v.blockId });
    }
  }
  return { highlightIds: [...highlightIds], callouts };
}

/** A coach step that points at a block on the board ("block:ec2-1"). */
export function coachBlockId(step: CoachStep | null): string | null {
  return step?.target?.startsWith('block:') ? step.target.slice('block:'.length) : null;
}
