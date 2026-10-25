import { describe, expect, it } from 'vitest';
import { analyzeBoard, blockingViolations } from '../analyze';
import { zoneAt } from '../board';
import { cidrContains, portMatches } from '../cidr';
import { block, board, users, wire } from './helpers';

const codes = (b: ReturnType<typeof board>) => analyzeBoard(b).violations.map((v) => v.code);
const errors = (b: ReturnType<typeof board>) => blockingViolations(analyzeBoard(b)).map((v) => v.code);

describe('board zones', () => {
  it('maps grid columns to zones', () => {
    expect([-7, -5, -4, -2, -1, 2, 3, 7].map(zoneAt)).toEqual([
      'external', 'external', 'edge', 'edge', 'public', 'public', 'private', 'private',
    ]);
  });
});

describe('cidr', () => {
  it('matches containment', () => {
    expect(cidrContains('0.0.0.0/0', '203.0.113.0/24')).toBe(true);
    expect(cidrContains('10.0.0.0/16', '10.0.1.0/24')).toBe(true);
    expect(cidrContains('vpc', '10.0.2.0/24')).toBe(true);
    expect(cidrContains('10.0.0.0/16', '203.0.113.0/24')).toBe(false);
    expect(cidrContains('10.0.1.0/24', '10.0.0.0/16')).toBe(false);
  });
  it('matches ports and ranges', () => {
    expect(portMatches(80, 80)).toBe(true);
    expect(portMatches('80', 80)).toBe(true);
    expect(portMatches('1000-2000', 1500)).toBe(true);
    expect(portMatches('all', 5432)).toBe(true);
    expect(portMatches(22, 80)).toBe(false);
  });
});

describe('the Level 6 screenshot bug', () => {
  it('rejects an EC2 in the private subnet wired straight from the internet', () => {
    const b = board([users(), block('web', 'ec2', 4)], [wire('users', 'web')]);
    const a = analyzeBoard(b);
    expect(errors(b)).toContain('link.internet_to_private');
    expect(a.trace.served).toBe(false);
    expect(a.health.web).toBe('unreachable');
  });

  it('accepts the same EC2 in the public subnet', () => {
    const b = board([users(), block('web', 'ec2', 0)], [wire('users', 'web')]);
    expect(errors(b)).toEqual([]);
    expect(analyzeBoard(b).trace.served).toBe(true);
  });
});

describe('security group firewall', () => {
  const web = (rules: unknown) => block('web', 'ec2', 0, 0, { securityGroupInbound: rules as never });

  it('blocks port 80 when only port 22 is open', () => {
    const b = board([users(), web([{ protocol: 'tcp', port: 22, source: '0.0.0.0/0' }])], [wire('users', 'web')]);
    expect(errors(b)).toContain('firewall.port');
  });

  it('blocks when the source CIDR does not include the caller', () => {
    const b = board([users(), web([{ protocol: 'tcp', port: 80, source: '10.0.0.0/16' }])], [wire('users', 'web')]);
    expect(errors(b)).toContain('firewall.source');
  });

  it('blocks everything when there are no rules', () => {
    const b = board([users(), web([])], [wire('users', 'web')]);
    expect(errors(b)).toContain('firewall.closed');
  });

  it('checks the database firewall even when the wire is drawn backwards', () => {
    const b = board(
      [users(), block('web', 'ec2', 0), block('db', 'rds', 4, 0, { securityGroupInbound: [{ protocol: 'tcp', port: 80, source: 'vpc' }] })],
      [wire('users', 'web'), wire('db', 'web')]
    );
    const a = analyzeBoard(b);
    const dbLink = a.links.find((l) => l.wireId === 'db--web');
    expect(dbLink).toMatchObject({ fromId: 'web', toId: 'db', port: 5432, allowed: false, violationCode: 'firewall.port' });
  });

  it('lets the web tier reach RDS on 5432 with the default VPC-only rule', () => {
    const b = board([users(), block('web', 'ec2', 0), block('db', 'rds', 4)], [wire('users', 'web'), wire('web', 'db')]);
    expect(errors(b)).toEqual([]);
    expect(analyzeBoard(b).trace.reached).toContain('db');
  });

  it('warns when a database port is open to the whole internet', () => {
    const b = board(
      [users(), block('web', 'ec2', 0), block('db', 'rds', 4, 0, { securityGroupInbound: [{ protocol: 'tcp', port: 5432, source: '0.0.0.0/0' }] })],
      [wire('users', 'web'), wire('web', 'db')]
    );
    expect(codes(b)).toContain('security.open_admin_port');
    expect(analyzeBoard(b).telemetry.securityScore).toBeLessThan(100);
  });
});

