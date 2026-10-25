/**
 * Module 1 — Introduction to the Cloud. Hand-authored onboarding levels.
 * Each level teaches exactly one interaction or idea and ships with a reference solution.
 */

import type { LevelSpec } from '../../engine/types';
import { block, board, extend, pathObjective, users, wire } from '../build';

const servesWeb = pathObjective(
  'serve',
  ['client', 'ec2'],
  'Internet Users reach the EC2 web server',
  'A green request must travel from Internet Users to an EC2 server.'
);

// ---------------------------------------------------------------------------

const web1 = block('ec2-1', 'ec2', 1, 0, { name: 'EC2 Web Server', locked: true });
const level1Board = board([users(), web1], [wire('users', 'ec2-1', true)]);

const level1: LevelSpec = {
  id: 1,
  moduleId: 1,
  title: 'Hello Traffic',
  tagline: 'Inspect your first server, then send real HTTP traffic at it',
  difficulty: 'Novice',
  gameMode: 'packet_tracer',
  concepts: ['Cloud vs On-Premises', 'Port 80 HTTP'],
  briefing:
    'An EC2 web server is already running and wired to Internet Users. Click it to see how it is configured, then run a traffic test and watch the requests arrive.',
  docTips: [
    'Drag the background to orbit the camera; scroll or pinch to zoom.',
    'Green packets mean a request made it all the way to an open port.',
  ],
  conceptCard: {
    title: 'Welcome to the board',
    summary: 'The board is a live model of a cloud network. Every block is a real AWS service, and every wire is a network path.',
    analogy: 'Think of it as a model railway for data: you lay the track, then run the trains to see where they get stuck.',
    keyTakeaway: 'Click a block to inspect it. Run Traffic to test the whole network.',
  },
  inspectorMode: 'basic',
  initial: level1Board,
  solution: level1Board,
  startsSolved: true,
  stages: [
    {
      title: 'First contact',
      brief: 'Your server is live. Look it over, then send traffic.',
      goal: 'Inspect the EC2 server and run a traffic test.',
      palette: [],
      objectives: [servesWeb],
      hints: [
        'Everything is already set up. Press Run Traffic.',
        'Click the EC2 server to see that it listens on port 80, the standard web port.',
        'Click the EC2 block, then press Run Traffic (or Space).',
      ],
    },
  ],
  coachSteps: [
    { id: 'inspect', text: 'Click the EC2 web server to inspect it.', target: 'block:ec2-1', done: { kind: 'selected', type: 'ec2' } },
    { id: 'run', text: 'Press Run Traffic to send requests from Internet Users.', target: 'run-test', done: { kind: 'never' } },
  ],
};

// ---------------------------------------------------------------------------

const level2: LevelSpec = {
  id: 2,
  moduleId: 1,
  title: 'Your First Server',
  tagline: 'Launch an EC2 server on the glowing tile',
  difficulty: 'Novice',
  gameMode: 'packet_tracer',
  concepts: ['On-Demand Provisioning', 'Public Subnet'],
  briefing:
    'In the cloud you rent servers in seconds instead of buying them. Pick EC2 from the toolbelt and drop it on the glowing tile. We will plug the cable in for you this time.',
  docTips: [
    'Glowing rings mark the recommended tile for new hardware.',
    'On this level the network cable connects itself as soon as the server lands.',
  ],
  inspectorMode: 'basic',
  initial: board([users()]),
  solution: board([users(), block('ec2-1', 'ec2', 1)], [wire('users', 'ec2-1')]),
  limits: { maxOfType: { ec2: 1 } },
  stages: [
    {
      title: 'Launch',
      brief: 'There is no server yet, so visitors have nowhere to go.',
      goal: 'Place one EC2 server on the glowing tile and run traffic.',
      palette: ['ec2'],
      objectives: [
        { id: 'place', label: 'Place an EC2 server in the public subnet', hint: 'Pick EC2 from the toolbelt, then click the glowing tile.', kind: 'place', type: 'ec2', zone: 'public' },
        servesWeb,
      ],
      hints: [
        'Pick EC2 in the toolbelt, then click the glowing tile.',
        'The glowing tile sits in the public subnet, the teal room in the middle.',
        'Click EC2 in the toolbelt, click the glowing ring at the centre of the board, then press Run Traffic.',
      ],
    },
  ],
  targetPlacements: [{ type: 'ec2', gridX: 1, gridZ: 0, label: 'Place EC2 here' }],
  autoWire: [{ onPlace: 'ec2', from: 'client', firstOnly: true }],
  coachSteps: [
    { id: 'pick', text: 'Pick EC2 from the toolbelt.', target: 'palette-ec2', done: { kind: 'any', of: [{ kind: 'placing', type: 'ec2' }, { kind: 'objective', id: 'place' }] } },
    { id: 'drop', text: 'Click the glowing tile to launch the server.', target: 'grid', done: { kind: 'objective', id: 'place' } },
    { id: 'run', text: 'Press Run Traffic.', target: 'run-test', done: { kind: 'never' } },
  ],
};

