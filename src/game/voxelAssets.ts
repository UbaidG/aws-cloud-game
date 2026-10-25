/**
 * CloudCraft High-Craft 3D Hardware Miniature Assets
 * Precision-milled chamfered plinths, official AWS Architecture & Redis icon plates,
 * multi-scale mechanical silhouettes, and crisp floating 3D labels with AWS logos.
 */

import * as THREE from 'three';
import { AWSComponentType } from './types';
import { AWS_BRAND_STYLES, drawAwsIconGlyph, getAwsServiceTileTexture } from './awsIconCanvas';

// Procedural Canvas Texture: Server Rack Front Vent + LED Status Strip
function createServerFrontTexture(accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#181c24';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#2d3545';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 244);

  for (let bay = 0; bay < 3; bay++) {
    const y0 = 22 + bay * 74;
    ctx.fillStyle = '#101319';
    ctx.fillRect(18, y0, 220, 62);

    ctx.strokeStyle = '#283040';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, y0, 220, 62);

    ctx.fillStyle = '#07090d';
    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 3; row++) {
        ctx.fillRect(28 + col * 14, y0 + 12 + row * 14, 9, 8);
      }
    }

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(196, y0 + 22, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = accentHex;
    ctx.fillRect(186, y0 + 38, 36, 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Procedural Canvas Texture: S3 / RDS Capacity Gauge Markings
function createCylinderGaugeTexture(baseHex: string, stripeHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#0f131a';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(0, 42 + i * 56, 256, 10);
  }

  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(108, 20, 40, 216);
  ctx.fillStyle = stripeHex;
  for (let tick = 0; tick < 8; tick++) {
    ctx.fillRect(114, 30 + tick * 25, 28, 12);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates a crisp floating 3D label badge above a hardware component,
 * embedding the official AWS / Redis service icon tile directly on the left!
 */
export function createComponentLabelSprite(
  title: string,
  subtitle: string,
  accentColor: string,
  status: 'healthy' | 'warning' | 'error' | 'deploying' = 'healthy',
  componentType?: AWSComponentType
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 540;
  canvas.height = 148;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 540, 148);

  const x = 16;
  const y = 14;
  const w = 508;
  const h = 114;
  const r = 14;

  ctx.fillStyle = 'rgba(13, 17, 23, 0.94)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  ctx.lineWidth = 3.5;
  ctx.strokeStyle =
    status === 'error' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#2a3242';
  ctx.stroke();

  if (componentType) {
    // Draw authentic AWS Service Icon Tile on the left side of the floating 3D badge
    const brand = AWS_BRAND_STYLES[componentType] || AWS_BRAND_STYLES.ec2;
    const iconX = x + 14;
    const iconY = y + 14;
    const iconSize = 86;

    ctx.fillStyle = brand.bgHex;
    ctx.beginPath();
    ctx.roundRect(iconX, iconY, iconSize, iconSize, 12);
    ctx.fill();

    ctx.strokeStyle = brand.borderHex;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    drawAwsIconGlyph(ctx, componentType, iconX + iconSize / 2, iconY + iconSize / 2, iconSize * 0.85);

    // Primary Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 31px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(title.slice(0, 21), iconX + iconSize + 16, y + 19);

    // Subtitle (Port / Zone / Role) in monospace
    ctx.fillStyle = status === 'error' ? '#fca5a5' : '#94a3b8';
    ctx.font = '500 22px "JetBrains Mono", monospace';
    ctx.fillText(subtitle.slice(0, 27), iconX + iconSize + 16, y + 63);
  } else {
    // Target placement ring label
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(x + 16, y + 14, 10, h - 28, 4);
    ctx.fill();

    ctx.fillStyle = '#f3f4f6';
    ctx.font = '700 32px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(title.slice(0, 22), x + 40, y + 18);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 23px "JetBrains Mono", monospace';
    ctx.fillText(subtitle.slice(0, 28), x + 40, y + 62);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.22, 0.6, 1);
  sprite.position.set(0, 2.08, 0);
  sprite.renderOrder = 10;
  sprite.name = 'component_label_sprite';
  return sprite;
}

/**
 * Creates a floating 3D Failure Diagnostic Callout Sprite above a broken connection or node
 */
export function createFailureDiagnosticSprite(title: string, reason: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 176;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(24, 11, 15, 0.96)';
  ctx.beginPath();
  ctx.roundRect(12, 12, 616, 152, 16);
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#EF4444';
  ctx.stroke();

  // Left red alert stripe
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(26, 28, 10, 120);

  ctx.fillStyle = '#FCA5A5';
  ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`BLOCKED: ${title.slice(0, 32)}`, 50, 28);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  const words = reason.split(' ');
  let line1 = '';
  let line2 = '';
  for (const w of words) {
    if ((line1 + ' ' + w).length <= 46) {
      line1 = (line1 + ' ' + w).trim();
    } else if ((line2 + ' ' + w).length <= 48) {
      line2 = (line2 + ' ' + w).trim();
    }
  }
  ctx.fillText(line1, 50, 72);
  if (line2) {
    ctx.fillText(line2, 50, 104);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(3.2, 0.88, 1);
  sprite.renderOrder = 25;
  return sprite;
}

// Shared calibrated PBR materials
const mats = {
  plinthDark: new THREE.MeshStandardMaterial({
    color: 0x141821,
    roughness: 0.65,
    metalness: 0.35,
  }),
  plinthRim: new THREE.MeshStandardMaterial({
    color: 0x262d3d,
    roughness: 0.35,
    metalness: 0.75,
  }),
  anodizedGraphite: new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    roughness: 0.42,
    metalness: 0.78,
  }),
  brushedAluminum: new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.22,
    metalness: 0.88,
  }),
  chromeSteel: new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.15,
    metalness: 0.94,
  }),
  warmBrass: new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.24,
    metalness: 0.88,
  }),
  signalAmber: new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.3,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
  }),
  signalEmerald: new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.25,
    metalness: 0.3,
    emissive: 0x059669,
    emissiveIntensity: 0.45,
  }),
  signalCyan: new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.22,
    metalness: 0.4,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
  }),
  signalBlue: new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.28,
    metalness: 0.55,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.35,
  }),
  signalViolet: new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    roughness: 0.25,
    metalness: 0.5,
    emissive: 0x6d28d9,
    emissiveIntensity: 0.4,
  }),
  signalRose: new THREE.MeshStandardMaterial({
    color: 0xec4899,
    roughness: 0.25,
    metalness: 0.45,
    emissive: 0xbe185d,
    emissiveIntensity: 0.45,
  }),
  signalCrimson: new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.3,
    metalness: 0.4,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.45,
  }),
  redisCrimson: new THREE.MeshStandardMaterial({
    color: 0xd82c20,
    roughness: 0.25,
    metalness: 0.45,
    emissive: 0x991b1b,
    emissiveIntensity: 0.42,
  }),
  opticalGlass: new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.42,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    depthWrite: false,
  }),
  serverFrontEC2: new THREE.MeshStandardMaterial({
    map: createServerFrontTexture('#f59e0b'),
    roughness: 0.35,
    metalness: 0.65,
  }),
  cylinderGaugeS3: new THREE.MeshStandardMaterial({
    map: createCylinderGaugeTexture('#10b981', '#34d399'),
    roughness: 0.3,
    metalness: 0.72,
  }),
  cylinderGaugeRDS: new THREE.MeshStandardMaterial({
    map: createCylinderGaugeTexture('#2563eb', '#60a5fa'),
    roughness: 0.28,
    metalness: 0.76,
  }),
};