describe('illegal routes the old physics allowed', () => {
  it('Internet → CloudFront → private RDS fails', () => {
    const b = board(
      [users(), block('cdn', 'cloudfront', -3), block('db', 'rds', 4)],
      [wire('users', 'cdn'), wire('cdn', 'db')]
    );
    expect(errors(b)).toContain('link.tier_skip');
  });

  it.each(['ebs', 's3', 'dynamodb', 'sqs'] as const)('Internet → %s directly fails', (type) => {
    const b = board([users(), block('x', type, 0)], [wire('users', 'x')]);
    expect(errors(b).some((c) => c.startsWith('link.'))).toBe(true);
  });

  it('a load balancer cannot forward straight to a database', () => {
    const b = board([users(), block('lb', 'alb', 0), block('db', 'rds', 4)], [wire('users', 'lb'), wire('lb', 'db')]);
    expect(errors(b)).toContain('link.tier_skip');
  });

  it('CloudFront → S3 static site is legal', () => {
    const b = board([users(), block('cdn', 'cloudfront', -3), block('bucket', 's3', -2, 1)], [wire('users', 'cdn'), wire('cdn', 'bucket')]);
    expect(errors(b)).toEqual([]);
    expect(analyzeBoard(b).trace.reached).toContain('bucket');
  });

  it('API Gateway can invoke a Lambda in the private subnet', () => {
    const b = board([users(), block('api', 'apigw', -3), block('fn', 'lambda', 4)], [wire('users', 'api'), wire('api', 'fn')]);
    expect(errors(b)).toEqual([]);
  });

  it('an EBS volume attached to two servers fails', () => {
    const b = board(
      [users(), block('a', 'ec2', 0, -1), block('b', 'ec2', 0, 1), block('disk', 'ebs', 1)],
      [wire('users', 'a'), wire('users', 'b'), wire('a', 'disk'), wire('b', 'disk')]
    );
    expect(errors(b)).toContain('link.ebs_multi_attach');
  });
});

describe('placement', () => {
  it('flags a database outside the private subnet', () => {
    expect(errors(board([block('db', 'rds', 0)]))).toContain('zone.db_exposed');
  });
  it('flags an EC2 in the edge zone', () => {
    expect(errors(board([block('web', 'ec2', -3)]))).toContain('zone.invalid');
  });
  it('lets regional services like S3 sit in any non-internet zone', () => {
    for (const x of [-3, 0, 4]) expect(analyzeBoard(board([block('s', 's3', x)])).violations.map((v) => v.code)).not.toContain('zone.invalid');
  });
});

describe('finops', () => {
  it('flags an unwired server as idle spend', () => {
    const b = board([users(), block('web', 'ec2', 0), block('spare', 'ec2', 1)], [wire('users', 'web')]);
    expect(errors(b)).toEqual(['finops.idle']);
  });
  it('enforces per-level limits', () => {
    const b = board([users(), block('a', 'ec2', 0), block('b', 'ec2', 1)], [wire('users', 'a'), wire('users', 'b')]);
    const a = analyzeBoard(b, { limits: { maxOfType: { ec2: 1 } } });
    expect(blockingViolations(a).map((v) => v.code)).toEqual(['finops.over_limit']);
  });
});

describe('health is derived, not stored', () => {
  it('reports crashed, idle, unreachable and healthy blocks', () => {
    const b = board(
      [
        users(),
        block('web', 'ec2', 0),
        block('dead', 'ec2', 1, -2, {}, { fault: 'crashed' }),
        block('spare', 'ec2', 1, 2),
        block('island', 'ec2', 2, 2),
        block('disk', 'ebs', 2, 3),
      ],
      [wire('users', 'web'), wire('users', 'dead'), wire('island', 'disk')]
    );
    const { health } = analyzeBoard(b);
    expect(health).toMatchObject({ web: 'healthy', dead: 'down', spare: 'idle', island: 'unreachable', disk: 'unreachable' });
  });
});