// ---------------------------------------------------------------------------

const level3Server = block('ec2-1', 'ec2', 1, 0, { name: 'EC2 Web Server', locked: true });

const level3: LevelSpec = {
  id: 3,
  moduleId: 1,
  title: 'Plug It In',
  tagline: 'Use the Wire tool to connect users to your server',
  difficulty: 'Novice',
  gameMode: 'packet_tracer',
  concepts: ['Network Connections', 'Client–Server Flow'],
  briefing: 'The server is running, but no cable reaches it, so no visitor can find it. Use the Wire tool to connect Internet Users to the EC2 server.',
  docTips: [
    'To wire two blocks: pick the Wire tool, click the first block, then click the second.',
    'Direction does not matter. The engine works out which way requests flow.',
  ],
  inspectorMode: 'basic',
  initial: board([users(), level3Server]),
  solution: board([users(), level3Server], [wire('users', 'ec2-1')]),
  stages: [
    {
      title: 'Connect',
      brief: 'An unconnected server still costs money and serves no one.',
      goal: 'Wire Internet Users to the EC2 server.',
      palette: [],
      objectives: [servesWeb],
      hints: [
        'Pick the Wire tool, then click Internet Users and the EC2 server.',
        'An unwired server is idle spend: you pay for it and it does nothing.',
        'Press W (or the Wire tool), click Internet Users, click EC2 Web Server, then Run Traffic.',
      ],
    },
  ],
  coachSteps: [
    { id: 'tool', text: 'Pick the Wire tool.', target: 'tool-wire', done: { kind: 'any', of: [{ kind: 'tool', tool: 'wire' }, { kind: 'objective', id: 'serve' }] } },
    { id: 'wire', text: 'Click Internet Users, then the EC2 server.', target: 'grid', done: { kind: 'objective', id: 'serve' } },
    { id: 'run', text: 'Press Run Traffic.', target: 'run-test', done: { kind: 'never' } },
  ],
};

// ---------------------------------------------------------------------------

const level4Server = block('ec2-1', 'ec2', 1, 0, { name: 'EC2 Web Server', locked: true, config: { securityGroupInbound: [] } });

