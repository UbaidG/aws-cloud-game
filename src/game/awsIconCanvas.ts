/**
 * Official AWS Architecture & DevOps Icon Canvas Renderer
 * Draws authentic AWS Architecture service tile emblems (Compute Orange #ED7100,
 * Storage Green #3F8624, Database Blue #3B48CC, Redis Red #D82C20, Networking Purple #8C4FFF,
 * Security Red #DD344C, App Integration Pink #E7157B) onto 2D Canvas contexts for 3D textures.
 */

import * as THREE from 'three';
import { AWSComponentType } from './types';

export interface AwsBrandStyle {
  bgHex: string;
  borderHex: string;
  badgeCode: string;
  serviceLabel: string;
}

export const AWS_BRAND_STYLES: Record<AWSComponentType, AwsBrandStyle> = {
  client: { bgHex: '#0284C7', borderHex: '#38BDF8', badgeCode: 'USERS', serviceLabel: 'Internet Client' },
  ec2: { bgHex: '#ED7100', borderHex: '#FF9900', badgeCode: 'EC2', serviceLabel: 'Amazon EC2' },
  asg: { bgHex: '#ED7100', borderHex: '#FF9900', badgeCode: 'ASG', serviceLabel: 'Auto Scaling' },
  ecs: { bgHex: '#ED7100', borderHex: '#FF9900', badgeCode: 'ECS', serviceLabel: 'Amazon ECS' },
  eks: { bgHex: '#ED7100', borderHex: '#FF9900', badgeCode: 'EKS', serviceLabel: 'Amazon EKS' },
  beanstalk: { bgHex: '#ED7100', borderHex: '#FF9900', badgeCode: 'EB', serviceLabel: 'Elastic Beanstalk' },
  lambda: { bgHex: '#ED7100', borderHex: '#FF9900', badgeCode: 'λ', serviceLabel: 'AWS Lambda' },
  s3: { bgHex: '#3F8624', borderHex: '#7AA116', badgeCode: 'S3', serviceLabel: 'Amazon S3' },
  ebs: { bgHex: '#3F8624', borderHex: '#7AA116', badgeCode: 'EBS', serviceLabel: 'Amazon EBS' },
  efs: { bgHex: '#3F8624', borderHex: '#7AA116', badgeCode: 'EFS', serviceLabel: 'Amazon EFS' },
  rds: { bgHex: '#3B48CC', borderHex: '#527FFF', badgeCode: 'RDS', serviceLabel: 'Amazon RDS' },
  dynamodb: { bgHex: '#3B48CC', borderHex: '#527FFF', badgeCode: 'DDB', serviceLabel: 'DynamoDB' },
  redis: { bgHex: '#D82C20', borderHex: '#EF4444', badgeCode: 'REDIS', serviceLabel: 'ElastiCache Redis' },
  redshift: { bgHex: '#8C4FFF', borderHex: '#A855F7', badgeCode: 'RS', serviceLabel: 'Amazon Redshift' },
  kinesis: { bgHex: '#8C4FFF', borderHex: '#A855F7', badgeCode: 'KIN', serviceLabel: 'Amazon Kinesis' },
  sagemaker: { bgHex: '#01A88D', borderHex: '#2DD4BF', badgeCode: 'ML', serviceLabel: 'Amazon SageMaker' },
  alb: { bgHex: '#8C4FFF', borderHex: '#A855F7', badgeCode: 'ALB', serviceLabel: 'Elastic Load Balancing' },
  igw: { bgHex: '#8C4FFF', borderHex: '#A855F7', badgeCode: 'IGW', serviceLabel: 'Internet Gateway' },
  nat_gw: { bgHex: '#8C4FFF', borderHex: '#A855F7', badgeCode: 'NAT', serviceLabel: 'NAT Gateway' },
  cloudfront: { bgHex: '#8C4FFF', borderHex: '#A855F7', badgeCode: 'CDN', serviceLabel: 'Amazon CloudFront' },
  route53: { bgHex: '#8C4FFF', borderHex: '#A855F7', badgeCode: 'R53', serviceLabel: 'Amazon Route 53' },
  apigw: { bgHex: '#8C4FFF', borderHex: '#A855F7', badgeCode: 'API', serviceLabel: 'API Gateway' },
  tgw: { bgHex: '#8C4FFF', borderHex: '#A855F7', badgeCode: 'TGW', serviceLabel: 'Transit Gateway' },
  waf: { bgHex: '#DD344C', borderHex: '#F87171', badgeCode: 'WAF', serviceLabel: 'AWS WAF' },
  iam: { bgHex: '#DD344C', borderHex: '#F87171', badgeCode: 'IAM', serviceLabel: 'AWS IAM' },
  kms: { bgHex: '#DD344C', borderHex: '#F87171', badgeCode: 'KMS', serviceLabel: 'AWS KMS' },
  sqs: { bgHex: '#E7157B', borderHex: '#F472B6', badgeCode: 'SQS', serviceLabel: 'Amazon SQS' },
  sns: { bgHex: '#E7157B', borderHex: '#F472B6', badgeCode: 'SNS', serviceLabel: 'Amazon SNS' },
  cloudwatch: { bgHex: '#E7157B', borderHex: '#F472B6', badgeCode: 'CW', serviceLabel: 'Amazon CloudWatch' },
  cloudtrail: { bgHex: '#E7157B', borderHex: '#F472B6', badgeCode: 'CT', serviceLabel: 'AWS CloudTrail' },
  dms: { bgHex: '#01A88D', borderHex: '#34D399', badgeCode: 'DMS', serviceLabel: 'Database Migration' },
};

