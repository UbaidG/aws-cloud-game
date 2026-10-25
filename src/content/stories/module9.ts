/**
 * Module 9: Security. Rio’s shop wants to take card payments itself, and the payments partner
 * won’t sign until Ines can show a clean security review. Each level closes one gap, and the
 * assessment is the review itself.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig, FirewallRule } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ec2', gridX, gridZ, { name, config });
const waf = (gridX = -3, gridZ = 0) => block('shield', 'waf', gridX, gridZ, { name: 'Web Firewall' });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });
const role = (gridX: number, gridZ: number, name = 'App Role') => block('role', 'iam', gridX, gridZ, { name });
const key = (gridX: number, gridZ: number, name = 'Data Key') => block('key', 'kms', gridX, gridZ, { name });

const HTTP: FirewallRule = { protocol: 'tcp', port: 80, source: '0.0.0.0/0' };
const SSH: FirewallRule = { protocol: 'tcp', port: 22, source: '0.0.0.0/0' };
const RDP: FirewallRule = { protocol: 'tcp', port: 3389, source: '0.0.0.0/0' };
const PG_ANY: FirewallRule = { protocol: 'tcp', port: 5432, source: '0.0.0.0/0' };

const level81: LevelStory = {
  text: {
    title: 'Your Side of the Deal',
    tagline: 'AWS secures the cloud. What you open inside it is your job.',
    concepts: ['Shared responsibility model', 'Security groups', 'Admin ports'],
    briefing:
      'A payments partner wants a security review before Rio can take cards. The first finding: the web server accepts SSH and Remote Desktop from the whole internet. Close everything except the shop’s own port 80.',
    docTips: [
      'AWS is responsible for security of the cloud: buildings, hardware, the hypervisor. You are responsible for security in the cloud: firewall rules, IAM, patching your instances’ operating system and encrypting your data.',
    ],
    conceptCard: {
      title: 'Shared responsibility',
      summary:
        'AWS runs and protects the physical data centres and the services underneath your resources. Everything you configure on top, from security groups to who can log in, is yours to get right.',
      analogy: 'A landlord fits strong doors and a lock on the building. Leaving your own flat’s door open is still on you.',
      keyTakeaway: 'If you can change a setting, securing it is your responsibility, not AWS’s.',
    },
    iacSnippet: `resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.web.id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  cidr_ipv4         = "0.0.0.0/0"
}

# No rules for 22 or 3389: use Session Manager for admin access.`,
  },
  stages: [
    {
      title: 'Your side of the deal',
      brief: 'The server allows port 80, port 22 (SSH) and port 3389 (Remote Desktop) from anywhere.',
      goal: 'Keep the shop online on port 80 and raise the security score to 100.',
      hint: 'Select the server and edit its security group. Customers only need HTTP.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server', { securityGroupInbound: [HTTP, SSH, RDP] })], [wire('users', 'web')]),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'Rio wants to take card payments directly. The payments partner sends a security questionnaire first.' },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Inbound rules', body: 'Ports 80, 22 and 3389, all from anywhere', tone: 'warn' },
      { t: 'speech', who: 'founder', text: 'Isn’t security Amazon’s job? It’s their data centre.' },
      { t: 'speech', who: 'security', text: 'AWS guards the buildings and the hardware. What we open on our own servers is on us.' },
      { t: 'stat', label: 'Security score', value: 60, tone: 'bad' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Two admin ports, open to the world. Customers only need one port.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'closing SSH but forgetting Remote Desktop',
    change: { set: { web: { securityGroupInbound: [HTTP, RDP] } } },
    fails: 's1-2',
  },
};

const level82: LevelStory = {
  text: {
    title: 'No Keys in Code',
    tagline: 'Swap a password in a config file for an IAM role.',
    concepts: ['IAM roles', 'Instance profiles', 'Temporary credentials'],
    briefing:
      'The web server reads the uploads bucket with an access key pasted into its config file, and that file is in Git. Give the server an IAM role so it gets short-lived credentials instead.',
    docTips: [
      'An IAM role attached to an EC2 instance (through an instance profile) hands the instance temporary credentials that rotate automatically. AWS SDKs pick them up with no code changes.',
    ],
    conceptCard: {
      title: 'IAM roles',
      summary:
        'A role is an identity with permissions but no password or long-term key. A server, function or person assumes it and receives credentials that expire within hours.',
      analogy: 'A hotel key card that stops working at checkout, instead of a copy of the master key.',
      keyTakeaway: 'Code should never contain long-term AWS keys. Give the thing running the code a role.',
    },
    iacSnippet: `resource "aws_iam_role" "web" {
  name               = "web-server"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_instance_profile" "web" {
  name = "web-server"
  role = aws_iam_role.web.name
}

resource "aws_instance" "web" {
  # ...
  iam_instance_profile = aws_iam_instance_profile.web.name
}`,
  },
  stages: [
    {
      title: 'No keys in code',
      brief: 'The app signs its S3 requests with a long-term access key from its config file.',
      goal: 'Give the web server an IAM role.',
      hint: 'Place an IAM role and wire it to the server that uses it.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), block('bucket', 's3', 5, 0, { name: 'Uploads Bucket' }), role(6, 2, 'Web Server Role')],
      [wire('users', 'web'), wire('web', 'bucket')],
    ),
    start: ['users', 'web', 'bucket'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--bucket'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'caption', text: 'Ines reads the app’s config file. Line 12 is an AWS access key.' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'config.yml', body: 'aws_secret_access_key: wJalr…', tone: 'bad' },
      { t: 'stat', label: 'People with repo access', value: 14, tone: 'bad' },
      { t: 'speech', who: 'security', text: 'That key never expires, and it’s been in Git since March. Anyone with the repo can empty the bucket.' },
      { t: 'speech', who: 'oncall', text: 'The code still needs something to sign its S3 requests with, though.' },
      { t: 'spawn', ids: ['role'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'role' },
      { t: 'speech', who: 'cto', text: 'A role. The server gets credentials that expire and renew themselves. Nothing to paste, nothing to leak.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'attaching the role to the bucket instead of the server',
    change: { unwire: 'web-role', wire: 'role-bucket' },
    fails: 's1-1',
  },
};

const level83: LevelStory = {
  text: {
    title: 'Bot Flood',
    tagline: 'Stop a bot flood before it reaches the server.',
    concepts: ['AWS WAF', 'Rate-based rules', 'Bot traffic'],
    briefing:
      'A deal site linked to Rio’s shop, and so did every scraper bot on the internet: 2,000 bot requests a second on top of 200 real customers. Put AWS WAF in the path so the bots are turned away before they cost you a server.',
    docTips: [
      'A WAF web ACL attaches to CloudFront, an Application Load Balancer or API Gateway rather than to an instance. Rate-based rules block any single IP address that sends too many requests in a time window.',
    ],
    conceptCard: {
      title: 'AWS WAF',
      summary:
        'A web application firewall inspects each HTTP request against rules: rate limits, known-bad IP lists, bot signatures and attack patterns. Matching requests are blocked before your servers ever see them.',
      analogy: 'A doorman who knows the troublemakers by sight, so the staff inside never have to deal with them.',
      keyTakeaway: 'Filter bad traffic at the edge. Every bot you block there is capacity you don’t have to buy.',
    },
    iacSnippet: `resource "aws_wafv2_web_acl" "shop" {
  name  = "shop-acl"
  scope = "REGIONAL"
  default_action {
    allow {}
  }
  rule {
    name     = "rate-limit-per-ip"
    priority = 1
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "rate-limit-per-ip"
      sampled_requests_enabled   = true
    }
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "shop-acl"
    sampled_requests_enabled   = true
  }
}`,
  },
  stages: [
    {
      title: 'Shields up',
      brief: '2,000 bot requests a second are drowning 200 real customers. The server handles 300.',
      goal: 'Route all traffic through WAF, with errors at 1% or less and a security score of 100.',
      hint: 'Place WAF in the Edge zone, delete the wire from the users to the load balancer, and send them through WAF instead.',
    },
  ],
  cutscene: {
    stage: board([users(), block('alb', 'alb', -1, 0, { name: 'Load Balancer' }), ec2('web', 1, 0, 'Web Server'), waf()], [wire('users', 'alb'), wire('alb', 'web')]),
    start: ['users', 'alb', 'web'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web'] },
      { t: 'caption', text: 'A deal site features Rio’s shop. So does every scraper bot on the internet.' },
      { t: 'traffic', rps: 200, botRps: 2000, expect: 'served' },
      { t: 'stat', label: 'Bot requests / s', value: 2000, tone: 'bad' },
      { t: 'camera', shot: 'low', on: 'web' },
      { t: 'callout', on: 'web', title: 'CPU 100%', body: '2,200 requests a second, room for 300', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'Every real customer is stuck behind ten bots. A bigger server would just feed more bots.' },
      { t: 'speech', who: 'security', text: 'Then we turn them away at the door. A web application firewall checks every request first.' },
      { t: 'spawn', ids: ['shield'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'shield' },
      { t: 'clear' },
      { t: 'caption', text: 'Make every request pass through WAF on its way to the load balancer.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the direct wire as a back door',
    change: { wire: 'users-alb' },
    fails: 's1-2',
  },
};

const level84: LevelStory = {
  text: {
    title: 'Little Bobby Tables',
    tagline: 'Security groups check ports. WAF reads the request.',
    concepts: ['SQL injection', 'AWS WAF managed rules', 'Layer 7 filtering'],
    briefing:
      'Attackers are typing SQL into the login form, and it arrives on port 80 like any other request, so the security groups wave it through. Put WAF in front of the load balancer to inspect every request before the servers see it.',
    docTips: [
      'AWS Managed Rules include a SQL database rule group that blocks common SQL injection patterns. Still fix the code too: parameterised queries stop injection at the source.',
    ],
    conceptCard: {
      title: 'Layer 7 filtering',
      summary:
        'A security group decides by address and port. A web application firewall reads the request itself (path, headers, form fields) and blocks known attack patterns such as SQL injection and cross-site scripting.',
      analogy: 'The security group checks a parcel’s address label. WAF X-rays what’s inside.',
      keyTakeaway: 'Attacks on your app come through the port you have to leave open. Inspect the content, not just the port.',
    },
    iacSnippet: `# Inside the web ACL:
rule {
  name     = "aws-sqli"
  priority = 1
  override_action {
    none {}
  }
  statement {
    managed_rule_group_statement {
      vendor_name = "AWS"
      name        = "AWSManagedRulesSQLiRuleSet"
    }
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "aws-sqli"
    sampled_requests_enabled   = true
  }
}

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.shop.arn
  web_acl_arn  = aws_wafv2_web_acl.shop.arn
}`,
  },
  stages: [
    {
      title: 'SQL injection',
      brief: 'Thousands of login attempts a second, each with SQL hidden in the password field.',
      goal: 'Send traffic through WAF to the load balancer, with errors at 1% or less and a security score of 100.',
      hint: 'WAF goes in the Edge zone, between the users and the load balancer.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web1', 1, -1, 'Server A'), ec2('web2', 1, 1, 'Server B'), waf()],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2')],
    ),
    start: ['users', 'alb', 'web1', 'web2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2'] },
      { t: 'caption', text: '3:12 a.m. The login form receives a very strange password.' },
      { t: 'camera', shot: 'close', on: 'alb' },
      { t: 'callout', on: 'alb', title: 'POST /login', body: 'password = \' OR \'1\'=\'1', tone: 'bad' },
      { t: 'traffic', rps: 200, botRps: 2000, expect: 'served' },
      { t: 'stat', label: 'Injection attempts / s', value: 2000, tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'The security groups allow port 80. That’s exactly the port this attack uses.' },
      { t: 'speech', who: 'security', text: 'Security groups read the address on the envelope. We need something that reads the letter.' },
      { t: 'spawn', ids: ['shield'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'shield' },
      { t: 'clear' },
      { t: 'caption', text: 'Put WAF in front of the load balancer.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'trusting security groups to stop SQL injection',
    change: { remove: ['shield'], wire: 'users-alb' },
    fails: 's1-1',
  },
};

const level85: LevelStory = {
  text: {
    title: 'Ticket Scalpers',
    tagline: 'WAF stops the bots; API Gateway throttles what’s left.',
    concepts: ['AWS WAF', 'API Gateway throttling', 'Defence in depth'],
    briefing:
      'Rio’s shop is selling tickets for the summer festival through a serverless API, and scalper bots are sending 5,000 requests a second. Filter the bots with WAF, then let API Gateway throttle whatever gets past.',
    docTips: [
      'API Gateway throttles per account and Region (10,000 requests a second by default), and usage plans can set lower limits per API key. Throttling caps volume; it can’t tell a fan from a bot.',
    ],
    conceptCard: {
      title: 'Defence in depth',
      summary:
        'No single control stops everything. WAF blocks requests that look malicious, API Gateway throttling stops any one caller from overwhelming the back end, and the function only sees what survives both.',
      analogy: 'A festival with a ticket check at the gate and stewards at each stage. Getting past one doesn’t get you everywhere.',
      keyTakeaway: 'Layer your defences so each catches what the one before it missed.',
    },
    iacSnippet: `resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.tickets.id
  stage_name  = aws_api_gateway_stage.live.stage_name
  method_path = "*/*"

  settings {
    throttling_rate_limit  = 100
    throttling_burst_limit = 200
  }
}`,
  },
  stages: [
    {
      title: 'Ticket bots',
      brief: '200 fans and 5,000 bot requests a second, all after the same tickets.',
      goal: 'Route users through WAF, then API Gateway, to the function, with errors at 1% or less and a security score of 100.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), waf(), block('api', 'apigw', -2, 0, { name: 'Tickets API' }), block('fn', 'lambda', 4, 0, { name: 'Tickets Function' })],
      [wire('users', 'api'), wire('api', 'fn')],
    ),
    start: ['users', 'api', 'fn'],
    beats: [
      { t: 'wire', ids: ['users--api', 'api--fn'] },
      { t: 'caption', text: 'Rio’s shop is selling tickets for the summer festival. Sales open at 10:00.' },
      { t: 'traffic', rps: 200, botRps: 5000, expect: 'served' },
      { t: 'stat', label: 'Bot requests / s', value: 5000, tone: 'bad' },
      { t: 'camera', shot: 'close', on: 'api' },
      { t: 'callout', on: 'api', title: '429 Too Many Requests', body: 'Fans and bots share one limit', tone: 'warn' },
      { t: 'speech', who: 'founder', text: 'Real fans get “try again later” while the scalpers buy everything.' },
      { t: 'speech', who: 'oncall', text: 'Throttling caps the total. It can’t tell a fan from a bot.' },
      { t: 'spawn', ids: ['shield'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'shield' },
      { t: 'speech', who: 'security', text: 'WAF can. Bot rules and per-address limits first, then the API’s throttle for whatever gets through.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'relying on API Gateway throttling alone',
    change: { remove: ['shield'], wire: 'users-api' },
    fails: 's1-1',
  },
};

const level86: LevelStory = {
  text: {
    title: 'Master Key',
    tagline: 'Encrypt customer data at rest with a key you control.',
    concepts: ['AWS KMS', 'Encryption at rest', 'Customer managed keys'],
    briefing:
      'The customer database stores everything on disk in plain text, so any copy of it, from a snapshot to a backup, is readable. Create a KMS key, attach it to the database and turn encryption on.',
    docTips: [
      'RDS encryption is chosen when the database is created. To encrypt an existing one, snapshot it, copy the snapshot with encryption on, and restore from the copy. Snapshots and replicas inherit the key.',
    ],
    conceptCard: {
      title: 'AWS KMS',
      summary:
        'AWS Key Management Service creates and guards encryption keys inside hardware security modules. Services such as RDS and S3 ask KMS to use a key on their behalf, the key never leaves KMS, and every use is logged.',
      analogy: 'A bank vault that will lock and unlock your safe for you, but never hands over the key, and writes down every visit.',
      keyTakeaway: 'Encrypt data at rest with a key you control. A stolen copy is useless without the key.',
    },
    iacSnippet: `resource "aws_kms_key" "customers" {
  description         = "Customer DB encryption"
  enable_key_rotation = true
}

