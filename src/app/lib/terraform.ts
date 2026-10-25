/**
 * Turns the board into a Terraform `main.tf` using real AWS provider resources, so players can see
 * what their blocks would look like as infrastructure as code. Pure: board in, text out.
 */

import { VPC_CIDR, azAt, zoneAt, type Block, type Board, type FirewallRule } from '../../engine';

type Line = string;

const ident = (id: string) => id.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^(\d)/, '_$1');
const q = (s: string) => JSON.stringify(s);

function subnetRef(block: Block): string {
  const zone = zoneAt(block.gridX);
  const az = azAt(block.gridX, block.gridZ) === 'us-east-1b' ? 'b' : 'a';
  return `aws_subnet.${zone}_${az}.id`;
}

function cidrOf(source: string): string {
  return source === 'vpc' ? VPC_CIDR : source;
}

function portRange(port: FirewallRule['port']): [number, number] {
  if (port === 'all') return [0, 65535];
  if (typeof port === 'number') return [port, port];
  const [a, b] = String(port).split('-').map(Number);
  return [a, Number.isFinite(b) ? b : a];
}

function securityGroup(block: Block): Line[] {
  const rules = block.config.securityGroupInbound;
  if (rules === undefined) return [];
  const out = [`resource "aws_security_group" "${ident(block.id)}" {`, `  name   = ${q(`${block.name} firewall`)}`, `  vpc_id = aws_vpc.main.id`];
  if (rules.length === 0) out.push(`  # No inbound rules: nothing can reach this resource.`);
  for (const rule of rules) {
    const [from, to] = portRange(rule.port);
    out.push(
      ``,
      `  ingress {`,
      `    from_port   = ${from}`,
      `    to_port     = ${to}`,
      `    protocol    = ${q(rule.protocol === 'all' ? '-1' : rule.protocol)}`,
      `    cidr_blocks = [${q(cidrOf(rule.source))}]`,
      ...(rule.description ? [`    description = ${q(rule.description)}`] : []),
      `  }`,
    );
  }
  out.push(``, `  egress {`, `    from_port   = 0`, `    to_port     = 0`, `    protocol    = "-1"`, `    cidr_blocks = ["0.0.0.0/0"]`, `  }`, `}`);
  return out;
}

const sgRef = (block: Block) => (block.config.securityGroupInbound !== undefined ? [`  vpc_security_group_ids = [aws_security_group.${ident(block.id)}.id]`] : []);
const tags = (block: Block) => [`  tags = { Name = ${q(block.name)} }`];

function resource(kind: string, block: Block, body: Line[], suffix = ''): Line[] {
  return [`resource "${kind}" "${ident(block.id)}${suffix}" {`, ...body, `}`];
}