/**
 * Draws the recognizable official AWS Architecture white vector glyph inside a bounding box
 */
export function drawAwsIconGlyph(
  ctx: CanvasRenderingContext2D,
  type: AWSComponentType,
  cx: number,
  cy: number,
  size: number
) {
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2.5, size * 0.065);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const r = size * 0.36;

  switch (type) {
    case 'ec2': {
      // Official AWS EC2 Microchip with 3 pins per side
      const box = r * 1.1;
      ctx.strokeRect(cx - box / 2, cy - box / 2, box, box);
      ctx.strokeRect(cx - box * 0.28, cy - box * 0.28, box * 0.56, box * 0.56);
      const offsets = [-box * 0.3, 0, box * 0.3];
      offsets.forEach((off) => {
        // Top & Bottom pins
        ctx.beginPath();
        ctx.moveTo(cx + off, cy - box / 2);
        ctx.lineTo(cx + off, cy - box / 2 - r * 0.28);
        ctx.moveTo(cx + off, cy + box / 2);
        ctx.lineTo(cx + off, cy + box / 2 + r * 0.28);
        // Left & Right pins
        ctx.moveTo(cx - box / 2, cy + off);
        ctx.lineTo(cx - box / 2 - r * 0.28, cy + off);
        ctx.moveTo(cx + box / 2, cy + off);
        ctx.lineTo(cx + box / 2 + r * 0.28, cy + off);
        ctx.stroke();
      });
      break;
    }

    case 's3': {
      // Official AWS S3 Bucket with wireframe handle
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.45, r * 0.65, r * 0.24, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - r * 0.65, cy - r * 0.45);
      ctx.lineTo(cx - r * 0.48, cy + r * 0.62);
      ctx.quadraticCurveTo(cx, cy + r * 0.85, cx + r * 0.48, cy + r * 0.62);
      ctx.lineTo(cx + r * 0.65, cy - r * 0.45);
      ctx.stroke();

      // Bucket arch handle
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.4, r * 0.55, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      break;
    }

    case 'rds':
    case 'dynamodb': {
      // Official AWS Database cylinder stack + lightning bolt for DynamoDB
      ctx.beginPath();
      ctx.ellipse(cx, cy - r * 0.52, r * 0.65, r * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - r * 0.65, cy - r * 0.52);
      ctx.lineTo(cx - r * 0.65, cy + r * 0.52);
      ctx.quadraticCurveTo(cx, cy + r * 0.8, cx + r * 0.65, cy + r * 0.52);
      ctx.lineTo(cx + r * 0.65, cy - r * 0.52);
      ctx.stroke();

      // Middle platter lines
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.65, cy - r * 0.15);
      ctx.quadraticCurveTo(cx, cy + r * 0.1, cx + r * 0.65, cy - r * 0.15);
      ctx.moveTo(cx - r * 0.65, cy + r * 0.2);
      ctx.quadraticCurveTo(cx, cy + r * 0.45, cx + r * 0.65, cy + r * 0.2);
      ctx.stroke();

      if (type === 'dynamodb') {
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.moveTo(cx + r * 0.1, cy - r * 0.35);
        ctx.lineTo(cx - r * 0.22, cy + r * 0.08);
        ctx.lineTo(cx + r * 0.04, cy + r * 0.08);
        ctx.lineTo(cx - r * 0.12, cy + r * 0.52);
        ctx.lineTo(cx + r * 0.28, cy + r * 0.02);
        ctx.lineTo(cx + r * 0.02, cy + r * 0.02);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'redis': {
      // Iconic Redis stacked isometric diamond layers + star/polygon
      for (let i = 2; i >= 0; i--) {
        const yOff = (i - 1) * (r * 0.38);
        ctx.beginPath();
        ctx.moveTo(cx, cy + yOff - r * 0.36);
        ctx.lineTo(cx + r * 0.75, cy + yOff);
        ctx.lineTo(cx, cy + yOff + r * 0.36);
        ctx.lineTo(cx - r * 0.75, cy + yOff);
        ctx.closePath();
        ctx.fillStyle = i === 0 ? '#FFFFFF' : 'rgba(255,255,255,0.22)';
        ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'alb': {
      // Official AWS Elastic Load Balancing split-arrows node diagram
      ctx.beginPath();
      ctx.arc(cx - r * 0.55, cy, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      const targetsY = [-r * 0.52, 0, r * 0.52];
      targetsY.forEach((ty) => {
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.33, cy);
        ctx.lineTo(cx + r * 0.35, cy + ty);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + r * 0.55, cy + ty, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }

    case 'cloudfront': {
      // Official CloudFront Global Edge network globe
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.35, r * 0.72, 0, 0, Math.PI * 2);
      ctx.moveTo(cx - r * 0.72, cy);
      ctx.lineTo(cx + r * 0.72, cy);
      ctx.stroke();
      break;
    }

    case 'route53': {
      // Official Route 53 Highway Shield with "53"
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.65, cy - r * 0.65);
      ctx.lineTo(cx + r * 0.65, cy - r * 0.65);
      ctx.lineTo(cx + r * 0.65, cy + r * 0.15);
      ctx.lineTo(cx, cy + r * 0.78);
      ctx.lineTo(cx - r * 0.65, cy + r * 0.15);
      ctx.closePath();
      ctx.stroke();

      ctx.font = `800 ${Math.round(size * 0.3)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('53', cx, cy - r * 0.02);
      break;
    }

    case 'waf':
    case 'iam':
    case 'kms': {
      // Official AWS Security Shield / Firewall emblem
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.78);
      ctx.lineTo(cx + r * 0.68, cy - r * 0.45);
      ctx.lineTo(cx + r * 0.58, cy + r * 0.25);
      ctx.lineTo(cx, cy + r * 0.8);
      ctx.lineTo(cx - r * 0.58, cy + r * 0.25);
      ctx.lineTo(cx - r * 0.68, cy - r * 0.45);
      ctx.closePath();
      ctx.stroke();

      if (type === 'waf') {
        // Brick pattern inside shield
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.45, cy - r * 0.1);
        ctx.lineTo(cx + r * 0.45, cy - r * 0.1);
        ctx.moveTo(cx - r * 0.35, cy + r * 0.25);
        ctx.lineTo(cx + r * 0.35, cy + r * 0.25);
        ctx.stroke();
      } else {
        // Keyhole
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.1, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - r * 0.06, cy, r * 0.12, r * 0.32);
      }
      break;
    }

    case 'lambda': {
      // Official AWS Lambda Greek letter λ
      ctx.font = `800 ${Math.round(size * 0.52)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('λ', cx, cy + 2);
      break;
    }

    case 'ebs':
    case 'efs': {
      // Block / File Storage 3D Isometric Cube & Folder array
      ctx.beginPath();
      ctx.moveTo(cx, cy - r * 0.72);
      ctx.lineTo(cx + r * 0.68, cy - r * 0.35);
      ctx.lineTo(cx + r * 0.68, cy + r * 0.35);
      ctx.lineTo(cx, cy + r * 0.72);
      ctx.lineTo(cx - r * 0.68, cy + r * 0.35);
      ctx.lineTo(cx - r * 0.68, cy - r * 0.35);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - r * 0.68, cy - r * 0.35);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + r * 0.68, cy - r * 0.35);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + r * 0.72);
      ctx.stroke();
      break;
    }

    case 'ecs':
    case 'eks':
    case 'beanstalk': {
      // Container shipping crate & orchestration nodes
      const w = r * 1.25;
      const h = r * 0.9;
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.18, cy - h / 2);
      ctx.lineTo(cx - w * 0.18, cy + h / 2);
      ctx.moveTo(cx + w * 0.18, cy - h / 2);
      ctx.lineTo(cx + w * 0.18, cy + h / 2);
      ctx.stroke();
      break;
    }

    case 'sagemaker': {
      // AI/ML Neural Network brain nodes
      const nodes = [
        [cx - r * 0.5, cy - r * 0.35],
        [cx - r * 0.5, cy + r * 0.35],
        [cx, cy - r * 0.55],
        [cx, cy + r * 0.55],
        [cx + r * 0.55, cy],
      ];
      ctx.beginPath();
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          ctx.moveTo(nodes[i][0], nodes[i][1]);
          ctx.lineTo(nodes[j][0], nodes[j][1]);
        }
      }
      ctx.stroke();
      nodes.forEach(([nx, ny]) => {
        ctx.beginPath();
        ctx.arc(nx, ny, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }

    default: {
      // Clean technical badge code for remaining gateways/queues
      const style = AWS_BRAND_STYLES[type] || AWS_BRAND_STYLES.ec2;
      ctx.strokeRect(cx - r * 0.72, cy - r * 0.52, r * 1.44, r * 1.04);
      ctx.font = `800 ${Math.round(size * 0.24)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.badgeCode, cx, cy + 1);
      break;
    }
  }

  ctx.restore();
}

const iconTextureCache = new Map<AWSComponentType, THREE.CanvasTexture>();

/**
 * Creates a cached 256x256 Three.js CanvasTexture of the official AWS Architecture Service Icon tile
 * to mount directly on the top/front of every 3D hardware model.
 */
export function getAwsServiceTileTexture(type: AWSComponentType): THREE.CanvasTexture {
  const cached = iconTextureCache.get(type);
  if (cached) return cached;

  const style = AWS_BRAND_STYLES[type] || AWS_BRAND_STYLES.ec2;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Official AWS Architecture Service Tile background
  ctx.fillStyle = style.bgHex;
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 240, 28);
  ctx.fill();

  // Crisp inner architectural bevel frame
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 220, 220);

  // Draw the official white vector icon glyph in the upper center
  drawAwsIconGlyph(ctx, type, 128, 106, 150);

  // Draw the official AWS service code footer ribbon
  ctx.fillStyle = 'rgba(11, 14, 20, 0.78)';
  ctx.fillRect(21, 186, 214, 49);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 28px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(style.badgeCode, 128, 211);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  iconTextureCache.set(type, tex);
  return tex;
}
