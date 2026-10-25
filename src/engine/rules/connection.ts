/**
 * Connection rules: given a wire between two blocks, decide which way requests flow,
 * what kind of link it is, which port it uses, and whether AWS would actually allow it.
 */

import { isInsideVpc, zoneAt, zoneSpec } from '../board';
import { cidrContains, portMatches } from '../cidr';
import { CATALOG, listeningPort } from '../catalog';
import type { Block, LinkKind, LinkResult, ServiceType, Tier, Violation, ViolationCode, Wire } from '../types';

const TIER_RANK: Record<Tier, number> = {
  internet: 0,
  edge: 1,
  entry: 2,
  compute: 3,
  async: 4,
  data: 5,
  egress: 6,
  control: 7,
};

/** Within the edge tier, requests flow DNS → WAF → CDN → API → gateways. */
const EDGE_ORDER: Partial<Record<ServiceType, number>> = {
  route53: 0,
  waf: 1,
  cloudfront: 2,
  apigw: 3,
  igw: 4,
  tgw: 5,
};

/** Within the compute tier, model endpoints sit behind the app code that calls them. */
const COMPUTE_ORDER: Partial<Record<ServiceType, number>> = {
  sagemaker: 5,
};

const ATTACHABLE_TO: Partial<Record<ServiceType, ServiceType[]>> = {
  ebs: ['ec2', 'asg'],
};

export interface WireEvaluation {
  link: LinkResult;
  violation?: Violation;
}

interface Problem {
  code: ViolationCode;
  title: string;
  reason: string;
  fix: string;
}

function rankOf(block: Block): number {
  const spec = CATALOG[block.type];
  const base = TIER_RANK[spec.tier] * 10;
  if (spec.tier === 'edge') return base + (EDGE_ORDER[block.type] ?? 5);
  if (spec.tier === 'compute') return base + (COMPUTE_ORDER[block.type] ?? 0);
  return base;
}

/** Orient a wire so requests flow from the lower tier to the higher one. Ties keep the drawn order. */
export function orient(a: Block, b: Block): [Block, Block] {
  return rankOf(b) < rankOf(a) ? [b, a] : [a, b];
}

/** The address range a request from this block appears to come from. */
export function sourceCidrOf(block: Block): string {
  const spec = CATALOG[block.type];
  if (spec.tier === 'internet') return zoneSpec('external').cidr;
  const zone = zoneAt(block.gridX);
  if (spec.regional || !isInsideVpc(zone)) return zoneSpec('edge').cidr;
  return zoneSpec(zone).cidr;
}

function checkFirewall(from: Block, to: Block, port: number): Problem | null {
  const rules = to.config.securityGroupInbound;
  if (!Array.isArray(rules) || port === 0) return null;
  const toName = `"${to.name}"`;

  if (rules.length === 0) {
    return {
      code: 'firewall.closed',
      title: `Firewall closed on ${to.name}`,
      reason: `${toName} has no inbound security group rules, so it turns away every request — including port ${port}.`,
      fix: `Select ${toName} and allow inbound port ${port}.`,
    };
  }

  const tcpRules = rules.filter((r) => r.protocol === 'tcp' || r.protocol === 'all');
  const portRules = tcpRules.filter((r) => portMatches(r.port, port));
  if (portRules.length === 0) {
    const open = tcpRules.map((r) => String(r.port)).join(', ') || 'none';
    return {
      code: 'firewall.port',
      title: `Port ${port} blocked on ${to.name}`,
      reason: `${toName} only allows ports ${open}, but this traffic arrives on port ${port}.`,
      fix: `Add an inbound rule for port ${port} on ${toName}.`,
    };
  }

  const source = sourceCidrOf(from);
  if (!portRules.some((r) => cidrContains(r.source, source))) {
    const allowed = portRules.map((r) => r.source).join(', ');
    return {
      code: 'firewall.source',
      title: `${to.name} doesn't trust ${from.name}`,
      reason: `Port ${port} on ${toName} only accepts traffic from ${allowed}, but "${from.name}" sends from ${source}.`,
      fix: `Change the port ${port} rule's source on ${toName} so it includes ${source}.`,
    };
  }
  return null;
}

