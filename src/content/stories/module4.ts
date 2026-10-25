/**
 * Module 4: Going Global. Rio's shop gets a name, survives a zone outage, and opens to
 * customers on every continent: DNS, CDNs, failover, and a blueprint every team can copy.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ec2', gridX, gridZ, { name, config });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });
const dns = (gridX = -4, gridZ = 0, config?: Partial<BlockConfig>) => block('dns', 'route53', gridX, gridZ, { name: 'Route 53', config });
const cdn = (gridX = -3, gridZ = 0) => block('cdn', 'cloudfront', gridX, gridZ, { name: 'CloudFront' });

/** CloudFront's managed "CachingOptimized" cache policy. */
const CACHING_OPTIMIZED = '658327ea-f89d-4fab-a63d-7e88639e58f6';

const level31: LevelStory = {
  text: {
    title: 'Name the Shop',
    tagline: 'Give the shop a domain name that survives a change of server.',
    concepts: ['Amazon Route 53', 'DNS', 'Hosted zones'],
    briefing:
      'Customers reach the shop by typing an IP address, and it changes whenever the server is replaced. Put Route 53 in front, so users look up the shop’s name and DNS sends them to whichever server is current.',
    docTips: [
      'Point an A record at an Elastic IP so the address survives a server replacement. For load balancers and CloudFront, use alias records, which are free to query.',
    ],
    conceptCard: {
      title: 'DNS',
      summary:
        'DNS turns a name like riosshop.com into the address of a server. Route 53 hosts your domain’s records and answers lookups from all over the world, backed by a 100% availability SLA.',
      analogy: 'The contacts on your phone: you tap a name, and the phone looks up the number for you.',
      keyTakeaway: 'People remember names. Let DNS track the addresses, so you can change servers without telling anyone.',
    },
    iacSnippet: `resource "aws_route53_record" "shop" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "riosshop.com"
  type    = "A"
  ttl     = 300
  records = [aws_eip.web.public_ip]
}`,
  },
  stages: [
    {
      title: 'A name, not a number',
      brief: 'Nobody remembers an IP address, and this one changes every time the server is replaced.',
      goal: 'Put Route 53 DNS in front of your server.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server'), dns()], [wire('users', 'web'), wire('users', 'dns'), wire('dns', 'web')]),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'Rio’s new flyers are back from the printer: “Shop at 54.12.8.31”.' },
      { t: 'traffic', expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'speech', who: 'oncall', text: 'Ah. I replaced that server last night. It has a new address now.' },
      { t: 'callout', on: 'web', title: 'New public IP', body: '3.91.200.14', tone: 'warn' },
      { t: 'stat', label: 'Flyers printed', value: 5000, tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Five thousand flyers pointing at nothing.' },
      { t: 'camera', shot: 'wide' },
      { t: 'spawn', ids: ['dns'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'dns' },
      { t: 'speech', who: 'cto', text: 'Print a name instead. DNS keeps the address up to date, so the flyers never go stale.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'handing out the IP address anyway',
    change: { unwire: 'users-dns', wire: 'users-web' },
    fails: 's1-1',
  },
};

const level32: LevelStory = {
  text: {
    title: 'Not in One Basket',
    tagline: 'Two servers in one data centre are still one point of failure, and their disks can’t follow them.',
    concepts: ['Availability Zones', 'EBS volumes are zonal', 'Fault isolation'],
    briefing:
      'The shop runs two servers behind its load balancer, each with its own EBS disk, but all four sit in us-east-1a. One outage takes out everything. Rebuild Server B in us-east-1b, and remember its disk can’t come with it.',
    docTips: [
      'An EBS volume lives in one Availability Zone and attaches only to instances in that zone. To move data across zones, take a snapshot and create a new volume from it in the other zone.',
    ],
    conceptCard: {
      title: 'Zonal storage',
      summary:
        'Availability Zones have separate power, cooling and networking, so two servers only protect you if they sit in different zones. An EBS volume belongs to a single zone, so a server in another zone needs its own volume, often restored from a snapshot.',
      analogy: 'A hard drive bolted into one building. You can photocopy what’s on it, but you can’t plug it in across town.',
      keyTakeaway: 'Count your zones, not your servers, and give each zone its own disks.',
    },
    iacSnippet: `resource "aws_ebs_volume" "disk_b" {
  availability_zone = "us-east-1b" # must match the instance
  snapshot_id       = aws_ebs_snapshot.disk_a.id
}

resource "aws_volume_attachment" "disk_b" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.disk_b.id
  instance_id = aws_instance.web_b.id
}`,
  },
  stages: [
    {
      title: 'Same building',
      brief: 'Both servers and both disks sit in us-east-1a. One power cut takes out everything.',
      goal: 'Rebuild Server B in us-east-1b, with a new disk in the same zone.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web1', 1, -1, 'Web Server A'),
        block('vol1', 'ebs', 2, -1, { name: 'Disk A' }),
        ec2('web2', 1, -2, 'Web Server B'),
        block('vol2', 'ebs', 2, -2, { name: 'Disk B' }),
        ec2('web3', 1, 2, 'Web Server B (1b)'),
        block('vol3', 'ebs', 2, 2, { name: 'Disk B (1b)' }),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'vol1'), wire('web2', 'vol2'), wire('alb', 'web3'), wire('web3', 'vol3')],
    ),
    start: ['users', 'alb', 'web1', 'vol1', 'web2', 'vol2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2', 'web1--vol1', 'web2--vol2'] },
      { t: 'caption', text: '4:12 a.m. An AWS Health alert: power trouble in us-east-1a.' },
      { t: 'traffic', expect: 'served' },
      { t: 'crash', id: 'web1' },
      { t: 'crash', id: 'web2' },
      { t: 'camera', shot: 'top' },
      { t: 'callout', on: 'web2', title: 'us-east-1a', body: 'Both servers down', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'We run two servers so this can’t happen. They were in the same building.' },
      { t: 'speech', who: 'cto', text: 'Then Server B moves to 1b. Its disk stays behind: EBS lives in one zone.' },
      { t: 'remove', ids: ['web2', 'vol2'] },
      { t: 'spawn', ids: ['web3', 'vol3'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'vol3' },
      { t: 'caption', text: 'A new server in us-east-1b, with a new disk beside it.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'leaving the new server’s disk in the old zone',
    change: { move: { vol3: [2, -2] } },
    fails: 'link.ebs_cross_az',
  },
};

