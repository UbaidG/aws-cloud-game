import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../content/levels';
import { buildTerraform } from '../lib/terraform';

describe('terraform export', () => {
  it('produces balanced HCL for every level solution', () => {
    for (const level of LEVELS) {
      const hcl = buildTerraform(level.solution, level.title);
      const opens = (hcl.match(/{/g) ?? []).length;
      const closes = (hcl.match(/}/g) ?? []).length;
      expect(opens, `level ${level.id}`).toBe(closes);
      expect(hcl).not.toContain('undefined');
      expect(hcl).not.toMatch(/resource "aws_(client|ec2|alb|rds)"/);
    }
  });

  it('writes firewall rules with real CIDRs', () => {
    const hcl = buildTerraform(
      {
        blocks: [{ id: 'web', type: 'ec2', name: 'Web', gridX: 1, gridZ: 0, config: { instanceType: 't3.micro', securityGroupInbound: [{ protocol: 'tcp', port: 80, source: 'vpc' }] } }],
        wires: [],
      },
      'Test',
    );
    expect(hcl).toContain('resource "aws_instance" "web"');
    expect(hcl).toContain('cidr_blocks = ["10.0.0.0/16"]');
    expect(hcl).toContain('subnet_id     = aws_subnet.public_a.id');
  });
});
