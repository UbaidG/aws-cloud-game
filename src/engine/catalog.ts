/**
 * Service catalog: every fact the rules need about each AWS service lives here.
 * To change how a service behaves in the game, change its entry — not the rule code.
 */

import type { BlockConfig, Category, ServiceType, Tier, Zone } from './types';

export interface ServiceSpec {
  type: ServiceType;
  name: string;
  shortLabel: string;
  category: Category;
  tier: Tier;
  /** Zones where this service may legally be placed. */
  zones: Zone[];
  /**
   * Regional/global managed services that do not live inside a subnet (S3, DynamoDB, SQS…).
   * They can sit anywhere outside the internet zone and are reachable from edge or VPC tiers.
   */
  regional?: boolean;
  /** Port this service listens on when the config doesn't say otherwise. */
  port: number;
  /** Added to a request's latency when it passes through this block. */
  latencyMs: number;
  /** Monthly cost in USD for this block's config. */
  cost: (config: BlockConfig) => number;
  /** Requests per second this block can serve (compute and data only). */
  capacityRps?: (config: BlockConfig) => number;
  /** Invoked through the AWS API, so edge services can call it even inside the Private Subnet. */
  invokedViaApi?: boolean;
  /** Works on its own schedule (e.g. a migration task), so it is healthy without user traffic. */
  background?: boolean;
  /** Extra downstream service types allowed beyond the tier defaults. */
  extraDownstream?: ServiceType[];
  defaultConfig: BlockConfig;
  color: string;
  description: string;
  plainEnglishTip: string;
}

const EC2_COST: Record<string, number> = {
  't3.micro': 15,
  't3.medium': 45,
  'm5.large': 110,
  'c6g.xlarge': 210,
};

const EC2_CAPACITY: Record<string, number> = {
  't3.micro': 300,
  't3.medium': 600,
  'm5.large': 1200,
  'c6g.xlarge': 2000,
};

export const INSTANCE_TYPES = Object.keys(EC2_COST);

const flat = (usd: number) => () => usd;
const VPC_ZONES: Zone[] = ['public', 'private'];
const REGIONAL_ZONES: Zone[] = ['edge', 'public', 'private'];

const HTTP_IN = [{ protocol: 'tcp' as const, port: 80, source: '0.0.0.0/0' }];

function spec(s: ServiceSpec): ServiceSpec {
  return s;
}

