/**
 * CloudCraft core engine types.
 *
 * The engine is the single source of truth for every game rule. Everything in `src/engine/`
 * is pure TypeScript: no React, Three.js, DOM, or audio. The UI and the 3D renderer only call it.
 *
 * Stored state is kept minimal. Anything that can be derived (zone, AZ, link legality, health,
 * telemetry) is computed by `analyzeBoard()` and never persisted, so it can never go stale.
 */

export type ServiceType =
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

/** Board zones, left to right. `external` is the open internet. */
export type Zone = 'external' | 'edge' | 'public' | 'private';
export type AvailabilityZone = 'us-east-1a' | 'us-east-1b' | 'global';

/**
 * Where a service sits in a request's journey. Wires are undirected on the board; the engine
 * orients every wire from the lower tier to the higher one.
 */
export type Tier =
  | 'internet' // 0 – the users
  | 'edge' //     1 – DNS, CDN, WAF, API front doors, gateways
  | 'entry' //    2 – load balancers
  | 'compute' //  3 – servers, containers, functions
  | 'async' //    4 – queues, topics, streams
  | 'data' //     5 – databases, caches, storage
  | 'egress' //   side-channel: outbound-only (NAT)
  | 'control'; // side-channel: governance (IAM, KMS, CloudWatch, CloudTrail)

export type Category =
  | 'Networking'
  | 'Compute'
  | 'Database'
  | 'Storage'
  | 'Security'
  | 'Serverless'
  | 'Operations';

export interface FirewallRule {
  protocol: 'tcp' | 'udp' | 'all';
  /** A single port, a range like "1024-2048", or "all". */
  port: number | string;
  /** CIDR such as "0.0.0.0/0", "10.0.0.0/16", or the alias "vpc". */
  source: string;
  description?: string;
}

export interface BlockConfig {
  port?: number;
  instanceType?: string;
  multiAZ?: boolean;
  encrypted?: boolean;
  iamRole?: string;
  /** Inbound security group. `undefined` = not modelled (open); `[]` = closed to everything. */
  securityGroupInbound?: FirewallRule[];
  minCapacity?: number;
  maxCapacity?: number;
  readReplica?: boolean;
  versioning?: boolean;
  blockPublicAccess?: boolean;
  corsEnabled?: boolean;
  originAccessControl?: boolean;
  ttlSeconds?: number;
  routingPolicy?: 'simple' | 'weighted' | 'latency' | 'failover' | 'geolocation';
  /** ECS: how many copies of the task the service keeps running. */
  desiredCount?: number;
  alarmThreshold?: number;
  rateLimitRps?: number;
  burstLimit?: number;
  [key: string]: unknown;
}

/** A block on the board. Zone and AZ are derived from its grid position, never stored. */
export interface Block {
  id: string;
  type: ServiceType;
  name: string;
  gridX: number;
  gridZ: number;
  config: BlockConfig;
  /** Pre-placed scenario blocks the player may not delete. */
  locked?: boolean;
  /** Scenario fault injected by the level author. */
  fault?: 'crashed';
}

/** A wire on the board. Direction, port, and legality are derived by the engine. */
export interface Wire {
  id: string;
  a: string;
  b: string;
  locked?: boolean;
}

export interface Board {
  blocks: Block[];
  wires: Wire[];
}

// ---------------------------------------------------------------------------
// Analysis output
// ---------------------------------------------------------------------------

export type LinkKind = 'request' | 'egress' | 'governance' | 'attachment';

export interface LinkResult {
  wireId: string;
  /** Upstream end (where requests come from). */
  fromId: string;
  /** Downstream end (where requests go). */
  toId: string;
  kind: LinkKind;
  port: number;
  allowed: boolean;
  /** Present when `allowed` is false. */
  violationCode?: ViolationCode;
}

