/**
 * CloudCraft Strict AWS Network Physics, Anti-Pattern Validator & Live Telemetry Engine
 * Enforces real cloud subnet routing boundaries, firewall port rules, database isolation,
 * valid AWS zone placement, idle/unwired compute waste detection, and live SLA metrics.
 */

import {
  ArchitectureState,
  AWSComponentType,
  Connection,
  GameMode,
  LiveTelemetry,
  NetworkViolation,
  VoxelBlock,
} from './types';

export interface ConnectionPhysicsResult {
  allowed: boolean;
  port: number;
  failureTitle?: string;
  failureReason?: string;
  howToFix?: string;
  collisionWorldX?: number;
  collisionWorldZ?: number;
}

const VPC_ONLY_COMPONENTS = new Set<AWSComponentType>([
  'ec2',
  'asg',
  'ecs',
  'eks',
  'beanstalk',
  'alb',
  'nat_gw',
  'rds',
  'redis',
  'redshift',
  'ebs',
  'efs',
  'sagemaker',
  'dms',
]);

const INSTANCE_COSTS: Record<string, number> = {
  't3.micro': 15,
  't3.medium': 45,
  'm5.large': 110,
  'c6g.xlarge': 210,
};

export const BASE_COMPONENT_COSTS: Record<string, number> = {
  client: 0,
  ec2: 45,
  asg: 120,
  ecs: 75,
  eks: 145,
  beanstalk: 55,
  alb: 25,
  igw: 0,
  nat_gw: 45,
  rds: 95,
  redis: 55,
  redshift: 180,
  s3: 5,
  ebs: 18,
  efs: 30,
  cloudfront: 15,
  route53: 5,
  waf: 25,
  apigw: 20,
  lambda: 8,
  dynamodb: 25,
  kinesis: 35,
  sagemaker: 160,
  sqs: 10,
  sns: 8,
  iam: 0,
  kms: 5,
  cloudwatch: 10,
  cloudtrail: 12,
  dms: 40,
  tgw: 50,
};

export function getComponentMonthlyCost(c: VoxelBlock): number {
  if (c.type === 'ec2') {
    return INSTANCE_COSTS[c.config.instanceType || 't3.micro'] || 35;
  }
  if (c.type === 'rds') {
    let dbCost = 95;
    if (c.config.multiAZ) dbCost += 85;
    if (c.config.readReplica) dbCost += 65;
    return dbCost;
  }
  if (c.type === 'asg') {
    const maxCap = Number(c.config.maxCapacity || 4);
    return maxCap * 30;
  }
  return BASE_COMPONENT_COSTS[c.type] ?? 20;
}

/**
 * Evaluates whether a wire between two blocks is physically & architecturally legal in AWS.
 */
