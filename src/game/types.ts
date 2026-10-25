/**
 * CloudCraft: DevOps AWS 3D Voxel Architect
 * Core Type Definitions (7 Gameplay Modes, Multi-Stage Missions, Storyboards & Physics)
 */

export type AWSComponentType =
  | 'client'
  | 'route53'
  | 'cloudfront'
  | 'igw'
  | 'waf'
  | 'apigw'
  | 'nat_gw'
  | 'alb'
  | 'ec2'
  | 'asg'
  | 'ecs'
  | 'eks'
  | 'beanstalk'
  | 'lambda'
  | 's3'
  | 'ebs'
  | 'efs'
  | 'rds'
  | 'dynamodb'
  | 'redis'
  | 'redshift'
  | 'kinesis'
  | 'sagemaker'
  | 'sqs'
  | 'sns'
  | 'iam'
  | 'kms'
  | 'cloudwatch'
  | 'cloudtrail'
  | 'dms'
  | 'tgw';

export type SubnetType = 'public' | 'private' | 'isolated' | 'edge' | 'external';
export type AvailabilityZone = 'us-east-1a' | 'us-east-1b' | 'global';

export type GameMode =
  | 'packet_tracer'
  | 'outage_repair'
  | 'latency_tuning'
  | 'rate_limit_triage'
  | 'traffic_wave'
  | 'security_defense'
  | 'cost_slasher';

export interface SecurityGroupRule {
  protocol: 'tcp' | 'udp' | 'all';
  port: number | string;
  source: string;
  description?: string;
}

export interface ComponentConfig {
  cidr?: string;
  port?: number;
  instanceType?: string;
  multiAZ?: boolean;
  encrypted?: boolean;
  iamRole?: string;
  securityGroupInbound?: SecurityGroupRule[];
  securityGroupOutbound?: SecurityGroupRule[];
  routeTableTarget?: 'igw' | 'nat_gw' | 'local' | 'tgw';
  targetGroupHealthCheck?: boolean;
  minCapacity?: number;
  maxCapacity?: number;
  readReplica?: boolean;
  cached?: boolean;
  corsEnabled?: boolean;
  versioning?: boolean;
  blockPublicAccess?: boolean;
  originAccessControl?: boolean;
  ttlSeconds?: number;
  routingPolicy?: 'simple' | 'latency' | 'failover' | 'geolocation';
  alarmThreshold?: number;
  rateLimitRps?: number;
  burstLimit?: number;
  evictionPolicy?: 'allkeys-lru' | 'volatile-ttl' | 'noeviction';
  [key: string]: any;
}

export interface VoxelBlock {
  id: string;
  type: AWSComponentType;
  name: string;
  gridX: number;
  gridZ: number;
  subnet: SubnetType;
  az: AvailabilityZone;
  config: ComponentConfig;
  status: 'healthy' | 'warning' | 'error' | 'deploying';
  statusMessage?: string;
  /** Prevents accidental deletion of essential pre-placed baseline blocks */
  locked?: boolean;
  /** Marks a block as a broken/redundant node meant to be deleted */
  deletable?: boolean;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  port: number;
  protocol: string;
  allowed: boolean;
  label?: string;
  failureReason?: string;
}

export interface TrafficPacket {
  id: string;
  fromId: string;
  toId: string;
  progress: number;
  status: 'transmitting' | 'success' | 'dropped';
  color: string;
  payloadType: string;
  dropReason?: string;
  stopAtProgress?: number;
}

export interface Requirement {
  id: string;
  label: string;
  hint: string;
  check: (state: ArchitectureState) => boolean;
}

export interface TargetPlacement {
  type: AWSComponentType;
  gridX: number;
  gridZ: number;
  label: string;
}

export interface ConceptCard {
  title: string;
  summary: string;
  analogy: string;
  keyTakeaway: string;
}

export interface StoryboardPanel {
  badge: string;
  title: string;
  caption: string;
  speechBubble?: string;
  visualType:
    | 'phone_dns_server'
    | 'subnet_wall'
    | 'instagram_redis_likes'
    | 'netflix_cdn_edge'
    | 'flash_sale_ratelimit'
    | 'stripe_security_waf'
    | 'cost_bloat_slasher'
    | 'ha_load_balancer';
  nodes: { type: AWSComponentType; label: string; metric?: string; status?: 'ok' | 'warn' | 'fail' }[];
}

export interface StoryboardSpec {
  realWorldCompany: string;
  realWorldUseCase: string;
  panels: [StoryboardPanel, StoryboardPanel, StoryboardPanel];
}

export interface ProgressiveStage {
  stageNumber: number;
  title: string;
  incidentAlert: string;
  objectiveSummary: string;
  unlockedPalette: AWSComponentType[];
  targetSla?: {
    maxLatencyMs?: number;
    maxCostPerMonth?: number;
    minRpsCapacity?: number;
    requiredSecurityScore?: number;
  };
  /** 3 progressive hints: [1. Symptom Clue, 2. Architecture Concept, 3. Exact Blueprint Step] */
  hints: [string, string, string];
  requirements: Requirement[];
}

export interface CoachStep {
  id: string;
  text: string;
  targetButton?: string;
  completed: (
    state: ArchitectureState,
    selectedId: string | null,
    activeTool: string,
    placingType: AWSComponentType | null
  ) => boolean;
}

export interface ArchitectureState {
  components: VoxelBlock[];
  connections: Connection[];
}

export interface NetworkViolation {
  id: string;
  severity: 'error' | 'warning';
  title: string;
  plainEnglishReason: string;
  howToFix: string;
  componentId?: string;
  connectionId?: string;
  worldX?: number;
  worldZ?: number;
}

export interface LiveTelemetry {
  latencyMs: number;
  targetLatencyMs: number;
  monthlyCostUsd: number;
  budgetLimitUsd?: number;
  currentRps: number;
  capacityRps: number;
  errorRatePercent: number;
  securityScore: number;
  rateLimitedRequests: number;
}

export interface LevelDefinition {
  id: number;
  chapterId: number;
  chapterTitle: string;
  title: string;
  tagline: string;
  difficulty: 'Novice' | 'Intermediate' | 'Advanced' | 'Master';
  isAssessment?: boolean;
  gameMode?: GameMode;
  concepts: string[];
  briefing: string;
  taskDescription: string;
  requirements: Requirement[];
  initialState: ArchitectureState;
  allowedPalette: AWSComponentType[];
  iacSnippet?: string;
  docTips: string[];
  optimalComponentCount?: number;
  maxBudgetUsd?: number;
  targetPlacements?: TargetPlacement[];
  conceptCard?: ConceptCard;
  storyboard?: StoryboardSpec;
  stages?: ProgressiveStage[];
  inspectorMode?: 'basic' | 'intermediate' | 'full';
  coachSteps?: CoachStep[];
}

export interface LevelProgress {
  completed: boolean;
  stars: number;
  bestTimeSeconds?: number;
}

export interface GameProgress {
  unlockedLevel: number;
  starsTotal: number;
  xp: number;
  levels: Record<number, LevelProgress>;
}

export interface ComponentMeta {
  type: AWSComponentType;
  name: string;
  shortLabel: string;
  awsServiceCode?: string;
  monthlyCostUsd?: number;
  category:
    | 'Networking'
    | 'Compute'
    | 'Database'
    | 'Storage'
    | 'Security'
    | 'Serverless'
    | 'Operations';
  color: string;
  accentColor: string;
  description: string;
  plainEnglishTip: string;
  defaultConfig: ComponentConfig;
}
