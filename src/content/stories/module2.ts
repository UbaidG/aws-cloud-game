/**
 * Module 2: Compute in the Cloud. Rio's shop is live on one server; now it has to survive
 * real customers: attackers, lunch rushes, crashes, flash sales and a data-centre outage.
 */

import { block, board, users, wire } from '../build';
import type { BlockConfig } from '../../engine/types';
import type { LevelStory } from '../story';

const ec2 = (id: string, gridX: number, gridZ = 0, name?: string, config?: Partial<BlockConfig>) => block(id, 'ec2', gridX, gridZ, { name, config });
const alb = (gridX = -1, gridZ = 0) => block('alb', 'alb', gridX, gridZ, { name: 'Load Balancer' });

const HTTP = { protocol: 'tcp', port: 80, source: '0.0.0.0/0' } as const;
const SSH = { protocol: 'tcp', port: 22, source: '0.0.0.0/0' } as const;

const level11: LevelStory = {
  text: {
    title: 'Launch Day',
    tagline: 'Put your first virtual machine online, then lock the door you left open.',
    concepts: ['Amazon EC2', 'Security groups', 'Least privilege'],
    briefing:
      'The web server is booted, but no traffic reaches it yet, and its security group still allows SSH from anywhere. Connect it to your users, then close every port it doesn’t need.',
    docTips: [
      'An EC2 instance is a virtual machine. You choose its size, and pay by the second while it runs.',
      'Use Session Manager (or SSH limited to your own IP address) for admin access. Never open port 22 to 0.0.0.0/0.',
    ],
    conceptCard: {
      title: 'Security groups',
      summary:
        'A security group is a firewall attached to each instance. It denies every inbound connection unless a rule allows it, by port and by source address.',
      analogy: 'A guest list at the door: port 80 is “anyone for the shop”, port 22 should be “staff only”.',
      keyTakeaway: 'Open only the ports your users need, to only the sources that need them.',
    },
  },
  stages: [
    {
      title: 'Go live',
      brief: 'The server is running but nothing is wired to it.',
      goal: 'Wire Internet Users to the web server.',
    },
    {
      title: 'Close the back door',
      brief: 'Port 22 (SSH) is open to the whole internet, and bots are already guessing passwords.',
      goal: 'Remove the SSH rule and keep port 80 open.',
      hint: 'Select the server and edit its security group: keep HTTP, delete SSH.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server', { securityGroupInbound: [HTTP, SSH] })], [wire('users', 'web')]),
    start: ['users'],
    beats: [
      { t: 'caption', text: 'Rio’s shop has outgrown the laptop. Dev launches its first EC2 instance.' },
      { t: 'spawn', ids: ['web'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'callout', on: 'web', title: 'Inbound rules', body: 'Port 80 from anywhere. Port 22 from anywhere.', tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'I left SSH open so I can log in from home. It’s only for tonight.' },
      { t: 'stat', label: 'SSH login attempts / hour', value: 4100, tone: 'bad' },
      { t: 'speech', who: 'security', text: 'Bots scan the whole internet for open port 22 within minutes. “Only tonight” is plenty of time.' },
      { t: 'camera', shot: 'wide' },
      { t: 'clear' },
      { t: 'caption', text: 'Connect the shop to its customers, then shut the door that only attackers use.' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'closing every port, including the shop’s',
    change: { set: { web: { securityGroupInbound: [] } } },
    fails: 's1-1',
  },
};

const level12: LevelStory = {
  text: {
    title: 'Bigger Box',
    tagline: 'Scale up for the lunch rush, then scale back down before the bill arrives.',
    concepts: ['Vertical scaling', 'Instance types', 'Right-sizing'],
    briefing:
      'Lunchtime brings 900 requests a second, three times what a t3.micro can handle, and the account allows only one server. Make it bigger for the rush, then shrink it again when the shop goes quiet.',
    docTips: [
      'Changing instance type means stop, resize, start: a minute or two of downtime. Plan it for a quiet moment.',
      'Right-sizing is the cheapest optimisation there is. CloudWatch CPU graphs show when a server is mostly idle.',
    ],
    conceptCard: {
      title: 'Vertical scaling',
      summary:
        'Scaling up means moving to a larger instance type with more CPU and memory. It’s simple, but there’s a ceiling, a restart, and still a single point of failure.',
      analogy: 'Swapping the shop’s small van for a lorry. It carries more, but there’s still only one driver.',
      keyTakeaway: 'Size for the load you have now. In the cloud, resizing later is a two-minute job.',
    },
  },
  stages: [
    {
      title: 'Lunch rush',
      brief: '900 requests a second, and a t3.micro tops out at 300. You may only run one server.',
      goal: 'Resize the server so it can handle the rush.',
      hint: 'Select the server and pick a larger instance type, such as m5.large.',
    },
    {
      title: 'Quiet night',
      brief: 'Traffic is down to 150 requests a second, but you’re still paying for the large machine.',
      goal: 'Resize back down, keeping the bill under $20 a month.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web', 0, 0, 'Web Server')], [wire('users', 'web')]),
    start: ['users', 'web'],
    beats: [
      { t: 'wire', ids: ['users--web'] },
      { t: 'caption', text: '12:01 p.m. The office crowd discovers Rio’s lunch deals.' },
      { t: 'stat', label: 'Requests / s', value: 900, tone: 'warn' },
      { t: 'traffic', rps: 900, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'web' },
      { t: 'stat', label: 't3.micro limit', value: 300, unit: '/s', tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Two out of three customers are getting errors. Buy a second server!' },
      { t: 'speech', who: 'finance', text: 'Our account is capped at one instance this month. Can’t we just make that one bigger?' },
      { t: 'camera', shot: 'wide' },
      { t: 'speech', who: 'cto', text: 'We can. Size it up for lunch, and size it down after, or the bill stays big too.' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'keeping the big server overnight',
    change: { set: { web: { instanceType: 'm5.large' } } },
    fails: 's2-1',
  },
};

const level13: LevelStory = {
  text: {
    title: 'Two of Everything',
    tagline: 'Stop buying bigger machines. Add more of them.',
    concepts: ['Horizontal scaling', 'Stateless web servers'],
    briefing:
      'Traffic is up to 500 requests a second, and one small server handles 300. Instead of a bigger box, run a second identical server and send users to both.',
    docTips: [
      'Scaling out only works if the servers are stateless: sessions and uploads live in a shared store, not on one machine.',
    ],
    conceptCard: {
      title: 'Horizontal scaling',
      summary:
        'Scaling out means adding more instances of the same size. Capacity grows in steps, there’s no restart, and losing one server no longer takes the whole shop down.',
      analogy: 'Opening a second till instead of asking one cashier to work faster.',
      keyTakeaway: 'Many small, identical servers beat one big one: they scale further and fail more gently.',
    },
  },
  stages: [
    {
      title: 'Scale out',
      brief: '500 requests a second are arriving. One small server handles 300.',
      goal: 'Add a second server and send users to both.',
    },
  ],
  cutscene: {
    stage: board([users(), ec2('web1', 0, -1, 'Web Server A'), ec2('web2', 0, 1, 'Web Server B')], [wire('users', 'web1'), wire('users', 'web2')]),
    start: ['users', 'web1'],
    beats: [
      { t: 'wire', ids: ['users--web1'] },
      { t: 'caption', text: 'The lunch trick worked, until dinner got busy too.' },
      { t: 'traffic', rps: 500, expect: 'served' },
      { t: 'stat', label: 'Requests / s', value: 500, tone: 'warn' },
      { t: 'speech', who: 'oncall', text: 'We could go up another size. Then the next one. Then the one after that.' },
      { t: 'speech', who: 'cto', text: 'And every time it reboots, the shop goes dark. Let’s add a second, identical server instead.' },
      { t: 'spawn', ids: ['web2'] },
      { t: 'camera', shot: 'close', on: 'web2' },
      { t: 'clear' },
      { t: 'caption', text: 'Two servers, one job. Send customers to both.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a second server nobody can reach',
    change: { unwire: 'users-web2' },
    fails: 's1-1',
  },
};

const level14: LevelStory = {
  text: {
    title: 'One Front Door',
    tagline: 'Give two servers one address with an Application Load Balancer.',
    concepts: ['Application Load Balancer', 'Target groups', 'Health checks'],
    briefing:
      'Customers can’t be asked to pick a server. Put an Application Load Balancer in front of both servers so there’s one address, and the work is shared between them.',
    docTips: [
      'An ALB spreads requests across healthy targets and checks each target’s health every few seconds. A failing target is taken out of rotation.',
    ],
    conceptCard: {
      title: 'Application Load Balancer',
      summary:
        'An ALB gives your app one stable address, then forwards each request to a healthy server in its target group. It can also route by path or hostname.',
      analogy: 'The host at a restaurant door, seating each guest at whichever waiter has room.',
      keyTakeaway: 'Users talk to the load balancer; only the load balancer talks to the servers.',
    },
  },
  stages: [
    {
      title: 'One front door',
      brief: 'Two servers, two addresses, and customers bookmarking whichever they found first.',
      goal: 'Put a load balancer in front of both servers.',
    },
  ],
  cutscene: {
    stage: board([users(), alb(), ec2('web1', 1, -1, 'Web Server A'), ec2('web2', 1, 1, 'Web Server B')], [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2')]),
    start: ['users', 'web1', 'web2'],
    beats: [
      { t: 'caption', text: 'Two servers now, each with its own address.' },
      { t: 'callout', on: 'web1', title: '54.12.8.31', body: 'Busy', tone: 'warn' },
      { t: 'callout', on: 'web2', title: '54.12.9.77', body: 'Idle', tone: 'info' },
      { t: 'speech', who: 'founder', text: 'Half our customers bookmarked server A. It’s swamped and B is doing nothing.' },
      { t: 'clear' },
      { t: 'spawn', ids: ['alb'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'alb' },
      { t: 'speech', who: 'cto', text: 'One address for everyone. The load balancer decides which server gets each request.' },
      { t: 'camera', shot: 'wide' },
      { t: 'caption', text: 'Wire the users to the load balancer, and the load balancer to both servers.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a load balancer with only one target',
    change: { unwire: 'alb-web2' },
    fails: 's1-2',
  },
};

const level15: LevelStory = {
  text: {
    title: 'Health Check Failed',
    tagline: 'A server dies behind the load balancer. Replace it; don’t revive it.',
    concepts: ['Health checks', 'Immutable servers', 'Cattle, not pets'],
    briefing:
      'Web Server B has crashed and the load balancer is still sending it customers, so half the requests fail. Delete the dead server and launch a fresh one in its place.',
    docTips: [
      'Treat servers as cattle, not pets: when one is sick, replace it from the same image instead of nursing it back to health.',
    ],
    conceptCard: {
      title: 'Health checks',
      summary:
        'The load balancer calls a health-check URL on each target. Targets that fail are marked unhealthy, and the fleet must be brought back to full strength by launching a replacement.',
      analogy: 'A taxi firm that stops dispatching a car once it reports a fault, and sends another car out to cover its shifts.',
      keyTakeaway: 'Plan for servers to die. Make replacing one boring and fast.',
    },
  },
  stages: [
    {
      title: 'Replace the casualty',
      brief: 'Server B crashed. Half of all requests are failing with 502 errors.',
      goal: 'Delete the crashed server, launch a new one and wire it to the load balancer.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web1', 1, -1, 'Web Server A'), ec2('bad', 1, 1, 'Web Server B'), ec2('web2', 1, 2, 'Web Server C')],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'bad'), wire('alb', 'web2')],
    ),
    start: ['users', 'alb', 'web1', 'bad'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--bad'] },
      { t: 'caption', text: 'Saturday, 9:40 p.m. Orders are flowing through both servers.' },
      { t: 'traffic', rps: 450, expect: 'served', hold: 3000 },
      { t: 'crash', id: 'bad' },
      { t: 'camera', shot: 'close', on: 'bad' },
      { t: 'callout', on: 'bad', title: 'Health check failed', body: 'HTTP 502', tone: 'bad' },
      { t: 'stat', label: 'Errors', value: 50, unit: '%', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'I could SSH in and dig through the logs for an hour…' },
      { t: 'speech', who: 'cto', text: 'Or delete it and launch a fresh one from the same image in two minutes. Save the logs, not the server.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'deleting the dead server without replacing it',
    change: { remove: ['web2'] },
    fails: 's1-2',
  },
};

const level16: LevelStory = {
  text: {
    title: 'Servers on Autopilot',
    tagline: 'Let an Auto Scaling Group add and remove servers for you.',
    concepts: ['EC2 Auto Scaling', 'Launch templates', 'Scaling policies'],
    briefing:
      'Traffic swings between quiet and 1,500 requests a second, faster than anyone can launch servers by hand. Put an Auto Scaling Group behind the load balancer and let it size the fleet.',
    docTips: [
      'An Auto Scaling Group launches copies of a launch template, keeps at least the minimum running, and replaces any that fail their health checks.',
    ],
    conceptCard: {
      title: 'Auto Scaling Groups',
      summary:
        'An ASG keeps a fleet between a minimum and a maximum size. Scaling policies add servers when a metric such as CPU rises and remove them when it falls.',
      analogy: 'A supermarket that opens more tills when the queues grow and closes them when the shop empties.',
      keyTakeaway: 'Set the limits and the target; let the group do the launching and the replacing.',
    },
  },
  stages: [
    {
      title: 'Automatic fleet',
      brief: 'Traffic swings up to 1,500 requests a second. Adding servers by hand is too slow.',
      goal: 'Add an Auto Scaling Group behind the load balancer.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web', 1, 0, 'Web Server'), block('fleet', 'asg', 2, 0, { name: 'Web Fleet' })],
      [wire('users', 'alb'), wire('alb', 'web'), wire('alb', 'fleet')],
    ),
    start: ['users', 'alb', 'web'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web'] },
      { t: 'caption', text: 'Rio’s shop is on TV. Nobody knows when the advert airs.' },
      { t: 'traffic', rps: 1500, expect: 'served' },
      { t: 'stat', label: 'Requests / s', value: 1500, tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'By the time I’ve launched three servers by hand, the spike is over and we’re paying for three idle boxes.' },
      { t: 'spawn', ids: ['fleet'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'fleet' },
      { t: 'speech', who: 'cto', text: 'An Auto Scaling Group watches the load and launches or retires servers itself.' },
      { t: 'clear' },
      { t: 'caption', text: 'Put the fleet behind the load balancer.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'one hand-made server for every spike',
    change: { remove: ['fleet'] },
    fails: 's1-2',
  },
};

const level17: LevelStory = {
  text: {
    title: 'Flash Sale',
    tagline: 'Raise the fleet’s ceiling for the sale, then lower it before the bill does.',
    concepts: ['Minimum and maximum capacity', 'Cost guardrails'],
    briefing:
      'Midnight flash sale: 3,000 shoppers a second, and the fleet is capped at two servers. Raise the maximum so it can grow, then lower it once the sale ends.',
    docTips: [
      'Maximum capacity is a safety rail: it stops a bug or a bot flood from launching hundreds of servers.',
      'Scheduled scaling can raise capacity before a known event and lower it after, so nobody has to stay up for it.',
    ],
    conceptCard: {
      title: 'Capacity limits',
      summary:
        'An ASG never shrinks below its minimum or grows past its maximum. The maximum caps both your capacity and your worst-case bill.',
      analogy: 'A restaurant that can add tables for a party, but only as many as the room will hold.',
      keyTakeaway: 'The maximum is a cost control as much as a capacity setting. Raise it on purpose, then lower it again.',
    },
  },
  stages: [
    {
      title: 'Doors open',
      brief: '3,000 shoppers a second. The fleet can’t grow past 2 servers.',
      goal: 'Raise the fleet’s maximum size.',
    },
    {
      title: 'Sale over',
      brief: 'Traffic is back to 600 a second, and a high maximum leaves room for a high bill.',
      goal: 'Lower the maximum again, keeping the bill under $100 a month.',
    },
  ],
  cutscene: {
    stage: board([users(), alb(), block('fleet', 'asg', 1, 0, { name: 'Web Fleet', config: { maxCapacity: 2 } })], [wire('users', 'alb'), wire('alb', 'fleet')]),
    start: ['users', 'alb', 'fleet'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--fleet'] },
      { t: 'caption', text: '11:59 p.m. Fifty percent off everything, for one hour only.' },
      { t: 'stat', label: 'Shoppers / s', value: 3000, tone: 'warn' },
      { t: 'traffic', rps: 3000, expect: 'served' },
      { t: 'camera', shot: 'close', on: 'fleet' },
      { t: 'callout', on: 'fleet', title: 'At maximum', body: '2 of 2 servers', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'The group wants to scale, but we capped it at two last month.' },
      { t: 'speech', who: 'finance', text: 'We capped it because of last month’s bill. Raise it for the sale, and promise me it comes back down.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'leaving the maximum high after the sale',
    change: { set: { fleet: { maxCapacity: 6 } } },
    fails: 's2-1',
  },
};

const level18: LevelStory = {
  text: {
    title: 'Zombie Hunt',
    tagline: 'Find the servers nobody uses, and stop paying for them.',
    concepts: ['Idle resources', 'Cost hygiene', 'Tagging'],
    briefing:
      'The bill shows four servers but the shop only needs two. An old test box and a forgotten demo are still running. Delete them without touching the live servers.',
    docTips: [
      'Tag every resource with an owner and a purpose. Untagged, idle instances are the classic source of a surprise bill.',
    ],
    conceptCard: {
      title: 'Zombie resources',
      summary:
        'Servers launched for a test or a demo keep billing by the second until someone stops them. Cost Explorer and Trusted Advisor flag idle instances so you can clean them up.',
      analogy: 'Lights left on in empty rooms: nobody is using them, and the meter keeps running.',
      keyTakeaway: 'If nothing routes to it and nobody owns it, it’s a cost, not a server.',
    },
  },
  stages: [
    {
      title: 'Zombie hunt',
      brief: 'Two servers nobody remembers are still on the bill.',
      goal: 'Delete the idle servers and keep the shop running.',
    },
  ],
  cutscene: {
    stage: board(
      [
        users(),
        alb(),
        ec2('web1', 1, -1, 'Web Server A'),
        ec2('web2', 1, 1, 'Web Server B'),
        ec2('z1', 2, -3, 'Old Test Box'),
        ec2('z2', 2, 3, 'Forgotten Demo'),
      ],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2')],
    ),
    start: ['users', 'alb', 'web1', 'web2'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1', 'alb--web2'] },
      { t: 'caption', text: 'First of the month. Tom opens the AWS bill.' },
      { t: 'speech', who: 'finance', text: 'Four servers? I count two in the diagram. Who’s paying for the other two?' },
      { t: 'spawn', ids: ['z1', 'z2'], hold: 900 },
      { t: 'camera', shot: 'close', on: 'z1' },
      { t: 'callout', on: 'z1', title: 'Old Test Box', body: 'No traffic for 41 days', tone: 'warn' },
      { t: 'callout', on: 'z2', title: 'Forgotten Demo', body: 'Owner: unknown', tone: 'warn' },
      { t: 'stat', label: 'Wasted / month', value: 70, prefix: '$', tone: 'bad' },
      { t: 'speech', who: 'oncall', text: 'The demo was for an investor meeting in the spring. Oops.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'keeping the demo “just in case”',
    change: { add: 'z2:ec2@2,3' },
    fails: 's1-1',
  },
};

const level19: LevelStory = {
  text: {
    title: 'Second Data Centre',
    tagline: 'Spread servers and data across two Availability Zones.',
    concepts: ['Availability Zones', 'Multi-AZ', 'Fault isolation'],
    briefing:
      'Every server sits in one Availability Zone, so one power cut takes the shop offline. Put a server in the second zone, then add an orders database that keeps a standby copy there too.',
    docTips: [
      'An Availability Zone is one or more data centres with independent power and networking. A Region has at least three.',
      'Multi-AZ RDS keeps a synchronous standby in another zone and fails over automatically, usually in one to two minutes.',
    ],
    conceptCard: {
      title: 'Availability Zones',
      summary:
        'Each AWS Region is split into isolated Availability Zones a few kilometres apart. Spreading servers and databases across two zones means one failing data centre can’t take you down.',
      analogy: 'Keeping a spare key at a friend’s house, not under your own doormat.',
      keyTakeaway: 'Two zones, always: one for the outage, one for the customers.',
    },
  },
  stages: [
    {
      title: 'Second data centre',
      brief: 'Everything runs in us-east-1a. One power cut and you’re offline.',
      goal: 'Add a server in the other Availability Zone.',
      hint: 'The dashed line splits the board into two zones. Put the new server on the other side of it.',
    },
    {
      title: 'Resilient data',
      brief: 'The servers can survive an outage now. The orders have to survive one too.',
      goal: 'Add a Multi-AZ database behind both servers.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), ec2('web1', 1, -1, 'Web Server A'), ec2('web2', 1, 1, 'Web Server B')],
      [wire('users', 'alb'), wire('alb', 'web1'), wire('alb', 'web2')],
    ),
    start: ['users', 'alb', 'web1'],
    beats: [
      { t: 'wire', ids: ['users--alb', 'alb--web1'] },
      { t: 'caption', text: 'A storm hits northern Virginia. One data centre loses power.' },
      { t: 'crash', id: 'web1' },
      { t: 'camera', shot: 'close', on: 'web1' },
      { t: 'callout', on: 'web1', title: 'us-east-1a', body: 'Power outage', tone: 'bad' },
      { t: 'stat', label: 'Minutes offline', value: 47, tone: 'bad' },
      { t: 'speech', who: 'founder', text: 'Forty-seven minutes offline on a Friday night. I thought the cloud never went down?' },
      { t: 'speech', who: 'cto', text: 'Data centres do. That’s why AWS gives us several per region. We just used one.' },
      { t: 'camera', shot: 'top' },
      { t: 'spawn', ids: ['web2'] },
      { t: 'clear' },
      { t: 'caption', text: 'Put a server in each zone, then make the orders database survive it too.' },
    ],
  },
  wrong: {
    stage: 1,
    why: 'a second server in the same zone',
    change: { move: { web2: [1, -2] } },
    fails: 's1-1',
  },
};

const level20: LevelStory = {
  text: {
    title: 'Black Friday',
    tagline: 'Assessment: build the whole storefront and keep it standing at 4,000 requests a second.',
    concepts: ['Load balancing', 'Auto Scaling', 'Caching', 'Capacity planning'],
    briefing:
      'Rio wants the shop ready for Black Friday. Build it from nothing: a load balancer, a self-scaling fleet and a database. When the doors open, add a cache and let the fleet grow until it holds.',
    docTips: [
      'Build the request path from left to right, then run traffic to find the first thing that buckles.',
      'A cache in front of the database absorbs repeated reads, such as product pages, so the database only handles writes and misses.',
    ],
    conceptCard: {
      title: 'Scaling every tier',
      summary:
        'A system is only as fast as its slowest tier. The fleet scales out for compute, and a cache shields the database from repeated reads.',
      analogy: 'A stadium needs more gates and more stalls on match day, not just more stewards.',
      keyTakeaway: 'Find the bottleneck, fix it, test again: the next bottleneck is always one tier further along.',
    },
  },
  stages: [
    {
      title: 'Build the storefront',
      brief: 'An empty account. Black Friday is a week away.',
      goal: 'Users → ALB → Auto Scaling Group → RDS, serving 1,000 requests a second.',
    },
    {
      title: 'Doors open',
      brief: '4,000 shoppers a second. The fleet is at its maximum and the database is slowing down.',
      goal: 'Add a cache for reads and let the fleet grow, keeping latency under 100 ms.',
    },
  ],
  cutscene: {
    stage: board(
      [users(), alb(), block('fleet', 'asg', 1, 0, { name: 'Web Fleet' }), block('db', 'rds', 5, 0, { name: 'Orders DB' }), block('cache', 'redis', 5, 1, { name: 'Product Cache' })],
      [wire('users', 'alb'), wire('alb', 'fleet'), wire('fleet', 'db'), wire('fleet', 'cache')],
    ),
    start: ['users'],
    beats: [
      { t: 'speech', who: 'founder', text: 'Black Friday. Last year the shop fell over at 9:02 a.m. Not this year.' },
      { t: 'spawn', ids: ['alb'] },
      { t: 'spawn', ids: ['fleet'] },
      { t: 'spawn', ids: ['db'] },
      { t: 'wire', ids: ['users--alb', 'alb--fleet', 'fleet--db'] },
      { t: 'traffic', rps: 1000, expect: 'served' },
      { t: 'stat', label: 'Forecast peak', value: 4000, unit: '/s', tone: 'warn' },
      { t: 'camera', shot: 'close', on: 'db' },
      { t: 'speech', who: 'oncall', text: 'At four thousand a second the fleet tops out, and every product page hits the database.' },
      { t: 'spawn', ids: ['cache'] },
      { t: 'speech', who: 'cto', text: 'Then we cache the reads and raise the ceiling. You’ve done every piece of this already.' },
      { t: 'camera', shot: 'wide' },
    ],
  },
  wrong: {
    stage: 2,
    why: 'a cache, but the fleet still capped',
    change: { set: { fleet: { maxCapacity: 6 } } },
    fails: 's2-1',
  },
};

export const MODULE_2_STORIES: Record<number, LevelStory> = {
  11: level11,
  12: level12,
  13: level13,
  14: level14,
  15: level15,
  16: level16,
  17: level17,
  18: level18,
  19: level19,
  20: level20,
};