resource "aws_db_instance" "customers" {
  # ...
  storage_encrypted = true
  kms_key_id        = aws_kms_key.customers.arn
}`,
  },
  stages: [
    {
      title: 'Master key',
      brief: 'Customer names, addresses and orders sit on disk in plain text.',
      goal: 'Turn on encryption for the database and attach a KMS key to it.',
      hint: 'Place a KMS key, wire it to the database, then turn encryption on in the database’s inspector.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), block('db', 'rds', 5, 0, { name: 'Customer DB', config: { encrypted: false } }), key(6, 2)],
      [wire('users', 'web'), wire('web', 'db')],
    ),
    start: ['users', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--db'] },
      { t: 'caption', text: 'Ines finds a database snapshot shared with an AWS account nobody recognises.' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Encryption: off', body: 'Anyone with a copy can read it', tone: 'bad' },
      { t: 'stat', label: 'Customer records exposed', value: 48000, tone: 'bad' },
      { t: 'speech', who: 'security', text: 'If the disk were encrypted with our own key, that snapshot would be useless to them.' },
      { t: 'speech', who: 'finance', text: 'And if it isn’t, we’re writing 48,000 apology emails.' },
      { t: 'spawn', ids: ['key'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'key' },
      { t: 'speech', who: 'cto', text: 'KMS holds the key, never lets it out, and logs every use. Encrypt the database with it.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a key attached but encryption still off',
    change: { set: { db: { encrypted: false } } },
    fails: 's1-1',
  },
};

const level87: LevelStory = {
  text: {
    title: 'Vault Rules',
    tagline: 'Encrypt the data, and give the app an identity instead of a password.',
    concepts: ['AWS KMS', 'IAM roles', 'Least privilege'],
    briefing:
      'Rio is launching customer accounts, with saved addresses and order history. Before the Accounts DB goes live it must be encrypted with a KMS key, and the app server must use an IAM role rather than a stored password.',
    docTips: [
      'Apps can reach RDS without a stored password: use IAM database authentication, or fetch credentials from Secrets Manager with the app’s role, and let Secrets Manager rotate them.',
    ],
    conceptCard: {
      title: 'Least privilege',
      summary:
        'Grant each identity only the permissions its job needs, and nothing else. A role for the app server that can read one secret and use one key does far less damage if it’s ever misused.',
      analogy: 'A cleaner gets a key to the office, not the safe.',
      keyTakeaway: 'Encrypt the data, then make sure only the right identity can ask for the key.',
    },
    iacSnippet: `resource "aws_db_instance" "accounts" {
  # ...
  storage_encrypted                   = true
  kms_key_id                          = aws_kms_key.accounts.arn
  iam_database_authentication_enabled = true
}