function blockResources(block: Block, board: Board): Line[] {
  const c = block.config;
  const id = ident(block.id);
  switch (block.type) {
    case 'client':
      return [];
    case 'ec2':
      return resource('aws_instance', block, [
        `  ami           = data.aws_ami.al2023.id`,
        `  instance_type = ${q(String(c.instanceType ?? 't3.micro'))}`,
        `  subnet_id     = ${subnetRef(block)}`,
        ...sgRef(block),
        ...(c.iamRole ? [`  iam_instance_profile = ${q(String(c.iamRole))}`] : []),
        ...tags(block),
      ]);
    case 'asg':
      return [
        ...resource('aws_launch_template', block, [
          `  image_id      = data.aws_ami.al2023.id`,
          `  instance_type = ${q(String(c.instanceType ?? 't3.medium'))}`,
          ...sgRef(block),
        ], '_lt'),
        ``,
        ...resource('aws_autoscaling_group', block, [
          `  min_size            = ${c.minCapacity ?? 2}`,
          `  max_size            = ${c.maxCapacity ?? 6}`,
          `  vpc_zone_identifier = [aws_subnet.${zoneAt(block.gridX)}_a.id, aws_subnet.${zoneAt(block.gridX)}_b.id]`,
          `  launch_template {`,
          `    id      = aws_launch_template.${id}_lt.id`,
          `    version = "$Latest"`,
          `  }`,
        ]),
      ];
    case 'alb':
      return resource('aws_lb', block, [
        `  load_balancer_type = "application"`,
        `  internal           = ${zoneAt(block.gridX) === 'private'}`,
        `  subnets            = [aws_subnet.${zoneAt(block.gridX)}_a.id, aws_subnet.${zoneAt(block.gridX)}_b.id]`,
        ...(c.securityGroupInbound !== undefined ? [`  security_groups    = [aws_security_group.${id}.id]`] : []),
        ...tags(block),
      ]);
    case 'rds': {
      const out = resource('aws_db_instance', block, [
        `  engine              = "postgres"`,
        `  instance_class      = "db.t3.medium"`,
        `  allocated_storage   = 20`,
        `  multi_az            = ${c.multiAZ === true}`,
        `  storage_encrypted   = ${c.encrypted !== false}`,
        `  publicly_accessible = ${zoneAt(block.gridX) !== 'private'}`,
        `  db_subnet_group_name = aws_db_subnet_group.main.name`,
        ...sgRef(block),
        `  skip_final_snapshot = true`,
      ]);
      if (c.readReplica) {
        out.push(``, ...resource('aws_db_instance', block, [`  replicate_source_db = aws_db_instance.${id}.identifier`, `  instance_class      = "db.t3.medium"`], '_replica'));
      }
      return out;
    }
    case 'dynamodb':
      return resource('aws_dynamodb_table', block, [
        `  name         = ${q(id)}`,
        `  billing_mode = "PAY_PER_REQUEST"`,
        `  hash_key     = "pk"`,
        `  attribute {`,
        `    name = "pk"`,
        `    type = "S"`,
        `  }`,
        `  server_side_encryption { enabled = ${c.encrypted !== false} }`,
      ]);
    case 'redis':
      return resource('aws_elasticache_cluster', block, [`  engine          = "redis"`, `  node_type       = "cache.t3.micro"`, `  num_cache_nodes = 1`, ...sgRef(block).map((l) => l.replace('vpc_security_group_ids', 'security_group_ids'))]);
    case 'redshift':
      return resource('aws_redshift_cluster', block, [`  cluster_identifier = ${q(id.replace(/_/g, '-'))}`, `  node_type          = "ra3.xlplus"`, `  encrypted          = ${c.encrypted !== false}`]);
    case 's3': {
      const bucket = `aws_s3_bucket.${id}.id`;
      return [
        ...resource('aws_s3_bucket', block, [`  bucket = ${q(`cloudcraft-${id.replace(/_/g, '-')}`)}`, ...tags(block)]),
        ``,
        ...resource('aws_s3_bucket_public_access_block', block, [
          `  bucket                  = ${bucket}`,
          `  block_public_acls       = ${c.blockPublicAccess !== false}`,
          `  block_public_policy     = ${c.blockPublicAccess !== false}`,
          `  ignore_public_acls      = ${c.blockPublicAccess !== false}`,
          `  restrict_public_buckets = ${c.blockPublicAccess !== false}`,
        ], '_public_access'),
        ``,
        ...resource('aws_s3_bucket_versioning', block, [`  bucket = ${bucket}`, `  versioning_configuration { status = ${q(c.versioning ? 'Enabled' : 'Suspended')} }`], '_versioning'),
        ...(c.encrypted !== false
          ? [``, ...resource('aws_s3_bucket_server_side_encryption_configuration', block, [`  bucket = ${bucket}`, `  rule {`, `    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }`, `  }`], '_sse')]
          : []),
      ];
    }
    case 'ebs': {
      const out = resource('aws_ebs_volume', block, [`  availability_zone = ${q(azAt(block.gridX, block.gridZ) === 'global' ? 'us-east-1a' : azAt(block.gridX, block.gridZ))}`, `  size              = 50`, `  encrypted         = ${c.encrypted !== false}`]);
      const server = board.wires
        .map((w) => (w.a === block.id ? w.b : w.b === block.id ? w.a : null))
        .map((other) => board.blocks.find((b) => b.id === other))
        .find((b) => b?.type === 'ec2');
      if (server) out.push(``, ...resource('aws_volume_attachment', block, [`  device_name = "/dev/sdf"`, `  volume_id   = aws_ebs_volume.${id}.id`, `  instance_id = aws_instance.${ident(server.id)}.id`], '_attach'));
      return out;
    }
    case 'efs':
      return resource('aws_efs_file_system', block, [`  encrypted = ${c.encrypted !== false}`, ...tags(block)]);
    case 'lambda':
      return resource('aws_lambda_function', block, [
        `  function_name = ${q(id)}`,
        `  runtime       = "nodejs20.x"`,
        `  handler       = "index.handler"`,
        `  memory_size   = ${c.memoryMb ?? 512}`,
        `  timeout       = ${c.timeoutSec ?? 15}`,
        `  role          = aws_iam_role.lambda_exec.arn`,
        `  filename      = "function.zip"`,
      ]);
    case 'apigw':
      return [
        ...resource('aws_apigatewayv2_api', block, [`  name          = ${q(block.name)}`, `  protocol_type = "HTTP"`]),
        ``,
        ...resource('aws_apigatewayv2_stage', block, [
          `  api_id      = aws_apigatewayv2_api.${id}.id`,
          `  name        = "$default"`,
          `  auto_deploy = true`,
          `  default_route_settings {`,
          `    throttling_rate_limit  = ${c.rateLimitRps ?? 1000}`,
          `    throttling_burst_limit = ${c.burstLimit ?? 2000}`,
          `  }`,
        ], '_stage'),
      ];
    case 'cloudfront':
      return resource('aws_cloudfront_distribution', block, [
        `  enabled = true`,
        `  default_cache_behavior {`,
        `    target_origin_id       = "origin"`,
        `    viewer_protocol_policy = "redirect-to-https"`,
        `    allowed_methods        = ["GET", "HEAD"]`,
        `    cached_methods         = ["GET", "HEAD"]`,
        `    default_ttl            = ${c.ttlSeconds ?? 3600}`,
        `  }`,
        `  # origin { ... }  points at the S3 bucket or load balancer wired behind it`,
        `  restrictions {`,
        `    geo_restriction { restriction_type = "none" }`,
        `  }`,
        `  viewer_certificate { cloudfront_default_certificate = true }`,
      ]);
    case 'route53':
      return resource('aws_route53_record', block, [
        `  zone_id = aws_route53_zone.main.zone_id`,
        `  name    = "app.example.com"`,
        `  type    = "A"`,
        ...(c.routingPolicy === 'latency' ? [`  latency_routing_policy { region = "us-east-1" }`, `  set_identifier = "us-east-1"`] : []),
        ...(c.routingPolicy === 'weighted' ? [`  weighted_routing_policy { weight = 90 }`, `  set_identifier = "stable"`] : []),
        ...(c.routingPolicy === 'failover' ? [`  failover_routing_policy { type = "PRIMARY" }`, `  set_identifier = "primary"`] : []),
        ...(c.routingPolicy === 'geolocation' ? [`  geolocation_routing_policy { continent = "NA" }`, `  set_identifier = "north-america"`] : []),
      ]);
    case 'waf':
      return resource('aws_wafv2_web_acl', block, [
        `  name  = ${q(id)}`,
        `  scope = "REGIONAL"`,
        `  default_action {`,
        `    allow {}`,
        `  }`,
        `  rule {`,
        `    name     = "rate-limit"`,
        `    priority = 1`,
        `    action {`,
        `      block {}`,
        `    }`,
        `    statement {`,
        `      rate_based_statement {`,
        `        limit              = ${c.rateLimitRps ?? 1000}`,
        `        aggregate_key_type = "IP"`,
        `      }`,
        `    }`,
        `    visibility_config {`,
        `      cloudwatch_metrics_enabled = true`,
        `      metric_name                = "rate-limit"`,
        `      sampled_requests_enabled   = true`,
        `    }`,
        `  }`,
        `  visibility_config {`,
        `    cloudwatch_metrics_enabled = true`,
        `    metric_name                = ${q(id)}`,
        `    sampled_requests_enabled   = true`,
        `  }`,
      ]);
    case 'igw':
      return resource('aws_internet_gateway', block, [`  vpc_id = aws_vpc.main.id`, ...tags(block)]);
    case 'nat_gw':
      return [...resource('aws_eip', block, [`  domain = "vpc"`], '_eip'), ``, ...resource('aws_nat_gateway', block, [`  allocation_id = aws_eip.${id}_eip.id`, `  subnet_id     = aws_subnet.public_a.id`])];
    case 'tgw':
      return resource('aws_ec2_transit_gateway', block, [`  description = ${q(block.name)}`]);
    case 'ecs':
      return resource('aws_ecs_service', block, [`  name            = ${q(id)}`, `  cluster         = aws_ecs_cluster.main.id`, `  launch_type     = "FARGATE"`, `  desired_count   = ${Number(block.config.desiredCount ?? 4)}`, `  # task_definition = aws_ecs_task_definition.app.arn`]);
    case 'eks':
      return resource('aws_eks_cluster', block, [`  name     = ${q(id)}`, `  role_arn = aws_iam_role.eks.arn`, `  vpc_config {`, `    subnet_ids = [${subnetRef(block)}]`, `  }`]);
    case 'beanstalk':
      return resource('aws_elastic_beanstalk_environment', block, [`  name                = ${q(id.replace(/_/g, '-'))}`, `  application         = "cloudcraft"`, `  solution_stack_name = "64bit Amazon Linux 2023 v6.1.0 running Node.js 20"`]);
    case 'sagemaker':
      return resource('aws_sagemaker_endpoint', block, [`  name                 = ${q(id.replace(/_/g, '-'))}`, `  endpoint_config_name = "model-config"`]);
    case 'dms':
      return resource('aws_dms_replication_task', block, [`  replication_task_id = ${q(id.replace(/_/g, '-'))}`, `  migration_type      = "full-load-and-cdc"`, `  # source and target endpoints point at the databases wired to this task`]);
    case 'sqs':
      return resource('aws_sqs_queue', block, [`  name = ${q(id)}`, `  visibility_timeout_seconds = 60`]);
    case 'sns':
      return resource('aws_sns_topic', block, [`  name = ${q(id)}`]);
    case 'kinesis':
      return resource('aws_kinesis_stream', block, [`  name        = ${q(id)}`, `  shard_count = 2`]);
    case 'iam':
      return resource('aws_iam_role', block, [`  name = ${q(id)}`, `  # Grants: ${c.iamRole ?? 'least privilege'}`, `  assume_role_policy = data.aws_iam_policy_document.assume.json`]);
    case 'kms':
      return resource('aws_kms_key', block, [`  description         = ${q(block.name)}`, `  enable_key_rotation = ${c.keyRotation !== false}`]);
    case 'cloudwatch':
      return resource('aws_cloudwatch_metric_alarm', block, [
        `  alarm_name          = ${q(id)}`,
        `  metric_name         = "CPUUtilization"`,
        `  namespace           = "AWS/EC2"`,
        `  statistic           = "Average"`,
        `  comparison_operator = "GreaterThanThreshold"`,
        `  threshold           = ${c.alarmThreshold ?? 80}`,
        `  evaluation_periods  = 2`,
        `  period              = 60`,
      ]);
    case 'cloudtrail':
      return resource('aws_cloudtrail', block, [`  name           = ${q(id)}`, `  s3_bucket_name = "cloudcraft-audit-logs"`, `  is_multi_region_trail = true`]);
  }
}