const plinthShape = (() => {
  const s = 0.52;
  const c = 0.08;
  const shape = new THREE.Shape();
  shape.moveTo(-s + c, -s);
  shape.lineTo(s - c, -s);
  shape.lineTo(s, -s + c);
  shape.lineTo(s, s - c);
  shape.lineTo(s - c, s);
  shape.lineTo(-s + c, s);
  shape.lineTo(-s, s - c);
  shape.lineTo(-s, -s + c);
  shape.closePath();
  return shape;
})();

const plinthGeo = new THREE.ExtrudeGeometry(plinthShape, {
  depth: 0.14,
  bevelEnabled: true,
  bevelSegments: 2,
  steps: 1,
  bevelSize: 0.03,
  bevelThickness: 0.03,
});
plinthGeo.rotateX(-Math.PI / 2);

function addHardwarePlinth(group: THREE.Group, accentMat: THREE.Material, type?: AWSComponentType) {
  const plinth = new THREE.Mesh(plinthGeo, mats.plinthDark);
  plinth.position.y = 0.03;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.92), mats.plinthRim);
  deck.position.y = 0.18;
  deck.receiveShadow = true;
  group.add(deck);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.04), accentMat);
  bar.position.set(0, 0.11, 0.53);
  group.add(bar);

  const pinGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8);
  const offsets = [
    [-0.4, -0.4],
    [0.4, -0.4],
    [-0.4, 0.4],
    [0.4, 0.4],
  ];
  offsets.forEach(([ox, oz]) => {
    const pin = new THREE.Mesh(pinGeo, mats.warmBrass);
    pin.position.set(ox, 0.2, oz);
    group.add(pin);
  });

  // Mount Official AWS Architecture Service Icon Emblem Plate on the front plinth apron
  if (type) {
    const iconTex = getAwsServiceTileTexture(type);
    const badgeMat = new THREE.MeshBasicMaterial({ map: iconTex });
    const badgePlate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), badgeMat);
    badgePlate.position.set(0, 0.56, 0.455);
    group.add(badgePlate);
  }
}

