/**
 * Objective evaluation. Levels describe goals as data (see `ObjectiveRule`); this file is the only
 * place that decides whether a goal is met, and it always explains why in plain English.
 */

import { zoneSpec } from './board';
import { CATALOG } from './catalog';
import { sourceCidrOf } from './rules/connection';
import { cidrContains, portMatches } from './cidr';
import type { Board, BoardAnalysis, Objective, ObjectiveResult, ServiceType } from './types';

const label = (type: ServiceType) => CATALOG[type].shortLabel;

function pathVisits(typesOnPath: ServiceType[], through: ServiceType[]): boolean {
  let i = 0;
  for (const t of typesOnPath) {
    if (t === through[i]) i++;
    if (i === through.length) return true;
  }
  return through.length === 0;
}

function evaluate(objective: Objective, board: Board, analysis: BoardAnalysis): { passed: boolean; detail: string } {
  const blocks = new Map(board.blocks.map((b) => [b.id, b]));
  const reached = new Set(analysis.trace.reached);

  switch (objective.kind) {
    case 'place': {
      const want = objective.count ?? 1;
      const matching = board.blocks.filter(
        (b) =>
          b.type === objective.type &&
          b.fault !== 'crashed' &&
          (!objective.zone || analysis.zones[b.id] === objective.zone)
      );
      const where = objective.zone ? ` in the ${zoneSpec(objective.zone).label}` : '';
      return {
        passed: matching.length >= want,
        detail: `${Math.min(matching.length, want)}/${want} ${label(objective.type)}${where}`,
      };
    }

    case 'maxCount': {
      const n = board.blocks.filter((b) => b.type === objective.type && b.fault !== 'crashed').length;
      return {
        passed: n <= objective.max,
        detail: `${n} ${label(objective.type)} on the board (max ${objective.max})`,
      };
    }

    case 'wire': {
      const want = objective.count ?? 1;
      const n = analysis.links.filter((l) => {
        if (!l.allowed) return false;
        const from = blocks.get(l.fromId)?.type;
        const to = blocks.get(l.toId)?.type;
        return (from === objective.a && to === objective.b) || (from === objective.b && to === objective.a);
      }).length;
      return {
        passed: n >= want,
        detail: `${Math.min(n, want)}/${want} working ${label(objective.a)} ↔ ${label(objective.b)} wire${want > 1 ? 's' : ''}`,
      };
    }

    case 'path': {
      const route = objective.through.map(label).join(' → ');
      const ok = analysis.trace.paths.some((p) => {
        if (!p.ok || p.hops.length === 0) return false;
        const types = [p.hops[0].fromId, ...p.hops.map((h) => h.toId)]
          .map((id) => blocks.get(id)?.type)
          .filter((t): t is ServiceType => t !== undefined);
        return pathVisits(types, objective.through);
      });
      return { passed: ok, detail: ok ? `Traffic flows ${route}` : `No working route ${route} yet` };
    }

    case 'reach': {
      const want = objective.count ?? 1;
      const n = board.blocks.filter((b) => b.type === objective.type && reached.has(b.id) && b.fault !== 'crashed').length;
      return {
        passed: n >= want,
        detail: `Traffic reaches ${Math.min(n, want)}/${want} ${label(objective.type)}`,
      };
    }

    case 'azSpread': {
      const azs = new Set(
        board.blocks
          .filter((b) => b.type === objective.type && reached.has(b.id) && b.fault !== 'crashed')
          .map((b) => analysis.azs[b.id])
          .filter((az) => az !== 'global')
      );
      return {
        passed: azs.size >= 2,
        detail: azs.size >= 2
          ? `${label(objective.type)} serving from ${[...azs].sort().join(' and ')}`
          : `Working ${label(objective.type)} in ${azs.size} Availability Zone${azs.size === 1 ? '' : 's'} (need 2)`,
      };
    }

    case 'config': {
      const ofType = board.blocks.filter((b) => b.type === objective.type);
      const ok = ofType.length > 0 && ofType.every((b) => b.config[objective.key] === objective.equals);
      return {
        passed: ok,
        detail: ok
          ? `${label(objective.type)} ${objective.key} is set`
          : `${label(objective.type)} ${objective.key} should be ${String(objective.equals)}`,
      };
    }

    case 'firewall': {
      const internet = sourceCidrOf({ id: '', type: 'client', name: '', gridX: -6, gridZ: 0, config: {} });
      const open = board.blocks.some(
        (b) =>
          b.type === objective.type &&
          (b.config.securityGroupInbound === undefined ||
            b.config.securityGroupInbound.some(
              (r) => (r.protocol === 'tcp' || r.protocol === 'all') && portMatches(r.port, objective.port) && cidrContains(r.source, internet)
            ))
      );
      const passed = open === objective.open;
      return {
        passed,
        detail: `Port ${objective.port} on ${label(objective.type)} is ${open ? 'open' : 'closed'} to the internet`,
      };
    }

    case 'removed': {
      const left = objective.ids.filter((id) => blocks.has(id));
      return {
        passed: left.length === 0,
        detail: left.length === 0 ? 'Removed' : `${left.map((id) => blocks.get(id)?.name ?? id).join(', ')} still on the board`,
      };
    }

    case 'apart': {
      const joined = analysis.links.filter((l) => {
        if (!l.allowed) return false;
        const from = blocks.get(l.fromId)?.type;
        const to = blocks.get(l.toId)?.type;
        return (from === objective.a && to === objective.b) || (from === objective.b && to === objective.a);
      });
      return {
        passed: joined.length === 0,
        detail: joined.length === 0 ? 'Not connected' : `${joined.length} wire${joined.length > 1 ? 's' : ''} still join them`,
      };
    }

    case 'sla': {
      const t = analysis.telemetry;
      const misses: string[] = [];
      const hits: string[] = [];
      const check = (ok: boolean, text: string) => (ok ? hits : misses).push(text);
      if (!analysis.trace.served) misses.push('no traffic is getting through');
      if (objective.maxLatencyMs !== undefined)
        check(analysis.trace.served && t.latencyMs <= objective.maxLatencyMs, `latency ${t.latencyMs}ms (target ≤ ${objective.maxLatencyMs}ms)`);
      if (objective.minCapacityRps !== undefined)
        check(t.capacityRps >= objective.minCapacityRps, `capacity ${t.capacityRps} req/s (target ≥ ${objective.minCapacityRps})`);
      if (objective.maxCostUsd !== undefined)
        check(t.monthlyCostUsd <= objective.maxCostUsd, `cost $${t.monthlyCostUsd}/mo (budget $${objective.maxCostUsd})`);
      if (objective.minSecurityScore !== undefined)
        check(t.securityScore >= objective.minSecurityScore, `security ${t.securityScore}/100 (target ≥ ${objective.minSecurityScore})`);
      if (objective.maxErrorRatePercent !== undefined)
        check(t.errorRatePercent <= objective.maxErrorRatePercent, `errors ${t.errorRatePercent}% (target ≤ ${objective.maxErrorRatePercent}%)`);
      return {
        passed: misses.length === 0,
        detail: misses.length === 0 ? hits.join(' · ') : misses.join(' · '),
      };
    }
  }
}

export function evaluateObjectives(objectives: readonly Objective[], board: Board, analysis: BoardAnalysis): ObjectiveResult[] {
  return objectives.map((o) => ({ id: o.id, label: o.label, hint: o.hint, ...evaluate(o, board, analysis) }));
}
