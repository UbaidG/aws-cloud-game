/**
 * Traffic tracer: follows real requests from Internet Users through the legal request links
 * and records every hop, so the renderer can animate exactly what the engine decided.
 */

import { CATALOG } from './catalog';
import type { Block, Hop, LinkResult, TrafficPath, TrafficTrace, Violation } from './types';

const MAX_PATHS = 64;
const MAX_DEPTH = 12;

/** Share of reads a cache answers without touching the slower thing behind it. */
export const CACHE_HIT_RATIO = 0.8;
/** Slow lookups a Redis cache can answer instead: database reads and repeated model predictions. */
const CACHE_TARGETS = new Set(['rds', 'dynamodb', 'redshift', 'sagemaker']);
const READ_REPLICA_FACTOR = 0.7;

/**
 * Latency a request pays at `block`, given the path so far.
 * A CDN in front serves most requests from cache; a Redis cache beside a database skips most DB reads.
 */
export function hopLatency(block: Block, pathSoFar: readonly Block[], cachedDbCallers: ReadonlySet<string>): number {
  // Behind a queue or stream the user already has their answer; the rest happens in the background.
  if (pathSoFar.some((b) => CATALOG[b.type].tier === 'async')) return 0;
  let ms = CATALOG[block.type].latencyMs;
  if (block.type === 'rds' && block.config.readReplica) ms *= READ_REPLICA_FACTOR;

  const caller = pathSoFar[pathSoFar.length - 1];
  if (caller && CACHE_TARGETS.has(block.type) && cachedDbCallers.has(caller.id)) {
    ms *= 1 - CACHE_HIT_RATIO;
  }
  if (pathSoFar.some((b) => b.type === 'cloudfront')) {
    ms *= 1 - CACHE_HIT_RATIO;
  }
  return ms;
}

export function traceTraffic(
  blocks: ReadonlyMap<string, Block>,
  links: readonly LinkResult[],
  violations: readonly Violation[]
): TrafficTrace {
  // Targets Route 53 has failed over from get no requests at all.
  const requestLinks = links.filter((l) => l.kind === 'request' && l.violationCode !== 'dns.failed_over');
  const outgoing = new Map<string, LinkResult[]>();
  for (const link of requestLinks) {
    const list = outgoing.get(link.fromId) ?? [];
    list.push(link);
    outgoing.set(link.fromId, list);
  }

  const violationByWire = new Map<string, Violation>();
  for (const v of violations) {
    if (v.wireId && !violationByWire.has(v.wireId)) violationByWire.set(v.wireId, v);
  }

  // Compute blocks with a working Redis cache beside them serve most DB reads from memory.
  const cachedDbCallers = new Set<string>();
  for (const link of requestLinks) {
    const to = blocks.get(link.toId);
    if (link.allowed && to?.type === 'redis' && to.fault !== 'crashed') cachedDbCallers.add(link.fromId);
  }

  const paths: TrafficPath[] = [];
  const clients = [...blocks.values()].filter((b) => b.type === 'client');

  const walk = (current: Block, visited: Block[], hops: Hop[], latency: number) => {
    if (paths.length >= MAX_PATHS) return;
    const next = (outgoing.get(current.id) ?? []).filter((l) => !visited.some((v) => v.id === l.toId));

    if (next.length === 0 || hops.length >= MAX_DEPTH) {
      if (hops.length > 0) paths.push({ hops, ok: true, latencyMs: Math.round(latency) });
      return;
    }

    for (const link of next) {
      const to = blocks.get(link.toId);
      if (!to) continue;
      if (!link.allowed) {
        const violation = violationByWire.get(link.wireId);
        const drop: Hop = {
          wireId: link.wireId,
          fromId: link.fromId,
          toId: link.toId,
          ok: false,
          dropReason: violation ? `${violation.title}: ${violation.reason}` : 'Blocked.',
          dropCode: violation?.code ?? link.violationCode,
          latencyMs: 0,
        };
        paths.push({ hops: [...hops, drop], ok: false, latencyMs: Math.round(latency) });
        continue;
      }
      const ms = hopLatency(to, visited, cachedDbCallers);
      const hop: Hop = { wireId: link.wireId, fromId: link.fromId, toId: link.toId, ok: true, latencyMs: Math.round(ms) };
      walk(to, [...visited, to], [...hops, hop], latency + ms);
    }
  };

  for (const client of clients) walk(client, [client], [], 0);

  const reached = new Set<string>();
  const syncReached = new Set<string>();
  for (const path of paths) {
    let sync = true;
    for (const hop of path.hops) {
      if (!hop.ok) break;
      reached.add(hop.fromId);
      reached.add(hop.toId);
      if (sync) {
        syncReached.add(hop.fromId);
        syncReached.add(hop.toId);
      }
      if (CATALOG[blocks.get(hop.toId)?.type ?? 'client'].tier === 'async') sync = false;
    }
  }
  // Disks and NAT are in service when the block they hang off is. A governance service (CloudWatch,
  // IAM…) is in service when anything it governs is, and so is an SNS topic receiving its alarms.
  const sideLinks = links.filter((l) => l.kind !== 'request' && l.allowed);
  for (let changed = true; changed; ) {
    changed = false;
    for (const link of sideLinks) {
      const both = link.kind === 'governance' && CATALOG[blocks.get(link.fromId)?.type ?? 'client'].tier === 'async';
      if (reached.has(link.fromId) && !reached.has(link.toId)) {
        reached.add(link.toId);
        changed = true;
      } else if (both && reached.has(link.toId) && !reached.has(link.fromId)) {
        reached.add(link.fromId);
        changed = true;
      }
    }
  }

  return {
    paths,
    reached: [...reached],
    syncReached: [...syncReached],
    served: paths.some((p) => p.ok),
  };
}