export function createComponentVoxelModel(type: AWSComponentType): THREE.Group {
  const group = new THREE.Group();
  group.name = `voxel_${type}`;

  switch (type) {
    case 'ec2':
      createEC2(group);
      break;
    case 's3':
      createS3(group);
      break;
    case 'ebs':
      createStorageArray(group, 'ebs');
      break;
    case 'efs':
      createStorageArray(group, 'efs');
      break;
    case 'rds':
      createRDS(group);
      break;
    case 'redshift':
      createDataWarehouse(group, 'redshift');
      break;
    case 'redis':
      createRedis(group);
      break;
    case 'apigw':
      createApiGateway(group);
      break;
    case 'igw':
      createIGW(group);
      break;
    case 'nat_gw':
      createNAT(group);
      break;
    case 'alb':
      createALB(group);
      break;
    case 'asg':
      createASG(group);
      break;
    case 'ecs':
      createContainerService(group, 'ecs');
      break;
    case 'beanstalk':
      createContainerService(group, 'beanstalk');
      break;
    case 'lambda':
      createLambda(group);
      break;
    case 'dynamodb':
      createDynamoDB(group);
      break;
    case 'kinesis':
      createStreamPipeline(group, 'kinesis');
      break;
    case 'sagemaker':
      createAiAccelerator(group, 'sagemaker');
      break;
    case 'cloudfront':
      createCloudFront(group);
      break;
    case 'route53':
      createRoute53(group);
      break;
    case 'iam':
      createIAM(group);
      break;
    case 'sqs':
      createSQS(group);
      break;
    case 'sns':
      createSNS(group);
      break;
    case 'waf':
      createWAF(group);
      break;
    case 'kms':
      createKMS(group);
      break;
    case 'eks':
      createEKS(group);
      break;
    case 'cloudwatch':
      createCloudWatch(group);
      break;
    case 'cloudtrail':
      createAuditRecorder(group, 'cloudtrail');
      break;
    case 'dms':
      createStreamPipeline(group, 'dms');
      break;
    case 'tgw':
      createTGW(group);
      break;
    case 'client':
    default:
      createClient(group);
      break;
  }

  group.position.y = 0;
  return group;
}

