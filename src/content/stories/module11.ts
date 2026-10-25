/**
 * Module 11: Pricing & Cost. The rush is over and the AWS bill isn’t. Rio is raising money,
 * Tom has a target, and every line of the bill has to justify itself.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ec2', gridX, gridZ, { name, config });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });

const level101: LevelStory = {
  text: {
    title: 'Ghosts on the Bill',
    tagline: 'Before you optimise anything, stop paying for what nobody uses.',
    concepts: ['Pay-as-you-go pricing', 'Idle resources', 'AWS Cost Explorer'],
    briefing:
      'The Black Friday rush is long over, but the bill is three times what it was in the summer. Three servers that serve nobody are still running. Delete them, keep the shop online, and get the bill under $60 a month.',
    docTips: [
      'Cost Explorer breaks the bill down by service and by tag. Group by an “Owner” tag and anything untagged stands out at once.',
    ],
    conceptCard: {
      title: 'Pay as you go',
      summary:
        'AWS bills most resources by the second or the hour for as long as they exist, whether anyone uses them or not. Nothing switches itself off when the project ends.',
      analogy: 'A hire car you never returned: the meter runs whether or not you drive it.',
      keyTakeaway: 'Pay-as-you-go cuts both ways. You pay for everything that’s running, used or not.',
    },
    iacSnippet: `resource "aws_budgets_budget" "monthly" {
  name         = "monthly-total"
  budget_type  = "COST"
  limit_amount = "60"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = ["finance@example.com"]
  }
}`,
  },
  stages: [
    {
      title: 'Ghost hunt',
      brief: 'Three servers nobody remembers cost more than the two that run the shop.',
      goal: 'Delete the three idle servers, keep the shop online, and bring the bill under $60 a month.',
      hint: 'Anything with no wire to it is serving nobody. The live servers are the two behind the load balancer.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web1', 1, -1, 'Server A'),
        ec2('web2', 1, 1, 'Server B'),
        ec2('z1', 2, -3, 'Old Build Box'),
        ec2('z2', 2, 3, 'Hackathon Demo'),
        ec2('z3', 4, 0, 'Load Test Rig', { instanceType: 'm5.large' }),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2')],
    ),
    start: ['users', 'alb', 'web1', 'web2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2'] },
      { t: 'caption', text: 'January. The Black Friday rush is over. The AWS bill didn’t get the memo.' },
      { t: 'traffic', rps: 200, expect: 'served' },
      { t: 'speech', who: 'finance', text: 'Sales are back to normal, and the bill is three times last summer’s. Rio’s investors will ask why.' },
      { t: 'spawn', ids: ['z1', 'z2', 'z3'], hold: 900 },
      { t: 'camera', shot: 'top' },
      { t: 'callout', on: 'z3', title: 'Load Test Rig', body: 'm5.large · idle since November', tone: 'bad' },
      { t: 'callout', on: 'z2', title: 'Hackathon Demo', body: 'Owner: unknown', tone: 'warn' },
      { t: 'stat', label: 'Spent on idle servers', value: 140, prefix: '$', unit: '/mo', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'The rig was for the Black Friday load tests. I meant to delete it that Saturday.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Find every server that serves nobody, and switch it off for good.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the load-test rig for next year',
    change: { add: 'z3:ec2@4,0' },
    fails: 's1-1',
  },
};

const level102: LevelStory = {
  text: {
    title: 'Billed by the Request',
    tagline: 'Stop renting a server for an API that spends its day waiting.',
    concepts: ['AWS Lambda', 'Pay per request', 'Idle cost'],
    briefing:
      'Suppliers check their sales figures through the Reports API: about 20 requests a second, in a few short bursts a day. A $110-a-month server waits around the rest of the time. Replace it with a Lambda function, which costs nothing between requests.',
    docTips: [
      'Lambda bills per request and per millisecond of run time. The always-free tier covers 1 million requests and 400,000 GB-seconds every month.',
    ],
    conceptCard: {
      title: 'Serverless pricing',
      summary:
        'A server costs the same whether it answers one request or a million. Lambda charges only for each invocation and the time it runs, so a quiet workload costs very little.',
      analogy: 'Paying a taxi by the journey instead of keeping a chauffeur on salary.',
      keyTakeaway: 'For quiet or spiky work, pay per request. For heavy, steady load, a committed server can still be cheaper.',
    },
    iacSnippet: `resource "aws_lambda_function" "reports" {
  function_name = "reports-api"
  role          = aws_iam_role.reports.arn
  runtime       = "nodejs22.x"
  handler       = "index.handler"
  filename      = "reports.zip"
  memory_size   = 256
}`,
  },
  stages: [
    {
      title: 'Pay per request',
      brief: 'A $110 server sits behind the Reports API, idle apart from a few bursts of 20 requests a second.',
      goal: 'Replace the server with a Lambda function and keep the bill under $40 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'Reports API' }),
        ec2('old', 1, 0, 'Report Server', { instanceType: 'm5.large' }),
        block('fn', 'lambda', 4, 0, { name: 'Reports Function' }),
      ],
      [wire('users', 'api'), wire('api', 'old')],
    ),
    start: ['users', 'api', 'old'],
    beats: [
      { t: 'wire', ids: ['users--api', 'api--old'] },
      { t: 'caption', text: '8 a.m. Every supplier checks yesterday’s sales. By 8:30 the Reports API is silent again.' },
      { t: 'traffic', rps: 20, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'old' },
      { t: 'callout', on: 'old', title: 'm5.large', body: 'Average CPU: 4%', tone: 'warn' },
      { t: 'stat', label: 'Monthly cost', value: 110, prefix: '$', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'We pay for this server every second of the day. Who calls it at 3 a.m.?' },
      { t: 'speech', who: 'cto', text: 'Nobody. So let’s pay per request instead. A Lambda function only runs when someone calls.' },
      { t: 'spawn', ids: ['fn'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Swap the always-on server for a function.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the server running beside Lambda',
    change: { add: 'old:ec2@1,0', wire: 'api-old' },
    fails: 's1-2',
  },
};

const level103: LevelStory = {
  text: {
    title: 'The Five-Dollar Website',
    tagline: 'Pages that never change don’t need a server.',
    concepts: ['S3 static hosting', 'Amazon CloudFront', 'Origin access control'],
    briefing:
      'Rio’s wholesale brochure is six pages and a price list, and it runs on a $110-a-month server. Move it to an S3 bucket served through CloudFront, and the bill drops to a few dollars.',
    docTips: [
      'Keep the bucket private and let CloudFront read it through origin access control. Transfer from S3 to CloudFront is free; you pay for what CloudFront sends to visitors.',
    ],
    conceptCard: {
      title: 'Static hosting',
      summary:
        'Pages that are the same for every visitor need no server at all. S3 stores the files for cents per gigabyte, and CloudFront serves them from edge locations near each visitor.',
      analogy: 'Printing a leaflet once and leaving a stack in every shop, instead of paying someone to read it aloud to each customer.',
      keyTakeaway: 'If a page is the same for every visitor, don’t run a server for it.',
    },
    iacSnippet: `resource "aws_s3_bucket" "site" {
  bucket = "rios-wholesale-brochure"
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "brochure-site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}`,
  },
  stages: [
    {
      title: 'Five-dollar website',
      brief: 'A static brochure site runs on a $110 server.',
      goal: 'Serve the site from S3 through CloudFront, for under $25 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, 0, 'Brochure Server', { instanceType: 'm5.large' }),
        block('cdn', 'cloudfront', -3, 0, { name: 'CloudFront' }),
        block('site', 's3', -2, 1, { name: 'Brochure Bucket' }),
      ],
      [wire('users', 'web')],
    ),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'Rio’s wholesale brochure: six pages, some photos, and a price list that changes twice a year.' },
      { t: 'traffic', rps: 50, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'm5.large', body: '$110 a month for six pages', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'I sized it in case it went viral. It gets about forty visitors a day.' },
      { t: 'speech', who: 'finance', text: 'So it costs more to host the brochure online than to print it.' },
      { t: 'speech', who: 'cto', text: 'Those files are the same for everyone. They belong in a bucket, not on a server.' },
      { t: 'spawn', ids: ['cdn', 'site'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'site' },
      { t: 'clear' },
      { t: 'caption', text: 'Put the site in S3 and serve it through CloudFront.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'leaving the old server running “for now”',
    change: { add: 'web:ec2@0,0', set: { web: { instanceType: 'm5.large' } }, wire: 'users-web' },
    fails: 's1-2',
  },
};

const level104: LevelStory = {
  text: {
    title: 'Download Storm',
    tagline: 'Hand out copies from the edge instead of buying a bigger server.',
    concepts: ['Amazon CloudFront', 'Data transfer out', 'Edge caching'],
    briefing:
      'The spring catalogue went out by email, and 1,200 downloads a second are hitting one small server. A server big enough would cost $110 a month. Put CloudFront in front so cached copies are served from the edge.',
    docTips: [
      'Data sent from EC2 to the internet costs about $0.09 per GB. CloudFront’s always-free tier includes 1 TB out every month, and cached files never touch your server.',
    ],
    conceptCard: {
      title: 'Edge caching',
      summary:
        'CloudFront keeps copies of popular files in edge locations around the world. Only the first request for a file goes back to your server; the rest are answered from the cache.',
      analogy: 'Stocking the bestseller in every corner shop instead of making everyone queue at the warehouse.',
      keyTakeaway: 'Cache what’s popular at the edge: faster for users, lighter for servers, cheaper per gigabyte.',
    },
    iacSnippet: `resource "aws_cloudfront_distribution" "downloads" {
  enabled = true

  origin {
    origin_id   = "download-server"
    domain_name = aws_instance.download.public_dns
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "download-server"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate { cloudfront_default_certificate = true }
}`,
  },
  stages: [
    {
      title: 'Download storm',
      brief: '1,200 downloads a second. A server big enough would cost $110 a month.',
      goal: 'Route downloads through CloudFront, with no errors and a bill under $40 a month.',
      hint: 'Put CloudFront between the users and the download server.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, 0, 'Download Server'),
        block('media', 's3', 5, 0, { name: 'Downloads Bucket' }),
        block('cdn', 'cloudfront', -3, 0, { name: 'CloudFront' }),
      ],
      [wire('users', 'web'), wire('web', 'media')],
    ),
    start: ['users', 'web', 'media'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--media'] },
      { t: 'caption', text: '9 a.m. The spring catalogue lands in 400,000 inboxes.' },
      { t: 'stat', label: 'Downloads / s', value: 1200, tone: 'warn' },
      { t: 'traffic', rps: 1200, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 't3.micro', body: 'Handles 300 a second', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Customers can’t open the catalogue. Buy the biggest server there is!' },
      { t: 'speech', who: 'finance', text: 'The big one is $110 a month, and we’d still pay for every gigabyte it sends.' },
      { t: 'speech', who: 'cto', text: 'It’s the same PDF for everyone. Let CloudFront hand out copies from the edge.' },
      { t: 'spawn', ids: ['cdn'], hold: 900 },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a bigger server instead of a CDN',
    change: { remove: ['cdn'], wire: 'users-web', set: { web: { instanceType: 'm5.large' } } },
    fails: 's1-2',
  },
};

const level105: LevelStory = {
  text: {
    title: 'Lookups, Not Joins',
    tagline: 'A key-value lookup doesn’t need a database server running all month.',
    concepts: ['Amazon DynamoDB', 'On-demand capacity', 'Access patterns'],
    briefing:
      'The gift-card checker does one thing: take a card number and return its balance. Behind it sits a $95-a-month SQL database that’s idle almost all day. Move the data to DynamoDB, billed per request.',
    docTips: [
      'DynamoDB on-demand mode bills per read and write, with no capacity to plan. Use it for low or unpredictable traffic; provisioned capacity is cheaper for steady, heavy load.',
    ],
    conceptCard: {
      title: 'Pay-per-request data',
      summary:
        'An RDS instance bills for every hour it runs, busy or not. DynamoDB in on-demand mode bills for each read and write plus storage, so a table that’s rarely touched costs very little.',
      analogy: 'A cloakroom that charges per coat, instead of renting the whole room by the month.',
      keyTakeaway: 'Match the database to the access pattern. Simple lookups by key don’t need a relational server.',
    },
    iacSnippet: `resource "aws_dynamodb_table" "gift_cards" {
  name         = "gift-cards"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "card_number"

  attribute {
    name = "card_number"
    type = "S"
  }
}`,
  },
  stages: [
    {
      title: 'Pay-per-request data',
      brief: 'A $95 database answers a few thousand balance checks a day.',
      goal: 'Move the lookups to DynamoDB and keep the bill under $60 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'API' }),
        block('fn', 'lambda', 4, 0, { name: 'Balance Checker' }),
        block('db', 'rds', 5, 0, { name: 'SQL Database' }),
        block('table', 'dynamodb', 6, 0, { name: 'Gift Cards' }),
      ],
      [wire('users', 'api'), wire('api', 'fn'), wire('fn', 'db')],
    ),
    start: ['users', 'api', 'fn', 'db'],
    beats: [
      { t: 'wire', ids: ['users--api', 'api--fn', 'fn--db'] },
      { t: 'caption', text: 'The gift-card checker: type in a card number, see the balance. That’s all it does.' },
      { t: 'traffic', rps: 50, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'SQL Database', body: 'One table, two columns, no joins', tone: 'warn' },
      { t: 'stat', label: 'Database cost', value: 95, prefix: '$', unit: '/mo', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'The function costs us eight dollars a month. The database behind it costs ninety-five.' },
      { t: 'speech', who: 'cto', text: 'It’s a lookup by key. DynamoDB charges per request, not per hour of waiting.' },
      { t: 'spawn', ids: ['table'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Move the gift cards into DynamoDB.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the SQL database as a backup',
    change: { add: 'db:rds@5,0', wire: 'fn-db' },
    fails: 's1-2',
  },
};

const level106: LevelStory = {
  text: {
    title: 'Cheaper and Faster',
    tagline: 'A cache can beat a bigger database on speed and on price.',
    concepts: ['Amazon ElastiCache', 'Read replicas', 'Caching for cost'],
    briefing:
      'Product pages read the same catalogue rows thousands of times a minute. A read replica takes some of that load for $65 a month, yet pages still take 120 ms. Put a Redis cache beside the database and retire the replica.',
    docTips: [
      'A cache answers repeated reads from memory in well under a millisecond. Give each key a TTL so price changes show up within minutes.',
    ],
    conceptCard: {
      title: 'Caching to save money',
      summary:
        'A read replica is a second full database that copies every write. A cache holds only the hot answers, in memory, so repeated reads are faster and usually cheaper to serve.',
      analogy: 'Pinning the ten most-asked questions on the noticeboard instead of hiring a second receptionist.',
      keyTakeaway: 'Before you buy more database, ask how many reads are the same question asked again.',
    },
    iacSnippet: `resource "aws_elasticache_replication_group" "catalogue" {
  replication_group_id = "catalogue-cache"
  description          = "Hot catalogue reads"
  engine               = "redis"
  node_type            = "cache.t4g.small"
  num_cache_clusters   = 1
}`,
  },
  stages: [
    {
      title: 'Cheaper and faster',
      brief: 'The read replica costs $65 a month and pages still take 120 ms.',
      goal: 'Add a Redis cache and turn off the read replica: pages under 80 ms, no errors, under $400 a month.',
      hint: 'Wire both servers to a Redis cache, then switch off the database’s read replica.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web1', 1, -1, 'Server A', { instanceType: 'm5.large' }),
        ec2('web2', 1, 1, 'Server B', { instanceType: 'm5.large' }),
        block('db', 'rds', 5, 0, { name: 'Catalogue DB', config: { readReplica: true } }),
        block('cache', 'redis', 5, 1, { name: 'Catalogue Cache' }),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'db'), wire('web2', 'db')],
    ),
    start: ['users', 'alb', 'web1', 'web2', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2', 'web1--db', 'web2--db'] },
      { t: 'caption', text: 'Every product page asks the catalogue the same questions: price, stock, photos.' },
      { t: 'traffic', rps: 2000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Read replica', body: '+$65 a month', tone: 'warn' },
      { t: 'stat', label: 'Page load', value: 120, unit: 'ms', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'We bought the replica to make pages faster. They’re still slow, and now they cost more.' },
      { t: 'speech', who: 'cto', text: 'Most of those reads are the same twenty products. Keep the answers in memory.' },
      { t: 'spawn', ids: ['cache'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'cache' },
      { t: 'clear' },
      { t: 'caption', text: 'Add a Redis cache, then retire the replica.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a cache and the replica as well',
    change: { set: { db: { readReplica: true } } },
    fails: 's1-1',
  },
};

const level107: LevelStory = {
  text: {
    title: 'Paying for the Peak',
    tagline: 'Stop running the busiest hour of the year all year round.',
    concepts: ['Elasticity', 'EC2 Auto Scaling', 'Savings Plans'],
    briefing:
      'Four large servers run around the clock, sized for a peak of 1,500 requests a second that lasts two hours a day. Replace them with an Auto Scaling Group that grows for the peak, shrinks after it, and can’t run up the bill.',
    docTips: [
      'Cover the steady baseline with a Compute Savings Plan (up to 66% off on-demand) and let Auto Scaling add on-demand or Spot capacity for the peaks.',
    ],
    conceptCard: {
      title: 'Elasticity',
      summary:
        'On premises you buy for the peak and pay for it all year. In the cloud, capacity can follow demand: an Auto Scaling Group adds servers as load rises and removes them as it falls.',
      analogy: 'Calling in extra staff for the Saturday rush instead of keeping them on the payroll all week.',
      keyTakeaway: 'Pay for the load you have each hour, not for the busiest hour of the year.',
    },
    iacSnippet: `resource "aws_autoscaling_group" "web" {
  name                = "web-fleet"
  min_size            = 1
  max_size            = 3
  vpc_zone_identifier = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  target_group_arns   = [aws_lb_target_group.web.arn]

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
}`,
  },
  stages: [
    {
      title: 'Elastic spend',
      brief: 'Four large servers run all day for a two-hour peak of 1,500 requests a second.',
      goal: 'Replace them with an Auto Scaling Group that serves the peak without errors, for under $150 a month.',
      hint: 'Delete the four servers, put an Auto Scaling Group behind the load balancer, and cap its maximum at 3.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('w1', 1, -2, 'Big Server 1', { instanceType: 'm5.large' }),
        ec2('w2', 1, -1, 'Big Server 2', { instanceType: 'm5.large' }),
        ec2('w3', 1, 1, 'Big Server 3', { instanceType: 'm5.large' }),
        ec2('w4', 1, 2, 'Big Server 4', { instanceType: 'm5.large' }),
        block('fleet', 'asg', 2, 0, { name: 'Web Fleet', config: { maxCapacity: 3 } }),
      ],
      [wire('users', 'alb'), wire('alb', 'w1'), wire('alb', 'w2'), wire('alb', 'w3'), wire('alb', 'w4')],
    ),
    start: ['users', 'alb', 'w1', 'w2', 'w3', 'w4'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--w1', 'alb--w2', 'alb--w3', 'alb--w4'] },
      { t: 'caption', text: '3 a.m. Nobody is shopping. Four large servers are waiting for them anyway.' },
      { t: 'traffic', rps: 100, expect: 'served' },
      { t: 'camera', shot: 'top' },
      { t: 'stat', label: 'Average CPU', value: 9, unit: '%', tone: 'warn' },
      { t: 'stat', label: 'Monthly cost', value: 440, prefix: '$', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'Four hundred and forty dollars a month, for a peak that lasts two hours a day.' },
      { t: 'speech', who: 'oncall', text: 'They were sized for Black Friday. Nobody ever scaled them back down.' },
      { t: 'spawn', ids: ['fleet'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'fleet' },
      { t: 'speech', who: 'cto', text: 'Let the fleet follow the traffic: three servers at lunch, one at night, and a ceiling on the bill.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'an Auto Scaling Group with no sensible ceiling',
    change: { set: { fleet: { maxCapacity: 6 } } },
    fails: 's1-2',
  },
};

const level108: LevelStory = {
  text: {
    title: 'Night Shift',
    tagline: 'Queue the midnight burst instead of paying all day for it.',
    concepts: ['Amazon SQS', 'AWS Lambda', 'Smoothing bursts'],
    briefing:
      'At midnight every marketplace seller uploads their stock file: 4,000 updates a second for ten minutes. A $210 server waits all day for that burst. Put the jobs in an SQS queue and let a Lambda function work through them.',
    docTips: [
      'SQS keeps messages for 4 days by default (up to 14), so a burst waits safely in the queue. Lambda polls the queue and adds workers as it grows.',
    ],
    conceptCard: {
      title: 'Queues absorb bursts',
      summary:
        'A queue accepts work as fast as it arrives and hands it out as fast as workers can take it. You size the workers for a steady rate, not the peak, and nothing is dropped.',
      analogy: 'The ticket machine at a deli counter: the crowd takes numbers, and the staff serve them in order.',
      keyTakeaway: 'If the work can wait a few seconds, queue it, and stop paying for peak-sized servers.',
    },
    iacSnippet: `resource "aws_sqs_queue" "jobs" {
  name                       = "stock-updates"
  visibility_timeout_seconds = 300
}

resource "aws_lambda_event_source_mapping" "jobs" {
  event_source_arn = aws_sqs_queue.jobs.arn
  function_name    = aws_lambda_function.worker.arn
  batch_size       = 10
}`,
  },
  stages: [
    {
      title: 'Night jobs',
      brief: 'Nightly bursts of 4,000 jobs a second. The giant server idles the rest of the day.',
      goal: 'Queue the jobs in SQS for a Lambda worker, with no errors and a bill under $60 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'Jobs API' }),
        ec2('big', 1, 0, 'Batch Server', { instanceType: 'c6g.xlarge' }),
        block('q', 'sqs', 5, 0, { name: 'Jobs Queue' }),
        block('worker', 'lambda', 4, 1, { name: 'Worker' }),
      ],
      [wire('users', 'api'), wire('api', 'big')],
    ),
    start: ['users', 'api', 'big'],
    beats: [
      { t: 'wire', ids: ['users--api', 'api--big'] },
      { t: 'caption', text: 'Midnight. Two hundred sellers upload their stock files at once.' },
      { t: 'stat', label: 'Jobs / s', value: 4000, tone: 'warn' },
      { t: 'traffic', rps: 4000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'big' },
      { t: 'callout', on: 'big', title: 'c6g.xlarge', body: 'Busy 10 minutes a day', tone: 'warn' },
      { t: 'stat', label: 'Monthly cost', value: 210, prefix: '$', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'Two hundred and ten dollars a month for ten minutes of work a night?' },
      { t: 'speech', who: 'cto', text: 'Stock updates can wait a few seconds. Queue them, and let a function drain the queue.' },
      { t: 'spawn', ids: ['q', 'worker'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Put a queue between the API and the work.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'Lambda without a queue to absorb the burst',
    change: { remove: ['q'], wire: 'api-worker' },
    fails: 's1-2',
  },
};

const level109: LevelStory = {
  text: {
    title: 'Cut Fat, Not Muscle',
    tagline: 'Hit the budget without selling off your resilience.',
    concepts: ['Cost versus reliability', 'Unattached EBS volumes', 'Multi-AZ'],
    briefing:
      'Tom needs the bill under $240 a month before Rio meets the investors. The quickest saving is switching off the database’s Multi-AZ standby, and that’s the one thing you mustn’t touch. Find the real waste instead.',
    docTips: [
      'EBS volumes keep billing after their instance is terminated. Look for volumes in the “available” state: nothing is attached to them.',
    ],
    conceptCard: {
      title: 'Savings with guardrails',
      summary:
        'Cost optimisation removes what adds no value: idle servers, orphaned volumes, capacity nobody reads. A standby that protects customers isn’t waste, even though it sits idle until the day it’s needed.',
      analogy: 'Cancelling the gym membership you never use, not the home insurance you’ve never claimed on.',
      keyTakeaway: 'Cut waste first. Never buy savings with the resilience your customers rely on.',
    },
    iacSnippet: `resource "aws_db_instance" "orders" {
  identifier                  = "orders"
  engine                      = "postgres"
  instance_class              = "db.t4g.medium"
  allocated_storage           = 50
  multi_az                    = true
  storage_encrypted           = true
  username                    = "app"
  manage_master_user_password = true
}`,
  },
  stages: [
    {
      title: 'Budget audit',
      brief: 'Tom wants the bill under $240 a month, without risking uptime.',
      goal: 'Cut the waste to get under $240 a month, with no errors, and keep the database Multi-AZ.',
      hint: 'Look for things nothing is wired to, and capacity nobody needs at 500 requests a second.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web1', 1, -1, 'Server A'),
        ec2('web2', 1, 1, 'Server B'),
        block('db', 'rds', 5, 0, { name: 'Orders DB', config: { multiAZ: true, readReplica: true } }),
        block('z1', 'ebs', 2, -3, { name: 'Stray Volume' }),
        ec2('z2', 2, 3, 'Spare Server'),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'db'), wire('web2', 'db')],
    ),
    start: ['users', 'alb', 'web1', 'web2', 'db', 'z1', 'z2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2', 'web1--db', 'web2--db'] },
      { t: 'caption', text: 'Rio is raising money, and the investors want to see the AWS bill.' },
      { t: 'traffic', rps: 500, expect: 'served' },
      { t: 'stat', label: 'Monthly bill', value: 333, prefix: '$', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'I promised them under $240. Easy win: switch off that standby database.' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Multi-AZ standby', body: 'Saves $85. Risks every order.', tone: 'bad' },
      { t: 'speech', who: 'cto', text: 'That standby is why the next power cut costs us a minute, not forty-seven. Find something else.' },
      { t: 'camera', shot: 'top' },
      { t: 'callout', on: 'z1', title: 'Stray Volume', body: 'Attached to nothing', tone: 'warn' },
      { t: 'callout', on: 'z2', title: 'Spare Server', body: 'No traffic', tone: 'warn' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'saving $85 by switching off the standby',
    change: { set: { db: { multiAZ: false } } },
    fails: 's1-1',
  },
};

const level110: LevelStory = {
  text: {
    title: 'Slash the Bill',
    tagline: 'Assessment: rebuild the old trade portal for a quarter of the price.',
    concepts: ['Architecting for cost', 'Static hosting', 'Serverless'],
    briefing:
      'The trade portal is the last big line on the bill: a monolith and its database, $305 a month. Half its traffic is pages that never change. Move those to S3 and CloudFront, then rebuild the rest on API Gateway, Lambda and DynamoDB for under $80.',
    docTips: [
      'Move the static content first. It’s the easiest win, and the server has less to do while you rebuild the rest.',
      'Run the old and new stacks side by side, move the traffic, then switch the old one off. A saving only counts once the old resources are gone.',
    ],
    conceptCard: {
      title: 'Architecting for cost',
      summary:
        'The biggest savings come from changing the shape of an architecture, not haggling over instance sizes. Static content goes to S3 and a CDN; quiet or spiky APIs go serverless and bill per request.',
      analogy: 'Swapping a staffed shop that’s empty most of the day for a website and a click-and-collect locker.',
      keyTakeaway: 'Match each part of the workload to the cheapest service that fits its shape.',
    },
    iacSnippet: `resource "aws_apigatewayv2_api" "trade" {
  name          = "trade-portal"
  protocol_type = "HTTP"
  target        = aws_lambda_function.trade.arn
}`,
  },
  stages: [
    {
      title: 'Static first',
      brief: 'Half the portal’s traffic is price lists and photos that never change.',
      goal: 'Serve the static pages from S3 through CloudFront.',
    },
    {
      title: 'Slash the bill',
      brief: 'The monolith and its database still cost $305 a month.',
      goal: 'Replace them with API Gateway → Lambda → DynamoDB, and get the bill under $80 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('mono', 1, 0, 'Trade Portal', { instanceType: 'c6g.xlarge' }),
        block('db', 'rds', 5, 0, { name: 'Portal DB' }),
        block('cdn', 'cloudfront', -3, 0, { name: 'CloudFront' }),
        block('site', 's3', -2, 1, { name: 'Static Pages' }),
        block('api', 'apigw', -2, -1, { name: 'Trade API' }),
        block('fn', 'lambda', 4, -1, { name: 'Trade Function' }),
        block('table', 'dynamodb', 6, -1, { name: 'Trade Table' }),
      ],
      [wire('users', 'mono'), wire('mono', 'db')],
    ),
    start: ['users', 'mono', 'db'],
    beats: [
      { t: 'wire', ids: ['users--mono', 'mono--db'] },
      { t: 'caption', text: 'Friday. Rio’s funding round closes on Monday, and one line on the bill dwarfs the rest.' },
      { t: 'traffic', rps: 200, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'mono' },
      { t: 'callout', on: 'mono', title: 'Trade Portal', body: 'Monolith and database: $305 a month', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'Get this under eighty dollars and I can show the investors a bill that grows slower than sales.' },
      { t: 'speech', who: 'oncall', text: 'Half its traffic is price lists and photos. The other half is a few small API calls.' },
      { t: 'speech', who: 'cto', text: 'Then stop running one big machine for both. Static pages to the edge, the API to functions.' },
      { t: 'spawn', ids: ['cdn', 'site'] },
      { t: 'spawn', ids: ['api', 'fn', 'table'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'stat', label: 'Target bill', value: 80, prefix: '$', unit: '/mo', tone: 'good' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'keeping the monolith on as a fallback',
    change: { add: 'mono:ec2@1,0', wire: 'users-mono' },
    fails: 's2-2',
  },
};

export const MODULE_11_STORIES: Record<number, LevelStory> = {
  101: level101,
  102: level102,
  103: level103,
  104: level104,
  105: level105,
  106: level106,
  107: level107,
  108: level108,
  109: level109,
  110: level110,
};
