/** Placement rules: is each block in a zone where that AWS service can actually live? */

import { zoneAt, zoneSpec } from '../board';
import { CATALOG } from '../catalog';
import type { Block, Violation } from '../types';

export function checkPlacement(block: Block): Violation | null {
  const spec = CATALOG[block.type];
  const zone = zoneAt(block.gridX);
  if (spec.zones.includes(zone)) return null;

  const allowed = spec.zones.map((z) => zoneSpec(z).label).join(' or ');
  const here = zoneSpec(zone).label;

  if (spec.tier === 'data' && spec.zones.length === 1 && spec.zones[0] === 'private') {
    return {
      id: `placement:${block.id}`,
      code: 'zone.db_exposed',
      severity: 'error',
      title: `${spec.shortLabel} exposed in the ${here}`,
      reason: `"${block.name}" holds data, so it must be hidden in the Private Subnet where nothing on the internet can reach it.`,
      fix: `Move "${block.name}" into the Private Subnet.`,
      blockId: block.id,
    };
  }

  return {
    id: `placement:${block.id}`,
    code: 'zone.invalid',
    severity: 'error',
    title: `${spec.shortLabel} can't run in the ${here}`,
    reason:
      spec.tier === 'internet'
        ? `"${block.name}" represents people on the internet, so it stays in the Internet zone.`
        : `In AWS, ${spec.name} lives in the ${allowed}, not the ${here}.`,
    fix: `Move "${block.name}" into the ${allowed}.`,
    blockId: block.id,
  };
}