function createEC2(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalAmber, 'ec2');

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.12, 0.72), mats.anodizedGraphite);
  body.position.set(0, 0.76, 0);
  body.castShadow = true;
  group.add(body);

  const faceplate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.04), mats.serverFrontEC2);
  faceplate.position.set(0, 0.76, 0.365);
  group.add(faceplate);

  // Top Official AWS EC2 Icon Cap Tile
  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.58),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture('ec2') })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.4, 0);
  group.add(topLogo);

  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.56), mats.brushedAluminum);
    rib.position.set(0, 0.44 + i * 0.32, 0);
    group.add(rib);
  }

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.74), mats.warmBrass);
  cap.position.set(0, 1.35, 0);
  group.add(cap);
}

function createS3(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalEmerald, 's3');

  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.4, 0.96, 20),
    mats.cylinderGaugeS3
  );
  drum.position.set(0, 0.68, 0);
  drum.castShadow = true;
  group.add(drum);

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.4, 0.035, 10, 24),
      mats.brushedAluminum
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.36 + i * 0.32, 0);
    group.add(ring);
  }

  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.38, 0.1, 20),
    mats.anodizedGraphite
  );
  lid.position.set(0, 1.2, 0);
  group.add(lid);

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.48, 0.48),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture('s3') })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.26, 0);
  group.add(topLogo);
}

function createRDS(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalBlue, 'rds');

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 1.05, 20),
    mats.cylinderGaugeRDS
  );
  core.position.set(0, 0.72, 0);
  core.castShadow = true;
  group.add(core);

  for (let i = 0; i < 4; i++) {
    const flange = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.05, 16),
      mats.anodizedGraphite
    );
    flange.position.set(0, 0.32 + i * 0.26, 0);
    group.add(flange);
  }

  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.36, 0.14, 16),
    mats.brushedAluminum
  );
  crown.position.set(0, 1.3, 0);
  group.add(crown);

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture('rds') })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.38, 0);
  group.add(topLogo);
}

// Redis / ElastiCache: Iconic Stacked Crimson Isometric Memory Cubes + Top Redis Emblem
function createRedis(group: THREE.Group) {
  addHardwarePlinth(group, mats.redisCrimson, 'redis');

  // 3 Stacked Redis In-Memory Slices
  for (let i = 0; i < 3; i++) {
    const slice = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.22, 0.68),
      i % 2 === 0 ? mats.redisCrimson : mats.anodizedGraphite
    );
    slice.position.set(0, 0.36 + i * 0.28, 0);
    slice.rotation.y = Math.PI / 4;
    slice.castShadow = true;
    group.add(slice);
  }

  // Top Redis Logo Tile
  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.54, 0.54),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture('redis') })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.05, 0);
  group.add(topLogo);

  // Orbiting sub-millisecond cache ring
  const cacheRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.025, 8, 24),
    mats.warmBrass
  );
  cacheRing.rotation.x = Math.PI / 2;
  cacheRing.position.set(0, 0.64, 0);
  cacheRing.userData = { spinY: 3.2 };
  group.add(cacheRing);
}

// API Gateway: Rate-Limiting Portal & Throttling Meter
function createApiGateway(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalViolet, 'apigw');

  const archL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.02, 0.52), mats.anodizedGraphite);
  archL.position.set(-0.28, 0.7, 0);
  const archR = archL.clone();
  archR.position.x = 0.28;
  group.add(archL, archR);

  const topDeck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.58), mats.brushedAluminum);
  topDeck.position.set(0, 1.25, 0);
  group.add(topDeck);

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture('apigw') })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.33, 0);
  group.add(topLogo);

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), mats.signalViolet);
  core.position.set(0, 0.72, 0);
  core.userData = { spinY: 2.4 };
  group.add(core);
}

