/**
 * CloudCraft Real-World Scenario, Storyboard & Multi-Stage Campaign Generator
 * Powers the 7 Gameplay Modes, 3-Panel Visual Comic Storyboards (Problem -> Case Study -> Mission),
 * and 3-Stage Progressive Production Missions with 3-Tier Investigative Hints for Levels 11–60.
 */

import {
  ArchitectureState,
  AWSComponentType,
  GameMode,
  LevelDefinition,
  ProgressiveStage,
  StoryboardSpec,
} from './types';
import { evaluateArchitectureDiagnostics } from './networkPhysics';

export interface GameModeMeta {
  id: GameMode;
  label: string;
  shortBadge: string;
  accentColor: string;
  description: string;
  slaMetricLabel: string;
}

export const GAME_MODE_METAS: Record<GameMode, GameModeMeta> = {
  packet_tracer: {
    id: 'packet_tracer',
    label: 'Packet Tracer Puzzle',
    shortBadge: 'PACKET TRACER',
    accentColor: '#38BDF8',
    description: 'Step hop-by-hop from User Phone -> DNS -> Gateway -> Server and verify every link.',
    slaMetricLabel: 'Hop Verification',
  },
  outage_repair: {
    id: 'outage_repair',
    label: 'Fix Broken Outage',
    shortBadge: 'OUTAGE REPAIR',
    accentColor: '#F59E0B',
    description: 'Diagnose and repair a failing production deployment with 0 network violations.',
    slaMetricLabel: 'System Uptime',
  },
  latency_tuning: {
    id: 'latency_tuning',
    label: 'Latency & SLA Tuning',
    shortBadge: 'LATENCY SLA',
    accentColor: '#10B981',
    description: 'Slash p99 response time below the target SLA using Redis caching, CDN, and Read Replicas.',
    slaMetricLabel: 'p99 Latency',
  },
  rate_limit_triage: {
    id: 'rate_limit_triage',
    label: 'Rate-Limit & Incident Triage',
    shortBadge: 'RATE LIMIT 429',
    accentColor: '#A855F7',
    description: 'Tame HTTP 429 burst spikes and noisy neighbors with API Gateway, WAF, and SQS queues.',
    slaMetricLabel: 'Burst Protection',
  },
  traffic_wave: {
    id: 'traffic_wave',
    label: 'Traffic Wave Survival',
    shortBadge: 'TRAFFIC WAVE',
    accentColor: '#F97316',
    description: 'Scale out compute capacity with Load Balancers and Auto Scaling to survive surging RPS.',
    slaMetricLabel: 'RPS Capacity',
  },
  security_defense: {
    id: 'security_defense',
    label: 'Security Breach Defense',
    shortBadge: 'SECURITY SHIELD',
    accentColor: '#EF4444',
    description: 'Isolate databases in Private Subnets and block SQLi/hacker probes with WAF & Firewalls.',
    slaMetricLabel: 'Security Score',
  },
  cost_slasher: {
    id: 'cost_slasher',
    label: 'Cost Slasher Challenge',
    shortBadge: 'COST SLASHER',
    accentColor: '#EAB308',
    description: 'Right-size bloated infrastructure and use serverless/S3 to cut the monthly AWS bill.',
    slaMetricLabel: 'Monthly Bill',
  },
};

/**
 * Determines which of the 7 gameplay modes best fits a level based on its chapter and concepts.
 */
