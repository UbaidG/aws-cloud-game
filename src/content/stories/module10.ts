/**
 * Module 10: Monitoring & Operations. Rio’s shop is secure now, but one Sunday it goes down and
 * nobody notices for three hours. Maya builds proper operations, one signal at a time: metrics,
 * an audit trail, alarms that wake someone, and finally an ops centre.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ec2', gridX, gridZ, { name, config });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });
const mon = (gridX = 6, gridZ = 2) => block('mon', 'cloudwatch', gridX, gridZ, { name: 'CloudWatch' });
const trail = (gridX = 6, gridZ = 2) => block('trail', 'cloudtrail', gridX, gridZ, { name: 'CloudTrail' });
const page = (gridX = 6, gridZ = 0) => block('page', 'sns', gridX, gridZ, { name: 'On-call Pager' });

const level91: LevelStory = {
  text: {
    title: 'Radar On',
    tagline: 'Find out the shop is down before your customers do.',
    concepts: ['Amazon CloudWatch', 'Metrics', 'Status checks'],
    briefing:
      'Last Sunday the web server stopped answering at 6:10 a.m., and nobody knew until a customer posted about it three hours later. Point CloudWatch at the server so its health is measured all the time.',
    docTips: [
      'EC2 sends basic metrics such as CPU, network and status checks to CloudWatch every five minutes at no charge. Memory and disk space need the CloudWatch agent installed on the instance.',
    ],
    conceptCard: {
      title: 'Amazon CloudWatch',
      summary:
        'CloudWatch collects metrics and logs from your AWS resources, draws them on dashboards, and lets you set alarms on any metric, such as CPU above 80% or a failed status check.',
      analogy: 'The dashboard in a car: speed, fuel and engine temperature, all the time, without opening the bonnet.',
      keyTakeaway: 'You can’t fix what you can’t see. Measure every server from the day it launches.',
    },
    iacSnippet: `resource "aws_cloudwatch_metric_alarm" "web_status" {
  alarm_name          = "web-status-check-failed"
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  dimensions          = { InstanceId = aws_instance.web.id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
}`,
  },
  stages: [
    {
      title: 'Radar on',
      brief: 'You find out the shop is down when customers post about it.',
      goal: 'Monitor the web server with CloudWatch.',
      hint: 'Place CloudWatch and wire it to the server it should watch.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server'), mon()], [wire('users', 'web')]),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'Sunday, 6:10 a.m. The web server runs out of memory and stops answering.' },
      { t: 'crash', id: 'web' },
      { t: 'traffic', expect: 'blocked', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Not responding', body: 'Since 6:10 a.m.', tone: 'bad' },
      { t: 'stat', label: 'Minutes before anyone noticed', value: 190, tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'I found out from a customer asking online if we’d gone bust. Three hours!' },
      { t: 'speech', who: 'cto', text: 'We locked every door and then stopped looking at the building. CloudWatch keeps an eye on it for us.' },
      { t: 'spawn', ids: ['mon'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Give the server a set of eyes.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'CloudWatch on the board but watching nothing',
    change: { unwire: 'mon-web' },
    fails: 's1-1',
  },
};

const level92: LevelStory = {
  text: {
    title: 'Who Did That?',
    tagline: 'Metrics say what happened. CloudTrail says who did it.',
    concepts: ['AWS CloudTrail', 'Audit logs', 'API calls'],
    briefing:
      'Overnight, someone opened port 22 on the web server to the whole internet, and nobody admits to it. Turn on a CloudTrail trail so every change to your account is recorded with who made it, when and from where.',
    docTips: [
      'CloudTrail’s event history shows the last 90 days of management events for free. A trail keeps them in S3 for as long as you like, and can cover every Region in the account.',
    ],
    conceptCard: {
      title: 'AWS CloudTrail',
      summary:
        'Every action in AWS, from the console, the CLI or code, is an API call. CloudTrail records each one: the identity, the time, the source IP address and the request.',
      analogy: 'The visitors’ book and CCTV at reception: not how busy the building is, but who came in and what they touched.',
      keyTakeaway: 'CloudWatch tells you how things are running. CloudTrail tells you who changed them.',
    },
    iacSnippet: `resource "aws_cloudtrail" "account" {
  name                          = "account-trail"
  s3_bucket_name                = aws_s3_bucket.audit.id
  is_multi_region_trail         = true
  include_global_service_events = true
  enable_log_file_validation    = true
}`,
  },
  stages: [
    {
      title: 'Who did that?',
      brief: 'A firewall rule changed last night. Nobody knows who changed it.',
      goal: 'Record the server’s API activity with CloudTrail.',
      hint: 'Place CloudTrail and wire it to the web server.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server'), trail()], [wire('users', 'web')]),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'caption', text: 'Tuesday morning. Port 22 on the web server is open to the world again.' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Inbound rule added', body: 'Port 22 from 0.0.0.0/0, 23:47 last night', tone: 'warn' },
      { t: 'speech', who: 'security', text: 'Who did this? And was it even one of us, or a key we didn’t know had leaked?' },
      { t: 'speech', who: 'oncall', text: 'The CPU graph is flat all night. Metrics don’t say who clicked what.' },
      { t: 'stat', label: 'People with admin access', value: 4, tone: 'warn' },
      { t: 'spawn', ids: ['trail'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'trail' },
      { t: 'speech', who: 'cto', text: 'CloudTrail does. Every API call, who made it, when and from where.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'expecting CloudWatch metrics to say who made a change',
    change: { remove: ['trail'], add: 'mon:cloudwatch@6,2', wire: 'mon-web' },
    fails: 's1-1',
  },
};

const level93: LevelStory = {
  text: {
    title: 'Wake Someone Up',
    tagline: 'An alarm nobody hears is just a log entry.',
    concepts: ['CloudWatch alarms', 'Amazon SNS', 'On-call paging'],
    briefing:
      'CloudWatch is watching the server, and at 2:14 a.m. its alarm went red, but nobody saw it until 9:00. Send the alarm to an SNS topic so the person on call gets a message the moment it fires.',
    docTips: [
      'A CloudWatch alarm can notify an SNS topic, which fans the message out to email, SMS, an HTTPS endpoint for a paging tool, or a Lambda function. Alarm on symptoms customers feel, not every blip.',
    ],
    conceptCard: {
      title: 'Alarms and notifications',
      summary:
        'An alarm watches one metric against a threshold and changes state to ALARM when it’s crossed. Its action, usually an SNS topic, is what turns that state change into someone’s phone ringing.',
      analogy: 'A smoke detector wired to the fire station, not just one that beeps in an empty house.',
      keyTakeaway: 'Every alarm needs someone to tell. Alert from outside the thing that’s failing.',
    },
    iacSnippet: `resource "aws_sns_topic" "oncall" {
  name = "oncall-pager"
}

resource "aws_sns_topic_subscription" "dev" {
  topic_arn = aws_sns_topic.oncall.arn
  protocol  = "email"
  endpoint  = "oncall@example.com"
}

# On the alarm:
#   alarm_actions = [aws_sns_topic.oncall.arn]`,
  },
  stages: [
    {
      title: 'Wake someone up',
      brief: 'Alarms fire, but nobody is told.',
      goal: 'Send CloudWatch alarms to an SNS topic.',
      hint: 'Place SNS and wire it to CloudWatch, the thing that raises the alarm.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), mon(), page()],
      [wire('users', 'web'), wire('mon', 'web'), wire('mon', 'page')],
    ),
    start: ['users', 'web', 'mon'],
    beats: [
      { t: 'wire', ids: ['users--web', 'mon--web'] },
      { t: 'caption', text: 'CloudWatch is watching now. At 2:14 a.m. the web server stops answering.' },
      { t: 'crash', id: 'web' },
      { t: 'traffic', expect: 'blocked', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'mon' },
      { t: 'callout', on: 'mon', title: 'ALARM: StatusCheckFailed', body: 'Notified: nobody', tone: 'bad' },
      { t: 'stat', label: 'Minutes in ALARM, unseen', value: 406, tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'It fired at 2:14. I saw it at nine, when I opened the console with my coffee.' },
      { t: 'speech', who: 'cto', text: 'And the server can’t page you about itself once it’s dead. The alarm has to call someone.' },
      { t: 'spawn', ids: ['page'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Give the alarm a phone number.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'letting the server send its own alerts',
    change: { unwire: 'mon-page', wire: 'web-page' },
    fails: 's1-1',
  },
};

const level94: LevelStory = {
  text: {
    title: 'Tamper-proof Logs',
    tagline: 'Keep the audit trail somewhere nobody can quietly rewrite it.',
    concepts: ['CloudTrail log delivery', 'S3 versioning', 'Log integrity'],
    briefing:
      'CloudTrail is recording, but logs only count as evidence if nobody can quietly change them, and an intruder’s first move is to erase their tracks. Deliver the trail to its own S3 bucket with versioning on, so an overwrite or delete always leaves the original behind.',
    docTips: [
      'Versioning keeps every earlier copy of an object. For stronger guarantees add S3 Object Lock (which needs versioning) and turn on CloudTrail log file validation, which writes signed digest files.',
    ],
    conceptCard: {
      title: 'Log integrity',
      summary:
        'An audit log is only useful if you can prove it hasn’t been changed. A dedicated, versioned bucket keeps every copy, Object Lock can block deletes for a set period, and digest files prove what was written.',
      analogy: 'A bound ledger with numbered pages. You can add lines, but a torn-out page is obvious.',
      keyTakeaway: 'Store audit logs separately, versioned, and out of reach of the people they record.',
    },
    iacSnippet: `resource "aws_s3_bucket" "audit" {
  bucket              = "rio-shop-audit-logs"
  object_lock_enabled = true
}

resource "aws_s3_bucket_versioning" "audit" {
  bucket = aws_s3_bucket.audit.id
  versioning_configuration {
    status = "Enabled"
  }
}`,
  },
  stages: [
    {
      title: 'Tamper-proof logs',
      brief: 'Audit logs must be kept, and nobody may quietly overwrite them.',
      goal: 'Deliver CloudTrail logs to an S3 bucket with versioning on.',
      hint: 'Place S3, wire it to CloudTrail, then turn versioning on in the bucket’s inspector.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), trail(), block('vault', 's3', 6, 0, { name: 'Audit Bucket' })],
      [wire('users', 'web'), wire('trail', 'web')],
    ),
    start: ['users', 'web', 'trail'],
    beats: [
      { t: 'wire', ids: ['users--web', 'trail--web'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'caption', text: 'The trail found last week’s culprit: a leaked key, now deleted. Ines has a follow-up question.' },
      { t: 'camera', shot: 'close', on: 'trail' },
      { t: 'speech', who: 'security', text: 'If that key had been an admin’s, could they have deleted the logs on their way out?' },
      { t: 'callout', on: 'trail', title: 'Log destination', body: 'Not set', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Right now the logs have no home of their own. Anyone with S3 access could tidy them away.' },
      { t: 'spawn', ids: ['vault'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'vault' },
      { t: 'speech', who: 'cto', text: 'A bucket just for the trail, with versioning on. Overwrite a log and the original is still there.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a log bucket with versioning off',
    change: { set: { vault: { versioning: false } } },
    fails: 's1-2',
  },
};

const level95: LevelStory = {
  text: {
    title: 'Scaling Signal',
    tagline: 'A fleet can only scale on what it can measure.',
    concepts: ['Target tracking', 'CloudWatch metrics', 'Auto Scaling'],
    briefing:
      'Rio is on breakfast television at 7:45, and 2,000 requests a second are coming. The web fleet has no metrics to scale on and is capped at two servers. Monitor it with CloudWatch and raise its maximum to four.',
    docTips: [
      'A target tracking policy (for example, average CPU at 60%) creates and manages the CloudWatch alarms for you. The group still never grows past its maximum.',
    ],
    conceptCard: {
      title: 'Metric-driven scaling',
      summary:
        'Auto Scaling acts on CloudWatch metrics. A scaling policy watches a metric such as CPU or requests per target and adds or removes servers to hold it near a target, within the group’s minimum and maximum.',
      analogy: 'A thermostat: it needs a thermometer to read, and a boiler big enough to heat the house.',
      keyTakeaway: 'Scaling needs a signal to act on and room to grow. Miss either and the fleet stays put.',
    },
    iacSnippet: `resource "aws_autoscaling_policy" "cpu" {
  name                   = "cpu-target-60"
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60
  }
}`,
  },
  stages: [
    {
      title: 'Scaling signal',
      brief: '2,000 requests a second are coming. The fleet is capped at 2 servers and nothing measures its load.',
      goal: 'Monitor the fleet with CloudWatch and let it grow, keeping errors at 1% or less.',
      hint: 'Wire CloudWatch to the fleet, then raise its maximum to 4 servers.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), block('fleet', 'asg', 1, 0, { name: 'Web Fleet', config: { maxCapacity: 2 } }), mon()],
      [wire('users', 'alb'), wire('alb', 'fleet')],
    ),
    start: ['users', 'alb', 'fleet'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--fleet'] },
      { t: 'caption', text: '7:45 a.m. Rio is on breakfast television, and half the country is looking at the shop.' },
      { t: 'traffic', rps: 2000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'fleet' },
      { t: 'callout', on: 'fleet', title: '2 of 2 servers', body: 'CPU 100%. No scaling metric.', tone: 'bad' },
      { t: 'stat', label: 'Errors', value: 40, unit: '%', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'The group has no idea it’s busy. Nothing is feeding it a number.' },
      { t: 'spawn', ids: ['mon'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'mon' },
      { t: 'speech', who: 'cto', text: 'CloudWatch gives it the signal. And raise the ceiling, or it’ll want to grow and can’t.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a scaling signal with no room to grow',
    change: { set: { fleet: { maxCapacity: 2 } } },
    fails: 's1-2',
  },
};

const level96: LevelStory = {
  text: {
    title: 'Latency Watchdog',
    tagline: 'Watch the cache, and you see database trouble coming.',
    concepts: ['Leading indicators', 'Cache hit rate', 'Database metrics'],
    briefing:
      'Yesterday a release quietly stopped using the cache, every read fell through to the database, and pages took seconds to load. Monitor both the cache and the database, so the next drop in hit rate shows up before customers feel it.',
    docTips: [
      'Watch ElastiCache’s CacheHitRate and Evictions alongside RDS CPUUtilization, DatabaseConnections and ReadLatency. A falling hit rate is the early warning; database load is the consequence.',
    ],
    conceptCard: {
      title: 'Leading indicators',
      summary:
        'Some metrics warn you before users notice. When the cache hit rate falls, the database takes more reads, and its latency follows a few minutes later.',
      analogy: 'Falling barometer pressure tells you rain is coming before the first drop lands.',
      keyTakeaway: 'Monitor the cause, not just the symptom. The cache tells you what the database is about to do.',
    },
    iacSnippet: `resource "aws_cloudwatch_metric_alarm" "cache_hit_rate" {
  alarm_name          = "cache-hit-rate-low"
  namespace           = "AWS/ElastiCache"
  metric_name         = "CacheHitRate"
  dimensions          = { CacheClusterId = "rio-cache-001" }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "LessThanThreshold"
}`,
  },
  stages: [
    {
      title: 'Latency watchdog',
      brief: 'When the cache hit rate drops, the database melts. You need to see it coming.',
      goal: 'Monitor both the cache and the database with CloudWatch.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, 0, 'App Server'),
        block('cache', 'redis', 5, 1, { name: 'Redis Cache' }),
        block('db', 'rds', 5, -1, { name: 'Main DB' }),
        mon(),
      ],
      [wire('users', 'web'), wire('web', 'cache'), wire('web', 'db')],
    ),
    start: ['users', 'web', 'cache', 'db'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--cache', 'web--db'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'caption', text: '4 p.m. A product page update ships. It quietly stops using the cache.' },
      { t: 'camera', shot: 'close', on: 'cache' },
      { t: 'callout', on: 'cache', title: 'Hit rate', body: '92% → 31%', tone: 'warn' },
      { t: 'camera', shot: 'low', on: 'db' },
      { t: 'callout', on: 'db', title: 'CPU 98%', body: 'Read latency 900 ms', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'The database alarm went off at six. By then the pages had been slow for two hours.' },
      { t: 'speech', who: 'cto', text: 'The cache told us at four. We just weren’t listening to it.' },
      { t: 'spawn', ids: ['mon'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Watch the cache and the database together.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'watching only the database',
    change: { unwire: 'mon-cache' },
    fails: 's1-1',
  },
};

const level97: LevelStory = {
  text: {
    title: 'The Auditors’ List',
    tagline: 'A firewall, an identity and a paper trail, all on one server.',
    concepts: ['AWS WAF', 'IAM roles', 'AWS CloudTrail', 'Compliance'],
    briefing:
      'A large company wants Rio’s shop to cater for its offices, and its auditors have three questions: is there a web firewall, does the server use a role instead of keys, and is every change recorded? Answer all three on the web server.',
    docTips: [
      'Auditors ask for evidence, not intentions. AWS Audit Manager and AWS Config can collect proof that controls such as WAF, roles and CloudTrail stay switched on.',
    ],
    conceptCard: {
      title: 'Preventive and detective controls',
      summary:
        'Preventive controls (WAF, IAM roles) stop bad things happening. Detective controls (CloudTrail, CloudWatch) record what did happen. Audits expect both.',
      analogy: 'A locked door and a CCTV camera. One keeps people out; the other shows who got in anyway.',
      keyTakeaway: 'Prevent what you can, record everything, and be able to show both.',
    },
    iacSnippet: `# A web ACL attaches to a load balancer, CloudFront or API Gateway.
resource "aws_wafv2_web_acl_association" "front" {
  resource_arn = aws_lb.web.arn
  web_acl_arn  = aws_wafv2_web_acl.shop.arn
}

resource "aws_cloudtrail" "audit" {
  name           = "audit-trail"
  s3_bucket_name = aws_s3_bucket.audit.id
}`,
  },
  stages: [
    {
      title: 'Security audit',
      brief: 'The auditors want a firewall, an identity and a paper trail.',
      goal: 'Send users through WAF to the load balancer, give the server an IAM role, and record it with CloudTrail.',
      hint: 'WAF goes between the users and the load balancer; the role and the trail both wire to the server.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('shield', 'waf', -3, 0, { name: 'Web Firewall' }),
        block('alb', 'alb', -1, 0, { name: 'Load Balancer' }),
        ec2('web', 1, 0, 'Web Server'),
        block('role', 'iam', 6, -2, { name: 'Web Server Role' }),
        trail(),
      ],
      [wire('users', 'alb'), wire('alb', 'web')],
    ),
    start: ['users', 'alb', 'web'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web'] },
      { t: 'caption', text: 'A large company wants Rio’s shop to cater for all its offices. First, its auditors send a list.' },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Audit questions', body: 'Firewall? Identity? Change log?', tone: 'warn' },
      { t: 'speech', who: 'finance', text: 'Three questions between us and the biggest contract we’ve ever had.' },
      { t: 'speech', who: 'security', text: 'We’ve done each one before. This time they all go on the same server, at once.' },
      { t: 'spawn', ids: ['shield', 'role', 'trail'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'web' },
      { t: 'clear' },
      { t: 'caption', text: 'A firewall in front, an identity on the server, and a trail behind it.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'calling the security group a web firewall',
    change: { remove: ['shield'], wire: 'users-alb' },
    fails: 's1-1',
  },
};

const level98: LevelStory = {
  text: {
    title: 'Queue Depth',
    tagline: 'Everything is green, and orders are three hours late.',
    concepts: ['Amazon SQS metrics', 'Queue backlog', 'Asynchronous systems'],
    briefing:
      'The sale is pushing 6,000 orders a second into the queue, and the API says every one was accepted. But the worker is falling behind, and customers are asking why nothing has shipped. Point CloudWatch at the queue so a backlog is visible.',
    docTips: [
      'The SQS metrics that matter are ApproximateNumberOfMessagesVisible (the backlog) and ApproximateAgeOfOldestMessage (how late the slowest order is). Alarm on the age.',
    ],
    conceptCard: {
      title: 'Watching a queue',
      summary:
        'A queue hides overload: the front end stays fast while work piles up behind it. The backlog and the age of the oldest message show whether consumers are keeping up.',
      analogy: 'A restaurant where the waiters take every order instantly, while the kitchen tickets pile up on the rail.',
      keyTakeaway: 'In an asynchronous system, the queue is the health check. Watch its depth and its age.',
    },
    iacSnippet: `resource "aws_cloudwatch_metric_alarm" "orders_backlog" {
  alarm_name          = "orders-oldest-message-age"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateAgeOfOldestMessage"
  dimensions          = { QueueName = aws_sqs_queue.orders.name }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 5
  threshold           = 600
  comparison_operator = "GreaterThanThreshold"
}`,
  },
  stages: [
    {
      title: 'Queue depth',
      brief: 'If the queue backs up, orders arrive hours late and nobody notices.',
      goal: 'Watch the queue with CloudWatch, keeping orders flowing from the API through the queue to the worker.',
      hint: 'Wire CloudWatch to the queue itself, not to the API or the worker.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'Orders API' }),
        block('q', 'sqs', 5, 0, { name: 'Orders Queue' }),
        block('worker', 'lambda', 4, 1, { name: 'Order Worker' }),
        mon(),
      ],
      [wire('users', 'api'), wire('api', 'q'), wire('q', 'worker')],
    ),
    start: ['users', 'api', 'q', 'worker'],
    beats: [
      { t: 'wire', ids: ['users--api', 'api--q', 'q--worker'] },
      { t: 'caption', text: 'Saturday sale. The queue soaks up 6,000 orders a second, exactly as designed.' },
      { t: 'traffic', rps: 6000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'q' },
      { t: 'callout', on: 'q', title: 'Oldest message', body: '3 h 12 min', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Customers want to know why a “confirmed” order still hasn’t shipped.' },
      { t: 'speech', who: 'oncall', text: 'The API returns 200 and the worker shows no errors. Everything’s green, and orders are hours late.' },
      { t: 'spawn', ids: ['mon'], hold: 900 },
      { t: 'camera', shot: 'top' },
      { t: 'speech', who: 'cto', text: 'Then we’re watching the wrong thing. Watch the queue.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'watching the worker instead of the queue',
    change: { unwire: 'mon-q', wire: 'mon-worker' },
    fails: 's1-1',
  },
};

const level99: LevelStory = {
  text: {
    title: 'Audit Ready',
    tagline: 'Metrics on every server, and a record of every database change.',
    concepts: ['Compliance monitoring', 'Per-instance metrics', 'AWS CloudTrail'],
    briefing:
      'The catering contract is signed, and the client’s compliance team will check evidence every quarter. They want metrics from each server and the database, and a record of every change made to the database.',
    docTips: [
      'CloudTrail answers “who changed it?”. AWS Config answers “what did it look like on any given day?”. Compliance reviews usually ask for both, and AWS Artifact supplies AWS’s own audit reports.',
    ],
    conceptCard: {
      title: 'Observability for compliance',
      summary:
        'Auditors want to see that every component is measured and every change is attributable. An average across the fleet can hide one failing server, so each one is monitored on its own.',
      analogy: 'A ward nurse checks every patient’s chart, not the average temperature of the ward.',
      keyTakeaway: 'Monitor every server individually, and keep an audit trail for the data that matters most.',
    },
    iacSnippet: `resource "aws_cloudwatch_metric_alarm" "db_storage" {
  alarm_name          = "customer-db-free-storage-low"
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.customers.identifier }
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5000000000
  comparison_operator = "LessThanThreshold"
}`,
  },
  stages: [
    {
      title: 'Audit ready',
      brief: 'Compliance needs metrics on every server and the database, and a record of every change.',
      goal: 'Wire CloudWatch to both servers and the database, and CloudTrail to the database.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web1', 1, -1, 'Server A'),
        ec2('web2', 1, 1, 'Server B'),
        block('db', 'rds', 5, 0, { name: 'Customer DB' }),
        mon(),
        trail(6, -2),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'db'), wire('web2', 'db')],
    ),
    start: ['users', 'alb', 'web1', 'web2', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2', 'web1--db', 'web2--db'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'caption', text: 'The catering contract is signed. The client’s compliance team will want evidence every quarter.' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Customer DB', body: 'Who changed it? When? From where?', tone: 'warn' },
      { t: 'spawn', ids: ['mon', 'trail'], hold: 900 },
      { t: 'speech', who: 'oncall', text: 'Can’t we just watch the load balancer? Every request goes through it.' },
      { t: 'speech', who: 'cto', text: 'It shows the average. One sick server hides in an average. Watch each one.' },
      { t: 'camera', shot: 'top' },
      { t: 'clear' },
      { t: 'caption', text: 'Eyes on every server and the database, and a trail on the data.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'watching the load balancer instead of each server',
    change: { unwire: 'mon-web1 mon-web2', wire: 'mon-alb' },
    fails: 's1-1',
  },
};

const level100: LevelStory = {
  text: {
    title: 'Ops Centre',
    tagline: 'Assessment: build the platform, then make sure it can never fail silently.',
    concepts: ['Auto Scaling', 'CloudWatch alarms', 'Amazon SNS', 'AWS CloudTrail'],
    briefing:
      'Rio has one wish for the new year: never hear about an outage from a customer again. Build a self-scaling platform for 1,500 requests a second, then give it an ops centre that watches the fleet and the database, pages on-call through SNS, and audits every database change.',
    docTips: [
      'Build the request path first and test it under load. Monitoring a system that doesn’t work yet only tells you it doesn’t work.',
      'Managed doesn’t mean monitored. AWS keeps RDS running, but storage, connections and slow queries are yours to watch, just as in the shared responsibility model.',
    ],
    conceptCard: {
      title: 'Operational excellence',
      summary:
        'A production system needs four things: metrics on every tier, alarms on the ones customers feel, a way to reach whoever is on call, and an audit trail of every change.',
      analogy: 'An airport control tower: radar on every runway, a radio to every pilot, and a log of every instruction given.',
      keyTakeaway: 'If it can break, measure it. If it breaks, page someone. If it changed, know who changed it.',
    },
    iacSnippet: `resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "shop-5xx-errors"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  dimensions          = { LoadBalancer = aws_lb.shop.arn_suffix }
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 3
  threshold           = 10
  comparison_operator = "GreaterThanThreshold"
  alarm_actions       = [aws_sns_topic.oncall.arn]
}`,
  },
  stages: [
    {
      title: 'The platform',
      brief: 'An empty account and 1,500 requests a second to serve.',
      goal: 'Users → ALB → Auto Scaling Group → RDS, with errors at 1% or less.',
    },
    {
      title: 'Ops centre',
      brief: 'Nobody should ever learn about an outage from a customer again.',
      goal: 'Watch the fleet and the database with CloudWatch, page on-call through SNS, and record database changes with CloudTrail.',
      hint: 'CloudWatch wires to the fleet, the database and SNS. CloudTrail wires to the database.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        block('fleet', 'asg', 1, 0, { name: 'Web Fleet' }),
        block('db', 'rds', 5, 0, { name: 'Orders DB' }),
        mon(),
        page(7, 2),
        trail(6, -2),
      ],
      [wire('users', 'alb'), wire('alb', 'fleet'), wire('fleet', 'db'), wire('mon', 'fleet'), wire('mon', 'db'), wire('mon', 'page'), wire('trail', 'db')],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'New Year’s Eve. Rio has one resolution for the shop, and it’s Maya’s problem.' },
      { t: 'speech', who: 'founder', text: 'Promise me I never hear about an outage from a customer again.' },
      { t: 'spawn', ids: ['alb', 'fleet', 'db'] },
      { t: 'wire', ids: ['users--alb', 'alb--fleet', 'fleet--db'] },
      { t: 'traffic', rps: 1500, expect: 'served' },
      { t: 'stat', label: 'Requests / s', value: 1500, tone: 'info' },
      { t: 'speech', who: 'cto', text: 'First the platform. Then eyes on every tier, a pager for Dev, and a record of every change.' },
      { t: 'spawn', ids: ['mon', 'page', 'trail'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'mon' },
      { t: 'wire', ids: ['mon--fleet', 'mon--page'] },
      { t: 'speech', who: 'oncall', text: 'And the database? AWS runs that for us.' },
      { t: 'speech', who: 'security', text: 'AWS keeps it running. Whether it’s full, slow or changed is still ours to watch.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'not monitoring the managed database',
    change: { unwire: 'mon-db' },
    fails: 's2-2',
  },
};

export const MODULE_10_STORIES: Record<number, LevelStory> = {
  91: level91,
  92: level92,
  93: level93,
  94: level94,
  95: level95,
  96: level96,
  97: level97,
  98: level98,
  99: level99,
  100: level100,
};
