/**
 * CloudCraft: 60 Progressive DevOps & AWS Levels
 * Chapters 1–2 (Levels 1–10): Beginner-Friendly Game & Cloud Foundations
 * Chapters 3–12 (Levels 11–60): Full 50-Scenario AWS & DevOps Curriculum
 */

import { LevelDefinition, ArchitectureState, VoxelBlock, ComponentMeta } from './types';
import { evaluateConnectionPhysics } from './networkPhysics';
import {
  buildProgressiveStagesForLevel,
  buildStoryboardForLevel,
  getGameModeForLevel,
} from './scenarioGenerator';
import { COURSERA_MODULES, buildCourseraCurriculumLevels } from './courseraModules';

// Helper utilities for architecture validation
const hasComponent = (state: ArchitectureState, type: string, count = 1) =>
  state.components.filter(c => c.type === type).length >= count;

const hasConnected = (state: ArchitectureState, typeA: string, typeB: string) => {
  return state.connections.some(conn => {
    if (conn.allowed === false) return false;
    const fromComp = state.components.find(c => c.id === conn.fromId);
    const toComp = state.components.find(c => c.id === conn.toId);
    if (!fromComp || !toComp) return false;
    const phys = evaluateConnectionPhysics(fromComp, toComp);
    if (!phys.allowed) return false;
    return (
      (fromComp.type === typeA && toComp.type === typeB) ||
      (fromComp.type === typeB && toComp.type === typeA)
    );
  });
};

const getComponent = (state: ArchitectureState, type: string): VoxelBlock | undefined => {
  return state.components.find(c => c.type === type);
};

// ---------------------------------------------------------------------------
// 1. INTRODUCTORY ONBOARDING LEVELS (LEVELS 1–10)
// ---------------------------------------------------------------------------
const ONBOARDING_LEVELS: LevelDefinition[] = [
  {
    id: 1,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Game Controls & Server Basics',
    title: 'Hello Traffic: Inspect & Run Your First Test',
    tagline: 'Click your EC2 server to inspect it, then send live HTTP traffic',
    difficulty: 'Novice',
    concepts: ['EC2 Server', 'HTTP Port 80', 'Traffic Simulation'],
    inspectorMode: 'basic',
    conceptCard: {
      title: 'Welcome to the CloudCraft Board',
      summary: 'You already know what an EC2 web server and Port 80 traffic are. In this first warm-up, an EC2 server is already placed and wired to Internet Users.',
      analogy: 'Think of the 3D board as a live tabletop model of your cloud network. Clicking any hardware block opens its settings on the right, and clicking "Run Traffic Test" sends green data packets down the wires.',
      keyTakeaway: 'Click the EC2 block on the board to see its Port 80 configuration, then click "Run Traffic Test" in the bottom dock.'
    },
    briefing: 'We have already placed an EC2 Web Server on the board and connected a wire from Internet Users to Port 80. Click the EC2 server block in 3D space to inspect it, then run a traffic test to watch HTTP packets flow.',
    taskDescription: '1. Click the EC2 Web Server block on the 3D board to inspect it.\n2. Click "Run Traffic Test" (or press Space) to verify traffic reaches Port 80.',
    allowedPalette: [],
    docTips: [
      'Left-drag anywhere on the background to orbit the 3D camera, and use the mouse wheel to zoom.',
      'Green packets mean traffic reached the server on an open port.'
    ],
    coachSteps: [
      {
        id: 'step-inspect',
        text: 'Step 1: Click the orange EC2 Web Server block in the center of the 3D board to inspect its settings.',
        targetButton: 'grid',
        completed: (_s, selectedId) => selectedId !== null
      },
      {
        id: 'step-test',
        text: 'Step 2: Great! Now click "Run Traffic Test" (or press Space) in the bottom dock to send HTTP requests.',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 'ec2_ready',
        label: 'EC2 Web Server is online and listening on Port 80',
        hint: 'The EC2 server is already configured—just click "Run Traffic Test".',
        check: (s) => hasComponent(s, 'ec2') && hasConnected(s, 'client', 'ec2')
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'ec2-1',
          type: 'ec2',
          name: 'EC2 Web Server',
          gridX: 1,
          gridZ: 0,
          subnet: 'public',
          az: 'us-east-1a',
          config: {
            port: 80,
            instanceType: 't3.micro',
            securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }]
          },
          status: 'healthy'
        }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'ec2-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 2,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Game Controls & Server Basics',
    title: 'Placing Your First EC2 Server',
    tagline: 'Select EC2 from the bottom dock and place it on the glowing target tile',
    difficulty: 'Novice',
    concepts: ['Placing Hardware', 'EC2 Instance', 'Public Zone'],
    inspectorMode: 'basic',
    briefing: 'Now let us place a server ourselves. Select "+ EC2 Instance" from the bottom dock and click the glowing green target ring on the 3D board to deploy it.',
    taskDescription: '1. Click "+ EC2 Instance" in the bottom dock.\n2. Click the glowing green target tile on the 3D board.\n3. Click "Run Traffic Test".',
    allowedPalette: ['ec2'],
    targetPlacements: [
      { type: 'ec2', gridX: 1, gridZ: 0, label: 'Place EC2 Here' }
    ],
    docTips: [
      'Glowing emerald target rings on the board show the recommended slot for new hardware.',
      'For this level, the network wire will automatically attach as soon as you place the EC2 server.'
    ],
    coachSteps: [
      {
        id: 'step-pick-ec2',
        text: 'Step 1: Click "+ EC2 Instance" in the bottom dock to pick up a new server.',
        targetButton: 'palette-ec2',
        completed: (s, _sel, tool, placing) => hasComponent(s, 'ec2') || (tool === 'place' && placing === 'ec2')
      },
      {
        id: 'step-place-grid',
        text: 'Step 2: Click the glowing green target ring on the 3D board to place your EC2 server.',
        targetButton: 'grid',
        completed: (s) => hasComponent(s, 'ec2')
      },
      {
        id: 'step-run-test',
        text: 'Step 3: Server deployed! Click "Run Traffic Test" to verify.',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 'ec2_placed',
        label: 'Place an EC2 Instance on the glowing target tile',
        hint: 'Click "+ EC2 Instance" in the dock, then click the glowing green ring on the board.',
        check: (s) => hasComponent(s, 'ec2')
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        }
      ],
      connections: []
    }
  },

  {
    id: 3,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Game Controls & Server Basics',
    title: 'Connecting the Network Wire',
    tagline: 'Use the Wire tool to link Internet Users to your EC2 server',
    difficulty: 'Novice',
    concepts: ['Network Cabling', 'Wire Tool', 'Client-to-Server'],
    inspectorMode: 'basic',
    briefing: 'Your EC2 Web Server is sitting on the board, but no network cable connects it to Internet Users yet. Use the "Wire" tool in the bottom dock to link them together.',
    taskDescription: '1. Click the "Wire" button in the bottom dock.\n2. Click "Internet Users" on the left, then click "EC2 Web Server" on the right.\n3. Click "Run Traffic Test".',
    allowedPalette: [],
    docTips: [
      'To connect any two components: select the Wire tool, click the first block, and then click the second block.',
      'A physical patch cable will snap into place between the two nodes.'
    ],
    coachSteps: [
      {
        id: 'step-select-wire',
        text: 'Step 1: Click the "Wire" tool in the bottom dock.',
        targetButton: 'tool-cable',
        completed: (s, _sel, tool) => hasConnected(s, 'client', 'ec2') || tool === 'cable'
      },
      {
        id: 'step-connect-nodes',
        text: 'Step 2: Click the "Internet Users" terminal on the left, then click the "EC2 Web Server" on the right.',
        targetButton: 'grid',
        completed: (s) => hasConnected(s, 'client', 'ec2')
      },
      {
        id: 'step-test-wire',
        text: 'Step 3: Cable connected! Click "Run Traffic Test" to send traffic across your new link.',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 'wired_client_ec2',
        label: 'Connect a wire between Internet Users and the EC2 Web Server',
        hint: 'Select the Wire tool in the bottom dock, click Internet Users, then click EC2 Web Server.',
        check: (s) => hasConnected(s, 'client', 'ec2')
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'ec2-1',
          type: 'ec2',
          name: 'EC2 Web Server',
          gridX: 1,
          gridZ: 0,
          subnet: 'public',
          az: 'us-east-1a',
          config: {
            port: 80,
            securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }]
          },
          status: 'healthy'
        }
      ],
      connections: []
    }
  },

  {
    id: 4,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Game Controls & Server Basics',
    title: 'Opening Port 80 on the Firewall',
    tagline: 'Unblock HTTP web traffic in your server firewall settings',
    difficulty: 'Novice',
    concepts: ['Port 80 (HTTP)', 'Security Group Firewall', 'Inbound Traffic'],
    inspectorMode: 'basic',
    conceptCard: {
      title: 'What is an AWS Security Group?',
      summary: 'In AWS, every EC2 server has a built-in virtual firewall called a Security Group. By default, it blocks all incoming traffic until you explicitly open a port.',
      analogy: 'Think of a Security Group like a building receptionist checking visitor badges: unless you tell the receptionist "Allow visitors going to Room 80 (HTTP)", everyone gets turned away at the door.',
      keyTakeaway: 'Click the EC2 server and click "+ Allow Inbound Port 80 (HTTP)" in the right-hand panel.'
    },
    briefing: 'Internet Users are wired to your EC2 server, but when they try to visit your website, the server firewall rejects them because Port 80 is not listed in the allowed rules.',
    taskDescription: '1. Click the EC2 Web Server on the board.\n2. In the right-hand Inspector panel, click "+ Allow Inbound Port 80 (HTTP)".\n3. Click "Run Traffic Test".',
    allowedPalette: [],
    docTips: [
      'Port 80 is standard HTTP web traffic; Port 443 is encrypted HTTPS web traffic.',
      'In AWS, this per-server firewall list is called a "Security Group".'
    ],
    coachSteps: [
      {
        id: 'step-select-ec2-fw',
        text: 'Step 1: Click the EC2 Web Server on the board to open its Firewall settings.',
        targetButton: 'grid',
        completed: (s, selectedId) => {
          const ec2 = getComponent(s, 'ec2');
          const alreadyOpen = !!ec2?.config.securityGroupInbound?.some(r => r.port === 80 || r.port === '80');
          return alreadyOpen || selectedId === 'ec2-locked';
        }
      },
      {
        id: 'step-open-port80',
        text: 'Step 2: In the right-hand Inspector panel, click "+ Allow Inbound Port 80 (HTTP)".',
        targetButton: 'inspector-port80',
        completed: (s) => {
          const ec2 = getComponent(s, 'ec2');
          return !!ec2?.config.securityGroupInbound?.some(r => r.port === 80 || r.port === '80');
        }
      },
      {
        id: 'step-test-port80',
        text: 'Step 3: Port 80 is now open! Click "Run Traffic Test" to verify.',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 'port_80_opened',
        label: 'Allow Inbound Port 80 (HTTP) on the EC2 Web Server',
        hint: 'Click the EC2 server on the board, then click "+ Allow Inbound Port 80 (HTTP)" in the Inspector panel.',
        check: (s) => {
          const ec2 = getComponent(s, 'ec2');
          return !!ec2?.config.securityGroupInbound?.some(r => r.port === 80 || r.port === '80');
        }
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'ec2-locked',
          type: 'ec2',
          name: 'EC2 Web Server',
          gridX: 1,
          gridZ: 0,
          subnet: 'public',
          az: 'us-east-1a',
          config: {
            port: 80,
            securityGroupInbound: []
          },
          status: 'warning'
        }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'ec2-locked', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 5,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Game Controls & Server Basics',
    title: 'Replacing a Crashed Server (Delete Tool)',
    tagline: 'Remove an offline server and re-route traffic to a healthy node',
    difficulty: 'Novice',
    concepts: ['Delete Tool', 'Fault Recovery', 'Re-Routing Traffic'],
    inspectorMode: 'basic',
    briefing: 'An old EC2 server ("Crashed Server #01") has frozen up, while a fresh "Healthy Web Server" is standing by below it. Use the Delete tool to remove the crashed server, then wire Internet Users to the healthy server.',
    taskDescription: '1. Click the "Delete" tool in the bottom dock and click "Crashed Server #01" to remove it.\n2. Click the "Wire" tool and connect "Internet Users" to "Healthy Web Server".\n3. Click "Run Traffic Test".',
    allowedPalette: [],
    docTips: [
      'In cloud engineering, rather than spending hours fixing a broken server, we terminate it and route traffic to a healthy instance.',
      'Deleting a server automatically removes any old wires attached to it.'
    ],
    coachSteps: [
      {
        id: 'step-pick-delete',
        text: 'Step 1: Click the "Delete" tool in the bottom dock.',
        targetButton: 'tool-delete',
        completed: (s, _sel, tool) => s.components.filter(c => c.type === 'ec2').length === 1 || tool === 'delete'
      },
      {
        id: 'step-remove-crashed',
        text: 'Step 2: Click "Crashed Server #01" (the top server) on the 3D board to remove it.',
        targetButton: 'grid',
        completed: (s) => !s.components.some(c => c.id === 'ec2-crashed')
      },
      {
        id: 'step-pick-wire-5',
        text: 'Step 3: Click the "Wire" tool and connect "Internet Users" to "Healthy Web Server".',
        targetButton: 'tool-cable',
        completed: (s) => hasConnected(s, 'client', 'ec2')
      },
      {
        id: 'step-test-5',
        text: 'Step 4: Click "Run Traffic Test" to confirm traffic flows to the healthy server.',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 'crashed_removed',
        label: 'Remove the crashed server from the board',
        hint: 'Select the Delete tool in the bottom dock and click "Crashed Server #01".',
        check: (s) => !s.components.some(c => c.id === 'ec2-crashed')
      },
      {
        id: 'healthy_wired',
        label: 'Wire Internet Users to the Healthy Web Server',
        hint: 'Select the Wire tool and connect Internet Users to Healthy Web Server.',
        check: (s) => hasConnected(s, 'client', 'ec2')
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'ec2-crashed',
          type: 'ec2',
          name: 'Crashed Server #01',
          gridX: 1,
          gridZ: -2,
          subnet: 'public',
          az: 'us-east-1a',
          config: { port: 80, securityGroupInbound: [] },
          status: 'error'
        },
        {
          id: 'ec2-healthy',
          type: 'ec2',
          name: 'Healthy Web Server',
          gridX: 1,
          gridZ: 2,
          subnet: 'public',
          az: 'us-east-1a',
          config: {
            port: 80,
            securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }]
          },
          status: 'healthy'
        }
      ],
      connections: [
        { id: 'c-bad', fromId: 'client-1', toId: 'ec2-crashed', port: 80, protocol: 'tcp', allowed: false }
      ]
    }
  },

  // =========================================================================
  // CHAPTER 2: CORE CLOUD BUILDING BLOCKS & INTRO TO DEVOPS (LEVELS 6–10)
  // =========================================================================
  {
    id: 6,
    chapterId: 2,
    chapterTitle: 'Chapter 2: Core Cloud Building Blocks',
    title: 'Public Zone vs. Private Zone',
    tagline: 'Learn why the board is divided into Public and Private network zones',
    difficulty: 'Novice',
    concepts: ['Public Subnet', 'Private Subnet', 'Network Zones'],
    inspectorMode: 'basic',
    conceptCard: {
      title: 'Why Are There Public and Private Zones?',
      summary: 'Notice the labeled zones on the 3D board: the middle section is the Public Subnet (teal), and the right-hand section is the Private Subnet (indigo).',
      analogy: 'Think of a bank: the Public Subnet is the front lobby where customers walk in from the street (your website). The Private Subnet is the locked back vault where cash and customer records are kept (your database).',
      keyTakeaway: 'Web servers that talk directly to Internet Users belong in the Public Subnet.'
    },
    briefing: 'In AWS, a network is split into zones called Subnets. Public Subnets can receive visitors from the internet, while Private Subnets are hidden in the back. Place an EC2 Web Server inside the Public Subnet and wire Internet Users to it.',
    taskDescription: '1. Click "+ EC2 Instance" and place it on the glowing target ring in the Public Subnet.\n2. Use the "Wire" tool to connect Internet Users to your EC2 server.\n3. Click "Run Traffic Test".',
    allowedPalette: ['ec2'],
    targetPlacements: [
      { type: 'ec2', gridX: 0, gridZ: 0, label: 'Public Subnet Slot' }
    ],
    docTips: [
      'Grid columns in the center (-1 to +2) represent the Public Subnet.',
      'Grid columns on the right (+3 to +7) represent the Private Subnet behind the security barrier.'
    ],
    coachSteps: [
      {
        id: 'step-place-pub',
        text: 'Step 1: Click "+ EC2 Instance" and place it on the glowing ring in the Public Subnet.',
        targetButton: 'palette-ec2',
        completed: (s) => s.components.some(c => c.type === 'ec2' && c.subnet === 'public')
      },
      {
        id: 'step-wire-pub',
        text: 'Step 2: Select the "Wire" tool and connect Internet Users to your EC2 server.',
        targetButton: 'tool-cable',
        completed: (s) => hasConnected(s, 'client', 'ec2')
      },
      {
        id: 'step-test-pub',
        text: 'Step 3: Click "Run Traffic Test" to verify.',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 'ec2_in_public_zone',
        label: 'Place an EC2 Web Server inside the Public Subnet (and none in Private/Edge)',
        hint: 'Place the EC2 server on the glowing target ring in the middle Public zone. Delete any EC2 placed in the Private or Edge zones.',
        check: (s) =>
          s.components.some(c => c.type === 'ec2' && c.subnet === 'public') &&
          !s.components.some(c => c.type === 'ec2' && c.subnet !== 'public')
      },
      {
        id: 'client_wired_6',
        label: 'Wire Internet Users to the Public Subnet EC2 (no direct wires to Private Subnet)',
        hint: 'Use the Wire tool to connect Internet Users only to your EC2 server inside the Public Subnet.',
        check: (s) =>
          hasConnected(s, 'client', 'ec2') &&
          s.connections.every(conn => {
            const fromC = s.components.find(c => c.id === conn.fromId);
            const toC = s.components.find(c => c.id === conn.toId);
            return fromC && toC && evaluateConnectionPhysics(fromC, toC).allowed;
          })
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        }
      ],
      connections: []
    }
  },

  {
    id: 7,
    chapterId: 2,
    chapterTitle: 'Chapter 2: Core Cloud Building Blocks',
    title: 'Cloud File Storage: Amazon S3 Bucket',
    tagline: 'Give your web server an unlimited cloud drive for images and files',
    difficulty: 'Novice',
    concepts: ['Amazon S3', 'Object Storage', 'Static Files'],
    inspectorMode: 'basic',
    conceptCard: {
      title: 'What is an Amazon S3 Bucket?',
      summary: 'EC2 servers have small local disks that get wiped if the server is replaced. Amazon S3 (Simple Storage Service) stores photos, videos, PDFs, and backups in durable "Buckets".',
      analogy: 'If an EC2 server is a chef working at a kitchen counter, an S3 Bucket is a massive, indestructible walk-in pantry where all ingredients and photos are kept safe.',
      keyTakeaway: 'Place an S3 Bucket on the glowing target tile and wire your EC2 Web Server to it.'
    },
    briefing: 'Your website needs a place to store user profile pictures and product photos. Deploy an Amazon S3 Bucket and connect your EC2 Web Server to it.',
    taskDescription: '1. Click "+ S3 Bucket" in the bottom dock and place it on the glowing target ring.\n2. Use the "Wire" tool to connect your EC2 Web Server to the S3 Bucket.\n3. Click "Run Traffic Test".',
    allowedPalette: ['s3'],
    targetPlacements: [
      { type: 's3', gridX: 4, gridZ: 0, label: 'Place S3 Bucket' }
    ],
    docTips: [
      'S3 stands for Simple Storage Service—it is one of the oldest and most popular AWS building blocks.',
      'S3 automatically keeps multiple copies of your files across separate facilities so data is never lost.'
    ],
    coachSteps: [
      {
        id: 'step-place-s3',
        text: 'Step 1: Click "+ S3 Bucket" in the dock and place it on the glowing green target ring.',
        targetButton: 'palette-s3',
        completed: (s) => hasComponent(s, 's3')
      },
      {
        id: 'step-wire-s3',
        text: 'Step 2: Click the "Wire" tool and connect the EC2 Web Server to the S3 Bucket.',
        targetButton: 'tool-cable',
        completed: (s) => hasConnected(s, 'ec2', 's3')
      },
      {
        id: 'step-test-s3',
        text: 'Step 3: Click "Run Traffic Test" to watch your server fetch files from S3.',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 's3_placed_7',
        label: 'Place an S3 Bucket on the board',
        hint: 'Select "+ S3 Bucket" from the bottom dock and click the glowing ring.',
        check: (s) => hasComponent(s, 's3')
      },
      {
        id: 'ec2_to_s3_wired',
        label: 'Connect the EC2 Web Server to the S3 Bucket',
        hint: 'Use the Wire tool to connect EC2 Web Server to S3 Bucket.',
        check: (s) => hasConnected(s, 'ec2', 's3')
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'ec2-1',
          type: 'ec2',
          name: 'EC2 Web Server',
          gridX: 0,
          gridZ: 0,
          subnet: 'public',
          az: 'us-east-1a',
          config: {
            port: 80,
            securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }]
          },
          status: 'healthy'
        }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'ec2-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 8,
    chapterId: 2,
    chapterTitle: 'Chapter 2: Core Cloud Building Blocks',
    title: 'Adding a Database in the Private Zone (RDS)',
    tagline: 'Store structured user accounts safely behind the Private Subnet barrier',
    difficulty: 'Novice',
    concepts: ['Amazon RDS', 'PostgreSQL Port 5432', 'Private Subnet Security'],
    inspectorMode: 'basic',
    conceptCard: {
      title: 'What is Amazon RDS (Relational Database Service)?',
      summary: 'While S3 is great for files and photos, structured records (usernames, orders, balances) belong in a SQL database like PostgreSQL running on Port 5432.',
      analogy: 'Because databases hold your most sensitive data, you always place them in the Private Subnet on the right side of the barrier—so only your EC2 web server can talk to the database, never outside strangers.',
      keyTakeaway: 'Place the RDS Database on the glowing tile in the Private Subnet and wire your EC2 server to it.'
    },
    briefing: 'To save user sign-ups and orders, your EC2 Web Server needs a PostgreSQL database. Place an RDS Database inside the Private Subnet on the right side of the barrier and wire your EC2 server to it.',
    taskDescription: '1. Click "+ RDS PostgreSQL" and place it on the glowing target ring in the Private Subnet.\n2. Wire your EC2 Web Server to the RDS Database.\n3. Click "Run Traffic Test".',
    allowedPalette: ['rds'],
    targetPlacements: [
      { type: 'rds', gridX: 4, gridZ: 0, label: 'Private DB Slot' }
    ],
    docTips: [
      'PostgreSQL databases communicate over Port 5432 by default.',
      'Keeping RDS in the Private Subnet ensures hackers on the internet cannot directly probe your database.'
    ],
    coachSteps: [
      {
        id: 'step-place-rds-8',
        text: 'Step 1: Click "+ RDS PostgreSQL" in the dock and click the glowing ring in the Private Subnet.',
        targetButton: 'palette-rds',
        completed: (s) => s.components.some(c => c.type === 'rds' && c.gridX >= 3)
      },
      {
        id: 'step-wire-rds-8',
        text: 'Step 2: Select the "Wire" tool and connect your EC2 Web Server to the RDS Database.',
        targetButton: 'tool-cable',
        completed: (s) => hasConnected(s, 'ec2', 'rds')
      },
      {
        id: 'step-test-rds-8',
        text: 'Step 3: Click "Run Traffic Test" to verify web-to-database traffic.',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 'rds_placed_private',
        label: 'Place an RDS Database in the Private Subnet (right of the barrier)',
        hint: 'Click "+ RDS PostgreSQL" and place it on the glowing ring at (4, 0).',
        check: (s) => s.components.some(c => c.type === 'rds' && c.gridX >= 3)
      },
      {
        id: 'ec2_wired_to_rds_8',
        label: 'Connect EC2 Web Server to RDS Database',
        hint: 'Use the Wire tool to connect EC2 Web Server to RDS.',
        check: (s) => hasConnected(s, 'ec2', 'rds')
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'ec2-1',
          type: 'ec2',
          name: 'EC2 Web Server',
          gridX: 0,
          gridZ: 0,
          subnet: 'public',
          az: 'us-east-1a',
          config: {
            port: 80,
            securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }]
          },
          status: 'healthy'
        }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'ec2-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 9,
    chapterId: 2,
    chapterTitle: 'Chapter 2: Core Cloud Building Blocks',
    title: 'Sharing the Load: Two Servers & A Load Balancer',
    tagline: 'Split incoming web traffic across two EC2 servers so neither overloads',
    difficulty: 'Novice',
    concepts: ['Load Balancer (ALB)', 'Horizontal Scaling', 'High Availability'],
    inspectorMode: 'basic',
    conceptCard: {
      title: 'What is a Load Balancer (ALB)?',
      summary: 'If thousands of users visit your site at once, a single EC2 server will slow down or crash. And if that one server reboots, your whole site goes offline.',
      analogy: 'An Application Load Balancer (ALB) is like an airport dispatcher directing incoming passengers evenly to two open security lanes. If one lane closes, all passengers smoothly go to the other.',
      keyTakeaway: 'Place a second EC2 server on the glowing ring and wire the Load Balancer to both EC2 servers.'
    },
    briefing: 'Traffic is growing! We placed an Application Load Balancer (ALB) at the entrance and one EC2 server on top. Place a second EC2 server on the bottom glowing ring and wire the Load Balancer to both servers.',
    taskDescription: '1. Click "+ EC2 Instance" and place a second server on the glowing target ring.\n2. Use the "Wire" tool to connect the Load Balancer to the new EC2 server.\n3. Click "Run Traffic Test".',
    allowedPalette: ['ec2'],
    targetPlacements: [
      { type: 'ec2', gridX: 2, gridZ: 2, label: 'Second EC2 Slot' }
    ],
    docTips: [
      'Running two or more servers behind a Load Balancer means your site stays online even if one server fails.',
      'The Load Balancer receives Port 80 traffic from users and forwards it evenly to each connected EC2 server.'
    ],
    coachSteps: [
      {
        id: 'step-place-second-ec2',
        text: 'Step 1: Click "+ EC2 Instance" and place a second server on the glowing green target ring.',
        targetButton: 'palette-ec2',
        completed: (s) => hasComponent(s, 'ec2', 2)
      },
      {
        id: 'step-wire-alb-ec2',
        text: 'Step 2: Select the "Wire" tool and connect the Load Balancer to your second EC2 server.',
        targetButton: 'tool-cable',
        completed: (s) => {
          const alb = getComponent(s, 'alb');
          if (!alb) return false;
          const ec2Conns = s.connections.filter(c => c.fromId === alb.id || c.toId === alb.id).filter(c => c.fromId.includes('ec2') || c.toId.includes('ec2'));
          return ec2Conns.length >= 2;
        }
      },
      {
        id: 'step-test-9',
        text: 'Step 3: Click "Run Traffic Test" to see packets split across both EC2 servers!',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 'two_ec2_servers_9',
        label: 'Have 2 EC2 Web Servers on the board',
        hint: 'Place a second EC2 server on the glowing target ring.',
        check: (s) => hasComponent(s, 'ec2', 2)
      },
      {
        id: 'alb_wired_to_both_9',
        label: 'Wire the Load Balancer to both EC2 servers',
        hint: 'Use the Wire tool to connect the Load Balancer to your new EC2 server.',
        check: (s) => {
          const alb = getComponent(s, 'alb');
          if (!alb) return false;
          const ec2Conns = s.connections.filter(c => c.fromId === alb.id || c.toId === alb.id).filter(c => c.fromId.includes('ec2') || c.toId.includes('ec2'));
          return ec2Conns.length >= 2;
        }
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'alb-1',
          type: 'alb',
          name: 'Load Balancer (ALB)',
          gridX: -1,
          gridZ: 0,
          subnet: 'public',
          az: 'global',
          config: { port: 80, multiAZ: true, targetGroupHealthCheck: true },
          status: 'healthy'
        },
        {
          id: 'ec2-1',
          type: 'ec2',
          name: 'EC2 Server #1',
          gridX: 2,
          gridZ: -2,
          subnet: 'public',
          az: 'us-east-1a',
          config: { port: 80, securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }] },
          status: 'healthy'
        }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'alb-1', port: 80, protocol: 'tcp', allowed: true },
        { id: 'c2', fromId: 'alb-1', toId: 'ec2-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 10,
    chapterId: 2,
    chapterTitle: 'Chapter 2: Core Cloud Building Blocks',
    title: 'What is DevOps & Terraform? (Blueprint Unlock)',
    tagline: 'See how your 3D server layout turns into an automated text blueprint',
    difficulty: 'Novice',
    concepts: ['DevOps', 'Infrastructure as Code', 'Terraform Blueprint'],
    inspectorMode: 'intermediate',
    conceptCard: {
      title: 'Demystifying DevOps & "Terraform"',
      summary: 'Up until now, you placed servers and clicked settings by hand. In the real world, what if you need to recreate this exact setup 20 times without forgetting a port? That is why DevOps engineers use "Infrastructure as Code" (like Terraform).',
      analogy: 'Think of Terraform like architectural blueprints or a LEGO instruction booklet. Instead of remembering which buttons you clicked in AWS, Terraform saves your 3D board as a simple text recipe (`resource "aws_instance" ...`). Whenever you change a block on the board, CloudCraft writes the Terraform recipe for you automatically!',
      keyTakeaway: 'We just unlocked the "Terraform Blueprint" button! Click the EC2 server to check its recipe, connect it to the RDS database, and run the test.'
    },
    briefing: 'Now you know the core secret of DevOps: turning manual cloud setup into repeatable text blueprints called "Terraform". Starting on this level, you can view the live Terraform recipe for any block you click—with plain-English comments explaining every line.',
    taskDescription: '1. Click the EC2 Web Server and look at the newly unlocked "Blueprint (Terraform)" tab in the right panel.\n2. Use the "Wire" tool to connect the EC2 Web Server to the RDS Database.\n3. Click "Run Traffic Test" to graduate from Onboarding!',
    allowedPalette: [],
    docTips: [
      'You never have to write Terraform code from scratch in CloudCraft—the game generates it live from your 3D blocks so you can learn by seeing.',
      'Clicking the "Terraform Blueprint" button in the bottom dock shows the recipe for your entire board.'
    ],
    coachSteps: [
      {
        id: 'step-wire-10',
        text: 'Step 1: Select the "Wire" tool and connect the EC2 Web Server to the RDS Database.',
        targetButton: 'tool-cable',
        completed: (s) => hasConnected(s, 'ec2', 'rds')
      },
      {
        id: 'step-test-10',
        text: 'Step 2: Click "Run Traffic Test" (or inspect the EC2 block’s Blueprint tab) to complete Onboarding!',
        targetButton: 'run-test',
        completed: () => false
      }
    ],
    requirements: [
      {
        id: 'ec2_to_rds_10',
        label: 'Connect the EC2 Web Server to the RDS Database',
        hint: 'Select the Wire tool and connect EC2 Web Server to RDS Database.',
        check: (s) => hasConnected(s, 'ec2', 'rds')
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -5,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'ec2-1',
          type: 'ec2',
          name: 'EC2 Web Server',
          gridX: 0,
          gridZ: 0,
          subnet: 'public',
          az: 'us-east-1a',
          config: {
            port: 80,
            instanceType: 't3.micro',
            securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }]
          },
          status: 'healthy'
        },
        {
          id: 'rds-1',
          type: 'rds',
          name: 'RDS PostgreSQL',
          gridX: 4,
          gridZ: 0,
          subnet: 'private',
          az: 'us-east-1a',
          config: { port: 5432, multiAZ: true, encrypted: true },
          status: 'healthy'
        }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'ec2-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  }
];

