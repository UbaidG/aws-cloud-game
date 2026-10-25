/**
 * Module 5: Networking (VPC). A supermarket chain wants to stock Rio’s products, but first its
 * security team wants to see the network. Ines gives the shop a VPC of its own, room by room,
 * until it can pass the review.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ec2', gridX, gridZ, { name, config });
const igw = (gridX = -2, gridZ = 0) => block('igw', 'igw', gridX, gridZ, { name: 'Internet Gateway' });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });
const nat = (id: string, gridX: number, gridZ = 0) => block(id, 'nat_gw', gridX, gridZ, { name: 'NAT Gateway' });
const rds = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'rds', gridX, gridZ, { name, config });

const SSH_ANY = { protocol: 'tcp', port: 22, source: '0.0.0.0/0' } as const;
const PG_ANY = { protocol: 'tcp', port: 5432, source: '0.0.0.0/0' } as const;

const level41: LevelStory = {
  text: {
    title: 'A Door to the Internet',
    tagline: 'A new VPC is sealed shut. Give it a front door.',
    concepts: ['Amazon VPC', 'Internet Gateway', 'Route tables'],
    briefing:
      'Ines has moved the web server into a VPC of its own, and nothing outside can reach it. Attach an Internet Gateway and send the shop’s customers through it to the web server.',
    docTips: [
      'A VPC you create has no route to the internet until you attach an Internet Gateway and add a 0.0.0.0/0 route to it in the subnet’s route table.',
      'The Internet Gateway itself is free and scales on its own. You pay for data leaving AWS, and for each public IPv4 address.',
    ],
    conceptCard: {
      title: 'Internet Gateway',
      summary:
        'A VPC is your own private network inside AWS. An Internet Gateway attaches to it and lets traffic flow between the internet and any subnet whose route table points at the gateway.',
      analogy: 'A new office building with no front door. The gateway is the door; the route table is the sign pointing visitors to it.',
      keyTakeaway: 'No Internet Gateway, no internet. A VPC starts sealed, and you open exactly what you choose.',
    },
    iacSnippet: `resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}`,
  },
  stages: [
    {
      title: 'Front door',
      brief: 'The web server sits in a brand-new VPC with no way in from the internet.',
      goal: 'Add an Internet Gateway and route users through it to the web server.',
      hint: 'Drop the Internet Gateway in the Edge zone, then wire Users → Gateway → Web Server.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server'), igw()], [wire('users', 'igw'), wire('igw', 'web')]),
    start: ['users', 'web'],
    beats: [
      { t: 'caption', text: 'A supermarket chain wants to stock Rio’s products. First, its security team wants to see the network.' },
      { t: 'speech', who: 'founder', text: 'They asked for our network diagram. Do we have a network diagram?' },
      { t: 'speech', who: 'security', text: 'We do now. I’ve moved the web server into a VPC of our own.' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Route table', body: 'Local traffic only. No way in or out.', tone: 'warn' },
      { t: 'stat', label: 'Visitors reaching the shop', value: 0, tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'It’s been dark since nine. A new VPC has no door to the internet.' },
      { t: 'camera', shot: 'wide' },
      { t: 'spawn', ids: ['igw'], hold: 900 },
      { t: 'clear' },
      { t: 'caption', text: 'Attach an Internet Gateway and route the customers through it.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'wiring users straight to the server, with no gateway',
    change: { remove: ['igw'], wire: 'users-web' },
    fails: 's1-1',
  },
};

const level42: LevelStory = {
  text: {
    title: 'Wrong Room',
    tagline: 'A web server in the private subnet is safe from attackers, and from customers.',
    concepts: ['Public subnets', 'Private subnets', 'Route tables'],
    briefing:
      'The web server was rebuilt overnight in the private subnet, and the Internet Gateway can’t reach it. Get a web server into the public subnet and wire the gateway to it.',
    docTips: [
      'A subnet is “public” only because its route table sends 0.0.0.0/0 to an Internet Gateway. A private subnet’s route table has no such route.',
      'Each subnet lives in exactly one Availability Zone, so plan one public and one private subnet per zone.',
    ],
    conceptCard: {
      title: 'Public and private subnets',
      summary:
        'A VPC is split into subnets. Public subnets route to the Internet Gateway and hold things customers talk to; private subnets have no inbound route from the internet and hold everything else.',
      analogy: 'The shop floor and the stockroom. Customers walk onto the shop floor; they never wander into the stockroom.',
      keyTakeaway: 'Whatever customers connect to directly goes in a public subnet. Nothing else does.',
    },
    iacSnippet: `resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}`,
  },
  stages: [
    {
      title: 'Wrong room',
      brief: 'The web server sits in the private subnet, which the Internet Gateway can’t reach.',
      goal: 'Get a web server into the public subnet, wired to the Internet Gateway.',
      hint: 'Delete the private server and place a new one in the Public Subnet, or drag it across.',
    },
  ],
  cutscene: {
    stage: board([users(), igw(), ec2('bad', 4, 0, 'Web Server')], [wire('users', 'igw'), wire('igw', 'bad')]),
    start: ['users', 'igw', 'bad'],
    beats: [
      { t: 'wire', ids: ['users--igw', 'igw--bad'] },
      { t: 'caption', text: 'Dev rebuilt the web server overnight, and tucked it into the private subnet.' },
      { t: 'traffic', expect: 'blocked' },
      { t: 'camera', shot: 'close', on: 'bad' },
      { t: 'callout', on: 'bad', title: 'Private subnet', body: 'No route to the Internet Gateway', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'Private sounded safer. Nobody can attack it in there.' },
      { t: 'speech', who: 'security', text: 'Nobody can buy anything from it either. The web server is the one thing that has to face the internet.' },
      { t: 'camera', shot: 'low', on: 'igw' },
      { t: 'clear' },
      { t: 'caption', text: 'Put a web server in the public subnet, behind the gateway.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'leaving the web server in the private subnet',
    change: { move: { web: [4, 0] } },
    fails: 'link.edge_to_private',
  },
};

const level43: LevelStory = {
  text: {
    title: 'Into the Vault',
    tagline: 'The customer database is on the shop floor. Move it to the back room.',
    concepts: ['Private subnets', 'Amazon RDS', 'Defence in depth'],
    briefing:
      'The shop works, but the customer database sits in the public subnet where the internet can knock on its door. Move it into the private subnet, still wired to the web server.',
    docTips: [
      'Give RDS a DB subnet group made only of private subnets and set “Publicly accessible” to No. Then it has no public address at all.',
      'A security group is the second lock, not the first. A database with no route from the internet can’t be reached even if a rule is wrong.',
    ],
    conceptCard: {
      title: 'Isolating the data tier',
      summary:
        'Databases belong in private subnets. They have no public IP and no route from the internet, so the only way in is through the application servers you control.',
      analogy: 'The safe is in the back office, not on the counter. Staff walk to it; customers never see it.',
      keyTakeaway: 'Data lives in private subnets. Only your own servers ever talk to it.',
    },
    iacSnippet: `resource "aws_db_subnet_group" "private" {
  name       = "private-db"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_db_instance" "customers" {
  engine                      = "postgres"
  instance_class              = "db.t4g.micro"
  allocated_storage           = 20
  username                    = "shop"
  manage_master_user_password = true
  db_subnet_group_name        = aws_db_subnet_group.private.name
  publicly_accessible         = false
}`,
  },
  stages: [
    {
      title: 'Into the vault',
      brief: 'The customer database is sitting in the public subnet.',
      goal: 'Get the database into the private subnet, still wired to the web server.',
      hint: 'Delete the exposed database, place one in the Private Subnet and wire the web server to it.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), igw(), ec2('web', 0, 0, 'Web Server'), rds('db', 1, 1, 'Customer DB')],
      [wire('users', 'igw'), wire('igw', 'web'), wire('web', 'db')],
    ),
    start: ['users', 'igw', 'web', 'db'],
    illegal: ['db'],
    beats: [
      { t: 'wire', ids: ['users--igw', 'igw--web', 'web--db'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'caption', text: 'The shop works. Ines runs the supermarket’s security checklist anyway.' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Public subnet', body: 'Port 5432 answers the internet', tone: 'bad' },
      { t: 'stat', label: 'Database login attempts / day', value: 2300, tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'It was the subnet already selected when I clicked Create. I never moved it.' },
      { t: 'speech', who: 'security', text: 'A database never needs a public address. Only the web server should ever talk to it.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Move the customer database into the private subnet.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the database in the public subnet',
    change: { move: { vault: [1, 1] } },
    fails: 'zone.db_exposed',
  },
};

const level44: LevelStory = {
  text: {
    title: 'Patch Tuesday',
    tagline: 'A private server can’t be reached. It still needs a way out.',
    concepts: ['NAT Gateway', 'Outbound-only access', 'Patching'],
    briefing:
      'The app server in the private subnet can’t download a critical security patch, because it has no route out. Give it a NAT Gateway, and connect the NAT Gateway to the Internet Gateway.',
    docTips: [
      'A NAT Gateway lets private servers start connections out, and lets the replies back. Nothing on the internet can start a connection in through it.',
      'NAT Gateways bill by the hour and per gigabyte processed. Traffic to S3 or DynamoDB can skip it through a free gateway VPC endpoint.',
    ],
    conceptCard: {
      title: 'NAT Gateway',
      summary:
        'A NAT Gateway sits in a public subnet. Private subnets send their internet-bound traffic to it, and it forwards that traffic through the Internet Gateway under its own public address.',
      analogy: 'A one-way post room. Staff can send letters out and get replies, but nobody outside can post anything to their desks.',
      keyTakeaway: 'Private servers go out through a NAT Gateway. They never get a door that opens inwards.',
    },
    iacSnippet: `resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_a.id
}

resource "aws_route" "private_out" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main.id
}`,
  },
  stages: [
    {
      title: 'Patch Tuesday',
      brief: 'The private app server must download security patches, but it has no way out.',
      goal: 'Wire the app server to a NAT Gateway, and the NAT Gateway to the Internet Gateway.',
      hint: 'Place the NAT Gateway in the Public Subnet, then wire App Server → NAT → Internet Gateway.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), igw(), alb(), ec2('app', 4, 0, 'App Server'), nat('nat', 2, 0)],
      [wire('users', 'igw'), wire('igw', 'alb'), wire('alb', 'app'), wire('app', 'nat'), wire('nat', 'igw')],
    ),
    start: ['users', 'igw', 'alb', 'app'],
    beats: [
      { t: 'wire', ids: ['users--igw', 'igw--alb', 'alb--app'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'caption', text: 'Patch Tuesday. A critical fix lands for the app server’s operating system.' },
      { t: 'camera', shot: 'close', on: 'app' },
      { t: 'callout', on: 'app', title: 'dnf update', body: 'Connection timed out', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'Customers can reach it through the load balancer. It can’t reach anything.' },
      { t: 'speech', who: 'security', text: 'Good: nothing outside should start a conversation with it. But it has to call out.' },
      { t: 'spawn', ids: ['nat'], hold: 900 },
      { t: 'camera', shot: 'low', on: 'nat' },
      { t: 'clear' },
      { t: 'caption', text: 'Give the app server a one-way exit through a NAT Gateway.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'wiring the private server straight to the Internet Gateway',
    change: { remove: ['nat'], wire: 'app-igw' },
    fails: 's1-1',
  },
};

const level45: LevelStory = {
  text: {
    title: 'Misplaced NAT',
    tagline: 'A NAT Gateway in the private subnet has nowhere to send anything.',
    concepts: ['NAT Gateway placement', 'Route tables'],
    briefing:
      'Last week’s NAT Gateway was built in the private subnet, so it has no route to the internet and the app server still can’t patch. Run the NAT Gateway from the public subnet and reconnect it.',
    docTips: [
      'A NAT Gateway needs a route to the internet itself. Put it in a public subnet, then point the private route table’s 0.0.0.0/0 at it.',
      'One NAT Gateway per Availability Zone keeps a zone outage from cutting off the other zone’s servers.',
    ],
    conceptCard: {
      title: 'Where the NAT Gateway lives',
      summary:
        'A zonal NAT Gateway borrows the public subnet’s route to the Internet Gateway. Placed in a private subnet, it has no such route, and everything sent to it dies there.',
      analogy: 'A post room in a basement with no door to the street. Letters arrive, and stay.',
      keyTakeaway: 'Private servers point at the NAT Gateway; the NAT Gateway sits in a public subnet.',
    },
    iacSnippet: `resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  # A public subnet: its route table sends 0.0.0.0/0 to the Internet Gateway.
  subnet_id     = aws_subnet.public_a.id
}`,
  },
  stages: [
    {
      title: 'Misplaced NAT',
      brief: 'The NAT Gateway sits in the private subnet, so it has no route out.',
      goal: 'Run a NAT Gateway from the public subnet, wired to the app server and the Internet Gateway.',
      hint: 'Delete the misplaced NAT Gateway and place a new one in the Public Subnet.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), igw(), alb(), ec2('app', 4, 0, 'App Server'), nat('nat', 5, 1)],
      [wire('users', 'igw'), wire('igw', 'alb'), wire('alb', 'app'), wire('app', 'nat'), wire('nat', 'igw')],
    ),
    start: ['users', 'igw', 'alb', 'app', 'nat'],
    illegal: ['nat'],
    beats: [
      { t: 'wire', ids: ['users--igw', 'igw--alb', 'alb--app', 'app--nat', 'nat--igw'] },
      { t: 'caption', text: 'A contractor built the NAT Gateway last week. The patches still aren’t arriving.' },
      { t: 'camera', shot: 'top' },
      { t: 'callout', on: 'nat', title: 'Private subnet', body: 'No route to the Internet Gateway', tone: 'bad' },
      { t: 'stat', label: 'Days since the last patch', value: 9, tone: 'warn' },
      { t: 'speech', who: 'security', text: 'A NAT Gateway in the private subnet is a door that opens onto another locked room.' },
      { t: 'camera', shot: 'close', on: 'nat' },
      { t: 'speech', who: 'oncall', text: 'So it has to sit in the public subnet, where there’s a route out to the gateway.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Run the NAT Gateway from the public subnet.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a new NAT Gateway, still in the private subnet',
    change: { move: { nat2: [5, 1] } },
    fails: 's1-1',
  },
};

const level46: LevelStory = {
  text: {
    title: 'Chain of Trust',
    tagline: 'Each tier opens one port, to the tier in front of it.',
    concepts: ['Security groups', 'Stateful firewalls', 'Least privilege'],
    briefing:
      'The app server only allows SSH, from anywhere, and the database accepts PostgreSQL from the whole internet. Open port 80 on the app and 5432 on the database to the VPC only.',
    docTips: [
      'Security groups are stateful: allow a request in and its reply goes out automatically. Better still than a VPC range, use the load balancer’s security group as the source.',
    ],
    conceptCard: {
      title: 'Security group chaining',
      summary:
        'Every tier gets its own security group. The app accepts traffic only from the load balancer, and the database only from the app, so a stranger can’t skip a step.',
      analogy: 'Passes that open one door each: the lobby pass gets you to reception, never straight into the vault.',
      keyTakeaway: 'Open the port each tier needs, only to the tier that calls it. Close everything else.',
    },
    iacSnippet: `resource "aws_vpc_security_group_ingress_rule" "app_http" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id
  ip_protocol                  = "tcp"
  from_port                    = 80
  to_port                      = 80
}

resource "aws_vpc_security_group_ingress_rule" "db_postgres" {
  security_group_id            = aws_security_group.db.id
  referenced_security_group_id = aws_security_group.app.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}`,
  },
  stages: [
    {
      title: 'Chain of trust',
      brief: 'The app server only allows SSH, and the database is open to the world.',
      goal: 'App: port 80 from the VPC only. Database: 5432 from the VPC only. Security score 100.',
      hint: 'Select each block and edit its security group. Use the VPC as the source, not 0.0.0.0/0.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web', 3, 0, 'App Server', { securityGroupInbound: [SSH_ANY] }),
        rds('db', 5, 0, 'Orders DB', { securityGroupInbound: [PG_ANY] }),
      ],
      [wire('users', 'alb'), wire('alb', 'web'), wire('web', 'db')],
    ),
    start: ['users', 'alb', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web', 'web--db'] },
      { t: 'caption', text: 'Ines reads the firewall rules line by line.' },
      { t: 'traffic', expect: 'blocked' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Inbound: port 22', body: 'From 0.0.0.0/0. Nothing on port 80.', tone: 'bad' },
      { t: 'callout', on: 'db', title: 'Inbound: port 5432', body: 'From 0.0.0.0/0', tone: 'bad' },
      { t: 'stat', label: 'Security score', value: 60, tone: 'bad' },
      { t: 'speech', who: 'security', text: 'The one door customers need is shut, and two doors only attackers want are open.' },
      { t: 'camera', shot: 'orbit', on: 'web' },
      { t: 'speech', who: 'cto', text: 'Each tier trusts only the tier in front of it: load balancer, then app, then database.' },
      { t: 'clear' },
      { t: 'caption', text: 'Open port 80 on the app and 5432 on the database, to the VPC only.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'opening port 80 on the app server to the whole internet',
    change: { set: { web: { securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }] } } },
    fails: 's1-2',
  },
};

const level47: LevelStory = {
  text: {
    title: 'Lobby and Back Office',
    tagline: 'Only the load balancer faces the internet. The servers work out of sight.',
    concepts: ['Internet-facing load balancers', 'Private app tier'],
    briefing:
      'The supermarket’s checklist asks whether app servers can be reached without the load balancer. Put two app servers in the private subnet and send the load balancer’s traffic to both.',
    docTips: [
      'An internet-facing ALB lives in public subnets in at least two Availability Zones. Its targets can sit in private subnets with no public IP at all.',
    ],
    conceptCard: {
      title: 'Public front, private back',
      summary:
        'The load balancer is the only thing with a public address. It forwards requests to servers in private subnets, which nobody on the internet can reach directly.',
      analogy: 'A hotel lobby. Guests deal with the front desk; the kitchen staff never meet them, and the kitchen has no street door.',
      keyTakeaway: 'Put the load balancer in public subnets and everything behind it in private ones.',
    },
    iacSnippet: `resource "aws_instance" "app_a" {
  ami                         = data.aws_ami.al2023.id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.private_a.id
  associate_public_ip_address = false
}

resource "aws_lb_target_group_attachment" "app_a" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.app_a.id
  port             = 80
}`,
  },
  stages: [
    {
      title: 'Lobby and back office',
      brief: 'Only the load balancer should face the internet.',
      goal: 'Put two app servers in the private subnet, both receiving traffic from the load balancer.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('pub1', 1, -1, 'Web Server A'),
        ec2('pub2', 1, 1, 'Web Server B'),
        ec2('app1', 4, -1, 'App Server A'),
        ec2('app2', 4, 1, 'App Server B'),
      ],
      [wire('users', 'alb'), wire('alb', 'pub1'), wire('alb', 'pub2')],
    ),
    start: ['users', 'alb', 'pub1', 'pub2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--pub1', 'alb--pub2'] },
      { t: 'caption', text: 'Checklist item 4: “Can app servers be reached without the load balancer?”' },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'pub1' },
      { t: 'callout', on: 'pub1', title: 'Public IP address', body: 'Reachable directly, skipping the load balancer', tone: 'warn' },
      { t: 'speech', who: 'security', text: 'Then the answer is yes, and it should be no. Only the load balancer belongs in the lobby.' },
      { t: 'remove', ids: ['pub1', 'pub2'] },
      { t: 'spawn', ids: ['app1', 'app2'], hold: 900 },
      { t: 'camera', shot: 'top' },
      { t: 'clear' },
      { t: 'caption', text: 'Put two app servers in the private subnet, behind the load balancer.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'app servers in the public subnet, next to the load balancer',
    change: { move: { app1: [1, -1], app2: [1, 1] } },
    fails: 's1-1',
  },
};

const level48: LevelStory = {
  text: {
    title: 'The Hub',
    tagline: 'Connect many networks through one Transit Gateway instead of a tangle of links.',
    concepts: ['AWS Transit Gateway', 'VPC peering', 'Hub and spoke'],
    briefing:
      'The shop now runs in two VPCs: the Shop VPC and the Warehouse VPC. Head office needs private access to both, and more networks are coming. Connect head office and both VPCs to one Transit Gateway instead of linking each pair.',
    docTips: [
      'VPC peering is one-to-one and not transitive: if A peers with B and B with C, A still can’t reach C. Six networks need 15 peering links; a Transit Gateway needs six attachments.',
      'A Transit Gateway takes VPC, Site-to-Site VPN and Direct Connect attachments. You pay per attachment per hour and per gigabyte, so tiny setups may be cheaper with peering.',
    ],
    conceptCard: {
      title: 'Transit Gateway',
      summary:
        'A Transit Gateway is a regional router that VPCs and on-premises networks attach to once. Its route tables decide which attached networks can reach which.',
      analogy: 'An airline hub. Instead of a direct flight between every pair of cities, every city flies to the hub.',
      keyTakeaway: 'Past a handful of networks, connect each one to a hub, not to each other.',
    },
    iacSnippet: `resource "aws_ec2_transit_gateway" "hub" {
  description = "Shop network hub"
}

resource "aws_ec2_transit_gateway_vpc_attachment" "shared" {
  transit_gateway_id = aws_ec2_transit_gateway.hub.id
  vpc_id             = aws_vpc.shared.id
  subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_vpn_connection" "office" {
  customer_gateway_id = aws_customer_gateway.office.id
  transit_gateway_id  = aws_ec2_transit_gateway.hub.id
  type                = "ipsec.1"
}`,
  },
  stages: [
    {
      title: 'The hub',
      brief: 'Head office needs private access to the Shop VPC and the Warehouse VPC, and more networks are on the way.',
      goal: 'Connect head office to both VPCs through one Transit Gateway.',
      hint: 'Place the Transit Gateway in the Edge zone, then wire Head Office → Transit Gateway, and the Transit Gateway to each VPC.',
    },
  ],
  cutscene: {
    stage: board(
      [
        block('users', 'client', -6, 0, { name: 'Head Office', locked: true }),
        ec2('shop', 0, -1, 'Shop VPC'),
        ec2('wh', 1, 1, 'Warehouse VPC'),
        block('hub', 'tgw', -2, 0, { name: 'Transit Gateway' }),
      ],
      [wire('users', 'hub'), wire('hub', 'shop'), wire('hub', 'wh')],
    ),
    start: ['users', 'shop', 'wh'],
    beats: [
      { t: 'caption', text: 'Two VPCs, one head office, and the supermarket’s systems want in next.' },
      { t: 'camera', shot: 'low', on: 'wh' },
      { t: 'speech', who: 'oncall', text: 'Peering joins one pair at a time, and the links don’t chain. A can’t reach C through B.' },
      { t: 'stat', label: 'Peering links for 6 networks', value: 15, tone: 'warn' },
      { t: 'speech', who: 'finance', text: 'And every new network has to be wired to all the others? By hand?' },
      { t: 'spawn', ids: ['hub'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'hub' },
      { t: 'speech', who: 'cto', text: 'One hub instead. Each network attaches once, and the hub’s route tables decide who talks to whom.' },
      { t: 'callout', on: 'hub', title: 'Transit Gateway', body: 'Six networks, six attachments', tone: 'good' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'wire', ids: ['users--hub', 'hub--shop', 'hub--wh'] },
      { t: 'traffic', expect: 'served' },
      { t: 'caption', text: 'Connect head office to both VPCs through the hub.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a direct link to each network instead of the hub',
    change: { remove: ['hub'], wire: 'users-shop users-wh' },
    fails: 's1-1',
  },
};

const level49: LevelStory = {
  text: {
    title: 'Breach',
    tagline: 'Someone wired the internet straight into the database. Cut it without cutting the shop.',
    concepts: ['Network segmentation', 'Incident response', 'Data-tier isolation'],
    briefing:
      'A “temporary” link from the internet to the customer database has been open all weekend. Delete that wire and leave the shop’s own path to the database working.',
    docTips: [
      'For one-off admin access to a private database, use Session Manager port forwarding or a VPN. Never give the database a public route, even for an hour.',
      'VPC Flow Logs record which addresses connected to what. After closing a hole, read them to learn who came through it.',
    ],
    conceptCard: {
      title: 'Containing a breach',
      summary:
        'When the data tier is exposed, close the exposure first and keep the legitimate path running. Then work out what was reached, from logs, before anything else changes.',
      analogy: 'Someone propped open the fire exit to the stockroom. Shut that door; don’t lock the shop’s front door too.',
      keyTakeaway: 'The internet never connects to the data tier directly. If it does, that link is the incident.',
    },
    iacSnippet: `resource "aws_db_instance" "customers" {
  # ...
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.db.id]
}

resource "aws_flow_log" "vpc" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = aws_s3_bucket.flow_logs.arn
}`,
  },
  stages: [
    {
      title: 'Breach',
      brief: 'Someone wired the internet straight into the customer database.',
      goal: 'Delete the wire from the internet to the database, and keep the app working.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web', 1, 0, 'Web Server'), rds('db', 5, 0, 'Customer DB')],
      [wire('users', 'alb'), wire('alb', 'web'), wire('web', 'db'), wire('users', 'db')],
    ),
    start: ['users', 'alb', 'web', 'db'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web', 'web--db', 'users--db'] },
      { t: 'caption', text: 'Monday, 8:15 a.m. Every alert on Ines’s screen is red.' },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'callout', on: 'db', title: 'Connections from the internet', body: '312 since Friday', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'That wire was me. I needed to run one query from home on Friday.' },
      { t: 'speech', who: 'security', text: 'So the customer database has been on the internet all weekend. Cut it now.' },
      { t: 'camera', shot: 'low', on: 'web' },
      { t: 'speech', who: 'founder', text: 'Without taking the shop down, please. It’s Monday morning.' },
      { t: 'clear' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'cutting the app’s wire and leaving the internet’s',
    change: { unwire: 'web-db', wire: 'users-db' },
    fails: 'link.internet_to_data',
  },
};

const level50: LevelStory = {
  text: {
    title: 'The Network Review',
    tagline: 'Assessment: build the textbook three-tier VPC from an empty account.',
    concepts: ['Three-tier architecture', 'Public and private subnets', 'Multi-AZ', 'NAT Gateway'],
    briefing:
      'The supermarket’s security review is on Monday. Build the network from nothing: a gateway, a load balancer, private app servers in two Availability Zones and a private database. Then give the servers a way out for patches.',
    docTips: [
      'Build left to right: Internet Gateway, load balancer, one app server on each side of the zone line, then the database. Run traffic after each wire.',
      'A NAT Gateway serves the zone it sits in. In production, run one per zone so losing a zone doesn’t stop the other zone patching.',
    ],
    conceptCard: {
      title: 'The three-tier VPC',
      summary:
        'Public subnets hold the load balancer and NAT Gateway. Private subnets hold the app servers and the database. Everything is duplicated across two Availability Zones.',
      analogy: 'A bank branch: a public hall, staff offices behind the counter, and the vault behind those, all copied in a second branch down the road.',
      keyTakeaway: 'Front door public, everything else private, every tier in two zones.',
    },
    iacSnippet: `module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 6.0"

  name            = "shop"
  cidr            = "10.0.0.0/16"
  azs             = ["us-east-1a", "us-east-1b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}`,
  },
  stages: [
    {
      title: 'Three tiers',
      brief: 'An empty VPC. The review checks that nothing private can be reached from the internet.',
      goal: 'Internet Gateway → load balancer → two private app servers in different zones → private database.',
    },
    {
      title: 'Way out',
      brief: 'The reviewers ask how the private servers get security patches.',
      goal: 'Wire both app servers to a NAT Gateway, and the NAT Gateway to the Internet Gateway.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        igw(),
        alb(),
        ec2('app1', 4, -1, 'App Server A'),
        ec2('app2', 4, 1, 'App Server B'),
        rds('db', 6, 0, 'Orders DB'),
        nat('nat', 2, 0),
      ],
      [wire('users', 'igw'), wire('igw', 'alb'), wire('alb', 'app1'), wire('alb', 'app2'), wire('app1', 'db'), wire('app2', 'db')],
    ),
    start: ['users'],
    beats: [
      { t: 'speech', who: 'founder', text: 'The supermarket’s review is on Monday. Pass it, and we’re on the shelves of 400 stores.' },
      { t: 'spawn', ids: ['igw', 'alb'] },
      { t: 'spawn', ids: ['app1', 'app2'] },
      { t: 'spawn', ids: ['db'] },
      { t: 'wire', ids: ['users--igw', 'igw--alb', 'alb--app1', 'alb--app2', 'app1--db', 'app2--db'] },
      { t: 'traffic', expect: 'served', hold: 3000 },
      { t: 'camera', shot: 'top' },
      { t: 'callout', on: 'app1', title: 'us-east-1a', body: 'Private subnet', tone: 'info' },
      { t: 'callout', on: 'app2', title: 'us-east-1b', body: 'Private subnet', tone: 'info' },
      { t: 'speech', who: 'security', text: 'Their checklist: one front door, nothing private exposed, two zones, and a way to patch.' },
      { t: 'spawn', ids: ['nat'] },
      { t: 'camera', shot: 'close', on: 'nat' },
      { t: 'speech', who: 'cto', text: 'You’ve built every piece of this already. Now build it all, from an empty VPC.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'both app servers in one private subnet (a subnet is one zone)',
    change: { move: { app2: [5, -1] } },
    fails: 's1-3',
  },
};

export const MODULE_5_STORIES: Record<number, LevelStory> = {
  41: level41,
  42: level42,
  43: level43,
  44: level44,
  45: level45,
  46: level46,
  47: level47,
  48: level48,
  49: level49,
  50: level50,
};