export function evaluateConnectionPhysics(
  fromComp: VoxelBlock,
  toComp: VoxelBlock
): ConnectionPhysicsResult {
  const defaultPort = Number(toComp.config?.port || fromComp.config?.port || 80);

  // 0. INVALID ZONE PLACEMENT CHECK: VPC-only services cannot operate inside EDGE / DNS or EXTERNAL zones
  const invalidEdgeNode = [fromComp, toComp].find(
    (c) => VPC_ONLY_COMPONENTS.has(c.type) && (c.subnet === 'edge' || c.subnet === 'external')
  );
  if (invalidEdgeNode) {
    return {
      allowed: false,
      port: defaultPort,
      failureTitle: `Invalid AWS Zone: ${invalidEdgeNode.type.toUpperCase()} in ${invalidEdgeNode.subnet.toUpperCase()}`,
      failureReason: `"${invalidEdgeNode.name}" is placed in the ${invalidEdgeNode.subnet.toUpperCase()} zone (${invalidEdgeNode.gridX}, ${invalidEdgeNode.gridZ}). In AWS, ${invalidEdgeNode.type.toUpperCase()} must live inside a VPC Subnet (Public or Private), never in the external Edge/DNS zone!`,
      howToFix: `Use the Delete tool to remove "${invalidEdgeNode.name}" from the Edge/DNS zone and place it inside the PUBLIC SUBNET (middle teal zone).`,
      collisionWorldX: invalidEdgeNode.gridX * 1.4,
      collisionWorldZ: invalidEdgeNode.gridZ * 1.4,
    };
  }

  // Normalize direction so we check client/upstream -> downstream
  const isExternalToPrivate =
    (fromComp.subnet === 'external' && toComp.subnet === 'private') ||
    (toComp.subnet === 'external' && fromComp.subnet === 'private');

  const privComp = fromComp.subnet === 'private' ? fromComp : toComp;

  // 1. STRICT SUBNET RULE: External Internet Users CANNOT wire directly into a Private Subnet!
  if (isExternalToPrivate) {
    return {
      allowed: false,
      port: defaultPort,
      failureTitle: 'Illegal Route: Internet → Private Subnet',
      failureReason: `Private Subnets (10.0.2.0/24) are isolated from the public internet. External users cannot connect directly to "${privComp.name}" in the Private Subnet.`,
      howToFix:
        'Unplug this wire. Place public-facing web servers or Load Balancers in the PUBLIC SUBNET (middle zone), or route through an Internet Gateway / Load Balancer first.',
      collisionWorldX: 2.5 * 1.4,
      collisionWorldZ: ((fromComp.gridZ + toComp.gridZ) * 0.5) * 1.4,
    };
  }

  // 2. STRICT DATABASE RULE: External Internet Users CANNOT wire directly to RDS, Redis, or Redshift!
  const involvesExternal = fromComp.subnet === 'external' || toComp.subnet === 'external';
  const dbComp =
    fromComp.type === 'rds' || fromComp.type === 'redis' || fromComp.type === 'redshift'
      ? fromComp
      : toComp.type === 'rds' || toComp.type === 'redis' || toComp.type === 'redshift'
      ? toComp
      : null;

  if (involvesExternal && dbComp) {
    return {
      allowed: false,
      port: dbComp.type === 'redis' ? 6379 : 5432,
      failureTitle: 'Security Breach: Direct Internet → Database',
      failureReason: `Browsers and phones must never connect directly to "${dbComp.name}". Exposing raw database ports to the internet allows attackers to steal or wipe data.`,
      howToFix:
        'Route Internet Users to a Web Server (EC2), Load Balancer (ALB), or API Gateway first, and connect that backend server to your database.',
      collisionWorldX: dbComp.gridX * 1.4,
      collisionWorldZ: dbComp.gridZ * 1.4,
    };
  }

  // 3. CRASHED / OFFLINE NODE RULE
  if (fromComp.status === 'error' || toComp.status === 'error') {
    const crashed = toComp.status === 'error' ? toComp : fromComp;
    return {
      allowed: false,
      port: defaultPort,
      failureTitle: 'HTTP 502 Bad Gateway: Server Crashed',
      failureReason: `"${crashed.name}" is frozen/offline and dropping all incoming network packets.`,
      howToFix: `Use the Delete tool to remove "${crashed.name}" and connect your wire to a healthy server.`,
      collisionWorldX: crashed.gridX * 1.4,
      collisionWorldZ: crashed.gridZ * 1.4,
    };
  }

  // 4. SECURITY GROUP FIREWALL PORT RULE (for EC2 / RDS when securityGroupInbound is explicitly set)
  const target =
    toComp.type === 'ec2' || toComp.type === 'rds'
      ? toComp
      : fromComp.type === 'ec2' || fromComp.type === 'rds'
      ? fromComp
      : null;

  if (target && Array.isArray(target.config.securityGroupInbound)) {
    const rules = target.config.securityGroupInbound;
    if (rules.length === 0) {
      return {
        allowed: false,
        port: defaultPort,
        failureTitle: `Firewall Blocked: Port ${defaultPort} Closed`,
        failureReason: `"${target.name}" has no Inbound Security Group rules, so its firewall rejects all incoming traffic on Port ${defaultPort}.`,
        howToFix: `Click "${target.name}" on the 3D board and click "+ Allow Inbound Port ${defaultPort}" in the right-hand Inspector panel.`,
        collisionWorldX: target.gridX * 1.4,
        collisionWorldZ: target.gridZ * 1.4,
      };
    }
  }

  return {
    allowed: true,
    port: defaultPort,
  };
}