function createIGW(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalEmerald, 'igw');

  const pillarGeo = new THREE.BoxGeometry(0.18, 1.05, 0.26);
  const pilL = new THREE.Mesh(pillarGeo, mats.anodizedGraphite);
  pilL.position.set(-0.3, 0.72, 0);
  pilL.castShadow = true;
  const pilR = pilL.clone();
  pilR.position.x = 0.3;
  group.add(pilL, pilR);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.16, 0.32), mats.brushedAluminum);
  lintel.position.set(0, 1.28, 0);
  group.add(lintel);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.88, 0.06), mats.signalEmerald);
  glass.position.set(0, 0.7, 0);
  group.add(glass);
}

function createNAT(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalCyan, 'nat_gw');

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.68, 0.64), mats.anodizedGraphite);
  chassis.position.set(0, 0.54, 0);
  chassis.castShadow = true;
  group.add(chassis);

  const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), mats.signalCyan);
  prism.position.set(0, 1.15, 0);
  prism.userData = { spinY: 2.2 };
  group.add(prism);
}

function createALB(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalViolet, 'alb');

  const hexBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.46, 0.65, 6),
    mats.anodizedGraphite
  );
  hexBase.position.set(0, 0.52, 0);
  hexBase.castShadow = true;
  group.add(hexBase);

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture('alb') })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 0.86, 0);
  group.add(topLogo);

  const rotor = new THREE.Group();
  rotor.position.set(0, 1.12, 0);
  rotor.userData = { spinY: 2.0 };
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 20), mats.chromeSteel);
  ring.rotation.x = Math.PI / 2;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), mats.signalViolet);
  rotor.add(ring, gem);
  group.add(rotor);
}

function createASG(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalAmber, 'asg');

  const modGeo = new THREE.BoxGeometry(0.36, 0.92, 0.62);
  const mod1 = new THREE.Mesh(modGeo, mats.anodizedGraphite);
  mod1.position.set(-0.22, 0.66, 0);
  mod1.castShadow = true;
  const mod2 = new THREE.Mesh(modGeo, mats.brushedAluminum);
  mod2.position.set(0.22, 0.66, 0);
  mod2.castShadow = true;
  group.add(mod1, mod2);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.52), mats.warmBrass);
  bridge.position.set(0, 1.18, 0);
  group.add(bridge);

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture('asg') })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.24, 0);
  group.add(topLogo);
}

function createLambda(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalRose, 'lambda');

  const emitter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.4, 0.24, 12),
    mats.anodizedGraphite
  );
  emitter.position.set(0, 0.32, 0);
  group.add(emitter);

  const coreGroup = new THREE.Group();
  coreGroup.position.set(0, 0.92, 0);
  coreGroup.userData = { spinY: 2.6, bobY: true, baseY: 0.92 };

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), mats.signalRose);
  const gyro = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.03, 8, 24), mats.warmBrass);
  gyro.rotation.x = Math.PI / 3;
  coreGroup.add(crystal, gyro);
  group.add(coreGroup);
}

function createDynamoDB(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalBlue, 'dynamodb');

  const hex = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.92, 6),
    mats.anodizedGraphite
  );
  hex.position.set(0, 0.66, 0);
  hex.castShadow = true;
  group.add(hex);

  for (let i = 0; i < 3; i++) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 6), mats.signalCyan);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(0, 0.4 + i * 0.26, 0);
    group.add(coil);
  }

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture('dynamodb') })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.15, 0);
  group.add(topLogo);
}

function createCloudFront(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalCyan, 'cloudfront');

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.32, 0.36, 12),
    mats.anodizedGraphite
  );
  pedestal.position.set(0, 0.38, 0);
  group.add(pedestal);

  const globeGroup = new THREE.Group();
  globeGroup.position.set(0, 0.95, 0);
  globeGroup.userData = { spinY: 1.5 };

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 1), mats.signalCyan);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), mats.opticalGlass);
  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.02, 8, 24),
    mats.brushedAluminum
  );
  orbitRing.rotation.x = Math.PI / 2.6;
  globeGroup.add(core, shell, orbitRing);
  group.add(globeGroup);
}

