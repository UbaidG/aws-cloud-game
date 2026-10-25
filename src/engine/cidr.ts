/** Minimal IPv4 CIDR helpers for security group matching. */

import { VPC_CIDR } from './board';

interface ParsedCidr {
  base: number;
  bits: number;
}

function parse(cidr: string): ParsedCidr | null {
  const normalized = cidr.trim().toLowerCase() === 'vpc' ? VPC_CIDR : cidr.trim();
  const [ip, bitsRaw] = normalized.split('/');
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return null;
  }
  const bits = bitsRaw === undefined ? 32 : Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return null;
  const base = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  return { base, bits };
}

function mask(bits: number): number {
  return bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
}

/** True when every address in `inner` is also inside `outer`. */
export function cidrContains(outer: string, inner: string): boolean {
  const o = parse(outer);
  const i = parse(inner);
  if (!o || !i) return false;
  if (i.bits < o.bits) return false;
  const m = mask(o.bits);
  return (o.base & m) === (i.base & m);
}

export function isValidCidr(cidr: string): boolean {
  return parse(cidr) !== null;
}

/** True when a firewall rule's `port` value covers `port`. */
export function portMatches(rulePort: number | string, port: number): boolean {
  if (typeof rulePort === 'number') return rulePort === port;
  const raw = rulePort.trim().toLowerCase();
  if (raw === 'all' || raw === '*' || raw === '-1') return true;
  if (raw.includes('-')) {
    const [lo, hi] = raw.split('-').map(Number);
    return Number.isFinite(lo) && Number.isFinite(hi) && port >= lo && port <= hi;
  }
  return Number(raw) === port;
}
