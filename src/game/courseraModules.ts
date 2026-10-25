/**
 * Coursera AWS Cloud Practitioner Essentials — 13-Module, 130-Level Curriculum Engine
 * Organizes CloudCraft into 13 structured modules (10 levels per module = 130 levels total),
 * where every 10th level (10, 20, 30 ... 130) is a Graded Module Boss Assessment.
 */

import {
  ArchitectureState,
  AWSComponentType,
  GameMode,
  LevelDefinition,
  Requirement,
  StoryboardSpec,
} from './types';
import { evaluateArchitectureDiagnostics, evaluateConnectionPhysics } from './networkPhysics';

export interface CourseraModuleMeta {
  id: number;
  title: string;
  shortTitle: string;
  syllabusSummary: string;
  levels: number[];
  assessmentLevelId: number;
  badgeIcon: AWSComponentType;
}

export const COURSERA_MODULES: CourseraModuleMeta[] = [
  {
    id: 1,
    title: 'Module 1: Introduction to the Cloud',
    shortTitle: 'Intro to Cloud',
    syllabusSummary:
      'Foundational understanding of cloud computing, on-demand delivery, pay-as-you-go pricing, and shared responsibilities.',
    levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    assessmentLevelId: 10,
    badgeIcon: 'ec2',
  },
  {
    id: 2,
    title: 'Module 2: Compute in the Cloud',
    shortTitle: 'Compute (EC2)',
    syllabusSummary:
      'Amazon EC2 virtual machines, instance sizing, vertical vs. horizontal scaling, Auto Scaling Groups, and Elastic Load Balancing.',
    levels: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    assessmentLevelId: 20,
    badgeIcon: 'asg',
  },
  {
    id: 3,
    title: 'Module 3: Exploring Compute Services',
    shortTitle: 'Serverless & Containers',
    syllabusSummary:
      'Serverless computing with AWS Lambda, container orchestration with Amazon ECS and Amazon EKS, and PaaS with AWS Elastic Beanstalk.',
    levels: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    assessmentLevelId: 30,
    badgeIcon: 'lambda',
  },
  {
    id: 4,
    title: 'Module 4: Going Global',
    shortTitle: 'Global Infra & CDN',
    syllabusSummary:
      'AWS Global Infrastructure: Regions, Availability Zones, Edge Locations with Amazon CloudFront, Route 53 DNS, and CloudFormation IaC.',
    levels: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
    assessmentLevelId: 40,
    badgeIcon: 'cloudfront',
  },
  {
    id: 5,
    title: 'Module 5: Networking',
    shortTitle: 'VPC Networking',
    syllabusSummary:
      'Amazon VPC, Public vs. Private Subnets, Internet Gateways, NAT Gateways, Route Tables, Security Groups, and Transit Gateways.',
    levels: [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
    assessmentLevelId: 50,
    badgeIcon: 'igw',
  },
  {
    id: 6,
    title: 'Module 6: Storage',
    shortTitle: 'Cloud Storage',
    syllabusSummary:
      'Block storage (Amazon EBS), Object storage (Amazon S3), Shared File storage (Amazon EFS), and lifecycle archival.',
    levels: [51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
    assessmentLevelId: 60,
    badgeIcon: 's3',
  },
  {
    id: 7,
    title: 'Module 7: Databases',
    shortTitle: 'Databases & Cache',
    syllabusSummary:
      'Relational databases (Amazon RDS), NoSQL key-value stores (Amazon DynamoDB), in-memory caching (ElastiCache Redis), and Redshift.',
    levels: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70],
    assessmentLevelId: 70,
    badgeIcon: 'rds',
  },
  {
    id: 8,
    title: 'Module 8: AI/ML and Data Analytics',
    shortTitle: 'AI/ML & Analytics',
    syllabusSummary:
      'Real-time data streaming (Amazon Kinesis), data warehousing (Amazon Redshift), and machine learning inference (Amazon SageMaker).',
    levels: [71, 72, 73, 74, 75, 76, 77, 78, 79, 80],
    assessmentLevelId: 80,
    badgeIcon: 'sagemaker',
  },
  {
    id: 9,
    title: 'Module 9: Security',
    shortTitle: 'Security & IAM',
    syllabusSummary:
      'Shared Responsibility Model, AWS IAM least-privilege roles, AWS WAF firewall shields, and AWS KMS encryption.',
    levels: [81, 82, 83, 84, 85, 86, 87, 88, 89, 90],
    assessmentLevelId: 90,
    badgeIcon: 'waf',
  },
  {
    id: 10,
    title: 'Module 10: Monitoring, Compliance, and Governance',
    shortTitle: 'Monitoring & Audit',
    syllabusSummary:
      'Observability and metrics with Amazon CloudWatch, API audit logging with AWS CloudTrail, and automated SNS incident alerts.',
    levels: [91, 92, 93, 94, 95, 96, 97, 98, 99, 100],
    assessmentLevelId: 100,
    badgeIcon: 'cloudwatch',
  },
  {
    id: 11,
    title: 'Module 11: Pricing and Support',
    shortTitle: 'Pricing & FinOps',
    syllabusSummary:
      'AWS pricing models, eliminating idle/unwired compute waste, right-sizing oversized instances, and FinOps cost optimization.',
    levels: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
    assessmentLevelId: 110,
    badgeIcon: 's3',
  },
  {
    id: 12,
    title: 'Module 12: Migrating to the AWS Cloud',
    shortTitle: 'Cloud Migration',
    syllabusSummary:
      'The 6 Rs of Cloud Migration, live database replication with AWS DMS, and zero-downtime hybrid DNS cutovers.',
    levels: [111, 112, 113, 114, 115, 116, 117, 118, 119, 120],
    assessmentLevelId: 120,
    badgeIcon: 'dms',
  },
  {
    id: 13,
    title: 'Module 13: Well-Architected Solutions',
    shortTitle: 'Well-Architected',
    syllabusSummary:
      'The 6 Pillars of the AWS Well-Architected Framework: Operational Excellence, Security, Reliability, Performance, Cost, and Sustainability.',
    levels: [121, 122, 123, 124, 125, 126, 127, 128, 129, 130],
    assessmentLevelId: 130,
    badgeIcon: 'alb',
  },
];

// Helper checks
function hasValidPlaced(
  state: ArchitectureState,
  type: AWSComponentType,
  expectedSubnet?: 'public' | 'private' | 'edge'
): boolean {
  return state.components.some(
    (c) =>
      c.type === type &&
      c.status !== 'error' &&
      c.subnet !== 'external' &&
      (expectedSubnet ? c.subnet === expectedSubnet : true)
  );
}

function hasValidWire(
  state: ArchitectureState,
  typeA: AWSComponentType,
  typeB: AWSComponentType
): boolean {
  return state.connections.some((conn) => {
    if (conn.allowed === false) return false;
    const fromComp = state.components.find((c) => c.id === conn.fromId);
    const toComp = state.components.find((c) => c.id === conn.toId);
    if (!fromComp || !toComp) return false;
    const phys = evaluateConnectionPhysics(fromComp, toComp);
    if (!phys.allowed) return false;
    return (
      (fromComp.type === typeA && toComp.type === typeB) ||
      (fromComp.type === typeB && toComp.type === typeA)
    );
  });
}

function hasZeroFatalViolations(state: ArchitectureState, levelId: number): boolean {
  return (
    evaluateArchitectureDiagnostics(state, levelId).violations.filter(
      (v) => v.severity === 'error'
    ).length === 0
  );
}

/**
 * Creates a concise, beginner-friendly Cardboard-Cutout Diorama Storyboard
 * with short 8–12 word captions and 2–3 cutout props per slide (zero clipping).
 */
export function buildCardboardStoryboard(
  level: LevelDefinition,
  moduleMeta: CourseraModuleMeta
): StoryboardSpec {
  const p1Type = level.allowedPalette[0] || moduleMeta.badgeIcon || 'ec2';
  const p2Type = level.allowedPalette[1] || 'rds';

  const companyByModule: Record<number, { name: string; story: string }> = {
    1: { name: 'PizzaTracker App', story: 'Moving a Pizza Order Website from a Bedroom PC to AWS' },
    2: { name: 'SneakerDrop Store', story: 'Scaling EC2 Web Servers When 50,000 Shoppers Arrive' },
    3: { name: 'SnapPhoto Serverless', story: 'Resizing Photos on Demand with Lambda & Containers' },
    4: { name: 'Netflix Global Edge', story: 'Streaming Video Worldwide in 15ms with CloudFront CDN' },
    5: { name: 'Stripe VPC Vault', story: 'Locking Payment Databases Inside a Private Subnet' },
    6: { name: 'Spotify Media Cloud', story: 'Storing Billions of Songs Across S3, EBS, and EFS' },
    7: { name: 'Instagram Live Likes', story: 'Caching Millions of Likes in 0.8ms with Redis & RDS' },
    8: { name: 'Uber Fraud AI', story: 'Streaming Ride Events Through Kinesis to SageMaker AI' },
    9: { name: 'Coinbase Shield', story: 'Blocking Hackers with AWS WAF, IAM Roles & KMS Keys' },
    10: { name: 'PagerDuty Ops Radar', story: 'Catching Midnight Outages with CloudWatch & CloudTrail' },
    11: { name: 'Airbnb FinOps Team', story: 'Slashing Wasted Cloud Bills by Deleting Idle Servers' },
    12: { name: 'Legacy Bank Cutover', story: 'Migrating an Old Data Center to AWS with Zero Downtime' },
    13: { name: 'AWS Well-Architected', story: 'Designing a Bulletproof 6-Pillar Global Cloud Platform' },
  };

  const info = companyByModule[moduleMeta.id] || companyByModule[1];

  return {
    realWorldCompany: info.name,
    realWorldUseCase: info.story,
    panels: [
      {
        badge: 'SLIDE 1 · REAL-WORLD STORY',
        title: `${info.name}: ${level.concepts[0] || moduleMeta.shortTitle}`,
        speechBubble: `"Users tap their phones—let's see how ${info.name} handles the request!"`,
        caption: `In the real world, ${info.name} uses ${level.concepts.slice(0, 2).join(' + ')} so users get fast, reliable responses.`,
        visualType: 'phone_dns_server',
        nodes: [
          { type: 'client', label: 'User Phone', metric: 'Tap!', status: 'ok' },
          { type: p1Type, label: level.concepts[0]?.slice(0, 12) || 'AWS Cloud', metric: 'Live', status: 'ok' },
        ],
      },
      {
        badge: 'SLIDE 2 · WHAT GOES WRONG',
        title: level.isAssessment ? 'Graded Module Boss Challenge!' : 'The Broken Setup on Your Board',
        speechBubble: `"Uh oh! Traffic is failing or servers are placed in the wrong zone!"`,
        caption:
          level.id <= 10
            ? level.briefing
            : `Right now, traffic cannot complete the journey cleanly. Placing servers in the wrong zone or leaving idle unwired boxes will fail the check!`,
        visualType: 'subnet_wall',
        nodes: [
          { type: 'client', label: 'Visitors', metric: 'Waiting...', status: 'warn' },
          { type: p1Type, label: 'Missing / Broken', metric: 'Fix Me!', status: 'fail' },
        ],
      },
      {
        badge: 'SLIDE 3 · YOUR BUILD PLAN',
        title: `Deploy & Wire ${level.allowedPalette.map((t) => t.toUpperCase()).slice(0, 2).join(' + ') || 'Your Stack'}`,
        speechBubble: `"Place the right AWS block in the right zone, wire it up, and hit Test Traffic!"`,
        caption: `Use your bottom dock to place and wire ${level.allowedPalette.map((t) => t.toUpperCase()).join(', ') || 'the components'}, then click Test Traffic.`,
        visualType: 'ha_load_balancer',
        nodes: [
          { type: 'client', label: 'Users', status: 'ok' },
          { type: p1Type, label: p1Type.toUpperCase(), metric: 'Wired', status: 'ok' },
          ...(level.allowedPalette.length > 1
            ? [{ type: p2Type, label: p2Type.toUpperCase(), metric: 'Healthy', status: 'ok' as const }]
            : []),
        ],
      },
    ],
  };
}

interface ModuleBlueprintSpec {
  moduleId: number;
  primaryService: AWSComponentType;
  primarySubnet: 'public' | 'private' | 'edge';
  secondaryService: AWSComponentType;
  secondarySubnet: 'public' | 'private' | 'edge';
  conceptsPool: string[][];
  levelTitles: string[];
  gameModes: GameMode[];
}

const MODULE_BLUEPRINTS: Record<number, ModuleBlueprintSpec> = {
  1: {
    moduleId: 1,
    primaryService: 'ec2',
    primarySubnet: 'public',
    secondaryService: 'route53',
    secondarySubnet: 'edge',
    conceptsPool: [
      ['Cloud vs On-Premises', 'Port 80 HTTP'],
      ['On-Demand Provisioning', 'Public Subnet'],
      ['Virtual Network Cables', 'Client-Server Flow'],
      ['Security Group Firewalls', 'Inbound Port 80'],
      ['Replacing Failed Hardware', 'Elasticity'],
      ['Public vs Private Zones', 'VPC Isolation'],
      ['Domain Name System (DNS)', 'Route 53'],
      ['Object Storage Basics', 'Amazon S3'],
      ['Relational Database Basics', 'Amazon RDS'],
      ['Module 1 Graded Assessment', 'Cloud Foundations'],
    ],
    levelTitles: [
      'Hello Cloud: Inspect & Test Your First EC2 Server',
      'On-Demand Compute: Place an EC2 in the Public Subnet',
      'Packet Flow: Wire Internet Users to Your Cloud Server',
      'Shared Responsibility: Open Firewall Port 80',
      'Self-Healing Cloud: Replace a Crashed On-Prem Server',
      'Zone Boundaries: Why Public Web Servers Belong in Public Subnets',
      'Cloud Phonebook: Route Users Through Route 53 DNS',
      'Static Offload: Attach an Amazon S3 Bucket for Media',
      'Two-Tier App: Connect Public EC2 to a Private RDS Database',
      'GRADED ASSESSMENT: Module 1 — Startup Cloud Cutover',
    ],
    gameModes: [
      'packet_tracer',
      'packet_tracer',
      'packet_tracer',
      'security_defense',
      'outage_repair',
      'security_defense',
      'packet_tracer',
      'cost_slasher',
      'outage_repair',
      'outage_repair',
    ],
  },
  2: {
    moduleId: 2,
    primaryService: 'ec2',
    primarySubnet: 'public',
    secondaryService: 'alb',
    secondarySubnet: 'public',
    conceptsPool: [
      ['Amazon EC2 Sizing', 't3.micro vs m5.large'],
      ['Vertical Scaling', 'Instance Families'],
      ['Horizontal Scaling', 'Dual EC2 Web Tier'],
      ['Elastic Load Balancing', 'ALB Traffic Split'],
      ['ALB Health Checks', 'Surviving Server Failure'],
      ['EC2 Auto Scaling Groups', 'Dynamic Capacity'],
      ['Scale-Out Policies', 'Handling Viral Traffic'],
      ['Scale-In Cost Protection', 'Avoiding Idle EC2s'],
      ['Multi-AZ Compute Fleet', 'High Availability'],
      ['Module 2 Graded Assessment', 'Elastic Compute Architecture'],
    ],
    levelTitles: [
      'EC2 Instance Basics: Launch Your Virtual Machine',
      'Right-Sizing EC2: Upgrade Instance Capacity for Heavy Load',
      'Horizontal Scaling: Deploy Dual EC2 Web Servers',
      'Traffic Cop: Place an Application Load Balancer (ALB)',
      'Health Check Failover: Route Around a Crashed EC2 Node',
      'Auto Scaling Groups (ASG): Automatic Server Cloning',
      'Flash Sale Surge: Scale Out ASG Capacity Under Load',
      'FinOps Compute: Terminate Unwired Idle EC2 Servers',
      'Multi-AZ EC2 + ALB: Zero Single Points of Failure',
      'GRADED ASSESSMENT: Module 2 — Flash-Sale EC2 Fleet',
    ],
    gameModes: [
      'outage_repair',
      'latency_tuning',
      'traffic_wave',
      'traffic_wave',
      'outage_repair',
      'traffic_wave',
      'traffic_wave',
      'cost_slasher',
      'traffic_wave',
      'traffic_wave',
    ],
  },
  3: {
    moduleId: 3,
    primaryService: 'lambda',
    primarySubnet: 'public',
    secondaryService: 'ecs',
    secondarySubnet: 'public',
    conceptsPool: [
      ['Serverless Compute', 'AWS Lambda'],
      ['API Gateway + Lambda', 'Event-Driven Microservices'],
      ['Container Basics', 'Amazon ECS'],
      ['ECS + Load Balancing', 'Containerized Web Tier'],
      ['Kubernetes on AWS', 'Amazon EKS'],
      ['EKS Pod Orchestration', 'Private Data Wiring'],
      ['Platform as a Service (PaaS)', 'AWS Elastic Beanstalk'],
      ['Beanstalk Rapid Web Launch', 'Managed Scaling'],
      ['Hybrid Compute Selection', 'Lambda vs ECS vs EC2'],
      ['Module 3 Graded Assessment', 'Modern Compute Stack'],
    ],
    levelTitles: [
      'Zero Idle Bill: Deploy Your First AWS Lambda Function',
      'Serverless Front Door: Wire API Gateway to AWS Lambda',
      'Docker in the Cloud: Launch an Amazon ECS Container Service',
      'Load-Balanced Containers: Wire ALB to Amazon ECS',
      'Kubernetes Captain: Deploy an Amazon EKS Cluster',
      'EKS Microservices: Connect Kubernetes to Private RDS',
      'Easy PaaS Deployment: Launch an App with Elastic Beanstalk',
      'Beanstalk + S3 Media: Managed Web Platform',
      'Burst Buffering: Connect SQS Queue to Serverless Lambda',
      'GRADED ASSESSMENT: Module 3 — Serverless & Container Platform',
    ],
    gameModes: [
      'cost_slasher',
      'rate_limit_triage',
      'outage_repair',
      'traffic_wave',
      'outage_repair',
      'latency_tuning',
      'outage_repair',
      'cost_slasher',
      'rate_limit_triage',
      'traffic_wave',
    ],
  },
  4: {
    moduleId: 4,
    primaryService: 'cloudfront',
    primarySubnet: 'edge',
    secondaryService: 'route53',
    secondarySubnet: 'edge',
    conceptsPool: [
      ['AWS Regions', 'Geographic Proximity'],
      ['Availability Zones (AZs)', 'Isolated Data Centers'],
      ['Edge Locations', 'Amazon CloudFront CDN'],
      ['S3 + CloudFront Caching', 'Sub-20ms Global Reads'],
      ['Amazon Route 53', 'Global DNS Routing'],
      ['Route 53 Failover', 'Active-Passive Disaster Recovery'],
      ['Edge Security + CDN', 'WAF + CloudFront'],
      ['Global API Acceleration', 'CloudFront + ALB'],
      ['Infrastructure as Code', 'CloudFormation / Terraform'],
      ['Module 4 Graded Assessment', 'Global Multi-AZ Architecture'],
    ],
    levelTitles: [
      'Choosing a Region: Deploy Compute Close to Your Users',
      'Multi-AZ Resilience: Survive a Data Center Power Outage',
      'Edge Caching: Place Amazon CloudFront CDN at the Edge',
      'Static Speedup: Wire CloudFront CDN to an S3 Bucket',
      'Global DNS: Direct Traffic with Amazon Route 53',
      'DNS Failover: Reroute Users Away from an Offline Server',
      'Protected Edge: Combine Route 53, CloudFront, and EC2',
      'Global Dynamic App: Accelerate ALB Behind CloudFront',
      'Automated Blueprints: Deploy a Repeatable Multi-AZ Stack',
      'GRADED ASSESSMENT: Module 4 — Global Low-Latency Launch',
    ],
    gameModes: [
      'latency_tuning',
      'outage_repair',
      'latency_tuning',
      'latency_tuning',
      'packet_tracer',
      'outage_repair',
      'security_defense',
      'latency_tuning',
      'outage_repair',
      'latency_tuning',
    ],
  },
  5: {
    moduleId: 5,
    primaryService: 'igw',
    primarySubnet: 'edge',
    secondaryService: 'nat_gw',
    secondarySubnet: 'public',
    conceptsPool: [
      ['Amazon VPC', 'Isolated Cloud Network'],
      ['Internet Gateway (IGW)', 'VPC Front Door'],
      ['Public vs Private Subnets', 'CIDR Segmentation'],
      ['Blocking Direct Private Access', 'Route Table Physics'],
      ['NAT Gateway', 'Outbound-Only Private Updates'],
      ['Security Groups', 'Stateful Instance Firewalls'],
      ['Network ACLs & WAF', 'Perimeter Filtering'],
      ['Application Load Balancer in VPC', 'Public-to-Private Bridge'],
      ['AWS Transit Gateway', 'Multi-VPC Hub'],
      ['Module 5 Graded Assessment', 'Zero-Trust VPC Network'],
    ],
    levelTitles: [
      'VPC Front Door: Attach an Internet Gateway (IGW)',
      'Public Subnet Routing: Wire Users → IGW → Public EC2',
      'Private Vault: Isolate RDS Inside the Private Subnet',
      'Outbound Patching: Place a NAT Gateway in the Public Subnet',
      'Private-to-Internet Bridge: Wire Private Tier → NAT GW → IGW',
      'Stateful Firewalls: Configure EC2 & RDS Security Groups',
      'Public Lobby to Private Vault: Wire ALB to Private Servers',
      'Multi-VPC Hub: Connect Networks with AWS Transit Gateway',
      'Stopping Illegal Routes: Fix a Direct Internet-to-Private Breach',
      'GRADED ASSESSMENT: Module 5 — Enterprise Three-Tier VPC',
    ],
    gameModes: [
      'packet_tracer',
      'packet_tracer',
      'security_defense',
      'outage_repair',
      'packet_tracer',
      'security_defense',
      'security_defense',
      'outage_repair',
      'security_defense',
      'security_defense',
    ],
  },
  6: {
    moduleId: 6,
    primaryService: 'ebs',
    primarySubnet: 'public',
    secondaryService: 's3',
    secondarySubnet: 'public',
    conceptsPool: [
      ['Block Storage', 'Amazon EBS'],
      ['EBS Snapshots & Persistence', 'EC2 Boot Volumes'],
      ['Object Storage', 'Amazon S3'],
      ['S3 Static Web Hosting', '11 Nines Durability'],
      ['Shared File Storage', 'Amazon EFS'],
      ['Multi-EC2 Shared Mounts', 'EFS Across AZs'],
      ['Storage Security', 'S3 Block Public Access'],
      ['CDN + Object Storage', 'CloudFront + S3'],
      ['Storage Cost Tiering', 'S3 Lifecycle & EBS Cleanup'],
      ['Module 6 Graded Assessment', 'Tri-Storage Architecture'],
    ],
    levelTitles: [
      'Block Storage: Attach an Amazon EBS Volume to EC2',
      'Persistent Disks: Keep EC2 Data Safe with Amazon EBS',
      'Object Storage: Store Unlimited Media in Amazon S3',
      'Shared File System: Mount Amazon EFS to Compute',
      'Multi-Server Shared Files: Connect ALB + EC2 to Amazon EFS',
      'Block vs Object: Combine EBS Boot Disks with S3 Backups',
      'Fast Media Delivery: Wire CloudFront CDN to Amazon S3',
      'Encrypted Storage: Protect S3 and EBS with AWS KMS',
      'Zombie Disk Cleanup: Delete Unattached Idle Storage Waste',
      'GRADED ASSESSMENT: Module 6 — Full Enterprise Storage Stack',
    ],
    gameModes: [
      'outage_repair',
      'outage_repair',
      'cost_slasher',
      'outage_repair',
      'traffic_wave',
      'outage_repair',
      'latency_tuning',
      'security_defense',
      'cost_slasher',
      'outage_repair',
    ],
  },
  7: {
    moduleId: 7,
    primaryService: 'rds',
    primarySubnet: 'private',
    secondaryService: 'redis',
    secondarySubnet: 'private',
    conceptsPool: [
      ['Relational Databases', 'Amazon RDS'],
      ['RDS Multi-AZ Failover', 'Standby Database'],
      ['RDS Read Replicas', 'Offloading Heavy Reads'],
      ['NoSQL Key-Value Store', 'Amazon DynamoDB'],
      ['Serverless NoSQL Speed', 'Lambda + DynamoDB'],
      ['In-Memory Caching', 'ElastiCache Redis'],
      ['Sub-Millisecond Likes', 'EC2 + Redis + RDS'],
      ['Data Warehousing', 'Amazon Redshift'],
      ['Polyglot Persistence', 'Choosing SQL vs NoSQL vs Cache'],
      ['Module 7 Graded Assessment', 'High-Scale Database Tier'],
    ],
    levelTitles: [
      'Relational SQL: Launch Amazon RDS in the Private Subnet',
      'Automatic DB Failover: Enable Multi-AZ on Amazon RDS',
      'Read Bottleneck: Offload Queries with RDS & Redis Cache',
      'NoSQL Speed: Deploy an Amazon DynamoDB Table',
      'Serverless Data Tier: Wire AWS Lambda to DynamoDB',
      'Instagram Likes Cache: Add ElastiCache Redis (0.8ms RAM)',
      'Cache-Aside Pattern: Wire EC2 to Both Redis and RDS',
      'Petabyte SQL Analytics: Deploy Amazon Redshift in Private Zone',
      'Securing Data Tiers: Rescue an Exposed Public Database',
      'GRADED ASSESSMENT: Module 7 — Viral Social Feed Data Stack',
    ],
    gameModes: [
      'outage_repair',
      'outage_repair',
      'latency_tuning',
      'latency_tuning',
      'latency_tuning',
      'latency_tuning',
      'latency_tuning',
      'outage_repair',
      'security_defense',
      'latency_tuning',
    ],
  },
  8: {
    moduleId: 8,
    primaryService: 'sagemaker',
    primarySubnet: 'private',
    secondaryService: 'kinesis',
    secondarySubnet: 'public',
    conceptsPool: [
      ['Real-Time Streaming', 'Amazon Kinesis'],
      ['Stream Ingestion Pipeline', 'Kinesis to S3 Data Lake'],
      ['Enterprise Data Warehouse', 'Amazon Redshift'],
      ['Machine Learning Studio', 'Amazon SageMaker'],
      ['Real-Time AI Inference', 'EC2 / API GW to SageMaker'],
      ['Fraud Detection Stream', 'Kinesis + Lambda + SageMaker'],
      ['Protecting AI Endpoints', 'API Gateway Rate Limiting'],
      ['Caching AI Predictions', 'Redis + SageMaker'],
      ['Analytics Cost & Speed', 'Redshift + S3 Pipeline'],
      ['Module 8 Graded Assessment', 'AI/ML & Analytics Platform'],
    ],
    levelTitles: [
      'Live Data Streams: Ingest Clickstreams with Amazon Kinesis',
      'Data Lake Pipeline: Stream Amazon Kinesis into Amazon S3',
      'BI Data Warehouse: Connect Compute to Amazon Redshift',
      'Machine Learning in AWS: Deploy Amazon SageMaker in Private Zone',
      'Live AI Predictions: Wire Web Compute to Amazon SageMaker',
      'Streaming AI Triage: Connect Kinesis → Lambda → SageMaker',
      'AI Rate-Limit Shield: Protect SageMaker with API Gateway',
      'Sub-10ms AI Cache: Pair ElastiCache Redis with SageMaker',
      'Executive BI Pipeline: Wire Kinesis Streams to Redshift',
      'GRADED ASSESSMENT: Module 8 — Real-Time AI Fraud Engine',
    ],
    gameModes: [
      'traffic_wave',
      'outage_repair',
      'outage_repair',
      'outage_repair',
      'latency_tuning',
      'traffic_wave',
      'rate_limit_triage',
      'latency_tuning',
      'outage_repair',
      'rate_limit_triage',
    ],
  },
  9: {
    moduleId: 9,
    primaryService: 'waf',
    primarySubnet: 'edge',
    secondaryService: 'iam',
    secondarySubnet: 'public',
    conceptsPool: [
      ['Shared Responsibility Model', 'Security OF vs IN the Cloud'],
      ['AWS IAM Roles', 'Passwordless Server Permissions'],
      ['Principle of Least Privilege', 'Scoped IAM Policies'],
      ['Web Application Firewall', 'AWS WAF'],
      ['Blocking SQL Injection', 'WAF + ALB Perimeter'],
      ['DDoS & Bot Rate Limiting', 'WAF + API Gateway'],
      ['Encryption Keys', 'AWS KMS'],
      ['Encrypting Databases at Rest', 'KMS + Private RDS'],
      ['Zero-Trust Defense in Depth', 'WAF + Public Web + Private DB'],
      ['Module 9 Graded Assessment', 'Bank-Grade Cloud Security'],
    ],
    levelTitles: [
      'Shared Responsibility: Lock Down Your Customer Firewall Rules',
      'No Hardcoded Passwords: Attach an AWS IAM Role to EC2',
      'Perimeter Shield: Deploy AWS WAF at the Edge',
      'Stop SQL Injection: Filter Traffic Through WAF → ALB → EC2',
      'Botnet Throttle: Combine AWS WAF with API Gateway',
      'Cryptographic Vault: Provision an AWS KMS Master Key',
      'Encrypted Database Vault: Protect Private RDS with KMS & IAM',
      'S3 Data Leak Prevention: Secure Storage Behind IAM & WAF',
      'Live Breach Lockdown: Sever Illegal Direct-to-DB Wires',
      'GRADED ASSESSMENT: Module 9 — Zero-Trust Banking Lockdown',
    ],
    gameModes: [
      'security_defense',
      'security_defense',
      'security_defense',
      'security_defense',
      'rate_limit_triage',
      'security_defense',
      'security_defense',
      'security_defense',
      'security_defense',
      'security_defense',
    ],
  },
  10: {
    moduleId: 10,
    primaryService: 'cloudwatch',
    primarySubnet: 'public',
    secondaryService: 'cloudtrail',
    secondarySubnet: 'public',
    conceptsPool: [
      ['Observability Metrics', 'Amazon CloudWatch'],
      ['CloudWatch Alarms', 'Automated CPU & Latency Alerts'],
      ['API Audit Logging', 'AWS CloudTrail'],
      ['Who Deleted the Server?', 'CloudTrail Governance'],
      ['Incident Pager Alerts', 'Amazon SNS + CloudWatch'],
      ['Auto-Healing Telemetry', 'CloudWatch + Auto Scaling'],
      ['Archive Audit Logs', 'CloudTrail + Amazon S3'],
      ['SLA Latency Monitoring', 'CloudWatch + Redis'],
      ['SOC2 Compliance Stack', 'CloudTrail + KMS + IAM'],
      ['Module 10 Graded Assessment', 'Full Governance & Monitoring'],
    ],
    levelTitles: [
      'Radar On: Deploy Amazon CloudWatch to Monitor EC2 Health',
      'API Detective: Enable AWS CloudTrail to Audit Account Actions',
      'Pager Alert Pipeline: Wire CloudWatch Alarms to Amazon SNS',
      'Immutable Audit Vault: Store CloudTrail Logs in Amazon S3',
      'Auto-Scaling Telemetry: Pair CloudWatch with an ASG Fleet',
      'Latency Watchdog: Monitor Redis & RDS with CloudWatch',
      'Security Audit Trail: Combine CloudTrail, IAM, and WAF',
      'Queue Depth Monitoring: Track SQS Backlogs with CloudWatch',
      'Compliance Readiness: Full Audit & Observability Wiring',
      'GRADED ASSESSMENT: Module 10 — SOC2 Autonomous Ops Center',
    ],
    gameModes: [
      'outage_repair',
      'security_defense',
      'outage_repair',
      'security_defense',
      'traffic_wave',
      'latency_tuning',
      'security_defense',
      'rate_limit_triage',
      'outage_repair',
      'outage_repair',
    ],
  },
  11: {
    moduleId: 11,
    primaryService: 's3',
    primarySubnet: 'public',
    secondaryService: 'lambda',
    secondarySubnet: 'public',
    conceptsPool: [
      ['Pay-As-You-Go Pricing', 'Eliminating Idle Servers'],
      ['Right-Sizing Instances', 'Cutting Compute Spend'],
      ['Serverless Cost Savings', 'Lambda vs 24/7 EC2'],
      ['S3 Static Offload', 'Replacing Expensive Web Servers'],
      ['CDN Data Transfer Savings', 'CloudFront + S3'],
      ['DynamoDB On-Demand', 'Right-Sizing Database Spend'],
      ['Spot & Auto Scaling Economics', 'Matching Capacity to Demand'],
      ['Caching to Cut DB Size', 'Redis Cost Optimization'],
      ['Multi-Tier FinOps Audit', 'Slashing Monthly Cloud Bills'],
      ['Module 11 Graded Assessment', 'Enterprise FinOps Rescue'],
    ],
    levelTitles: [
      'Zombie Server Hunt: Delete Unwired Idle EC2s Burning Cash',
      'Serverless Savings: Replace Idle Compute with AWS Lambda',
      'Static Website FinOps: Host Assets on Amazon S3 ($5/mo)',
      'Bandwidth Saver: Add CloudFront CDN in Front of S3',
      'Pay-Per-Request Data: Pair AWS Lambda with DynamoDB',
      'Database Cost Shield: Use Redis Cache to Avoid Oversized RDS',
      'Elastic Spend: Use Auto Scaling Instead of Fixed Giant Fleets',
      'Queue Smoothing: Use SQS + Lambda for Spiky Night Jobs',
      'FinOps Budget Audit: Deliver 100% Uptime Under Strict Budget',
      'GRADED ASSESSMENT: Module 11 — The 60% Cloud Bill Slasher',
    ],
    gameModes: [
      'cost_slasher',
      'cost_slasher',
      'cost_slasher',
      'cost_slasher',
      'cost_slasher',
      'cost_slasher',
      'cost_slasher',
      'cost_slasher',
      'cost_slasher',
      'cost_slasher',
    ],
  },
  12: {
    moduleId: 12,
    primaryService: 'dms',
    primarySubnet: 'public',
    secondaryService: 'rds',
    secondarySubnet: 'private',
    conceptsPool: [
      ['The 6 Rs of Migration', 'Rehost (Lift & Shift) to EC2'],
      ['Database Migration Service', 'AWS DMS'],
      ['Live DB Replication', 'DMS to Private Amazon RDS'],
      ['Replatforming to Managed DB', 'EC2 + DMS + RDS'],
      ['Refactoring to Serverless', 'Migrating Monoliths to Lambda'],
      ['Hybrid DNS Cutover', 'Route 53 Weighted Routing'],
      ['Storage Migration', 'Moving On-Prem Files to S3 & EFS'],
      ['Containerizing Legacy Apps', 'Migrating to Amazon ECS'],
      ['Zero-Downtime Cutover', 'ALB + DMS + RDS Migration'],
      ['Module 12 Graded Assessment', 'Enterprise Cloud Migration'],
    ],
    levelTitles: [
      'Rehost (Lift & Shift): Move a Legacy App onto Amazon EC2',
      'Database Migration Service: Deploy AWS DMS in Your VPC',
      'Live Data Replication: Wire AWS DMS to Private Amazon RDS',
      'Replatforming Storage: Migrate File Shares to Amazon S3',
      'Container Migration: Move Legacy Services into Amazon ECS',
      'Refactor to Serverless: Modernize Legacy APIs with Lambda',
      'Zero-Downtime DNS Cutover: Switch Traffic with Route 53',
      'Hybrid Network Bridge: Link Environments via Transit Gateway',
      'Retire Old Hardware: Decommission Crashed Legacy Boxes',
      'GRADED ASSESSMENT: Module 12 — Zero-Downtime Bank Migration',
    ],
    gameModes: [
      'outage_repair',
      'packet_tracer',
      'outage_repair',
      'cost_slasher',
      'traffic_wave',
      'cost_slasher',
      'packet_tracer',
      'outage_repair',
      'cost_slasher',
      'outage_repair',
    ],
  },
  13: {
    moduleId: 13,
    primaryService: 'alb',
    primarySubnet: 'public',
    secondaryService: 'rds',
    secondarySubnet: 'private',
    conceptsPool: [
      ['Pillar 1: Operational Excellence', 'CloudWatch + Automation'],
      ['Pillar 2: Security', 'WAF + IAM + Private Subnets'],
      ['Pillar 3: Reliability', 'ALB + ASG + Multi-AZ RDS'],
      ['Pillar 4: Performance Efficiency', 'CloudFront + Redis Cache'],
      ['Pillar 5: Cost Optimization', 'Serverless & Right-Sizing'],
      ['Pillar 6: Sustainability', 'Efficient Elastic Scaling'],
      ['Well-Architected E-Commerce', 'Full-Stack Resilience'],
      ['Well-Architected AI SaaS', 'API GW + SageMaker + Redis'],
      ['Well-Architected Global Media', 'Route 53 + CDN + S3 + ECS'],
      ['Final Capstone Exam', 'AWS Certified Cloud Architect'],
    ],
    levelTitles: [
      'Pillar 1 — Operational Excellence: Automated CloudWatch Ops',
      'Pillar 2 — Security: Zero-Trust WAF & Private RDS Vault',
      'Pillar 3 — Reliability: Multi-AZ ALB, ASG & Failover DB',
      'Pillar 4 — Performance Efficiency: Sub-20ms CloudFront & Redis',
      'Pillar 5 — Cost Optimization: Lean Serverless & S3 Stack',
      'Pillar 6 — Sustainability: Right-Sized Auto-Scaled Compute',
      'Capstone Warmup 1: Resilient E-Commerce Checkout Platform',
      'Capstone Warmup 2: High-Throughput AI Inference Platform',
      'Capstone Warmup 3: Global Streaming & Edge Architecture',
      'FINAL CAPSTONE EXAM: Module 13 — AWS Well-Architected Master',
    ],
    gameModes: [
      'outage_repair',
      'security_defense',
      'traffic_wave',
      'latency_tuning',
      'cost_slasher',
      'cost_slasher',
      'rate_limit_triage',
      'latency_tuning',
      'traffic_wave',
      'outage_repair',
    ],
  },
};

function getGridXForSubnet(subnet: 'public' | 'private' | 'edge', slotIndex = 0): number {
  if (subnet === 'edge') return slotIndex === 0 ? -3 : -2;
  if (subnet === 'public') return slotIndex === 0 ? 0 : 1;
  return slotIndex === 0 ? 4 : 5;
}

/**
 * Generates levels 11–130 across Coursera Modules 2–13 (while preserving the 10 handcrafted
 * Module 1 introductory levels 1–10 with tightened zone & FinOps checks).
 */
export function buildCourseraCurriculumLevels(
  module1Levels: LevelDefinition[],
  existingCoreLevels: LevelDefinition[]
): LevelDefinition[] {
  const all130: LevelDefinition[] = [];

  // 1. Module 1 (Levels 1–10): Handcrafted Introductory Cloud Practitioner Module
  module1Levels.slice(0, 10).forEach((lvl, idx) => {
    const id = idx + 1;
    const isAssessment = id === 10;
    const modMeta = COURSERA_MODULES[0];
    const gameMode = MODULE_BLUEPRINTS[1].gameModes[idx] || 'packet_tracer';

    // Tighten Level 2 & all Module 1 requirements so EC2 MUST be in Public Subnet and have 0 fatal violations
    const strictRequirements: Requirement[] = [
      ...lvl.requirements.map((r) => ({
        ...r,
        check: (s: ArchitectureState) =>
          r.check(s) &&
          (id === 2
            ? hasValidPlaced(s, 'ec2', 'public') && hasValidWire(s, 'client', 'ec2')
            : true) &&
          hasZeroFatalViolations(s, id),
      })),
    ];

    const enriched: LevelDefinition = {
      ...lvl,
      id,
      chapterId: 1,
      chapterTitle: modMeta.title,
      title: isAssessment ? MODULE_BLUEPRINTS[1].levelTitles[9] : lvl.title,
      isAssessment,
      gameMode,
      concepts: MODULE_BLUEPRINTS[1].conceptsPool[idx] || lvl.concepts,
    };
    enriched.storyboard = buildCardboardStoryboard(enriched, modMeta);
    enriched.requirements = strictRequirements;
    all130.push(enriched);
  });

  // 2. Modules 2–13 (Levels 11–130, 10 levels per module)
  for (let modId = 2; modId <= 13; modId++) {
    const modMeta = COURSERA_MODULES[modId - 1];
    const bp = MODULE_BLUEPRINTS[modId];

    for (let slot = 0; slot < 10; slot++) {
      const levelId = (modId - 1) * 10 + slot + 1;
      const isAssessment = slot === 9;
      const title = bp.levelTitles[slot];
      const concepts = bp.conceptsPool[slot];
      const gameMode = bp.gameModes[slot];

      // Determine which 1 or 2 core AWS services the player deploys & wires in Stage 1 of this level
      const useBoth = slot >= 3 || isAssessment;
      const primaryType = bp.primaryService;
      const primarySubnet = bp.primarySubnet;
      const secondaryType =
        slot === 4 && modId === 3
          ? 'eks'
          : slot === 6 && modId === 3
          ? 'beanstalk'
          : slot === 3 && modId === 6
          ? 'efs'
          : slot === 3 && modId === 7
          ? 'dynamodb'
          : slot === 7 && modId === 7
          ? 'redshift'
          : slot === 5 && modId === 9
          ? 'kms'
          : bp.secondaryService;

      const secondarySubnet: 'public' | 'private' | 'edge' =
        secondaryType === 'rds' ||
        secondaryType === 'redis' ||
        secondaryType === 'redshift' ||
        secondaryType === 'sagemaker'
          ? 'private'
          : secondaryType === 'route53' ||
            secondaryType === 'cloudfront' ||
            secondaryType === 'igw' ||
            secondaryType === 'waf'
          ? 'edge'
          : 'public';

      const allowedPalette: AWSComponentType[] = Array.from(
        new Set<AWSComponentType>(
          useBoth ? [primaryType, secondaryType, 'ec2'] : [primaryType, 'ec2']
        )
      );

      const p1GridX = getGridXForSubnet(primarySubnet, 0);
      const p2GridX = getGridXForSubnet(secondarySubnet, 1);

      // Build initial board state: Client on external (-5, 0), plus a bridge EC2 in public subnet if primary is private
      const needsPublicBridge = primarySubnet === 'private' && secondarySubnet !== 'public';
      const initialComponents = [
        {
          id: 'client-1',
          type: 'client' as AWSComponentType,
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external' as const,
          az: 'global' as const,
          config: {},
          status: 'healthy' as const,
          locked: true,
        },
        ...(needsPublicBridge
          ? [
              {
                id: 'ec2-bridge',
                type: 'ec2' as AWSComponentType,
                name: 'Public Web Tier',
                gridX: 0,
                gridZ: 0,
                subnet: 'public' as const,
                az: 'us-east-1a' as const,
                config: {
                  port: 80,
                  instanceType: 't3.micro',
                  securityGroupInbound: [{ protocol: 'tcp' as const, port: 80, source: '0.0.0.0/0' }],
                },
                status: 'healthy' as const,
                locked: true,
              },
            ]
          : []),
      ];

      const initialConnections = needsPublicBridge
        ? [
            {
              id: 'conn-init-bridge',
              fromId: 'client-1',
              toId: 'ec2-bridge',
              port: 80,
              protocol: 'tcp',
              allowed: true,
            },
          ]
        : [];

      const requirements: Requirement[] = [
        {
          id: `req-${levelId}-p1`,
          label: `Deploy ${primaryType.toUpperCase()} in the ${primarySubnet.toUpperCase()} zone and wire it into traffic`,
          hint: `Select "+ ${primaryType.toUpperCase()}" from the dock, place it in the ${primarySubnet.toUpperCase()} zone, and connect a wire to it.`,
          check: (s) =>
            hasValidPlaced(s, primaryType, primarySubnet) &&
            s.connections.some((c) => {
              if (!c.allowed) return false;
              const f = s.components.find((x) => x.id === c.fromId);
              const t = s.components.find((x) => x.id === c.toId);
              return f?.type === primaryType || t?.type === primaryType;
            }) &&
            hasZeroFatalViolations(s, levelId),
        },
      ];

      if (useBoth && secondaryType !== primaryType) {
        requirements.push({
          id: `req-${levelId}-p2`,
          label: `Deploy ${secondaryType.toUpperCase()} in the ${secondarySubnet.toUpperCase()} zone and connect it`,
          hint: `Place ${secondaryType.toUpperCase()} in the ${secondarySubnet.toUpperCase()} zone and wire it into your architecture with 0 unwired idle servers.`,
          check: (s) =>
            hasValidPlaced(s, secondaryType, secondarySubnet) &&
            (secondaryType === 'iam' ||
            secondaryType === 'kms' ||
            secondaryType === 'cloudwatch' ||
            secondaryType === 'cloudtrail'
              ? true
              : s.connections.some((c) => {
                  if (!c.allowed) return false;
                  const f = s.components.find((x) => x.id === c.fromId);
                  const t = s.components.find((x) => x.id === c.toId);
                  return f?.type === secondaryType || t?.type === secondaryType;
                })) &&
            hasZeroFatalViolations(s, levelId),
        });
      }

      const templateSource = existingCoreLevels[(levelId - 11) % existingCoreLevels.length];

      const levelDef: LevelDefinition = {
        id: levelId,
        chapterId: modId,
        chapterTitle: modMeta.title,
        title,
        tagline: isAssessment
          ? `Graded Boss Assessment for ${modMeta.title}: Apply ${concepts.join(' & ')} under live traffic.`
          : `Master ${concepts.join(' & ')} in ${modMeta.shortTitle}.`,
        difficulty: isAssessment
          ? 'Master'
          : slot < 3
          ? 'Novice'
          : slot < 7
          ? 'Intermediate'
          : 'Advanced',
        isAssessment,
        gameMode,
        concepts,
        briefing: isAssessment
          ? `GRADED MODULE ASSESSMENT: Build and verify a production-ready ${concepts.join(' + ')} architecture in the correct AWS zones with zero idle server waste.`
          : `Deploy ${primaryType.toUpperCase()}${
              useBoth && secondaryType !== primaryType ? ` and ${secondaryType.toUpperCase()}` : ''
            } in their valid AWS zones and wire live traffic from Internet Users.`,
        taskDescription: requirements.map((r, i) => `${i + 1}. ${r.hint}`).join('\n'),
        requirements,
        initialState: {
          components: initialComponents,
          connections: initialConnections,
        },
        allowedPalette,
        iacSnippet: templateSource?.iacSnippet,
        docTips: [
          `${modMeta.shortTitle}: Keep VPC compute & databases out of the external Edge/DNS zone.`,
          `Any extra unwired server left on the board wastes monthly cloud spend and will be flagged during testing.`,
        ],
        targetPlacements:
          slot < 3
            ? [
                {
                  type: primaryType,
                  gridX: p1GridX,
                  gridZ: 0,
                  label: `Place ${primaryType.toUpperCase()} (${primarySubnet.toUpperCase()})`,
                },
                ...(useBoth && secondaryType !== primaryType
                  ? [
                      {
                        type: secondaryType,
                        gridX: p2GridX,
                        gridZ: 1,
                        label: `Place ${secondaryType.toUpperCase()}`,
                      },
                    ]
                  : []),
              ]
            : undefined,
        inspectorMode: modId <= 2 ? 'intermediate' : 'full',
      };

      levelDef.storyboard = buildCardboardStoryboard(levelDef, modMeta);
      all130.push(levelDef);
    }
  }

  return all130;
}