function checkRequestLink(from: Block, to: Block): Problem | null {
  const fromSpec = CATALOG[from.type];
  const toSpec = CATALOG[to.type];
  const toZone = zoneAt(to.gridX);

  if (from.fault === 'crashed' || to.fault === 'crashed') {
    const dead = to.fault === 'crashed' ? to : from;
    return {
      code: 'link.crashed',
      title: `${dead.name} is down`,
      reason: `"${dead.name}" has crashed and drops every request (HTTP 502 Bad Gateway).`,
      fix: `Delete "${dead.name}" and wire traffic to a healthy block instead.`,
    };
  }

  const extra = fromSpec.extraDownstream?.includes(to.type) ?? false;

  switch (fromSpec.tier) {
    case 'internet': {
      if (toSpec.tier === 'data' || toSpec.tier === 'async') {
        return {
          code: 'link.internet_to_data',
          title: `Internet wired straight to ${toSpec.shortLabel}`,
          reason: `Users on the internet must never talk directly to "${to.name}". Exposing a ${toSpec.category.toLowerCase()} service lets attackers read or wipe it.`,
          fix: `Send users to a web server, load balancer or API front door first, and let that talk to "${to.name}".`,
        };
      }
      if (toZone === 'private') {
        return {
          code: 'link.internet_to_private',
          title: 'Internet wired into the Private Subnet',
          reason: `The Private Subnet has no route from the internet, so requests can never reach "${to.name}".`,
          fix: `Put internet-facing servers or load balancers in the Public Subnet, or route through one.`,
        };
      }
      return null;
    }
    case 'edge': {
      if (toSpec.tier === 'edge' || toSpec.tier === 'entry' || toSpec.tier === 'compute' || extra) {
        if (toZone === 'private' && !toSpec.regional && !toSpec.invokedViaApi) {
          return {
            code: 'link.edge_to_private',
            title: `${fromSpec.shortLabel} can't reach into the Private Subnet`,
            reason: `"${from.name}" sits outside your VPC and can only reach things in the Public Subnet. "${to.name}" is hidden in the Private Subnet.`,
            fix: `Route through a load balancer in the Public Subnet, or move "${to.name}" to the Public Subnet.`,
          };
        }
        if (from.type === 'igw' && toZone !== 'public' && !toSpec.regional && toSpec.tier !== 'edge') {
          return {
            code: 'link.edge_to_private',
            title: 'Internet Gateway only opens the Public Subnet',
            reason: `An Internet Gateway connects the internet to the Public Subnet only.`,
            fix: `Wire the Internet Gateway to something in the Public Subnet.`,
          };
        }
        return null;
      }
      return {
        code: 'link.tier_skip',
        title: `${fromSpec.shortLabel} can't talk to ${toSpec.shortLabel} directly`,
        reason: `${fromSpec.name} forwards requests to web tiers, not straight into ${toSpec.name}.`,
        fix: `Put a server, container or function between "${from.name}" and "${to.name}".`,
      };
    }
    case 'entry': {
      if (toSpec.tier === 'compute') return null;
      return {
        code: 'link.tier_skip',
        title: `Load balancer wired to ${toSpec.shortLabel}`,
        reason: `A load balancer spreads web requests across servers; it can't forward them to ${toSpec.name}.`,
        fix: `Wire "${from.name}" to EC2 servers or containers, and wire those to "${to.name}".`,
      };
    }
    case 'compute':
    case 'async':
      return null;
    case 'data': {
      if (extra) return null;
      return {
        code: 'link.data_to_data',
        title: `${fromSpec.shortLabel} and ${toSpec.shortLabel} don't talk directly`,
        reason: `Databases and storage don't call each other; application code moves data between them.`,
        fix: `Wire both to a server or function instead.`,
      };
    }
    default:
      return null;
  }
}

/**
 * Compute blocks that pull work from a queue or stream instead of taking requests from the front door.
 * A compute block wired to an SQS/SNS/Kinesis block, and to no internet, edge or entry block, is a consumer:
 * work flows from the queue to it.
 */
export function findConsumers(blocks: ReadonlyMap<string, Block>, wires: readonly Wire[]): Set<string> {
  const fedFromFront = new Set<string>();
  const wiredToAsync = new Set<string>();
  for (const w of wires) {
    const a = blocks.get(w.a);
    const b = blocks.get(w.b);
    if (!a || !b) continue;
    for (const [x, y] of [
      [a, b],
      [b, a],
    ] as const) {
      if (CATALOG[x.type].tier !== 'compute') continue;
      const otherTier = CATALOG[y.type].tier;
      if (otherTier === 'internet' || otherTier === 'edge' || otherTier === 'entry') fedFromFront.add(x.id);
      if (otherTier === 'async') wiredToAsync.add(x.id);
    }
  }
  return new Set([...wiredToAsync].filter((id) => !fedFromFront.has(id)));
}