const level4: LevelSpec = {
  id: 4,
  moduleId: 1,
  title: 'Open the Door',
  tagline: 'Allow web traffic through the server firewall',
  difficulty: 'Novice',
  gameMode: 'security_defense',
  concepts: ['Security Groups', 'Inbound Port 80'],
  briefing:
    'Visitors are reaching the server, but its firewall turns every one of them away. A brand-new security group blocks everything until you allow it. Open port 80 for web traffic.',
  docTips: [
    'Port 80 is plain HTTP. Port 443 is encrypted HTTPS.',
    'Only open what you need. Opening every port to the internet is how servers get hacked.',
  ],
  conceptCard: {
    title: 'What is a security group?',
    summary: 'Every EC2 server has its own firewall called a security group. It drops all incoming traffic until you add an inbound rule.',
    analogy: 'It is a receptionist with a guest list. Nobody gets in unless their door number (port) and home address (source IP) are on the list.',
    keyTakeaway: 'Add an inbound rule: TCP port 80 from 0.0.0.0/0 (anyone on the internet).',
  },
  inspectorMode: 'basic',
  initial: board([users(), level4Server], [wire('users', 'ec2-1', true)]),
  solution: board(
    [users(), { ...level4Server, config: { ...level4Server.config, securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }] } }],
    [wire('users', 'ec2-1', true)]
  ),
  stages: [
    {
      title: 'Firewall',
      brief: 'Requests hit the server and bounce off the firewall.',
      goal: 'Allow inbound TCP port 80 from the internet.',
      palette: [],
      objectives: [
        { id: 'port80', label: 'Port 80 is open to the internet', hint: 'Select the server and add an inbound rule for port 80.', kind: 'firewall', type: 'ec2', port: 80, open: true },
        servesWeb,
      ],
      hints: [
        'Select the EC2 server and look at its Firewall section.',
        'The source 0.0.0.0/0 means "anyone on the internet".',
        'Select EC2 Web Server, press "Allow HTTP (80)" in the inspector, then Run Traffic.',
      ],
    },
  ],
  coachSteps: [
    { id: 'inspect', text: 'Select the EC2 server.', target: 'block:ec2-1', done: { kind: 'any', of: [{ kind: 'selected', type: 'ec2' }, { kind: 'objective', id: 'port80' }] } },
    { id: 'open', text: 'Allow inbound port 80 in the firewall.', target: 'inspector-port80', done: { kind: 'objective', id: 'port80' } },
    { id: 'run', text: 'Press Run Traffic.', target: 'run-test', done: { kind: 'never' } },
  ],
};

// ---------------------------------------------------------------------------

const crashed = block('ec2-crashed', 'ec2', 1, -2, { name: 'Crashed Server', fault: 'crashed' });
const healthy = block('ec2-healthy', 'ec2', 1, 2, { name: 'Healthy Server' });

const level5: LevelSpec = {
  id: 5,
  moduleId: 1,
  title: 'Replace, Don’t Repair',
  tagline: 'Delete a crashed server and route traffic to a healthy one',
  difficulty: 'Novice',
  gameMode: 'outage_repair',
  concepts: ['Disposable Infrastructure', 'Elasticity'],
  briefing:
    'A server has frozen and every request sent to it dies. A healthy spare is standing by. In the cloud you do not nurse a broken server back to health: you throw it away and use a fresh one.',
  docTips: [
    'Deleting a block also removes its wires.',
    'Treat servers like cattle, not pets: replace them instead of fixing them.',
  ],
  inspectorMode: 'basic',
  initial: board([users(), crashed, healthy], [wire('users', 'ec2-crashed')]),
  solution: board([users(), healthy], [wire('users', 'ec2-healthy')]),
  stages: [
    {
      title: 'Outage',
      brief: 'The only wired server is down. The site is offline.',
      goal: 'Delete the crashed server and wire users to the healthy one.',
      palette: [],
      objectives: [
        { id: 'removed', label: 'The crashed server is gone', hint: 'Use the Delete tool on the crashed server.', kind: 'removed', ids: ['ec2-crashed'] },
        servesWeb,
      ],
      hints: [
        'Pick the Delete tool and click the crashed server.',
        'The healthy spare is unwired, so it costs money and serves nobody.',
        'Delete "Crashed Server", wire Internet Users to "Healthy Server", then Run Traffic.',
      ],
    },
  ],
  coachSteps: [
    { id: 'tool', text: 'Pick the Delete tool.', target: 'tool-delete', done: { kind: 'any', of: [{ kind: 'tool', tool: 'delete' }, { kind: 'objective', id: 'removed' }] } },
    { id: 'delete', text: 'Click the crashed server to delete it.', target: 'block:ec2-crashed', done: { kind: 'objective', id: 'removed' } },
    { id: 'wire', text: 'Wire Internet Users to the healthy server.', target: 'tool-wire', done: { kind: 'objective', id: 'serve' } },
    { id: 'run', text: 'Press Run Traffic.', target: 'run-test', done: { kind: 'never' } },
  ],
};

