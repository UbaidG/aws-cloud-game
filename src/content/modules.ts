/** Course structure: 13 modules of 10 levels, each ending in an assessment. */

import type { GameMode, ServiceType } from '../engine/types';

export interface ModuleSpec {
  id: number;
  title: string;
  shortTitle: string;
  summary: string;
  levelIds: number[];
  assessmentLevelId: number;
  badge: ServiceType;
}

const raw: [title: string, shortTitle: string, badge: ServiceType, summary: string][] = [
  ['Introduction to the Cloud', 'Intro to Cloud', 'ec2', 'What the cloud is, how traffic reaches a server, firewalls, subnets, storage and databases.'],
  ['Compute in the Cloud', 'Compute', 'asg', 'EC2 sizing, scaling up and out, load balancers, Auto Scaling and Multi-AZ.'],
  ['Exploring Compute Services', 'Serverless & Containers', 'lambda', 'Lambda, API Gateway, ECS, EKS, Elastic Beanstalk and queues.'],
  ['Going Global', 'Global & CDN', 'cloudfront', 'Availability Zones, Route 53 DNS and CloudFront edge caching.'],
  ['Networking', 'VPC Networking', 'igw', 'Internet Gateways, public and private subnets, NAT, security groups and Transit Gateway.'],
  ['Storage', 'Storage', 's3', 'EBS, EFS and S3: block, file and object storage, encryption and cleanup.'],
  ['Databases', 'Databases', 'rds', 'RDS, Multi-AZ, read replicas, DynamoDB, Redis caching and Redshift.'],
  ['AI/ML and Data Analytics', 'AI & Analytics', 'sagemaker', 'Kinesis streams, data lakes, Redshift and SageMaker models.'],
  ['Security', 'Security', 'waf', 'Shared responsibility, IAM roles, WAF, KMS encryption and locking down breaches.'],
  ['Monitoring, Compliance, and Governance', 'Monitoring', 'cloudwatch', 'CloudWatch metrics and alarms, SNS paging and CloudTrail audit logs.'],
  ['Pricing and Support', 'Cost', 'dynamodb', 'Idle spend, serverless savings, right-sizing and budgets.'],
  ['Migrating to the AWS Cloud', 'Migration', 'dms', 'Lift and shift, DMS, replatforming, refactoring and DNS cutovers.'],
  ['Well-Architected Solutions', 'Well-Architected', 'alb', 'The six pillars, and capstone architectures that use all of them.'],
];

export const MODULES: ModuleSpec[] = raw.map(([title, shortTitle, badge, summary], i) => {
  const first = i * 10 + 1;
  return {
    id: i + 1,
    title,
    shortTitle,
    summary,
    badge,
    levelIds: Array.from({ length: 10 }, (_, k) => first + k),
    assessmentLevelId: first + 9,
  };
});

export function moduleOf(levelId: number): ModuleSpec | undefined {
  return MODULES.find((m) => m.levelIds.includes(levelId));
}

export interface GameModeMeta {
  label: string;
  badge: string;
  description: string;
}

export const GAME_MODES: Record<GameMode, GameModeMeta> = {
  packet_tracer: { label: 'Packet Tracer', badge: 'TRACE', description: 'Follow a request hop by hop and make every link work.' },
  outage_repair: { label: 'Outage Repair', badge: 'OUTAGE', description: 'Something is broken in production. Find it and fix it.' },
  latency_tuning: { label: 'Latency Tuning', badge: 'LATENCY', description: 'Get response times under the target with caches and CDNs.' },
  rate_limit_triage: { label: 'Rate-Limit Triage', badge: 'RATE LIMIT', description: 'Tame bursts and bots with API Gateway, WAF and queues.' },
  traffic_wave: { label: 'Traffic Wave', badge: 'SCALE', description: 'Add capacity to survive a surge without dropping requests.' },
  security_defense: { label: 'Security Defense', badge: 'SECURITY', description: 'Close the holes before an attacker finds them.' },
  cost_slasher: { label: 'Cost Slasher', badge: 'FINOPS', description: 'Cut the monthly bill without breaking anything.' },
};
