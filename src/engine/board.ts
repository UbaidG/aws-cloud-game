/**
 * Board geometry: grid bounds, zones, subnets, availability zones and world coordinates.
 * The renderer must use these instead of hard-coding numbers.
 */

import type { AvailabilityZone, Zone } from './types';

export const BOARD = {
  minX: -7,
  maxX: 7,
  minZ: -3,
  maxZ: 3,
  /** World units per grid tile. */
  tileSize: 1.4,
} as const;

export interface ZoneSpec {
  id: Zone;
  label: string;
  sublabel: string;
  /** Inclusive grid-X range. */
  minX: number;
  maxX: number;
  /** Address range traffic from this zone appears to come from. */
  cidr: string;
  color: string;
}

export const ZONES: readonly ZoneSpec[] = [
  {
    id: 'external',
    label: 'Internet',
    sublabel: 'Users & the outside world',
    minX: -7,
    maxX: -5,
    cidr: '203.0.113.0/24',
    color: '#38BDF8',
  },
  {
    id: 'edge',
    label: 'Edge / DNS',
    sublabel: 'Route 53 · CloudFront · WAF · IGW',
    minX: -4,
    maxX: -2,
    cidr: '198.51.100.0/24',
    color: '#14B8A6',
  },
  {
    id: 'public',
    label: 'Public Subnet',
    sublabel: 'Load balancers · Web servers',
    minX: -1,
    maxX: 2,
    cidr: '10.0.1.0/24',
    color: '#10B981',
  },
  {
    id: 'private',
    label: 'Private Subnet',
    sublabel: 'Databases · Internal services',
    minX: 3,
    maxX: 7,
    cidr: '10.0.2.0/24',
    color: '#818CF8',
  },
];

export const VPC_CIDR = '10.0.0.0/16';

export function zoneAt(gridX: number): Zone {
  for (const z of ZONES) {
    if (gridX >= z.minX && gridX <= z.maxX) return z.id;
  }
  return gridX < BOARD.minX ? 'external' : 'private';
}

export function zoneSpec(zone: Zone): ZoneSpec {
  const spec = ZONES.find((z) => z.id === zone);
  if (!spec) throw new Error(`Unknown zone ${zone}`);
  return spec;
}

export function isInsideVpc(zone: Zone): boolean {
  return zone === 'public' || zone === 'private';
}

/** The back half of the board is AZ "a", the front half is AZ "b". Outside the VPC is global. */
export function azAt(gridX: number, gridZ: number): AvailabilityZone {
  if (!isInsideVpc(zoneAt(gridX))) return 'global';
  return gridZ <= 0 ? 'us-east-1a' : 'us-east-1b';
}

export function inBounds(gridX: number, gridZ: number): boolean {
  return (
    Number.isInteger(gridX) &&
    Number.isInteger(gridZ) &&
    gridX >= BOARD.minX &&
    gridX <= BOARD.maxX &&
    gridZ >= BOARD.minZ &&
    gridZ <= BOARD.maxZ
  );
}

export function gridToWorld(gridX: number, gridZ: number): { x: number; z: number } {
  return { x: gridX * BOARD.tileSize, z: gridZ * BOARD.tileSize };
}

export function worldToGrid(x: number, z: number): { gridX: number; gridZ: number } {
  return { gridX: Math.round(x / BOARD.tileSize), gridZ: Math.round(z / BOARD.tileSize) };
}