// ---------------------------------------------------------------------------

const level6: LevelSpec = {
  id: 6,
  moduleId: 1,
  title: 'Public vs Private',
  tagline: 'Learn which room of the network faces the internet',
  difficulty: 'Novice',
  gameMode: 'security_defense',
  concepts: ['Subnets', 'VPC Isolation'],
  briefing:
    'Your network (a VPC) has two rooms. The public subnet can take visitors from the internet. The private subnet cannot be reached from outside at all. A web server must live where visitors can reach it.',
  docTips: [
    'The teal middle room is the public subnet. The indigo room on the right is the private subnet.',
    'A server placed in the private subnet cannot be wired straight to the internet. The test will show you exactly where it is stopped.',
  ],
  conceptCard: {
    title: 'Why two rooms?',
    summary: 'Splitting a network into public and private subnets keeps your most valuable systems out of reach of strangers.',
    analogy: 'A bank has a lobby anyone can walk into and a vault nobody can. Your web server is the lobby; your database is the vault.',
    keyTakeaway: 'Internet-facing servers go in the public subnet. Everything else goes private.',
  },
  inspectorMode: 'basic',
  initial: board([users()]),
  solution: board([users(), block('ec2-1', 'ec2', 0)], [wire('users', 'ec2-1')]),
  stages: [
    {
      title: 'Pick the room',
      brief: 'Visitors need a web server they can actually reach.',
      goal: 'Place an EC2 server in the public subnet and wire users to it.',
      palette: ['ec2'],
      objectives: [
        { id: 'public', label: 'An EC2 server sits in the public subnet', hint: 'Place it in the teal middle room.', kind: 'place', type: 'ec2', zone: 'public' },
        servesWeb,
      ],
      hints: [
        'The public subnet is the teal room in the middle of the board.',
        'If you put the server in the private room, the test will stop the request at the VPC wall.',
        'Place EC2 on the glowing tile, wire Internet Users to it, then Run Traffic.',
      ],
    },
  ],
  targetPlacements: [{ type: 'ec2', gridX: 0, gridZ: 0, label: 'Public subnet' }],
};

// ---------------------------------------------------------------------------

const level7Base = board([users(), block('ec2-1', 'ec2', 0, 0, { name: 'EC2 Web Server', locked: true })], [wire('users', 'ec2-1', true)]);

const level7: LevelSpec = {
  id: 7,
  moduleId: 1,
  title: 'A Bucket for Files',
  tagline: 'Give your server durable storage with Amazon S3',
  difficulty: 'Novice',
  gameMode: 'packet_tracer',
  concepts: ['Object Storage', 'Amazon S3'],
  briefing:
    'Your site needs to store profile photos. A server’s own disk is wiped when it is replaced, so files belong in Amazon S3. Add a bucket and connect the server to it.',
  docTips: [
    'S3 keeps several copies of every file across separate buildings.',
    'S3 is a regional service: it lives outside your subnets, and your servers reach it over AWS’s network.',
  ],
  conceptCard: {
    title: 'What is Amazon S3?',
    summary: 'S3 (Simple Storage Service) stores files of any size in buckets. It never fills up and almost never loses data.',
    analogy: 'If your server is a chef, S3 is a huge, fireproof pantry the chef can send for ingredients at any time.',
    keyTakeaway: 'Keep files in S3, not on a server’s disk.',
  },
  inspectorMode: 'basic',
  initial: level7Base,
  solution: extend(level7Base, [block('s3-1', 's3', 4)], [wire('ec2-1', 's3-1')]),
  stages: [
    {
      title: 'Storage',
      brief: 'Uploads have nowhere safe to go.',
      goal: 'Add an S3 bucket and wire the EC2 server to it.',
      palette: ['s3'],
      objectives: [
        pathObjective('files', ['client', 'ec2', 's3'], 'Requests reach S3 through the web server', 'Wire the EC2 server to the bucket.'),
      ],
      hints: [
        'Pick S3 from the toolbelt and place it on the glowing tile.',
        'Visitors never touch the bucket directly; the server fetches files for them.',
        'Place S3 on the glowing tile, wire EC2 Web Server to it, then Run Traffic.',
      ],
    },
  ],
  targetPlacements: [{ type: 's3', gridX: 4, gridZ: 0, label: 'Place S3 here' }],
};