resource "aws_iam_instance_profile" "app" {
  name = "app-server"
  role = aws_iam_role.app.name
}`,
  },
  stages: [
    {
      title: 'Vault rules',
      brief: 'The Accounts DB is unencrypted, and the app logs in with a password from its environment.',
      goal: 'Encrypt the database with a KMS key and give the app server an IAM role.',
      hint: 'The key goes on the database; the role goes on the server that runs the code.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, 0, 'App Server'),
        block('db', 'rds', 5, 0, { name: 'Accounts DB', config: { encrypted: false } }),
        key(6, 2, 'Accounts Key'),
        role(6, -2),
      ],
      [wire('users', 'web'), wire('web', 'db')],
    ),
    start: ['users', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--db'] },
      { t: 'caption', text: 'Rio’s shop launches customer accounts: saved addresses, order history, loyalty points.' },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Accounts DB', body: 'Unencrypted. App logs in as admin.', tone: 'bad' },
      { t: 'speech', who: 'security', text: 'Two findings before launch: plain-text data, and a database password in the app’s environment.' },
      { t: 'speech', who: 'oncall', text: 'So, a key for the data and a role for the app. We’ve done both before, just not together.' },
      { t: 'spawn', ids: ['key', 'role'], hold: 900 },
      { t: 'camera', shot: 'top' },
      { t: 'clear' },
      { t: 'caption', text: 'Lock the data with a key, and give the app an identity instead of a password.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'giving the role to the database instead of the app',
    change: { unwire: 'role-web', wire: 'role-db' },
    fails: 's1-3',
  },
};

const level88: LevelStory = {
  text: {
    title: 'The Leaky Bucket',
    tagline: 'Block public access, and let the app read with a role.',
    concepts: ['S3 Block Public Access', 'IAM roles', 'Presigned URLs'],
    briefing:
      'A customer found they could open other people’s invoices by changing the number in a link. Someone made the bucket public so the app could read it. Block all public access and give the app a role instead.',
    docTips: [
      'New S3 buckets block public access by default. To let a customer download one private file, have the app create a presigned URL that expires after a few minutes.',
    ],
    conceptCard: {
      title: 'Block Public Access',
      summary:
        'S3 Block Public Access overrides any bucket policy or ACL that would make objects public. Turn it on for the bucket, or for the whole account, and a mistaken policy can no longer leak data.',
      analogy: 'A deadbolt on the filing room. Even if someone props the door, it still won’t open from the corridor.',
      keyTakeaway: 'Private buckets, with access through roles and short-lived links. Never “public so the app can read it”.',
    },
    iacSnippet: `resource "aws_s3_bucket_public_access_block" "invoices" {
  bucket                  = aws_s3_bucket.invoices.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
  },
  stages: [
    {
      title: 'Plug the leak',
      brief: 'Every invoice in the bucket can be downloaded by anyone who guesses its link.',
      goal: 'Block public access on the bucket, give the web server an IAM role, and reach a security score of 100.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, 0, 'Web Server'),
        block('bucket', 's3', 5, 0, { name: 'Invoices Bucket', config: { blockPublicAccess: false } }),
        role(6, 2, 'Web Server Role'),
      ],
      [wire('users', 'web'), wire('web', 'bucket')],
    ),
    start: ['users', 'web', 'bucket'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--bucket'] },
      { t: 'caption', text: 'A customer emails: “If I change the number in my invoice link, I get someone else’s.”' },
      { t: 'camera', shot: 'close', on: 'bucket' },
      { t: 'callout', on: 'bucket', title: 'Block Public Access: off', body: 'invoices/10231.pdf readable by anyone', tone: 'bad' },
      { t: 'stat', label: 'Invoices exposed', value: 12400, tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'The app couldn’t read the bucket, so someone made it public. It worked, technically.' },
      { t: 'speech', who: 'security', text: 'It worked for everyone. Block public access. The app reads with a role; customers get links that expire.' },
      { t: 'spawn', ids: ['role'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'role' },
      { t: 'clear' },
      { t: 'caption', text: 'Close the bucket, and give the app its own way in.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the bucket public “so the app can read it”',
    change: { set: { bucket: { blockPublicAccess: false } } },
    fails: 's1-1',
  },
};

const level89: LevelStory = {
  text: {
    title: 'Lockdown',
    tagline: 'Cut the shortcuts into the database and shut its firewall.',
    concepts: ['Network segmentation', 'Security groups', 'Private subnets'],
    briefing:
      'A scan from outside found the payments ledger answering on port 5432. Two old wires let traffic skip the app and go straight to the database, and its security group allows the whole internet. Cut both and lock the firewall to the VPC.',
    docTips: [
      'A database’s security group should allow its port only from the app tier. Better still, use the app servers’ security group as the source instead of an address range.',
    ],
    conceptCard: {
      title: 'Network segmentation',
      summary:
        'Each tier only accepts traffic from the tier in front of it: users reach the load balancer, the load balancer reaches the servers, and only the servers reach the database.',
      analogy: 'Customers order at the counter. They don’t wander into the kitchen, and the kitchen door locks from inside.',
      keyTakeaway: 'Remove every path to the data that doesn’t go through the app, and close the firewall behind it as well.',
    },
    iacSnippet: `resource "aws_vpc_security_group_ingress_rule" "ledger_from_app" {
  security_group_id            = aws_security_group.ledger.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.app.id
}`,
  },
  stages: [
    {
      title: 'Lockdown',
      brief: 'Two wires bypass the app and go straight into the ledger, and its firewall accepts port 5432 from anywhere.',
      goal: 'Keep Users → ALB → server → database working, and raise the security score to 100.',
      hint: 'Delete the wires from the users and the load balancer to the database, then restrict port 5432 to the VPC.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web', 1, 0, 'Web Server'), block('db', 'rds', 5, 0, { name: 'Ledger DB', config: { securityGroupInbound: [PG_ANY] } })],
      [wire('users', 'alb'), wire('alb', 'web'), wire('web', 'db'), wire('users', 'db'), wire('alb', 'db')],
    ),
    start: ['users', 'alb', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web', 'web--db'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'caption', text: 'Ines runs a scan from outside the network. Something answers on port 5432.' },
      { t: 'wire', ids: ['users--db', 'alb--db'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'db' },
      { t: 'callout', on: 'db', title: 'Ledger DB', body: 'Port 5432 open to 0.0.0.0/0', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'Those are from the reporting tool we tried in the spring. I thought we took them out.' },
      { t: 'speech', who: 'security', text: 'Two ways into the ledger that never pass the app, and a firewall that lets anyone try.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Cut the shortcuts, then make the database trust only its own network.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'cutting the wires but leaving the firewall open',
    change: { set: { db: { securityGroupInbound: [PG_ANY] } } },
    fails: 's1-2',
  },
};

const level90: LevelStory = {
  text: {
    title: 'The Security Review',
    tagline: 'Assessment: build a payments platform that passes a zero-trust review.',
    concepts: ['Perimeter security', 'Private subnets', 'IAM roles', 'Encryption at rest'],
    briefing:
      'The payments partner’s review is on Friday, and bots never stop probing. Build the platform from nothing so that only WAF faces the internet, servers run privately in two zones, then give every server a role and encrypt the database with your own key.',
    docTips: [
      'Servers in a private subnet have no public IP address. The load balancer in the public subnet is the only way in, and outbound calls go through a NAT gateway.',
      'Zero trust means no component is trusted for where it sits on the network. Each one proves who it is (a role) and the data stays encrypted even inside the VPC.',
    ],
    conceptCard: {
      title: 'Zero trust',
      summary:
        'Layer the controls: WAF filters the internet, private subnets hide the servers, roles give each server a narrow identity, and KMS keeps data encrypted at rest. No single layer is relied on alone.',
      analogy: 'A bank branch: a guard at the door, staff-only corridors, a badge for every employee and a time-locked vault.',
      keyTakeaway: 'Assume one layer will fail, and make sure the next one still holds.',
    },
    iacSnippet: `resource "aws_instance" "app" {
  count                       = 2
  subnet_id                   = aws_subnet.private[count.index].id
  associate_public_ip_address = false
  iam_instance_profile        = aws_iam_instance_profile.app.name
  # ...
}`,
  },
  stages: [
    {
      title: 'Perimeter',
      brief: 'An empty account, and 2,000 bot requests a second probing for a way in.',
      goal: 'WAF → ALB → two servers in the Private Subnet, one in each zone → database, with errors at 1% or less.',
      hint: 'The load balancer sits in the Public Subnet; both servers and the database go in the Private Subnet, either side of the zone line.',
    },
    {
      title: 'Zero trust',
      brief: 'The partner wants proof that nothing relies on the network alone.',
      goal: 'Give both servers an IAM role, attach a KMS key to the database, and reach a security score of 100.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        waf(),
        alb(),
        ec2('app1', 4, -1, 'App Server A'),
        ec2('app2', 4, 1, 'App Server B'),
        block('db', 'rds', 6, 0, { name: 'Payments DB' }),
        role(6, -2),
        key(6, 2, 'Payments Key'),
      ],
      [wire('users', 'shield'), wire('shield', 'alb'), wire('alb', 'app1'), wire('alb', 'app2'), wire('app1', 'db'), wire('app2', 'db')],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Friday is the payments partner’s security review. Ines has one page of requirements.' },
      { t: 'speech', who: 'security', text: 'Only the firewall faces the internet. The servers live in private subnets, in two zones.' },
      { t: 'spawn', ids: ['shield', 'alb'] },
      { t: 'spawn', ids: ['app1', 'app2', 'db'] },
      { t: 'wire', ids: ['users--shield', 'shield--alb', 'alb--app1', 'alb--app2', 'app1--db', 'app2--db'] },
      { t: 'traffic', rps: 200, botRps: 2000, expect: 'served' },
      { t: 'stat', label: 'Bot requests / s', value: 2000, tone: 'warn' },
      { t: 'speech', who: 'security', text: 'Then every server gets its own identity, and every byte on disk is encrypted with our key.' },
      { t: 'spawn', ids: ['role', 'key'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'db' },
      { t: 'speech', who: 'founder', text: 'Pass this, and we take card payments ourselves from Monday.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'app servers left in the Public Subnet',
    change: { move: { app1: [1, -1], app2: [1, 1] } },
    fails: 's1-2',
  },
};

export const MODULE_9_STORIES: Record<number, LevelStory> = {
  81: level81,
  82: level82,
  83: level83,
  84: level84,
  85: level85,
  86: level86,
  87: level87,
  88: level88,
  89: level89,
  90: level90,
};
