/**
 * What the inspector lets the player edit, per service. Data, not JSX: the Inspector renders
 * whatever applies to the selected block and the level's inspector mode.
 */

import { CATALOG, INSTANCE_TYPES, ZONES, type BlockConfig, type FirewallRule, type LevelSpec, type ServiceType } from '../../engine';

export type InspectorMode = LevelSpec['inspectorMode'];

const RANK: Record<InspectorMode, number> = { basic: 0, intermediate: 1, full: 2 };
export const modeAllows = (mode: InspectorMode, needs: InspectorMode) => RANK[mode] >= RANK[needs];

export interface Option {
  value: string | number;
  label: string;
}

export type FieldSpec = {
  key: string;
  label: string;
  help: string;
  types: ServiceType[];
  mode: InspectorMode;
} & (
  | { kind: 'toggle' }
  | { kind: 'select'; options: Option[] }
  | { kind: 'number'; min: number; max: number; step: number; unit?: string }
);

const ec2Capacity = (t: string) => CATALOG.ec2.capacityRps?.({ instanceType: t }) ?? 0;
const ec2Cost = (t: string) => CATALOG.ec2.cost({ instanceType: t });

export const FIELDS: FieldSpec[] = [
  {
    key: 'instanceType',
    label: 'Instance size',
    help: 'Bigger instances serve more requests per second but cost more each month.',
    types: ['ec2', 'asg'],
    mode: 'intermediate',
    kind: 'select',
    options: INSTANCE_TYPES.map((t) => ({ value: t, label: `${t} · ${ec2Capacity(t)} rps · $${ec2Cost(t)}/mo` })),
  },
  {
    key: 'desiredCount',
    label: 'Running tasks',
    help: 'How many copies of the container the service keeps running. Each task serves about 600 rps.',
    types: ['ecs'],
    mode: 'intermediate',
    kind: 'number',
    min: 1,
    max: 12,
    step: 1,
  },
  {
    key: 'minCapacity',
    label: 'Minimum servers',
    help: 'Auto Scaling never runs fewer servers than this.',
    types: ['asg'],
    mode: 'intermediate',
    kind: 'number',
    min: 1,
    max: 12,
    step: 1,
  },
  {
    key: 'maxCapacity',
    label: 'Maximum servers',
    help: 'Auto Scaling adds servers up to this limit when traffic grows. You pay for the maximum.',
    types: ['asg'],
    mode: 'intermediate',
    kind: 'number',
    min: 1,
    max: 12,
    step: 1,
  },
  {
    key: 'multiAZ',
    label: 'Multi-AZ standby',
    help: 'Keeps a synchronous copy in a second Availability Zone that takes over if the first fails.',
    types: ['rds'],
    mode: 'intermediate',
    kind: 'toggle',
  },
  {
    key: 'readReplica',
    label: 'Read replica',
    help: 'A read-only copy that takes read traffic off the primary database.',
    types: ['rds'],
    mode: 'intermediate',
    kind: 'toggle',
  },
  {
    key: 'encrypted',
    label: 'Encryption at rest',
    help: 'Data on disk is encrypted with a KMS key, so a stolen disk is unreadable.',
    types: ['rds', 's3', 'ebs', 'efs', 'dynamodb', 'redshift', 'cloudtrail'],
    mode: 'intermediate',
    kind: 'toggle',
  },
  {
    key: 'blockPublicAccess',
    label: 'Block public access',
    help: 'Stops anyone on the internet from reading the bucket, even if a policy says otherwise.',
    types: ['s3'],
    mode: 'intermediate',
    kind: 'toggle',
  },
  {
    key: 'versioning',
    label: 'Versioning',
    help: 'Keeps every version of every object, so deletes and overwrites can be undone.',
    types: ['s3'],
    mode: 'intermediate',
    kind: 'toggle',
  },
  {
    key: 'routingPolicy',
    label: 'Routing policy',
    help: 'How Route 53 picks where to send each user.',
    types: ['route53'],
    mode: 'intermediate',
    kind: 'select',
    options: [
      { value: 'simple', label: 'Simple: one answer for everyone' },
      { value: 'weighted', label: 'Weighted: split users by percentage' },
      { value: 'latency', label: 'Latency: the fastest Region for each user' },
      { value: 'failover', label: 'Failover: a backup when the primary is down' },
      { value: 'geolocation', label: 'Geolocation: by the user’s country' },
    ],
  },
  {
    key: 'ttlSeconds',
    label: 'Cache TTL',
    help: 'How long CloudFront keeps a copy at the edge before asking the origin again.',
    types: ['cloudfront'],
    mode: 'full',
    kind: 'number',
    min: 0,
    max: 86400,
    step: 60,
    unit: 's',
  },
  {
    key: 'rateLimitRps',
    label: 'Rate limit',
    help: 'Requests per second allowed before excess requests are rejected.',
    types: ['waf', 'apigw'],
    mode: 'full',
    kind: 'number',
    min: 10,
    max: 10000,
    step: 10,
    unit: 'rps',
  },
  {
    key: 'burstLimit',
    label: 'Burst limit',
    help: 'Short spikes above the rate limit that are still accepted.',
    types: ['apigw'],
    mode: 'full',
    kind: 'number',
    min: 10,
    max: 20000,
    step: 10,
    unit: 'req',
  },
  {
    key: 'alarmThreshold',
    label: 'Alarm threshold',
    help: 'CPU percentage that triggers the alarm.',
    types: ['cloudwatch'],
    mode: 'full',
    kind: 'number',
    min: 10,
    max: 100,
    step: 5,
    unit: '%',
  },
  {
    key: 'iamRole',
    label: 'IAM role',
    help: 'What this resource is allowed to do in AWS. Grant the least it needs.',
    types: ['ec2', 'iam', 'lambda'],
    mode: 'full',
    kind: 'select',
    options: [
      { value: '', label: 'None' },
      { value: 's3:ReadOnly', label: 'Read S3 objects' },
      { value: 'dynamodb:ReadWrite', label: 'Read/write one DynamoDB table' },
      { value: 'cloudwatch:PutMetrics', label: 'Publish CloudWatch metrics' },
      { value: 'AdministratorAccess', label: 'Administrator (everything)' },
    ],
  },
  {
    key: 'memoryMb',
    label: 'Memory',
    help: 'Lambda gives more CPU along with more memory.',
    types: ['lambda'],
    mode: 'full',
    kind: 'select',
    options: [128, 256, 512, 1024, 2048].map((m) => ({ value: m, label: `${m} MB` })),
  },
  {
    key: 'keyRotation',
    label: 'Automatic key rotation',
    help: 'KMS swaps the key material every year without breaking old data.',
    types: ['kms'],
    mode: 'full',
    kind: 'toggle',
  },
  {
    key: 'corsEnabled',
    label: 'CORS',
    help: 'Lets web pages on other domains fetch files from this bucket.',
    types: ['s3'],
    mode: 'full',
    kind: 'toggle',
  },
  {
    key: 'dlqEnabled',
    label: 'Dead-letter queue',
    help: 'Messages that keep failing are parked here instead of retrying forever.',
    types: ['sqs'],
    mode: 'full',
    kind: 'toggle',
  },
];