describe('telemetry', () => {
  const twoTier = (withCache: boolean) =>
    board(
      [users(), block('web', 'ec2', 0), block('db', 'rds', 4), ...(withCache ? [block('cache', 'redis', 4, 1)] : [])],
      [wire('users', 'web'), wire('web', 'db'), ...(withCache ? [wire('web', 'cache')] : [])]
    );

  it('a Redis cache beside the database cuts latency', () => {
    const slow = analyzeBoard(twoTier(false)).telemetry.latencyMs;
    const fast = analyzeBoard(twoTier(true)).telemetry.latencyMs;
    expect(fast).toBeLessThan(slow);
    expect(fast).toBeLessThanOrEqual(85);
    expect(slow).toBeGreaterThan(85);
  });

  it('unwired servers add cost but not capacity', () => {
    const one = analyzeBoard(board([users(), block('web', 'ec2', 0)], [wire('users', 'web')])).telemetry;
    const withSpare = analyzeBoard(board([users(), block('web', 'ec2', 0), block('spare', 'ec2', 1)], [wire('users', 'web')])).telemetry;
    expect(withSpare.capacityRps).toBe(one.capacityRps);
    expect(withSpare.monthlyCostUsd).toBeGreaterThan(one.monthlyCostUsd);
  });

  it('overload raises the error rate unless a queue buffers it', () => {
    const b = board([users(), block('web', 'ec2', 0)], [wire('users', 'web')]);
    expect(analyzeBoard(b, { load: { rps: 3000 } }).telemetry.errorRatePercent).toBeGreaterThan(0);
  });

  it('a WAF filters bot traffic out of demand', () => {
    const open = board([users(), block('web', 'ec2', 0)], [wire('users', 'web')]);
    const guarded = board([users(), block('waf', 'waf', -3), block('web', 'ec2', 0)], [wire('users', 'waf'), wire('waf', 'web')]);
    const load = { rps: 200, botRps: 2000 };
    expect(analyzeBoard(open, { load }).telemetry.demandRps).toBe(2200);
    expect(analyzeBoard(guarded, { load }).telemetry.demandRps).toBe(200);
  });

  it('reports 100% errors when nothing is served', () => {
    expect(analyzeBoard(board([users()])).telemetry.errorRatePercent).toBe(100);
  });
});

describe('queues, streams and side services', () => {
  const queued = board(
    [users(), block('api', 'apigw', -2), block('q', 'sqs', 4), block('worker', 'lambda', 5, 1)],
    [wire('users', 'api'), wire('api', 'q'), wire('q', 'worker')]
  );

  it('a Lambda wired only to a queue consumes from it', () => {
    const a = analyzeBoard(queued);
    expect(a.links.find((l) => l.wireId === 'q--worker')).toMatchObject({ fromId: 'q', toId: 'worker', allowed: true });
    expect(a.health.worker).toBe('healthy');
  });

  it('work behind a queue does not add to user-facing latency', () => {
    const a = analyzeBoard(queued);
    expect(a.telemetry.latencyMs).toBe(8 + 10); // API Gateway + SQS only
  });

  it('a queue absorbs bursts the consumers could not take directly', () => {
    const direct = board([users(), block('api', 'apigw', -2), block('fn', 'lambda', 4)], [wire('users', 'api'), wire('api', 'fn')]);
    const load = { rps: 6000 };
    expect(analyzeBoard(direct, { load }).telemetry.errorRatePercent).toBeGreaterThan(1);
    expect(analyzeBoard(queued, { load }).telemetry.errorRatePercent).toBe(0);
  });

  it('a slow warehouse behind a stream does not cap user capacity', () => {
    const b = board(
      [users(), block('web', 'ec2', 0), block('stream', 'kinesis', 6), block('wh', 'redshift', 5)],
      [wire('users', 'web'), wire('web', 'stream'), wire('stream', 'wh')]
    );
    const a = analyzeBoard(b, { load: { rps: 280 } });
    expect(blockingViolations(a)).toEqual([]);
    expect(a.telemetry.capacityRps).toBe(300);
  });

  it('SageMaker always sits downstream of the code that calls it', () => {
    const b = board([users(), block('web', 'ec2', 0), block('model', 'sagemaker', 5)], [wire('users', 'web'), wire('model', 'web')]);
    expect(analyzeBoard(b).trace.reached).toContain('model');
  });

  it('an SNS topic receiving CloudWatch alarms is in service', () => {
    const b = board(
      [users(), block('web', 'ec2', 0), block('mon', 'cloudwatch', 6, 2), block('page', 'sns', 6)],
      [wire('users', 'web'), wire('mon', 'web'), wire('mon', 'page')]
    );
    const { health } = analyzeBoard(b);
    expect(health).toMatchObject({ mon: 'healthy', page: 'healthy' });
  });

  it('governance does not make an unreachable server look reachable', () => {
    const b = board(
      [users(), block('web', 'ec2', 0), block('island', 'ec2', 4, 2), block('mon', 'cloudwatch', 6, 2)],
      [wire('users', 'web'), wire('mon', 'web'), wire('mon', 'island')]
    );
    expect(analyzeBoard(b).health.island).toBe('unreachable');
  });
});