function createRoute53(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalCyan, 'route53');

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.26, 1.1, 8),
    mats.brushedAluminum
  );
  tower.position.set(0, 0.75, 0);
  tower.castShadow = true;
  group.add(tower);

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.22 + i * 0.08, 0.025, 8, 20),
      mats.warmBrass
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.65 + i * 0.26, 0);
    group.add(ring);
  }
}

function createIAM(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalCrimson, 'iam');

  const vault = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.88, 0.42), mats.anodizedGraphite);
  vault.position.set(0, 0.64, 0);
  vault.castShadow = true;
  group.add(vault);

  const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), mats.signalEmerald);
  crest.position.set(0, 1.26, 0);
  crest.userData = { spinY: 1.8 };
  group.add(crest);
}

function createSQS(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalRose, 'sqs');

  const bed = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.22, 0.56), mats.anodizedGraphite);
  bed.position.set(0, 0.32, 0);
  group.add(bed);

  for (let i = 0; i < 3; i++) {
    const pkt = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.22, 0.26),
      i === 1 ? mats.warmBrass : mats.signalRose
    );
    pkt.position.set(-0.28 + i * 0.28, 0.56, 0);
    pkt.castShadow = true;
    group.add(pkt);
  }
}

function createSNS(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalRose, 'sns');

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 0.58, 12),
    mats.anodizedGraphite
  );
  hub.position.set(0, 0.48, 0);
  group.add(hub);

  const arrayGroup = new THREE.Group();
  arrayGroup.position.set(0, 0.96, 0);
  arrayGroup.userData = { spinY: 1.4 };

  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 12), mats.brushedAluminum);
    horn.position.set(Math.cos(angle) * 0.28, 0, Math.sin(angle) * 0.28);
    horn.rotation.z = -Math.PI / 2;
    horn.rotation.y = -angle;
    arrayGroup.add(horn);
  }
  group.add(arrayGroup);
}

function createWAF(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalCrimson, 'waf');

  const postGeo = new THREE.BoxGeometry(0.18, 1.0, 0.36);
  const postL = new THREE.Mesh(postGeo, mats.anodizedGraphite);
  postL.position.set(-0.34, 0.7, 0);
  const postR = postL.clone();
  postR.position.x = 0.34;
  group.add(postL, postR);

  const shieldCore = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.84, 0.08), mats.signalCrimson);
  shieldCore.position.set(0, 0.7, 0);
  group.add(shieldCore);

  const glassWall = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.92, 0.16), mats.opticalGlass);
  glassWall.position.set(0, 0.7, 0);
  group.add(glassWall);
}

function createKMS(group: THREE.Group) {
  addHardwarePlinth(group, mats.warmBrass, 'kms');

  const vault = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 0.58), mats.warmBrass);
  vault.position.set(0, 0.62, 0);
  vault.castShadow = true;
  group.add(vault);

  const shackle = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.045, 10, 20, Math.PI),
    mats.chromeSteel
  );
  shackle.position.set(0, 0.92, 0);
  group.add(shackle);
}

function createEKS(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalBlue, 'eks');

  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.16, 0.76), mats.anodizedGraphite);
  deck.position.set(0, 0.28, 0);
  group.add(deck);

  const podGeo = new THREE.BoxGeometry(0.36, 0.34, 0.62);
  const pod1 = new THREE.Mesh(podGeo, mats.signalBlue);
  pod1.position.set(-0.22, 0.54, 0);
  const pod2 = new THREE.Mesh(podGeo, mats.signalCyan);
  pod2.position.set(0.22, 0.54, 0);
  const pod3 = new THREE.Mesh(podGeo, mats.warmBrass);
  pod3.position.set(0, 0.9, 0);
  group.add(pod1, pod2, pod3);
}

function createCloudWatch(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalEmerald, 'cloudwatch');

  const consoleBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.56, 0.56),
    mats.anodizedGraphite
  );
  consoleBox.position.set(0, 0.48, 0);
  group.add(consoleBox);

  const radarGroup = new THREE.Group();
  radarGroup.position.set(0, 1.02, 0);
  radarGroup.userData = { spinY: 2.2 };

  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.08, 0.14, 16),
    mats.brushedAluminum
  );
  dish.rotation.x = Math.PI / 5;
  radarGroup.add(dish);
  group.add(radarGroup);
}