export function fieldsFor(type: ServiceType, mode: InspectorMode): FieldSpec[] {
  return FIELDS.filter((f) => f.types.includes(type) && modeAllows(mode, f.mode));
}

/** Blocks that have a security group the player can edit. */
export function hasFirewall(config: BlockConfig): boolean {
  return Array.isArray(config.securityGroupInbound);
}

export const PORT_PRESETS: { port: number; label: string }[] = [
  { port: 80, label: 'HTTP 80' },
  { port: 443, label: 'HTTPS 443' },
  { port: 22, label: 'SSH 22' },
  { port: 3389, label: 'RDP 3389' },
  { port: 5432, label: 'PostgreSQL 5432' },
  { port: 3306, label: 'MySQL 3306' },
  { port: 6379, label: 'Redis 6379' },
];

const zoneCidr = (id: string) => ZONES.find((z) => z.id === id)!.cidr;

export const SOURCE_PRESETS: { source: string; label: string }[] = [
  { source: '0.0.0.0/0', label: 'Anyone on the internet' },
  { source: 'vpc', label: 'Inside the VPC (10.0.0.0/16)' },
  { source: zoneCidr('edge'), label: `Edge services (${zoneCidr('edge')})` },
  { source: zoneCidr('public'), label: `Public subnet (${zoneCidr('public')})` },
  { source: zoneCidr('private'), label: `Private subnet (${zoneCidr('private')})` },
];

export function sourceLabel(source: string): string {
  return SOURCE_PRESETS.find((p) => p.source === source)?.label ?? source;
}

export function hasRule(rules: readonly FirewallRule[], port: number, source = '0.0.0.0/0'): boolean {
  return rules.some((r) => String(r.port) === String(port) && r.source === source);
}
