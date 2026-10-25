/**
 * Module 1 cutscenes: Rio's shop moves to the cloud. Each opens a level with the real-world
 * situation, shows what goes wrong on the live board, and hands the player the mission.
 */

import { block, board, users, wire } from '../build';
import type { CutsceneSpec } from '../cutscene';

const ec2 = (id: string, gridX: number, gridZ = 0, opts: Parameters<typeof block>[4] = {}) => block(id, 'ec2', gridX, gridZ, opts);

const hello: CutsceneSpec = {
  stage: board([users(), ec2('ec2-1', 1, 0, { name: 'EC2 Web Server' })], [wire('users', 'ec2-1')]),
  beats: [
    { t: 'caption', text: 'Before the cloud, going online meant buying a server, waiting weeks for it to arrive, and guessing its size.' },
    { t: 'spawn', ids: ['users'] },
    { t: 'speech', who: 'founder', text: 'We launch tomorrow. Please tell me we have a server.' },
    { t: 'spawn', ids: ['ec2-1'] },
    { t: 'camera', shot: 'close', on: 'ec2-1' },
    { t: 'caption', text: 'Now you rent one in seconds. This is EC2: a computer in an AWS data centre, billed by the hour.' },
    { t: 'camera', shot: 'wide' },
    { t: 'wire', ids: ['users--ec2-1'] },
    { t: 'traffic', expect: 'served' },
    { t: 'speech', who: 'oncall', text: 'Requests are landing. Open it up and see how it works.' },
  ],
};

const firstServer: CutsceneSpec = {
  stage: board([users(), ec2('ec2-1', 1)], [wire('users', 'ec2-1')]),
  start: ['users'],
  beats: [
    { t: 'caption', text: 'Rio’s shop goes live at noon. There’s no server yet.' },
    { t: 'camera', shot: 'low', on: 'users' },
    { t: 'speech', who: 'founder', text: 'Customers are already queueing. How long does a new server take?' },
    { t: 'speech', who: 'oncall', text: 'On AWS? About a minute. Watch.' },
    { t: 'camera', shot: 'wide' },
    { t: 'spawn', ids: ['ec2-1'], hold: 900 },
    { t: 'stat', label: 'Time to launch', value: 60, unit: 's', tone: 'good' },
    { t: 'wire', ids: ['users--ec2-1'] },
    { t: 'traffic', expect: 'served' },
    { t: 'clear' },
    { t: 'caption', text: 'Your turn. Launch a server of your own.' },
  ],
};

const plugIn: CutsceneSpec = {
  stage: board([users(), ec2('ec2-1', 1, 0, { name: 'EC2 Web Server' })]),
  start: ['users', 'ec2-1'],
  beats: [
    { t: 'caption', text: 'The new server is running, in a room with no cable plugged in.' },
    { t: 'camera', shot: 'close', on: 'ec2-1' },
    { t: 'callout', on: 'ec2-1', title: 'No connection', body: 'Nothing is wired to this server.', tone: 'warn' },
    { t: 'stat', label: 'Visitors served', value: 0, tone: 'bad' },
    { t: 'speech', who: 'founder', text: 'We’re paying for a server nobody can reach?' },
    { t: 'camera', shot: 'wide' },
    { t: 'speech', who: 'oncall', text: 'Every link on the board is a wire. Run one from the users to the server.' },
    { t: 'clear' },
    { t: 'caption', text: 'Pick the Wire tool and connect them.' },
  ],
};