// ---------------------------------------------------------------------------

const level8Base = level7Base;

const level8: LevelSpec = {
  id: 8,
  moduleId: 1,
  title: 'The Vault',
  tagline: 'Keep your database in the private subnet',
  difficulty: 'Novice',
  gameMode: 'security_defense',
  concepts: ['Relational Databases', 'Amazon RDS'],
  briefing:
    'Sign-ups and orders need a real database. Put an RDS PostgreSQL database in the private subnet, where only your own servers can talk to it, and wire the web server to it.',
  docTips: [
    'PostgreSQL listens on port 5432.',
    'The database’s firewall only accepts traffic from inside your VPC by default.',
  ],
  conceptCard: {
    title: 'What is Amazon RDS?',
    summary: 'RDS runs a managed SQL database for you: backups, patches and failover included.',
    analogy: 'Files go in the pantry (S3); the accounts ledger goes in the vault (RDS), and only staff can open the vault.',
    keyTakeaway: 'Databases always live in the private subnet.',
  },
  inspectorMode: 'basic',
  initial: level8Base,
  solution: extend(level8Base, [block('rds-1', 'rds', 4)], [wire('ec2-1', 'rds-1')]),
  stages: [
    {
      title: 'Database',
      brief: 'Customer records need a home no stranger can reach.',
      goal: 'Place RDS in the private subnet and wire the web server to it.',
      palette: ['rds'],
      objectives: [
        { id: 'private', label: 'RDS sits in the private subnet', hint: 'Place the database in the indigo room on the right.', kind: 'place', type: 'rds', zone: 'private' },
        pathObjective('db', ['client', 'ec2', 'rds'], 'Requests reach the database through the web server', 'Wire the EC2 server to RDS.'),
      ],
      hints: [
        'The private subnet is the indigo room on the right.',
        'A database in the public subnet is flagged as exposed, even if nobody wires it to the internet.',
        'Place RDS on the glowing tile, wire EC2 Web Server to it, then Run Traffic.',
      ],
    },
  ],
  targetPlacements: [{ type: 'rds', gridX: 4, gridZ: 0, label: 'Private subnet' }],
};

// ---------------------------------------------------------------------------

const level9Base = board(
  [
    users(),
    block('alb-1', 'alb', -1, 0, { name: 'Load Balancer', locked: true }),
    block('ec2-1', 'ec2', 2, -2, { name: 'Web Server A', locked: true }),
  ],
  [wire('users', 'alb-1', true), wire('alb-1', 'ec2-1', true)]
);

