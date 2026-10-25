/** FinOps rules: paying for things that do no work. */

import { blockCost, CATALOG } from '../catalog';
import type { Block, LevelSpec, ServiceType, Violation, Wire } from '../types';

export function checkIdle(blocks: readonly Block[], wires: readonly Wire[]): Violation[] {
  const wired = new Set<string>();
  for (const w of wires) {
    wired.add(w.a);
    wired.add(w.b);
  }

  const out: Violation[] = [];
  for (const block of blocks) {
    const spec = CATALOG[block.type];
    if (spec.tier === 'internet' || block.fault === 'crashed' || wired.has(block.id)) continue;
    const cost = blockCost(block.type, block.config);
    if (cost <= 0) continue;
    out.push({
      id: `idle:${block.id}`,
      code: 'finops.idle',
      severity: 'error',
      title: `Idle ${spec.shortLabel} wasting $${cost}/mo`,
      reason: `"${block.name}" isn't wired to anything, so it does no work — but AWS still bills $${cost} every month.`,
      fix: `Wire "${block.name}" into your architecture, or delete it.`,
      blockId: block.id,
    });
  }
  return out;
}

export function checkLimits(blocks: readonly Block[], limits: LevelSpec['limits']): Violation[] {
  const maxOfType = limits?.maxOfType;
  if (!maxOfType) return [];

  const out: Violation[] = [];
  for (const [type, max] of Object.entries(maxOfType) as [ServiceType, number][]) {
    const ofType = blocks.filter((b) => b.type === type && b.fault !== 'crashed');
    if (ofType.length <= max) continue;
    const spec = CATALOG[type];
    const total = ofType.reduce((s, b) => s + blockCost(b.type, b.config), 0);
    const extra = ofType[ofType.length - 1];
    out.push({
      id: `limit:${type}`,
      code: 'finops.over_limit',
      severity: 'error',
      title: `Over-provisioned: ${ofType.length} ${spec.shortLabel} ($${total}/mo)`,
      reason: `This workload only needs ${max} ${spec.shortLabel}. Every extra one is money spent on nothing.`,
      fix: `Delete ${ofType.length - max} ${spec.shortLabel} so only ${max} remain${max === 1 ? 's' : ''}.`,
      blockId: extra.id,
    });
  }
  return out;
}