export type ViolationCode =
  | 'zone.invalid'
  | 'zone.db_exposed'
  | 'link.unknown_block'
  | 'link.self'
  | 'link.internet_to_private'
  | 'link.internet_to_data'
  | 'link.edge_to_private'
  | 'link.tier_skip'
  | 'link.data_to_data'
  | 'link.unsupported'
  | 'link.crashed'
  | 'link.ebs_multi_attach'
  | 'link.ebs_cross_az'
  | 'dns.failed_over'
  | 'firewall.closed'
  | 'firewall.port'
  | 'firewall.source'
  | 'finops.idle'
  | 'finops.over_limit'
  | 'flow.unreachable'
  | 'flow.nat_inbound'
  | 'security.open_admin_port'
  | 'security.unencrypted'
  | 'security.public_bucket';

export type Severity = 'error' | 'warning';

export interface Violation {
  id: string;
  code: ViolationCode;
  severity: Severity;
  title: string;
  reason: string;
  fix: string;
  blockId?: string;
  wireId?: string;
}

export type Health = 'healthy' | 'down' | 'unreachable' | 'overloaded' | 'idle';

export interface Hop {
  wireId: string;
  fromId: string;
  toId: string;
  ok: boolean;
  /** Why the packet stopped here, when `ok` is false. */
  dropReason?: string;
  /** The rule that stopped the packet, when `ok` is false. */
  dropCode?: ViolationCode;
  latencyMs: number;
}

export interface TrafficPath {
  hops: Hop[];
  ok: boolean;
  latencyMs: number;
}

export interface TrafficTrace {
  paths: TrafficPath[];
  /** Blocks that at least one successful request reached. */
  reached: string[];
  /** Blocks reached while the user is still waiting: everything before a queue or stream. */
  syncReached: string[];
  /** True when at least one request completed end to end. */
  served: boolean;
}

export interface LoadProfile {
  /** Legitimate user requests per second. */
  rps: number;
  /** Bot / abusive requests per second that a WAF or API Gateway can filter. */
  botRps?: number;
}

export interface SecurityFinding {
  points: number;
  reason: string;
  blockId?: string;
}

export interface Telemetry {
  latencyMs: number;
  capacityRps: number;
  demandRps: number;
  errorRatePercent: number;
  monthlyCostUsd: number;
  securityScore: number;
  securityFindings: SecurityFinding[];
}