export function buildTerraform(board: Board, title: string): string {
  const blocks = board.blocks.filter((b) => b.type !== 'client');
  const inVpc = blocks.some((b) => ['public', 'private'].includes(zoneAt(b.gridX)));
  const out: Line[] = [
    `# main.tf — generated from your CloudCraft board`,
    `# Mission: ${title}`,
    `#`,
    `# Every block on the board becomes one or more "resource" blocks below.`,
    `# Running \`terraform apply\` on a file like this builds the same architecture in AWS.`,
    ``,
    `terraform {`,
    `  required_providers {`,
    `    aws = {`,
    `      source  = "hashicorp/aws"`,
    `      version = "~> 5.0"`,
    `    }`,
    `  }`,
    `}`,
    ``,
    `provider "aws" {`,
    `  region = "us-east-1"`,
    `}`,
  ];

  if (blocks.some((b) => b.type === 'ec2' || b.type === 'asg')) {
    out.push(
      ``,
      `data "aws_ami" "al2023" {`,
      `  most_recent = true`,
      `  owners      = ["amazon"]`,
      `  filter {`,
      `    name   = "name"`,
      `    values = ["al2023-ami-*-x86_64"]`,
      `  }`,
      `}`,
    );
  }

  if (inVpc) {
    out.push(``, `# --- Network -----------------------------------------------------------------`, ``);
    out.push(`resource "aws_vpc" "main" {`, `  cidr_block = ${q(VPC_CIDR)}`, `  tags = { Name = "cloudcraft" }`, `}`);
    const subnets: [string, string, string, boolean][] = [
      ['public_a', '10.0.1.0/25', 'us-east-1a', true],
      ['public_b', '10.0.1.128/25', 'us-east-1b', true],
      ['private_a', '10.0.2.0/25', 'us-east-1a', false],
      ['private_b', '10.0.2.128/25', 'us-east-1b', false],
    ];
    for (const [name, cidr, az, pub] of subnets) {
      out.push(
        ``,
        `resource "aws_subnet" "${name}" {`,
        `  vpc_id                  = aws_vpc.main.id`,
        `  cidr_block              = ${q(cidr)}`,
        `  availability_zone       = ${q(az)}`,
        `  map_public_ip_on_launch = ${pub}`,
        `}`,
      );
    }
    if (blocks.some((b) => b.type === 'rds')) {
      out.push(``, `resource "aws_db_subnet_group" "main" {`, `  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]`, `}`);
    }
  }

  const firewalls = blocks.flatMap((b) => {
    const sg = securityGroup(b);
    return sg.length ? [``, `# Firewall for ${b.name}`, ...sg] : [];
  });
  if (firewalls.length && inVpc) out.push(``, `# --- Security groups ---------------------------------------------------------`, ...firewalls);

  out.push(``, `# --- Resources ---------------------------------------------------------------`);
  for (const block of blocks) {
    const lines = blockResources(block, board);
    if (lines.length) out.push(``, `# ${block.name}`, ...lines);
  }

  if (board.wires.length) {
    const names = new Map(board.blocks.map((b) => [b.id, b.name]));
    out.push(``, `# --- Wiring ------------------------------------------------------------------`, `# Connections on your board (expressed above through subnets, security groups and targets):`);
    for (const w of board.wires) out.push(`#   ${names.get(w.a)} <-> ${names.get(w.b)}`);
  }
  return out.join('\n') + '\n';
}
