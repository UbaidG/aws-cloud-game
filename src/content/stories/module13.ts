/**
 * Module 13: Well-Architected, the finale. Rio’s shop opens in twelve countries next month.
 * Maya runs a Well-Architected review pillar by pillar, the team rehearses the hardest
 * systems, and on launch eve the whole platform is built again, properly.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ec2', gridX, gridZ, { name, config });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });

const level121: LevelStory = {
  text: {
    title: 'Know Before They Do',
    tagline: 'Pillar one, operational excellence: hear about problems before customers do.',
    concepts: ['Operational excellence', 'Amazon CloudWatch', 'Amazon SNS'],
    briefing:
      'Rio’s shop opens in twelve countries next month, and Maya is running a Well-Architected review, one pillar at a time. First, operational excellence: nothing is watching the servers. Monitor both with CloudWatch and send its alarms to on-call through SNS.',
    docTips: [
      'Alarm on what customers feel, such as error rate and latency, not only on CPU. Give every alarm a runbook that says what to do when it fires.',
    ],
    conceptCard: {
      title: 'Operational excellence',
      summary:
        'The first Well-Architected pillar is about running and improving systems: observe them, respond to events, and learn from every incident. You can’t improve what you can’t see.',
      analogy: 'A smoke alarm wired to the fire station, not just one that beeps in an empty house.',
      keyTakeaway: 'Measure what matters, and make sure a person hears about a problem before a customer does.',
    },
    iacSnippet: `resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  alarm_name          = "web-unhealthy-hosts"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [aws_sns_topic.oncall.arn]

  dimensions = {
    LoadBalancer = aws_lb.web.arn_suffix
    TargetGroup  = aws_lb_target_group.web.arn_suffix
  }
}`,
  },
  stages: [
    {
      title: 'Operational excellence',
      brief: 'Last week a customer told Rio the shop was broken. Nobody on the team had noticed.',
      goal: 'Monitor both servers with CloudWatch and send its alarms to an SNS topic.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web1', 1, -1, 'Server A'),
        ec2('web2', 1, 1, 'Server B'),
        block('mon', 'cloudwatch', 6, 2, { name: 'CloudWatch' }),
        block('page', 'sns', 7, 2, { name: 'On-call Alerts' }),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2')],
    ),
    start: ['users', 'alb', 'web1', 'web2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2'] },
      { t: 'caption', text: 'Rio’s shop opens in twelve countries next month. Maya calls a Well-Architected review.' },
      { t: 'speech', who: 'cto', text: 'Six pillars, six hard questions. First one: if a server broke right now, who would know?' },
      { t: 'traffic', rps: 200, expect: 'served', hold: 3000 },
      { t: 'crash', id: 'web2' },
      { t: 'camera', shot: 'close', on: 'web2' },
      { t: 'callout', on: 'web2', title: 'Server B', body: 'Failing for 38 minutes', tone: 'bad' },
      { t: 'speech', who: 'customer', text: 'Your checkout keeps failing. Is anyone there?' },
      { t: 'speech', who: 'oncall', text: 'Thirty-eight minutes, and we heard about it from a customer. Again.' },
      { t: 'spawn', ids: ['mon', 'page'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Watch both servers, and page on-call the moment something breaks.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'dashboards that page nobody',
    change: { unwire: 'mon-page' },
    fails: 's1-2',
  },
};

const level122: LevelStory = {
  text: {
    title: 'Lock Every Layer',
    tagline: 'Pillar two, security: protect the edge and the data, not just one of them.',
    concepts: ['Security pillar', 'AWS WAF', 'Encryption at rest'],
    briefing:
      'Pillar two is security. Bots are hammering the login page at 2,000 requests a second, and the customer database is stored unencrypted. Put AWS WAF in front of the load balancer and encrypt the database.',
    docTips: [
      'You can’t switch on encryption for an existing RDS instance. Take a snapshot, copy it with encryption turned on, and restore from the copy.',
    ],
    conceptCard: {
      title: 'Defence in depth',
      summary:
        'The security pillar asks for protection at every layer: filter bad traffic at the edge, keep data tiers private, and encrypt data at rest and in transit. If one control fails, the next still holds.',
      analogy: 'A bank has a guard at the door, a locked vault, and serial numbers on the notes.',
      keyTakeaway: 'No single control is enough. Secure the edge, the network and the data.',
    },
    iacSnippet: `resource "aws_wafv2_web_acl" "shop" {
  name  = "shop-edge"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "aws-common"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "aws-common"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "shop-edge"
    sampled_requests_enabled   = true
  }
}`,
  },
  stages: [
    {
      title: 'Security',
      brief: '2,000 bot requests a second, and the customer database is stored unencrypted.',
      goal: 'Put a WAF in front of the load balancer and encrypt the database: security score 100, no errors.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('shield', 'waf', -3, 0, { name: 'WAF' }),
        alb(),
        ec2('web', 4, 0, 'App Server'),
        block('db', 'rds', 6, 0, { name: 'Customer DB', config: { encrypted: false } }),
      ],
      [wire('users', 'alb'), wire('alb', 'web'), wire('web', 'db')],
    ),
    start: ['users', 'alb', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web', 'web--db'] },
      { t: 'caption', text: 'Pillar two: security. Ines has been waiting for this one.' },
      { t: 'traffic', rps: 200, botRps: 2000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'alb' },
      { t: 'callout', on: 'alb', title: 'Login page', body: '2,000 bot requests a second', tone: 'bad' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Customer DB', body: 'Encryption: off', tone: 'bad' },
      { t: 'speech', who: 'security', text: 'If anyone ever copied that disk, they’d have every address we hold, in plain text.' },
      { t: 'speech', who: 'cto', text: 'So we fix both ends. Filter the bots at the edge, and encrypt the data at rest.' },
      { t: 'spawn', ids: ['shield'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Put the WAF in front, and lock the data.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a WAF at the edge, but the data left unencrypted',
    change: { set: { db: { encrypted: false } } },
    fails: 's1-2',
  },
};

const level123: LevelStory = {
  text: {
    title: 'Pull the Plug',
    tagline: 'Pillar three, reliability: assume everything fails, and plan for it.',
    concepts: ['Reliability pillar', 'Multi-AZ', 'Fault injection'],
    briefing:
      'Pillar three is reliability, and Maya tests it the honest way: she switches off the only app server. The shop goes dark, and the database has no standby either. Replace the server with two, one in each Availability Zone, and make the database Multi-AZ.',
    docTips: [
      'AWS Fault Injection Service runs controlled experiments, such as stopping instances, so you find single points of failure in a drill, not in an outage.',
    ],
    conceptCard: {
      title: 'Reliability',
      summary:
        'The reliability pillar is about recovering from failure automatically and meeting demand. Remove single points of failure, spread across Availability Zones, and test your recovery regularly.',
      analogy: 'A plane with two engines is designed to land on one.',
      keyTakeaway: 'Everything fails eventually. Reliable systems are the ones that don’t need a hero when it does.',
    },
    iacSnippet: `resource "aws_lb" "web" {
  name               = "orders-web"
  load_balancer_type = "application"
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id] # two AZs
  security_groups    = [aws_security_group.alb.id]
}`,
  },
  stages: [
    {
      title: 'Reliability',
      brief: 'The only server crashed, and the database has no standby.',
      goal: 'Remove the dead server, run servers in two Availability Zones, and make the database Multi-AZ.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('w1', 3, -1, 'Only Server'),
        block('db', 'rds', 6, 0, { name: 'Orders DB' }),
        ec2('web1', 3, -2, 'Server A'),
        ec2('web2', 3, 2, 'Server B'),
      ],
      [wire('users', 'alb'), wire('alb', 'w1'), wire('w1', 'db')],
    ),
    start: ['users', 'alb', 'w1', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--w1', 'w1--db'] },
      { t: 'caption', text: 'Pillar three: reliability. Maya asks Dev to switch off a server, on purpose.' },
      { t: 'traffic', rps: 200, expect: 'served', hold: 3000 },
      { t: 'crash', id: 'w1' },
      { t: 'traffic', rps: 200, expect: 'blocked', hold: 3000 },
      { t: 'camera', shot: 'low', on: 'w1' },
      { t: 'callout', on: 'w1', title: 'Only Server', body: 'Stopped · nothing takes over', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'One server off and the whole shop is dark. Good thing this is only a drill.' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Orders DB', body: 'No standby', tone: 'warn' },
      { t: 'speech', who: 'cto', text: 'That’s why we test. Two servers in two zones, and a standby for the database.' },
      { t: 'spawn', ids: ['web1', 'web2'], hold: 900 },
      { t: 'camera', shot: 'top' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'two servers, both in one zone',
    change: { move: { web2: [3, -1] } },
    fails: 's1-2',
  },
};

const level124: LevelStory = {
  text: {
    title: 'Close to Everyone',
    tagline: 'Pillar four, performance efficiency: less distance, less repeated work.',
    concepts: ['Performance efficiency', 'Amazon CloudFront', 'Amazon ElastiCache'],
    briefing:
      'Pillar four is performance efficiency. Customers are about to arrive from twelve countries, pages take 154 ms, and the target is 30. Cache at the edge with CloudFront and in memory with Redis.',
    docTips: [
      'CloudFront can cache dynamic pages for a few seconds, not just images. Even a 5-second TTL on a busy page takes most of the load off everything behind it.',
    ],
    conceptCard: {
      title: 'Performance efficiency',
      summary:
        'This pillar is about using the right resources for the job and keeping them efficient as demand changes. Most of a request’s time is distance and repeated work, and caching removes both.',
      analogy: 'A local branch library keeps the popular books on the shelf near you, not in the central store across town.',
      keyTakeaway: 'The fastest request is one that doesn’t travel far and isn’t computed twice.',
    },
    iacSnippet: `resource "aws_cloudfront_cache_policy" "pages" {
  name        = "short-page-cache"
  min_ttl     = 0
  default_ttl = 5
  max_ttl     = 60

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config { cookie_behavior = "none" }
    headers_config { header_behavior = "none" }
    query_strings_config { query_string_behavior = "all" }
  }
}`,
  },
  stages: [
    {
      title: 'Performance',
      brief: 'Pages take 154 ms. The target is 30 ms.',
      goal: 'Put CloudFront in front of the load balancer and a Redis cache beside the database, bringing pages under 30 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web', 1, 0, 'App Server'),
        block('db', 'rds', 5, 0, { name: 'Catalogue DB' }),
        block('cdn', 'cloudfront', -3, 0, { name: 'CloudFront' }),
        block('cache', 'redis', 5, 1, { name: 'Redis Cache' }),
      ],
      [wire('users', 'alb'), wire('alb', 'web'), wire('web', 'db')],
    ),
    start: ['users', 'alb', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web', 'web--db'] },
      { t: 'caption', text: 'Pillar four: performance. Test shoppers in Sydney, Tokyo and São Paulo load the home page.' },
      { t: 'traffic', rps: 200, expect: 'served' },
      { t: 'stat', label: 'Page load', value: 154, unit: 'ms', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Half our new customers live on the other side of the world from this data centre.' },
      { t: 'speech', who: 'cto', text: 'Two fixes. Serve pages from an edge near them, and stop asking the database the same question twice.' },
      { t: 'spawn', ids: ['cdn'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'cdn' },
      { t: 'spawn', ids: ['cache'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'cache' },
      { t: 'stat', label: 'Target', value: 30, unit: 'ms', tone: 'good' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'an edge cache alone, with every miss still hitting the database',
    change: { remove: ['cache'] },
    fails: 's1-2',
  },
};

const level125: LevelStory = {
  text: {
    title: 'Right Shape, Right Price',
    tagline: 'Pillar five, cost optimisation: pay for what the workload actually uses.',
    concepts: ['Cost optimisation pillar', 'Serverless', 'Managed services'],
    briefing:
      'Pillar five is cost optimisation. The returns portal gets a few hundred requests a minute, yet it runs on a $315 stack: a load balancer, a large server and a Multi-AZ database. Rebuild it on API Gateway, Lambda and DynamoDB for under $60 a month.',
    docTips: [
      'DynamoDB stores every table across three Availability Zones automatically, so going serverless here doesn’t give up the resilience the Multi-AZ database provided.',
    ],
    conceptCard: {
      title: 'Cost optimisation',
      summary:
        'This pillar is about delivering business value at the lowest price: pay only for what you use, measure where the money goes, and choose managed services that remove idle capacity.',
      analogy: 'Taking a taxi for the two trips you make each week, instead of leasing a car that sits on the drive.',
      keyTakeaway: 'Spend follows architecture. Change the shape, and the bill follows.',
    },
    iacSnippet: `resource "aws_lambda_function" "returns" {
  function_name = "returns-portal"
  role          = aws_iam_role.returns.arn
  runtime       = "nodejs22.x"
  handler       = "index.handler"
  filename      = "returns.zip"
  architectures = ["arm64"] # Graviton: cheaper per millisecond
  memory_size   = 512
}`,
  },
  stages: [
    {
      title: 'Cost optimisation',
      brief: 'A $315 stack for an app that gets a few hundred requests a minute.',
      goal: 'Rebuild it as API Gateway → Lambda → DynamoDB for under $60 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web', 1, 0, 'App Server', { instanceType: 'm5.large' }),
        block('db', 'rds', 5, 0, { name: 'App DB', config: { multiAZ: true } }),
        block('api', 'apigw', -2, 0, { name: 'Returns API' }),
        block('fn', 'lambda', 4, 0, { name: 'Returns Function' }),
        block('table', 'dynamodb', 6, 0, { name: 'Returns Table' }),
      ],
      [wire('users', 'alb'), wire('alb', 'web'), wire('web', 'db')],
    ),
    start: ['users', 'alb', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web', 'web--db'] },
      { t: 'caption', text: 'Pillar five: cost. Tom has brought a spreadsheet.' },
      { t: 'traffic', rps: 10, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'stat', label: 'Requests / minute', value: 300, tone: 'info' },
      { t: 'stat', label: 'Monthly cost', value: 315, prefix: '$', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'Three hundred and fifteen dollars a month for the returns portal. It’s idle most of the night.' },
      { t: 'speech', who: 'cto', text: 'We built it like the main shop, for a fraction of the traffic. It should cost what it’s used for.' },
      { t: 'remove', ids: ['alb', 'web', 'db'] },
      { t: 'spawn', ids: ['api', 'fn', 'table'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Rebuild it serverless, for under $60 a month.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'Lambda in front of the old relational database',
    change: { remove: ['table'], add: 'db:rds@6,0', wire: 'fn-db' },
    fails: 's1-2',
  },
};

const level126: LevelStory = {
  text: {
    title: 'Idle Still Burns',
    tagline: 'Pillar six, sustainability: the greenest server is a busy one.',
    concepts: ['Sustainability pillar', 'Right-sizing', 'Utilisation'],
    briefing:
      'The sixth pillar is sustainability. Two of the largest servers in the account sit 80% idle, using power and hardware for nothing. Right-size both for the real load of 900 requests a second.',
    docTips: [
      'AWS Compute Optimizer recommends instance sizes from real usage. Graviton-based instances use up to 60% less energy than comparable instances for the same performance.',
    ],
    conceptCard: {
      title: 'Sustainability',
      summary:
        'The newest pillar is about reducing the environmental impact of your workloads: keep utilisation high, right-size, use efficient hardware and delete what you don’t need.',
      analogy: 'A bus running with three passengers burns nearly as much fuel as a full one.',
      keyTakeaway: 'Use the least hardware that does the job well. It’s usually the cheapest option too.',
    },
    iacSnippet: `resource "aws_instance" "web" {
  count         = 2
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.medium" # was c6g.xlarge, 80% idle
  subnet_id     = element([aws_subnet.public_a.id, aws_subnet.public_b.id], count.index)
}`,
  },
  stages: [
    {
      title: 'Sustainability',
      brief: 'Two huge servers sit 80% idle. Idle machines still draw power.',
      goal: 'Right-size both servers so they serve 900 requests a second with no errors, for under $130 a month.',
      hint: 'Each server needs to handle about 450 requests a second. Pick the smallest size that can.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web1', 1, -1, 'Server A', { instanceType: 'c6g.xlarge' }),
        ec2('web2', 1, 1, 'Server B', { instanceType: 'c6g.xlarge' }),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2')],
    ),
    start: ['users', 'alb', 'web1', 'web2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2'] },
      { t: 'caption', text: 'The sixth pillar, and the newest: sustainability.' },
      { t: 'traffic', rps: 900, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web1' },
      { t: 'callout', on: 'web1', title: 'c6g.xlarge', body: 'CPU 20%', tone: 'warn' },
      { t: 'callout', on: 'web2', title: 'c6g.xlarge', body: 'CPU 20%', tone: 'warn' },
      { t: 'stat', label: 'Idle capacity', value: 80, unit: '%', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Customers ask about our carbon footprint now. “Big servers, mostly idle” isn’t a good answer.' },
      { t: 'speech', who: 'cto', text: 'An idle server still draws power, and still took a factory to build. Size them to the load.' },
      { t: 'camera', shot: 'orbit', on: 'alb' },
      { t: 'clear' },
      { t: 'caption', text: 'Right-size both servers. Smaller, not too small.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'shrinking to the smallest size there is',
    change: { set: { web1: { instanceType: 't3.micro' }, web2: { instanceType: 't3.micro' } } },
    fails: 's1-1',
  },
};

const level127: LevelStory = {
  text: {
    title: 'Checkout Under Fire',
    tagline: 'Rehearsal one: a checkout that survives bots and Black Friday.',
    concepts: ['AWS WAF', 'Asynchronous processing', 'Amazon SQS'],
    briefing:
      'Three rehearsals before launch, starting with the checkout. Build it from nothing behind a WAF, because card-testing bots will find it within the hour. Then get it ready for 3,000 orders a second, twice what the database can write, by queueing orders for a background worker.',
    docTips: [
      'Rate-based WAF rules block any IP address that sends more requests than your limit in a short window, which stops most card-testing bots.',
      'Taking an order and saving it can be two steps. The customer gets an instant confirmation, and the queue holds every order until the worker writes it, at a pace the database can take, even if the worker is briefly down.',
    ],
    conceptCard: {
      title: 'Asynchronous checkout',
      summary:
        'Not every step of an order has to finish before the customer sees “thank you”. Putting slow work such as payment capture and emails on a queue keeps the front end fast under any spike.',
      analogy: 'Posting a letter: you walk away at once, and the post office makes sure it’s delivered.',
      keyTakeaway: 'Do the minimum while the customer waits. Queue the rest.',
    },
    iacSnippet: `resource "aws_sqs_queue" "payments_dlq" {
  name = "payments-dlq"
}

resource "aws_sqs_queue" "payments" {
  name = "payments"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.payments_dlq.arn
    maxReceiveCount     = 5
  })
}`,
  },
  stages: [
    {
      title: 'Checkout',
      brief: 'An empty account, and card-testing bots already looking for a checkout.',
      goal: 'Build WAF → load balancer → two servers → database, with no errors and a security score of 100.',
    },
    {
      title: 'Black Friday',
      brief: '3,000 orders a second, and the database takes 1,500 writes. Orders can be saved a moment later.',
      goal: 'Scale up the servers, and queue orders in SQS for a Lambda worker that writes them to the database, with no errors.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('shield', 'waf', -3, 0, { name: 'WAF' }),
        alb(),
        ec2('web1', 1, -1, 'Server A'),
        ec2('web2', 1, 1, 'Server B'),
        block('db', 'rds', 5, 0, { name: 'Orders DB' }),
        block('q', 'sqs', 6, 2, { name: 'Orders Queue' }),
        block('worker', 'lambda', 4, 2, { name: 'Order Worker' }),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'db'), wire('web2', 'db')],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Rehearsal one of three: the checkout. Rio’s biggest sale ever is a month away.' },
      { t: 'spawn', ids: ['alb', 'web1', 'web2', 'db'], hold: 900 },
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2', 'web1--db', 'web2--db'] },
      { t: 'traffic', rps: 200, botRps: 2000, expect: 'served' },
      { t: 'stat', label: 'Card-testing bots / s', value: 2000, tone: 'bad' },
      { t: 'speech', who: 'security', text: 'Bots try stolen card numbers at checkouts, a few pennies at a time. Stop them at the edge.' },
      { t: 'spawn', ids: ['shield'] },
      { t: 'camera', shot: 'close', on: 'shield' },
      { t: 'stat', label: 'Black Friday forecast', value: 3000, unit: ' orders/s', tone: 'warn' },
      { t: 'callout', on: 'db', title: 'Orders DB', body: '1,500 writes a second, at most', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Twice what the database can write. Half of Black Friday gets an error page.' },
      { t: 'speech', who: 'cto', text: 'Then take the order, say thank you, and queue it. A worker writes it at the pace the database can take.' },
      { t: 'spawn', ids: ['q', 'worker'], hold: 900 },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'calling the order worker directly, with no queue',
    change: { remove: ['q'], wire: 'web1-worker web2-worker' },
    fails: 's2-2',
  },
};

const level128: LevelStory = {
  text: {
    title: 'Ask Rio',
    tagline: 'Rehearsal two: an AI shopping assistant that’s fast and hard to abuse.',
    concepts: ['Amazon SageMaker', 'Model inference', 'Response caching'],
    briefing:
      'Rehearsal two is “Ask Rio”, an assistant that answers shoppers’ questions. Serve the model through API Gateway and Lambda so scrapers are throttled before they reach it, then cache common answers to reply in under 100 ms.',
    docTips: [
      'API Gateway throttles requests and can require API keys with usage plans, which stops scrapers from running up your inference bill.',
      'Many questions repeat (“Do you ship to Spain?”). Cache answers keyed by a hash of the normalised question, with a short TTL.',
    ],
    conceptCard: {
      title: 'Inference at scale',
      summary:
        'A model endpoint is expensive per request and slower than a database. Put a cheap, scalable layer in front to validate and throttle requests, and a cache to answer repeat questions without calling the model.',
      analogy: 'A help desk that answers the common questions from a laminated sheet, and only calls the specialist for new ones.',
      keyTakeaway: 'Protect the model: throttle what you can’t trust, and cache what you’ve already answered.',
    },
    iacSnippet: `resource "aws_sagemaker_endpoint_configuration" "assistant" {
  name = "ask-rio-config"

  production_variants {
    variant_name           = "primary"
    model_name             = aws_sagemaker_model.assistant.name
    instance_type          = "ml.g5.xlarge"
    initial_instance_count = 1
  }
}

resource "aws_sagemaker_endpoint" "assistant" {
  name                 = "ask-rio"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.assistant.name
}`,
  },
  stages: [
    {
      title: 'Inference API',
      brief: 'Shoppers type a question and the model answers. Scrapers are already hammering it.',
      goal: 'Build API Gateway → Lambda → SageMaker, serving shoppers with no errors.',
    },
    {
      title: 'Under 100 ms',
      brief: 'Answers take 133 ms, and many questions repeat.',
      goal: 'Add a Redis cache for answers and get replies under 100 ms.',
      hint: 'Wire the function to a Redis cache so repeat questions never reach the model.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'Assistant API' }),
        block('fn', 'lambda', 4, 0, { name: 'Assistant Function' }),
        block('model', 'sagemaker', 5, 0, { name: 'Ask Rio Model' }),
        block('cache', 'redis', 5, 1, { name: 'Answer Cache' }),
      ],
      [wire('users', 'api'), wire('api', 'fn'), wire('fn', 'model')],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Rehearsal two: “Ask Rio”, an assistant that answers shoppers in their own language.' },
      { t: 'spawn', ids: ['model'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'model' },
      { t: 'callout', on: 'model', title: 'SageMaker endpoint', body: 'GPU instance · billed by the hour', tone: 'info' },
      { t: 'spawn', ids: ['api', 'fn'] },
      { t: 'wire', ids: ['users--api', 'api--fn', 'fn--model'] },
      { t: 'camera', shot: 'wide' },
      { t: 'traffic', rps: 600, botRps: 1500, expect: 'served' },
      { t: 'stat', label: 'Scraper requests / s', value: 1500, tone: 'bad' },
      { t: 'speech', who: 'security', text: 'Scrapers want free answers from our model. The API layer throttles them before they cost us.' },
      { t: 'stat', label: 'Reply time', value: 133, unit: 'ms', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'And half the questions are the same: “Do you ship to Spain?”, “Where’s my order?”' },
      { t: 'speech', who: 'cto', text: 'Then answer those from memory. Only new questions should reach the model.' },
      { t: 'spawn', ids: ['cache'] },
    ],
  },
  wrong: {
    stage: 2,
    why: 'a cache the function never checks',
    change: { unwire: 'fn-cache' },
    fails: 's2-1',
  },
};

const level129: LevelStory = {
  text: {
    title: 'Rio Live',
    tagline: 'Rehearsal three: video and a personal API, both served from the edge.',
    concepts: ['Edge delivery', 'Amazon CloudFront', 'Amazon DynamoDB'],
    briefing:
      'Rehearsal three is Rio Live: product videos streamed to shoppers worldwide. Serve the video files from S3 through CloudFront, then put a profiles API for watch history and favourites behind the same distribution, answering in under 30 ms.',
    docTips: [
      'Route 53 alias records point your domain at a CloudFront distribution, and alias queries to CloudFront are free. S3 holds the video segments; CloudFront caches them near viewers.',
      'One CloudFront distribution can send /api/* to a load balancer and everything else to S3, so users see a single domain.',
    ],
    conceptCard: {
      title: 'Global edge architecture',
      summary:
        'CloudFront has hundreds of edge locations worldwide. Media is cached there, and API calls travel from the nearest edge to your Region over the AWS network, so both feel close to the viewer.',
      analogy: 'Newsagents everywhere stock the same magazine, and one subscriptions desk sits behind them all.',
      keyTakeaway: 'Bring the content and the front door close to users; keep the data where you can manage it.',
    },
    iacSnippet: `resource "aws_route53_record" "live" {
  zone_id = aws_route53_zone.rio.zone_id
  name    = "live.rio.example"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.live.domain_name
    zone_id                = aws_cloudfront_distribution.live.hosted_zone_id
    evaluate_target_health = false
  }
}`,
  },
  stages: [
    {
      title: 'Video at the edge',
      brief: 'Rio Live streams product videos to shoppers in twelve countries.',
      goal: 'Build Route 53 → CloudFront → S3.',
    },
    {
      title: 'Personal profiles',
      brief: 'Watch history and favourites need an API behind the same CDN.',
      goal: 'Route CloudFront → load balancer → ECS → DynamoDB, answering in under 30 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('dns', 'route53', -4, 0, { name: 'Route 53' }),
        block('cdn', 'cloudfront', -3, 0, { name: 'CloudFront' }),
        block('videos', 's3', -2, 1, { name: 'Video Bucket' }),
        alb(),
        block('svc', 'ecs', 2, 0, { name: 'Profiles Service' }),
        block('profiles', 'dynamodb', 6, 0, { name: 'Profiles' }),
      ],
      [wire('users', 'dns'), wire('dns', 'cdn'), wire('cdn', 'videos')],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Rehearsal three: Rio Live. Product demos, streamed to shoppers in twelve countries.' },
      { t: 'spawn', ids: ['dns', 'cdn', 'videos'], hold: 900 },
      { t: 'wire', ids: ['users--dns', 'dns--cdn', 'cdn--videos'] },
      { t: 'traffic', rps: 200, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'cdn' },
      { t: 'callout', on: 'cdn', title: 'Edge locations', body: 'Video cached near every viewer', tone: 'good' },
      { t: 'speech', who: 'founder', text: 'Shoppers want to pick up where they left off, on any device.' },
      { t: 'speech', who: 'oncall', text: 'So we need profiles: an API and a database. And it can’t feel slower than the video.' },
      { t: 'spawn', ids: ['alb', 'svc', 'profiles'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'profiles' },
      { t: 'speech', who: 'cto', text: 'Same front door. CloudFront sends API calls to the load balancer and serves video from the bucket.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'an API that bypasses the CDN',
    change: { unwire: 'cdn-alb', wire: 'users-alb' },
    fails: 's2-2',
  },
};

const level130: LevelStory = {
  text: {
    title: 'Ready for the World',
    tagline: 'Final assessment: build Rio’s platform to every pillar, from an empty account.',
    concepts: ['AWS Well-Architected Framework', 'Reliability', 'Performance', 'Security', 'Operations'],
    briefing:
      'Launch eve. Rio’s shop opens in twelve countries tomorrow, and Maya wants the core platform rebuilt cleanly, to every pillar you’ve learned. Make it survive a zone failure, then make it fast everywhere, then secure it and watch it.',
    docTips: [
      'Reliability first: servers in two Availability Zones behind the load balancer, and a database with a standby in the second zone.',
      'CloudFront brings the front door close to every shopper; Redis keeps repeated reads off the database. Measure again after each change.',
      'A WAF in front of CloudFront stops bots at the edge, and CloudWatch on each server means a person hears about trouble first.',
    ],
    conceptCard: {
      title: 'The Well-Architected Framework',
      summary:
        'Six pillars describe a good cloud system: operational excellence, security, reliability, performance efficiency, cost optimisation and sustainability. Real designs balance them, trading one against another on purpose.',
      analogy: 'A building inspection covers structure, fire safety, plumbing and wiring. Pass three and fail one, and nobody moves in.',
      keyTakeaway: 'Good architecture isn’t one clever service. It’s every pillar considered, and every trade-off made on purpose.',
    },
    iacSnippet: `resource "aws_cloudwatch_metric_alarm" "web_cpu" {
  for_each            = { a = aws_instance.web1.id, b = aws_instance.web2.id }
  alarm_name          = "web-\${each.key}-cpu-high"
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  dimensions          = { InstanceId = each.value }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [aws_sns_topic.oncall.arn]
}`,
  },
  stages: [
    {
      title: 'Reliable core',
      brief: 'An empty account. Start with a core that survives a data-centre failure.',
      goal: 'Build load balancer → servers in two Availability Zones → a Multi-AZ database.',
    },
    {
      title: 'Fast everywhere',
      brief: 'Shoppers in twelve countries, and a 40 ms target.',
      goal: 'Put CloudFront in front of the load balancer and Redis beside the database, under 40 ms.',
    },
    {
      title: 'Secure and watched',
      brief: 'Launch day brings bots, and the auditors.',
      goal: 'Put a WAF in front of CloudFront, watch both servers with CloudWatch, and reach a security score of 100 with no errors.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('first', 0, 0, 'Rio’s First Server'),
        alb(),
        ec2('web1', 3, -1, 'Server A'),
        ec2('web2', 3, 1, 'Server B'),
        block('db', 'rds', 6, 0, { name: 'Orders DB', config: { multiAZ: true } }),
        block('cdn', 'cloudfront', -3, 0, { name: 'CloudFront' }),
        block('cache', 'redis', 6, 2, { name: 'Redis Cache' }),
        block('shield', 'waf', -4, 0, { name: 'WAF' }),
        block('mon', 'cloudwatch', 7, 2, { name: 'CloudWatch' }),
      ],
      [wire('users', 'first')],
    ),
    start: ['users', 'first'],
    beats: [
      { t: 'wire', ids: ['users--first'] },
      { t: 'caption', text: 'Two years ago, Rio’s shop was one server and a lot of hope.' },
      { t: 'traffic', rps: 50, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'first' },
      { t: 'speech', who: 'founder', text: 'Tomorrow we open in twelve countries. I keep thinking about that first server.' },
      { t: 'speech', who: 'cto', text: 'Everything since has been a lesson. Tonight we build it all again, properly.' },
      { t: 'remove', ids: ['first'] },
      { t: 'camera', shot: 'top' },
      { t: 'spawn', ids: ['alb', 'web1', 'web2', 'db'], hold: 900 },
      { t: 'spawn', ids: ['cdn', 'cache'], hold: 900 },
      { t: 'spawn', ids: ['shield', 'mon'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'alb' },
      { t: 'speech', who: 'security', text: 'Bots at the edge, encrypted data, alarms on everything. I’ll be watching the logs with you.' },
      { t: 'speech', who: 'finance', text: 'And I’ll be watching the bill. Respectfully.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Final assessment. Build it pillar by pillar: reliable, fast, secure and watched.' },
    ],
  },
  wrong: {
    stage: 3,
    why: 'trusting CloudFront alone to stop the bots',
    change: { remove: ['shield'], wire: 'users-cdn' },
    fails: 's3-3',
  },
};

export const MODULE_13_STORIES: Record<number, LevelStory> = {
  121: level121,
  122: level122,
  123: level123,
  124: level124,
  125: level125,
  126: level126,
  127: level127,
  128: level128,
  129: level129,
  130: level130,
};