function linkKindFor(
  a: Block,
  b: Block,
  consumers: ReadonlySet<string>
): { kind: LinkKind; from: Block; to: Block; pull?: boolean } | { unsupported: Problem } {
  const aTier = CATALOG[a.type].tier;
  const bTier = CATALOG[b.type].tier;

  // Governance links (IAM, KMS, CloudWatch, CloudTrail) attach to anything except users.
  if (aTier === 'control' || bTier === 'control') {
    const [control, other] = aTier === 'control' ? [a, b] : [b, a];
    if (CATALOG[other.type].tier === 'internet') {
      return {
        unsupported: {
          code: 'link.unsupported',
          title: `${CATALOG[control.type].shortLabel} can't attach to users`,
          reason: `${CATALOG[control.type].name} governs your AWS resources, not the people visiting them.`,
          fix: `Attach "${control.name}" to a server, database or bucket.`,
        },
      };
    }
    return { kind: 'governance', from: other, to: control };
  }

  // Attachments (EBS volumes) plug into one specific server type.
  for (const [disk, host] of [
    [a, b],
    [b, a],
  ] as const) {
    const hosts = ATTACHABLE_TO[disk.type];
    if (!hosts) continue;
    if (hosts.includes(host.type)) return { kind: 'attachment', from: host, to: disk };
    return {
      unsupported: {
        code: 'link.unsupported',
        title: `${CATALOG[disk.type].shortLabel} must plug into a server`,
        reason: `An ${CATALOG[disk.type].name} is a disk that attaches to an EC2 instance, not to ${CATALOG[host.type].name}.`,
        fix: `Wire "${disk.name}" to an EC2 instance.`,
      },
    };
  }

  // Egress links (NAT) carry outbound traffic from private servers to the internet.
  if (aTier === 'egress' || bTier === 'egress') {
    const [nat, other] = aTier === 'egress' ? [a, b] : [b, a];
    const otherTier = CATALOG[other.type].tier;
    if (otherTier === 'compute') return { kind: 'egress', from: other, to: nat };
    if (otherTier === 'internet' || other.type === 'igw') return { kind: 'egress', from: nat, to: other };
    return {
      unsupported: {
        code: 'link.unsupported',
        title: `NAT Gateway wired to ${CATALOG[other.type].shortLabel}`,
        reason: `A NAT Gateway gives private servers a one-way path out to the internet. It only connects servers to the Internet Gateway.`,
        fix: `Wire private servers to "${nat.name}", and "${nat.name}" to an Internet Gateway.`,
      },
    };
  }

  // A consumer pulls from its queue, so work flows queue → consumer.
  for (const [queue, worker] of [
    [a, b],
    [b, a],
  ] as const) {
    if (aTier !== bTier && CATALOG[queue.type].tier === 'async' && consumers.has(worker.id)) {
      return { kind: 'request', from: queue, to: worker, pull: true };
    }
  }

  const [from, to] = orient(a, b);
  return { kind: 'request', from, to };
}

function violationFor(wire: Wire, problem: Problem, blockId?: string): Violation {
  return {
    id: `wire:${wire.id}`,
    code: problem.code,
    severity: 'error',
    title: problem.title,
    reason: problem.reason,
    fix: problem.fix,
    wireId: wire.id,
    blockId,
  };
}

export function evaluateWire(
  wire: Wire,
  blocks: ReadonlyMap<string, Block>,
  consumers: ReadonlySet<string> = new Set()
): WireEvaluation {
  const a = blocks.get(wire.a);
  const b = blocks.get(wire.b);

  if (!a || !b) {
    return {
      link: { wireId: wire.id, fromId: wire.a, toId: wire.b, kind: 'request', port: 0, allowed: false, violationCode: 'link.unknown_block' },
      violation: violationFor(wire, {
        code: 'link.unknown_block',
        title: 'Wire to a missing block',
        reason: 'This wire points at a block that is no longer on the board.',
        fix: 'Delete the wire.',
      }),
    };
  }
  if (a.id === b.id) {
    return {
      link: { wireId: wire.id, fromId: a.id, toId: b.id, kind: 'request', port: 0, allowed: false, violationCode: 'link.self' },
      violation: violationFor(wire, {
        code: 'link.self',
        title: 'Block wired to itself',
        reason: 'A wire needs two different blocks.',
        fix: 'Delete the wire.',
      }),
    };
  }

  const kind = linkKindFor(a, b, consumers);
  if ('unsupported' in kind) {
    return {
      link: { wireId: wire.id, fromId: a.id, toId: b.id, kind: 'request', port: 0, allowed: false, violationCode: kind.unsupported.code },
      violation: violationFor(wire, kind.unsupported, b.id),
    };
  }

  const { from, to } = kind;
  const port = kind.kind === 'request' ? listeningPort(to.type, to.config) : 0;
  const base: LinkResult = { wireId: wire.id, fromId: from.id, toId: to.id, kind: kind.kind, port, allowed: true };

  if (kind.kind !== 'request') return { link: base };

  // Consumers poll their queue over outbound connections, and managed services (S3, Kinesis…) deliver
  // through AWS service integrations, so the destination's inbound firewall doesn't apply to either.
  const skipFirewall = ('pull' in kind && kind.pull) || CATALOG[from.type].regional;
  const problem = checkRequestLink(from, to) ?? (skipFirewall ? null : checkFirewall(from, to, port));
  if (!problem) return { link: base };

  return {
    link: { ...base, allowed: false, violationCode: problem.code },
    violation: violationFor(wire, problem, to.id),
  };
}