export interface BoardAnalysis {
  zones: Record<string, Zone>;
  azs: Record<string, AvailabilityZone>;
  links: LinkResult[];
  violations: Violation[];
  trace: TrafficTrace;
  telemetry: Telemetry;
  health: Record<string, Health>;
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export type Objective = { id: string; label: string; hint: string } & ObjectiveRule;

export type ObjectiveRule =
  /** At least `count` blocks of `type` (optionally in `zone`), none of which are crashed. */
  | { kind: 'place'; type: ServiceType; zone?: Zone; count?: number }
  /** No more than `max` blocks of `type` on the board. */
  | { kind: 'maxCount'; type: ServiceType; max: number }
  /** A legal wire exists between a block of type `a` and a block of type `b`. */
  | { kind: 'wire'; a: ServiceType; b: ServiceType; count?: number }
  /** A successful request travels through these types in this order (other hops may sit between). */
  | { kind: 'path'; through: ServiceType[] }
  /** Successful traffic reaches at least `count` blocks of `type`. */
  | { kind: 'reach'; type: ServiceType; count?: number }
  /** Traffic reaches blocks of `type` in at least two Availability Zones. */
  | { kind: 'azSpread'; type: ServiceType }
  /** Every block of `type` has `key` equal to `equals`. */
  | { kind: 'config'; type: ServiceType; key: string; equals: unknown }
  /** Some block of `type` lets `port` in from the internet (`open: true`) or blocks it (`open: false`). */
  | { kind: 'firewall'; type: ServiceType; port: number; open: boolean }
  /** These block ids are no longer on the board. */
  | { kind: 'removed'; ids: string[] }
  /** No legal wire joins a block of type `a` to one of type `b` (e.g. reports kept off the orders database). */
  | { kind: 'apart'; a: ServiceType; b: ServiceType }
  /** Service-level targets measured from live telemetry. */
  | {
      kind: 'sla';
      maxLatencyMs?: number;
      minCapacityRps?: number;
      maxCostUsd?: number;
      minSecurityScore?: number;
      maxErrorRatePercent?: number;
    };

export interface ObjectiveResult {
  id: string;
  label: string;
  hint: string;
  passed: boolean;
  /** Plain-English explanation of the current state, e.g. "p99 latency is 140ms (target 85ms)". */
  detail: string;
}

export interface Stage {
  title: string;
  brief: string;
  goal: string;
  palette: ServiceType[];
  objectives: Objective[];
  hints: [string, string, string];
  load?: LoadProfile;
}

export type CoachCondition =
  | { kind: 'selected'; type?: ServiceType; id?: string }
  | { kind: 'tool'; tool: ToolMode }
  | { kind: 'placing'; type: ServiceType }
  | { kind: 'objective'; id: string }
  | { kind: 'any'; of: CoachCondition[] }
  | { kind: 'never' };

export type ToolMode = 'select' | 'wire' | 'delete' | 'place';

export interface CoachStep {
  id: string;
  text: string;
  /** UI element to spotlight, e.g. "palette-ec2", "tool-wire", "run-test", "grid". */
  target?: string;
  done: CoachCondition;
}

export interface TargetPlacement {
  type: ServiceType;
  gridX: number;
  gridZ: number;
  label: string;
}

export interface AutoWireRule {
  /** When the player places a block of this type... */
  onPlace: ServiceType;
  /** ...wire it to the first block of this type... */
  from: ServiceType;
  /** ...but only for the first placed block of that type. */
  firstOnly?: boolean;
}

export interface ConceptCard {
  title: string;
  summary: string;
  analogy: string;
  keyTakeaway: string;
}

export type GameMode =
  | 'packet_tracer'
  | 'outage_repair'
  | 'latency_tuning'
  | 'rate_limit_triage'
  | 'traffic_wave'
  | 'security_defense'
  | 'cost_slasher';

export interface LevelSpec {
  id: number;
  moduleId: number;
  title: string;
  tagline: string;
  difficulty: 'Novice' | 'Intermediate' | 'Advanced' | 'Master';
  isAssessment?: boolean;
  gameMode: GameMode;
  concepts: string[];
  briefing: string;
  docTips: string[];
  conceptCard?: ConceptCard;
  inspectorMode: 'basic' | 'intermediate' | 'full';
  iacSnippet?: string;
  initial: Board;
  /** A reference board that passes every stage. Used by tests to prove the level is solvable. */
  solution: Board;
  /** The initial board already passes (pure observe-and-run tutorial levels). */
  startsSolved?: boolean;
  stages: Stage[];
  limits?: {
    maxOfType?: Partial<Record<ServiceType, number>>;
    /** Monthly budget for the efficiency star. Defaults to the solution's cost + 15%. */
    budgetUsd?: number;
  };
  targetPlacements?: TargetPlacement[];
  coachSteps?: CoachStep[];
  autoWire?: AutoWireRule[];
  /** Opaque presentation data owned by the UI (storyboards, cutscenes). */
  presentation?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Session & test results
// ---------------------------------------------------------------------------

export interface Session {
  levelId: number;
  stageIdx: number;
  board: Board;
  /** Increments on every board change. Test results for an older version are discarded. */
  version: number;
  hintsRevealed: number;
  testsRun: number;
  failedTests: number;
  completed: boolean;
}

export interface StarAward {
  earned: boolean;
  label: string;
  detail: string;
}

export interface TestReport {
  levelId: number;
  stageIdx: number;
  version: number;
  analysis: BoardAnalysis;
  objectives: ObjectiveResult[];
  blockingViolations: Violation[];
  stagePassed: boolean;
  levelComplete: boolean;
  /** Present when the level is complete. */
  stars?: StarAward[];
  starCount?: number;
  xp?: number;
}