export function getGameModeForLevel(level: LevelDefinition): GameMode {
  if (level.gameMode) return level.gameMode;
  const id = level.id;
  if (id === 1 || id === 3 || id === 9 || id === 36 || id === 37) return 'packet_tracer';
  if (id === 4 || id === 6 || id === 8 || (id >= 26 && id <= 30)) return 'security_defense';
  if (id === 5 || id === 11 || id === 12 || id === 14) return 'outage_repair';
  if (id >= 16 && id <= 20) return 'traffic_wave';
  if (id >= 21 && id <= 25) return 'latency_tuning';
  if (id >= 31 && id <= 35) return 'rate_limit_triage';
  if (id >= 38 && id <= 40) return 'latency_tuning';
  if (id >= 51 && id <= 55) return 'cost_slasher';
  const cycle: GameMode[] = [
    'outage_repair',
    'latency_tuning',
    'rate_limit_triage',
    'traffic_wave',
    'security_defense',
    'cost_slasher',
    'packet_tracer',
  ];
  return cycle[id % cycle.length];
}

/**
 * Generates a 3-Panel Visual Comic Storyboard (Problem -> Real-World Case Study -> Your Mission)
 * for any level so the user learns through real-world engineering stories with minimal text.
 */
export function buildStoryboardForLevel(level: LevelDefinition, mode: GameMode): StoryboardSpec {
  if (level.storyboard) return level.storyboard;

  // Tailored storyboards for early foundational levels & key modes
  if (level.id === 1) {
    return {
      realWorldCompany: 'WhatsApp & Web Apps',
      realWorldUseCase: 'How a tap on your phone reaches a cloud server over Port 80',
      panels: [
        {
          badge: '1. THE REAL-WORLD FLOW',
          title: 'You Tap a Link on Your Phone',
          caption: 'Your phone sends an HTTP packet across the internet looking for Port 80 on the destination server.',
          visualType: 'phone_dns_server',
          nodes: [
            { type: 'client', label: 'User Phone', metric: 'HTTP GET /', status: 'ok' },
            { type: 'ec2', label: 'EC2 Server :80', metric: '200 OK', status: 'ok' },
          ],
        },
        {
          badge: '2. HOW CLOUD SERVERS WORK',
          title: 'Amazon EC2 Listens on Port 80',
          caption: 'An EC2 instance is a virtual Linux computer in an AWS data center with Port 80 open in its Security Group.',
          visualType: 'phone_dns_server',
          nodes: [
            { type: 'client', label: 'Browser', metric: 'Port 80', status: 'ok' },
            { type: 'ec2', label: 'Amazon EC2', metric: 'Firewall ALLOW', status: 'ok' },
          ],
        },
        {
          badge: '3. YOUR MISSION',
          title: 'Inspect the Server & Trace the Packet',
          caption: 'Click the orange EC2 server on the 3D board to view its Port 80 rule, then run your first live traffic test.',
          visualType: 'phone_dns_server',
          nodes: [
            { type: 'client', label: 'Users', status: 'ok' },
            { type: 'ec2', label: 'Inspect & Test', metric: 'Ready', status: 'ok' },
          ],
        },
      ],
    };
  }

  if (level.id === 6 || mode === 'security_defense') {
    return {
      realWorldCompany: 'Stripe & Banking Clouds',
      realWorldUseCase: 'Why Private Subnets reject direct traffic from the public internet',
      panels: [
        {
          badge: '1. THE PROBLEM',
          title: 'Hackers Scan Every Public IP Address',
          caption: 'If you place a database or internal server on a public route, bots probe it within 30 seconds.',
          visualType: 'subnet_wall',
          nodes: [
            { type: 'client', label: 'Public Internet', metric: 'Direct Wire', status: 'fail' },
            { type: 'rds', label: 'Private Zone', metric: 'BLOCKED!', status: 'fail' },
          ],
        },
        {
          badge: '2. REAL-WORLD SOLUTION',
          title: 'Public Lobby vs. Locked Private Vault',
          caption: 'Stripe puts web gateways in the Public Subnet (10.0.1.x) and locks databases inside the Private Subnet (10.0.2.x).',
          visualType: 'stripe_security_waf',
          nodes: [
            { type: 'client', label: 'Users', status: 'ok' },
            { type: 'waf', label: 'WAF / Public', metric: 'Filtered', status: 'ok' },
            { type: 'ec2', label: 'Public Web', status: 'ok' },
            { type: 'rds', label: 'Private Vault', metric: 'Isolated', status: 'ok' },
          ],
        },
        {
          badge: '3. YOUR MISSION',
          title: level.title,
          caption: 'Place public entry servers in the Public Subnet, keep databases in the Private Subnet, and block illegal direct routes.',
          visualType: 'subnet_wall',
          nodes: [
            { type: 'client', label: 'Internet', status: 'ok' },
            { type: 'ec2', label: 'Public Subnet', metric: '10.0.1.x', status: 'ok' },
            { type: 'rds', label: 'Private Subnet', metric: '10.0.2.x', status: 'ok' },
          ],
        },
      ],
    };
  }

  if (mode === 'latency_tuning') {
    return {
      realWorldCompany: 'Instagram & Netflix',
      realWorldUseCase: 'How Instagram updates millions of post likes in < 15ms without melting PostgreSQL',
      panels: [
        {
          badge: '1. THE PROBLEM',
          title: 'Disk Databases Choke on Viral Reads',
          caption: 'When a celebrity posts a photo, 2 million users tap "Like". Querying RDS disk on every tap spikes latency to 680ms!',
          visualType: 'instagram_redis_likes',
          nodes: [
            { type: 'client', label: '2M Users', metric: 'Flood', status: 'warn' },
            { type: 'ec2', label: 'App Tier', status: 'warn' },
            { type: 'rds', label: 'RDS Disk DB', metric: '680ms Slow!', status: 'fail' },
          ],
        },
        {
          badge: '2. HOW INSTAGRAM SOLVES IT',
          title: 'ElastiCache Redis + CloudFront Edge',
          caption: 'Instagram caches hot like counters in RAM with Redis (0.8ms lookup) and serves photos from CloudFront Edge servers.',
          visualType: 'instagram_redis_likes',
          nodes: [
            { type: 'cloudfront', label: 'CloudFront CDN', metric: '12ms', status: 'ok' },
            { type: 'ec2', label: 'EC2 API', status: 'ok' },
            { type: 'redis', label: 'Redis Cache', metric: '0.8ms RAM', status: 'ok' },
            { type: 'rds', label: 'RDS Primary', metric: 'Protected', status: 'ok' },
          ],
        },
        {
          badge: '3. YOUR MISSION',
          title: `${level.title} (Slash Latency < 60ms)`,
          caption: 'Build the baseline architecture, then add Redis in-memory caching and edge delivery to bring p99 latency into the green.',
          visualType: 'instagram_redis_likes',
          nodes: [
            { type: 'ec2', label: 'Compute', status: 'ok' },
            { type: 'redis', label: 'Add Redis', metric: '< 60ms SLA', status: 'ok' },
            { type: 'rds', label: 'Database', status: 'ok' },
          ],
        },
      ],
    };
  }

  if (mode === 'rate_limit_triage') {
    return {
      realWorldCompany: 'Shopify & Ticketmaster',
      realWorldUseCase: 'Surviving sneaker-drop bot floods with HTTP 429 Rate Limiting & SQS Queues',
      panels: [
        {
          badge: '1. THE PROBLEM',
          title: '50,000 Bots Hammer Checkout at 10:00:00 AM',
          caption: 'Without rate limits or queue buffering, sudden traffic spikes exhaust database connections and crash the whole site.',
          visualType: 'flash_sale_ratelimit',
          nodes: [
            { type: 'client', label: 'Bot Burst', metric: '5,000 RPS', status: 'fail' },
            { type: 'ec2', label: 'API Server', metric: '503 Crash!', status: 'fail' },
          ],
        },
        {
          badge: '2. HOW SHOPIFY SOLVES IT',
          title: 'API Gateway Rate Limits + SQS Queue Buffer',
          caption: 'API Gateway & WAF throttle abusive IPs (HTTP 429), while Amazon SQS lines up valid orders in a smooth waiting queue.',
          visualType: 'flash_sale_ratelimit',
          nodes: [
            { type: 'apigw', label: 'API Gateway', metric: '429 Throttle', status: 'ok' },
            { type: 'sqs', label: 'SQS Queue', metric: 'Buffered', status: 'ok' },
            { type: 'lambda', label: 'Workers', metric: 'Smooth', status: 'ok' },
          ],
        },
        {
          badge: '3. YOUR MISSION',
          title: level.title,
          caption: 'Deploy the service, absorb burst traffic with queues/rate-limiting, and keep error rates at 0.0%.',
          visualType: 'flash_sale_ratelimit',
          nodes: [
            { type: 'apigw', label: 'Rate Limit', status: 'ok' },
            { type: 'sqs', label: 'Queue Buffer', status: 'ok' },
            { type: 'dynamodb', label: 'Fast Store', status: 'ok' },
          ],
        },
      ],
    };
  }

  if (mode === 'traffic_wave') {
    return {
      realWorldCompany: 'Hotstar & Twitch Live',
      realWorldUseCase: 'Handling 10x concurrent viewer surges with ALB & Auto Scaling',
      panels: [
        {
          badge: '1. THE PROBLEM',
          title: 'Single Server Melts When Traffic Triples',
          caption: 'One EC2 server can handle ~600 req/s. When a live event goes viral, CPU hits 100% and requests drop.',
          visualType: 'ha_load_balancer',
          nodes: [
            { type: 'client', label: 'Viral Surge', metric: '2,400 RPS', status: 'warn' },
            { type: 'ec2', label: 'Single EC2', metric: 'CPU 100%!', status: 'fail' },
          ],
        },
        {
          badge: '2. HOW TWITCH SOLVES IT',
          title: 'Application Load Balancer + Auto Scaling Fleet',
          caption: 'An ALB splits incoming requests evenly across multiple EC2 servers and Auto Scaling clones new nodes automatically.',
          visualType: 'ha_load_balancer',
          nodes: [
            { type: 'alb', label: 'Load Balancer', metric: 'Split 50/50', status: 'ok' },
            { type: 'asg', label: 'Auto Scaling', metric: '2 -> 8 Nodes', status: 'ok' },
          ],
        },
        {
          badge: '3. YOUR MISSION',
          title: level.title,
          caption: 'Eliminate single points of failure and scale out compute capacity to survive all 3 traffic waves.',
          visualType: 'ha_load_balancer',
          nodes: [
            { type: 'client', label: 'Users', status: 'ok' },
            { type: 'alb', label: 'ALB', status: 'ok' },
            { type: 'ec2', label: 'Multi-AZ Fleet', status: 'ok' },
          ],
        },
      ],
    };
  }

  if (mode === 'cost_slasher') {
    return {
      realWorldCompany: 'Cloud FinOps Teams',
      realWorldUseCase: 'Slashing a runaway monthly AWS bill by 65% without losing a single request',
      panels: [
        {
          badge: '1. THE PROBLEM',
          title: 'Idle Oversized Servers Burn Cash 24/7',
          caption: 'Running giant EC2 servers and duplicate gateways for static files wastes thousands of dollars every month.',
          visualType: 'cost_bloat_slasher',
          nodes: [
            { type: 'ec2', label: 'Oversized EC2', metric: '$420/mo', status: 'fail' },
            { type: 'rds', label: 'Idle Replicas', metric: '$380/mo', status: 'warn' },
          ],
        },
        {
          badge: '2. THE FINOPS SOLUTION',
          title: 'Right-Size Compute & Offload Static Files to S3',
          caption: 'Serving static assets from S3 ($5/mo) + CloudFront and right-sizing instances cuts bills dramatically.',
          visualType: 'cost_bloat_slasher',
          nodes: [
            { type: 'cloudfront', label: 'CloudFront', metric: '$15/mo', status: 'ok' },
            { type: 's3', label: 'S3 Storage', metric: '$5/mo', status: 'ok' },
            { type: 'lambda', label: 'Serverless', metric: '$8/mo', status: 'ok' },
          ],
        },
        {
          badge: '3. YOUR MISSION',
          title: level.title,
          caption: 'Complete the architecture while keeping your monthly cloud bill within budget and 100% healthy.',
          visualType: 'cost_bloat_slasher',
          nodes: [
            { type: 'ec2', label: 'Right-Size', status: 'ok' },
            { type: 's3', label: 'S3 Tier', status: 'ok' },
            { type: 'cloudwatch', label: 'Cost SLA', status: 'ok' },
          ],
        },
      ],
    };
  }

  // Default Outage Repair / Packet Tracer Storyboard
  return {
    realWorldCompany: 'Production SRE On-Call',
    realWorldUseCase: `Real-World Cloud Architecture: ${level.concepts.slice(0, 2).join(' & ')}`,
    panels: [
      {
        badge: '1. THE PRODUCTION INCIDENT',
        title: 'Users Cannot Reach the Service',
        caption: level.briefing,
        visualType: 'phone_dns_server',
        nodes: [
          { type: 'client', label: 'Users', metric: 'Request', status: 'warn' },
          { type: level.allowedPalette[0] || 'ec2', label: 'Missing Hop', metric: 'Offline', status: 'fail' },
        ],
      },
      {
        badge: '2. HOW AWS ARCHITECTS SOLVE IT',
        title: `Using ${level.concepts[0] || 'AWS Core Services'}`,
        caption:
          level.docTips[0] ||
          'Route external traffic through the Edge/Public tier and isolate backend data inside the Private Subnet.',
        visualType: 'subnet_wall',
        nodes: [
          { type: 'client', label: 'Users', status: 'ok' },
          { type: level.allowedPalette[0] || 'igw', label: 'Public / Edge', status: 'ok' },
          { type: level.allowedPalette[1] || 'ec2', label: 'Backend Tier', status: 'ok' },
        ],
      },
      {
        badge: '3. YOUR MULTI-STAGE MISSION',
        title: level.title,
        caption: 'Solve the initial outage, then adapt as live production traffic, latency, and security challenges unfold.',
        visualType: 'ha_load_balancer',
        nodes: [
          { type: 'client', label: 'Stage 1: Route', status: 'ok' },
          { type: 'redis', label: 'Stage 2: Speed', status: 'ok' },
          { type: 'waf', label: 'Stage 3: Harden', status: 'ok' },
        ],
      },
    ],
  };
}