const level33: LevelStory = {
  text: {
    title: 'Edge Cache',
    tagline: 'Serve pages from CloudFront’s edge locations, close to every shopper.',
    concepts: ['Amazon CloudFront', 'Edge locations', 'Caching'],
    briefing:
      'Shoppers in Europe and Asia wait 150 ms for every page, and most pages haven’t changed in weeks. Put CloudFront in front of the server and route every request through it, so repeat pages come from an edge location near each shopper.',
    docTips: [
      'CloudFront has hundreds of edge locations worldwide. Set how long pages stay cached with Cache-Control headers or a cache policy, and invalidate paths when the content changes.',
    ],
    conceptCard: {
      title: 'Content delivery networks',
      summary:
        'CloudFront keeps copies of your responses at edge locations around the world. A request answered at the edge never travels to your server, so it’s faster for the user and cheaper for you.',
      analogy: 'A newsagent on every corner selling today’s paper, instead of everyone queuing at the printing press.',
      keyTakeaway: 'Cache what rarely changes near the people who read it, and send every request through the cache.',
    },
    iacSnippet: `resource "aws_cloudfront_distribution" "shop" {
  enabled = true

  origin {
    domain_name = aws_instance.web.public_dns
    origin_id   = "web"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "web"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "${CACHING_OPTIMIZED}" # CachingOptimized
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}`,
  },
  stages: [
    {
      title: 'Cache at the edge',
      brief: 'Every page takes 150 ms, and most of them never change.',
      goal: 'Send every request through CloudFront, bringing latency under 60 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), block('db', 'rds', 5, 0, { name: 'Catalogue DB' }), cdn()],
      [wire('users', 'web'), wire('web', 'db'), wire('users', 'cdn'), wire('cdn', 'web')],
    ),
    start: ['users', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--db'] },
      { t: 'caption', text: 'Rio’s shop now ships to Europe and Asia.' },
      { t: 'traffic', expect: 'served' },
      { t: 'stat', label: 'Page load from Tokyo', value: 150, unit: 'ms', tone: 'bad' },
      { t: 'speech', who: 'customer', text: 'Every page takes a beat to load. I gave up before checkout.' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'speech', who: 'oncall', text: 'Every request crosses an ocean to Virginia for a catalogue that changed three weeks ago.' },
      { t: 'camera', shot: 'wide' },
      { t: 'spawn', ids: ['cdn'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'cdn' },
      { t: 'speech', who: 'cto', text: 'CloudFront keeps copies near every shopper. The server only sees what the edge hasn’t got.' },
      { t: 'clear' },
      { t: 'caption', text: 'Route every request through the CDN.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the direct route beside the CDN',
    change: { wire: 'users-web' },
    fails: 's1-2',
  },
};

const level34: LevelStory = {
  text: {
    title: 'No Servers Needed',
    tagline: 'Host a site of plain files in S3 and serve it worldwide through CloudFront.',
    concepts: ['Static hosting on S3', 'Amazon CloudFront', 'Origin access control'],
    briefing:
      'Marketing needs a launch page for the European store: HTML, CSS and images, and nothing that runs code. Keep the files in an S3 bucket and serve them through CloudFront, for less than $25 a month.',
    docTips: [
      'Keep the bucket private and give CloudFront access with origin access control (OAC). Visitors get the files from the edge; nobody can fetch them from the bucket directly.',
    ],
    conceptCard: {
      title: 'Static hosting',
      summary:
        'A static site is just files. S3 stores them durably for cents a month, and CloudFront serves them over HTTPS from edge locations, with no servers to patch or scale.',
      analogy: 'Leaving brochures at every tourist office, instead of hiring a salesperson to read them out.',
      keyTakeaway: 'If nothing on the page runs on a server, don’t run a server for it.',
    },
    iacSnippet: `resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "launch-site"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}`,
  },
  stages: [
    {
      title: 'Static site',
      brief: 'A launch page of plain files, and a budget of $25 a month.',
      goal: 'Serve the files from S3 through CloudFront, keeping the bill under $25 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), cdn(), block('site', 's3', -2, 1, { name: 'Launch Site' }), alb(0, 0), ec2('web1', 1, -1, 'Web Server A'), ec2('web2', 1, 1, 'Web Server B')],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2')],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Marketing wants a launch page for the European store by Monday.' },
      { t: 'spawn', ids: ['alb', 'web1', 'web2'] },
      { t: 'callout', on: 'alb', title: 'Agency quote', body: 'Two servers and a load balancer', tone: 'warn' },
      { t: 'stat', label: 'Quote / month', value: 85, prefix: '$', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'Two servers and a load balancer, for a page that never changes?' },
      { t: 'speech', who: 'oncall', text: 'It’s HTML, CSS and pictures. Nothing on it runs any code.' },
      { t: 'remove', ids: ['alb', 'web1', 'web2'] },
      { t: 'spawn', ids: ['site'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'site' },
      { t: 'callout', on: 'site', title: 'S3 Standard', body: 'About 2.3¢ per GB a month', tone: 'good' },
      { t: 'speech', who: 'cto', text: 'Files in a bucket, served from CloudFront’s edge. No servers at all.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a web server to hand out plain files',
    change: { remove: ['site'], add: 'web:ec2@0,0', wire: 'cdn-web' },
    fails: 's1-2',
  },
};

const level35: LevelStory = {
  text: {
    title: 'Smart DNS',
    tagline: 'Let Route 53 send a few users to the new version before everyone gets it.',
    concepts: ['Route 53 routing policies', 'Weighted routing', 'Canary releases'],
    briefing:
      'The redesigned shop is ready on its own server, and nobody wants to bet every customer on it at once. Put Route 53 in front of both versions and switch it to weighted routing, so a small share of users tries the new shop first.',
    docTips: [
      'Weighted routing returns each record in proportion to its weight. Weights of 90 and 10 send about one lookup in ten to the new version; a weight of 0 takes a record out without deleting it.',
    ],
    conceptCard: {
      title: 'Routing policies',
      summary:
        'A Route 53 record can answer in different ways. Simple returns one fixed answer, weighted splits traffic by percentage, failover switches on health, geolocation answers by country, and latency picks the Region that’s fastest for the user.',
      analogy: 'Opening one new till in the supermarket and sending every tenth shopper to it, before you rebuild all the tills.',
      keyTakeaway: 'DNS does more than translate names: its routing policy decides which endpoint each user gets.',
    },
    iacSnippet: `resource "aws_route53_record" "shop_v2" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "riosshop.com"
  type           = "A"
  ttl            = 60
  records        = [aws_eip.v2.public_ip]
  set_identifier = "v2"

  weighted_routing_policy {
    weight = 10
  }
}`,
  },
  stages: [
    {
      title: 'Smart DNS',
      brief: 'Version 2 of the shop is ready, and nobody wants to bet every customer on it at once.',
      goal: 'Wire Route 53 to both versions and set its routing policy to weighted.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), dns(), ec2('v1', 0, -1, 'Shop v1'), ec2('v2', 0, 1, 'Shop v2 (new)')],
      [wire('users', 'dns'), wire('dns', 'v1'), wire('dns', 'v2')],
    ),
    start: ['users', 'dns', 'v1'],
    beats: [
      { t: 'wire', ids: ['users--dns', 'dns--v1'] },
      { t: 'traffic', expect: 'served' },
      { t: 'caption', text: 'Six months of work: the redesigned shop is ready.' },
      { t: 'spawn', ids: ['v2'] },
      { t: 'camera', shot: 'close', on: 'v2' },
      { t: 'callout', on: 'v2', title: 'Shop v2', body: 'Passed every test. Never met a real customer.', tone: 'warn' },
      { t: 'speech', who: 'founder', text: 'Let’s switch everyone over tonight!' },
      { t: 'speech', who: 'oncall', text: 'If there’s a bug we haven’t found, every customer finds it at once.' },
      { t: 'camera', shot: 'wide' },
      { t: 'speech', who: 'cto', text: 'Weighted routing. One user in ten gets v2, and we turn the dial up as it proves itself.' },
      { t: 'stat', label: 'Users on v2', value: 10, unit: '%', tone: 'good' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'both versions wired, DNS left on simple routing',
    change: { set: { dns: { routingPolicy: 'simple' } } },
    fails: 's1-2',
  },
};

const level36: LevelStory = {
  text: {
    title: 'Plan B',
    tagline: 'When the primary server dies, let DNS send everyone to the standby.',
    concepts: ['Route 53 failover routing', 'Health checks', 'Active-passive recovery'],
    briefing:
      'The primary server has crashed. Route 53 knows about the standby, but simple routing keeps handing out the dead server’s address as well. Switch the record to failover routing, so health checks send everyone to the server that’s up.',
    docTips: [
      'Failover routing needs a health check on the primary record. When the check fails, Route 53 answers with the secondary until the primary recovers. Short TTLs make the switch quicker.',
    ],
    conceptCard: {
      title: 'Active-passive failover',
      summary:
        'With failover routing, Route 53 answers with the primary while its health check passes, and with the standby when it fails. The switch happens in DNS, without anyone logging in at 3 a.m.',
      analogy: 'A diversion sign that lights up by itself the moment the bridge closes.',
      keyTakeaway: 'Decide where traffic goes before things break, then let health checks make the call.',
    },
    iacSnippet: `resource "aws_route53_record" "shop_secondary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "riosshop.com"
  type           = "A"
  ttl            = 60
  records        = [aws_eip.standby.public_ip]
  set_identifier = "secondary"

  failover_routing_policy {
    type = "SECONDARY"
  }
}`,
  },
  stages: [
    {
      title: 'Primary down',
      brief: 'The primary has crashed, and simple routing still gives half the users its address.',
      goal: 'Switch Route 53 to failover routing, so health checks send everyone to the standby.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), dns(), ec2('primary', 0, -1, 'Primary Server'), ec2('standby', 0, 1, 'Standby Server')],
      [wire('users', 'dns'), wire('dns', 'primary'), wire('dns', 'standby')],
    ),
    start: ['users', 'dns', 'primary', 'standby'],
    beats: [
      { t: 'wire', ids: ['users--dns', 'dns--primary', 'dns--standby'] },
      { t: 'caption', text: 'Sunday, 3:07 a.m. Everyone at Rio’s shop is asleep.' },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'crash', id: 'primary' },
      { t: 'camera', shot: 'close', on: 'primary' },
      { t: 'callout', on: 'primary', title: 'Primary Server', body: 'Not responding', tone: 'bad' },
      { t: 'stat', label: 'Lookups sent to the dead server', value: 50, unit: '%', tone: 'bad' },
      { t: 'speech', who: 'customer', text: 'The site won’t load. I’ll order somewhere else.' },
      { t: 'camera', shot: 'low', on: 'standby' },
      { t: 'callout', on: 'standby', title: 'Standby Server', body: 'Healthy, and half idle', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'DNS knows about the standby. It just doesn’t know the primary is dead.' },
      { t: 'speech', who: 'cto', text: 'Failover routing checks the primary’s health and stops handing out its address.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'trusting simple routing to notice the crash',
    change: { set: { dns: { routingPolicy: 'simple' } } },
    fails: 's1-1',
  },
};

const level37: LevelStory = {
  text: {
    title: 'No Side Doors',
    tagline: 'Put DNS and a CDN in front of the server, then close the way around them.',
    concepts: ['Route 53', 'Amazon CloudFront', 'Origin protection'],
    briefing:
      'Give the shop a name and a global cache: Route 53, then CloudFront, then the server. Then lock the server down, so it only accepts web traffic from CloudFront and not from attackers who have found its IP.',
    docTips: [
      'Point the domain at CloudFront with a Route 53 alias record. CloudFront then fetches anything it hasn’t cached from your server.',
      'Allow port 80 only from the AWS-managed prefix list com.amazonaws.global.cloudfront.origin-facing, so only CloudFront can reach the origin.',
    ],
    conceptCard: {
      title: 'Origin protection',
      summary:
        'A CDN only protects and speeds up the traffic that goes through it. If the origin still accepts requests from anywhere, attackers simply go around it. Restrict the origin’s security group to CloudFront’s addresses.',
      analogy: 'Hiring a doorman, then leaving the fire exit propped open.',
      keyTakeaway: 'Once there’s a front door, close every other way in.',
    },
    iacSnippet: `data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_vpc_security_group_ingress_rule" "from_cloudfront" {
  security_group_id = aws_security_group.web.id
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}`,
  },
  stages: [
    {
      title: 'Edge stack',
      brief: 'The shop needs a domain name and a global cache in front of its server.',
      goal: 'Route traffic Route 53 → CloudFront → EC2.',
    },
    {
      title: 'No side doors',
      brief: 'Attackers have found the server’s IP address and skip CloudFront entirely.',
      goal: 'Only accept port 80 from CloudFront’s address range.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), dns(), cdn(), ec2('web', 0, 0, 'Web Server'), block('bots', 'client', -6, 2, { name: 'Attackers' })],
      [wire('users', 'dns'), wire('dns', 'cdn'), wire('cdn', 'web'), wire('bots', 'web')],
    ),
    start: ['users', 'web'],
    beats: [
      { t: 'caption', text: 'The shop gets a name and a global cache in front of it.' },
      { t: 'spawn', ids: ['dns', 'cdn'] },
      { t: 'wire', ids: ['users--dns', 'dns--cdn', 'cdn--web'] },
      { t: 'traffic', expect: 'served' },
      { t: 'spawn', ids: ['bots'], hold: 900 },
      { t: 'wire', ids: ['bots--web'] },
      { t: 'camera', shot: 'low', on: 'bots' },
      { t: 'callout', on: 'web', title: 'Port 80', body: 'Open to 0.0.0.0/0', tone: 'bad' },
      { t: 'stat', label: 'Requests skipping CloudFront', value: 2000, unit: '/s', tone: 'bad' },
      { t: 'speech', who: 'security', text: 'Someone found the server’s IP. They go straight past CloudFront and hit it directly.' },
      { t: 'camera', shot: 'wide' },
      { t: 'speech', who: 'cto', text: 'A front door only helps if it’s the only door. Let in CloudFront, and nobody else.' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'allowing only the VPC, which shuts out CloudFront too',
    change: { set: { web: { securityGroupInbound: [{ protocol: 'tcp', port: 80, source: 'vpc' }] } } },
    fails: 'firewall.source',
  },
};

const level38: LevelStory = {
  text: {
    title: 'Worldwide Rush',
    tagline: 'Let CloudFront absorb global traffic before it reaches the load balancer.',
    concepts: ['CloudFront for dynamic sites', 'Origin offload', 'Edge latency'],
    briefing:
      'The shop launches worldwide: 2,000 requests a second from every continent, and the two servers can handle 600. Put CloudFront in front of the load balancer, so cached pages are served at the edge and only the misses reach the servers.',
    docTips: [
      'CloudFront works for dynamic sites too: it caches what it’s allowed to, and forwards the rest to the load balancer over the AWS network, reusing connections to the origin.',
    ],
    conceptCard: {
      title: 'Origin offload',
      summary:
        'Every request CloudFront answers from its cache is one your servers never see. With a high cache-hit ratio, a small fleet can serve a global audience, and users get answers from an edge location nearby.',
      analogy: 'A box office that sells most tickets online, so only people with questions queue at the theatre.',
      keyTakeaway: 'Before buying more servers, ask how many requests they should be seeing at all.',
    },
    iacSnippet: `resource "aws_cloudfront_distribution" "shop" {
  enabled = true

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "${CACHING_OPTIMIZED}" # CachingOptimized
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}`,
  },
  stages: [
    {
      title: 'Global launch',
      brief: '2,000 requests a second from every continent, and two servers can serve 600.',
      goal: 'Put CloudFront in front of the load balancer, keeping errors under 1% and latency under 30 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web1', 1, -1, 'Web Server A'), ec2('web2', 1, 1, 'Web Server B'), cdn()],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('users', 'cdn'), wire('cdn', 'alb')],
    ),
    start: ['users', 'alb', 'web1', 'web2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2'] },
      { t: 'caption', text: 'Launch day. Rio’s shop now ships to forty countries.' },
      { t: 'stat', label: 'Requests / s', value: 2000, tone: 'warn' },
      { t: 'traffic', rps: 2000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web1' },
      { t: 'callout', on: 'web1', title: 'CPU 100%', body: '300 requests a second each', tone: 'bad' },
      { t: 'speech', who: 'finance', text: 'Before anyone says “more servers”: what are they actually serving?' },
      { t: 'speech', who: 'oncall', text: 'The same product pages, over and over. Four requests in five are repeats.' },
      { t: 'spawn', ids: ['cdn'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'cdn' },
      { t: 'speech', who: 'cto', text: 'Then let the edge answer the repeats. The servers only need to see what’s new.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'bigger servers instead of a CDN',
    change: { remove: ['cdn'], set: { web1: { instanceType: 'm5.large' }, web2: { instanceType: 'm5.large' } }, wire: 'users-alb' },
    fails: 's1-2',
  },
};

const level39: LevelStory = {
  text: {
    title: 'The Blueprint',
    tagline: 'Build the highly available stack every team will copy.',
    concepts: ['Reference architecture', 'Multi-AZ', 'Infrastructure as code'],
    briefing:
      'Rio’s shop now has three product teams, and each wants a stack of its own. Build the one they’ll all copy: a load balancer, a server in each Availability Zone and a Multi-AZ database. Get it right once, and every copy is right too.',
    docTips: [
      'Write the blueprint as code with CloudFormation, the AWS CDK or Terraform. Every team deploys the same reviewed template, and every change goes through version control.',
    ],
    conceptCard: {
      title: 'Infrastructure as code',
      summary:
        'Instead of clicking resources together, you describe them in a template and let a tool create them. One template builds identical stacks for every team and environment, and rebuilds them after a disaster.',
      analogy: 'A flat-pack instruction sheet: every wardrobe built from it comes out the same.',
      keyTakeaway: 'Design the highly available version once, write it down as code, and never build it by hand again.',
    },
    iacSnippet: `resource "aws_db_instance" "orders" {
  identifier                  = "orders"
  engine                      = "postgres"
  instance_class              = "db.t4g.medium"
  allocated_storage           = 20
  multi_az                    = true
  storage_encrypted           = true
  username                    = "shop"
  manage_master_user_password = true
}`,
  },
  stages: [
    {
      title: 'The blueprint',
      brief: 'Build the stack every team will copy: highly available from day one.',
      goal: 'Build ALB → one server in each AZ → a Multi-AZ database.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web1', 1, -1, 'Web Server A'), ec2('web2', 1, 1, 'Web Server B'), block('db', 'rds', 5, 0, { name: 'Orders DB' })],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2'), wire('web1', 'db'), wire('web2', 'db')],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Three new product teams. Each one wants a stack by Friday.' },
      { t: 'speech', who: 'founder', text: 'Can’t they just copy whatever the shop runs on?' },
      { t: 'speech', who: 'oncall', text: 'The shop was built by hand over two years. Nobody could copy it. Not even me.' },
      { t: 'stat', label: 'Stacks requested', value: 3, tone: 'warn' },
      { t: 'spawn', ids: ['alb', 'web1', 'web2', 'db'] },
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2', 'web1--db', 'web2--db'] },
      { t: 'camera', shot: 'top' },
      { t: 'traffic', expect: 'served' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Every copy inherits this', body: 'Get it right once', tone: 'info' },
      { t: 'speech', who: 'cto', text: 'Build the reference stack once, highly available from day one, then write it down as code.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a blueprint with a single-AZ database',
    change: { set: { db: { multiAZ: false } } },
    fails: 's1-3',
  },
};

const level40: LevelStory = {
  text: {
    title: 'Worldwide Launch',
    tagline: 'Assessment: a global, highly available shop that answers in under 50 ms.',
    concepts: ['Route 53', 'Amazon CloudFront', 'Multi-AZ', 'S3 origins'],
    briefing:
      'The finale: the shop opens to the whole world on Monday. Build the full path, Route 53, CloudFront, a load balancer, a server in each zone and a database, with pages in under 50 ms. Then serve images and scripts straight from S3 through the same distribution.',
    docTips: [
      'Build the path from left to right and run traffic at each step. CloudFront is what brings global latency down.',
      'One distribution can have several origins: a cache behaviour such as /assets/* sends those paths to S3, and everything else goes to the load balancer.',
    ],
    conceptCard: {
      title: 'Global architecture',
      summary:
        'DNS gives users a name, CloudFront answers from the edge, the load balancer spreads the rest across servers in two zones, and the database keeps the truth. Static files skip the servers altogether.',
      analogy: 'A chain of shops with one phone number, a stockroom in every town, and head office only handling special orders.',
      keyTakeaway: 'Give each request the shortest path that can answer it: the edge first, servers second, the database last.',
    },
    iacSnippet: `resource "aws_cloudfront_distribution" "shop" {
  # ...the load balancer origin and default behaviour from level 38...

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    target_origin_id       = "assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "${CACHING_OPTIMIZED}" # CachingOptimized
  }
}`,
  },
  stages: [
    {
      title: 'Worldwide app',
      brief: 'Launch day. Users everywhere expect pages in under 50 ms.',
      goal: 'Build Route 53 → CloudFront → ALB → a server in each AZ → RDS, with latency under 50 ms.',
    },
    {
      title: 'Static assets',
      brief: 'Images and scripts should come straight from storage, not from your servers.',
      goal: 'Serve assets from S3 through the same CloudFront distribution.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        dns(),
        cdn(),
        alb(),
        ec2('web1', 1, -1, 'Web Server A'),
        ec2('web2', 1, 1, 'Web Server B'),
        block('db', 'rds', 5, 0, { name: 'Orders DB' }),
        block('assets', 's3', -2, 2, { name: 'Assets' }),
      ],
      [
        wire('users', 'dns'),
        wire('dns', 'cdn'),
        wire('cdn', 'alb'),
        wire('alb', 'web1'),
        wire('alb', 'web2'),
        wire('web1', 'db'),
        wire('web2', 'db'),
        wire('cdn', 'assets'),
      ],
    ),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Module finale. On Monday, Rio’s shop opens to the whole world.' },
      { t: 'speech', who: 'founder', text: 'Sydney, São Paulo, Stockholm. All of them expect it to feel instant.' },
      { t: 'spawn', ids: ['dns', 'cdn'] },
      { t: 'spawn', ids: ['alb', 'web1', 'web2', 'db'] },
      { t: 'wire', ids: ['users--dns', 'dns--cdn', 'cdn--alb', 'alb--web1', 'alb--web2', 'web1--db', 'web2--db'] },
      { t: 'camera', shot: 'top' },
      { t: 'traffic', rps: 1000, expect: 'served' },
      { t: 'stat', label: 'Target page time', value: 50, unit: 'ms', tone: 'warn' },
      { t: 'spawn', ids: ['assets'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'assets' },
      { t: 'callout', on: 'assets', title: 'Images and scripts', body: 'Most of every page’s bytes', tone: 'info' },
      { t: 'speech', who: 'cto', text: 'You’ve built every piece of this. Now build all of it, and keep it fast.' },
      { t: 'camera', shot: 'orbit' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'DNS straight to the load balancer, skipping the CDN',
    change: { unwire: 'dns-cdn', wire: 'dns-alb' },
    fails: 's1-3',
  },
};

export const MODULE_4_STORIES: Record<number, LevelStory> = {
  31: level31,
  32: level32,
  33: level33,
  34: level34,
  35: level35,
  36: level36,
  37: level37,
  38: level38,
  39: level39,
  40: level40,
};