function createTGW(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalViolet, 'tgw');

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.52, 8),
    mats.anodizedGraphite
  );
  core.position.set(0, 0.46, 0);
  group.add(core);

  const nexus = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), mats.signalViolet);
  nexus.position.set(0, 0.96, 0);
  nexus.userData = { spinY: 1.8 };
  group.add(nexus);
}

function createClient(group: THREE.Group) {
  addHardwarePlinth(group, mats.signalCyan, 'client');

  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.42, 0.2), mats.brushedAluminum);
  stand.position.set(0, 0.4, -0.1);
  group.add(stand);

  const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.5, 0.08), mats.anodizedGraphite);
  bezel.position.set(0, 0.78, -0.06);
  bezel.castShadow = true;
  group.add(bezel);

  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42), mats.signalCyan);
  screen.position.set(0, 0.78, -0.015);
  group.add(screen);

  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.24), mats.chromeSteel);
  kb.position.set(0, 0.23, 0.22);
  group.add(kb);
}

function createStorageArray(group: THREE.Group, type: 'ebs' | 'efs') {
  addHardwarePlinth(group, mats.signalEmerald, type);

  for (let i = 0; i < 3; i++) {
    const platter = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.24, 0.72),
      i === 1 ? mats.signalEmerald : mats.anodizedGraphite
    );
    platter.position.set(0, 0.36 + i * 0.28, 0);
    platter.castShadow = true;
    group.add(platter);
  }

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.54, 0.54),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture(type) })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.08, 0);
  group.add(topLogo);
}

function createDataWarehouse(group: THREE.Group, type: 'redshift') {
  addHardwarePlinth(group, mats.signalViolet, type);

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.1, 8), mats.anodizedGraphite);
  tower.position.set(0, 0.75, 0);
  tower.castShadow = true;
  group.add(tower);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 10, 16), mats.signalViolet);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.85, 0);
  group.add(ring);

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.52),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture(type) })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.32, 0);
  group.add(topLogo);
}

function createContainerService(group: THREE.Group, type: 'ecs' | 'beanstalk') {
  addHardwarePlinth(group, mats.signalAmber, type);

  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.86, 0.74), mats.anodizedGraphite);
  rack.position.set(0, 0.64, 0);
  rack.castShadow = true;
  group.add(rack);

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.56, 0.56),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture(type) })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.09, 0);
  group.add(topLogo);
}

function createStreamPipeline(group: THREE.Group, type: 'kinesis' | 'dms') {
  addHardwarePlinth(group, mats.signalCyan, type);

  const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.88, 16), mats.anodizedGraphite);
  conduit.rotation.z = Math.PI / 2;
  conduit.position.set(0, 0.62, 0);
  group.add(conduit);

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture(type) })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 0.96, 0);
  group.add(topLogo);
}

function createAiAccelerator(group: THREE.Group, type: 'sagemaker') {
  addHardwarePlinth(group, mats.signalEmerald, type);

  const core = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.76, 0.76), mats.anodizedGraphite);
  core.position.set(0, 0.6, 0);
  group.add(core);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), mats.signalEmerald);
  crystal.position.set(0, 1.18, 0);
  crystal.userData = { spinY: 2.0 };
  group.add(crystal);
}

function createAuditRecorder(group: THREE.Group, type: 'cloudtrail') {
  addHardwarePlinth(group, mats.signalRose, type);

  const ledger = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.92, 0.62), mats.anodizedGraphite);
  ledger.position.set(0, 0.66, 0);
  group.add(ledger);

  const topLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial({ map: getAwsServiceTileTexture(type) })
  );
  topLogo.rotation.x = -Math.PI / 2;
  topLogo.position.set(0, 1.14, 0);
  group.add(topLogo);
}