// Helper: checks if two component types are wired together on the board
function isConnected(state: ArchitectureState, typeA: string, typeB: string): boolean {
  return state.connections.some((conn) => {
    if (!conn.allowed) return false;
    const fromComp = state.components.find((c) => c.id === conn.fromId);
    const toComp = state.components.find((c) => c.id === conn.toId);
    if (!fromComp || !toComp) return false;
    return (
      (fromComp.type === typeA && toComp.type === typeB) ||
      (fromComp.type === typeB && toComp.type === typeA)
    );
  });
}

function isConnectedToAny(state: ArchitectureState, targetType: string): boolean {
  return state.connections.some((conn) => {
    if (!conn.allowed) return false;
    const fromComp = state.components.find((c) => c.id === conn.fromId);
    const toComp = state.components.find((c) => c.id === conn.toId);
    return fromComp?.type === targetType || toComp?.type === targetType;
  });
}

/**
 * Builds a deep 3-Stage Progressive Mission for any Campaign Level (Levels 11–60).
 * Stage 1: Core Architecture Setup & Valid Subnet Routing
 * Stage 2: Live Latency / Caching / Throughput Bottleneck (unlocks Redis / CloudFront / Read Replica)
 * Stage 3: Production Hardening — Rate-Limiting / Security / Multi-AZ Resilience (unlocks WAF / API GW / ALB)
 */
