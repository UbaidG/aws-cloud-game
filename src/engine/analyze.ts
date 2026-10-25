/**
 * analyzeBoard(): the one function that answers "what is true about this board right now?"
 * Placement, wiring, firewall, FinOps, traffic, telemetry and health all come from here.
 */

import { azAt, zoneAt } from './board';
import { CATALOG } from './catalog';
import { evaluateWire, findConsumers } from './rules/connection';
import { checkIdle, checkLimits } from './rules/finops';
import { checkPlacement } from './rules/placement';
import { checkSecurity } from './rules/security';
import { computeTelemetry } from './telemetry';
import { traceTraffic } from './traffic';
import type {
  AvailabilityZone,
  Board,
  BoardAnalysis,
  Health,
  LevelSpec,
  LinkResult,
  LoadProfile,
  Violation,
  Zone,
} from './types';

export interface AnalyzeOptions {
  limits?: LevelSpec['limits'];
  load?: LoadProfile;
}

export function analyzeBoard(board: Board, options: AnalyzeOptions = {}): BoardAnalysis {
  const blocks = new Map(board.blocks.map((b) => [b.id, b]));
  const violations: Violation[] = [];

  const zones: Record<string, Zone> = {};
  const azs: Record<string, AvailabilityZone> = {};
  for (const block of board.blocks) {
    zones[block.id] = zoneAt(block.gridX);
    azs[block.id] = azAt(block.gridX, block.gridZ);
    const placement = checkPlacement(block);
    if (placement) violations.push(placement);
  }

  const consumers = findConsumers(blocks, board.wires);
  const links: LinkResult[] = [];
  for (const wire of board.wires) {
    const { link, violation } = evaluateWire(wire, blocks, consumers);
    links.push(link);
    if (violation) violations.push(violation);
  }

  // An EBS volume is a disk: it plugs into exactly one server.
  const attachmentsByDisk = new Map<string, LinkResult[]>();
  for (const link of links) {
    if (link.kind !== 'attachment' || !link.allowed) continue;
    attachmentsByDisk.set(link.toId, [...(attachmentsByDisk.get(link.toId) ?? []), link]);
  }
  for (const [diskId, attached] of attachmentsByDisk) {
    if (attached.length <= 1) continue;
    const disk = blocks.get(diskId);
    for (const extra of attached.slice(1)) {
      extra.allowed = false;
      extra.violationCode = 'link.ebs_multi_attach';
      violations.push({
        id: `wire:${extra.wireId}`,
        code: 'link.ebs_multi_attach',
        severity: 'error',
        title: 'EBS volume attached to two servers',
        reason: `"${disk?.name ?? diskId}" is a single disk and can only plug into one EC2 instance at a time.`,
        fix: 'Give each server its own EBS volume, or use EFS for a folder many servers share.',
        wireId: extra.wireId,
        blockId: diskId,
      });
    }
  }

  // An EBS volume lives in one Availability Zone and only attaches to servers in that zone.
  for (const link of links) {
    if (link.kind !== 'attachment' || !link.allowed) continue;
    const disk = blocks.get(link.toId);
    const server = blocks.get(link.fromId);
    if (disk?.type !== 'ebs' || !server || azs[disk.id] === azs[server.id]) continue;
    link.allowed = false;
    link.violationCode = 'link.ebs_cross_az';
    violations.push({
      id: `wire:${link.wireId}`,
      code: 'link.ebs_cross_az',
      severity: 'error',
      title: 'EBS volume in the wrong Availability Zone',
      reason: `"${disk.name}" is in ${azs[disk.id]} but "${server.name}" is in ${azs[server.id]}. A volume only attaches to servers in its own zone.`,
      fix: 'Give the server a volume in its own zone (restore one from a snapshot to move data across), or use EFS, which spans zones.',
      wireId: link.wireId,
      blockId: disk.id,
    });
  }

  // Route 53 with health checks (any policy but simple) stops answering with a target that's down,
  // as long as there's a healthy one to send users to instead.
  for (const link of links) {
    if (link.violationCode !== 'link.crashed') continue;
    const dns = blocks.get(link.fromId);
    if (dns?.type !== 'route53' || (dns.config.routingPolicy ?? 'simple') === 'simple') continue;
    const healthy = links.some((l) => l.fromId === dns.id && l.kind === 'request' && l.allowed);
    if (!healthy) continue;
    const i = violations.findIndex((v) => v.code === 'link.crashed' && v.wireId === link.wireId);
    const dead = blocks.get(link.toId);
    link.violationCode = 'dns.failed_over';
    const failedOver: Violation = {
      id: `wire:${link.wireId}`,
      code: 'dns.failed_over',
      severity: 'warning',
      title: 'Route 53 failed over',
      reason: `"${dead?.name ?? link.toId}" failed its health check, so Route 53 sends users to the healthy target instead.`,
      fix: `Replace "${dead?.name ?? link.toId}" when you can, so you have a standby again.`,
      wireId: link.wireId,
      blockId: link.toId,
    };
    if (i >= 0) violations[i] = failedOver;
  }

  violations.push(...checkIdle(board.blocks, board.wires));
  violations.push(...checkLimits(board.blocks, options.limits));

  const trace = traceTraffic(blocks, links, violations);
  const security = checkSecurity(board.blocks, trace, options.load);
  violations.push(...security.violations);
  const telemetry = computeTelemetry(blocks, trace, security.findings, options.load);

  const reached = new Set(trace.reached);
  const wired = new Set(board.wires.flatMap((w) => [w.a, w.b]));
  const overloaded = telemetry.demandRps > telemetry.capacityRps && telemetry.capacityRps > 0;

  const health: Record<string, Health> = {};
  for (const block of board.blocks) {
    const tier = CATALOG[block.type].tier;
    if (block.fault === 'crashed') health[block.id] = 'down';
    else if (tier === 'internet') health[block.id] = 'healthy';
    else if (!wired.has(block.id)) health[block.id] = 'idle';
    else if (!reached.has(block.id)) health[block.id] = CATALOG[block.type].background ? 'healthy' : 'unreachable';
    else if (overloaded && tier === 'compute') health[block.id] = 'overloaded';
    else health[block.id] = 'healthy';

    if (health[block.id] === 'unreachable' && trace.served && tier !== 'control') {
      violations.push({
        id: `unreachable:${block.id}`,
        code: 'flow.unreachable',
        severity: 'warning',
        title: `No traffic reaches ${block.name}`,
        reason: `"${block.name}" is wired up, but no request from Internet Users ever gets to it.`,
        fix: `Check the wires on the way to "${block.name}" — one of them is missing or blocked.`,
        blockId: block.id,
      });
    }
  }

  return { zones, azs, links, violations, trace, telemetry, health };
}

export function blockingViolations(analysis: BoardAnalysis): Violation[] {
  return analysis.violations.filter((v) => v.severity === 'error');
}