// ---------------------------------------------------------------------------
// 2. CORE 50 AWS & DEVOPS SCENARIOS (RE-INDEXED AS LEVELS 11–60)
// ---------------------------------------------------------------------------
const CORE_50_RAW: LevelDefinition[] = [
  // ==========================================
  // CHAPTER 1: CLOUD FOUNDATIONS & VPC NETWORKING (1-5)
  // ==========================================
  {
    id: 1,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Cloud Foundations & VPC Networking',
    title: 'Hello Cloud: First EC2 Instance',
    tagline: 'Provision your first compute node in a VPC',
    difficulty: 'Novice',
    concepts: ['EC2', 'VPC', 'Public Subnet', 'Security Groups'],
    briefing: 'Welcome to CloudCraft! You are the newly appointed Cloud Architect. Your first mission is to deploy a web application server on an AWS EC2 instance. In cloud environments, compute cannot exist in a vacuum—it requires a Virtual Private Cloud (VPC), a Public Subnet, and an HTTP inbound security rule.',
    taskDescription: '1. Place an EC2 instance in the Public Subnet.\n2. Connect the Client to the EC2 instance on Port 80.\n3. Configure EC2 Security Group to allow Inbound HTTP traffic (Port 80).',
    allowedPalette: ['ec2'],
    docTips: [
      'AWS EC2 instances provide scalable computing capacity.',
      'Public subnets have routes to the Internet Gateway.',
      'Default security groups block all inbound traffic unless explicitly permitted.'
    ],
    iacSnippet: `resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web_sg.id]
}`,
    requirements: [
      {
        id: 'ec2_exists',
        label: 'Deploy an EC2 instance into Public Subnet',
        hint: 'Select EC2 from the palette and place it inside the cyan Public Subnet grid.',
        check: (s) => s.components.some(c => c.type === 'ec2' && c.subnet === 'public')
      },
      {
        id: 'client_connected',
        label: 'Connect Client traffic to EC2 on Port 80',
        hint: 'Use the Cable Link tool to wire Client to the EC2 server.',
        check: (s) => hasConnected(s, 'client', 'ec2')
      },
      {
        id: 'sg_http_allowed',
        label: 'Open HTTP Port 80 in Security Group',
        hint: 'Click the EC2 instance and ensure Port 80 is allowed in Inbound Rules.',
        check: (s) => {
          const ec2 = getComponent(s, 'ec2');
          return !!(ec2?.config.securityGroupInbound?.some(r => r.port === 80 || r.port === '80'));
        }
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -6,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        }
      ],
      connections: []
    }
  },

  {
    id: 2,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Cloud Foundations & VPC Networking',
    title: 'The Internet Gateway (IGW)',
    tagline: 'Connect your VPC to the wider world',
    difficulty: 'Novice',
    concepts: ['Internet Gateway', 'Route Table', 'CIDR 0.0.0.0/0'],
    briefing: 'A VPC is completely isolated by default. To allow bidirectional communication with the internet, you must attach an Internet Gateway (IGW) and configure the route table with a default route (0.0.0.0/0 pointing to the IGW).',
    taskDescription: '1. Place an Internet Gateway (IGW) at the VPC boundary.\n2. Wire Client -> IGW -> EC2.\n3. Configure the IGW default route to 0.0.0.0/0.',
    allowedPalette: ['igw', 'ec2'],
    docTips: [
      'An Internet Gateway is horizontally scaled, redundant, and highly available.',
      'Route table entry 0.0.0.0/0 represents all IPv4 traffic destined outside the VPC.'
    ],
    iacSnippet: `resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route" "internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.gw.id
}`,
    requirements: [
      {
        id: 'igw_placed',
        label: 'Deploy an Internet Gateway (IGW)',
        hint: 'Place an IGW on the edge grid between the external web and VPC.',
        check: (s) => hasComponent(s, 'igw')
      },
      {
        id: 'client_to_igw',
        label: 'Route Client traffic through IGW',
        hint: 'Wire Client to IGW, then IGW to EC2.',
        check: (s) => hasConnected(s, 'client', 'igw') && hasConnected(s, 'igw', 'ec2')
      },
      {
        id: 'igw_route_configured',
        label: 'Route Table has 0.0.0.0/0 pointing to IGW',
        hint: 'Click the IGW and set CIDR Route to 0.0.0.0/0.',
        check: (s) => {
          const igw = getComponent(s, 'igw');
          return igw?.config.cidr === '0.0.0.0/0';
        }
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -6,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'ec2-1',
          type: 'ec2',
          name: 'Web Server',
          gridX: 2,
          gridZ: 0,
          subnet: 'public',
          az: 'us-east-1a',
          config: {
            securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }]
          },
          status: 'healthy'
        }
      ],
      connections: []
    }
  },

  {
    id: 3,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Cloud Foundations & VPC Networking',
    title: 'Subnet Isolation: Public vs Private',
    tagline: 'Shield sensitive workloads behind network firewalls',
    difficulty: 'Novice',
    concepts: ['Subnet Architecture', 'Private Subnet', 'Database Security'],
    briefing: 'Never expose databases directly to the internet! Best practice is multi-tier architecture: public subnets host frontend web servers, while private subnets host databases with zero direct inbound internet routes.',
    taskDescription: '1. Place an RDS Database in the Private Subnet.\n2. Connect EC2 Web Server to the RDS Database on PostgreSQL Port 5432.\n3. Make sure RDS is NOT directly connected to Client or IGW.',
    allowedPalette: ['rds'],
    docTips: [
      'Private subnets do not have routes to an Internet Gateway.',
      'Only application instances inside the VPC should have access to database ports.'
    ],
    iacSnippet: `resource "aws_db_instance" "default" {
  engine         = "postgres"
  instance_class = "db.t4g.micro"
  db_subnet_group_name = aws_db_subnet_group.private.name
  publicly_accessible  = false
}`,
    requirements: [
      {
        id: 'rds_in_private',
        label: 'Place RDS Database in the Private Subnet',
        hint: 'Place RDS on the amber/purple Private Subnet area.',
        check: (s) => s.components.some(c => c.type === 'rds' && s.components.find(x => x.id === c.id)?.gridX! > 3)
      },
      {
        id: 'ec2_to_rds',
        label: 'Connect EC2 to RDS on Port 5432',
        hint: 'Create a cable link between EC2 and RDS.',
        check: (s) => hasConnected(s, 'ec2', 'rds')
      },
      {
        id: 'no_direct_db_exposure',
        label: 'Zero direct Internet access to RDS',
        hint: 'Client or IGW must never have a direct cable to RDS.',
        check: (s) => !hasConnected(s, 'client', 'rds') && !hasConnected(s, 'igw', 'rds')
      }
    ],
    initialState: {
      components: [
        {
          id: 'client-1',
          type: 'client',
          name: 'Internet Users',
          gridX: -6,
          gridZ: 0,
          subnet: 'external',
          az: 'global',
          config: {},
          status: 'healthy'
        },
        {
          id: 'igw-1',
          type: 'igw',
          name: 'Internet Gateway',
          gridX: -2,
          gridZ: 0,
          subnet: 'edge',
          az: 'global',
          config: { cidr: '0.0.0.0/0' },
          status: 'healthy'
        },
        {
          id: 'ec2-1',
          type: 'ec2',
          name: 'App Web Server',
          gridX: 1,
          gridZ: 0,
          subnet: 'public',
          az: 'us-east-1a',
          config: { securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }] },
          status: 'healthy'
        }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'igw-1', port: 80, protocol: 'tcp', allowed: true },
        { id: 'c2', fromId: 'igw-1', toId: 'ec2-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 4,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Cloud Foundations & VPC Networking',
    title: 'The NAT Gateway Bridge',
    tagline: 'Allow outbound patch updates for private servers',
    difficulty: 'Novice',
    concepts: ['NAT Gateway', 'Elastic IP', 'Outbound Internet'],
    briefing: 'Your private backend instances need security patches (apt update) from the internet, but must remain unreachable from incoming hackers. A NAT (Network Address Translation) Gateway sits in the Public Subnet and translates private requests.',
    taskDescription: '1. Place a NAT Gateway in the Public Subnet.\n2. Connect RDS/Backend to the NAT Gateway for updates.\n3. Connect NAT Gateway to IGW.',
    allowedPalette: ['nat_gw'],
    docTips: [
      'NAT Gateways MUST be deployed in a public subnet with an allocated Elastic IP.',
      'NAT Gateway handles one-way outbound traffic: private instances can download patches, but outside traffic cannot initiate connections.'
    ],
    iacSnippet: `resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id
}`,
    requirements: [
      {
        id: 'nat_placed',
        label: 'Deploy NAT Gateway in Public Subnet',
        hint: 'Place NAT Gateway in the Public Subnet zone.',
        check: (s) => hasComponent(s, 'nat_gw')
      },
      {
        id: 'nat_to_igw',
        label: 'Connect NAT Gateway to IGW',
        hint: 'Wire NAT Gateway to the Internet Gateway.',
        check: (s) => hasConnected(s, 'nat_gw', 'igw')
      },
      {
        id: 'private_to_nat',
        label: 'Connect Private Node to NAT Gateway',
        hint: 'Wire the backend/RDS instance to the NAT Gateway.',
        check: (s) => hasConnected(s, 'rds', 'nat_gw') || hasConnected(s, 'ec2', 'nat_gw')
      }
    ],
    initialState: {
      components: [
        { id: 'igw-1', type: 'igw', name: 'Internet Gateway', gridX: -3, gridZ: 0, subnet: 'edge', az: 'global', config: { cidr: '0.0.0.0/0' }, status: 'healthy' },
        { id: 'rds-1', type: 'rds', name: 'Private DB Node', gridX: 4, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: { encrypted: true }, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 5,
    chapterId: 1,
    chapterTitle: 'Chapter 1: Cloud Foundations & VPC Networking',
    title: 'Security Group Defense Matrix',
    tagline: 'Lock down attack surface with stateful firewall rules',
    difficulty: 'Novice',
    concepts: ['Security Group', 'Port 22 SSH', 'Port 80/443'],
    briefing: 'An audit revealed your EC2 server has SSH port 22 open to the entire world (0.0.0.0/0)! Malicious bots are trying brute-force attacks. You must restrict SSH to your office bastion IP (203.0.113.50/32) and ensure web traffic (80/443) remains open.',
    taskDescription: '1. Inspect the EC2 Security Group.\n2. Restrict SSH Port 22 source to 203.0.113.50/32.\n3. Confirm Port 80 and 443 are allowed for 0.0.0.0/0.',
    allowedPalette: ['ec2'],
    docTips: [
      'Never leave SSH (port 22) open to 0.0.0.0/0.',
      'Security Groups are stateful: outbound return traffic is automatically allowed.'
    ],
    iacSnippet: `resource "aws_security_group_rule" "ssh" {
  type        = "ingress"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["203.0.113.50/32"]
}`,
    requirements: [
      {
        id: 'ssh_restricted',
        label: 'SSH Port 22 restricted from 0.0.0.0/0',
        hint: 'Click EC2 -> Change SSH 22 source from 0.0.0.0/0 to 203.0.113.50/32.',
        check: (s) => {
          const ec2 = getComponent(s, 'ec2');
          const sshRule = ec2?.config.securityGroupInbound?.find(r => r.port === 22 || r.port === '22');
          return !!sshRule && sshRule.source !== '0.0.0.0/0';
        }
      },
      {
        id: 'web_open',
        label: 'HTTP Port 80 is accessible',
        hint: 'Ensure port 80 is allowed in Inbound rules.',
        check: (s) => {
          const ec2 = getComponent(s, 'ec2');
          return !!ec2?.config.securityGroupInbound?.some(r => r.port === 80 || r.port === '80');
        }
      }
    ],
    initialState: {
      components: [
        {
          id: 'ec2-target',
          type: 'ec2',
          name: 'Bastion Target',
          gridX: 0,
          gridZ: 0,
          subnet: 'public',
          az: 'us-east-1a',
          config: {
            securityGroupInbound: [
              { protocol: 'tcp', port: 22, source: '0.0.0.0/0', description: 'Vulnerable SSH' },
              { protocol: 'tcp', port: 80, source: '0.0.0.0/0', description: 'Web traffic' }
            ]
          },
          status: 'warning'
        }
      ],
      connections: []
    }
  },

  // ==========================================
  // CHAPTER 2: HIGH AVAILABILITY & ELASTIC LOAD BALANCING (6-10)
  // ==========================================
  {
    id: 6,
    chapterId: 2,
    chapterTitle: 'Chapter 2: High Availability & Load Balancing',
    title: 'Application Load Balancer (ALB)',
    tagline: 'Evenly distribute traffic across multiple compute nodes',
    difficulty: 'Intermediate',
    concepts: ['ALB', 'Target Groups', 'Health Checks'],
    briefing: 'A single EC2 server is a single point of failure (SPOF). An Application Load Balancer operates at Layer 7 (HTTP/HTTPS) and routes requests across a fleet of targets, continually pinging health checks.',
    taskDescription: '1. Place an Application Load Balancer (ALB).\n2. Place 2 EC2 instances.\n3. Wire Client -> ALB, and ALB to both EC2 instances.\n4. Enable Target Group Health Check on the ALB.',
    allowedPalette: ['alb', 'ec2'],
    docTips: [
      'ALB distributes traffic using round-robin and least outstanding requests.',
      'Unhealthy targets are automatically removed from receiving traffic.'
    ],
    iacSnippet: `resource "aws_lb" "main" {
  name               = "web-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = [aws_subnet.pub_a.id, aws_subnet.pub_b.id]
}`,
    requirements: [
      {
        id: 'alb_exists',
        label: 'Deploy an ALB',
        hint: 'Place ALB between the client and compute nodes.',
        check: (s) => hasComponent(s, 'alb')
      },
      {
        id: 'two_ec2',
        label: 'Deploy at least 2 EC2 instances',
        hint: 'Place two EC2 instances to receive balanced load.',
        check: (s) => hasComponent(s, 'ec2', 2)
      },
      {
        id: 'alb_wired',
        label: 'ALB wired to Client and both EC2 servers',
        hint: 'Connect Client -> ALB, and ALB -> EC2-1 and EC2-2.',
        check: (s) => {
          const alb = getComponent(s, 'alb');
          if (!alb) return false;
          const toComps = s.connections.filter(c => c.fromId === alb.id || c.toId === alb.id);
          const hasClient = toComps.some(c => c.fromId.includes('client') || c.toId.includes('client'));
          const ec2Count = toComps.filter(c => c.fromId.includes('ec2') || c.toId.includes('ec2')).length;
          return hasClient && ec2Count >= 2;
        }
      },
      {
        id: 'health_check_on',
        label: 'Enable Target Group Health Check',
        hint: 'Click ALB and check Target Group Health Check.',
        check: (s) => !!getComponent(s, 'alb')?.config.targetGroupHealthCheck
      }
    ],
    initialState: {
      components: [
        { id: 'client-1', type: 'client', name: 'Web Visitors', gridX: -6, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 7,
    chapterId: 2,
    chapterTitle: 'Chapter 2: High Availability & Load Balancing',
    title: 'Multi-AZ Fault Tolerance',
    tagline: 'Survive an entire data center power outage',
    difficulty: 'Intermediate',
    concepts: ['Availability Zones', 'Multi-AZ', 'Disaster Resilience'],
    briefing: 'AWS Regions consist of multiple isolated Availability Zones (AZs) connected with ultra-low-latency fiber. If lightning strikes AZ-1a, your app must keep running in AZ-1b with zero downtime.',
    taskDescription: '1. Deploy one EC2 in us-east-1a and one EC2 in us-east-1b.\n2. Ensure both are connected to the ALB.\n3. Enable Multi-AZ mode on the ALB.',
    allowedPalette: ['ec2', 'alb'],
    docTips: [
      'ALBs must be deployed across at least two Availability Zones.',
      'Cross-Zone Load Balancing evenly distributes requests regardless of instance counts per AZ.'
    ],
    iacSnippet: `subnets = [
  aws_subnet.us_east_1a.id,
  aws_subnet.us_east_1b.id
]`,
    requirements: [
      {
        id: 'multi_az_nodes',
        label: 'Instances deployed across us-east-1a and us-east-1b',
        hint: 'Place a second EC2 on the bottom half of the grid (Z > 0) for us-east-1b.',
        check: (s) => {
          const ec2s = s.components.filter(c => c.type === 'ec2');
          const has1a = ec2s.some(c => c.az === 'us-east-1a');
          const has1b = ec2s.some(c => c.az === 'us-east-1b' || c.gridZ > 0);
          return ec2s.length >= 2 && has1a && has1b;
        }
      },
      {
        id: 'alb_multiaz',
        label: 'ALB Multi-AZ enabled',
        hint: 'Select ALB and toggle Multi-AZ configuration to true.',
        check: (s) => !!getComponent(s, 'alb')?.config.multiAZ
      }
    ],
    initialState: {
      components: [
        { id: 'alb-1', type: 'alb', name: 'App Load Balancer', gridX: -2, gridZ: 0, subnet: 'public', az: 'global', config: { multiAZ: false, targetGroupHealthCheck: true }, status: 'healthy' },
        { id: 'ec2-1', type: 'ec2', name: 'EC2 Node 1', gridX: 2, gridZ: -2, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'alb-1', toId: 'ec2-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 8,
    chapterId: 2,
    chapterTitle: 'Chapter 2: High Availability & Load Balancing',
    title: 'Auto Scaling Group (ASG) Elasticity',
    tagline: 'Scale dynamically from Black Friday spikes to midnight calm',
    difficulty: 'Intermediate',
    concepts: ['Auto Scaling', 'Min/Max Capacity', 'Launch Template'],
    briefing: 'Manual server provisioning fails during viral spikes. An Auto Scaling Group (ASG) dynamically spins up new EC2 instances when CPU exceeds thresholds and terminates idle servers to cut cloud bills.',
    taskDescription: '1. Deploy an Auto Scaling Group (ASG).\n2. Configure Min Capacity to 2 and Max Capacity to 6.\n3. Connect ALB to ASG.',
    allowedPalette: ['asg'],
    docTips: [
      'ASG maintains desired capacity and automatically replaces unhealthy instances.',
      'Scale-out policies add instances; scale-in policies remove them with cooldown periods.'
    ],
    iacSnippet: `resource "aws_autoscaling_group" "app_asg" {
  min_size         = 2
  max_size         = 6
  desired_capacity = 2
  target_group_arns = [aws_lb_target_group.tg.arn]
}`,
    requirements: [
      {
        id: 'asg_deployed',
        label: 'Deploy an Auto Scaling Group (ASG)',
        hint: 'Place ASG on the grid.',
        check: (s) => hasComponent(s, 'asg')
      },
      {
        id: 'asg_configured',
        label: 'Set ASG Min Capacity >= 2 and Max Capacity >= 6',
        hint: 'Click ASG and configure Min Capacity: 2, Max Capacity: 6.',
        check: (s) => {
          const asg = getComponent(s, 'asg');
          return !!asg && (asg.config.minCapacity || 0) >= 2 && (asg.config.maxCapacity || 0) >= 6;
        }
      },
      {
        id: 'alb_to_asg',
        label: 'Connect ALB to ASG',
        hint: 'Create a cable link from ALB to ASG.',
        check: (s) => hasConnected(s, 'alb', 'asg')
      }
    ],
    initialState: {
      components: [
        { id: 'client-1', type: 'client', name: 'Users', gridX: -6, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 'alb-1', type: 'alb', name: 'Production ALB', gridX: -2, gridZ: 0, subnet: 'public', az: 'global', config: { multiAZ: true, targetGroupHealthCheck: true }, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'alb-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 9,
    chapterId: 2,
    chapterTitle: 'Chapter 2: High Availability & Load Balancing',
    title: 'Path-Based Routing Microservices',
    tagline: 'Split /api and /static traffic intelligently',
    difficulty: 'Intermediate',
    concepts: ['ALB Listener Rules', 'Path Routing', 'Microservices'],
    briefing: 'Instead of monolithic servers, modern architectures route /api requests to compute instances and /static assets to S3 buckets or static web clusters.',
    taskDescription: '1. Place an S3 Bucket for static files.\n2. Connect ALB to both EC2 (for /api) and S3 (for /static).\n3. Set S3 static hosting to enabled.',
    allowedPalette: ['s3'],
    docTips: [
      'ALB rules can match Host headers, Path patterns, HTTP headers, and query strings.',
      'Default actions handle unmatched requests.'
    ],
    iacSnippet: `resource "aws_lb_listener_rule" "static" {
  listener_arn = aws_lb_listener.front_end.arn
  action {
    type = "forward"
    target_group_arn = aws_lb_target_group.static.arn
  }
  condition {
    path_pattern {
      values = ["/static/*"]
    }
  }
}`,
    requirements: [
      {
        id: 's3_exists',
        label: 'Deploy an S3 Bucket for static assets',
        hint: 'Place an S3 bucket component.',
        check: (s) => hasComponent(s, 's3')
      },
      {
        id: 'alb_to_s3',
        label: 'Connect ALB to S3',
        hint: 'Wire ALB to the S3 bucket.',
        check: (s) => hasConnected(s, 'alb', 's3')
      },
      {
        id: 's3_static_enabled',
        label: 'Enable S3 Static Hosting / CORS',
        hint: 'Click S3 and toggle corsEnabled to true.',
        check: (s) => !!getComponent(s, 's3')?.config.corsEnabled
      }
    ],
    initialState: {
      components: [
        { id: 'alb-1', type: 'alb', name: 'Microservices ALB', gridX: -2, gridZ: 0, subnet: 'public', az: 'global', config: { multiAZ: true }, status: 'healthy' },
        { id: 'ec2-api', type: 'ec2', name: 'API Microservice', gridX: 2, gridZ: -2, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'alb-1', toId: 'ec2-api', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 10,
    chapterId: 2,
    chapterTitle: 'Chapter 2: High Availability & Load Balancing',
    title: 'HTTPS / TLS Offloading with ACM',
    tagline: 'Secure web traffic and terminate TLS at the edge',
    difficulty: 'Intermediate',
    concepts: ['ACM', 'HTTPS Port 443', 'TLS Termination', 'Redirect 80->443'],
    briefing: 'Unencrypted HTTP traffic exposes user credentials to snooping. Terminate TLS on the ALB using AWS Certificate Manager (ACM) to encrypt traffic in transit while freeing backend servers from cryptographic overhead.',
    taskDescription: '1. Update ALB Port to 443 (HTTPS).\n2. Enable Encrypted TLS on ALB.\n3. Confirm end-to-end secure transmission to backend EC2.',
    allowedPalette: [],
    docTips: [
      'AWS Certificate Manager (ACM) provisions free, auto-renewing SSL/TLS certificates.',
      'ALB listener redirects port 80 to 443 with HTTP 301 Moved Permanently.'
    ],
    iacSnippet: `resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate.cert.arn
}`,
    requirements: [
      {
        id: 'alb_port_443',
        label: 'Configure ALB Listener on Port 443',
        hint: 'Click ALB and set Port to 443.',
        check: (s) => getComponent(s, 'alb')?.config.port === 443
      },
      {
        id: 'alb_tls_enabled',
        label: 'Enable TLS Encryption on ALB',
        hint: 'Click ALB and check Encrypted (ACM TLS).',
        check: (s) => !!getComponent(s, 'alb')?.config.encrypted
      }
    ],
    initialState: {
      components: [
        { id: 'alb-1', type: 'alb', name: 'Public ALB', gridX: -2, gridZ: 0, subnet: 'public', az: 'global', config: { port: 80, encrypted: false }, status: 'warning' },
        { id: 'ec2-1', type: 'ec2', name: 'Web Backend', gridX: 2, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'alb-1', toId: 'ec2-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  // ==========================================
  // CHAPTER 3: STORAGE & DATABASE TIERING (11-15)
  // ==========================================
  {
    id: 11,
    chapterId: 3,
    chapterTitle: 'Chapter 3: Storage & Database Tiering',
    title: 'S3 Bucket Security & Public Access Block',
    tagline: 'Lock down cloud object storage against data leaks',
    difficulty: 'Novice',
    concepts: ['S3', 'Block Public Access', 'Bucket Encryption'],
    briefing: 'Countless corporate data breaches happen due to misconfigured public S3 buckets. AWS now provides "Block Public Access" at the bucket and account level, along with default KMS AES-256 encryption.',
    taskDescription: '1. Inspect the S3 Bucket.\n2. Enable "Block Public Access".\n3. Enable "Encrypted" (KMS / AES-256).',
    allowedPalette: ['s3'],
    docTips: [
      'S3 Block Public Access overrides any overly permissive ACLs or Bucket Policies.',
      'Server-side encryption with KMS ensures data is encrypted before saving to disk.'
    ],
    iacSnippet: `resource "aws_s3_bucket_public_access_block" "block" {
  bucket = aws_s3_bucket.data.id
  block_public_acls   = true
  block_public_policy = true
}`,
    requirements: [
      {
        id: 's3_block_public',
        label: 'Enable Block Public Access on S3',
        hint: 'Click S3 and toggle Block Public Access to true.',
        check: (s) => !!getComponent(s, 's3')?.config.blockPublicAccess
      },
      {
        id: 's3_encrypted',
        label: 'Enable at-rest encryption on S3',
        hint: 'Click S3 and toggle Encrypted to true.',
        check: (s) => !!getComponent(s, 's3')?.config.encrypted
      }
    ],
    initialState: {
      components: [
        { id: 's3-data', type: 's3', name: 'Customer Vault S3', gridX: 2, gridZ: 0, subnet: 'isolated', az: 'global', config: { blockPublicAccess: false, encrypted: false }, status: 'error' }
      ],
      connections: []
    }
  },

  {
    id: 12,
    chapterId: 3,
    chapterTitle: 'Chapter 3: Storage & Database Tiering',
    title: 'RDS Multi-AZ Automated Failover',
    tagline: 'Achieve zero-data-loss database redundancy',
    difficulty: 'Intermediate',
    concepts: ['RDS Multi-AZ', 'Synchronous Replication', 'Failover'],
    briefing: 'Single-node databases crash on hardware failure. RDS Multi-AZ synchronously replicates all database transactions to a standby replica in a second availability zone, automatically failing over in under 60 seconds.',
    taskDescription: '1. Place an RDS PostgreSQL Database in the Private Subnet.\n2. Toggle "Multi-AZ" on the RDS instance.\n3. Connect EC2 Web App to RDS on Port 5432.',
    allowedPalette: ['rds'],
    docTips: [
      'Multi-AZ handles OS updates, hardware failures, and AZ outages transparently.',
      'Database endpoint DNS flips automatically during failover with no code change.'
    ],
    iacSnippet: `resource "aws_db_instance" "prod_db" {
  engine         = "postgres"
  multi_az       = true
  instance_class = "db.m6i.large"
}`,
    requirements: [
      {
        id: 'rds_exists',
        label: 'Deploy RDS Database in Private Subnet',
        hint: 'Place RDS in the private subnet area.',
        check: (s) => hasComponent(s, 'rds')
      },
      {
        id: 'rds_multiaz',
        label: 'Enable Multi-AZ on RDS',
        hint: 'Click RDS and toggle Multi-AZ to true.',
        check: (s) => !!getComponent(s, 'rds')?.config.multiAZ
      },
      {
        id: 'app_connected_to_db',
        label: 'Connect App to RDS on Port 5432',
        hint: 'Connect EC2 to RDS.',
        check: (s) => hasConnected(s, 'ec2', 'rds')
      }
    ],
    initialState: {
      components: [
        { id: 'ec2-app', type: 'ec2', name: 'App Server', gridX: -1, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 13,
    chapterId: 3,
    chapterTitle: 'Chapter 3: Storage & Database Tiering',
    title: 'RDS Read Replicas for Scale',
    tagline: 'Offload read-heavy analytics and dashboard queries',
    difficulty: 'Intermediate',
    concepts: ['Read Replicas', 'Asynchronous Replication', 'Query Offloading'],
    briefing: 'During analytics batch processing, CPU on your primary database reaches 100%, causing checkout timeouts. Deploy an asynchronous RDS Read Replica to handle read queries, keeping the primary database free for writes.',
    taskDescription: '1. Configure RDS to enable "Read Replica".\n2. Add a second EC2 analytics worker.\n3. Wire the analytics worker to the RDS Read Replica.',
    allowedPalette: ['ec2'],
    docTips: [
      'Read replicas use asynchronous replication and provide horizontal read scaling.',
      'You can have up to 15 read replicas per primary DB in AWS RDS.'
    ],
    iacSnippet: `resource "aws_db_instance" "replica" {
  replicate_source_db = aws_db_instance.primary.identifier
  instance_class      = "db.r6g.large"
}`,
    requirements: [
      {
        id: 'rds_read_rep',
        label: 'Enable Read Replica on RDS',
        hint: 'Click RDS and toggle Read Replica to true.',
        check: (s) => !!getComponent(s, 'rds')?.config.readReplica
      },
      {
        id: 'analytics_worker',
        label: 'Deploy Analytics Worker EC2',
        hint: 'Place a second EC2 instance for analytics.',
        check: (s) => hasComponent(s, 'ec2', 2)
      }
    ],
    initialState: {
      components: [
        { id: 'rds-primary', type: 'rds', name: 'Primary DB', gridX: 3, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: { readReplica: false, multiAZ: true }, status: 'healthy' },
        { id: 'ec2-web', type: 'ec2', name: 'Web Server', gridX: -1, gridZ: -2, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'ec2-web', toId: 'rds-primary', port: 5432, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 14,
    chapterId: 3,
    chapterTitle: 'Chapter 3: Storage & Database Tiering',
    title: 'Sub-Millisecond In-Memory Caching',
    tagline: 'Protect your SQL database with ElastiCache / DynamoDB Accelerator',
    difficulty: 'Intermediate',
    concepts: ['In-Memory Cache', 'Redis', 'Latency Reduction'],
    briefing: 'Repeated database lookups for session data and top product catalogs are slow (50ms). Insert a fast NoSQL/in-memory tier between the compute layer and the database to cut latency down to <1ms.',
    taskDescription: '1. Place DynamoDB / Fast Cache layer.\n2. Wire the App Server to the fast data store.\n3. Verify traffic flows cleanly.',
    allowedPalette: ['dynamodb'],
    docTips: [
      'Cache-aside pattern: check cache first; on miss, query database and populate cache.',
      'Saves database IOPS and dramatically lowers AWS infrastructure costs.'
    ],
    iacSnippet: `resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "app-cache"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
}`,
    requirements: [
      {
        id: 'cache_deployed',
        label: 'Deploy Fast In-Memory / NoSQL Data Store',
        hint: 'Place DynamoDB or fast cache layer.',
        check: (s) => hasComponent(s, 'dynamodb')
      },
      {
        id: 'cache_connected',
        label: 'Connect Web App to Caching Tier',
        hint: 'Connect EC2 to DynamoDB / cache.',
        check: (s) => hasConnected(s, 'ec2', 'dynamodb')
      }
    ],
    initialState: {
      components: [
        { id: 'ec2-app', type: 'ec2', name: 'App Server', gridX: -1, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: { cached: false }, status: 'healthy' },
        { id: 'rds-db', type: 'rds', name: 'Primary DB', gridX: 4, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'ec2-app', toId: 'rds-db', port: 5432, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 15,
    chapterId: 3,
    chapterTitle: 'Chapter 3: Storage & Database Tiering',
    title: 'S3 Lifecycle & Glacier Tiering',
    tagline: 'Automate data archiving to slash storage bills',
    difficulty: 'Intermediate',
    concepts: ['S3 Lifecycle', 'Glacier', 'Cost Optimization'],
    briefing: 'Compliance rules require retaining logs for 7 years, but keeping petabytes of old logs in S3 Standard costs thousands per month. Set up S3 lifecycle rules and versioning to transition objects to Glacier after 90 days.',
    taskDescription: '1. Click S3 Bucket.\n2. Enable "Versioning".\n3. Set TTL / transition to 90 days.\n4. Enable "Encrypted" at rest.',
    allowedPalette: [],
    docTips: [
      'S3 Glacier Deep Archive costs as little as $0.00099 per GB/month.',
      'Lifecycle rules automatically transition objects without requiring manual scripts.'
    ],
    iacSnippet: `resource "aws_s3_bucket_lifecycle_configuration" "rule" {
  bucket = aws_s3_bucket.logs.id
  rule {
    id     = "archive-glacier"
    status = "Enabled"
    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}`,
    requirements: [
      {
        id: 's3_versioning',
        label: 'Enable S3 Versioning',
        hint: 'Click S3 and toggle versioning to true.',
        check: (s) => !!getComponent(s, 's3')?.config.versioning
      },
      {
        id: 's3_ttl',
        label: 'Set S3 TTL / Transition policy to 90 days',
        hint: 'Click S3 and set ttlSeconds to 90.',
        check: (s) => getComponent(s, 's3')?.config.ttlSeconds === 90
      }
    ],
    initialState: {
      components: [
        { id: 's3-logs', type: 's3', name: 'Audit Log Bucket', gridX: 2, gridZ: 0, subnet: 'isolated', az: 'global', config: { versioning: false, ttlSeconds: 0, encrypted: true }, status: 'warning' }
      ],
      connections: []
    }
  },

  // ==========================================
  // CHAPTER 4: SECURITY, IDENTITY & GOVERNANCE (16-20)
  // ==========================================
  {
    id: 16,
    chapterId: 4,
    chapterTitle: 'Chapter 4: Security, Identity & Governance',
    title: 'Least-Privilege IAM Roles',
    tagline: 'Eliminate hardcoded API keys forever',
    difficulty: 'Intermediate',
    concepts: ['IAM Role', 'Instance Profile', 'Least Privilege'],
    briefing: 'Developers put AWS root access keys in application config files, which leaked to GitHub! The remedy: attach an IAM Instance Profile directly to the EC2 server granting least-privilege access (s3:GetObject only) via temporary STS tokens.',
    taskDescription: '1. Place an IAM Role component.\n2. Connect IAM Role to EC2 Server.\n3. Configure IAM Role to "s3:ReadOnly" instead of Admin "*".',
    allowedPalette: ['iam'],
    docTips: [
      'EC2 instance metadata service (IMDSv2) delivers auto-rotated temporary credentials.',
      'Never grant AdministratorAccess or "*" when specific action policies suffice.'
    ],
    iacSnippet: `resource "aws_iam_role_policy_attachment" "s3_read" {
  role       = aws_iam_role.app_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}`,
    requirements: [
      {
        id: 'iam_placed',
        label: 'Deploy an IAM Role component',
        hint: 'Place IAM Role on the canvas.',
        check: (s) => hasComponent(s, 'iam')
      },
      {
        id: 'iam_attached',
        label: 'Attach IAM Role to EC2 instance',
        hint: 'Wire IAM Role to the EC2 server.',
        check: (s) => hasConnected(s, 'iam', 'ec2')
      },
      {
        id: 'least_privilege',
        label: 'Configure IAM Role for s3:ReadOnly',
        hint: 'Click IAM Role and set iamRole to "s3:ReadOnly".',
        check: (s) => getComponent(s, 'iam')?.config.iamRole === 's3:ReadOnly'
      }
    ],
    initialState: {
      components: [
        { id: 'ec2-app', type: 'ec2', name: 'Web App', gridX: 0, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' },
        { id: 's3-bucket', type: 's3', name: 'Media Assets', gridX: 4, gridZ: 0, subnet: 'isolated', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'ec2-app', toId: 's3-bucket', port: 443, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 17,
    chapterId: 4,
    chapterTitle: 'Chapter 4: Security, Identity & Governance',
    title: 'KMS Envelope Encryption',
    tagline: 'Cryptographically safeguard sensitive databases at rest',
    difficulty: 'Intermediate',
    concepts: ['AWS KMS', 'Customer Managed Keys (CMK)', 'Envelope Encryption'],
    briefing: 'Regulatory compliance (HIPAA & PCI-DSS) mandates Customer Managed Keys (CMK) with automated annual rotation. Deploy AWS KMS and encrypt both RDS and S3.',
    taskDescription: '1. Place an AWS KMS Key.\n2. Wire KMS to RDS and S3.\n3. Ensure both RDS and S3 have "encrypted" set to true.',
    allowedPalette: ['kms'],
    docTips: [
      'AWS KMS uses hardware security modules (HSMs) validated under FIPS 140-2 Cryptographic Module Validation.',
      'Envelope encryption protects data with a Data Encryption Key (DEK) wrapped by a KMS master key.'
    ],
    iacSnippet: `resource "aws_kms_key" "app_key" {
  description             = "Customer Managed Key for RDS & S3"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}`,
    requirements: [
      {
        id: 'kms_exists',
        label: 'Deploy an AWS KMS Key',
        hint: 'Place KMS component on the board.',
        check: (s) => hasComponent(s, 'kms')
      },
      {
        id: 'kms_connected_rds',
        label: 'Connect KMS to RDS and S3',
        hint: 'Wire KMS to RDS, and KMS to S3.',
        check: (s) => hasConnected(s, 'kms', 'rds') && hasConnected(s, 'kms', 's3')
      },
      {
        id: 'both_encrypted',
        label: 'Enable Encrypted flag on RDS and S3',
        hint: 'Click RDS and S3 to ensure encrypted is true.',
        check: (s) => !!getComponent(s, 'rds')?.config.encrypted && !!getComponent(s, 's3')?.config.encrypted
      }
    ],
    initialState: {
      components: [
        { id: 'rds-1', type: 'rds', name: 'Fintech DB', gridX: 3, gridZ: -2, subnet: 'private', az: 'us-east-1a', config: { encrypted: false }, status: 'warning' },
        { id: 's3-1', type: 's3', name: 'Tax Documents', gridX: 3, gridZ: 2, subnet: 'isolated', az: 'global', config: { encrypted: false }, status: 'warning' }
      ],
      connections: []
    }
  },

  {
    id: 18,
    chapterId: 4,
    chapterTitle: 'Chapter 4: Security, Identity & Governance',
    title: 'AWS WAF: Shielding against DDoS & SQLi',
    tagline: 'Inspect Layer 7 HTTP requests before they reach your servers',
    difficulty: 'Intermediate',
    concepts: ['AWS WAF', 'SQL Injection Rule', 'Rate Limiting', 'DDoS Protection'],
    briefing: 'A distributed botnet is bombarding your login endpoint with SQL injection payloads (`\' OR 1=1;--`). Deploy AWS WAF (Web Application Firewall) directly in front of the Application Load Balancer to filter malicious requests.',
    taskDescription: '1. Place AWS WAF.\n2. Wire Client -> WAF -> ALB.\n3. Ensure WAF security rule is configured to block malicious traffic.',
    allowedPalette: ['waf'],
    docTips: [
      'AWS WAF integrates seamlessly with ALB, Amazon API Gateway, and CloudFront.',
      'AWS Managed Rules provide out-of-the-box protection against OWASP Top 10 vulnerabilities.'
    ],
    iacSnippet: `resource "aws_wafv2_web_acl_association" "alb_assoc" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}`,
    requirements: [
      {
        id: 'waf_placed',
        label: 'Deploy AWS WAF',
        hint: 'Place WAF component on the perimeter.',
        check: (s) => hasComponent(s, 'waf')
      },
      {
        id: 'waf_flow',
        label: 'Route traffic: Client -> WAF -> ALB',
        hint: 'Connect Client to WAF, and WAF to ALB.',
        check: (s) => hasConnected(s, 'client', 'waf') && hasConnected(s, 'waf', 'alb')
      }
    ],
    initialState: {
      components: [
        { id: 'client-bot', type: 'client', name: 'Web Visitors & Bots', gridX: -6, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 'alb-1', type: 'alb', name: 'Production ALB', gridX: 0, gridZ: 0, subnet: 'public', az: 'global', config: {}, status: 'healthy' },
        { id: 'ec2-1', type: 'ec2', name: 'Web Server', gridX: 4, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'alb-1', toId: 'ec2-1', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 19,
    chapterId: 4,
    chapterTitle: 'Chapter 4: Security, Identity & Governance',
    title: 'CloudTrail & Security Audit Guardrails',
    tagline: 'Log every single API call across your cloud estate',
    difficulty: 'Advanced',
    concepts: ['AWS CloudTrail', 'Audit Logging', 'Integrity Validation'],
    briefing: 'Enterprise governance requires immutable audit trails for every API call made by IAM users, root accounts, and automated deployment pipelines. Stream CloudTrail events to an encrypted S3 bucket with MFA delete and versioning.',
    taskDescription: '1. Connect IAM to CloudWatch telemetry.\n2. Ensure S3 Audit bucket has versioning and encryption enabled.\n3. Connect CloudWatch to S3 for log persistence.',
    allowedPalette: ['cloudwatch'],
    docTips: [
      'CloudTrail records who made what call, when, from which IP, and what parameters were passed.',
      'S3 Object Lock protects against log tampering or rogue deletion.'
    ],
    iacSnippet: `resource "aws_cloudtrail" "trail" {
  name                          = "all-events-trail"
  s3_bucket_name                = aws_s3_bucket.trail_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
}`,
    requirements: [
      {
        id: 'cw_deployed',
        label: 'Deploy CloudWatch / Audit Telemetry',
        hint: 'Place CloudWatch component.',
        check: (s) => hasComponent(s, 'cloudwatch')
      },
      {
        id: 'cw_to_s3',
        label: 'Wire CloudWatch to S3 Audit Bucket',
        hint: 'Connect CloudWatch to S3.',
        check: (s) => hasConnected(s, 'cloudwatch', 's3')
      },
      {
        id: 's3_audit_secure',
        label: 'S3 Audit bucket versioned and encrypted',
        hint: 'Click S3 and ensure both versioning and encrypted are true.',
        check: (s) => {
          const s3 = getComponent(s, 's3');
          return !!s3?.config.versioning && !!s3?.config.encrypted;
        }
      }
    ],
    initialState: {
      components: [
        { id: 'iam-core', type: 'iam', name: 'IAM Admin Role', gridX: -2, gridZ: 0, subnet: 'isolated', az: 'global', config: {}, status: 'healthy' },
        { id: 's3-audit', type: 's3', name: 'CloudTrail S3 Sink', gridX: 3, gridZ: 0, subnet: 'isolated', az: 'global', config: { versioning: true, encrypted: true }, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 20,
    chapterId: 4,
    chapterTitle: 'Chapter 4: Security, Identity & Governance',
    title: 'Zero Trust Network ACL (NACL) Rules',
    tagline: 'Stateless subnet boundary packet filtering',
    difficulty: 'Advanced',
    concepts: ['NACLs', 'Stateless Firewalls', 'Ephemeral Ports'],
    briefing: 'While Security Groups are stateful and operate at the instance level, Network Access Control Lists (NACLs) are stateless and govern traffic across the subnet border. You must enforce subnet rules permitting ephemeral return ports (1024-65535).',
    taskDescription: '1. Place WAF / Firewall shield in front of EC2.\n2. Wire Client -> WAF -> EC2 and confirm clean transmission.',
    allowedPalette: ['waf'],
    docTips: [
      'NACL rules are evaluated in numbered order; lowest number has highest priority.',
      'Because NACLs are stateless, both inbound and outbound rules must be explicitly configured.'
    ],
    iacSnippet: `resource "aws_network_acl_rule" "ephemeral_return" {
  network_acl_id = aws_network_acl.main.id
  rule_number    = 100
  egress         = true
  protocol       = "tcp"
  rule_action    = "allow"
  cidr_block     = "0.0.0.0/0"
  from_port      = 1024
  to_port        = 65535
}`,
    requirements: [
      {
        id: 'waf_installed',
        label: 'Place WAF in front of EC2',
        hint: 'Place WAF between Client and EC2.',
        check: (s) => hasComponent(s, 'waf')
      },
      {
        id: 'wired_correctly',
        label: 'Wire Client -> WAF -> EC2',
        hint: 'Connect Client to WAF, then WAF to EC2.',
        check: (s) => hasConnected(s, 'client', 'waf') && hasConnected(s, 'waf', 'ec2')
      }
    ],
    initialState: {
      components: [
        { id: 'client-1', type: 'client', name: 'Users', gridX: -5, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 'ec2-1', type: 'ec2', name: 'Protected Server', gridX: 3, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  // ==========================================
  // CHAPTER 5: SERVERLESS & EVENT-DRIVEN ARCHITECTURE (21-25)
  // ==========================================
  {
    id: 21,
    chapterId: 5,
    chapterTitle: 'Chapter 5: Serverless & Event-Driven Architecture',
    title: 'Serverless Compute with AWS Lambda',
    tagline: 'Zero idle cost, millisecond auto-scaling compute',
    difficulty: 'Novice',
    concepts: ['AWS Lambda', 'Serverless', 'Event Triggers'],
    briefing: 'Why pay for an idle EC2 server 24/7 when you only get 50 requests per hour? AWS Lambda runs code on demand with sub-second billing and automatic zero-to-thousands scaling.',
    taskDescription: '1. Deploy an AWS Lambda function.\n2. Wire Client directly to Lambda.\n3. Connect Lambda to DynamoDB database for state storage.',
    allowedPalette: ['lambda', 'dynamodb'],
    docTips: [
      'Lambda handles provisioning, patching, OS maintenance, and scaling.',
      'Execution timeout defaults to 3 seconds and caps at 15 minutes.'
    ],
    iacSnippet: `resource "aws_lambda_function" "api" {
  function_name = "ProcessOrder"
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  role          = aws_iam_role.lambda_exec.arn
}`,
    requirements: [
      {
        id: 'lambda_exists',
        label: 'Deploy an AWS Lambda function',
        hint: 'Place Lambda from the palette.',
        check: (s) => hasComponent(s, 'lambda')
      },
      {
        id: 'dynamo_exists',
        label: 'Deploy DynamoDB NoSQL Table',
        hint: 'Place DynamoDB table.',
        check: (s) => hasComponent(s, 'dynamodb')
      },
      {
        id: 'flow_connected',
        label: 'Wire Client -> Lambda -> DynamoDB',
        hint: 'Connect Client to Lambda, then Lambda to DynamoDB.',
        check: (s) => hasConnected(s, 'client', 'lambda') && hasConnected(s, 'lambda', 'dynamodb')
      }
    ],
    initialState: {
      components: [
        { id: 'client-1', type: 'client', name: 'Mobile App', gridX: -5, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 22,
    chapterId: 5,
    chapterTitle: 'Chapter 5: Serverless & Event-Driven Architecture',
    title: 'Decoupling with Amazon SQS & DLQ',
    tagline: 'Buffer sudden traffic surges and isolate poison pills',
    difficulty: 'Intermediate',
    concepts: ['Amazon SQS', 'Dead-Letter Queue (DLQ)', 'Backpressure'],
    briefing: 'When your flash sale starts, 10,000 checkout requests per second overwhelm your backend database. Decouple producers from consumers using an SQS Queue, and route repeatedly failing messages to a Dead-Letter Queue (DLQ).',
    taskDescription: '1. Place an SQS Queue between the Web Server and Lambda consumer.\n2. Wire EC2 -> SQS -> Lambda.\n3. Connect Lambda to RDS.',
    allowedPalette: ['sqs', 'lambda'],
    docTips: [
      'SQS provides standard (unlimited throughput) and FIFO (guaranteed exactly-once order) queues.',
      'Dead-Letter Queues (DLQ) isolate bad messages without halting the whole queue.'
    ],
    iacSnippet: `resource "aws_sqs_queue" "orders_queue" {
  name                      = "orders.fifo"
  fifo_queue                = true
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}`,
    requirements: [
      {
        id: 'sqs_placed',
        label: 'Deploy an SQS Message Queue',
        hint: 'Place SQS component on the grid.',
        check: (s) => hasComponent(s, 'sqs')
      },
      {
        id: 'queue_flow',
        label: 'Wire EC2 -> SQS -> Lambda',
        hint: 'Connect EC2 to SQS, then SQS to Lambda.',
        check: (s) => hasConnected(s, 'ec2', 'sqs') && hasConnected(s, 'sqs', 'lambda')
      }
    ],
    initialState: {
      components: [
        { id: 'ec2-producer', type: 'ec2', name: 'Checkout Frontend', gridX: -3, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' },
        { id: 'rds-db', type: 'rds', name: 'Orders DB', gridX: 5, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 23,
    chapterId: 5,
    chapterTitle: 'Chapter 5: Serverless & Event-Driven Architecture',
    title: 'Pub/Sub Fanout with Amazon SNS',
    tagline: 'Broadcast a single order event to multiple independent services',
    difficulty: 'Intermediate',
    concepts: ['Amazon SNS', 'Pub/Sub', 'Fanout Pattern'],
    briefing: 'When an order is placed, three separate systems need to react: Email Receipts, Inventory Adjustment, and Fraud Analysis. Instead of point-to-point spaghetti code, publish once to an SNS Topic that fans out to multiple queues or Lambdas.',
    taskDescription: '1. Place an Amazon SNS Topic.\n2. Connect EC2 Web Store to SNS.\n3. Connect SNS to two independent Lambda workers.',
    allowedPalette: ['sns', 'lambda'],
    docTips: [
      'Amazon SNS is a managed publish/subscribe messaging service.',
      'SNS can filter messages so subscribers only receive events relevant to them.'
    ],
    iacSnippet: `resource "aws_sns_topic" "order_events" {
  name = "order-placed-topic"
}

resource "aws_sns_topic_subscription" "email_sub" {
  topic_arn = aws_sns_topic.order_events.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.email_worker.arn
}`,
    requirements: [
      {
        id: 'sns_placed',
        label: 'Deploy an SNS Topic',
        hint: 'Place SNS from palette.',
        check: (s) => hasComponent(s, 'sns')
      },
      {
        id: 'sns_connected_producer',
        label: 'Connect Web App to SNS Topic',
        hint: 'Wire EC2 to SNS.',
        check: (s) => hasConnected(s, 'ec2', 'sns')
      },
      {
        id: 'sns_two_subscribers',
        label: 'Fan out SNS to at least two Lambda workers',
        hint: 'Place two Lambdas and wire SNS to each.',
        check: (s) => {
          const sns = getComponent(s, 'sns');
          if (!sns) return false;
          const subscribers = s.connections.filter(c => (c.fromId === sns.id || c.toId === sns.id) && (c.fromId.includes('lambda') || c.toId.includes('lambda')));
          return subscribers.length >= 2;
        }
      }
    ],
    initialState: {
      components: [
        { id: 'ec2-shop', type: 'ec2', name: 'Shop Checkout', gridX: -4, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 24,
    chapterId: 5,
    chapterTitle: 'Chapter 5: Serverless & Event-Driven Architecture',
    title: 'DynamoDB Single-Digit Millisecond NoSQL',
    tagline: 'Manage hyper-scale key-value data with auto-replication',
    difficulty: 'Intermediate',
    concepts: ['DynamoDB', 'Partition Keys', 'On-Demand Capacity'],
    briefing: 'Relational databases struggle to scale beyond 50,000 queries per second without complex sharding. DynamoDB provides single-digit millisecond response times at any scale with automatic horizontal partitioning.',
    taskDescription: '1. Place a DynamoDB Table.\n2. Configure DynamoDB encryption and multi-region replication.\n3. Connect Lambda API to DynamoDB.',
    allowedPalette: ['dynamodb'],
    docTips: [
      'DynamoDB On-Demand capacity charges only for read/write requests made.',
      'DynamoDB Global Tables provide multi-region active-active database replication in seconds.'
    ],
    iacSnippet: `resource "aws_dynamodb_table" "users" {
  name         = "Users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "UserId"
  attribute {
    name = "UserId"
    type = "S"
  }
}`,
    requirements: [
      {
        id: 'dynamo_exists',
        label: 'Deploy DynamoDB Table',
        hint: 'Place DynamoDB.',
        check: (s) => hasComponent(s, 'dynamodb')
      },
      {
        id: 'dynamo_encrypted',
        label: 'Enable DynamoDB KMS Encryption',
        hint: 'Click DynamoDB and set encrypted to true.',
        check: (s) => !!getComponent(s, 'dynamodb')?.config.encrypted
      },
      {
        id: 'lambda_to_dynamo',
        label: 'Wire Lambda to DynamoDB',
        hint: 'Connect Lambda to DynamoDB.',
        check: (s) => hasConnected(s, 'lambda', 'dynamodb')
      }
    ],
    initialState: {
      components: [
        { id: 'lambda-api', type: 'lambda', name: 'Fast API Handler', gridX: -1, gridZ: 0, subnet: 'public', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 25,
    chapterId: 5,
    chapterTitle: 'Chapter 5: Serverless & Event-Driven Architecture',
    title: 'Event-Driven S3 Object Processing',
    tagline: 'Auto-trigger image transcoding upon file upload',
    difficulty: 'Intermediate',
    concepts: ['S3 Event Notification', 'Lambda Trigger', 'Storage Decoupling'],
    briefing: 'When users upload profile photos to S3, an automated event must trigger a serverless Lambda function to generate thumbnails and update the database without polling.',
    taskDescription: '1. Wire S3 Bucket to Lambda Function.\n2. Wire Lambda Function to DynamoDB Table.\n3. Configure S3 bucket with CORS enabled.',
    allowedPalette: ['lambda', 'dynamodb'],
    docTips: [
      'S3 Event Notifications can trigger Lambda, SNS, SQS, or EventBridge.',
      'Event-driven architectures eliminate wasteful continuous cron polling.'
    ],
    iacSnippet: `resource "aws_s3_bucket_notification" "upload_notify" {
  bucket = aws_s3_bucket.user_uploads.id
  lambda_function {
    lambda_function_arn = aws_lambda_function.resizer.arn
    events              = ["s3:ObjectCreated:*"]
  }
}`,
    requirements: [
      {
        id: 's3_to_lambda',
        label: 'Connect S3 Event to Lambda',
        hint: 'Wire S3 to Lambda.',
        check: (s) => hasConnected(s, 's3', 'lambda')
      },
      {
        id: 'lambda_to_db',
        label: 'Connect Lambda to DynamoDB',
        hint: 'Wire Lambda to DynamoDB.',
        check: (s) => hasConnected(s, 'lambda', 'dynamodb')
      },
      {
        id: 's3_cors',
        label: 'Enable CORS on S3 Bucket',
        hint: 'Click S3 and toggle corsEnabled to true.',
        check: (s) => !!getComponent(s, 's3')?.config.corsEnabled
      }
    ],
    initialState: {
      components: [
        { id: 's3-uploads', type: 's3', name: 'User Uploads S3', gridX: -3, gridZ: 0, subnet: 'isolated', az: 'global', config: { corsEnabled: false, encrypted: true }, status: 'healthy' }
      ],
      connections: []
    }
  },

  // ==========================================
  // CHAPTER 6: GLOBAL EDGE NETWORKING & DNS (26-30)
  // ==========================================
  {
    id: 26,
    chapterId: 6,
    chapterTitle: 'Chapter 6: Global Edge Networking & DNS',
    title: 'Route 53 Hosted Zone & Apex Alias',
    tagline: 'Resolve domain names to cloud endpoints with 100% SLA',
    difficulty: 'Novice',
    concepts: ['Amazon Route 53', 'DNS A-Record', 'Alias Records'],
    briefing: 'Domain Name System (DNS) translates human-friendly names (cloudcraft.io) to IP addresses. Standard CNAME records cannot resolve the apex zone (the bare domain without www). Route 53 Alias records resolve this limitation seamlessly.',
    taskDescription: '1. Deploy Route 53 DNS Beacon.\n2. Connect Client to Route 53.\n3. Connect Route 53 to CloudFront or ALB.',
    allowedPalette: ['route53'],
    docTips: [
      'Route 53 is AWS’s highly available and scalable cloud DNS web service with 100% SLA.',
      'Route 53 Alias records recognize AWS resources and auto-update when IPs change.'
    ],
    iacSnippet: `resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "cloudcraft.io"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}`,
    requirements: [
      {
        id: 'route53_exists',
        label: 'Deploy Route 53 DNS',
        hint: 'Place Route 53 component.',
        check: (s) => hasComponent(s, 'route53')
      },
      {
        id: 'client_to_r53',
        label: 'Wire Client to Route 53',
        hint: 'Connect Client to Route 53.',
        check: (s) => hasConnected(s, 'client', 'route53')
      },
      {
        id: 'r53_to_alb',
        label: 'Wire Route 53 to ALB',
        hint: 'Connect Route 53 to ALB.',
        check: (s) => hasConnected(s, 'route53', 'alb')
      }
    ],
    initialState: {
      components: [
        { id: 'client-1', type: 'client', name: 'Global Browsers', gridX: -6, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 'alb-1', type: 'alb', name: 'App Gateway ALB', gridX: 2, gridZ: 0, subnet: 'public', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 27,
    chapterId: 6,
    chapterTitle: 'Chapter 6: Global Edge Networking & DNS',
    title: 'CloudFront CDN Edge Acceleration',
    tagline: 'Deliver content from 450+ Points of Presence worldwide',
    difficulty: 'Intermediate',
    concepts: ['Amazon CloudFront', 'Edge Caching', 'Points of Presence (PoP)'],
    briefing: 'Users in Tokyo and London complain that web pages hosted in us-east-1 take 3.5 seconds to load due to transoceanic latency. Deploy Amazon CloudFront to cache static media and API responses at edge locations worldwide.',
    taskDescription: '1. Place CloudFront CDN at the network edge.\n2. Wire Client -> Route 53 -> CloudFront -> S3 Bucket.\n3. Configure CloudFront TTL to 3600 seconds.',
    allowedPalette: ['cloudfront'],
    docTips: [
      'CloudFront terminates TLS close to the user and reuses warm connections back to origin.',
      'Saves origin egress bandwidth costs while dropping latency to sub-20ms.'
    ],
    iacSnippet: `resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-Assets"
  }
  enabled             = true
  default_root_object = "index.html"
}`,
    requirements: [
      {
        id: 'cf_placed',
        label: 'Deploy CloudFront CDN',
        hint: 'Place CloudFront component at the edge.',
        check: (s) => hasComponent(s, 'cloudfront')
      },
      {
        id: 'cf_wired',
        label: 'Wire Route 53 -> CloudFront -> S3',
        hint: 'Connect Route 53 to CloudFront, and CloudFront to S3.',
        check: (s) => hasConnected(s, 'route53', 'cloudfront') && hasConnected(s, 'cloudfront', 's3')
      },
      {
        id: 'cf_ttl',
        label: 'Configure CloudFront Cache TTL to 3600',
        hint: 'Click CloudFront and set ttlSeconds to 3600.',
        check: (s) => getComponent(s, 'cloudfront')?.config.ttlSeconds === 3600
      }
    ],
    initialState: {
      components: [
        { id: 'r53-1', type: 'route53', name: 'Route 53 DNS', gridX: -4, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 's3-assets', type: 's3', name: 'Origin S3 Bucket', gridX: 4, gridZ: 0, subnet: 'isolated', az: 'global', config: { encrypted: true }, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 28,
    chapterId: 6,
    chapterTitle: 'Chapter 6: Global Edge Networking & DNS',
    title: 'CloudFront Origin Access Control (OAC)',
    tagline: 'Block all direct internet access to your S3 storage origin',
    difficulty: 'Advanced',
    concepts: ['Origin Access Control (OAC)', 'S3 Bucket Policy', 'Signed Requests'],
    briefing: 'Clever users found your underlying S3 bucket URL (`assets.s3.amazonaws.com`) and are downloading files directly, bypassing CloudFront WAF and caching! Enable Origin Access Control (OAC) so only signed CloudFront requests can read S3.',
    taskDescription: '1. Click S3 Bucket -> Turn on "Block Public Access".\n2. Click CloudFront -> Enable "Origin Access Control (OAC)".\n3. Connect CloudFront to S3.',
    allowedPalette: [],
    docTips: [
      'Origin Access Control (OAC) replaces older Origin Access Identity (OAI) with SigV4 support.',
      'Enables server-side encryption with AWS KMS (SSE-KMS) through CloudFront.'
    ],
    iacSnippet: `resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "s3-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}`,
    requirements: [
      {
        id: 'oac_enabled',
        label: 'Enable Origin Access Control (OAC) on CloudFront',
        hint: 'Click CloudFront and toggle originAccessControl to true.',
        check: (s) => !!getComponent(s, 'cloudfront')?.config.originAccessControl
      },
      {
        id: 's3_blocked',
        label: 'Block Direct Public Access on S3',
        hint: 'Click S3 and toggle blockPublicAccess to true.',
        check: (s) => !!getComponent(s, 's3')?.config.blockPublicAccess
      }
    ],
    initialState: {
      components: [
        { id: 'cf-dist', type: 'cloudfront', name: 'Global CDN', gridX: -1, gridZ: 0, subnet: 'edge', az: 'global', config: { originAccessControl: false }, status: 'warning' },
        { id: 's3-origin', type: 's3', name: 'Secret Documents S3', gridX: 3, gridZ: 0, subnet: 'isolated', az: 'global', config: { blockPublicAccess: false }, status: 'error' }
      ],
      connections: [
        { id: 'c1', fromId: 'cf-dist', toId: 's3-origin', port: 443, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 29,
    chapterId: 6,
    chapterTitle: 'Chapter 6: Global Edge Networking & DNS',
    title: 'Route 53 Latency-Based Routing',
    tagline: 'Direct users to the fastest cloud region automatically',
    difficulty: 'Advanced',
    concepts: ['Latency Routing', 'Multi-Region', 'Route 53 Policy'],
    briefing: 'You run instances in US (us-east-1) and Europe (eu-central-1). With Route 53 Latency-Based Routing, DNS automatically responds with the IP address of the data center that yields lowest latency for each querying client.',
    taskDescription: '1. Click Route 53 -> Set routingPolicy to "latency".\n2. Deploy a secondary EC2 node.\n3. Wire Route 53 to both compute endpoints.',
    allowedPalette: ['ec2'],
    docTips: [
      'Latency routing is based on latency measurements performed by AWS over time.',
      'Combine latency routing with health checks to avoid routing traffic to degraded regions.'
    ],
    iacSnippet: `resource "aws_route53_record" "us" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "app.cloudcraft.io"
  type           = "A"
  set_identifier = "us-cluster"
  latency_routing_policy {
    region = "us-east-1"
  }
}`,
    requirements: [
      {
        id: 'r53_latency',
        label: 'Configure Route 53 Routing Policy to "latency"',
        hint: 'Click Route 53 and change routingPolicy to latency.',
        check: (s) => getComponent(s, 'route53')?.config.routingPolicy === 'latency'
      },
      {
        id: 'two_endpoints',
        label: 'Route 53 connected to at least 2 endpoints',
        hint: 'Connect Route 53 to both EC2 nodes.',
        check: (s) => {
          const r53 = getComponent(s, 'route53');
          if (!r53) return false;
          const conns = s.connections.filter(c => c.fromId === r53.id || c.toId === r53.id);
          return conns.length >= 2;
        }
      }
    ],
    initialState: {
      components: [
        { id: 'r53-global', type: 'route53', name: 'Route 53 Router', gridX: -3, gridZ: 0, subnet: 'external', az: 'global', config: { routingPolicy: 'simple' }, status: 'healthy' },
        { id: 'ec2-us', type: 'ec2', name: 'US Node (us-east-1a)', gridX: 2, gridZ: -2, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'r53-global', toId: 'ec2-us', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 30,
    chapterId: 6,
    chapterTitle: 'Chapter 6: Global Edge Networking & DNS',
    title: 'Disaster Recovery Active-Passive Failover',
    tagline: 'Seamlessly shift traffic to static backup when primary fails',
    difficulty: 'Advanced',
    concepts: ['DNS Failover', 'Health Checks', 'Disaster Recovery'],
    briefing: 'If your primary dynamic application fleet experiences a catastrophic outage, Route 53 health checks must detect the 5xx failure and automatically fail over DNS queries to an S3 static maintenance site.',
    taskDescription: '1. Place S3 Backup Maintenance Bucket.\n2. Connect Route 53 to both primary ALB and S3 Backup.\n3. Set Route 53 policy to "failover".',
    allowedPalette: ['s3'],
    docTips: [
      'Active-Passive failover provides business continuity during critical incidents.',
      'S3 website hosting serves lightweight apologetic status pages with near-zero running cost.'
    ],
    iacSnippet: `resource "aws_route53_record" "primary" {
  zone_id         = aws_route53_zone.main.zone_id
  name            = "app.cloudcraft.io"
  type            = "A"
  failover_routing_policy {
    type = "PRIMARY"
  }
}`,
    requirements: [
      {
        id: 's3_backup_placed',
        label: 'Deploy S3 Backup / Maintenance site',
        hint: 'Place S3 component.',
        check: (s) => hasComponent(s, 's3')
      },
      {
        id: 'r53_failover_policy',
        label: 'Configure Route 53 to "failover" policy',
        hint: 'Click Route 53 and set routingPolicy to failover.',
        check: (s) => getComponent(s, 'route53')?.config.routingPolicy === 'failover'
      },
      {
        id: 'connected_both',
        label: 'Connect Route 53 to both ALB and S3',
        hint: 'Wire Route 53 to ALB and S3.',
        check: (s) => hasConnected(s, 'route53', 'alb') && hasConnected(s, 'route53', 's3')
      }
    ],
    initialState: {
      components: [
        { id: 'r53-dr', type: 'route53', name: 'Route 53 DNS', gridX: -3, gridZ: 0, subnet: 'external', az: 'global', config: { routingPolicy: 'simple' }, status: 'healthy' },
        { id: 'alb-primary', type: 'alb', name: 'Primary ALB Fleet', gridX: 2, gridZ: -2, subnet: 'public', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'r53-dr', toId: 'alb-primary', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  // ==========================================
  // CHAPTER 7: CI/CD PIPELINES & DEVOPS AUTOMATION (31-35)
  // ==========================================
  {
    id: 31,
    chapterId: 7,
    chapterTitle: 'Chapter 7: CI/CD & DevOps Automation',
    title: 'Automated CI/CD Pipeline Build Stage',
    tagline: 'From git push to tested container artifact in minutes',
    difficulty: 'Novice',
    concepts: ['AWS CodePipeline', 'CodeBuild', 'Artifact Store'],
    briefing: 'Manual FTP deployments cause midnight outages. A modern DevOps team uses AWS CodePipeline: a webhook captures git commits, AWS CodeBuild executes unit tests and bakes container images, and stores artifacts in S3.',
    taskDescription: '1. Place an S3 Bucket for deployment artifacts.\n2. Connect IAM Deployment Role to EC2 and S3.\n3. Configure S3 with versioning enabled for rollback.',
    allowedPalette: ['iam', 's3'],
    docTips: [
      'AWS CodePipeline automates your release pipelines for fast and reliable updates.',
      'S3 artifact buckets must have versioning enabled so previous builds can be re-deployed.'
    ],
    iacSnippet: `resource "aws_codepipeline" "pipeline" {
  name     = "app-pipeline"
  role_arn = aws_iam_role.pipeline.arn
  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }
}`,
    requirements: [
      {
        id: 's3_artifacts',
        label: 'Deploy S3 Artifact Store with Versioning',
        hint: 'Place S3 and toggle versioning to true.',
        check: (s) => {
          const s3 = getComponent(s, 's3');
          return !!s3 && !!s3.config.versioning;
        }
      },
      {
        id: 'iam_ci_role',
        label: 'Attach IAM Pipeline Role to EC2',
        hint: 'Place IAM Role and wire to EC2.',
        check: (s) => hasComponent(s, 'iam') && hasConnected(s, 'iam', 'ec2')
      }
    ],
    initialState: {
      components: [
        { id: 'ec2-prod', type: 'ec2', name: 'Production Fleet', gridX: 2, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 32,
    chapterId: 7,
    chapterTitle: 'Chapter 7: CI/CD & DevOps Automation',
    title: 'Blue/Green Zero-Downtime Deployments',
    tagline: 'Shift traffic between twin production fleets without dropping packets',
    difficulty: 'Intermediate',
    concepts: ['Blue/Green Deployment', 'Canary Releases', 'AWS CodeDeploy'],
    briefing: 'Updating code in place risks downtime if the app fails to boot. In Blue/Green deployments, a green fleet is provisioned alongside the running blue fleet. The load balancer gradually shifts traffic over once health checks pass.',
    taskDescription: '1. Deploy Blue EC2 and Green EC2.\n2. Wire ALB to both Blue and Green fleets.\n3. Enable Target Group Health Check on ALB.',
    allowedPalette: ['ec2'],
    docTips: [
      'Blue/Green enables instant rollback by switching the load balancer back to Blue.',
      'Canary deployments route 10% for 5 minutes before full 100% rollout.'
    ],
    iacSnippet: `resource "aws_codedeploy_deployment_group" "bg" {
  app_name              = "web-app"
  deployment_group_name = "bluegreen-group"
  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }
}`,
    requirements: [
      {
        id: 'two_fleets',
        label: 'Deploy Blue and Green EC2 nodes',
        hint: 'Ensure at least 2 EC2 instances are deployed.',
        check: (s) => hasComponent(s, 'ec2', 2)
      },
      {
        id: 'alb_health_checked',
        label: 'Enable Health Check on ALB',
        hint: 'Click ALB and check targetGroupHealthCheck.',
        check: (s) => !!getComponent(s, 'alb')?.config.targetGroupHealthCheck
      },
      {
        id: 'alb_connected_both',
        label: 'ALB connected to both fleets',
        hint: 'Connect ALB to both EC2 instances.',
        check: (s) => {
          const alb = getComponent(s, 'alb');
          if (!alb) return false;
          const ec2s = s.connections.filter(c => (c.fromId === alb.id || c.toId === alb.id) && (c.fromId.includes('ec2') || c.toId.includes('ec2')));
          return ec2s.length >= 2;
        }
      }
    ],
    initialState: {
      components: [
        { id: 'alb-1', type: 'alb', name: 'Traffic Router ALB', gridX: -2, gridZ: 0, subnet: 'public', az: 'global', config: { targetGroupHealthCheck: false }, status: 'healthy' },
        { id: 'ec2-blue', type: 'ec2', name: 'Blue Fleet (Live)', gridX: 2, gridZ: -2, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'alb-1', toId: 'ec2-blue', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 33,
    chapterId: 7,
    chapterTitle: 'Chapter 7: CI/CD & DevOps Automation',
    title: 'Terraform State & S3 Locking',
    tagline: 'Manage Infrastructure as Code safely with DynamoDB locks',
    difficulty: 'Intermediate',
    concepts: ['Terraform Backend', 'State File', 'DynamoDB State Locking'],
    briefing: 'When multiple DevOps engineers run `terraform apply` concurrently, state corruption occurs unless state locking is active. Store your `terraform.tfstate` in an encrypted S3 bucket locked with a DynamoDB table.',
    taskDescription: '1. Place DynamoDB State Lock Table.\n2. Connect S3 Terraform Backend to DynamoDB.\n3. Ensure S3 bucket is encrypted and versioned.',
    allowedPalette: ['dynamodb'],
    docTips: [
      'Terraform remote backends provide shared access and team collaboration.',
      'DynamoDB `LockID` string prevents two team members from running applies at the same time.'
    ],
    iacSnippet: `terraform {
  backend "s3" {
    bucket         = "tf-state-prod"
    key            = "global/s3/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}`,
    requirements: [
      {
        id: 'dynamo_lock',
        label: 'Deploy DynamoDB Lock Table',
        hint: 'Place DynamoDB component.',
        check: (s) => hasComponent(s, 'dynamodb')
      },
      {
        id: 's3_to_dynamo',
        label: 'Connect S3 State Bucket to DynamoDB',
        hint: 'Wire S3 to DynamoDB.',
        check: (s) => hasConnected(s, 's3', 'dynamodb')
      },
      {
        id: 's3_state_secured',
        label: 'S3 state bucket versioned and encrypted',
        hint: 'Click S3 and ensure versioning & encrypted are true.',
        check: (s) => {
          const s3 = getComponent(s, 's3');
          return !!s3?.config.versioning && !!s3?.config.encrypted;
        }
      }
    ],
    initialState: {
      components: [
        { id: 's3-state', type: 's3', name: 'Terraform State S3', gridX: -2, gridZ: 0, subnet: 'isolated', az: 'global', config: { versioning: false, encrypted: false }, status: 'warning' }
      ],
      connections: []
    }
  },

  {
    id: 34,
    chapterId: 7,
    chapterTitle: 'Chapter 7: CI/CD & DevOps Automation',
    title: 'Automated Canary Rollback on Alarm',
    tagline: 'Automatically abort bad releases before users notice',
    difficulty: 'Advanced',
    concepts: ['Canary Analysis', 'CloudWatch Alarms', 'Automated Rollback'],
    briefing: 'Version 2.4 was just pushed to 10% of users, but HTTP 500 errors spiked above 2%! An intelligent CI/CD pipeline triggers an automated CloudWatch metric alarm that tells CodeDeploy to immediately revert traffic to the stable v2.3 release.',
    taskDescription: '1. Place CloudWatch Monitoring.\n2. Configure Alarm Threshold to 2% error rate.\n3. Connect CloudWatch to ALB to monitor HTTP error codes.',
    allowedPalette: ['cloudwatch'],
    docTips: [
      'Automated rollback prevents prolonged outages during unattended deployments.',
      'Monitor error rate, P99 latency, and CPU metrics during canary windows.'
    ],
    iacSnippet: `resource "aws_cloudwatch_metric_alarm" "canary_5xx" {
  alarm_name          = "canary-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  threshold           = 2
}`,
    requirements: [
      {
        id: 'cw_alarm_placed',
        label: 'Deploy CloudWatch Monitoring',
        hint: 'Place CloudWatch component.',
        check: (s) => hasComponent(s, 'cloudwatch')
      },
      {
        id: 'cw_alarm_configured',
        label: 'Set CloudWatch Alarm Threshold to 2',
        hint: 'Click CloudWatch and set alarmThreshold to 2.',
        check: (s) => getComponent(s, 'cloudwatch')?.config.alarmThreshold === 2
      },
      {
        id: 'cw_to_alb',
        label: 'Connect CloudWatch to ALB',
        hint: 'Wire CloudWatch to ALB.',
        check: (s) => hasConnected(s, 'cloudwatch', 'alb')
      }
    ],
    initialState: {
      components: [
        { id: 'alb-canary', type: 'alb', name: 'Canary ALB', gridX: -2, gridZ: 0, subnet: 'public', az: 'global', config: {}, status: 'healthy' },
        { id: 'ec2-green', type: 'ec2', name: 'Canary v2.4 (Failing)', gridX: 3, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'error' }
      ],
      connections: [
        { id: 'c1', fromId: 'alb-canary', toId: 'ec2-green', port: 80, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 35,
    chapterId: 7,
    chapterTitle: 'Chapter 7: CI/CD & DevOps Automation',
    title: 'Immutable Infrastructure & Golden AMIs',
    tagline: 'Bake dependencies ahead of time for instant spin-up',
    difficulty: 'Advanced',
    concepts: ['Immutable Infrastructure', 'Packer', 'Golden AMI'],
    briefing: 'Bootstrapping instances with 15-minute `user_data` shell scripts makes autoscaling too slow during traffic spikes. Instead, pre-bake a hardened Golden Amazon Machine Image (AMI) with all dependencies pre-installed.',
    taskDescription: '1. Place ASG with pre-configured AMI template.\n2. Set ASG Min Capacity to 3.\n3. Connect ASG to ALB.',
    allowedPalette: ['asg'],
    docTips: [
      'Immutable servers are never patched in place: to upgrade, deploy fresh instances and destroy old ones.',
      'Reduces instance boot time from 10 minutes to under 45 seconds.'
    ],
    iacSnippet: `resource "aws_launch_template" "golden" {
  name_prefix   = "golden-ami-template"
  image_id      = "ami-0123456789golden"
  instance_type = "c6g.xlarge"
}`,
    requirements: [
      {
        id: 'asg_golden',
        label: 'Deploy ASG with Min Capacity >= 3',
        hint: 'Place ASG and set minCapacity to 3.',
        check: (s) => {
          const asg = getComponent(s, 'asg');
          return !!asg && (asg.config.minCapacity || 0) >= 3;
        }
      },
      {
        id: 'asg_alb_link',
        label: 'Connect ALB to ASG',
        hint: 'Wire ALB to ASG.',
        check: (s) => hasConnected(s, 'alb', 'asg')
      }
    ],
    initialState: {
      components: [
        { id: 'alb-1', type: 'alb', name: 'Production ALB', gridX: -2, gridZ: 0, subnet: 'public', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  // ==========================================
  // CHAPTER 8: CONTAINERS & KUBERNETES (ECS / EKS) (36-40)
  // ==========================================
  {
    id: 36,
    chapterId: 8,
    chapterTitle: 'Chapter 8: Containers & Kubernetes (ECS/EKS)',
    title: 'Amazon Elastic Kubernetes Service (EKS)',
    tagline: 'Orchestrate microservices with enterprise Kubernetes',
    difficulty: 'Intermediate',
    concepts: ['Amazon EKS', 'Kubernetes Pods', 'Control Plane'],
    briefing: 'Your engineering organization is adopting Kubernetes for container orchestration. Amazon EKS provides a certified conformant Kubernetes control plane managed across multiple availability zones.',
    taskDescription: '1. Place an Amazon EKS Cluster component.\n2. Connect ALB to EKS Cluster.\n3. Connect EKS to private RDS database.',
    allowedPalette: ['eks'],
    docTips: [
      'EKS manages master nodes, etcd, and control plane scaling behind the scenes.',
      'AWS VPC CNI gives every Kubernetes pod its own real VPC IP address.'
    ],
    iacSnippet: `resource "aws_eks_cluster" "prod" {
  name     = "cloudcraft-eks"
  role_arn = aws_iam_role.eks_master.arn
  vpc_config {
    subnet_ids = [aws_subnet.pri_a.id, aws_subnet.pri_b.id]
  }
}`,
    requirements: [
      {
        id: 'eks_placed',
        label: 'Deploy Amazon EKS Cluster',
        hint: 'Place EKS component on the canvas.',
        check: (s) => hasComponent(s, 'eks')
      },
      {
        id: 'alb_to_eks',
        label: 'Connect ALB to EKS Cluster',
        hint: 'Wire ALB to EKS.',
        check: (s) => hasConnected(s, 'alb', 'eks')
      },
      {
        id: 'eks_to_db',
        label: 'Connect EKS to RDS Database',
        hint: 'Wire EKS to RDS.',
        check: (s) => hasConnected(s, 'eks', 'rds')
      }
    ],
    initialState: {
      components: [
        { id: 'alb-ingress', type: 'alb', name: 'Kubernetes Ingress (ALB)', gridX: -3, gridZ: 0, subnet: 'public', az: 'global', config: {}, status: 'healthy' },
        { id: 'rds-backend', type: 'rds', name: 'Backend DB', gridX: 4, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 37,
    chapterId: 8,
    chapterTitle: 'Chapter 8: Containers & Kubernetes (ECS/EKS)',
    title: 'Serverless Containers with AWS Fargate',
    tagline: 'Run containers without managing or patching underlying EC2 VMs',
    difficulty: 'Intermediate',
    concepts: ['AWS Fargate', 'Serverless Containers', 'Resource Allocation'],
    briefing: 'Managing EC2 worker nodes (patching OS, sizing AMIs, cluster scaling) wastes hours every sprint. AWS Fargate runs containers serverless: you specify CPU and memory at the task level, and AWS provisions the compute on the fly.',
    taskDescription: '1. Deploy EKS / Fargate Cluster.\n2. Attach IAM Task Execution Role.\n3. Wire ALB directly to Fargate tasks.',
    allowedPalette: ['eks', 'iam'],
    docTips: [
      'Fargate isolates each task in its own dedicated virtual machine boundary.',
      'No need to pre-allocate cluster capacity or maintain EC2 node groups.'
    ],
    iacSnippet: `resource "aws_eks_fargate_profile" "app" {
  cluster_name           = aws_eks_cluster.prod.name
  fargate_profile_name   = "microservices"
  pod_execution_role_arn = aws_iam_role.fargate_pod.arn
  subnet_ids             = [aws_subnet.pri_a.id]
}`,
    requirements: [
      {
        id: 'eks_fargate_cluster',
        label: 'Deploy EKS / Container Cluster',
        hint: 'Place EKS component.',
        check: (s) => hasComponent(s, 'eks')
      },
      {
        id: 'iam_attached',
        label: 'Attach IAM Role to Container Cluster',
        hint: 'Place IAM and connect to EKS.',
        check: (s) => hasComponent(s, 'iam') && hasConnected(s, 'iam', 'eks')
      }
    ],
    initialState: {
      components: [
        { id: 'alb-1', type: 'alb', name: 'ALB Ingress', gridX: -3, gridZ: 0, subnet: 'public', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 38,
    chapterId: 8,
    chapterTitle: 'Chapter 8: Containers & Kubernetes (ECS/EKS)',
    title: 'Container Image Security with Amazon ECR',
    tagline: 'Scan Docker images for CVE vulnerabilities upon push',
    difficulty: 'Intermediate',
    concepts: ['Amazon ECR', 'Vulnerability Scanning', 'Image Immutability'],
    briefing: 'Outdated base images carry known CVE vulnerabilities. Amazon Elastic Container Registry (ECR) stores Docker images, scans them against the CVE database on push, and enforces tag immutability so production tags cannot be overwritten.',
    taskDescription: '1. Place S3 / ECR Storage component.\n2. Enable "Encrypted" with KMS.\n3. Connect EKS to the container registry.',
    allowedPalette: ['s3', 'kms'],
    docTips: [
      'ECR Enhanced Scanning powered by Amazon Inspector detects operating system and application package vulnerabilities.',
      'Tag immutability prevents dangerous accidental tag overwrites in production.'
    ],
    iacSnippet: `resource "aws_ecr_repository" "repo" {
  name                 = "cloudcraft/core-api"
  image_tag_mutability = "IMMUTABLE"
  image_scanning_configuration {
    scan_on_push = true
  }
}`,
    requirements: [
      {
        id: 'registry_deployed',
        label: 'Deploy Container Registry Storage (S3/ECR)',
        hint: 'Place S3 component as container registry.',
        check: (s) => hasComponent(s, 's3')
      },
      {
        id: 'registry_connected',
        label: 'Connect EKS Cluster to Registry',
        hint: 'Wire EKS to S3/ECR.',
        check: (s) => hasConnected(s, 'eks', 's3')
      }
    ],
    initialState: {
      components: [
        { id: 'eks-prod', type: 'eks', name: 'Production EKS', gridX: 2, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 39,
    chapterId: 8,
    chapterTitle: 'Chapter 8: Containers & Kubernetes (ECS/EKS)',
    title: 'Kubernetes Pod Horizontal Autoscaling (HPA)',
    tagline: 'Scale replica sets based on real-time request metrics',
    difficulty: 'Advanced',
    concepts: ['HPA', 'Metrics Server', 'Replica Sets'],
    briefing: 'When incoming traffic surges, Kubernetes Horizontal Pod Autoscaler (HPA) queries the Metrics Server and dynamically increases the number of pod replicas to keep response latency low.',
    taskDescription: '1. Connect CloudWatch to EKS Cluster.\n2. Configure CloudWatch alarm threshold to 80% CPU.\n3. Connect EKS to DynamoDB backend.',
    allowedPalette: ['cloudwatch', 'dynamodb'],
    docTips: [
      'HPA scales pods up rapidly and scales down smoothly with stabilization windows.',
      'Combine HPA with Karpenter or Cluster Autoscaler to also scale EC2 nodes dynamically.'
    ],
    iacSnippet: `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80`,
    requirements: [
      {
        id: 'cw_to_eks',
        label: 'Connect CloudWatch to EKS',
        hint: 'Wire CloudWatch to EKS.',
        check: (s) => hasConnected(s, 'cloudwatch', 'eks')
      },
      {
        id: 'eks_to_dynamo',
        label: 'Connect EKS to DynamoDB',
        hint: 'Wire EKS to DynamoDB.',
        check: (s) => hasConnected(s, 'eks', 'dynamodb')
      }
    ],
    initialState: {
      components: [
        { id: 'eks-cluster', type: 'eks', name: 'EKS App Fleet', gridX: 0, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 40,
    chapterId: 8,
    chapterTitle: 'Chapter 8: Containers & Kubernetes (ECS/EKS)',
    title: 'Service Mesh & Mutual TLS (mTLS)',
    tagline: 'Zero-trust cryptographic identity between internal microservices',
    difficulty: 'Advanced',
    concepts: ['AWS App Mesh', 'Envoy Proxy', 'mTLS', 'Traffic Splitting'],
    briefing: 'Inside your Kubernetes cluster, plaintext HTTP communication between microservices is vulnerable to lateral network attacks. Implement a Service Mesh with Envoy sidecar proxies to enforce mutual TLS (mTLS) authentication and encryption.',
    taskDescription: '1. Place KMS Encryption Provider.\n2. Wire KMS to EKS Cluster.\n3. Connect EKS to private RDS with SSL encrypted transmission.',
    allowedPalette: ['kms'],
    docTips: [
      'Service meshes handle traffic management, observability, and security at the application layer.',
      'mTLS guarantees that only verified services can invoke downstream APIs.'
    ],
    iacSnippet: `resource "aws_appmesh_mesh" "prod" {
  name = "production-mesh"
  spec {
    egress_filter {
      type = "DROP_ALL"
    }
  }
}`,
    requirements: [
      {
        id: 'kms_mesh',
        label: 'Deploy KMS Cryptographic Key',
        hint: 'Place KMS component.',
        check: (s) => hasComponent(s, 'kms')
      },
      {
        id: 'kms_to_eks',
        label: 'Wire KMS Key to EKS Cluster',
        hint: 'Connect KMS to EKS.',
        check: (s) => hasConnected(s, 'kms', 'eks')
      }
    ],
    initialState: {
      components: [
        { id: 'eks-mesh', type: 'eks', name: 'Service Mesh Pods', gridX: 0, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: {}, status: 'healthy' },
        { id: 'rds-core', type: 'rds', name: 'Secure Vault DB', gridX: 4, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: { encrypted: true }, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'eks-mesh', toId: 'rds-core', port: 5432, protocol: 'tcp', allowed: true }
      ]
    }
  },

  // ==========================================
  // CHAPTER 9: OBSERVABILITY, SRE & COST OPTIMIZATION (41-45)
  // ==========================================
  {
    id: 41,
    chapterId: 9,
    chapterTitle: 'Chapter 9: Observability, SRE & Cost Optimization',
    title: 'CloudWatch Composite Alarms & SNS Pagers',
    tagline: 'Alert engineers only when real customer impact occurs',
    difficulty: 'Intermediate',
    concepts: ['CloudWatch Alarms', 'Composite Alarms', 'SNS Alerting'],
    briefing: 'Alert fatigue burns out on-call engineers. Single metric spikes (e.g. CPU > 90%) trigger false alarms. Build a CloudWatch Composite Alarm that pages on-call SREs ONLY when both CPU is high AND 5xx error rates spike simultaneously.',
    taskDescription: '1. Connect CloudWatch to SNS Alert Topic.\n2. Configure CloudWatch Alarm Threshold to 90%.\n3. Wire ALB to CloudWatch.',
    allowedPalette: ['sns'],
    docTips: [
      'Composite alarms use boolean logic (ALARM("HighCPU") AND ALARM("High5xx")) to reduce noise.',
      'SNS delivers SMS, Slack webhooks, and PagerDuty incidents within seconds.'
    ],
    iacSnippet: `resource "aws_cloudwatch_composite_alarm" "p1_incident" {
  alarm_name        = "P1-Customer-Impact"
  alarm_rule        = "ALARM(HighCPU) AND ALARM(HighErrorRate)"
  alarm_actions     = [aws_sns_topic.pagerduty.arn]
}`,
    requirements: [
      {
        id: 'sns_pager',
        label: 'Deploy SNS Pager Topic',
        hint: 'Place SNS component.',
        check: (s) => hasComponent(s, 'sns')
      },
      {
        id: 'cw_to_sns',
        label: 'Connect CloudWatch to SNS Topic',
        hint: 'Wire CloudWatch to SNS.',
        check: (s) => hasConnected(s, 'cloudwatch', 'sns')
      },
      {
        id: 'cw_threshold',
        label: 'Set CloudWatch Alarm Threshold to 90',
        hint: 'Click CloudWatch and set alarmThreshold to 90.',
        check: (s) => getComponent(s, 'cloudwatch')?.config.alarmThreshold === 90
      }
    ],
    initialState: {
      components: [
        { id: 'cw-metrics', type: 'cloudwatch', name: 'CloudWatch Telemetry', gridX: -2, gridZ: 0, subnet: 'isolated', az: 'global', config: { alarmThreshold: 50 }, status: 'healthy' },
        { id: 'alb-prod', type: 'alb', name: 'Production ALB', gridX: 2, gridZ: 0, subnet: 'public', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'alb-prod', toId: 'cw-metrics', port: 443, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 42,
    chapterId: 9,
    chapterTitle: 'Chapter 9: Observability, SRE & Cost Optimization',
    title: 'Distributed Tracing with AWS X-Ray',
    tagline: 'Track request journeys across microservices and spot bottlenecks',
    difficulty: 'Intermediate',
    concepts: ['AWS X-Ray', 'Distributed Tracing', 'Service Map'],
    briefing: 'A user complains checkout took 4.2 seconds, but every microservice team claims their component is fast. AWS X-Ray propagates trace IDs through every hop, generating a dynamic service map pinpointing the exact slow query.',
    taskDescription: '1. Connect Client -> Lambda -> DynamoDB.\n2. Connect CloudWatch / X-Ray to Lambda to record execution traces.\n3. Verify all segments report telemetry.',
    allowedPalette: ['cloudwatch'],
    docTips: [
      'X-Ray records call trees, exceptions, subsegments, and database latency.',
      'Sampling rules ensure you capture 100% of errors while controlling tracing costs.'
    ],
    iacSnippet: `resource "aws_xray_sampling_rule" "api_rule" {
  rule_name      = "API-Sampling"
  priority       = 1000
  reservoir_size = 1
  fixed_rate     = 0.05
  url_path       = "/checkout/*"
}`,
    requirements: [
      {
        id: 'cw_xray',
        label: 'Deploy CloudWatch / X-Ray Observer',
        hint: 'Place CloudWatch component.',
        check: (s) => hasComponent(s, 'cloudwatch')
      },
      {
        id: 'trace_connected',
        label: 'Connect CloudWatch to Lambda',
        hint: 'Wire CloudWatch to Lambda.',
        check: (s) => hasConnected(s, 'cloudwatch', 'lambda')
      }
    ],
    initialState: {
      components: [
        { id: 'client-1', type: 'client', name: 'User Browser', gridX: -5, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 'lambda-checkout', type: 'lambda', name: 'Checkout Lambda', gridX: -1, gridZ: 0, subnet: 'public', az: 'global', config: {}, status: 'healthy' },
        { id: 'dynamo-orders', type: 'dynamodb', name: 'Orders Table', gridX: 3, gridZ: 0, subnet: 'isolated', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'lambda-checkout', port: 443, protocol: 'tcp', allowed: true },
        { id: 'c2', fromId: 'lambda-checkout', toId: 'dynamo-orders', port: 443, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 43,
    chapterId: 9,
    chapterTitle: 'Chapter 9: Observability, SRE & Cost Optimization',
    title: 'VPC Flow Logs & Security Forensics',
    tagline: 'Capture and inspect every IP packet entering and leaving the VPC',
    difficulty: 'Advanced',
    concepts: ['VPC Flow Logs', 'Security Forensics', 'S3 Storage'],
    briefing: 'During a suspected data exfiltration incident, security auditors need an immutable record of all accepted and rejected network connections. Enable VPC Flow Logs streaming directly to an encrypted S3 forensic bucket.',
    taskDescription: '1. Connect CloudWatch to S3 Forensic Bucket.\n2. Ensure S3 bucket is encrypted and versioned.\n3. Connect EC2 to CloudWatch for flow logging.',
    allowedPalette: ['cloudwatch'],
    docTips: [
      'VPC Flow Logs capture source/dest IP, port, protocol, packets, bytes, and action (ACCEPT/REJECT).',
      'Analyze flow logs with Amazon Athena using standard SQL queries.'
    ],
    iacSnippet: `resource "aws_flow_log" "vpc_traffic" {
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_destination_type = "s3"
  traffic_type         = "ALL"
  vpc_id               = aws_vpc.main.id
}`,
    requirements: [
      {
        id: 'cw_flow_deployed',
        label: 'Deploy CloudWatch Flow Logger',
        hint: 'Place CloudWatch component.',
        check: (s) => hasComponent(s, 'cloudwatch')
      },
      {
        id: 'flow_to_s3',
        label: 'Connect Flow Logger to S3 Forensic Bucket',
        hint: 'Wire CloudWatch to S3.',
        check: (s) => hasConnected(s, 'cloudwatch', 's3')
      }
    ],
    initialState: {
      components: [
        { id: 'ec2-target', type: 'ec2', name: 'Production Node', gridX: -2, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' },
        { id: 's3-forensics', type: 's3', name: 'Forensic Evidence S3', gridX: 3, gridZ: 0, subnet: 'isolated', az: 'global', config: { versioning: true, encrypted: true }, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 44,
    chapterId: 9,
    chapterTitle: 'Chapter 9: Observability, SRE & Cost Optimization',
    title: 'AWS Graviton & Spot Instances for 70% Cost Cuts',
    tagline: 'Switch to ARM64 architecture and spare capacity',
    difficulty: 'Intermediate',
    concepts: ['AWS Graviton3', 'Spot Instances', 'Cost Optimization'],
    briefing: 'The CFO is shocked by an $80,000 monthly cloud bill. You can slash compute expenditure by up to 70% by transitioning stateless batch workers from on-demand x86 instances to ARM-based Graviton3 Spot Instances.',
    taskDescription: '1. Click EC2 Instance.\n2. Upgrade instanceType to "c7g.large" (AWS Graviton3).\n3. Wire EC2 to SQS queue to process asynchronous jobs.',
    allowedPalette: ['sqs'],
    docTips: [
      'AWS Graviton3 processors deliver up to 25% better compute performance than x86.',
      'Spot Instances use spare EC2 capacity at up to 90% discount compared to On-Demand pricing.'
    ],
    iacSnippet: `resource "aws_spot_instance_request" "worker" {
  ami           = "ami-arm64-al2023"
  instance_type = "c7g.large"
  spot_type     = "one-time"
}`,
    requirements: [
      {
        id: 'graviton_type',
        label: 'Set EC2 instanceType to "c7g.large"',
        hint: 'Click EC2 and change instanceType to c7g.large.',
        check: (s) => getComponent(s, 'ec2')?.config.instanceType === 'c7g.large'
      },
      {
        id: 'sqs_worker_link',
        label: 'Connect EC2 Worker to SQS Queue',
        hint: 'Wire EC2 to SQS.',
        check: (s) => hasConnected(s, 'ec2', 'sqs')
      }
    ],
    initialState: {
      components: [
        { id: 'ec2-expensive', type: 'ec2', name: 'Legacy x86 Instance', gridX: 0, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: { instanceType: 'm5.large' }, status: 'warning' }
      ],
      connections: []
    }
  },

  {
    id: 45,
    chapterId: 9,
    chapterTitle: 'Chapter 9: Observability, SRE & Cost Optimization',
    title: 'FinOps: S3 Intelligent-Tiering & Cost Anomaly Detection',
    tagline: 'Machine learning automatic cost optimization',
    difficulty: 'Advanced',
    concepts: ['FinOps', 'Intelligent-Tiering', 'Cost Anomaly Detection'],
    briefing: 'Unknown access patterns on data lakes cause expensive storage bills. S3 Intelligent-Tiering monitors access patterns and moves objects to lower-cost tiers with no retrieval fees or impact on performance.',
    taskDescription: '1. Place S3 Bucket.\n2. Configure S3 TTL / transition to 90.\n3. Connect CloudWatch for Cost Anomaly monitoring.',
    allowedPalette: ['s3', 'cloudwatch'],
    docTips: [
      'S3 Intelligent-Tiering automatically stores objects in Frequent, Infrequent, and Archive tiers.',
      'AWS Cost Anomaly Detection uses machine learning to identify unexpected spending spikes.'
    ],
    iacSnippet: `resource "aws_s3_bucket_intelligent_tiering_configuration" "tiering" {
  bucket = aws_s3_bucket.data_lake.id
  name   = "EntireBucket"
  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}`,
    requirements: [
      {
        id: 's3_tiering',
        label: 'Configure S3 Bucket TTL to 90',
        hint: 'Click S3 and set ttlSeconds to 90.',
        check: (s) => getComponent(s, 's3')?.config.ttlSeconds === 90
      },
      {
        id: 'cw_monitoring',
        label: 'Connect CloudWatch to S3 for anomaly detection',
        hint: 'Wire CloudWatch to S3.',
        check: (s) => hasConnected(s, 'cloudwatch', 's3')
      }
    ],
    initialState: {
      components: [
        { id: 'cw-finops', type: 'cloudwatch', name: 'FinOps Monitor', gridX: -3, gridZ: 0, subnet: 'isolated', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  // ==========================================
  // CHAPTER 10: ENTERPRISE ARCHITECTURE & CHAOS ENGINEERING (46-50)
  // ==========================================
  {
    id: 46,
    chapterId: 10,
    chapterTitle: 'Chapter 10: Enterprise Architecture & Chaos',
    title: 'AWS Transit Gateway (TGW) Hub-and-Spoke',
    tagline: 'Cleanly connect dozens of VPCs without mesh peering complexity',
    difficulty: 'Advanced',
    concepts: ['Transit Gateway', 'VPC Peering', 'Hub and Spoke'],
    briefing: 'Mesh VPC peering becomes unmanageable with N*(N-1)/2 connections across multiple accounts. AWS Transit Gateway acts as a central cloud router connecting thousands of VPCs and on-premises networks through a single hub.',
    taskDescription: '1. Place an AWS Transit Gateway (TGW).\n2. Wire Transit Gateway to EC2 Web VPC.\n3. Wire Transit Gateway to RDS Database VPC.',
    allowedPalette: ['tgw'],
    docTips: [
      'TGW simplifies network topology and supports multicast and cross-region peering.',
      'Route tables inside TGW allow strict segment isolation (e.g. dev VPCs cannot reach prod).'
    ],
    iacSnippet: `resource "aws_ec2_transit_gateway" "hub" {
  description = "Central Enterprise Transit Hub"
  amazon_side_asn = 64512
}`,
    requirements: [
      {
        id: 'tgw_placed',
        label: 'Deploy AWS Transit Gateway (TGW)',
        hint: 'Place TGW in the center hub position.',
        check: (s) => hasComponent(s, 'tgw')
      },
      {
        id: 'tgw_web',
        label: 'Connect TGW to Web VPC (EC2)',
        hint: 'Wire TGW to EC2.',
        check: (s) => hasConnected(s, 'tgw', 'ec2')
      },
      {
        id: 'tgw_db',
        label: 'Connect TGW to Database VPC (RDS)',
        hint: 'Wire TGW to RDS.',
        check: (s) => hasConnected(s, 'tgw', 'rds')
      }
    ],
    initialState: {
      components: [
        { id: 'ec2-vpc1', type: 'ec2', name: 'App VPC Node', gridX: -4, gridZ: 0, subnet: 'public', az: 'us-east-1a', config: {}, status: 'healthy' },
        { id: 'rds-vpc2', type: 'rds', name: 'Database VPC Node', gridX: 4, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 47,
    chapterId: 10,
    chapterTitle: 'Chapter 10: Enterprise Architecture & Chaos',
    title: 'Hybrid Cloud: AWS Direct Connect & IPsec VPN',
    tagline: 'Dedicated 10Gbps fiber link back to your on-premises datacenter',
    difficulty: 'Advanced',
    concepts: ['Direct Connect', 'IPsec VPN', 'BGP Dynamic Routing'],
    briefing: 'Enterprise core banking workloads still run in your on-premises datacenter. Connect the AWS cloud with a dedicated, low-latency AWS Direct Connect circuit, backed by an automated IPsec VPN tunnel for automatic failover.',
    taskDescription: '1. Connect Transit Gateway to on-prem Client router.\n2. Configure Transit Gateway route table target to "tgw".\n3. Connect Transit Gateway to internal EKS cluster.',
    allowedPalette: ['eks'],
    docTips: [
      'AWS Direct Connect provides consistent network performance bypassing the public internet.',
      'BGP (Border Gateway Protocol) dynamically routes around circuit failures.'
    ],
    iacSnippet: `resource "aws_dx_connection" "datacenter" {
  name      = "10G-Direct-Connect"
  bandwidth = "10Gbps"
  location  = "EqDC2"
}`,
    requirements: [
      {
        id: 'eks_onprem_connected',
        label: 'Connect Transit Gateway to EKS Cluster',
        hint: 'Wire TGW to EKS.',
        check: (s) => hasConnected(s, 'tgw', 'eks')
      },
      {
        id: 'client_to_tgw',
        label: 'Connect On-Prem Client to Transit Gateway',
        hint: 'Wire Client to TGW.',
        check: (s) => hasConnected(s, 'client', 'tgw')
      }
    ],
    initialState: {
      components: [
        { id: 'client-onprem', type: 'client', name: 'On-Prem Datacenter', gridX: -5, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 'tgw-hybrid', type: 'tgw', name: 'Hybrid Transit Gateway', gridX: 0, gridZ: 0, subnet: 'edge', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 48,
    chapterId: 10,
    chapterTitle: 'Chapter 10: Enterprise Architecture & Chaos',
    title: 'Multi-Region Active-Active Global Architecture',
    tagline: 'True global fault tolerance with DynamoDB Global Tables',
    difficulty: 'Master',
    concepts: ['Active-Active Multi-Region', 'Route 53 Geolocation', 'Global Tables'],
    briefing: 'What if an entire AWS Region (e.g. us-east-1) experiences a catastrophic blackout? An Active-Active multi-region architecture serves traffic locally from both US and Europe, synchronizing data bidirectionally in under 1 second.',
    taskDescription: '1. Deploy Route 53 with geolocation policy.\n2. Deploy Lambda function and DynamoDB table.\n3. Wire Route 53 -> Lambda -> DynamoDB.\n4. Enable encryption and multi-region replication.',
    allowedPalette: ['route53', 'lambda', 'dynamodb'],
    docTips: [
      'DynamoDB Global Tables use multi-master replication with last-writer-wins conflict resolution.',
      'Active-Active eliminates RTO (Recovery Time Objective) during regional incidents.'
    ],
    iacSnippet: `resource "aws_dynamodb_table" "global_users" {
  name         = "GlobalUsers"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "ID"
  replica {
    region_name = "eu-central-1"
  }
}`,
    requirements: [
      {
        id: 'all_global_components',
        label: 'Deploy Route 53, Lambda, and DynamoDB',
        hint: 'Ensure Route 53, Lambda, and DynamoDB are all present.',
        check: (s) => hasComponent(s, 'route53') && hasComponent(s, 'lambda') && hasComponent(s, 'dynamodb')
      },
      {
        id: 'global_flow',
        label: 'Wire Route 53 -> Lambda -> DynamoDB',
        hint: 'Connect Route 53 to Lambda, and Lambda to DynamoDB.',
        check: (s) => hasConnected(s, 'route53', 'lambda') && hasConnected(s, 'lambda', 'dynamodb')
      },
      {
        id: 'r53_geo',
        label: 'Set Route 53 policy to "geolocation"',
        hint: 'Click Route 53 and set routingPolicy to geolocation.',
        check: (s) => getComponent(s, 'route53')?.config.routingPolicy === 'geolocation'
      }
    ],
    initialState: {
      components: [
        { id: 'client-global', type: 'client', name: 'Worldwide Users', gridX: -6, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' }
      ],
      connections: []
    }
  },

  {
    id: 49,
    chapterId: 10,
    chapterTitle: 'Chapter 10: Enterprise Architecture & Chaos',
    title: 'Chaos Engineering: Surviving the Chaos Monkey',
    tagline: 'Deliberately terminate instances to prove resilience',
    difficulty: 'Master',
    concepts: ['Chaos Engineering', 'AWS Fault Injection Simulator', 'Resilience'],
    briefing: 'Netflix pioneered Chaos Monkey to test whether systems can survive sudden failure. AWS FIS (Fault Injection Simulator) is now simulating random instance termination and network latency in production. Can your architecture survive without dropping user sessions?',
    taskDescription: '1. Deploy Auto Scaling Group (ASG) behind ALB.\n2. Ensure Min Capacity is at least 3.\n3. Enable Multi-AZ and Health Check on ALB.\n4. Connect RDS database in Private Subnet with Multi-AZ.',
    allowedPalette: ['asg', 'rds'],
    docTips: [
      'Chaos engineering builds confidence by finding weaknesses before customers do.',
      'True high availability means services gracefully degrade and self-heal automatically.'
    ],
    iacSnippet: `resource "aws_fis_experiment_template" "kill_instances" {
  description = "Randomly kill 50% of EC2 nodes"
  role_arn    = aws_iam_role.fis.arn
  stop_conditions {
    source = "aws:cloudwatch:alarm"
    value  = aws_cloudwatch_metric_alarm.emergency_stop.arn
  }
}`,
    requirements: [
      {
        id: 'asg_resilient',
        label: 'Deploy ASG with Min Capacity >= 3',
        hint: 'Place ASG and set minCapacity to 3.',
        check: (s) => {
          const asg = getComponent(s, 'asg');
          return !!asg && (asg.config.minCapacity || 0) >= 3;
        }
      },
      {
        id: 'alb_multiaz_check',
        label: 'ALB Multi-AZ and Health Check enabled',
        hint: 'Click ALB and enable both multiAZ and targetGroupHealthCheck.',
        check: (s) => {
          const alb = getComponent(s, 'alb');
          return !!alb?.config.multiAZ && !!alb?.config.targetGroupHealthCheck;
        }
      },
      {
        id: 'rds_multiaz_db',
        label: 'RDS with Multi-AZ enabled',
        hint: 'Place RDS in private subnet and toggle multiAZ to true.',
        check: (s) => {
          const rds = getComponent(s, 'rds');
          return !!rds?.config.multiAZ;
        }
      }
    ],
    initialState: {
      components: [
        { id: 'client-1', type: 'client', name: 'Live Traffic', gridX: -6, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 'alb-chaos', type: 'alb', name: 'Hardened ALB', gridX: -2, gridZ: 0, subnet: 'public', az: 'global', config: { multiAZ: true, targetGroupHealthCheck: true }, status: 'healthy' }
      ],
      connections: [
        { id: 'c1', fromId: 'client-1', toId: 'alb-chaos', port: 443, protocol: 'tcp', allowed: true }
      ]
    }
  },

  {
    id: 50,
    chapterId: 10,
    chapterTitle: 'Chapter 10: Enterprise Architecture & Chaos',
    title: 'The Master Architect: End-to-End Production Outage Recovery',
    tagline: 'Diagnose and fix a cascaded multi-tier enterprise failure',
    difficulty: 'Master',
    concepts: ['Well-Architected Framework', 'Full Stack DevOps', 'Incident Command'],
    briefing: 'INCIDENT SEV-1: The flagship product is down! DNS is misconfigured, WAF was bypassed by attackers, security groups are blocking database ports, and the single database node crashed. You are the Principal DevOps Architect. Rebuild the entire production stack adhering to all 5 pillars of the AWS Well-Architected Framework!',
    taskDescription: '1. Wire Route 53 -> WAF -> ALB -> ASG -> RDS Database.\n2. Ensure ALB has HTTPS (Port 443) and Multi-AZ enabled.\n3. Ensure S3 logs bucket is versioned and encrypted.\n4. Connect CloudWatch monitoring to trigger on high alarms.\n5. Run live architecture simulation to verify 100% green traffic!',
    allowedPalette: ['route53', 'waf', 'alb', 'asg', 'rds', 's3', 'cloudwatch'],
    docTips: [
      'The AWS Well-Architected Framework: Operational Excellence, Security, Reliability, Performance Efficiency, and Cost Optimization.',
      'Congratulations on mastering all 60 DevOps AWS Architecture scenarios!'
    ],
    iacSnippet: `module "complete_enterprise_stack" {
  source = "./modules/well_architected_enterprise"

  waf_enabled            = true
  multi_az_database      = true
  autoscaling_min        = 3
  autoscaling_max        = 10
  kms_encryption_enabled = true
  cloudwatch_alarms      = true
}`,
    requirements: [
      {
        id: 'waf_secured',
        label: 'WAF protecting ALB from attacks',
        hint: 'Wire WAF to ALB.',
        check: (s) => hasConnected(s, 'waf', 'alb')
      },
      {
        id: 'alb_to_asg_or_ec2',
        label: 'ALB connected to compute tier (ASG or EC2)',
        hint: 'Wire ALB to ASG or EC2.',
        check: (s) => hasConnected(s, 'alb', 'asg') || hasConnected(s, 'alb', 'ec2')
      },
      {
        id: 'db_connected',
        label: 'Compute tier connected to Multi-AZ RDS',
        hint: 'Connect compute tier to RDS and enable multiAZ on RDS.',
        check: (s) => {
          const rds = getComponent(s, 'rds');
          const isConnected = hasConnected(s, 'ec2', 'rds') || hasConnected(s, 'asg', 'rds');
          return isConnected && !!rds?.config.multiAZ;
        }
      },
      {
        id: 'alb_https',
        label: 'ALB configured on Port 443 with TLS',
        hint: 'Click ALB: port 443 and encrypted true.',
        check: (s) => {
          const alb = getComponent(s, 'alb');
          return alb?.config.port === 443 && !!alb?.config.encrypted;
        }
      },
      {
        id: 's3_audit_live',
        label: 'S3 Audit bucket versioned and encrypted',
        hint: 'Click S3 and toggle versioning and encrypted to true.',
        check: (s) => {
          const s3 = getComponent(s, 's3');
          return !!s3?.config.versioning && !!s3?.config.encrypted;
        }
      }
    ],
    initialState: {
      components: [
        { id: 'client-1', type: 'client', name: 'Global Traffic', gridX: -6, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 'r53-master', type: 'route53', name: 'Route 53 Apex', gridX: -4, gridZ: 0, subnet: 'external', az: 'global', config: {}, status: 'healthy' },
        { id: 'waf-master', type: 'waf', name: 'WAF v2 Shield', gridX: -2, gridZ: 0, subnet: 'edge', az: 'global', config: {}, status: 'healthy' },
        { id: 'alb-master', type: 'alb', name: 'Enterprise ALB', gridX: 0, gridZ: 0, subnet: 'public', az: 'global', config: { port: 80, encrypted: false, multiAZ: true, targetGroupHealthCheck: true }, status: 'warning' },
        { id: 'asg-master', type: 'asg', name: 'Compute ASG Fleet', gridX: 3, gridZ: -2, subnet: 'public', az: 'us-east-1a', config: { minCapacity: 3, maxCapacity: 10 }, status: 'healthy' },
        { id: 'rds-master', type: 'rds', name: 'Mission-Critical RDS', gridX: 5, gridZ: 0, subnet: 'private', az: 'us-east-1a', config: { multiAZ: false, encrypted: true }, status: 'warning' },
        { id: 's3-master', type: 's3', name: 'Compliance S3 Vault', gridX: 3, gridZ: 2, subnet: 'isolated', az: 'global', config: { versioning: false, encrypted: false }, status: 'error' }
      ],
      connections: [
        { id: 'c0', fromId: 'client-1', toId: 'r53-master', port: 443, protocol: 'tcp', allowed: true },
        { id: 'c1', fromId: 'r53-master', toId: 'waf-master', port: 443, protocol: 'tcp', allowed: true }
      ]
    }
  }
];

// Plain-English Concept Cards & Target Placement Hints for key milestone levels in Chapters 3–12
const CONCEPT_CARDS_BY_RAW_ID: Record<number, LevelDefinition['conceptCard']> = {
  1: {
    title: 'What is a Virtual Private Cloud (VPC)?',
    summary: 'Now that you have completed Onboarding, let us look at your private slice of the AWS cloud: a VPC.',
    analogy: 'Think of AWS as a massive apartment building, and a VPC as your own private, keycard-locked floor inside that building.',
    keyTakeaway: 'Place an EC2 server in the Public Subnet, wire it to Internet Users, and verify Port 80 is open.'
  },
  2: {
    title: 'What is an Internet Gateway (IGW)?',
    summary: 'A VPC is completely isolated from the outside internet until you attach an Internet Gateway at the edge.',
    analogy: 'The Internet Gateway is the main front entrance door to your private office floor. The route "0.0.0.0/0" simply means "send all outside world traffic through this front door."',
    keyTakeaway: 'Place an Internet Gateway on the Edge zone (-2, 0) and wire Users -> IGW -> EC2.'
  },
  4: {
    title: 'What is a NAT Gateway?',
    summary: 'Private database servers should never receive incoming calls from strangers on the internet—but they still need to download security updates outbound.',
    analogy: 'A NAT Gateway is like a one-way mailroom clerk: your private servers inside the vault can ask the clerk to fetch software updates from outside, but outsiders cannot walk back in.',
    keyTakeaway: 'Place a NAT Gateway in the Public Subnet and wire Private DB -> NAT Gateway -> Internet Gateway.'
  },
  8: {
    title: 'What is an Auto Scaling Group (ASG)?',
    summary: 'Instead of manually adding EC2 servers when traffic spikes, an Auto Scaling Group automatically launches extra servers during busy hours and shuts them down at night.',
    analogy: 'Like a grocery store that automatically opens more checkout registers whenever the line gets longer than 3 shoppers.',
    keyTakeaway: 'Place an Auto Scaling Group, set Min Capacity to 2 and Max Capacity to 6, and wire it to the Load Balancer.'
  },
  16: {
    title: 'What is an IAM Role?',
    summary: 'Hardcoding secret passwords or API keys inside your server code is dangerous—if your code leaks, hackers get full access. IAM Roles attach temporary, tightly scoped permissions directly to a server.',
    analogy: 'Instead of giving a contractor the master key to every room in your building ("*"), you hand them a temporary badge that only opens the storage closet ("s3:ReadOnly").',
    keyTakeaway: 'Place an IAM Role, wire it to your EC2 server, and make sure its policy is set to "s3:ReadOnly".'
  },
  21: {
    title: 'What is Serverless (AWS Lambda)?',
    summary: 'With EC2, you pay for the server every hour even if nobody visits your website at 3 AM. AWS Lambda runs your code only for the exact milliseconds a request arrives.',
    analogy: 'EC2 is like renting a car 24/7 even when it is parked in your driveway. AWS Lambda is like hailing a taxi and paying only for the 4 minutes you are actually moving.',
    keyTakeaway: 'Place an AWS Lambda function and a DynamoDB table, then wire Mobile App -> Lambda -> DynamoDB.'
  },
  31: {
    title: 'What is a CI/CD Pipeline?',
    summary: 'CI/CD stands for Continuous Integration & Continuous Delivery—an automated conveyor belt that tests your code and deploys it to servers every time you save changes to Git.',
    analogy: 'Instead of carrying buckets of water by hand every time you update your app, CI/CD builds a plumbing pipeline that checks water quality and delivers it automatically.',
    keyTakeaway: 'Place an S3 Artifact Bucket (with Versioning enabled) and attach an IAM Role to your EC2 server.'
  },
  36: {
    title: 'What is Kubernetes (Amazon EKS)?',
    summary: 'When an application grows to dozens of small microservices packed into Docker containers, Amazon EKS (Elastic Kubernetes Service) organizes, schedules, and heals those containers across servers.',
    analogy: 'If Docker containers are standardized shipping crates, Kubernetes (EKS) is the automated cargo ship captain that packs, balances, and replaces crates across the fleet.',
    keyTakeaway: 'Place an EKS Cluster between your Load Balancer and your backend RDS Database.'
  }
};

const TARGET_HINTS_BY_RAW_ID: Record<number, LevelDefinition['targetPlacements']> = {
  1: [{ type: 'ec2', gridX: 1, gridZ: 0, label: 'Public EC2 Slot' }],
  2: [{ type: 'igw', gridX: -2, gridZ: 0, label: 'IGW Edge Slot' }],
  3: [{ type: 'rds', gridX: 4, gridZ: 0, label: 'Private RDS Slot' }],
  4: [{ type: 'nat_gw', gridX: 0, gridZ: 0, label: 'Public NAT Slot' }],
  6: [
    { type: 'alb', gridX: -2, gridZ: 0, label: 'ALB Slot' },
    { type: 'ec2', gridX: 2, gridZ: -2, label: 'EC2 #1' },
    { type: 'ec2', gridX: 2, gridZ: 2, label: 'EC2 #2' }
  ],
  8: [{ type: 'asg', gridX: 2, gridZ: 0, label: 'ASG Fleet Slot' }]
};

const SHIFTED_CORE_LEVELS: LevelDefinition[] = CORE_50_RAW.map((lvl) => {
  const newId = lvl.id + 10;
  const newChapterId = lvl.chapterId + 2;
  const chapterLabel = lvl.chapterTitle.replace(/^Chapter\s+\d+:/i, `Chapter ${newChapterId}:`);

  return {
    ...lvl,
    id: newId,
    chapterId: newChapterId,
    chapterTitle: chapterLabel,
    inspectorMode: newId <= 25 ? 'intermediate' : 'full',
    conceptCard: CONCEPT_CARDS_BY_RAW_ID[lvl.id],
    targetPlacements: TARGET_HINTS_BY_RAW_ID[lvl.id]
  };
});

const RAW_ALL_130: LevelDefinition[] = buildCourseraCurriculumLevels(
  ONBOARDING_LEVELS,
  SHIFTED_CORE_LEVELS
);

export const LEVELS: LevelDefinition[] = RAW_ALL_130.map((lvl) => {
  const mode = lvl.gameMode || getGameModeForLevel(lvl);
  const storyboard = lvl.storyboard || buildStoryboardForLevel(lvl, mode);
  const stages = buildProgressiveStagesForLevel(lvl, mode);

  // Protect pre-placed baseline components from accidental soft-lock deletion
  const safeComponents = lvl.initialState.components.map((comp) => {
    const isCrashedNode = comp.status === 'error' || comp.id.includes('crashed');
    const isProtectedBaseline =
      !isCrashedNode &&
      (comp.type === 'client' || !lvl.allowedPalette.includes(comp.type));
    return {
      ...comp,
      locked: isProtectedBaseline,
      deletable: isCrashedNode,
    };
  });

  return {
    ...lvl,
    gameMode: mode,
    storyboard,
    stages,
    initialState: {
      ...lvl.initialState,
      components: safeComponents,
    },
  };
});

export const CHAPTERS = COURSERA_MODULES.map((m) => ({
  id: m.id,
  title: m.title,
  shortTitle: m.shortTitle,
  syllabusSummary: m.syllabusSummary,
  levels: m.levels,
  assessmentLevelId: m.assessmentLevelId,
  badgeIcon: m.badgeIcon,
}));

export const COMPONENT_METAS: Record<string, ComponentMeta> = {
  client: {
    type: 'client',
    name: 'Internet Users',
    shortLabel: 'Users',
    category: 'Networking',
    color: '#38BDF8',
    accentColor: '#7DD3FC',
    description: 'External web browsers and mobile devices sending HTTP/HTTPS requests to your cloud infrastructure.',
    plainEnglishTip: 'Represents visitors opening your website or app from their laptop or phone.',
    defaultConfig: {}
  },
  ec2: {
    type: 'ec2',
    name: 'EC2 Instance',
    shortLabel: 'EC2',
    category: 'Compute',
    color: '#F59E0B',
    accentColor: '#FBBF24',
    description: 'Virtual Linux/Windows server running your application code with configurable Security Group firewall rules.',
    plainEnglishTip: 'A rented computer in the cloud that runs your backend code and listens on ports like Port 80.',
    defaultConfig: {
      instanceType: 't3.micro',
      port: 80,
      securityGroupInbound: [{ protocol: 'tcp', port: 80, source: '0.0.0.0/0' }]
    }
  },
  s3: {
    type: 's3',
    name: 'S3 Bucket',
    shortLabel: 'S3',
    category: 'Storage',
    color: '#10B981',
    accentColor: '#34D399',
    description: 'Durable object storage bucket for static files, photos, backups, and build artifacts.',
    plainEnglishTip: 'An unlimited cloud hard drive for storing files, images, and static website assets.',
    defaultConfig: {
      blockPublicAccess: true,
      encrypted: true,
      versioning: false,
      corsEnabled: false,
      ttlSeconds: 0
    }
  },
  ebs: {
    type: 'ebs',
    name: 'Amazon EBS Volume',
    shortLabel: 'EBS Disk',
    category: 'Storage',
    color: '#10B981',
    accentColor: '#34D399',
    description: 'High-performance Block Storage volume attached directly to an Amazon EC2 instance as its persistent hard drive.',
    plainEnglishTip: 'A virtual SSD hard drive plugged directly into a single EC2 server so its data survives reboots.',
    defaultConfig: {
      encrypted: true
    }
  },
  efs: {
    type: 'efs',
    name: 'Amazon EFS Share',
    shortLabel: 'EFS File',
    category: 'Storage',
    color: '#10B981',
    accentColor: '#34D399',
    description: 'Elastic File System providing shared network file folders that multiple EC2 servers can mount at the same time.',
    plainEnglishTip: 'A shared cloud folder that many EC2 servers across different Availability Zones can read and write together.',
    defaultConfig: {
      encrypted: true,
      multiAZ: true
    }
  },
  rds: {
    type: 'rds',
    name: 'RDS PostgreSQL',
    shortLabel: 'RDS DB',
    category: 'Database',
    color: '#3B82F6',
    accentColor: '#60A5FA',
    description: 'Managed relational SQL database with automated backups, Multi-AZ standby failover, and Read Replicas.',
    plainEnglishTip: 'A structured SQL database (Port 5432) for storing user accounts, orders, and transactions.',
    defaultConfig: {
      port: 5432,
      multiAZ: false,
      encrypted: true,
      readReplica: false
    }
  },
  redshift: {
    type: 'redshift',
    name: 'Amazon Redshift',
    shortLabel: 'Redshift',
    category: 'Database',
    color: '#8B5CF6',
    accentColor: '#A78BFA',
    description: 'Petabyte-scale cloud data warehouse for running complex SQL analytics and business intelligence queries.',
    plainEnglishTip: 'A massive analytics database inside the Private Subnet for crunching millions of historical sales records.',
    defaultConfig: {
      port: 5439,
      encrypted: true
    }
  },
  igw: {
    type: 'igw',
    name: 'Internet Gateway',
    shortLabel: 'IGW',
    category: 'Networking',
    color: '#14B8A6',
    accentColor: '#2DD4BF',
    description: 'VPC edge doorway enabling two-way communication between your Public Subnet and the outside internet.',
    plainEnglishTip: 'The main front door connecting your private cloud network (VPC) to the public internet.',
    defaultConfig: {
      cidr: '0.0.0.0/0'
    }
  },
  nat_gw: {
    type: 'nat_gw',
    name: 'NAT Gateway',
    shortLabel: 'NAT GW',
    category: 'Networking',
    color: '#0D9488',
    accentColor: '#5EEAD4',
    description: 'Allows private subnet servers to download outbound software updates while blocking incoming strangers.',
    plainEnglishTip: 'A one-way bridge so private servers can fetch updates from the internet without being exposed.',
    defaultConfig: {
      cidr: '0.0.0.0/0'
    }
  },
  alb: {
    type: 'alb',
    name: 'Load Balancer (ALB)',
    shortLabel: 'ALB',
    category: 'Networking',
    color: '#8B5CF6',
    accentColor: '#A78BFA',
    description: 'Application Load Balancer splitting incoming HTTP/HTTPS traffic evenly across multiple healthy servers.',
    plainEnglishTip: 'A traffic cop that splits incoming visitors evenly across two or more EC2 servers.',
    defaultConfig: {
      port: 80,
      multiAZ: true,
      targetGroupHealthCheck: true,
      encrypted: false
    }
  },
  asg: {
    type: 'asg',
    name: 'Auto Scaling Group',
    shortLabel: 'ASG',
    category: 'Compute',
    color: '#F97316',
    accentColor: '#FB923C',
    description: 'Automatically launches more EC2 servers when traffic spikes and removes idle servers when traffic drops.',
    plainEnglishTip: 'An automatic server cloner that adds extra EC2 machines during busy traffic spikes.',
    defaultConfig: {
      minCapacity: 2,
      maxCapacity: 6,
      instanceType: 't3.medium'
    }
  },
  ecs: {
    type: 'ecs',
    name: 'Amazon ECS',
    shortLabel: 'ECS',
    category: 'Compute',
    color: '#F97316',
    accentColor: '#FB923C',
    description: 'Elastic Container Service for running and scaling Docker containers on AWS without managing cluster masters.',
    plainEnglishTip: 'Runs your packaged Docker app containers in the VPC with built-in AWS scaling.',
    defaultConfig: {
      port: 80
    }
  },
  beanstalk: {
    type: 'beanstalk',
    name: 'Elastic Beanstalk',
    shortLabel: 'Beanstalk',
    category: 'Compute',
    color: '#F97316',
    accentColor: '#FB923C',
    description: 'Platform as a Service (PaaS) where you upload your code and AWS automatically provisions EC2, ALB, and scaling.',
    plainEnglishTip: 'Upload your web code and let AWS automatically handle the servers, load balancing, and health checks.',
    defaultConfig: {
      port: 80
    }
  },
  lambda: {
    type: 'lambda',
    name: 'AWS Lambda',
    shortLabel: 'Lambda',
    category: 'Serverless',
    color: '#EC4899',
    accentColor: '#F472B6',
    description: 'Serverless function that wakes up, runs your code in milliseconds when triggered, and costs nothing while idle.',
    plainEnglishTip: 'On-demand code that runs only at the exact moment a request arrives—no 24/7 server needed.',
    defaultConfig: {
      memoryMb: 512,
      timeoutSec: 15
    }
  },
  dynamodb: {
    type: 'dynamodb',
    name: 'DynamoDB Table',
    shortLabel: 'DynamoDB',
    category: 'Database',
    color: '#2563EB',
    accentColor: '#60A5FA',
    description: 'Serverless key-value NoSQL database delivering single-digit millisecond reads and writes at any scale.',
    plainEnglishTip: 'An ultra-fast, maintenance-free database for looking up key-value records in milliseconds.',
    defaultConfig: {
      encrypted: true,
      globalTables: false
    }
  },
  kinesis: {
    type: 'kinesis',
    name: 'Amazon Kinesis',
    shortLabel: 'Kinesis',
    category: 'Serverless',
    color: '#8B5CF6',
    accentColor: '#A78BFA',
    description: 'Real-time data streaming pipeline that ingests thousands of live events, clicks, and telemetry logs per second.',
    plainEnglishTip: 'A high-speed conveyor belt that streams live user clicks and events into analytics or AI models.',
    defaultConfig: {}
  },
  sagemaker: {
    type: 'sagemaker',
    name: 'Amazon SageMaker',
    shortLabel: 'SageMaker',
    category: 'Compute',
    color: '#10B981',
    accentColor: '#34D399',
    description: 'Managed Machine Learning service to build, train, and deploy real-time AI inference endpoints in your VPC.',
    plainEnglishTip: 'Runs trained AI & Machine Learning models inside your Private Subnet to score fraud or recommendations live.',
    defaultConfig: {
      port: 443
    }
  },
  cloudfront: {
    type: 'cloudfront',
    name: 'CloudFront CDN',
    shortLabel: 'CloudFront',
    category: 'Networking',
    color: '#06B6D4',
    accentColor: '#22D3EE',
    description: 'Global Content Delivery Network caching your website files in 450+ cities close to your users.',
    plainEnglishTip: 'Caches copies of your website around the world so pages load almost instantly everywhere.',
    defaultConfig: {
      ttlSeconds: 3600,
      originAccessControl: true
    }
  },
  route53: {
    type: 'route53',
    name: 'Route 53 DNS',
    shortLabel: 'Route 53',
    category: 'Networking',
    color: '#0EA5E9',
    accentColor: '#38BDF8',
    description: 'Cloud DNS directory translating domain names (like example.com) into your server or load balancer IP.',
    plainEnglishTip: 'The internet phonebook that directs visitors typing your domain name to the right server.',
    defaultConfig: {
      routingPolicy: 'simple'
    }
  },
  iam: {
    type: 'iam',
    name: 'IAM Role',
    shortLabel: 'IAM Role',
    category: 'Security',
    color: '#EF4444',
    accentColor: '#F87171',
    description: 'Identity and Access Management badge granting a server permission to read S3 or databases without passwords.',
    plainEnglishTip: 'A digital permission badge attached to a server so it can safely access other AWS services.',
    defaultConfig: {
      iamRole: 's3:ReadOnly'
    }
  },
  sqs: {
    type: 'sqs',
    name: 'SQS Queue',
    shortLabel: 'SQS',
    category: 'Serverless',
    color: '#D946EF',
    accentColor: '#E879F9',
    description: 'Message queue that holds incoming jobs in a neat line so backend workers can process them without crashing.',
    plainEnglishTip: 'A waiting line (queue) for tasks so sudden traffic spikes do not overwhelm your servers.',
    defaultConfig: {
      fifo: true,
      dlqEnabled: true
    }
  },
  sns: {
    type: 'sns',
    name: 'SNS Topic',
    shortLabel: 'SNS',
    category: 'Serverless',
    color: '#EC4899',
    accentColor: '#F472B6',
    description: 'Pub/Sub megaphone that broadcasts a single event or alert to multiple worker functions or pagers at once.',
    plainEnglishTip: 'A loudspeaker that broadcasts one notification to many different services simultaneously.',
    defaultConfig: {}
  },
  waf: {
    type: 'waf',
    name: 'AWS WAF Shield',
    shortLabel: 'WAF',
    category: 'Security',
    color: '#DC2626',
    accentColor: '#F87171',
    description: 'Web Application Firewall that inspects HTTP requests and blocks SQL injection hackers and botnets.',
    plainEnglishTip: 'A smart security guard at the entrance that blocks hacker attacks and spam bots.',
    defaultConfig: {
      rateLimit: 1000,
      sqlInjectionShield: true
    }
  },
  kms: {
    type: 'kms',
    name: 'AWS KMS Key',
    shortLabel: 'KMS Key',
    category: 'Security',
    color: '#EAB308',
    accentColor: '#FACC15',
    description: 'Key Management Service vault that manages master cryptographic keys for encrypting disks and databases.',
    plainEnglishTip: 'A master encryption key vault that scrambles stored data so thieves cannot read it.',
    defaultConfig: {
      keyRotation: true
    }
  },
  eks: {
    type: 'eks',
    name: 'EKS Kubernetes',
    shortLabel: 'EKS K8s',
    category: 'Compute',
    color: '#3B82F6',
    accentColor: '#93C5FD',
    description: 'Managed Kubernetes cluster that orchestrates and heals fleets of containerized microservices.',
    plainEnglishTip: 'An automated fleet captain that runs and heals groups of app containers (Kubernetes).',
    defaultConfig: {
      version: '1.29'
    }
  },
  cloudwatch: {
    type: 'cloudwatch',
    name: 'CloudWatch Monitor',
    shortLabel: 'CloudWatch',
    category: 'Operations',
    color: '#10B981',
    accentColor: '#6EE7B7',
    description: 'Observability radar that tracks server CPU, latency, and error logs, triggering alarms when something breaks.',
    plainEnglishTip: 'A health monitor and alarm system that watches server CPU, speed, and error rates.',
    defaultConfig: {
      alarmThreshold: 80
    }
  },
  cloudtrail: {
    type: 'cloudtrail',
    name: 'AWS CloudTrail',
    shortLabel: 'CloudTrail',
    category: 'Operations',
    color: '#EC4899',
    accentColor: '#F472B6',
    description: 'Governance and compliance audit recorder that logs every API call and user action made inside your AWS account.',
    plainEnglishTip: 'A security camera logbook that records exactly who changed or deleted any resource in your AWS account.',
    defaultConfig: {
      encrypted: true
    }
  },
  dms: {
    type: 'dms',
    name: 'AWS DMS Migration',
    shortLabel: 'AWS DMS',
    category: 'Database',
    color: '#14B8A6',
    accentColor: '#2DD4BF',
    description: 'Database Migration Service that copies live data from legacy on-premises databases into Amazon RDS with zero downtime.',
    plainEnglishTip: 'A live moving truck that copies your old database records into AWS RDS while your app stays online.',
    defaultConfig: {}
  },
  tgw: {
    type: 'tgw',
    name: 'Transit Gateway',
    shortLabel: 'Transit GW',
    category: 'Networking',
    color: '#6366F1',
    accentColor: '#818CF8',
    description: 'Central network hub that connects multiple separate VPC networks and corporate data centers together.',
    plainEnglishTip: 'A central Grand Central Station hub that connects many separate cloud networks together.',
    defaultConfig: {
      routeTableTarget: 'tgw'
    }
  },
  redis: {
    type: 'redis',
    name: 'ElastiCache Redis',
    shortLabel: 'Redis',
    category: 'Database',
    color: '#D82C20',
    accentColor: '#EF4444',
    description: 'Sub-millisecond in-memory key-value data store used to cache hot database queries, feed counters, and user sessions.',
    plainEnglishTip: 'Ultra-fast RAM memory cache (0.8ms) placed in front of RDS so repeated reads do not slow down your database.',
    defaultConfig: {
      port: 6379,
      evictionPolicy: 'allkeys-lru',
      cached: true
    }
  },
  apigw: {
    type: 'apigw',
    name: 'API Gateway',
    shortLabel: 'API GW',
    category: 'Networking',
    color: '#8C4FFF',
    accentColor: '#A855F7',
    description: 'Managed API front door providing HTTP 429 rate-limiting, burst throttling, and authentication for backend services.',
    plainEnglishTip: 'An API front door that enforces rate limits (HTTP 429 Too Many Requests) so traffic spikes or bots cannot overload your servers.',
    defaultConfig: {
      port: 443,
      rateLimitRps: 1000,
      burstLimit: 2000
    }
  }
};