export function buildProgressiveStagesForLevel(
  level: LevelDefinition,
  mode: GameMode
): ProgressiveStage[] {
  // Tutorials (Levels 1-10) stay single-stage so beginners master the basics smoothly
  if (level.id <= 10) {
    return [
      {
        stageNumber: 1,
        title: 'Foundational Mission',
        incidentAlert: level.briefing,
        objectiveSummary: level.tagline,
        unlockedPalette: level.allowedPalette,
        hints: [
          level.requirements[0]?.hint || 'Follow the glowing target ring and coach banner.',
          level.docTips[0] || 'Check the subnet zones along the front of the 3D board.',
          level.taskDescription.replace(/\n/g, ' '),
        ],
        requirements: level.requirements,
      },
    ];
  }

  const basePalette = Array.from(new Set<AWSComponentType>([...level.allowedPalette]));
  const stage2Palette = Array.from(
    new Set<AWSComponentType>([...basePalette, 'redis', 'cloudfront'])
  );
  const stage3Palette = Array.from(
    new Set<AWSComponentType>([...stage2Palette, 'waf', 'apigw', 'sqs'])
  );

  // STAGE 1: Baseline Architecture (with strict network physics enforcement)
  const stage1: ProgressiveStage = {
    stageNumber: 1,
    title: 'Stage 1/3 · Initial Deployment & Routing',
    incidentAlert: `INCIDENT BRIEF: ${level.briefing}`,
    objectiveSummary: `Establish the baseline ${level.concepts.slice(0, 2).join(' + ')} architecture with zero subnet or firewall violations.`,
    unlockedPalette: basePalette,
    hints: [
      `Symptom Clue: Inspect the current board state—traffic from Internet Users cannot complete the journey because key ${level.concepts[0] || 'cloud'} components or wires are missing.`,
      `Architecture Concept: ${level.docTips[0] || 'Public entry points belong in the Edge/Public zone, while databases belong in the Private Subnet.'}`,
      `Exact Blueprint: ${level.requirements.map((r) => r.hint).join(' Then: ')}`,
    ],
    requirements: [
      ...level.requirements,
      {
        id: `lvl-${level.id}-st1-physics`,
        label: 'Zero AWS subnet or firewall physics violations on the board',
        hint: 'Ensure Internet Users never wire directly into the Private Subnet and all required firewall ports are open.',
        check: (s) =>
          evaluateArchitectureDiagnostics(s, level.id).violations.filter(
            (v) => v.severity === 'error'
          ).length === 0,
      },
    ],
  };

  // STAGE 2: Latency & Read Bottleneck Crisis (Unlocks Redis & CloudFront)
  const stage2: ProgressiveStage = {
    stageNumber: 2,
    title: 'Stage 2/3 · Latency Spike & Cache Acceleration',
    incidentAlert:
      'LIVE TRAFFIC SURGE: Your Stage 1 deployment is online, but viral traffic just drove p99 Latency to 640ms! Repeated reads are hammering your backend. Slash p99 latency under 85ms!',
    objectiveSummary:
      'Accelerate read performance by adding an in-memory Redis Cache (in Private Subnet) or CloudFront Edge CDN.',
    unlockedPalette: stage2Palette,
    targetSla: { maxLatencyMs: 85 },
    hints: [
      'Symptom Clue: Look at the live p99 Latency meter—repeated requests are querying slow backend storage on every single page load.',
      'Architecture Concept: Tech giants like Instagram and Netflix place an in-memory cache (ElastiCache Redis) in the Private Subnet or a CDN (CloudFront) at the Edge to serve hot data in < 2ms.',
      'Exact Blueprint: Select "+ Redis" from the dock, place it inside the PRIVATE SUBNET (right-hand indigo zone), and wire your compute tier (EC2 / Lambda / EKS) to Redis (or wire CloudFront CDN in the Edge zone).',
    ],
    requirements: [
      ...stage1.requirements,
      {
        id: `lvl-${level.id}-st2-cache`,
        label: 'Slash p99 Latency: Deploy & wire Redis Cache (Private Subnet) or CloudFront CDN (Edge)',
        hint: 'Place ElastiCache Redis in the Private Subnet and wire it to your compute node, OR place CloudFront CDN in the Edge zone and wire it.',
        check: (s) => {
          const hasValidRedis =
            s.components.some((c) => c.type === 'redis' && c.subnet === 'private') &&
            isConnectedToAny(s, 'redis');
          const hasValidCdn =
            s.components.some(
              (c) => c.type === 'cloudfront' && (c.subnet === 'edge' || c.subnet === 'public')
            ) && isConnectedToAny(s, 'cloudfront');
          const hasReadReplica = s.components.some(
            (c) => c.type === 'rds' && c.config.readReplica && c.subnet === 'private'
          );
          return (
            (hasValidRedis || hasValidCdn || hasReadReplica) &&
            evaluateArchitectureDiagnostics(s, level.id).violations.filter(
              (v) => v.severity === 'error'
            ).length === 0
          );
        },
      },
    ],
  };

  // STAGE 3: Production Hardening — Rate-Limiting (HTTP 429) & Perimeter Security (Unlocks WAF, API Gateway, SQS)
  const stage3: ProgressiveStage = {
    stageNumber: 3,
    title: 'Stage 3/3 · Rate-Limit & Security Hardening',
    incidentAlert:
      mode === 'cost_slasher'
        ? 'FINOPS & HARDENING AUDIT: Scraper bots are hammering your public endpoints with 3,800 req/s bursts! Add edge rate-limiting (AWS WAF or API Gateway) while keeping your network 100% compliant.'
        : 'BOTNET & RATE-LIMIT ALERT (HTTP 429): Aggressive scraper bots and burst traffic are flooding your entry point! Add AWS WAF, API Gateway rate limiting, or SQS queue buffering to protect production.',
    objectiveSummary:
      'Protect production from burst overload and attacks by wiring AWS WAF, API Gateway, or SQS into your architecture.',
    unlockedPalette: stage3Palette,
    targetSla: { maxLatencyMs: 85, requiredSecurityScore: 80 },
    hints: [
      'Symptom Clue: Unthrottled bot bursts and SQL injection probes are hitting your public entry tier without rate-limiting or perimeter filtering.',
      'Architecture Concept: In production AWS, you never expose raw compute without perimeter rate-limiting (AWS WAF / API Gateway returning HTTP 429) or asynchronous queue buffering (Amazon SQS).',
      'Exact Blueprint: Select "+ WAF", "+ API GW", or "+ SQS" from the bottom dock, place it in the Edge/Public zone, and wire it into your active traffic path with zero subnet violations.',
    ],
    requirements: [
      ...stage2.requirements,
      {
        id: `lvl-${level.id}-st3-hardening`,
        label: 'Harden Production: Deploy & wire AWS WAF, API Gateway, or SQS Queue for rate-limit & attack protection',
        hint: 'Place AWS WAF or API Gateway in the Edge/Public zone and connect a wire to your public entry point (or wire SQS Queue to buffer backend load).',
        check: (s) => {
          const hasWaf =
            s.components.some((c) => c.type === 'waf' && c.subnet !== 'private') &&
            isConnectedToAny(s, 'waf');
          const hasApiGw =
            s.components.some((c) => c.type === 'apigw' && c.subnet !== 'private') &&
            isConnectedToAny(s, 'apigw');
          const hasSqs =
            s.components.some((c) => c.type === 'sqs') && isConnectedToAny(s, 'sqs');
          return (
            (hasWaf || hasApiGw || hasSqs) &&
            evaluateArchitectureDiagnostics(s, level.id).violations.filter(
              (v) => v.severity === 'error'
            ).length === 0
          );
        },
      },
    ],
  };

  return [stage1, stage2, stage3];
}