/**
 * Evaluates the entire board for invalid zone placement, unwired idle compute waste,
 * over-provisioned cloud spend, and broken wires.
 */
export function evaluateArchitectureDiagnostics(
  state: ArchitectureState,
  levelId: number
): {
  updatedConnections: Connection[];
  violations: NetworkViolation[];
} {
  const violations: NetworkViolation[] = [];

  // 1. Evaluate every connection with strict physics
  const updatedConnections: Connection[] = state.connections.map((conn) => {
    const fromComp = state.components.find((c) => c.id === conn.fromId);
    const toComp = state.components.find((c) => c.id === conn.toId);
    if (!fromComp || !toComp) {
      return { ...conn, allowed: false };
    }

    const phys = evaluateConnectionPhysics(fromComp, toComp);
    if (!phys.allowed && phys.failureTitle && phys.failureReason) {
      violations.push({
        id: `viol-conn-${conn.id}`,
        severity: 'error',
        title: phys.failureTitle,
        plainEnglishReason: phys.failureReason,
        howToFix: phys.howToFix || 'Fix the network connection.',
        connectionId: conn.id,
        worldX: phys.collisionWorldX ?? toComp.gridX * 1.4,
        worldZ: phys.collisionWorldZ ?? toComp.gridZ * 1.4,
      });
    }

    return {
      ...conn,
      allowed: phys.allowed,
      port: phys.port,
      failureReason: phys.failureReason,
    };
  });

  // 2. Check component placement & FinOps idle-waste anti-patterns
  state.components.forEach((comp) => {
    // Rule 2a: VPC-Only Compute/Database/Storage placed inside EDGE / DNS or EXTERNAL zone
    if (
      VPC_ONLY_COMPONENTS.has(comp.type) &&
      (comp.subnet === 'edge' || comp.subnet === 'external')
    ) {
      violations.push({
        id: `viol-invalid-edge-${comp.id}`,
        severity: 'error',
        title: `Invalid Zone: ${comp.type.toUpperCase()} Placed in ${comp.subnet.toUpperCase()}`,
        plainEnglishReason: `You placed "${comp.name}" in the ${comp.subnet.toUpperCase()} zone. In AWS, ${comp.type.toUpperCase()} resources cannot live in the external Edge/DNS zone—they must be launched inside a VPC Subnet!`,
        howToFix: `Use the Delete tool to remove "${comp.name}" from ${comp.subnet.toUpperCase()} and place it in the PUBLIC SUBNET (middle teal zone) or PRIVATE SUBNET.`,
        componentId: comp.id,
        worldX: comp.gridX * 1.4,
        worldZ: comp.gridZ * 1.4,
      });
    }

    // Rule 2b: RDS, Redis, or Redshift placed outside Private Subnet
    if (
      (comp.type === 'rds' || comp.type === 'redis' || comp.type === 'redshift') &&
      comp.subnet !== 'private'
    ) {
      violations.push({
        id: `viol-zone-${comp.id}`,
        severity: 'error',
        title: `${comp.type.toUpperCase()} Database Exposed in ${comp.subnet.toUpperCase()} Zone`,
        plainEnglishReason: `"${comp.name}" is sitting in the ${comp.subnet.toUpperCase()} zone where outside attackers can reach it. Databases and caches must be hidden inside the PRIVATE SUBNET.`,
        howToFix: `Delete "${comp.name}" from the ${comp.subnet} zone and place it in the PRIVATE SUBNET (indigo zone on the right).`,
        componentId: comp.id,
        worldX: comp.gridX * 1.4,
        worldZ: comp.gridZ * 1.4,
      });
    }

    // Rule 2c: Early levels & direct Client->EC2 web server check (must be in Public Subnet if no ALB/IGW/NAT in front)
    if (
      (levelId === 2 || levelId === 6) &&
      comp.type === 'ec2' &&
      comp.subnet !== 'public'
    ) {
      violations.push({
        id: `viol-public-web-${comp.id}`,
        severity: 'error',
        title: `Web Server Placed in ${comp.subnet.toUpperCase()} Zone`,
        plainEnglishReason: `You placed "${comp.name}" in the ${comp.subnet.toUpperCase()} zone. A public web server that receives direct internet traffic must live in the PUBLIC SUBNET (middle teal zone).`,
        howToFix: `Use the Delete tool to remove "${comp.name}" from the ${comp.subnet} zone and place your EC2 server in the PUBLIC SUBNET.`,
        componentId: comp.id,
        worldX: comp.gridX * 1.4,
        worldZ: comp.gridZ * 1.4,
      });
    }

    // Rule 2d: Internet Gateway, CloudFront, Route 53, or WAF placed inside Private Subnet
    if (
      (comp.type === 'igw' ||
        comp.type === 'cloudfront' ||
        comp.type === 'route53' ||
        comp.type === 'waf') &&
      comp.subnet === 'private'
    ) {
      violations.push({
        id: `viol-edge-in-priv-${comp.id}`,
        severity: 'error',
        title: `Edge Service Placed Inside Private Subnet`,
        plainEnglishReason: `"${comp.name}" is a public perimeter/edge service, so it cannot operate locked inside the back Private Subnet.`,
        howToFix: `Remove "${comp.name}" and place it in the EDGE / DNS zone or PUBLIC SUBNET.`,
        componentId: comp.id,
        worldX: comp.gridX * 1.4,
        worldZ: comp.gridZ * 1.4,
      });
    }

    // Rule 2e: Unwired / Idle Server & Wasted Compute Spend Detection!
    // Allows user to place extra unwired servers, then flags the idle cloud spend when running traffic
    if (
      comp.type !== 'client' &&
      comp.type !== 'iam' &&
      comp.type !== 'kms' &&
      comp.type !== 'cloudwatch' &&
      comp.type !== 'cloudtrail' &&
      comp.status !== 'error'
    ) {
      const hasWire = state.connections.some(
        (c) => c.fromId === comp.id || c.toId === comp.id
      );
      if (!hasWire && state.components.length > 2) {
        const monthlyWaste = getComponentMonthlyCost(comp);
        violations.push({
          id: `viol-unwired-${comp.id}`,
          severity: 'error',
          title: `Idle Compute Waste: Unwired ${comp.type.toUpperCase()} ($${monthlyWaste}/mo)`,
          plainEnglishReason: `"${comp.name}" is powered on with 0 network wires attached! In AWS, an idle unwired server still bills you $${monthlyWaste}/mo for 0 RPS of useful work.`,
          howToFix: `Use the Wire tool to connect "${comp.name}" into your traffic flow, or use the Delete tool to terminate this idle server and save $${monthlyWaste}/mo.`,
          componentId: comp.id,
          worldX: comp.gridX * 1.4,
          worldZ: comp.gridZ * 1.4,
        });
      }
    }
  });

  // Rule 3: Over-provisioned duplicate servers on single-server beginner levels (e.g., Level 1-5)
  if (levelId <= 5) {
    const healthyEc2s = state.components.filter(
      (c) => c.type === 'ec2' && c.status !== 'error'
    );
    if (healthyEc2s.length > 1) {
      const extraServer = healthyEc2s[healthyEc2s.length - 1];
      const totalEc2Spend = healthyEc2s.reduce((acc, c) => acc + getComponentMonthlyCost(c), 0);
      violations.push({
        id: `viol-overprovisioned-ec2`,
        severity: 'error',
        title: `Over-Provisioned Compute: ${healthyEc2s.length} EC2s Running ($${totalEc2Spend}/mo)`,
        plainEnglishReason: `You launched ${healthyEc2s.length} EC2 servers ($${totalEc2Spend}/mo total) when this workload only needs 1 EC2 server ($15/mo). Provisioning extra servers without a Load Balancer wastes cloud budget!`,
        howToFix: `Use the Delete tool to remove the extra EC2 server(s) so only 1 right-sized EC2 instance remains in the Public Subnet.`,
        componentId: extraServer.id,
        worldX: extraServer.gridX * 1.4,
        worldZ: extraServer.gridZ * 1.4,
      });
    }
  }

  return { updatedConnections, violations };
}

