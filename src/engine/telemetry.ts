/**
 * Live telemetry: latency, capacity, error rate, cost and security score.
 * Only blocks that real traffic reaches contribute to performance — an unwired server adds cost, not capacity.
 */

import { blockCost, CATALOG } from './catalog';
import { CACHE_HIT_RATIO } from './traffic';
import type { Block, LoadProfile, SecurityFinding, Telemetry, TrafficTrace } from './types';

export const DEFAULT_LOAD: LoadProfile = { rps: 200, botRps: 0 };

const FILTERS = new Set(['waf', 'apigw']);

export function computeTelemetry(
  blocks: ReadonlyMap<string, Block>,
  trace: TrafficTrace,
  securityFindings: SecurityFinding[],
  load: LoadProfile = DEFAULT_LOAD
): Telemetry {
  const all = [...blocks.values()];
  const reached = new Set(trace.reached);
  const live = all.filter((b) => reached.has(b.id) && b.fault !== 'crashed');
  const has = (type: string) => live.some((b) => b.type === type);

  const monthlyCostUsd = all.reduce((sum, b) => sum + blockCost(b.type, b.config), 0);
  const securityScore = Math.max(0, 100 - securityFindings.reduce((s, f) => s + f.points, 0));

  const okPaths = trace.paths.filter((p) => p.ok);
  const botsFiltered = okPaths.length > 0 && okPaths.every((p) => p.hops.some((h) => FILTERS.has(blocks.get(h.toId)?.type ?? '')));
  const demandRps = load.rps + (botsFiltered ? 0 : load.botRps ?? 0);

  if (!trace.served) {
    return {
      latencyMs: 0,
      capacityRps: 0,
      demandRps,
      errorRatePercent: 100,
      monthlyCostUsd,
      securityScore,
      securityFindings,
    };
  }

  // Capacity: what the compute tier can serve, limited by what the databases behind it can take.
  // Work behind a queue or stream happens later, so it doesn't limit what users see — unless the
  // only compute is the queue's consumers.
  const sync = new Set(trace.syncReached);
  const capOf = (b: Block) => CATALOG[b.type].capacityRps?.(b.config) ?? 0;
  const allCompute = live.filter((b) => CATALOG[b.type].tier === 'compute');
  const syncCompute = allCompute.filter((b) => sync.has(b.id));
  const compute = syncCompute.length > 0 ? syncCompute : allCompute;
  const databases = live.filter((b) => sync.has(b.id) && ['rds', 'dynamodb', 'redshift'].includes(b.type));
  const terminals = live.filter((b) => sync.has(b.id) && CATALOG[b.type].tier === 'data');

  let capacityRps = compute.length > 0
    ? compute.reduce((s, b) => s + capOf(b), 0)
    : terminals.reduce((s, b) => s + capOf(b), 0);

  if (compute.length > 0 && databases.length > 0) {
    const dbCap = databases.reduce((s, b) => s + capOf(b), 0);
    const dbShare = has('redis') ? 1 - CACHE_HIT_RATIO : 1;
    capacityRps = Math.min(capacityRps, dbCap / dbShare);
  }
  if (has('cloudfront')) capacityRps /= 1 - CACHE_HIT_RATIO;
  capacityRps = Math.round(capacityRps);

  // Errors: requests that hit a blocked hop, plus anything beyond capacity. A queue buffers the
  // overload only when the capacity that's short is its consumers', not the servers in front of it.
  const blockedShare = (trace.paths.length - okPaths.length) / trace.paths.length;
  const buffered = has('sqs') && syncCompute.length === 0;
  const overload = capacityRps > 0 && demandRps > capacityRps ? (demandRps - capacityRps) / demandRps : 0;
  const overloadShare = buffered ? 0 : overload;
  const errorRatePercent = Math.round((1 - (1 - blockedShare) * (1 - overloadShare)) * 1000) / 10;

  // Latency: the slowest successful request, slowed further when the system is overloaded.
  let latencyMs = Math.max(...okPaths.map((p) => p.latencyMs));
  if (overload > 0) {
    latencyMs *= buffered ? 1.25 : 1 + (demandRps / Math.max(1, capacityRps) - 1) * 2;
  }
  latencyMs = Math.round(latencyMs);

  return {
    latencyMs,
    capacityRps,
    demandRps,
    errorRatePercent,
    monthlyCostUsd,
    securityScore,
    securityFindings,
  };
}
