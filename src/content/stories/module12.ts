/**
 * Module 12: Migration. Rio buys Fenwick & Sons, a sixty-year-old mail-order firm whose
 * servers live in a basement the landlord wants back in ninety days. One system at a time,
 * using the 7 Rs, everything moves to AWS.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ec2', gridX, gridZ, { name, config });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });

const level111: LevelStory = {
  text: {
    title: 'Lift and Shift',
    tagline: 'Move Fenwick’s order app to EC2 as it is, on a server that can keep up.',
    concepts: ['Rehost', 'The 7 Rs', 'AWS Application Migration Service'],
    briefing:
      'Rio has bought Fenwick & Sons, a mail-order firm whose servers sit in a basement the landlord wants back in 90 days. Start with the order app: move it to EC2 unchanged, on a server big enough for its 500 requests a second.',
    docTips: [
      'AWS Application Migration Service copies a running server’s disks to AWS continuously, then launches it as an EC2 instance at cutover, with minutes of downtime.',
    ],
    conceptCard: {
      title: 'Rehost (lift and shift)',
      summary:
        'Rehosting moves an application to AWS without changing its code: the same software on a virtual machine. It’s the fastest of the 7 Rs, and a starting point for improving the app later.',
      analogy: 'Moving house with every box packed exactly as it was. You can rearrange the furniture once you’re in.',
      keyTakeaway: 'Rehost to get out of the data centre quickly, then optimise once you’re in the cloud.',
    },
    iacSnippet: `resource "aws_instance" "orders" {
  ami           = data.aws_ami.fenwick_orders.id
  instance_type = "t3.medium"
  subnet_id     = aws_subnet.public_a.id

  tags = {
    Name      = "fenwick-orders"
    Migration = "rehost"
  }
}`,
  },
  stages: [
    {
      title: 'Lift and shift',
      brief: 'The basement server handled 500 requests a second. Its replacement must too.',
      goal: 'Launch an EC2 server, wire it to the users, and size it to serve 500 requests a second without errors.',
      hint: 'A t3.micro handles about 300 requests a second. Pick the next size up.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Fenwick Orders', { instanceType: 't3.medium' })], [wire('users', 'web')]),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Rio has bought Fenwick & Sons: sixty years of mail order, and a server room in the basement.' },
      { t: 'speech', who: 'founder', text: 'The landlord wants the basement back in ninety days. Can we move everything by then?' },
      { t: 'speech', who: 'cto', text: 'If we don’t try to rewrite it all first. Step one: lift the order app onto EC2 exactly as it is.' },
      { t: 'spawn', ids: ['web'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Fenwick Orders', body: 'Same code, new home', tone: 'info' },
      { t: 'wire', ids: ['users--web'] },
      { t: 'stat', label: 'Monday peak', value: 500, unit: '/s', tone: 'warn' },
      { t: 'traffic', rps: 500, expect: 'served' },
      { t: 'speech', who: 'oncall', text: 'The old box had eight cores. Whatever we pick has to keep up with the Monday rush.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'the smallest instance, because it’s “only a copy”',
    change: { set: { web: { instanceType: 't3.micro' } } },
    fails: 's1-2',
  },
};

const level112: LevelStory = {
  text: {
    title: 'The Moving Van',
    tagline: 'Set up AWS DMS to carry twenty years of records out of the basement.',
    concepts: ['AWS DMS', 'Replication instances', 'Private subnets'],
    briefing:
      'Fenwick’s customer records, twenty years of them, are still in the basement database. Place an AWS DMS replication instance in the private subnet and connect it to the new RDS database it will fill.',
    docTips: [
      'DMS runs a full load of existing data, then change data capture (CDC) to copy every new write until you cut over. It never needs to face the internet.',
    ],
    conceptCard: {
      title: 'AWS Database Migration Service',
      summary:
        'DMS copies a database to AWS while the source keeps running. It reads the old database, writes to the new one, and keeps replicating changes so the switch can happen in minutes.',
      analogy: 'Removal men who keep forwarding your post to the new house until you’ve fully moved in.',
      keyTakeaway: 'Move the data while the business keeps running; switch over only when the copy has caught up.',
    },
    iacSnippet: `resource "aws_dms_replication_instance" "fenwick" {
  replication_instance_id     = "fenwick-migration"
  replication_instance_class  = "dms.t3.medium"
  allocated_storage           = 50
  publicly_accessible         = false
  replication_subnet_group_id = aws_dms_replication_subnet_group.private.id
}`,
  },
  stages: [
    {
      title: 'The moving van',
      brief: 'Twenty years of customer records still live in the basement.',
      goal: 'Place AWS DMS in the private subnet and connect it to the new database.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, 0, 'Web Server'),
        block('db', 'rds', 5, 0, { name: 'New Database' }),
        block('pubMig', 'dms', 1, 1, { name: 'DMS (public)' }),
        block('mig', 'dms', 4, 1, { name: 'DMS' }),
      ],
      [wire('users', 'web'), wire('web', 'db')],
    ),
    start: ['users', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--db'] },
      { t: 'caption', text: 'The new customer database is ready, and empty. The records are still in the basement.' },
      { t: 'traffic', rps: 100, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'New Database', body: '0 customers', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'I’ll put the migration box next to the web server, where I can get at it.' },
      { t: 'spawn', ids: ['pubMig'], hold: 900 },
      { t: 'callout', on: 'pubMig', title: 'Public subnet', body: 'Reachable from the internet', tone: 'bad' },
      { t: 'speech', who: 'security', text: 'It will hold a copy of every customer record. It goes in the private subnet, next to the database.' },
      { t: 'remove', ids: ['pubMig'] },
      { t: 'spawn', ids: ['mig'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'mig' },
      { t: 'clear' },
      { t: 'caption', text: 'Put DMS in the private subnet and connect it to the new database.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'DMS in the public subnet, where it’s easy to reach',
    change: { move: { mig: [1, 1] } },
    fails: 's1-1',
  },
};

const level113: LevelStory = {
  text: {
    title: 'Keep It in Sync',
    tagline: 'Copy what exists, then stream every change until the switch.',
    concepts: ['Change data capture', 'Amazon RDS', 'Migration targets'],
    briefing:
      'The DMS task for Fenwick’s stock system is ready to run, but it has nowhere to write. Create the RDS database, connect DMS to fill it, and connect the web server so the switch is a single step.',
    docTips: [
      'With full load plus CDC, DMS keeps the target within seconds of the source. Cut over when replication lag is near zero, then stop the task.',
    ],
    conceptCard: {
      title: 'Change data capture',
      summary:
        'After copying everything once, DMS reads the source database’s transaction log and replays each new insert, update and delete on the target. The two stay in step until you switch.',
      analogy: 'A court stenographer: once caught up, every new word is written down as it’s said.',
      keyTakeaway: 'A database migration has two phases: copy what exists, then stream what changes.',
    },
    iacSnippet: `resource "aws_dms_replication_task" "stock" {
  replication_task_id      = "fenwick-stock"
  migration_type           = "full-load-and-cdc"
  replication_instance_arn = aws_dms_replication_instance.fenwick.replication_instance_arn
  source_endpoint_arn      = aws_dms_endpoint.basement.endpoint_arn
  target_endpoint_arn      = aws_dms_endpoint.rds.endpoint_arn
  table_mappings           = file("table-mappings.json")
}`,
  },
  stages: [
    {
      title: 'Live replication',
      brief: 'The migration task is ready, but there’s no database to copy into.',
      goal: 'Add an RDS database, then connect it to both DMS and the web server.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), ec2('web', 0, 0, 'Web Server'), block('mig', 'dms', 4, 1, { name: 'DMS Task' }), block('db', 'rds', 5, 0, { name: 'Stock DB' })],
      [wire('users', 'web')],
    ),
    start: ['users', 'web', 'mig'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: 'Week three. Fenwick’s stock system is next, and the migration task is configured.' },
      { t: 'traffic', rps: 100, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'mig' },
      { t: 'callout', on: 'mig', title: 'DMS Task', body: 'Target endpoint: none', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'I pressed Start and it failed straight away. It has nowhere to write.' },
      { t: 'stat', label: 'Stock changes / hour', value: 1800, tone: 'info' },
      { t: 'speech', who: 'cto', text: 'And stock changes all day, so a one-off copy is stale by lunchtime. It has to keep syncing.' },
      { t: 'spawn', ids: ['db'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Give DMS a target, and point the web server at the same database.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a new database that nothing is filling',
    change: { unwire: 'mig-db' },
    fails: 's1-1',
  },
};

const level114: LevelStory = {
  text: {
    title: 'Boxes in the Attic',
    tagline: 'Archives nobody edits belong in object storage, not on a file server.',
    concepts: ['Replatform', 'Amazon S3', 'AWS DataSync'],
    briefing:
      'Fenwick’s file share holds forty years of scanned invoices and catalogues that nobody edits. Rather than copying it to another file system, replatform it: move the files to S3, where storage costs a fraction as much.',
    docTips: [
      'AWS DataSync copies a file share to S3 over the network and verifies every file. A lifecycle rule can then move old files to cheaper Glacier storage classes.',
    ],
    conceptCard: {
      title: 'Replatform',
      summary:
        'Replatforming changes one part of how an app runs during the move, without rewriting it. Here the app stays the same, but its files move from a file system to object storage.',
      analogy: 'Moving old letters from a filing cabinet into labelled archive boxes in storage.',
      keyTakeaway: 'Small changes on the way in, like a managed service instead of a self-run one, often pay for themselves.',
    },
    iacSnippet: `resource "aws_s3_bucket" "archive" {
  bucket = "fenwick-archive"
}

resource "aws_s3_bucket_lifecycle_configuration" "archive" {
  bucket = aws_s3_bucket.archive.id

  rule {
    id     = "to-glacier"
    status = "Enabled"
    filter {}
    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }
  }
}`,
  },
  stages: [
    {
      title: 'Replatform',
      brief: 'The old file share is mostly archives nobody edits.',
      goal: 'Move the files to S3 and keep the bill under $25 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('web', 0, 0, 'File Server'),
        block('share', 'efs', 4, 0, { name: 'Legacy File Share' }),
        block('files', 's3', 5, 0, { name: 'Archive Bucket' }),
      ],
      [wire('users', 'web'), wire('web', 'share')],
    ),
    start: ['users', 'web', 'share'],
    beats: [
      { t: 'wire', ids: ['users--web', 'web--share'] },
      { t: 'caption', text: 'Fenwick’s file share: forty years of invoices, scanned catalogues and the 1987 Christmas party.' },
      { t: 'traffic', rps: 50, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'share' },
      { t: 'callout', on: 'share', title: 'Legacy File Share', body: 'Files edited this year: 0', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'I could copy it to EFS exactly as it is. Same folders, same paths, done by Friday.' },
      { t: 'speech', who: 'finance', text: 'And pay file-system prices for boxes in the attic?' },
      { t: 'speech', who: 'cto', text: 'Files nobody edits belong in S3. Change that one part on the way in.' },
      { t: 'spawn', ids: ['files'], hold: 900 },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the old file share as well',
    change: { add: 'share:efs@4,0', wire: 'web-share' },
    fails: 's1-2',
  },
};

const level115: LevelStory = {
  text: {
    title: 'Into Containers',
    tagline: 'Swap two half-empty VMs for a container service that packs the work in.',
    concepts: ['Amazon ECS', 'AWS Fargate', 'Replatform'],
    briefing:
      'Fenwick’s catalogue site runs on two large VMs that cost $220 a month to serve 2,000 requests a second. Package the app as a container and run it as an ECS service behind the same load balancer.',
    docTips: [
      'With ECS on Fargate there are no servers to manage: you set CPU and memory per task, and the service keeps the right number of tasks registered with the load balancer.',
    ],
    conceptCard: {
      title: 'Containers',
      summary:
        'A container packages an app with everything it needs, so it runs the same on a laptop and in AWS. ECS schedules containers, replaces failed ones and registers new ones with the load balancer.',
      analogy: 'Shipping containers: one standard box fits every ship, crane and lorry.',
      keyTakeaway: 'Containers pack more work into less compute, and make every deployment the same.',
    },
    iacSnippet: `resource "aws_ecs_service" "catalogue" {
  name            = "catalogue"
  cluster         = aws_ecs_cluster.fenwick.id
  task_definition = aws_ecs_task_definition.catalogue.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.catalogue.arn
    container_name   = "catalogue"
    container_port   = 8080
  }
}`,
  },
  stages: [
    {
      title: 'Containerise',
      brief: 'Two large VMs cost $220 a month to serve 2,000 requests a second.',
      goal: 'Run the app as an ECS service behind the load balancer, with no errors and a bill under $120 a month.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('vm1', 1, -1, 'Legacy VM 1', { instanceType: 'm5.large' }),
        ec2('vm2', 1, 1, 'Legacy VM 2', { instanceType: 'm5.large' }),
        block('svc', 'ecs', 2, 0, { name: 'Catalogue Service' }),
      ],
      [wire('users', 'alb'), wire('alb', 'vm1'), wire('alb', 'vm2')],
    ),
    start: ['users', 'alb', 'vm1', 'vm2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--vm1', 'alb--vm2'] },
      { t: 'caption', text: 'Fenwick’s catalogue site, lifted onto two big VMs last month.' },
      { t: 'traffic', rps: 2000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'vm1' },
      { t: 'callout', on: 'vm1', title: 'm5.large', body: 'CPU 30% · $110 a month', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Each VM runs one copy of the app, plus a whole operating system I have to patch.' },
      { t: 'speech', who: 'cto', text: 'Package the app in a container and let ECS run as many copies as the load needs.' },
      { t: 'spawn', ids: ['svc'], hold: 900 },
      { t: 'camera', shot: 'orbit', on: 'svc' },
      { t: 'clear' },
      { t: 'caption', text: 'Swap the VMs for an ECS service.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping one VM “just in case”',
    change: { add: 'vm1:ec2@1,-1', set: { vm1: { instanceType: 'm5.large' } }, wire: 'alb-vm1' },
    fails: 's1-2',
  },
};

const level116: LevelStory = {
  text: {
    title: 'The Last Server',
    tagline: 'Refactor the final legacy server into a function, and stop patching it.',
    concepts: ['Refactor', 'AWS Lambda', 'Serverless'],
    briefing:
      'One old server still sits behind Fenwick’s public API, turning requests into reads on the orders table. Its operating system loses security support next month. Refactor it into a Lambda function and retire the server.',
    docTips: [
      'Refactoring takes the most effort of the 7 Rs, so save it for the parts that change often or cost the most to run. Afterwards, patching, scaling and failover are AWS’s job.',
    ],
    conceptCard: {
      title: 'Refactor (re-architect)',
      summary:
        'Refactoring rewrites part of an application to use cloud-native services. It takes the most effort, and removes the most operational work: no operating system, no capacity planning.',
      analogy: 'Renovating instead of just moving in: harder work, but the house finally fits how you live.',
      keyTakeaway: 'Refactor where the payoff is biggest. Not everything needs it.',
    },
    iacSnippet: `resource "aws_lambda_function" "orders_api" {
  function_name = "fenwick-orders-api"
  role          = aws_iam_role.orders_api.arn
  runtime       = "python3.13"
  handler       = "app.handler"
  filename      = "orders_api.zip"

  environment {
    variables = { TABLE_NAME = aws_dynamodb_table.orders.name }
  }
}`,
  },
  stages: [
    {
      title: 'Refactor',
      brief: 'The legacy API server is the last server in the stack.',
      goal: 'Replace it with a Lambda function, and leave no EC2 instances on the board.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('api', 'apigw', -2, 0, { name: 'Public API' }),
        ec2('legacy', 1, 0, 'Legacy API Server'),
        block('fn', 'lambda', 4, 0, { name: 'Orders Function' }),
        block('table', 'dynamodb', 6, 0, { name: 'Orders Table' }),
      ],
      [wire('users', 'api'), wire('api', 'legacy'), wire('legacy', 'table')],
    ),
    start: ['users', 'api', 'legacy', 'table'],
    beats: [
      { t: 'wire', ids: ['users--api', 'api--legacy', 'legacy--table'] },
      { t: 'caption', text: 'Patch Tuesday. There’s one server left in Fenwick’s estate that still needs patching.' },
      { t: 'traffic', rps: 100, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'legacy' },
      { t: 'callout', on: 'legacy', title: 'Legacy API Server', body: 'OS security support ends next month', tone: 'bad' },
      { t: 'speech', who: 'security', text: 'After next month it gets no more security fixes. Upgrade it, or get rid of it.' },
      { t: 'speech', who: 'cto', text: 'All it does is turn API calls into table reads. That’s a few dozen lines in a function.' },
      { t: 'spawn', ids: ['fn'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Rewrite it as a Lambda function, and switch the last server off.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the old server around, unplugged',
    change: { add: 'legacy:ec2@1,0' },
    fails: 's1-2',
  },
};

const level117: LevelStory = {
  text: {
    title: 'Cutover Night',
    tagline: 'Point DNS at the new home, then switch off the old one. In that order.',
    concepts: ['Amazon Route 53', 'DNS TTL', 'Cutover and rollback'],
    briefing:
      'Fenwick’s new AWS server is tested and ready, but DNS still sends every customer to the basement. Point Route 53 at the new server, then retire the old one, without dropping a single request.',
    docTips: [
      'Lower the record’s TTL to 60 seconds a day before cutover, so resolvers pick up the change within a minute. Weighted records can shift traffic gradually instead of all at once.',
    ],
    conceptCard: {
      title: 'DNS cutover',
      summary:
        'Users find your app through DNS. Changing one record moves them to the new environment, and changing it back is your rollback plan. Only retire the old server once traffic has drained from it.',
      analogy: 'Redirecting your post to a new address, and keeping the old house until the letters stop arriving there.',
      keyTakeaway: 'Switch first, watch, then retire. Never the other way round.',
    },
    iacSnippet: `resource "aws_route53_record" "shop" {
  zone_id = aws_route53_zone.fenwick.zone_id
  name    = "shop.fenwick.example"
  type    = "A"
  ttl     = 60
  records = [aws_eip.new_server.public_ip]
}`,
  },
  stages: [
    {
      title: 'Cutover',
      brief: 'The new server is ready. DNS still sends everyone to the old one.',
      goal: 'Point DNS at the new server, then retire the old one, with no errors.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        block('dns', 'route53', -4, 0, { name: 'Route 53' }),
        ec2('old', 0, -1, 'Old Data Centre'),
        ec2('new', 0, 1, 'New AWS Server'),
      ],
      [wire('users', 'dns'), wire('dns', 'old')],
    ),
    start: ['users', 'dns', 'old', 'new'],
    beats: [
      { t: 'wire', ids: ['users--dns', 'dns--old'] },
      { t: 'caption', text: 'Fenwick’s last night in the basement. The new server has passed every test.' },
      { t: 'traffic', rps: 200, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'old' },
      { t: 'callout', on: 'old', title: 'Old Data Centre', body: 'Lease ends Friday', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Shall I just unplug the old one and see what happens?' },
      { t: 'speech', who: 'cto', text: 'Not while DNS still points at it. Switch the record, watch the traffic move, then retire it.' },
      { t: 'camera', shot: 'close', on: 'new' },
      { t: 'callout', on: 'new', title: 'New AWS Server', body: 'Tested · no traffic yet', tone: 'info' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Move the DNS record, then switch off the basement.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'retiring the old server before moving DNS',
    change: { unwire: 'dns-new' },
    fails: 's1-2',
  },
};

const level118: LevelStory = {
  text: {
    title: 'Head Office Link',
    tagline: 'Give the people still on premises a private road into the cloud.',
    concepts: ['AWS Transit Gateway', 'Site-to-Site VPN', 'Hybrid networking'],
    briefing:
      'Fenwick’s warehouse team still works from head office and needs the migrated stock app every day, but it must not be opened to the internet for them. Connect head office through a Transit Gateway so their traffic takes a private route to the app.',
    docTips: [
      'A Site-to-Site VPN attaches to a Transit Gateway over encrypted IPsec tunnels. For steady, heavy traffic, AWS Direct Connect gives you a dedicated private line.',
    ],
    conceptCard: {
      title: 'Hybrid networking',
      summary:
        'During a migration, and often long after, some people and systems stay on premises. A Transit Gateway is a hub that joins VPCs and on-premises networks, so they talk privately instead of over the public internet.',
      analogy: 'A covered walkway between two buildings, so staff don’t have to go round by the street.',
      keyTakeaway: 'Migrations are rarely all at once. Plan the private link between old and new early.',
    },
    iacSnippet: `resource "aws_ec2_transit_gateway" "hub" {
  description = "Fenwick head office to AWS"
}

resource "aws_vpn_connection" "head_office" {
  customer_gateway_id = aws_customer_gateway.head_office.id
  transit_gateway_id  = aws_ec2_transit_gateway.hub.id
  type                = "ipsec.1"
}`,
  },
  stages: [
    {
      title: 'Hybrid bridge',
      brief: 'Head-office staff must reach the migrated app over a private link, not the internet.',
      goal: 'Connect them through a Transit Gateway to the app and its database.',
      hint: 'In this level the users block is head office. Wire it to a Transit Gateway, and the gateway to the app.',
    },
  ],
  cutscene: {
    stage: board(
      [
        block('users', 'client', -6, 0, { name: 'Head Office', locked: true }),
        ec2('app', 1, 0, 'Migrated App'),
        block('db', 'rds', 5, 0, { name: 'Migrated DB' }),
        block('hub', 'tgw', -2, 0, { name: 'Transit Gateway' }),
      ],
      [wire('app', 'db')],
    ),
    start: ['users', 'app', 'db'],
    beats: [
      { t: 'wire', ids: ['app--db'] },
      { t: 'caption', text: 'Fenwick’s warehouse team still works from head office, and the stock app is now in AWS.' },
      { t: 'camera', shot: 'close', on: 'app' },
      { t: 'callout', on: 'app', title: 'Migrated App', body: 'No route from head office', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'Easy fix: give the app a public address and they can log in over the internet.' },
      { t: 'speech', who: 'security', text: 'Supplier prices and stock levels stay off the internet. Head office gets a private route.' },
      { t: 'spawn', ids: ['hub'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'hub' },
      { t: 'speech', who: 'cto', text: 'A Transit Gateway: one hub where the office VPN and our VPC meet. Nothing crosses the open internet.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Build the bridge from head office to the app.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'opening the app to the internet instead',
    change: { remove: ['hub'], wire: 'users-app' },
    fails: 's1-1',
  },
};

const level119: LevelStory = {
  text: {
    title: 'Retire the Old Boxes',
    tagline: 'The cheapest server to migrate is the one you switch off.',
    concepts: ['Retire', 'Decommissioning', 'Target groups'],
    briefing:
      'Fenwick’s last two legacy servers died overnight, and they’re still in the load balancer’s target group. The new server is ready and idle. Decommission the dead ones and send all the traffic to the new one.',
    docTips: [
      'Retire is one of the 7 Rs: most estates hold servers nobody needs any more. Snapshot anything you must keep, take the old targets out of the load balancer, then delete them.',
    ],
    conceptCard: {
      title: 'Retire',
      summary:
        'Every migration turns up servers that should simply stop: duplicates, dead apps, hardware past its life. Retiring them cuts cost, removes attack surface, and leaves less to migrate.',
      analogy: 'Clearing out the garage before the move instead of paying to ship broken bikes.',
      keyTakeaway: 'Don’t migrate what you can retire. Switch it off and remove it from every route.',
    },
    iacSnippet: `resource "aws_lb_target_group_attachment" "new_server" {
  target_group_arn = aws_lb_target_group.fenwick.arn
  target_id        = aws_instance.new_server.id
  port             = 80
}`,
  },
  stages: [
    {
      title: 'Retire the old boxes',
      brief: 'Both legacy servers have died. The new one is waiting, with no traffic.',
      goal: 'Remove the dead servers and send traffic to the new one, with no errors.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('old1', 1, -2, 'Legacy Box 1'), ec2('old2', 1, -1, 'Legacy Box 2'), ec2('spare', 1, 2, 'New Server')],
      [wire('users', 'alb'), wire('alb', 'old1'), wire('alb', 'old2')],
    ),
    start: ['users', 'alb', 'old1', 'old2', 'spare'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--old1', 'alb--old2'] },
      { t: 'caption', text: '4:12 a.m. The two oldest boxes from Fenwick’s basement are still taking traffic.' },
      { t: 'traffic', rps: 200, expect: 'served', hold: 3000 },
      { t: 'crash', id: 'old1' },
      { t: 'crash', id: 'old2' },
      { t: 'traffic', rps: 200, expect: 'blocked', hold: 3000 },
      { t: 'camera', shot: 'low', on: 'old2' },
      { t: 'callout', on: 'old2', title: 'Legacy Box 2', body: 'Disk failure · 11 years old', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'Nobody makes parts for these any more. I can’t even buy a replacement disk.' },
      { t: 'speech', who: 'cto', text: 'Then we don’t repair them. The new server is ready: retire the old ones and move the traffic.' },
      { t: 'camera', shot: 'close', on: 'spare' },
      { t: 'callout', on: 'spare', title: 'New Server', body: 'Healthy · no traffic', tone: 'info' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping one old box in the pool as a spare',
    change: { add: 'old1:ec2@1,-2', wire: 'alb-old1' },
    fails: 's1-1',
  },
};

const level120: LevelStory = {
  text: {
    title: 'The Ledger Move',
    tagline: 'Assessment: migrate a live money ledger with no downtime and no lost pennies.',
    concepts: ['Database migration', 'Multi-AZ', 'Zero-downtime cutover'],
    briefing:
      'The last Fenwick system is its store-card ledger: the balance of every store-card account, and it can never go offline. Move the data into a Multi-AZ database with DMS while the app keeps running, then put the app behind a load balancer with a second server in the other Availability Zone.',
    docTips: [
      'For financial data, turn on Multi-AZ on the target before the cutover, not after, and use DMS data validation to compare rows between source and target.',
      'An ALB with targets in two Availability Zones keeps serving if one zone fails. Check that the new target is healthy before you need it.',
    ],
    conceptCard: {
      title: 'Zero-downtime migration',
      summary:
        'A careful migration never has a moment when the business stops. Data replicates while the old system runs, the new stack is built for failure from day one, and traffic moves only when everything is ready.',
      analogy: 'Building a new bridge beside the old one, then moving the traffic across lane by lane.',
      keyTakeaway: 'Move the data live, build in redundancy before the switch, and always keep a way back.',
    },
    iacSnippet: `resource "aws_db_instance" "ledger" {
  identifier                  = "fenwick-ledger"
  engine                      = "postgres"
  instance_class              = "db.m7g.large"
  allocated_storage           = 200
  multi_az                    = true
  storage_encrypted           = true
  deletion_protection         = true
  username                    = "ledger"
  manage_master_user_password = true
}`,
  },
  stages: [
    {
      title: 'Move the data',
      brief: 'The ledger has to move while the app keeps taking payments.',
      goal: 'Add a Multi-AZ RDS database, feed it with DMS, and wire the app to it.',
    },
    {
      title: 'Zero downtime',
      brief: 'One app server is one failure away from an outage.',
      goal: 'Put a load balancer in front, and add a second server in the other Availability Zone.',
      hint: 'Wire the users to a load balancer, the load balancer to both servers, and the new server to the database.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        ec2('mono', 1, 0, 'Banking App'),
        block('db', 'rds', 5, 0, { name: 'Ledger DB', config: { multiAZ: true } }),
        block('mig', 'dms', 4, 2, { name: 'DMS' }),
        alb(),
        ec2('web2', 1, 2, 'Second Server'),
      ],
      [wire('users', 'mono'), wire('mono', 'db'), wire('mig', 'db')],
    ),
    start: ['users', 'mono'],
    beats: [
      { t: 'wire', ids: ['users--mono'] },
      { t: 'caption', text: 'The last Fenwick system: the store-card ledger. Every balance, and it can’t stop.' },
      { t: 'traffic', rps: 200, expect: 'served' },
      { t: 'speech', who: 'founder', text: 'Customers pay their store-card bills at all hours. No “down for maintenance” page. Ever.' },
      { t: 'camera', shot: 'close', on: 'mono' },
      { t: 'callout', on: 'mono', title: 'Banking App', body: 'One server · one zone', tone: 'warn' },
      { t: 'spawn', ids: ['db', 'mig'], hold: 900 },
      { t: 'wire', ids: ['mig--db'] },
      { t: 'camera', shot: 'low', on: 'db' },
      { t: 'speech', who: 'cto', text: 'DMS copies the ledger while the app keeps running. The new database gets its standby from day one.' },
      { t: 'speech', who: 'security', text: 'The regulator will ask what happens if a data centre fails. “We hope it won’t” isn’t an answer.' },
      { t: 'spawn', ids: ['alb', 'web2'], hold: 900 },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Move the data live, then make the app survive losing a zone.' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'a second server, but in the same zone',
    change: { move: { web2: [1, -2] } },
    fails: 's2-2',
  },
};

export const MODULE_12_STORIES: Record<number, LevelStory> = {
  111: level111,
  112: level112,
  113: level113,
  114: level114,
  115: level115,
  116: level116,
  117: level117,
  118: level118,
  119: level119,
  120: level120,
};
