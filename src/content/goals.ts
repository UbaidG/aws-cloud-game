/** Shorthand goal builders for level recipes. */

import type { BlockConfig, ObjectiveRule, ServiceType, Zone } from '../engine/types';
import type { Goal } from './recipe';

type Sla = Omit<Extract<ObjectiveRule, { kind: 'sla' }>, 'kind'>;

/** A request travels through these services in order, e.g. `path('client alb ec2 rds')`. */
export const path = (through: string, label?: string): Goal => ({
  kind: 'path',
  through: through.trim().split(/\s+/) as ServiceType[],
  label,
});
export const place = (type: ServiceType, zone?: Zone, count?: number): Goal => ({ kind: 'place', type, zone, count });
export const reach = (type: ServiceType, count?: number): Goal => ({ kind: 'reach', type, count });
export const wired = (a: ServiceType, b: ServiceType, count?: number): Goal => ({ kind: 'wire', a, b, count });
export const cfg = <K extends keyof BlockConfig & string>(type: ServiceType, key: K, equals: BlockConfig[K]): Goal => ({
  kind: 'config',
  type,
  key,
  equals,
});
export const firewall = (type: ServiceType, port: number, open: boolean): Goal => ({ kind: 'firewall', type, port, open });
export const apart = (a: ServiceType, b: ServiceType): Goal => ({ kind: 'apart', a, b });
export const removed = (...ids: string[]): Goal => ({ kind: 'removed', ids });
export const atMost = (type: ServiceType, max: number): Goal => ({ kind: 'maxCount', type, max });
export const twoAzs = (type: ServiceType): Goal => ({ kind: 'azSpread', type });
export const sla = (targets: Sla, label?: string): Goal => ({ kind: 'sla', ...targets, label });