const level9: LevelSpec = {
  id: 9,
  moduleId: 1,
  title: 'Share the Load',
  tagline: 'Put two servers behind a load balancer',
  difficulty: 'Novice',
  gameMode: 'traffic_wave',
  concepts: ['Load Balancing', 'High Availability'],
  briefing:
    'Traffic has doubled and one server can’t keep up. A load balancer is already at the front door. Add a second server behind it so the work is shared, and so the site survives if one server dies.',
  docTips: [
    'A t3.micro EC2 server handles about 300 requests per second in this game.',
    'The load balancer only sends traffic to servers that are wired to it.',
  ],
  conceptCard: {
    title: 'What is a load balancer?',
    summary: 'An Application Load Balancer (ALB) receives every request and spreads them across healthy servers.',
    analogy: 'An airport agent waving passengers to whichever security lane is open. If a lane closes, everyone goes to the other.',
    keyTakeaway: 'Two servers behind a load balancer: double the capacity, and no single point of failure.',
  },
  inspectorMode: 'basic',
  initial: level9Base,
  solution: extend(level9Base, [block('ec2-2', 'ec2', 2, 2)], [wire('alb-1', 'ec2-2')]),
  stages: [
    {
      title: 'Scale out',
      brief: '450 requests per second are arriving. One server tops out at 300.',
      goal: 'Add a second server behind the load balancer.',
      palette: ['ec2'],
      load: { rps: 450 },
      objectives: [
        { id: 'both', label: 'Traffic reaches two EC2 servers', hint: 'Wire the load balancer to a second server.', kind: 'reach', type: 'ec2', count: 2 },
        { id: 'cap', label: 'Error rate under 1%', hint: 'Capacity must cover the 450 req/s demand.', kind: 'sla', maxErrorRatePercent: 1 },
      ],
      hints: [
        'Place a second EC2 on the glowing tile.',
        'Wire it to the load balancer, not to Internet Users.',
        'Place EC2 on the glowing tile, wire Load Balancer to it, then Run Traffic.',
      ],
    },
  ],
  targetPlacements: [{ type: 'ec2', gridX: 2, gridZ: 2, label: 'Second server' }],
};

// ---------------------------------------------------------------------------

const level10Base = board(
  [
    users(),
    block('ec2-1', 'ec2', 0, 0, { name: 'EC2 Web Server', locked: true }),
    block('rds-1', 'rds', 4, 0, { name: 'Orders Database', locked: true }),
  ],
  [wire('users', 'ec2-1', true)]
);

const level10: LevelSpec = {
  id: 10,
  moduleId: 1,
  title: 'Assessment: Startup Cutover',
  tagline: 'Move a startup onto AWS and read its blueprint',
  difficulty: 'Novice',
  isAssessment: true,
  gameMode: 'outage_repair',
  concepts: ['Module 1 Assessment', 'Infrastructure as Code'],
  briefing:
    'A startup is moving its shop from a laptop to AWS. The server and database are up but not talking to each other. Finish the cutover and take a look at the Terraform blueprint the game writes for you.',
  docTips: [
    'From now on, every block you click shows its Terraform blueprint.',
    'Infrastructure as Code means your whole network is a text file you can review, copy and rebuild.',
  ],
  conceptCard: {
    title: 'Infrastructure as Code',
    summary: 'Instead of clicking buttons, engineers describe infrastructure in files (Terraform) and let tools build it.',
    analogy: 'A LEGO instruction booklet: anyone can rebuild the same model, exactly, any number of times.',
    keyTakeaway: 'The board you build is a blueprint. Click a block to read its Terraform.',
  },
  inspectorMode: 'intermediate',
  initial: level10Base,
  solution: extend(level10Base, [], [wire('ec2-1', 'rds-1')]),
  stages: [
    {
      title: 'Cutover',
      brief: 'Orders are failing because the server can’t reach the database.',
      goal: 'Connect the web server to the database and pass a full traffic test.',
      palette: [],
      objectives: [
        pathObjective('db', ['client', 'ec2', 'rds'], 'Orders flow from users to the database', 'Wire the web server to the database.'),
        { id: 'safe', label: 'Security score at least 90', hint: 'Do not open the database to the internet.', kind: 'sla', minSecurityScore: 90 },
      ],
      hints: [
        'Wire the EC2 server to the database.',
        'The database firewall already allows port 5432 from inside the VPC.',
        'Wire EC2 Web Server to Orders Database, then Run Traffic.',
      ],
    },
  ],
};

export const MODULE_1_LEVELS: LevelSpec[] = [level1, level2, level3, level4, level5, level6, level7, level8, level9, level10];
