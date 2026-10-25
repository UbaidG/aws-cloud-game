/**
 * Levels 11–130 as recipes. Each recipe follows its level's original title, but with real,
 * engine-checked goals and a reference solution. Story text, concept cards and cutscenes get
 * rewritten module by module in Phase 6.
 */

import { zoneSpec } from '../../engine/board';
import type { FirewallRule } from '../../engine/types';
import { apart, atMost, cfg, firewall, path, place, reach, removed, sla, twoAzs, wired } from '../goals';
import type { LevelRecipe } from '../recipe';

const HTTP_ANY: FirewallRule = { protocol: 'tcp', port: 80, source: '0.0.0.0/0' };
const HTTP_VPC: FirewallRule = { protocol: 'tcp', port: 80, source: 'vpc' };
const HTTP_EDGE: FirewallRule = { protocol: 'tcp', port: 80, source: zoneSpec('edge').cidr };
const SSH_ANY: FirewallRule = { protocol: 'tcp', port: 22, source: '0.0.0.0/0' };
const RDP_ANY: FirewallRule = { protocol: 'tcp', port: 3389, source: '0.0.0.0/0' };
const PG_ANY: FirewallRule = { protocol: 'tcp', port: 5432, source: '0.0.0.0/0' };
const PG_VPC: FirewallRule = { protocol: 'tcp', port: 5432, source: 'vpc' };

const BOTS = { rps: 200, botRps: 2000 };

// ---------------------------------------------------------------------------
// Module 2 — Compute in the Cloud