const openDoor: CutsceneSpec = {
  stage: board([users(), ec2('ec2-1', 1, 0, { name: 'EC2 Web Server', config: { securityGroupInbound: [] } })], [wire('users', 'ec2-1')]),
  start: ['users', 'ec2-1'],
  beats: [
    { t: 'wire', ids: ['users--ec2-1'] },
    { t: 'caption', text: 'The cable is in. The first visitors arrive…' },
    { t: 'traffic', expect: 'blocked' },
    { t: 'camera', shot: 'close', on: 'ec2-1' },
    { t: 'callout', on: 'ec2-1', title: 'Firewall: deny all', body: 'No inbound rules yet.', tone: 'bad' },
    { t: 'stat', label: 'Requests blocked', value: 100, unit: '%', tone: 'bad' },
    { t: 'speech', who: 'security', text: 'A new security group blocks everything. That’s a feature, not a bug.' },
    { t: 'speech', who: 'oncall', text: 'Then let in exactly what we need: web traffic on port 80.' },
  ],
};

const replace: CutsceneSpec = {
  stage: board(
    [users(), ec2('ec2-a', 1, -2, { name: 'Web Server' }), ec2('ec2-b', 1, 2, { name: 'Spare Server' })],
    [wire('users', 'ec2-a')],
  ),
  start: ['users', 'ec2-a'],
  beats: [
    { t: 'wire', ids: ['users--ec2-a'] },
    { t: 'caption', text: '3:12 a.m. Business as usual.' },
    { t: 'traffic', hold: 3000, expect: 'served' },
    { t: 'crash', id: 'ec2-a' },
    { t: 'camera', shot: 'close', on: 'ec2-a' },
    { t: 'callout', on: 'ec2-a', title: 'Server frozen', tone: 'bad' },
    { t: 'speech', who: 'oncall', text: 'It’s frozen. I used to spend whole nights nursing boxes like this one.' },
    { t: 'speech', who: 'cto', text: 'Don’t fix it. Replace it. A fresh server is a click away.' },
    { t: 'camera', shot: 'wide' },
    { t: 'spawn', ids: ['ec2-b'] },
    { t: 'clear' },
    { t: 'caption', text: 'Delete the broken server and send traffic to the spare.' },
  ],
};

const rooms: CutsceneSpec = {
  stage: board([users(), ec2('ec2-1', 4, 0, { name: 'Web Server' })], [wire('users', 'ec2-1')]),
  start: ['users'],
  beats: [
    { t: 'caption', text: 'Your network on AWS is a VPC, split into rooms called subnets.' },
    { t: 'camera', shot: 'top' },
    { t: 'caption', text: 'The teal room takes visitors from the internet. The indigo room can’t be reached from outside at all.' },
    { t: 'camera', shot: 'wide' },
    { t: 'spawn', ids: ['ec2-1'] },
    { t: 'wire', ids: ['users--ec2-1'] },
    { t: 'speech', who: 'founder', text: 'I put our web server in the quiet room at the back. Safer, right?' },
    { t: 'traffic', expect: 'blocked' },
    { t: 'speech', who: 'security', text: 'Too safe. The private room has no door to the internet, so nobody can reach it.' },
  ],
};

const bucket: CutsceneSpec = {
  stage: board([users(), ec2('ec2-1', 0, 0, { name: 'Web Server' }), ec2('ec2-2', 0, 0, { name: 'Replacement Server' })], [wire('users', 'ec2-1'), wire('users', 'ec2-2')]),
  start: ['users', 'ec2-1'],
  beats: [
    { t: 'wire', ids: ['users--ec2-1'] },
    { t: 'speech', who: 'founder', text: 'Customers uploaded two thousand profile photos today!' },
    { t: 'stat', label: 'Photos on disk', value: 2000, tone: 'good' },
    { t: 'crash', id: 'ec2-1' },
    { t: 'remove', ids: ['ec2-1'] },
    { t: 'spawn', ids: ['ec2-2'] },
    { t: 'wire', ids: ['users--ec2-2'] },
    { t: 'stat', label: 'Photos on disk', value: 0, tone: 'bad' },
    { t: 'speech', who: 'oncall', text: 'New server, empty disk. Files need a home that outlives any one server.' },
    { t: 'clear' },
    { t: 'caption', text: 'Amazon S3 keeps every file safe, whichever server asks for it.' },
  ],
};