/**
 * Calculates live production telemetry (p99 Latency, RPS Capacity, Monthly Cost, Error Rate)
 * from the active 3D board state.
 */
export function computeLiveTelemetry(
  state: ArchitectureState,
  gameMode: GameMode = 'outage_repair',
  stageNumber: number = 1
): LiveTelemetry {
  // 1. Calculate Monthly Cloud Bill ($/mo)
  let monthlyCostUsd = 0;
  state.components.forEach((c) => {
    monthlyCostUsd += getComponentMonthlyCost(c);
  });

  // 2. Calculate p99 Latency (ms)
  let latencyMs = gameMode === 'latency_tuning' ? 680 : 210 + stageNumber * 95;

  const hasCloudFront = state.components.some((c) => c.type === 'cloudfront');
  const hasRedis = state.components.some((c) => c.type === 'redis' && c.subnet === 'private');
  const hasReadReplica = state.components.some((c) => c.type === 'rds' && c.config.readReplica);
  const hasDynamo = state.components.some((c) => c.type === 'dynamodb');
  const hasAlb = state.components.some((c) => c.type === 'alb');
  const ec2Count = state.components.filter((c) => c.type === 'ec2' && c.status !== 'error').length;
  const hasAsg = state.components.some((c) => c.type === 'asg');

  if (hasCloudFront) latencyMs -= 165;
  if (hasRedis) latencyMs -= 280;
  if (hasReadReplica) latencyMs -= 115;
  if (hasDynamo) latencyMs -= 140;
  if (hasAlb && (ec2Count >= 2 || hasAsg)) latencyMs -= 75;
  if (ec2Count >= 1) latencyMs -= 30;

  latencyMs = Math.max(18, latencyMs);

  // 3. Calculate RPS Capacity & Demand (Only count WIRED compute nodes toward real capacity!)
  const currentRps =
    gameMode === 'traffic_wave' || gameMode === 'rate_limit_triage'
      ? 1200 * stageNumber
      : 450 * stageNumber;

  const wiredEc2Count = state.components.filter(
    (c) =>
      c.type === 'ec2' &&
      c.status !== 'error' &&
      c.subnet !== 'edge' &&
      c.subnet !== 'external' &&
      state.connections.some((conn) => conn.fromId === c.id || conn.toId === c.id)
  ).length;

  let capacityRps = wiredEc2Count * 600;
  if (hasAsg) {
    const maxCap = Number(
      state.components.find((c) => c.type === 'asg')?.config.maxCapacity || 4
    );
    capacityRps += maxCap * 750;
  }
  if (hasAlb) capacityRps += 500;
  if (hasRedis) capacityRps += 1800;
  if (hasCloudFront) capacityRps += 2000;
  if (state.components.some((c) => c.type === 'lambda')) capacityRps += 2500;
  if (state.components.some((c) => c.type === 'sqs')) capacityRps += 1800;
  if (state.components.some((c) => c.type === 'eks' || c.type === 'ecs')) capacityRps += 2400;

  // 4. Rate Limiting & Security Score
  const hasWaf = state.components.some((c) => c.type === 'waf');
  const hasApiGw = state.components.some((c) => c.type === 'apigw');
  const hasSqs = state.components.some((c) => c.type === 'sqs');
  const rateLimitedRequests = hasWaf || hasApiGw || hasSqs ? 1450 : 0;

  let securityScore = 60;
  if (hasWaf) securityScore += 20;
  if (
    state.components.every((c) =>
      c.type === 'rds' || c.type === 'redis' || c.type === 'redshift'
        ? c.subnet === 'private'
        : true
    )
  ) {
    securityScore += 15;
  }
  if (state.components.some((c) => c.type === 'iam' || c.type === 'kms')) {
    securityScore += 10;
  }
  securityScore = Math.min(100, securityScore);

  const hasBlockedWires = state.connections.some((c) => !c.allowed);
  const errorRatePercent =
    state.connections.length === 0
      ? 100
      : hasBlockedWires
      ? 42.5
      : capacityRps < currentRps && !hasApiGw && !hasSqs
      ? 18.4
      : 0;

  return {
    latencyMs,
    targetLatencyMs: gameMode === 'latency_tuning' ? 60 : 120,
    monthlyCostUsd,
    currentRps,
    capacityRps: Math.max(0, capacityRps),
    errorRatePercent,
    securityScore,
    rateLimitedRequests,
  };
}