const module2: LevelRecipe[] = [
  {
    id: 11,
    given: 'web:ec2@0,0',
    names: { web: 'Web Server' },
    givenConfig: { web: { securityGroupInbound: [HTTP_ANY, SSH_ANY] } },
    stages: [
      {
        title: 'Go live',
        brief: 'Your first virtual machine is booted but not connected.',
        goal: 'Wire Internet Users to the server.',
        wire: 'users-web',
        goals: [path('client ec2')],
      },
      {
        title: 'Close the back door',
        brief: 'Bots are hammering SSH (port 22), which is open to the whole internet.',
        goal: 'Leave only port 80 open.',
        set: { web: { securityGroupInbound: [HTTP_ANY] } },
        goals: [firewall('ec2', 22, false), sla({ minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 12,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    names: { web: 'Web Server' },
    limits: { maxOfType: { ec2: 1 } },
    stages: [
      {
        title: 'Lunch rush',
        brief: '900 requests per second, and a t3.micro tops out at 300.',
        goal: 'Make the one server big enough to cope.',
        set: { web: { instanceType: 'm5.large' } },
        load: { rps: 900 },
        goals: [sla({ maxErrorRatePercent: 1 })],
        hint: 'You may only run one server here, so make it bigger.',
      },
      {
        title: 'Quiet night',
        brief: 'Traffic falls to 150 req/s, but you are still paying for a large machine.',
        goal: 'Shrink the server back down to save money.',
        set: { web: { instanceType: 't3.micro' } },
        load: { rps: 150 },
        goals: [sla({ maxErrorRatePercent: 1, maxCostUsd: 20 })],
      },
    ],
  },
  {
    id: 13,
    given: 'web1:ec2@0,-1',
    givenWires: 'users-web1',
    names: { web1: 'Web Server A' },
    stages: [
      {
        title: 'Scale out',
        brief: '500 requests per second are arriving. One small server handles 300.',
        goal: 'Add a second server and send users to both.',
        add: 'web2:ec2@0,1',
        wire: 'users-web2',
        load: { rps: 500 },
        goals: [reach('ec2', 2), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 14,
    given: 'web1:ec2@1,-1 web2:ec2@1,1',
    names: { web1: 'Web Server A', web2: 'Web Server B' },
    stages: [
      {
        title: 'One front door',
        brief: 'Two servers, but no single address for users to visit.',
        goal: 'Put a load balancer in front of both servers.',
        add: 'alb:alb@-1,0',
        wire: 'users-alb alb-web1 alb-web2',
        load: { rps: 450 },
        goals: [path('client alb ec2'), reach('ec2', 2), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 15,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 !bad:ec2@1,1',
    givenWires: 'users-alb alb-web1 alb-bad',
    names: { alb: 'Load Balancer', web1: 'Web Server A', bad: 'Web Server B' },
    stages: [
      {
        title: 'Failed health check',
        brief: 'Server B has crashed. Half of all requests are failing with 502 errors.',
        goal: 'Replace the crashed server and get back to two healthy servers.',
        remove: ['bad'],
        add: 'web2:ec2@1,2',
        wire: 'alb-web2',
        load: { rps: 450 },
        goals: [removed('bad'), reach('ec2', 2), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 16,
    given: 'alb:alb@-1,0 web:ec2@1,0',
    givenWires: 'users-alb alb-web',
    names: { alb: 'Load Balancer', web: 'Web Server' },
    limits: { maxOfType: { ec2: 1 } },
    stages: [
      {
        title: 'Automatic cloning',
        brief: 'Traffic swings to 1,500 req/s. Adding servers by hand is too slow.',
        goal: 'Add an Auto Scaling Group behind the load balancer.',
        add: 'fleet:asg@2,0',
        wire: 'alb-fleet',
        load: { rps: 1500 },
        goals: [path('client alb asg'), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 17,
    given: 'alb:alb@-1,0 fleet:asg@1,0',
    givenWires: 'users-alb alb-fleet',
    givenConfig: { fleet: { maxCapacity: 2 } },
    names: { alb: 'Load Balancer', fleet: 'Web Fleet' },
    stages: [
      {
        title: 'Flash sale',
        brief: '3,000 shoppers per second. The fleet is capped at 2 servers.',
        goal: 'Raise the fleet’s maximum size.',
        set: { fleet: { maxCapacity: 6 } },
        load: { rps: 3000 },
        goals: [sla({ maxErrorRatePercent: 1 })],
      },
      {
        title: 'Sale over',
        brief: 'Traffic is back to 600 req/s, and a big maximum invites a big bill.',
        goal: 'Lower the maximum again.',
        set: { fleet: { maxCapacity: 2 } },
        load: { rps: 600 },
        goals: [sla({ maxErrorRatePercent: 1, maxCostUsd: 100 })],
      },
    ],
  },
  {
    id: 18,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1 ~z1:ec2@2,-3 ~z2:ec2@2,3',
    givenWires: 'users-alb alb-web1 alb-web2',
    names: { alb: 'Load Balancer', web1: 'Web Server A', web2: 'Web Server B', z1: 'Old Test Box', z2: 'Forgotten Demo' },
    stages: [
      {
        title: 'Zombie hunt',
        brief: 'Two servers nobody remembers are still on the bill.',
        goal: 'Delete the idle servers.',
        remove: ['z1', 'z2'],
        goals: [removed('z1', 'z2'), path('client alb ec2'), sla({ maxCostUsd: 60 })],
      },
    ],
  },
  {
    id: 19,
    given: 'alb:alb@-1,0 web1:ec2@1,-1',
    givenWires: 'users-alb alb-web1',
    names: { alb: 'Load Balancer', web1: 'Web Server A' },
    stages: [
      {
        title: 'Second data centre',
        brief: 'Everything runs in one Availability Zone. One power cut and you are offline.',
        goal: 'Add a server in the other Availability Zone.',
        add: 'web2:ec2@1,1',
        wire: 'alb-web2',
        goals: [twoAzs('ec2')],
      },
      {
        title: 'Resilient data',
        brief: 'The servers survive an outage now. The orders database must too.',
        goal: 'Add a Multi-AZ database behind both servers.',
        add: 'db:rds@5,0',
        wire: 'web1-db web2-db',
        set: { db: { multiAZ: true } },
        goals: [path('client alb ec2 rds'), cfg('rds', 'multiAZ', true)],
      },
    ],
  },
  {
    id: 20,
    stages: [
      {
        title: 'Build the storefront',
        brief: 'A flash-sale shop needs a load balancer, a self-scaling fleet and a database.',
        goal: 'Users → ALB → Auto Scaling Group → RDS, serving 1,000 req/s.',
        add: 'alb:alb@-1,0 fleet:asg@1,0 db:rds@5,0',
        wire: 'users-alb alb-fleet fleet-db',
        load: { rps: 1000 },
        goals: [path('client alb asg rds'), sla({ maxErrorRatePercent: 1 })],
      },
      {
        title: 'Doors open',
        brief: '4,000 shoppers per second. The database and the fleet both buckle.',
        goal: 'Cache reads and let the fleet grow.',
        add: 'cache:redis@5,1',
        wire: 'fleet-cache',
        set: { fleet: { maxCapacity: 8 } },
        palette: ['redis', 'alb', 'asg', 'rds'],
        load: { rps: 4000 },
        goals: [sla({ maxErrorRatePercent: 1, maxLatencyMs: 100 })],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 3 — Serverless & Containers

const module3: LevelRecipe[] = [
  {
    id: 21,
    given: '~old:ec2@0,-1',
    givenWires: 'users-old',
    givenConfig: { old: { instanceType: 'm5.large' } },
    names: { old: 'Always-On Server' },
    stages: [
      {
        title: 'Stop paying for idle',
        brief: 'A $110/month server answers 50 requests a second and sleeps the rest of the time.',
        goal: 'Replace it with a Lambda function.',
        remove: ['old'],
        add: 'fn:lambda@1,0',
        wire: 'users-fn',
        load: { rps: 50 },
        goals: [path('client lambda'), atMost('ec2', 0), sla({ maxCostUsd: 20 })],
      },
    ],
  },
  {
    id: 22,
    given: 'fn:lambda@4,0',
    names: { fn: 'Orders Function' },
    stages: [
      {
        title: 'Front door',
        brief: 'Your function is ready, and bots are already knocking.',
        goal: 'Put API Gateway in front of the function.',
        add: 'api:apigw@-2,0',
        wire: 'users-api api-fn',
        load: BOTS,
        goals: [path('client apigw lambda'), sla({ minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 23,
    given: 'alb:alb@-1,0',
    givenWires: 'users-alb',
    names: { alb: 'Load Balancer' },
    stages: [
      {
        title: 'Ship the container',
        brief: 'The app is packaged as a Docker image. Run it on ECS.',
        goal: 'Run an ECS service behind the load balancer.',
        add: 'svc:ecs@2,0',
        wire: 'alb-svc',
        goals: [path('client alb ecs')],
      },
      {
        title: 'Only through the front door',
        brief: 'The tasks accept requests from anywhere, so the load balancer can be bypassed.',
        goal: 'Allow port 80 on the service only from inside the VPC.',
        set: { svc: { securityGroupInbound: [HTTP_VPC] } },
        goals: [firewall('ecs', 80, false), path('client alb ecs')],
      },
    ],
  },
  {
    id: 24,
    given: 'alb:alb@-1,0 svc:ecs@2,0',
    givenWires: 'users-alb alb-svc',
    givenConfig: { svc: { desiredCount: 2 } },
    names: { alb: 'Load Balancer', svc: 'Shop Service' },
    stages: [
      {
        title: 'More tasks',
        brief: '2,400 req/s, and the service runs 2 tasks of about 600 req/s each.',
        goal: 'Raise the service’s task count until it keeps up.',
        set: { svc: { desiredCount: 4 } },
        load: { rps: 2400 },
        goals: [sla({ maxErrorRatePercent: 1 }), atMost('ecs', 1)],
        palette: ['ecs'],
      },
    ],
  },
  {
    id: 25,
    given: 'alb:alb@-1,0',
    givenWires: 'users-alb',
    names: { alb: 'Load Balancer' },
    stages: [
      {
        title: 'Hire a captain',
        brief: 'Dozens of microservices need one orchestrator, hidden from the internet.',
        goal: 'Run an EKS cluster in the private subnet behind the load balancer.',
        add: 'k8s:eks@3,0',
        wire: 'alb-k8s',
        goals: [place('eks', 'private'), path('client alb eks')],
      },
    ],
  },
  {
    id: 26,
    given: 'alb:alb@-1,0 k8s:eks@3,0',
    givenWires: 'users-alb alb-k8s',
    names: { alb: 'Load Balancer', k8s: 'EKS Cluster' },
    stages: [
      {
        title: 'Persist',
        brief: 'The microservices need a shared database.',
        goal: 'Wire the cluster to an RDS database in the private subnet.',
        add: 'db:rds@5,0',
        wire: 'k8s-db',
        goals: [path('client alb eks rds')],
      },
      {
        title: 'Speed up',
        brief: 'Pages take 150ms. The product team wants under 80ms.',
        goal: 'Add a cache beside the database.',
        add: 'cache:redis@5,1',
        wire: 'k8s-cache',
        goals: [sla({ maxLatencyMs: 80 })],
      },
    ],
  },
  {
    id: 27,
    stages: [
      {
        title: 'Just ship it',
        brief: 'You have code and no time to manage servers.',
        goal: 'Deploy the app with Elastic Beanstalk.',
        add: 'app:beanstalk@1,0',
        wire: 'users-app',
        goals: [path('client beanstalk')],
      },
      {
        title: 'Data that outlives the app',
        brief: 'The blog needs a database, and environments get rebuilt.',
        goal: 'Give the app its own RDS database in the private subnet.',
        add: 'db:rds@5,0',
        wire: 'app-db',
        goals: [path('client beanstalk rds'), place('rds', 'private')],
      },
    ],
  },
  {
    id: 28,
    given: 'app:beanstalk@1,0 media:s3@5,0',
    givenWires: 'users-app',
    givenConfig: { media: { blockPublicAccess: false } },
    names: { app: 'Web App', media: 'Media Bucket' },
    stages: [
      {
        title: 'Uploads',
        brief: 'Users upload photos, and the bucket is public to the world.',
        goal: 'Connect the app to the bucket and lock the bucket down.',
        wire: 'app-media',
        set: { media: { blockPublicAccess: true } },
        goals: [path('client beanstalk s3'), cfg('s3', 'blockPublicAccess', true), sla({ minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 29,
    given: 'api:apigw@-2,0',
    givenWires: 'users-api',
    names: { api: 'Orders API' },
    stages: [
      {
        title: 'Absorb the burst',
        brief: '6,000 orders per second, twice what a function can process at once.',
        goal: 'Queue the orders in SQS and let a Lambda worker drain the queue.',
        add: 'q:sqs@4,0 worker:lambda@5,1',
        wire: 'api-q q-worker',
        load: { rps: 6000 },
        goals: [path('client apigw sqs lambda'), sla({ maxErrorRatePercent: 1 })],
        hint: 'The function pulls work from the queue, so wire the queue to the function.',
      },
    ],
  },
  {
    id: 30,
    stages: [
      {
        title: 'Serverless API',
        brief: 'Build the mobile API without a single server to manage.',
        goal: 'API Gateway → Lambda → DynamoDB.',
        add: 'api:apigw@-2,-1 fn:lambda@4,-1 table:dynamodb@6,-1',
        wire: 'users-api api-fn fn-table',
        goals: [path('client apigw lambda dynamodb')],
      },
      {
        title: 'Container web tier',
        brief: 'The web site is coming too: 4,000 req/s in total.',
        goal: 'Add an ALB and ECS service that share the same table.',
        add: 'alb:alb@-1,1 svc:ecs@3,1',
        wire: 'users-alb alb-svc svc-table',
        load: { rps: 4000 },
        goals: [path('client alb ecs dynamodb'), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 4 — Going Global

const module4: LevelRecipe[] = [
  {
    id: 31,
    given: 'web:ec2@0,0',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'A name, not a number',
        brief: 'Nobody remembers an IP address. Users need a domain name.',
        goal: 'Put Route 53 DNS in front of your server.',
        add: 'dns:route53@-4,0',
        wire: 'users-dns dns-web',
        goals: [path('client route53 ec2')],
      },
    ],
  },
  {
    id: 32,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 vol1:ebs@2,-1 ~web2:ec2@1,-2 ~vol2:ebs@2,-2',
    givenWires: 'users-alb alb-web1 alb-web2 web1-vol1 web2-vol2',
    names: { alb: 'Load Balancer', web1: 'Web Server A', vol1: 'Disk A', web2: 'Web Server B', vol2: 'Disk B' },
    stages: [
      {
        title: 'Same building',
        brief: 'Both servers and both disks sit in us-east-1a. One power cut takes out everything.',
        goal: 'Rebuild Server B, with a disk of its own, in us-east-1b.',
        remove: ['web2', 'vol2'],
        add: 'web3:ec2@1,2 vol3:ebs@2,2',
        wire: 'alb-web3 web3-vol3',
        goals: [twoAzs('ec2'), reach('ec2', 2), wired('ec2', 'ebs', 2)],
        hint: 'An EBS volume only attaches to servers in its own zone, so the new server needs a new disk beside it.',
      },
    ],
  },
  {
    id: 33,
    given: 'web:ec2@0,0 db:rds@5,0',
    givenWires: 'users-web web-db',
    names: { web: 'Web Server', db: 'Catalogue DB' },
    stages: [
      {
        title: 'Cache at the edge',
        brief: 'Every page takes 150ms. Most of them never change.',
        goal: 'Serve users through CloudFront.',
        add: 'cdn:cloudfront@-3,0',
        unwire: 'users-web',
        wire: 'users-cdn cdn-web',
        goals: [path('client cloudfront ec2'), sla({ maxLatencyMs: 60 })],
        hint: 'Every request must go through CloudFront, including ones that currently skip it.',
      },
    ],
  },
  {
    id: 34,
    stages: [
      {
        title: 'Static site',
        brief: 'A marketing site of plain files. No servers needed.',
        goal: 'Serve files from S3 through CloudFront.',
        add: 'cdn:cloudfront@-3,0 site:s3@-2,1',
        wire: 'users-cdn cdn-site',
        goals: [path('client cloudfront s3'), sla({ maxCostUsd: 25 })],
      },
    ],
  },
  {
    id: 35,
    given: 'v1:ec2@0,-1 v2:ec2@0,1',
    names: { v1: 'Shop v1', v2: 'Shop v2 (new)' },
    stages: [
      {
        title: 'Smart DNS',
        brief: 'The redesigned shop is ready, but nobody wants to bet every customer on it at once.',
        goal: 'Route 53 with weighted routing, sending users to both versions.',
        add: 'dns:route53@-4,0',
        wire: 'users-dns dns-v1 dns-v2',
        set: { dns: { routingPolicy: 'weighted' } },
        goals: [reach('ec2', 2), cfg('route53', 'routingPolicy', 'weighted')],
      },
    ],
  },
  {
    id: 36,
    given: 'dns:route53@-4,0 !primary:ec2@0,-1 standby:ec2@0,1',
    givenWires: 'users-dns dns-primary dns-standby',
    names: { dns: 'Route 53', primary: 'Primary Server', standby: 'Standby Server' },
    stages: [
      {
        title: 'Primary down',
        brief: 'The primary crashed. Simple routing still hands half the users its address.',
        goal: 'Switch Route 53 to failover routing so health checks send everyone to the standby.',
        set: { dns: { routingPolicy: 'failover' } },
        goals: [cfg('route53', 'routingPolicy', 'failover'), path('client route53 ec2'), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 37,
    given: 'web:ec2@0,0',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Edge stack',
        brief: 'Users need a domain name and a global cache in front of the server.',
        goal: 'Route 53 → CloudFront → EC2.',
        add: 'dns:route53@-4,0 cdn:cloudfront@-3,0',
        wire: 'users-dns dns-cdn cdn-web',
        goals: [path('client route53 cloudfront ec2')],
      },
      {
        title: 'No side doors',
        brief: 'Attackers skip CloudFront and hit the server directly on port 80.',
        goal: 'Only accept port 80 from CloudFront’s address range.',
        set: { web: { securityGroupInbound: [HTTP_EDGE] } },
        goals: [firewall('ec2', 80, false)],
        hint: `CloudFront connects from ${zoneSpec('edge').cidr}. Make that the only source for port 80.`,
      },
    ],
  },
  {
    id: 38,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1',
    givenWires: 'users-alb alb-web1 alb-web2',
    names: { alb: 'Load Balancer', web1: 'Web Server A', web2: 'Web Server B' },
    stages: [
      {
        title: 'Global launch',
        brief: '2,000 req/s from every continent, and two servers can serve 600.',
        goal: 'Put CloudFront in front of the load balancer.',
        add: 'cdn:cloudfront@-3,0',
        unwire: 'users-alb',
        wire: 'users-cdn cdn-alb',
        load: { rps: 2000 },
        goals: [path('client cloudfront alb ec2'), sla({ maxErrorRatePercent: 1, maxLatencyMs: 30 })],
      },
    ],
  },
  {
    id: 39,
    stages: [
      {
        title: 'The blueprint',
        brief: 'Build the stack every team will copy: highly available from day one.',
        goal: 'ALB → one server per AZ → Multi-AZ database.',
        add: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1 db:rds@5,0',
        wire: 'users-alb alb-web1 alb-web2 web1-db web2-db',
        set: { db: { multiAZ: true } },
        goals: [path('client alb ec2 rds'), twoAzs('ec2'), cfg('rds', 'multiAZ', true)],
      },
    ],
  },
  {
    id: 40,
    stages: [
      {
        title: 'Worldwide app',
        brief: 'Launch day. Users everywhere expect pages in under 50ms.',
        goal: 'Route 53 → CloudFront → ALB → servers in two AZs → RDS.',
        add: 'dns:route53@-4,0 cdn:cloudfront@-3,0 alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1 db:rds@5,0',
        wire: 'users-dns dns-cdn cdn-alb alb-web1 alb-web2 web1-db web2-db',
        goals: [path('client route53 cloudfront alb ec2 rds'), twoAzs('ec2'), sla({ maxLatencyMs: 50 })],
      },
      {
        title: 'Static assets',
        brief: 'Images and scripts should come straight from storage, not your servers.',
        goal: 'Serve assets from S3 through the same CloudFront distribution.',
        add: 'assets:s3@-2,2',
        wire: 'cdn-assets',
        goals: [path('client cloudfront s3')],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 5 — Networking (VPC)

const module5: LevelRecipe[] = [
  {
    id: 41,
    given: 'web:ec2@0,0',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Front door',
        brief: 'A VPC is sealed until you give it a door to the internet.',
        goal: 'Attach an Internet Gateway and route users through it.',
        add: 'igw:igw@-2,0',
        wire: 'users-igw igw-web',
        goals: [path('client igw ec2')],
      },
    ],
  },
  {
    id: 42,
    given: 'igw:igw@-2,0 ~bad:ec2@4,0',
    givenWires: 'users-igw igw-bad',
    names: { igw: 'Internet Gateway', bad: 'Web Server' },
    stages: [
      {
        title: 'Wrong room',
        brief: 'The web server is in the private subnet, which the gateway can’t reach.',
        goal: 'Get a web server into the public subnet behind the gateway.',
        remove: ['bad'],
        add: 'web:ec2@0,0',
        wire: 'igw-web',
        goals: [place('ec2', 'public'), path('client igw ec2')],
        hint: 'Move the server into the public subnet, or replace it.',
      },
    ],
  },
  {
    id: 43,
    given: 'igw:igw@-2,0 web:ec2@0,0 ~db:rds@1,1',
    givenWires: 'users-igw igw-web web-db',
    names: { igw: 'Internet Gateway', web: 'Web Server', db: 'Customer DB' },
    stages: [
      {
        title: 'Into the vault',
        brief: 'The customer database is sitting in the public subnet.',
        goal: 'Get the database into the private subnet, still wired to the web server.',
        remove: ['db'],
        add: 'vault:rds@5,0',
        wire: 'web-vault',
        goals: [place('rds', 'private'), path('client igw ec2 rds')],
        hint: 'Drag the database across the line into the private subnet.',
      },
    ],
  },
  {
    id: 44,
    given: 'igw:igw@-2,0 alb:alb@-1,0 app:ec2@4,0',
    givenWires: 'users-igw igw-alb alb-app',
    names: { igw: 'Internet Gateway', alb: 'Load Balancer', app: 'App Server' },
    stages: [
      {
        title: 'Patch Tuesday',
        brief: 'The private app server must download security patches, but it has no way out.',
        goal: 'Give it a one-way exit through a NAT Gateway.',
        add: 'nat:nat_gw@2,0',
        wire: 'app-nat nat-igw',
        goals: [wired('ec2', 'nat_gw'), wired('nat_gw', 'igw')],
      },
    ],
  },
  {
    id: 45,
    given: 'igw:igw@-2,0 alb:alb@-1,0 app:ec2@4,0 ~nat:nat_gw@5,1',
    givenWires: 'users-igw igw-alb alb-app app-nat nat-igw',
    names: { igw: 'Internet Gateway', alb: 'Load Balancer', app: 'App Server', nat: 'NAT Gateway' },
    stages: [
      {
        title: 'Misplaced NAT',
        brief: 'Someone put the NAT Gateway in the private subnet, so it has no route out.',
        goal: 'Run the NAT Gateway from the public subnet.',
        remove: ['nat'],
        add: 'nat2:nat_gw@2,0',
        wire: 'app-nat2 nat2-igw',
        goals: [place('nat_gw', 'public'), wired('ec2', 'nat_gw'), wired('nat_gw', 'igw')],
      },
    ],
  },
  {
    id: 46,
    given: 'alb:alb@-1,0 web:ec2@3,0 db:rds@5,0',
    givenWires: 'users-alb alb-web web-db',
    givenConfig: { web: { securityGroupInbound: [SSH_ANY] }, db: { securityGroupInbound: [PG_ANY] } },
    names: { alb: 'Load Balancer', web: 'App Server', db: 'Orders DB' },
    stages: [
      {
        title: 'Chain of trust',
        brief: 'The app only allows SSH, and the database is open to the world.',
        goal: 'App: port 80 from the VPC only. Database: 5432 from the VPC only.',
        set: { web: { securityGroupInbound: [HTTP_VPC] }, db: { securityGroupInbound: [PG_VPC] } },
        goals: [path('client alb ec2 rds'), firewall('ec2', 80, false), sla({ minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 47,
    given: 'alb:alb@-1,0',
    givenWires: 'users-alb',
    names: { alb: 'Load Balancer' },
    stages: [
      {
        title: 'Lobby and back office',
        brief: 'Only the load balancer should face the internet.',
        goal: 'Put two app servers in the private subnet behind the load balancer.',
        add: 'app1:ec2@4,-1 app2:ec2@4,1',
        wire: 'alb-app1 alb-app2',
        goals: [place('ec2', 'private', 2), reach('ec2', 2)],
      },
    ],
  },
  {
    id: 48,
    given: 'shop:ec2@0,-1 wh:ec2@1,1',
    names: { shop: 'Shop VPC', wh: 'Warehouse VPC' },
    clientName: 'Head Office',
    stages: [
      {
        title: 'The hub',
        brief: 'Head office needs private access to two separate networks.',
        goal: 'Connect head office to both networks through one Transit Gateway.',
        add: 'hub:tgw@-2,0',
        wire: 'users-hub hub-shop hub-wh',
        goals: [path('client tgw ec2'), reach('ec2', 2)],
      },
    ],
  },
  {
    id: 49,
    given: 'alb:alb@-1,0 web:ec2@1,0 db:rds@5,0',
    givenWires: 'users-alb alb-web web-db users-db',
    names: { alb: 'Load Balancer', web: 'Web Server', db: 'Customer DB' },
    stages: [
      {
        title: 'Breach',
        brief: 'Someone wired the internet straight into the customer database.',
        goal: 'Cut the illegal wire and keep the app working.',
        unwire: 'users-db',
        goals: [path('client alb ec2 rds')],
      },
    ],
  },
  {
    id: 50,
    stages: [
      {
        title: 'Three tiers',
        brief: 'Build the textbook enterprise VPC.',
        goal: 'IGW → ALB → private servers in two AZs → private database.',
        add: 'igw:igw@-2,0 alb:alb@-1,0 app1:ec2@4,-1 app2:ec2@4,1 db:rds@6,0',
        wire: 'users-igw igw-alb alb-app1 alb-app2 app1-db app2-db',
        goals: [path('client igw alb ec2 rds'), place('ec2', 'private', 2), twoAzs('ec2')],
      },
      {
        title: 'Way out',
        brief: 'The private servers need patches.',
        goal: 'Both servers reach the internet through a NAT Gateway.',
        add: 'nat:nat_gw@2,0',
        wire: 'app1-nat app2-nat nat-igw',
        goals: [wired('ec2', 'nat_gw', 2), wired('nat_gw', 'igw')],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 6 — Storage

const module6: LevelRecipe[] = [
  {
    id: 51,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'More disk',
        brief: 'The server needs a disk that survives a reboot.',
        goal: 'Attach an EBS volume.',
        add: 'disk:ebs@1,0',
        wire: 'web-disk',
        goals: [wired('ec2', 'ebs')],
      },
    ],
  },
  {
    id: 52,
    given: 'web1:ec2@0,-1 web2:ec2@0,1 disk:ebs@1,0',
    givenWires: 'users-web1 users-web2 web1-disk web2-disk',
    names: { web1: 'Server A', web2: 'Server B', disk: 'Data Volume' },
    stages: [
      {
        title: 'One disk, one server',
        brief: 'One EBS volume is plugged into two servers. That corrupts data.',
        goal: 'Give each server its own volume.',
        unwire: 'web2-disk',
        add: 'disk2:ebs@1,1',
        wire: 'web2-disk2',
        goals: [wired('ec2', 'ebs', 2)],
      },
    ],
  },
  {
    id: 53,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Endless storage',
        brief: 'Photo uploads would fill any disk.',
        goal: 'Store uploads in an S3 bucket.',
        add: 'media:s3@5,0',
        wire: 'web-media',
        goals: [path('client ec2 s3')],
      },
    ],
  },
  {
    id: 54,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1',
    givenWires: 'users-alb alb-web1 alb-web2',
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B' },
    stages: [
      {
        title: 'Shared folder',
        brief: 'Both servers need to read and write the same files.',
        goal: 'Mount one EFS file system on both servers.',
        add: 'share:efs@4,0',
        wire: 'web1-share web2-share',
        goals: [wired('ec2', 'efs', 2)],
      },
    ],
  },
  {
    id: 55,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 share:efs@4,0',
    givenWires: 'users-alb alb-web1 web1-share',
    names: { alb: 'Load Balancer', web1: 'Server A', share: 'Shared Files' },
    stages: [
      {
        title: 'Scale with shared files',
        brief: '500 req/s, and the new server must see the same files.',
        goal: 'Add a second server that mounts the same EFS.',
        add: 'web2:ec2@1,1',
        wire: 'alb-web2 web2-share',
        load: { rps: 500 },
        goals: [reach('ec2', 2), wired('ec2', 'efs', 2), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 56,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Disk and backups',
        brief: 'The server needs a fast local disk and an off-server backup.',
        goal: 'Attach an EBS volume and back up to S3.',
        add: 'boot:ebs@1,0 backup:s3@5,0',
        wire: 'web-boot web-backup',
        goals: [wired('ec2', 'ebs'), path('client ec2 s3')],
      },
    ],
  },
  {
    id: 57,
    given: 'web:ec2@0,0 media:s3@5,0',
    givenWires: 'users-web web-media',
    names: { web: 'Web Server', media: 'Video Bucket' },
    stages: [
      {
        title: 'Videos at the edge',
        brief: 'Every video download goes through your one server.',
        goal: 'Serve videos from S3 through CloudFront.',
        add: 'cdn:cloudfront@-3,1',
        wire: 'users-cdn cdn-media',
        goals: [path('client cloudfront s3')],
      },
    ],
  },
  {
    id: 58,
    given: 'web:ec2@0,0 vol:ebs@1,0 media:s3@5,0',
    givenWires: 'users-web web-vol web-media',
    givenConfig: { vol: { encrypted: false }, media: { encrypted: false } },
    names: { web: 'Web Server', vol: 'Data Volume', media: 'Records Bucket' },
    stages: [
      {
        title: 'Lock it up',
        brief: 'The auditors found unencrypted customer records.',
        goal: 'Encrypt the volume and the bucket with a KMS key.',
        add: 'key:kms@6,2',
        wire: 'key-vol key-media',
        set: { vol: { encrypted: true }, media: { encrypted: true } },
        goals: [cfg('ebs', 'encrypted', true), cfg('s3', 'encrypted', true), wired('kms', 's3'), wired('kms', 'ebs'), sla({ minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 59,
    given: 'web:ec2@0,0 vol:ebs@1,0 ~z1:ebs@1,2 ~z2:ebs@2,-2 ~z3:efs@4,2',
    givenWires: 'users-web web-vol',
    names: { web: 'Web Server', vol: 'Data Volume', z1: 'Volume from Old Server', z2: 'Detached Volume', z3: 'Unused Share' },
    stages: [
      {
        title: 'Storage zombies',
        brief: 'Detached disks and an unused file share are quietly billing you.',
        goal: 'Delete storage that isn’t attached to anything.',
        remove: ['z1', 'z2', 'z3'],
        goals: [removed('z1', 'z2', 'z3'), sla({ maxCostUsd: 40 })],
      },
    ],
  },
  {
    id: 60,
    given: 'alb:alb@-1,0',
    givenWires: 'users-alb',
    names: { alb: 'Load Balancer' },
    stages: [
      {
        title: 'Servers and disks',
        brief: 'Two servers, each with its own disk, sharing one folder.',
        goal: 'Two servers behind the ALB, each with an EBS volume, both on one EFS.',
        add: 'web1:ec2@1,-1 web2:ec2@1,1 boot1:ebs@2,-1 boot2:ebs@2,1 share:efs@4,0',
        wire: 'alb-web1 alb-web2 web1-boot1 web2-boot2 web1-share web2-share',
        goals: [reach('ec2', 2), wired('ec2', 'ebs', 2), wired('ec2', 'efs', 2)],
      },
      {
        title: 'Media delivery',
        brief: 'Product videos should come from object storage at the edge.',
        goal: 'CloudFront → S3 for media.',
        add: 'cdn:cloudfront@-3,2 media:s3@-2,2',
        wire: 'users-cdn cdn-media',
        goals: [path('client cloudfront s3')],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 7 — Databases

const module7: LevelRecipe[] = [
  {
    id: 61,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Relational data',
        brief: 'Accounts and orders need a SQL database.',
        goal: 'Add RDS in the private subnet.',
        add: 'db:rds@5,0',
        wire: 'web-db',
        goals: [place('rds', 'private'), path('client ec2 rds')],
      },
    ],
  },
  {
    id: 62,
    given: 'web:ec2@0,0 db:rds@5,0',
    givenWires: 'users-web web-db',
    names: { web: 'Web Server', db: 'Orders DB' },
    stages: [
      {
        title: 'Standby copy',
        brief: 'If the database’s Availability Zone fails, every order is lost.',
        goal: 'Turn on Multi-AZ.',
        set: { db: { multiAZ: true } },
        goals: [cfg('rds', 'multiAZ', true)],
      },
    ],
  },
  {
    id: 63,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1 db:rds@5,0',
    givenWires: 'users-alb alb-web1 alb-web2 web1-db web2-db',
    givenConfig: { web1: { instanceType: 'm5.large' }, web2: { instanceType: 'm5.large' } },
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B', db: 'Catalogue DB' },
    stages: [
      {
        title: 'Read bottleneck',
        brief: '2,000 reads per second. The database handles 1,500.',
        goal: 'Take read load off the database.',
        set: { db: { readReplica: true } },
        palette: ['redis'],
        load: { rps: 2000 },
        goals: [sla({ maxErrorRatePercent: 1 })],
        hint: 'A read replica or a Redis cache both take reads off the main database.',
      },
    ],
  },
  {
    id: 64,
    given: 'api:apigw@-2,0 fn:lambda@4,0',
    givenWires: 'users-api api-fn',
    names: { api: 'Likes API', fn: 'Likes Function' },
    stages: [
      {
        title: 'Key-value speed',
        brief: 'Likes are simple key lookups, millions of them.',
        goal: 'Store them in DynamoDB.',
        add: 'table:dynamodb@6,0',
        wire: 'fn-table',
        goals: [path('client apigw lambda dynamodb')],
      },
    ],
  },
  {
    id: 65,
    given: 'api:apigw@-2,0 fn:lambda@4,0 ~db:rds@5,0',
    givenWires: 'users-api api-fn fn-db',
    names: { api: 'API', fn: 'Function', db: 'SQL Database' },
    stages: [
      {
        title: 'Serverless all the way',
        brief: '2,800 req/s, and the SQL database tops out at 1,500.',
        goal: 'Swap the database for DynamoDB.',
        remove: ['db'],
        add: 'table:dynamodb@6,0',
        wire: 'fn-table',
        load: { rps: 2800 },
        goals: [path('client apigw lambda dynamodb'), sla({ maxErrorRatePercent: 1 }), { ...atMost('rds', 0), label: 'Retire the SQL database' }],
      },
    ],
  },
  {
    id: 66,
    given: 'web:ec2@0,0 db:rds@5,0',
    givenWires: 'users-web web-db',
    names: { web: 'Feed Server', db: 'Posts DB' },
    stages: [
      {
        title: 'RAM beats disk',
        brief: 'The feed takes 150ms. Users want it under 70ms.',
        goal: 'Add a Redis cache beside the database.',
        add: 'cache:redis@5,1',
        wire: 'web-cache',
        goals: [sla({ maxLatencyMs: 70 })],
      },
    ],
  },
  {
    id: 67,
    given: 'web:ec2@0,0 cache:redis@5,1 db:rds@5,-1',
    givenWires: 'users-web web-cache',
    names: { web: 'App Server', cache: 'Redis Cache', db: 'Main DB' },
    stages: [
      {
        title: 'Cache-aside',
        brief: 'The app reads the cache, but on a miss it has nowhere to go.',
        goal: 'Wire the app to the database as well.',
        wire: 'web-db',
        goals: [path('client ec2 redis'), path('client ec2 rds'), sla({ maxLatencyMs: 70 })],
      },
    ],
  },
  {
    id: 68,
    given: 'web:ec2@0,0 lake:s3@6,0',
    givenWires: 'users-web web-lake',
    names: { web: 'App Server', lake: 'Data Lake' },
    stages: [
      {
        title: 'Analytics',
        brief: 'The business wants SQL reports over years of data.',
        goal: 'Load the data lake into Redshift.',
        add: 'wh:redshift@5,0',
        wire: 'lake-wh',
        goals: [place('redshift', 'private'), path('client ec2 s3 redshift')],
      },
    ],
  },
  {
    id: 69,
    given: 'alb:alb@-1,0 web:ec2@1,0 db:rds@5,0',
    givenWires: 'users-alb alb-web web-db',
    givenConfig: { db: { securityGroupInbound: [PG_ANY], encrypted: false } },
    names: { alb: 'Load Balancer', web: 'Web Server', db: 'Customer DB' },
    stages: [
      {
        title: 'Exposed',
        brief: 'The database accepts connections from anywhere and stores data in plain text.',
        goal: 'Restrict port 5432 to the VPC and turn on encryption.',
        set: { db: { securityGroupInbound: [PG_VPC], encrypted: true } },
        goals: [path('client alb ec2 rds'), sla({ minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 70,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1',
    givenWires: 'users-alb alb-web1 alb-web2',
    givenConfig: { web1: { instanceType: 'm5.large' }, web2: { instanceType: 'm5.large' } },
    names: { alb: 'Load Balancer', web1: 'Feed Server A', web2: 'Feed Server B' },
    stages: [
      {
        title: 'Persist posts',
        brief: 'The feed servers need a database: 1,000 req/s today.',
        goal: 'Wire both servers to an RDS database.',
        add: 'db:rds@5,0',
        wire: 'web1-db web2-db',
        load: { rps: 1000 },
        goals: [path('client alb ec2 rds'), wired('ec2', 'rds', 2), sla({ maxErrorRatePercent: 1 })],
      },
      {
        title: 'Gone viral',
        brief: '2,200 req/s. The database can’t keep up, and the feed is slow.',
        goal: 'Cache feed reads for both servers.',
        add: 'cache:redis@6,0',
        wire: 'web1-cache web2-cache',
        load: { rps: 2200 },
        goals: [sla({ maxErrorRatePercent: 1, maxLatencyMs: 80 })],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 8 — Data, Analytics & AI

const module8: LevelRecipe[] = [
  {
    id: 71,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Every click',
        brief: 'Marketing wants every click, the moment it happens.',
        goal: 'Stream click events into Kinesis.',
        add: 'stream:kinesis@6,0',
        wire: 'web-stream',
        goals: [path('client ec2 kinesis')],
      },
    ],
  },
  {
    id: 72,
    given: 'web:ec2@0,0 stream:kinesis@6,0',
    givenWires: 'users-web web-stream',
    names: { web: 'Web Server', stream: 'Click Stream' },
    stages: [
      {
        title: 'Data lake',
        brief: 'Stream data vanishes after a day unless you land it somewhere.',
        goal: 'Deliver the stream into S3.',
        add: 'lake:s3@6,2',
        wire: 'stream-lake',
        goals: [path('client ec2 kinesis s3')],
      },
    ],
  },
  {
    id: 73,
    given: 'shop:ecs@2,-2 web:ec2@0,1 db:rds@5,-1',
    givenWires: 'users-shop shop-db users-web web-db',
    names: { shop: 'Shop', web: 'Reporting App', db: 'Orders DB' },
    stages: [
      {
        title: 'BI warehouse',
        brief: 'Every Monday the board-pack queries scan years of orders and the checkout slows to a crawl.',
        goal: 'Point the reporting app at Redshift and take it off the orders database.',
        add: 'wh:redshift@5,1',
        unwire: 'web-db',
        wire: 'web-wh',
        goals: [path('client ec2 redshift'), apart('ec2', 'rds')],
      },
    ],
  },
  {
    id: 74,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Model endpoint',
        brief: 'The data team trained a recommendations model.',
        goal: 'Host it on SageMaker in the private subnet.',
        add: 'model:sagemaker@5,0',
        wire: 'web-model',
        goals: [place('sagemaker', 'private'), path('client ec2 sagemaker')],
      },
    ],
  },
  {
    id: 75,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1',
    givenWires: 'users-alb alb-web1 alb-web2',
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B' },
    stages: [
      {
        title: 'Live predictions',
        brief: 'Every page should show personalised picks.',
        goal: 'Both servers call one SageMaker endpoint.',
        add: 'model:sagemaker@5,0',
        wire: 'web1-model web2-model',
        goals: [path('client alb ec2 sagemaker'), wired('ec2', 'sagemaker', 2)],
      },
    ],
  },
  {
    id: 76,
    given: 'web:ec2@0,-1 stream:kinesis@6,-1',
    givenWires: 'users-web web-stream',
    names: { web: 'Payments Server', stream: 'Transactions Stream' },
    stages: [
      {
        title: 'Streaming triage',
        brief: 'Every transaction should be scored for fraud as it streams past.',
        goal: 'A Lambda reads the stream and calls a SageMaker model.',
        add: 'fn:lambda@4,1 model:sagemaker@5,1',
        wire: 'stream-fn fn-model',
        goals: [path('client ec2 kinesis lambda sagemaker')],
      },
    ],
  },
  {
    id: 77,
    given: 'web:ec2@0,0 model:sagemaker@5,0',
    givenWires: 'users-web web-model',
    names: { web: 'Inference Server', model: 'Fraud Model' },
    stages: [
      {
        title: 'Bot flood',
        brief: '2,000 bot requests per second are drowning the model.',
        goal: 'Put API Gateway in front to throttle them.',
        add: 'api:apigw@-2,0',
        unwire: 'users-web',
        wire: 'users-api api-web',
        load: { rps: 300, botRps: 2000 },
        goals: [path('client apigw ec2 sagemaker'), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 78,
    given: 'web:ec2@0,0 model:sagemaker@5,0',
    givenWires: 'users-web web-model',
    names: { web: 'App Server', model: 'Recommender' },
    stages: [
      {
        title: 'Cache predictions',
        brief: 'Each prediction takes 70ms, and most users ask the same questions.',
        goal: 'Cache predictions in Redis to get under 60ms.',
        add: 'cache:redis@5,1',
        wire: 'web-cache',
        goals: [sla({ maxLatencyMs: 60 })],
      },
    ],
  },
  {
    id: 79,
    given: 'web:ec2@0,0 stream:kinesis@6,0',
    givenWires: 'users-web web-stream',
    names: { web: 'Web Server', stream: 'Orders Stream' },
    stages: [
      {
        title: 'Live dashboards',
        brief: 'Executives want orders in their dashboards within seconds.',
        goal: 'Stream orders into Redshift.',
        add: 'wh:redshift@5,0',
        wire: 'stream-wh',
        goals: [path('client ec2 kinesis redshift')],
      },
    ],
  },
  {
    id: 80,
    stages: [
      {
        title: 'Score every payment',
        brief: 'Fraudsters and bots are hitting the payments API.',
        goal: 'API Gateway → Lambda → SageMaker.',
        add: 'api:apigw@-2,0 fn:lambda@4,-1 model:sagemaker@5,-1',
        wire: 'users-api api-fn fn-model',
        load: { rps: 500, botRps: 3000 },
        goals: [path('client apigw lambda sagemaker'), sla({ maxErrorRatePercent: 1 })],
      },
      {
        title: 'Audit trail',
        brief: 'Regulators want every decision in the warehouse.',
        goal: 'Stream decisions through Kinesis into Redshift.',
        add: 'stream:kinesis@6,1 wh:redshift@5,1',
        wire: 'fn-stream stream-wh',
        load: { rps: 500, botRps: 3000 },
        goals: [path('client apigw lambda kinesis redshift')],
      },
      {
        title: 'Faster answers',
        brief: 'Checkout waits 133ms for a fraud score. The target is 80ms.',
        goal: 'Cache repeat predictions.',
        add: 'cache:redis@6,-1',
        wire: 'fn-cache',
        load: { rps: 500, botRps: 3000 },
        goals: [sla({ maxLatencyMs: 80 })],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 9 — Security

const module9: LevelRecipe[] = [
  {
    id: 81,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    givenConfig: { web: { securityGroupInbound: [HTTP_ANY, SSH_ANY, RDP_ANY] } },
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Your side of the deal',
        brief: 'AWS secures the data centre. Your firewall rules are up to you, and they are wide open.',
        goal: 'Keep only port 80 open.',
        set: { web: { securityGroupInbound: [HTTP_ANY] } },
        goals: [path('client ec2'), sla({ minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 82,
    given: 'web:ec2@0,0 bucket:s3@5,0',
    givenWires: 'users-web web-bucket',
    names: { web: 'Web Server', bucket: 'Uploads Bucket' },
    stages: [
      {
        title: 'No passwords in code',
        brief: 'The app reads S3 using a password pasted into its config file.',
        goal: 'Give the server an IAM role instead.',
        add: 'role:iam@6,2',
        wire: 'web-role',
        goals: [wired('ec2', 'iam')],
      },
    ],
  },
  {
    id: 83,
    given: 'alb:alb@-1,0 web:ec2@1,0',
    givenWires: 'users-alb alb-web',
    names: { alb: 'Load Balancer', web: 'Web Server' },
    stages: [
      {
        title: 'Shield up',
        brief: '2,000 bot requests per second are flooding the server.',
        goal: 'Filter traffic through AWS WAF.',
        add: 'shield:waf@-3,0',
        unwire: 'users-alb',
        wire: 'users-shield shield-alb',
        load: BOTS,
        goals: [path('client waf alb ec2'), sla({ maxErrorRatePercent: 1, minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 84,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1',
    givenWires: 'users-alb alb-web1 alb-web2',
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B' },
    stages: [
      {
        title: 'SQL injection',
        brief: 'Attackers are sending SQL through the login form.',
        goal: 'Put WAF in front of the load balancer.',
        add: 'shield:waf@-3,0',
        unwire: 'users-alb',
        wire: 'users-shield shield-alb',
        load: BOTS,
        goals: [path('client waf alb ec2'), sla({ minSecurityScore: 100, maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 85,
    given: 'fn:lambda@4,0',
    names: { fn: 'Tickets Function' },
    stages: [
      {
        title: 'Ticket bots',
        brief: 'Scalper bots want every concert ticket.',
        goal: 'WAF filters bots, then API Gateway throttles what’s left.',
        add: 'shield:waf@-3,0 api:apigw@-2,0',
        wire: 'users-shield shield-api api-fn',
        load: { rps: 200, botRps: 5000 },
        goals: [path('client waf apigw lambda'), sla({ maxErrorRatePercent: 1, minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 86,
    given: 'web:ec2@0,0 db:rds@5,0',
    givenWires: 'users-web web-db',
    givenConfig: { db: { encrypted: false } },
    names: { web: 'Web Server', db: 'Customer DB' },
    stages: [
      {
        title: 'Master key',
        brief: 'Customer data sits on disk in plain text.',
        goal: 'Encrypt the database with a KMS key.',
        add: 'key:kms@6,2',
        wire: 'key-db',
        set: { db: { encrypted: true } },
        goals: [cfg('rds', 'encrypted', true), wired('rds', 'kms')],
      },
    ],
  },
  {
    id: 87,
    given: 'web:ec2@0,0 db:rds@5,0',
    givenWires: 'users-web web-db',
    givenConfig: { db: { encrypted: false } },
    names: { web: 'App Server', db: 'Accounts DB' },
    stages: [
      {
        title: 'Vault rules',
        brief: 'The database must be encrypted, and the app needs a role, not a password.',
        goal: 'Encrypt with KMS and give the app an IAM role.',
        add: 'key:kms@6,2 role:iam@6,-2',
        wire: 'key-db role-web',
        set: { db: { encrypted: true } },
        goals: [cfg('rds', 'encrypted', true), wired('rds', 'kms'), wired('ec2', 'iam')],
      },
    ],
  },
  {
    id: 88,
    given: 'web:ec2@0,0 bucket:s3@5,0',
    givenWires: 'users-web web-bucket',
    givenConfig: { bucket: { blockPublicAccess: false } },
    names: { web: 'Web Server', bucket: 'Statements Bucket' },
    stages: [
      {
        title: 'Leak',
        brief: 'Bank statements are downloadable by anyone with the link.',
        goal: 'Block public access and give the app an IAM role.',
        add: 'role:iam@6,2',
        wire: 'web-role',
        set: { bucket: { blockPublicAccess: true } },
        goals: [cfg('s3', 'blockPublicAccess', true), wired('ec2', 'iam'), sla({ minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 89,
    given: 'alb:alb@-1,0 web:ec2@1,0 db:rds@5,0',
    givenWires: 'users-alb alb-web web-db users-db alb-db',
    givenConfig: { db: { securityGroupInbound: [PG_ANY] } },
    names: { alb: 'Load Balancer', web: 'Web Server', db: 'Ledger DB' },
    stages: [
      {
        title: 'Lockdown',
        brief: 'Two wires bypass the app and go straight into the ledger, and its firewall is wide open.',
        goal: 'Cut the illegal wires and close the database to the internet.',
        unwire: 'users-db alb-db',
        set: { db: { securityGroupInbound: [PG_VPC] } },
        goals: [path('client alb ec2 rds'), sla({ minSecurityScore: 100 })],
      },
    ],
  },
  {
    id: 90,
    stages: [
      {
        title: 'Perimeter',
        brief: 'A bank under constant bot attack. Nothing but the WAF faces the internet.',
        goal: 'WAF → ALB → private servers in two AZs → database.',
        add: 'shield:waf@-3,0 alb:alb@-1,0 app1:ec2@4,-1 app2:ec2@4,1 db:rds@6,0',
        wire: 'users-shield shield-alb alb-app1 alb-app2 app1-db app2-db',
        load: BOTS,
        goals: [path('client waf alb ec2 rds'), place('ec2', 'private', 2), twoAzs('ec2'), sla({ maxErrorRatePercent: 1 })],
      },
      {
        title: 'Zero trust',
        brief: 'Every server gets a role. Every byte at rest is encrypted with your key.',
        goal: 'IAM roles on both servers, KMS on the database, security score 100.',
        add: 'role:iam@6,-2 key:kms@6,2',
        wire: 'role-app1 role-app2 key-db',
        load: BOTS,
        goals: [wired('ec2', 'iam', 2), wired('rds', 'kms'), sla({ minSecurityScore: 100 })],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 10 — Monitoring & Operations

const module10: LevelRecipe[] = [
  {
    id: 91,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Radar on',
        brief: 'You find out the site is down when customers tweet about it.',
        goal: 'Monitor the server with CloudWatch.',
        add: 'mon:cloudwatch@6,2',
        wire: 'mon-web',
        goals: [wired('cloudwatch', 'ec2')],
      },
    ],
  },
  {
    id: 92,
    given: 'web:ec2@0,0',
    givenWires: 'users-web',
    names: { web: 'Web Server' },
    stages: [
      {
        title: 'Who did that?',
        brief: 'Someone changed a firewall rule last night. Nobody knows who.',
        goal: 'Record every API call with CloudTrail.',
        add: 'trail:cloudtrail@6,2',
        wire: 'trail-web',
        goals: [wired('cloudtrail', 'ec2')],
      },
    ],
  },
  {
    id: 93,
    given: 'web:ec2@0,0 mon:cloudwatch@6,2',
    givenWires: 'users-web mon-web',
    names: { web: 'Web Server', mon: 'CloudWatch' },
    stages: [
      {
        title: 'Wake someone up',
        brief: 'Alarms fire, but nobody is told.',
        goal: 'Send CloudWatch alarms to an SNS topic.',
        add: 'page:sns@6,0',
        wire: 'mon-page',
        goals: [wired('cloudwatch', 'sns')],
      },
    ],
  },
  {
    id: 94,
    given: 'web:ec2@0,0 trail:cloudtrail@6,2',
    givenWires: 'users-web trail-web',
    names: { web: 'Web Server', trail: 'CloudTrail' },
    stages: [
      {
        title: 'Tamper-proof logs',
        brief: 'Audit logs must be kept, and nobody may quietly overwrite them.',
        goal: 'Store CloudTrail logs in a versioned S3 bucket.',
        add: 'vault:s3@6,0',
        wire: 'trail-vault',
        set: { vault: { versioning: true } },
        goals: [wired('cloudtrail', 's3'), cfg('s3', 'versioning', true)],
      },
    ],
  },
  {
    id: 95,
    given: 'alb:alb@-1,0 fleet:asg@1,0',
    givenWires: 'users-alb alb-fleet',
    givenConfig: { fleet: { maxCapacity: 2 } },
    names: { alb: 'Load Balancer', fleet: 'Web Fleet' },
    stages: [
      {
        title: 'Scaling signal',
        brief: 'The fleet can’t scale on what it can’t measure, and 2,000 req/s are coming.',
        goal: 'Monitor the fleet and let it grow to 4 servers.',
        add: 'mon:cloudwatch@6,2',
        wire: 'mon-fleet',
        set: { fleet: { maxCapacity: 4 } },
        load: { rps: 2000 },
        goals: [wired('cloudwatch', 'asg'), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 96,
    given: 'web:ec2@0,0 cache:redis@5,1 db:rds@5,-1',
    givenWires: 'users-web web-cache web-db',
    names: { web: 'App Server', cache: 'Redis Cache', db: 'Main DB' },
    stages: [
      {
        title: 'Latency watchdog',
        brief: 'When the cache hit rate drops, the database melts. You need to see it coming.',
        goal: 'Monitor both the cache and the database.',
        add: 'mon:cloudwatch@6,2',
        wire: 'mon-cache mon-db',
        goals: [wired('cloudwatch', 'redis'), wired('cloudwatch', 'rds')],
      },
    ],
  },
  {
    id: 97,
    given: 'alb:alb@-1,0 web:ec2@1,0',
    givenWires: 'users-alb alb-web',
    names: { alb: 'Load Balancer', web: 'Web Server' },
    stages: [
      {
        title: 'Security audit',
        brief: 'Auditors want a firewall, an identity and a paper trail.',
        goal: 'WAF in front, an IAM role, and CloudTrail on the server.',
        add: 'shield:waf@-3,0 role:iam@6,-2 trail:cloudtrail@6,2',
        unwire: 'users-alb',
        wire: 'users-shield shield-alb role-web trail-web',
        load: BOTS,
        goals: [
          path('client waf alb ec2'),
          wired('ec2', 'iam'),
          wired('cloudtrail', 'ec2'),
          sla({ maxErrorRatePercent: 1, minSecurityScore: 100 }),
        ],
      },
    ],
  },
  {
    id: 98,
    given: 'api:apigw@-2,0 q:sqs@5,0 worker:lambda@4,1',
    givenWires: 'users-api api-q q-worker',
    names: { api: 'Orders API', q: 'Orders Queue', worker: 'Order Worker' },
    stages: [
      {
        title: 'Queue depth',
        brief: 'If the queue backs up, orders arrive hours late and nobody notices.',
        goal: 'Watch the queue with CloudWatch.',
        add: 'mon:cloudwatch@6,2',
        wire: 'mon-q',
        load: { rps: 6000 },
        goals: [wired('cloudwatch', 'sqs'), path('client apigw sqs lambda')],
      },
    ],
  },
  {
    id: 99,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1 db:rds@5,0',
    givenWires: 'users-alb alb-web1 alb-web2 web1-db web2-db',
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B', db: 'Customer DB' },
    stages: [
      {
        title: 'Audit ready',
        brief: 'Compliance needs metrics on every server and the database, and a record of every change.',
        goal: 'CloudWatch on both servers and the database; CloudTrail on the database.',
        add: 'mon:cloudwatch@6,2 trail:cloudtrail@6,-2',
        wire: 'mon-web1 mon-web2 mon-db trail-db',
        goals: [wired('cloudwatch', 'ec2', 2), wired('cloudwatch', 'rds'), wired('cloudtrail', 'rds')],
      },
    ],
  },
  {
    id: 100,
    stages: [
      {
        title: 'The platform',
        brief: 'A self-scaling app with a database, at 1,500 req/s.',
        goal: 'ALB → Auto Scaling Group → RDS.',
        add: 'alb:alb@-1,0 fleet:asg@1,0 db:rds@5,0',
        wire: 'users-alb alb-fleet fleet-db',
        load: { rps: 1500 },
        goals: [path('client alb asg rds'), sla({ maxErrorRatePercent: 1 })],
      },
      {
        title: 'Ops centre',
        brief: 'Nobody should ever learn about an outage from a customer again.',
        goal: 'Watch the fleet and database, page on-call via SNS, and audit every change.',
        add: 'mon:cloudwatch@6,2 page:sns@7,2 trail:cloudtrail@6,-2',
        wire: 'mon-fleet mon-db mon-page trail-db',
        load: { rps: 1500 },
        goals: [wired('cloudwatch', 'asg'), wired('cloudwatch', 'rds'), wired('cloudwatch', 'sns'), wired('cloudtrail', 'rds')],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 11 — Pricing & Cost

const module11: LevelRecipe[] = [
  {
    id: 101,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1 ~z1:ec2@2,-3 ~z2:ec2@2,3 ~z3:ec2@4,0',
    givenWires: 'users-alb alb-web1 alb-web2',
    givenConfig: { z3: { instanceType: 'm5.large' } },
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B', z1: 'Old Build Box', z2: 'Hackathon Demo', z3: 'Load Test Rig' },
    stages: [
      {
        title: 'Zombie hunt',
        brief: 'Three forgotten servers cost more than the real app.',
        goal: 'Find them and delete them.',
        remove: ['z1', 'z2', 'z3'],
        goals: [removed('z1', 'z2', 'z3'), path('client alb ec2'), reach('ec2', 2), sla({ maxCostUsd: 60 })],
      },
    ],
  },
  {
    id: 102,
    given: 'api:apigw@-2,0 ~old:ec2@1,0',
    givenWires: 'users-api api-old',
    givenConfig: { old: { instanceType: 'm5.large' } },
    names: { api: 'Reports API', old: 'Report Server' },
    stages: [
      {
        title: 'Pay per request',
        brief: 'A $110 server sits idle most of the day for a few bursts of report requests.',
        goal: 'Replace it with Lambda.',
        remove: ['old'],
        add: 'fn:lambda@4,0',
        wire: 'api-fn',
        load: { rps: 20 },
        goals: [path('client apigw lambda'), sla({ maxCostUsd: 40 })],
      },
    ],
  },
  {
    id: 103,
    given: '~web:ec2@0,0',
    givenWires: 'users-web',
    givenConfig: { web: { instanceType: 'm5.large' } },
    names: { web: 'Brochure Server' },
    stages: [
      {
        title: 'Five-dollar website',
        brief: 'A static brochure site runs on a $110 server.',
        goal: 'Host it on S3 behind CloudFront.',
        remove: ['web'],
        add: 'cdn:cloudfront@-3,0 site:s3@-2,1',
        wire: 'users-cdn cdn-site',
        goals: [path('client cloudfront s3'), sla({ maxCostUsd: 25 })],
      },
    ],
  },
  {
    id: 104,
    given: 'web:ec2@0,0 media:s3@5,0',
    givenWires: 'users-web web-media',
    names: { web: 'Download Server', media: 'Downloads Bucket' },
    stages: [
      {
        title: 'Bandwidth bill',
        brief: '1,200 downloads per second. A bigger server would cost $110 a month.',
        goal: 'Put CloudFront in front instead.',
        add: 'cdn:cloudfront@-3,0',
        unwire: 'users-web',
        wire: 'users-cdn cdn-web',
        load: { rps: 1200 },
        goals: [path('client cloudfront ec2 s3'), sla({ maxErrorRatePercent: 1, maxCostUsd: 40 })],
      },
    ],
  },
  {
    id: 105,
    given: 'api:apigw@-2,0 fn:lambda@4,0 ~db:rds@5,0',
    givenWires: 'users-api api-fn fn-db',
    names: { api: 'API', fn: 'Function', db: 'SQL Database' },
    stages: [
      {
        title: 'Pay-per-request data',
        brief: 'A $95 database for a few key lookups a day.',
        goal: 'Swap it for DynamoDB.',
        remove: ['db'],
        add: 'table:dynamodb@6,0',
        wire: 'fn-table',
        goals: [path('client apigw lambda dynamodb'), sla({ maxCostUsd: 60 })],
      },
    ],
  },
  {
    id: 106,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1 db:rds@5,0',
    givenWires: 'users-alb alb-web1 alb-web2 web1-db web2-db',
    givenConfig: {
      web1: { instanceType: 'm5.large' },
      web2: { instanceType: 'm5.large' },
      db: { readReplica: true },
    },
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B', db: 'Catalogue DB' },
    stages: [
      {
        title: 'Cheaper and faster',
        brief: 'A read replica costs $65 and pages still take 120ms.',
        goal: 'Swap the replica for a Redis cache.',
        add: 'cache:redis@5,1',
        wire: 'web1-cache web2-cache',
        set: { db: { readReplica: false } },
        load: { rps: 2000 },
        goals: [sla({ maxLatencyMs: 80, maxCostUsd: 400, maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 107,
    given: 'alb:alb@-1,0 ~w1:ec2@1,-2 ~w2:ec2@1,-1 ~w3:ec2@1,1 ~w4:ec2@1,2',
    givenWires: 'users-alb alb-w1 alb-w2 alb-w3 alb-w4',
    givenConfig: {
      w1: { instanceType: 'm5.large' },
      w2: { instanceType: 'm5.large' },
      w3: { instanceType: 'm5.large' },
      w4: { instanceType: 'm5.large' },
    },
    names: { alb: 'Load Balancer', w1: 'Big Server 1', w2: 'Big Server 2', w3: 'Big Server 3', w4: 'Big Server 4' },
    stages: [
      {
        title: 'Elastic spend',
        brief: 'Four large servers run 24/7 for a peak of 1,500 req/s.',
        goal: 'Replace them with an Auto Scaling Group capped at 3.',
        remove: ['w1', 'w2', 'w3', 'w4'],
        add: 'fleet:asg@2,0',
        wire: 'alb-fleet',
        set: { fleet: { maxCapacity: 3 } },
        load: { rps: 1500 },
        goals: [path('client alb asg'), sla({ maxErrorRatePercent: 1, maxCostUsd: 120 })],
      },
    ],
  },
  {
    id: 108,
    given: 'api:apigw@-2,0 ~big:ec2@1,0',
    givenWires: 'users-api api-big',
    givenConfig: { big: { instanceType: 'c6g.xlarge' } },
    names: { api: 'Jobs API', big: 'Batch Server' },
    stages: [
      {
        title: 'Night jobs',
        brief: 'Nightly bursts of 4,000 jobs per second. The giant server idles all day.',
        goal: 'Queue the jobs in SQS and process them with Lambda.',
        remove: ['big'],
        add: 'q:sqs@5,0 worker:lambda@4,1',
        wire: 'api-q q-worker',
        load: { rps: 4000 },
        goals: [path('client apigw sqs lambda'), sla({ maxErrorRatePercent: 1, maxCostUsd: 60 })],
      },
    ],
  },
  {
    id: 109,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1 db:rds@5,0 ~z1:ebs@2,-3 ~z2:ec2@2,3',
    givenWires: 'users-alb alb-web1 alb-web2 web1-db web2-db',
    givenConfig: { db: { multiAZ: true, readReplica: true } },
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B', db: 'Orders DB', z1: 'Stray Volume', z2: 'Spare Server' },
    stages: [
      {
        title: 'Budget audit',
        brief: 'Finance wants the bill under $240 without risking uptime.',
        goal: 'Cut waste but keep the database Multi-AZ.',
        remove: ['z1', 'z2'],
        set: { db: { readReplica: false } },
        load: { rps: 500 },
        goals: [cfg('rds', 'multiAZ', true), sla({ maxErrorRatePercent: 1, maxCostUsd: 240 })],
      },
    ],
  },
  {
    id: 110,
    given: '~mono:ec2@1,0 ~db:rds@5,0',
    givenWires: 'users-mono mono-db',
    givenConfig: { mono: { instanceType: 'c6g.xlarge' } },
    names: { mono: 'Monolith', db: 'Monolith DB' },
    stages: [
      {
        title: 'Static first',
        brief: 'Half the monolith’s traffic is static pages.',
        goal: 'Serve the static site from S3 through CloudFront.',
        add: 'cdn:cloudfront@-3,0 site:s3@-2,1',
        wire: 'users-cdn cdn-site',
        goals: [path('client cloudfront s3')],
      },
      {
        title: 'Slash the bill',
        brief: 'The monolith and its database cost $305 a month.',
        goal: 'Replace them with API Gateway → Lambda → DynamoDB.',
        remove: ['mono', 'db'],
        add: 'api:apigw@-2,-1 fn:lambda@4,-1 table:dynamodb@6,-1',
        wire: 'users-api api-fn fn-table',
        goals: [path('client apigw lambda dynamodb'), sla({ maxCostUsd: 80 })],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 12 — Migration

const module12: LevelRecipe[] = [
  {
    id: 111,
    stages: [
      {
        title: 'Lift and shift',
        brief: 'The old office server handled 500 req/s. Its replacement must too.',
        goal: 'Run the app on an EC2 server big enough for the load.',
        add: 'web:ec2@0,0',
        wire: 'users-web',
        set: { web: { instanceType: 't3.medium' } },
        load: { rps: 500 },
        goals: [path('client ec2'), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 112,
    given: 'web:ec2@0,0 db:rds@5,0',
    givenWires: 'users-web web-db',
    names: { web: 'Web Server', db: 'New Database' },
    stages: [
      {
        title: 'The moving truck',
        brief: 'Twenty years of records still live in the old data centre.',
        goal: 'Run AWS DMS in the private subnet, connected to the new database.',
        add: 'mig:dms@4,1',
        wire: 'mig-db',
        goals: [place('dms', 'private'), wired('dms', 'rds')],
      },
    ],
  },
  {
    id: 113,
    given: 'web:ec2@0,0 mig:dms@4,1',
    givenWires: 'users-web',
    names: { web: 'Web Server', mig: 'DMS Task' },
    stages: [
      {
        title: 'Live replication',
        brief: 'The migration task is ready, but there is no target database.',
        goal: 'Add RDS and connect it to both DMS and the web server.',
        add: 'db:rds@5,0',
        wire: 'mig-db web-db',
        goals: [wired('dms', 'rds'), path('client ec2 rds')],
      },
    ],
  },
  {
    id: 114,
    given: 'web:ec2@0,0 ~share:efs@4,0',
    givenWires: 'users-web web-share',
    names: { web: 'File Server', share: 'Legacy File Share' },
    stages: [
      {
        title: 'Replatform',
        brief: 'The old file share is mostly archives nobody edits.',
        goal: 'Move the files to S3.',
        remove: ['share'],
        add: 'files:s3@5,0',
        wire: 'web-files',
        goals: [path('client ec2 s3'), sla({ maxCostUsd: 25 })],
      },
    ],
  },
  {
    id: 115,
    given: 'alb:alb@-1,0 ~vm1:ec2@1,-1 ~vm2:ec2@1,1',
    givenWires: 'users-alb alb-vm1 alb-vm2',
    givenConfig: { vm1: { instanceType: 'm5.large' }, vm2: { instanceType: 'm5.large' } },
    names: { alb: 'Load Balancer', vm1: 'Legacy VM 1', vm2: 'Legacy VM 2' },
    stages: [
      {
        title: 'Containerise',
        brief: 'Two large VMs cost $220 a month for 2,000 req/s.',
        goal: 'Run the app as an ECS service instead.',
        remove: ['vm1', 'vm2'],
        add: 'svc:ecs@2,0',
        wire: 'alb-svc',
        load: { rps: 2000 },
        goals: [path('client alb ecs'), sla({ maxErrorRatePercent: 1, maxCostUsd: 120 })],
      },
    ],
  },
  {
    id: 116,
    given: 'api:apigw@-2,0 ~legacy:ec2@1,0 table:dynamodb@6,0',
    givenWires: 'users-api api-legacy legacy-table',
    names: { api: 'Public API', legacy: 'Legacy API Server', table: 'Orders Table' },
    stages: [
      {
        title: 'Refactor',
        brief: 'The legacy API server is the last server in the stack.',
        goal: 'Replace it with Lambda.',
        remove: ['legacy'],
        add: 'fn:lambda@4,0',
        wire: 'api-fn fn-table',
        goals: [path('client apigw lambda dynamodb'), atMost('ec2', 0)],
      },
    ],
  },
  {
    id: 117,
    given: 'dns:route53@-4,0 ~old:ec2@0,-1 new:ec2@0,1',
    givenWires: 'users-dns dns-old',
    names: { dns: 'Route 53', old: 'Old Data Centre', new: 'New AWS Server' },
    stages: [
      {
        title: 'Cutover',
        brief: 'The new server is ready. Switch users over without an outage.',
        goal: 'Point DNS at the new server, then retire the old one.',
        wire: 'dns-new',
        remove: ['old'],
        goals: [removed('old'), path('client route53 ec2'), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 118,
    given: 'app:ec2@1,0 db:rds@5,0',
    givenWires: 'app-db',
    names: { app: 'Migrated App', db: 'Migrated DB' },
    clientName: 'Head Office',
    stages: [
      {
        title: 'Hybrid bridge',
        brief: 'Head-office staff must reach the migrated app over a private link.',
        goal: 'Connect them through a Transit Gateway.',
        add: 'hub:tgw@-2,0',
        wire: 'users-hub hub-app',
        goals: [path('client tgw ec2 rds')],
      },
    ],
  },
  {
    id: 119,
    given: 'alb:alb@-1,0 !old1:ec2@1,-2 !old2:ec2@1,-1 spare:ec2@1,2',
    givenWires: 'users-alb alb-old1 alb-old2',
    names: { alb: 'Load Balancer', old1: 'Legacy Box 1', old2: 'Legacy Box 2', spare: 'New Server' },
    stages: [
      {
        title: 'Retire the old boxes',
        brief: 'Both legacy servers have died. The new one is waiting.',
        goal: 'Decommission the dead servers and send traffic to the new one.',
        remove: ['old1', 'old2'],
        wire: 'alb-spare',
        goals: [removed('old1', 'old2'), reach('ec2'), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 120,
    given: '~mono:ec2@1,0',
    givenWires: 'users-mono',
    names: { mono: 'Banking App' },
    stages: [
      {
        title: 'Move the data',
        brief: 'The bank’s ledger must move to AWS while the app keeps running.',
        goal: 'A Multi-AZ RDS fed by DMS, wired to the app.',
        add: 'db:rds@5,0 mig:dms@4,2',
        wire: 'mono-db mig-db',
        set: { db: { multiAZ: true } },
        goals: [wired('dms', 'rds'), path('client ec2 rds'), cfg('rds', 'multiAZ', true)],
      },
      {
        title: 'Zero downtime',
        brief: 'One app server is one failure away from an outage.',
        goal: 'Put a load balancer in front and add a server in the other AZ.',
        add: 'alb:alb@-1,0 web2:ec2@1,2',
        unwire: 'users-mono',
        wire: 'users-alb alb-mono alb-web2 web2-db',
        goals: [path('client alb ec2 rds'), twoAzs('ec2')],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Module 13 — Well-Architected

const module13: LevelRecipe[] = [
  {
    id: 121,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1',
    givenWires: 'users-alb alb-web1 alb-web2',
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B' },
    stages: [
      {
        title: 'Operational excellence',
        brief: 'Operate by data, not by guesswork.',
        goal: 'Monitor both servers and send alarms to SNS.',
        add: 'mon:cloudwatch@6,2 page:sns@7,2',
        wire: 'mon-web1 mon-web2 mon-page',
        goals: [wired('cloudwatch', 'ec2', 2), wired('cloudwatch', 'sns')],
      },
    ],
  },
  {
    id: 122,
    given: 'alb:alb@-1,0 web:ec2@4,0 db:rds@6,0',
    givenWires: 'users-alb alb-web web-db',
    givenConfig: { db: { encrypted: false } },
    names: { alb: 'Load Balancer', web: 'App Server', db: 'Customer DB' },
    stages: [
      {
        title: 'Security',
        brief: 'Protect every layer: the edge, the network and the data.',
        goal: 'WAF in front, and the database encrypted.',
        add: 'shield:waf@-3,0',
        unwire: 'users-alb',
        wire: 'users-shield shield-alb',
        set: { db: { encrypted: true } },
        load: BOTS,
        goals: [path('client waf alb ec2 rds'), sla({ minSecurityScore: 100, maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 123,
    given: 'alb:alb@-1,0 !w1:ec2@3,-1 db:rds@6,0',
    givenWires: 'users-alb alb-w1',
    names: { alb: 'Load Balancer', w1: 'Only Server', db: 'Orders DB' },
    stages: [
      {
        title: 'Reliability',
        brief: 'The only server crashed, and the database has no standby.',
        goal: 'Servers in two AZs, and a Multi-AZ database.',
        remove: ['w1'],
        add: 'web1:ec2@3,-2 web2:ec2@3,2',
        wire: 'alb-web1 alb-web2 web1-db web2-db',
        set: { db: { multiAZ: true } },
        goals: [removed('w1'), twoAzs('ec2'), path('client alb ec2 rds'), cfg('rds', 'multiAZ', true)],
      },
    ],
  },
  {
    id: 124,
    given: 'alb:alb@-1,0 web:ec2@1,0 db:rds@5,0',
    givenWires: 'users-alb alb-web web-db',
    names: { alb: 'Load Balancer', web: 'App Server', db: 'Catalogue DB' },
    stages: [
      {
        title: 'Performance',
        brief: 'Pages take 154ms. The target is 30ms.',
        goal: 'Cache at the edge and in memory.',
        add: 'cdn:cloudfront@-3,0 cache:redis@5,1',
        unwire: 'users-alb',
        wire: 'users-cdn cdn-alb web-cache',
        goals: [path('client cloudfront alb ec2'), sla({ maxLatencyMs: 30 })],
      },
    ],
  },
  {
    id: 125,
    given: '~alb:alb@-1,0 ~web:ec2@1,0 ~db:rds@5,0',
    givenWires: 'users-alb alb-web web-db',
    givenConfig: { web: { instanceType: 'm5.large' }, db: { multiAZ: true } },
    names: { alb: 'Load Balancer', web: 'App Server', db: 'App DB' },
    stages: [
      {
        title: 'Cost optimisation',
        brief: 'A $315 stack for an app that gets a few hundred requests a minute.',
        goal: 'Rebuild it serverless for under $60.',
        remove: ['alb', 'web', 'db'],
        add: 'api:apigw@-2,0 fn:lambda@4,0 table:dynamodb@6,0',
        wire: 'users-api api-fn fn-table',
        goals: [path('client apigw lambda dynamodb'), sla({ maxCostUsd: 60 })],
      },
    ],
  },
  {
    id: 126,
    given: 'alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1',
    givenWires: 'users-alb alb-web1 alb-web2',
    givenConfig: { web1: { instanceType: 'c6g.xlarge' }, web2: { instanceType: 'c6g.xlarge' } },
    names: { alb: 'Load Balancer', web1: 'Server A', web2: 'Server B' },
    stages: [
      {
        title: 'Sustainability',
        brief: 'Two huge servers sit 80% idle. Idle machines still burn power.',
        goal: 'Right-size both servers for 900 req/s.',
        set: { web1: { instanceType: 't3.medium' }, web2: { instanceType: 't3.medium' } },
        load: { rps: 900 },
        goals: [sla({ maxErrorRatePercent: 1, maxCostUsd: 130 })],
      },
    ],
  },
  {
    id: 127,
    stages: [
      {
        title: 'Checkout',
        brief: 'An e-commerce checkout under bot attack.',
        goal: 'WAF → ALB → two servers → database.',
        add: 'shield:waf@-3,0 alb:alb@-1,0 web1:ec2@1,-1 web2:ec2@1,1 db:rds@5,0',
        wire: 'users-shield shield-alb alb-web1 alb-web2 web1-db web2-db',
        load: BOTS,
        goals: [path('client waf alb ec2 rds'), sla({ maxErrorRatePercent: 1, minSecurityScore: 100 })],
      },
      {
        title: 'Black Friday',
        brief: '3,000 orders per second. The database takes 1,500 writes, and payments can be processed a moment later.',
        goal: 'Scale up the web servers, and queue orders in SQS for a Lambda worker that writes them to the database.',
        add: 'q:sqs@6,2 worker:lambda@4,2',
        unwire: 'web1-db web2-db',
        set: { web1: { instanceType: 'c6g.xlarge' }, web2: { instanceType: 'c6g.xlarge' } },
        wire: 'web1-q web2-q q-worker worker-db',
        load: { rps: 3000, botRps: 2000 },
        goals: [path('client waf alb ec2 sqs lambda'), sla({ maxErrorRatePercent: 1 })],
      },
    ],
  },
  {
    id: 128,
    stages: [
      {
        title: 'Inference API',
        brief: 'A public AI API: users send text, the model answers.',
        goal: 'API Gateway → Lambda → SageMaker.',
        add: 'api:apigw@-2,0 fn:lambda@4,0 model:sagemaker@5,0',
        wire: 'users-api api-fn fn-model',
        load: { rps: 600, botRps: 1500 },
        goals: [path('client apigw lambda sagemaker'), sla({ maxErrorRatePercent: 1 })],
      },
      {
        title: 'Sub-100ms',
        brief: 'Answers take 133ms. Many prompts repeat.',
        goal: 'Cache answers to get under 100ms.',
        add: 'cache:redis@5,1',
        wire: 'fn-cache',
        load: { rps: 600, botRps: 1500 },
        goals: [sla({ maxLatencyMs: 100 })],
      },
    ],
  },
  {
    id: 129,
    stages: [
      {
        title: 'Video at the edge',
        brief: 'A streaming service: video files served worldwide.',
        goal: 'Route 53 → CloudFront → S3.',
        add: 'dns:route53@-4,0 cdn:cloudfront@-3,0 videos:s3@-2,1',
        wire: 'users-dns dns-cdn cdn-videos',
        goals: [path('client route53 cloudfront s3')],
      },
      {
        title: 'Personal profiles',
        brief: 'Watch history and profiles need an API behind the same CDN.',
        goal: 'CloudFront → ALB → ECS → DynamoDB, under 30ms.',
        add: 'alb:alb@-1,0 svc:ecs@2,0 profiles:dynamodb@6,0',
        wire: 'cdn-alb alb-svc svc-profiles',
        goals: [path('client cloudfront alb ecs dynamodb'), sla({ maxLatencyMs: 30 })],
      },
    ],
  },
  {
    id: 130,
    stages: [
      {
        title: 'Reliable core',
        brief: 'Your final architecture. Start with a core that survives a data-centre failure.',
        goal: 'ALB → servers in two AZs → Multi-AZ database.',
        add: 'alb:alb@-1,0 web1:ec2@3,-1 web2:ec2@3,1 db:rds@6,0',
        wire: 'users-alb alb-web1 alb-web2 web1-db web2-db',
        set: { db: { multiAZ: true } },
        goals: [path('client alb ec2 rds'), twoAzs('ec2'), cfg('rds', 'multiAZ', true)],
      },
      {
        title: 'Fast everywhere',
        brief: 'Global users, and a 40ms target.',
        goal: 'CloudFront in front, Redis beside the database.',
        add: 'cdn:cloudfront@-3,0 cache:redis@6,2',
        unwire: 'users-alb',
        wire: 'users-cdn cdn-alb web1-cache web2-cache',
        goals: [path('client cloudfront alb ec2'), sla({ maxLatencyMs: 40 })],
      },
      {
        title: 'Secure and watched',
        brief: 'Launch day brings bots, and the auditors.',
        goal: 'WAF before CloudFront, CloudWatch on the servers, security score 100.',
        add: 'shield:waf@-4,0 mon:cloudwatch@7,2',
        unwire: 'users-cdn',
        wire: 'users-shield shield-cdn mon-web1 mon-web2',
        load: BOTS,
        goals: [path('client waf cloudfront alb ec2 rds'), wired('cloudwatch', 'ec2', 2), sla({ minSecurityScore: 100, maxErrorRatePercent: 1 })],
      },
    ],
  },
];

export const RECIPES: LevelRecipe[] = [
  ...module2,
  ...module3,
  ...module4,
  ...module5,
  ...module6,
  ...module7,
  ...module8,
  ...module9,
  ...module10,
  ...module11,
  ...module12,
  ...module13,
];
