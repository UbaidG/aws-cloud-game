/**
 * Security posture: warnings plus score deductions. These don't block a stage on their own;
 * a stage opts in by setting an SLA `minSecurityScore`.
 */

import { cidrContains, portMatches } from '../cidr';
import { CATALOG } from '../catalog';
import type { Block, LoadProfile, SecurityFinding, TrafficTrace, Violation } from '../types';

const SENSITIVE_PORTS: Record<number, string> = {
  22: 'SSH',
  3389: 'Remote Desktop',
  5432: 'PostgreSQL',
  3306: 'MySQL',
  6379: 'Redis',
  5439: 'Redshift',
};

const ENCRYPTABLE = new Set(['rds', 'dynamodb', 'redshift', 's3', 'ebs', 'efs']);

export interface SecurityReport {
  violations: Violation[];
  findings: SecurityFinding[];
}

export function checkSecurity(
  blocks: readonly Block[],
  trace: TrafficTrace,
  load: LoadProfile | undefined
): SecurityReport {
  const violations: Violation[] = [];
  const findings: SecurityFinding[] = [];

  for (const block of blocks) {
    const spec = CATALOG[block.type];

    for (const rule of block.config.securityGroupInbound ?? []) {
      if (!cidrContains(rule.source, '0.0.0.0/0')) continue;
      const exposed = Object.entries(SENSITIVE_PORTS).find(([port]) => portMatches(rule.port, Number(port)));
      if (!exposed) continue;
      const [port, label] = exposed;
      violations.push({
        id: `sec-port:${block.id}:${port}`,
        code: 'security.open_admin_port',
        severity: 'warning',
        title: `${label} port ${port} open to the whole internet`,
        reason: `"${block.name}" lets anyone on the internet try port ${port}. Bots scan for this within minutes.`,
        fix: `Restrict port ${port} on "${block.name}" to your VPC (10.0.0.0/16) or remove the rule.`,
        blockId: block.id,
      });
      findings.push({ points: 20, reason: `${label} (port ${port}) open to 0.0.0.0/0 on ${block.name}`, blockId: block.id });
    }

    if (ENCRYPTABLE.has(block.type) && block.config.encrypted === false) {
      violations.push({
        id: `sec-enc:${block.id}`,
        code: 'security.unencrypted',
        severity: 'warning',
        title: `${spec.shortLabel} stores data unencrypted`,
        reason: `If "${block.name}" is ever copied or stolen, its data is readable.`,
        fix: `Turn on encryption for "${block.name}".`,
        blockId: block.id,
      });
      findings.push({ points: 10, reason: `${block.name} is not encrypted`, blockId: block.id });
    }

    if (block.type === 's3' && block.config.blockPublicAccess === false) {
      violations.push({
        id: `sec-s3:${block.id}`,
        code: 'security.public_bucket',
        severity: 'warning',
        title: 'S3 bucket open to the public',
        reason: `Anyone with the link can list or download files in "${block.name}". Public buckets are a top cause of data leaks.`,
        fix: `Turn on Block Public Access and serve files through CloudFront instead.`,
        blockId: block.id,
      });
      findings.push({ points: 15, reason: `${block.name} allows public access`, blockId: block.id });
    }
  }

  // Bots hitting an unprotected front door.
  if ((load?.botRps ?? 0) > 0 && trace.served) {
    const guarded = blocks.some((b) => (b.type === 'waf' || b.type === 'apigw') && trace.reached.includes(b.id));
    if (!guarded) findings.push({ points: 20, reason: 'No WAF or API Gateway filtering bot traffic' });
  }

  return { violations, findings };
}