export const CATALOG: Record<ServiceType, ServiceSpec> = {
  client: spec({
    type: 'client',
    name: 'Internet Users',
    shortLabel: 'Users',
    category: 'Networking',
    tier: 'internet',
    zones: ['external'],
    port: 0,
    latencyMs: 0,
    cost: flat(0),
    defaultConfig: {},
    color: '#38BDF8',
    description: 'External web browsers and mobile devices sending HTTP/HTTPS requests to your cloud.',
    plainEnglishTip: 'Visitors opening your website or app from their laptop or phone.',
  }),

  // ---- Edge ---------------------------------------------------------------
  route53: spec({
    type: 'route53',
    name: 'Route 53 DNS',
    shortLabel: 'Route 53',
    category: 'Networking',
    tier: 'edge',
    zones: ['edge'],
    port: 53,
    latencyMs: 2,
    cost: flat(5),
    defaultConfig: { routingPolicy: 'simple' },
    color: '#0EA5E9',
    description: 'Cloud DNS that translates domain names (like example.com) into your load balancer or server address.',
    plainEnglishTip: 'The internet phonebook that sends visitors typing your domain to the right place.',
  }),
  cloudfront: spec({
    type: 'cloudfront',
    name: 'CloudFront CDN',
    shortLabel: 'CloudFront',
    category: 'Networking',
    tier: 'edge',
    zones: ['edge'],
    port: 443,
    latencyMs: 12,
    cost: flat(15),
    extraDownstream: ['s3'],
    defaultConfig: { ttlSeconds: 3600, originAccessControl: true },
    color: '#06B6D4',
    description: 'Global content delivery network caching your site in 450+ cities close to your users.',
    plainEnglishTip: 'Keeps copies of your website around the world so pages load almost instantly everywhere.',
  }),
  waf: spec({
    type: 'waf',
    name: 'AWS WAF',
    shortLabel: 'WAF',
    category: 'Security',
    tier: 'edge',
    zones: ['edge'],
    port: 443,
    latencyMs: 2,
    cost: flat(25),
    defaultConfig: { rateLimitRps: 1000, sqlInjectionShield: true },
    color: '#DC2626',
    description: 'Web application firewall that inspects HTTP requests and blocks SQL injection and botnets.',
    plainEnglishTip: 'A security guard at the entrance that blocks hacker attacks and spam bots.',
  }),
  igw: spec({
    type: 'igw',
    name: 'Internet Gateway',
    shortLabel: 'IGW',
    category: 'Networking',
    tier: 'edge',
    zones: ['edge'],
    port: 80,
    latencyMs: 1,
    cost: flat(0),
    defaultConfig: {},
    color: '#14B8A6',
    description: 'The VPC doorway that lets the public subnet talk to the internet in both directions.',
    plainEnglishTip: 'The front door connecting your private cloud network to the public internet.',
  }),
  apigw: spec({
    type: 'apigw',
    name: 'API Gateway',
    shortLabel: 'API GW',
    category: 'Networking',
    tier: 'edge',
    zones: ['edge', 'public'],
    port: 443,
    latencyMs: 8,
    cost: flat(20),
    extraDownstream: ['dynamodb', 's3', 'sqs', 'sns', 'kinesis'],
    defaultConfig: { rateLimitRps: 1000, burstLimit: 2000 },
    color: '#8C4FFF',
    description: 'Managed API front door with rate limiting (HTTP 429), throttling and authentication.',
    plainEnglishTip: 'An API front door that enforces rate limits so bots and spikes cannot overload you.',
  }),
  tgw: spec({
    type: 'tgw',
    name: 'Transit Gateway',
    shortLabel: 'Transit GW',
    category: 'Networking',
    tier: 'edge',
    zones: ['edge'],
    port: 0,
    latencyMs: 2,
    cost: flat(50),
    defaultConfig: {},
    color: '#6366F1',
    description: 'Central hub connecting many VPCs and on-premises data centres together.',
    plainEnglishTip: 'A Grand Central Station that connects many separate networks.',
  }),

  // ---- Entry --------------------------------------------------------------
  alb: spec({
    type: 'alb',
    name: 'Application Load Balancer',
    shortLabel: 'ALB',
    category: 'Networking',
    tier: 'entry',
    zones: VPC_ZONES,
    port: 80,
    latencyMs: 4,
    cost: flat(25),
    defaultConfig: { port: 80, multiAZ: true, securityGroupInbound: HTTP_IN },
    color: '#8B5CF6',
    description: 'Splits incoming HTTP/HTTPS traffic across multiple healthy servers.',
    plainEnglishTip: 'A traffic cop that spreads visitors evenly across two or more servers.',
  }),
  nat_gw: spec({
    type: 'nat_gw',
    name: 'NAT Gateway',
    shortLabel: 'NAT GW',
    category: 'Networking',
    tier: 'egress',
    zones: ['public'],
    port: 0,
    latencyMs: 2,
    cost: flat(45),
    defaultConfig: {},
    color: '#0D9488',
    description: 'Lets private-subnet servers reach the internet for updates while blocking inbound strangers.',
    plainEnglishTip: 'A one-way door: private servers can go out, but nobody outside can come in.',
  }),

  // ---- Compute ------------------------------------------------------------
  ec2: spec({
    type: 'ec2',
    name: 'EC2 Instance',
    shortLabel: 'EC2',
    category: 'Compute',
    tier: 'compute',
    zones: VPC_ZONES,
    port: 80,
    latencyMs: 40,
    cost: (c) => EC2_COST[String(c.instanceType ?? 't3.micro')] ?? 35,
    capacityRps: (c) => EC2_CAPACITY[String(c.instanceType ?? 't3.micro')] ?? 300,
    defaultConfig: { instanceType: 't3.micro', port: 80, securityGroupInbound: HTTP_IN },
    color: '#F59E0B',
    description: 'A virtual server running your application code, protected by a security group firewall.',
    plainEnglishTip: 'A rented computer in the cloud that runs your code and listens on ports like 80.',
  }),
  asg: spec({
    type: 'asg',
    name: 'Auto Scaling Group',
    shortLabel: 'ASG',
    category: 'Compute',
    tier: 'compute',
    zones: VPC_ZONES,
    port: 80,
    latencyMs: 40,
    cost: (c) => Number(c.maxCapacity ?? 4) * 30,
    capacityRps: (c) => Number(c.maxCapacity ?? 4) * 600,
    defaultConfig: { minCapacity: 2, maxCapacity: 6, instanceType: 't3.medium', securityGroupInbound: HTTP_IN },
    color: '#F97316',
    description: 'Automatically adds EC2 servers when traffic spikes and removes them when it drops.',
    plainEnglishTip: 'An automatic server cloner that adds machines during busy spikes.',
  }),
  ecs: spec({
    type: 'ecs',
    name: 'Amazon ECS',
    shortLabel: 'ECS',
    category: 'Compute',
    tier: 'compute',
    zones: VPC_ZONES,
    port: 80,
    latencyMs: 35,
    // Priced and sized per running task: the default service runs 4.
    cost: (c) => Math.round((75 * Number(c.desiredCount ?? 4)) / 4),
    capacityRps: (c) => Number(c.desiredCount ?? 4) * 600,
    defaultConfig: { port: 80, desiredCount: 4 },
    color: '#F97316',
    description: 'Runs and scales Docker containers without managing the cluster yourself.',
    plainEnglishTip: 'Runs your packaged app containers with built-in scaling.',
  }),
  eks: spec({
    type: 'eks',
    name: 'Amazon EKS',
    shortLabel: 'EKS',
    category: 'Compute',
    tier: 'compute',
    zones: VPC_ZONES,
    port: 80,
    latencyMs: 35,
    cost: flat(145),
    capacityRps: () => 2400,
    defaultConfig: { port: 80 },
    color: '#3B82F6',
    description: 'Managed Kubernetes that orchestrates and heals fleets of containers.',
    plainEnglishTip: 'An automated fleet captain that runs and heals groups of containers.',
  }),
  beanstalk: spec({
    type: 'beanstalk',
    name: 'Elastic Beanstalk',
    shortLabel: 'Beanstalk',
    category: 'Compute',
    tier: 'compute',
    zones: VPC_ZONES,
    port: 80,
    latencyMs: 45,
    cost: flat(55),
    capacityRps: () => 1200,
    defaultConfig: { port: 80 },
    color: '#F97316',
    description: 'Upload your code and AWS provisions the servers, load balancing and scaling for you.',
    plainEnglishTip: 'Hand AWS your code and it handles the servers.',
  }),
  lambda: spec({
    type: 'lambda',
    name: 'AWS Lambda',
    shortLabel: 'Lambda',
    category: 'Serverless',
    tier: 'compute',
    zones: VPC_ZONES,
    port: 443,
    latencyMs: 55,
    cost: flat(8),
    capacityRps: () => 3000,
    invokedViaApi: true,
    defaultConfig: { memoryMb: 512, timeoutSec: 15 },
    color: '#EC4899',
    description: 'Functions that run only when triggered and cost nothing while idle.',
    plainEnglishTip: 'Code that runs only at the moment a request arrives — no 24/7 server.',
  }),
  sagemaker: spec({
    type: 'sagemaker',
    name: 'Amazon SageMaker',
    shortLabel: 'SageMaker',
    category: 'Compute',
    tier: 'compute',
    zones: VPC_ZONES,
    port: 443,
    latencyMs: 70,
    cost: flat(160),
    capacityRps: () => 800,
    invokedViaApi: true,
    defaultConfig: { port: 443 },
    color: '#01A88D',
    description: 'Builds, trains and hosts machine learning models as real-time endpoints.',
    plainEnglishTip: 'Runs your trained AI models to score fraud or recommendations live.',
  }),
  dms: spec({
    type: 'dms',
    name: 'AWS DMS',
    shortLabel: 'DMS',
    category: 'Database',
    tier: 'compute',
    zones: VPC_ZONES,
    port: 0,
    latencyMs: 30,
    cost: flat(40),
    capacityRps: () => 1000,
    background: true,
    defaultConfig: {},
    color: '#14B8A6',
    description: 'Copies live data from a legacy database into AWS with minimal downtime.',
    plainEnglishTip: 'A moving truck that copies your old database into AWS while the app stays online.',
  }),

  // ---- Async --------------------------------------------------------------
  sqs: spec({
    type: 'sqs',
    name: 'SQS Queue',
    shortLabel: 'SQS',
    category: 'Serverless',
    tier: 'async',
    zones: REGIONAL_ZONES,
    regional: true,
    port: 443,
    latencyMs: 10,
    cost: flat(10),
    defaultConfig: { dlqEnabled: true },
    color: '#D946EF',
    description: 'A message queue that buffers jobs so backend workers are never overwhelmed.',
    plainEnglishTip: 'A waiting line for tasks so traffic spikes do not crash your servers.',
  }),
  sns: spec({
    type: 'sns',
    name: 'SNS Topic',
    shortLabel: 'SNS',
    category: 'Serverless',
    tier: 'async',
    zones: REGIONAL_ZONES,
    regional: true,
    port: 443,
    latencyMs: 8,
    cost: flat(8),
    defaultConfig: {},
    color: '#EC4899',
    description: 'Pub/sub topic that broadcasts one event to many subscribers.',
    plainEnglishTip: 'A loudspeaker that sends one message to many services at once.',
  }),
  kinesis: spec({
    type: 'kinesis',
    name: 'Amazon Kinesis',
    shortLabel: 'Kinesis',
    category: 'Serverless',
    tier: 'async',
    zones: REGIONAL_ZONES,
    regional: true,
    port: 443,
    latencyMs: 15,
    cost: flat(35),
    defaultConfig: {},
    color: '#8B5CF6',
    description: 'Real-time stream that ingests thousands of events per second.',
    plainEnglishTip: 'A high-speed conveyor belt for live clicks and events.',
  }),

  // ---- Data ---------------------------------------------------------------
  rds: spec({
    type: 'rds',
    name: 'RDS PostgreSQL',
    shortLabel: 'RDS',
    category: 'Database',
    tier: 'data',
    zones: ['private'],
    port: 5432,
    latencyMs: 110,
    cost: (c) => 95 + (c.multiAZ ? 85 : 0) + (c.readReplica ? 65 : 0),
    capacityRps: (c) => (c.readReplica ? 3000 : 1500),
    defaultConfig: {
      port: 5432,
      multiAZ: false,
      encrypted: true,
      readReplica: false,
      securityGroupInbound: [{ protocol: 'tcp', port: 5432, source: 'vpc' }],
    },
    color: '#3B82F6',
    description: 'Managed SQL database with backups, Multi-AZ failover and read replicas.',
    plainEnglishTip: 'A structured database (port 5432) for accounts, orders and payments.',
  }),
  dynamodb: spec({
    type: 'dynamodb',
    name: 'DynamoDB',
    shortLabel: 'DynamoDB',
    category: 'Database',
    tier: 'data',
    zones: REGIONAL_ZONES,
    regional: true,
    port: 443,
    latencyMs: 8,
    cost: flat(25),
    capacityRps: () => 40000,
    defaultConfig: { encrypted: true },
    color: '#2563EB',
    description: 'Serverless key-value database with single-digit millisecond reads at any scale.',
    plainEnglishTip: 'An ultra-fast, maintenance-free database for key-value lookups.',
  }),
  redis: spec({
    type: 'redis',
    name: 'ElastiCache Redis',
    shortLabel: 'Redis',
    category: 'Database',
    tier: 'data',
    zones: ['private'],
    port: 6379,
    latencyMs: 1,
    cost: flat(55),
    capacityRps: () => 50000,
    defaultConfig: {
      port: 6379,
      evictionPolicy: 'allkeys-lru',
      securityGroupInbound: [{ protocol: 'tcp', port: 6379, source: 'vpc' }],
    },
    color: '#D82C20',
    description: 'In-memory cache that answers repeated reads in under a millisecond.',
    plainEnglishTip: 'Super-fast memory in front of your database so repeat reads skip the slow trip.',
  }),
  redshift: spec({
    type: 'redshift',
    name: 'Amazon Redshift',
    shortLabel: 'Redshift',
    category: 'Database',
    tier: 'data',
    zones: ['private'],
    port: 5439,
    latencyMs: 300,
    cost: flat(180),
    capacityRps: () => 200,
    defaultConfig: {
      port: 5439,
      encrypted: true,
      securityGroupInbound: [{ protocol: 'tcp', port: 5439, source: 'vpc' }],
    },
    color: '#8B5CF6',
    description: 'Petabyte-scale data warehouse for analytics and BI queries.',
    plainEnglishTip: 'A giant analytics database for crunching millions of historical records.',
  }),
  s3: spec({
    type: 's3',
    name: 'S3 Bucket',
    shortLabel: 'S3',
    category: 'Storage',
    tier: 'data',
    zones: REGIONAL_ZONES,
    regional: true,
    port: 443,
    latencyMs: 25,
    cost: flat(5),
    capacityRps: () => 5500,
    extraDownstream: ['redshift'],
    defaultConfig: { blockPublicAccess: true, encrypted: true, versioning: false },
    color: '#7AA116',
    description: 'Durable object storage for files, images, backups and static websites.',
    plainEnglishTip: 'An unlimited cloud drive for files, images and static website assets.',
  }),
  ebs: spec({
    type: 'ebs',
    name: 'EBS Volume',
    shortLabel: 'EBS',
    category: 'Storage',
    tier: 'data',
    zones: VPC_ZONES,
    port: 0,
    latencyMs: 2,
    cost: flat(18),
    defaultConfig: { encrypted: true },
    color: '#7AA116',
    description: 'Block storage disk attached to exactly one EC2 instance.',
    plainEnglishTip: 'A virtual SSD plugged into one server so its data survives reboots.',
  }),
  efs: spec({
    type: 'efs',
    name: 'EFS File System',
    shortLabel: 'EFS',
    category: 'Storage',
    tier: 'data',
    zones: VPC_ZONES,
    port: 2049,
    latencyMs: 6,
    cost: flat(30),
    defaultConfig: { encrypted: true, multiAZ: true },
    color: '#7AA116',
    description: 'Shared network file system many servers can mount at once.',
    plainEnglishTip: 'A shared folder many servers across AZs can read and write together.',
  }),

  // ---- Control plane ------------------------------------------------------
  iam: spec({
    type: 'iam',
    name: 'IAM Role',
    shortLabel: 'IAM',
    category: 'Security',
    tier: 'control',
    zones: REGIONAL_ZONES,
    regional: true,
    port: 0,
    latencyMs: 0,
    cost: flat(0),
    defaultConfig: { iamRole: 's3:ReadOnly' },
    color: '#DD344C',
    description: 'A permission badge that lets a server access other AWS services without passwords.',
    plainEnglishTip: 'A digital badge that says exactly what a server is allowed to do.',
  }),
  kms: spec({
    type: 'kms',
    name: 'KMS Key',
    shortLabel: 'KMS',
    category: 'Security',
    tier: 'control',
    zones: REGIONAL_ZONES,
    regional: true,
    port: 0,
    latencyMs: 0,
    cost: flat(5),
    defaultConfig: { keyRotation: true },
    color: '#EAB308',
    description: 'Manages the encryption keys that protect your disks and databases.',
    plainEnglishTip: 'A vault of master keys that scramble stored data so thieves cannot read it.',
  }),
  cloudwatch: spec({
    type: 'cloudwatch',
    name: 'CloudWatch',
    shortLabel: 'CloudWatch',
    category: 'Operations',
    tier: 'control',
    zones: REGIONAL_ZONES,
    regional: true,
    port: 0,
    latencyMs: 0,
    cost: flat(10),
    defaultConfig: { alarmThreshold: 80 },
    color: '#E7157B',
    description: 'Tracks CPU, latency and errors, and raises alarms when something breaks.',
    plainEnglishTip: 'A health monitor and alarm system for your servers.',
  }),
  cloudtrail: spec({
    type: 'cloudtrail',
    name: 'CloudTrail',
    shortLabel: 'CloudTrail',
    category: 'Operations',
    tier: 'control',
    zones: REGIONAL_ZONES,
    regional: true,
    port: 0,
    latencyMs: 0,
    cost: flat(12),
    defaultConfig: { encrypted: true },
    color: '#E7157B',
    description: 'Records every API call made in your AWS account for audits.',
    plainEnglishTip: 'A security-camera logbook of who changed what in your account.',
  }),
};

export const SERVICE_TYPES = Object.keys(CATALOG) as ServiceType[];

export function serviceSpec(type: ServiceType): ServiceSpec {
  return CATALOG[type];
}

export function isServiceType(value: unknown): value is ServiceType {
  return typeof value === 'string' && value in CATALOG;
}

/** Deep copy of a service's default config, safe to mutate. */
export function defaultConfigFor(type: ServiceType): BlockConfig {
  return structuredClone(CATALOG[type].defaultConfig);
}

export function blockCost(type: ServiceType, config: BlockConfig): number {
  return CATALOG[type].cost(config);
}

/** The port a request uses to reach this block. */
export function listeningPort(type: ServiceType, config: BlockConfig): number {
  const configured = Number(config.port);
  return Number.isFinite(configured) && configured > 0 ? configured : CATALOG[type].port;
}