const vault: CutsceneSpec = {
  stage: board(
    [users(), ec2('ec2-1', 0, 0, { name: 'Web Server' }), block('rds-pub', 'rds', 1, 2, { name: 'Customer DB' }), block('rds-1', 'rds', 4, 0, { name: 'Customer DB' })],
    [wire('users', 'ec2-1'), wire('ec2-1', 'rds-pub')],
  ),
  start: ['users', 'ec2-1'],
  illegal: ['rds-pub'],
  beats: [
    { t: 'wire', ids: ['users--ec2-1'] },
    { t: 'caption', text: 'Sign-ups and orders need a real database.' },
    { t: 'spawn', ids: ['rds-pub'] },
    { t: 'wire', ids: ['ec2-1--rds-pub'] },
    { t: 'camera', shot: 'close', on: 'rds-pub' },
    { t: 'callout', on: 'rds-pub', title: 'Exposed', body: 'In the public subnet, anyone can try the door.', tone: 'bad' },
    { t: 'speech', who: 'security', text: 'That’s a vault with its door facing the street.' },
    { t: 'clear' },
    { t: 'remove', ids: ['rds-pub'] },
    { t: 'camera', shot: 'wide' },
    { t: 'spawn', ids: ['rds-1'] },
    { t: 'caption', text: 'Databases live in the private subnet, where only your own servers can reach them.' },
  ],
};

const share: CutsceneSpec = {
  stage: board(
    [users(), block('alb-1', 'alb', -1, 0, { name: 'Load Balancer' }), ec2('ec2-1', 2, -2, { name: 'Web Server A' })],
    [wire('users', 'alb-1'), wire('alb-1', 'ec2-1')],
  ),
  start: ['users', 'alb-1', 'ec2-1'],
  beats: [
    { t: 'wire', ids: ['users--alb-1', 'alb-1--ec2-1'] },
    { t: 'caption', text: 'Rio’s shop got featured on the evening news.' },
    { t: 'stat', label: 'Requests / s', value: 450, tone: 'warn' },
    { t: 'traffic', rps: 450, expect: 'served' },
    { t: 'camera', shot: 'close', on: 'ec2-1' },
    { t: 'stat', label: 'One server handles', value: 300, unit: '/s', tone: 'bad' },
    { t: 'speech', who: 'oncall', text: 'One server, 450 requests a second. It’s melting.' },
    { t: 'camera', shot: 'wide' },
    { t: 'speech', who: 'cto', text: 'The load balancer can share the work, but only if there’s more than one server behind it.' },
  ],
};

const cutover: CutsceneSpec = {
  stage: board(
    [users(), ec2('ec2-1', 0, 0, { name: 'EC2 Web Server' }), block('rds-1', 'rds', 4, 0, { name: 'Orders Database' })],
    [wire('users', 'ec2-1')],
  ),
  start: ['users'],
  beats: [
    { t: 'speech', who: 'founder', text: 'Tonight the shop moves off my laptop and onto AWS for good.' },
    { t: 'spawn', ids: ['ec2-1'] },
    { t: 'spawn', ids: ['rds-1'] },
    { t: 'wire', ids: ['users--ec2-1'] },
    { t: 'traffic', expect: 'served' },
    { t: 'camera', shot: 'close', on: 'rds-1' },
    { t: 'callout', on: 'rds-1', title: 'Not connected', body: 'Orders can’t reach the database.', tone: 'warn' },
    { t: 'stat', label: 'Orders failed', value: 37, tone: 'bad' },
    { t: 'camera', shot: 'wide' },
    { t: 'speech', who: 'cto', text: 'Finish the cutover. From now on, everything we build is written down as code.' },
  ],
};

export const MODULE_1_CUTSCENES: Record<number, CutsceneSpec> = {
  1: hello,
  2: firstServer,
  3: plugIn,
  4: openDoor,
  5: replace,
  6: rooms,
  7: bucket,
  8: vault,
  9: share,
  10: cutover,
};
