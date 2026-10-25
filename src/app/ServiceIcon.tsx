import React from 'react';
import type { ServiceType as AWSComponentType } from '../engine';
import { AWS_BRAND_STYLES } from '../render/assets/awsIconCanvas';

interface AwsServiceIconProps {
  type: AWSComponentType;
  size?: number;
  className?: string;
}

/**
 * Renders the authentic AWS Architecture Service Icon (EC2, S3, RDS, Redis, ALB,
 * CloudFront, Route 53, WAF, API Gateway, Lambda, SQS, DynamoDB, EKS, etc.)
 * so learners immediately recognize the service in the AWS Management Console.
 */
export const AwsServiceIcon: React.FC<AwsServiceIconProps> = ({
  type,
  size = 28,
  className = '',
}) => {
  const brand = AWS_BRAND_STYLES[type] || AWS_BRAND_STYLES.ec2;

  const renderGlyph = () => {
    switch (type) {
      case 'ec2':
        return (
          <g stroke="#FFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
            <rect x="7" y="7" width="10" height="10" rx="1.5" />
            <rect x="9.5" y="9.5" width="5" height="5" />
            <path d="M9 4.5V7M12 4.5V7M15 4.5V7M9 17v2.5M12 17v2.5M15 17v2.5M4.5 9H7M4.5 12H7M4.5 15H7M17 9h2.5M17 12h2.5M17 15h2.5" />
          </g>
        );
      case 's3':
        return (
          <g stroke="#FFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
            <ellipse cx="12" cy="8" rx="6" ry="2.2" />
            <path d="M6 8l1.4 9.2c.2 1.2 2.2 2 4.6 2s4.4-.8 4.6-2L18 8" />
            <path d="M7.5 7.2a4.8 4.8 0 0 1 9 0" />
          </g>
        );
      case 'rds':
      case 'dynamodb':
        return (
          <g stroke="#FFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
            <ellipse cx="12" cy="6.5" rx="6" ry="2.2" />
            <path d="M6 6.5v11c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3v-11" />
            <path d="M6 10.2c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2M6 13.8c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2" />
            {type === 'dynamodb' && (
              <path
                d="M13 8l-2.5 4h2l-1 4 3.5-4.5h-2L13 8z"
                fill="#FACC15"
                stroke="#FACC15"
                strokeWidth="0.6"
              />
            )}
          </g>
        );
      case 'redis':
        return (
          <g stroke="#FFF" strokeWidth="1.5" strokeLinejoin="round">
            <polygon points="12,13 19,16 12,19 5,16" fill="rgba(255,255,255,0.2)" />
            <polygon points="12,9.5 19,12.5 12,15.5 5,12.5" fill="rgba(255,255,255,0.35)" />
            <polygon points="12,5.5 19,8.5 12,11.5 5,8.5" fill="#FFF" />
          </g>
        );
      case 'alb':
        return (
          <g stroke="#FFF" strokeWidth="1.8" fill="none" strokeLinecap="round">
            <circle cx="6.5" cy="12" r="2.2" />
            <path d="M8.7 12L15 7M8.7 12H15M8.7 12l6.3 5" />
            <circle cx="17.2" cy="7" r="1.6" fill="#FFF" />
            <circle cx="17.2" cy="12" r="1.6" fill="#FFF" />
            <circle cx="17.2" cy="17" r="1.6" fill="#FFF" />
          </g>
        );
      case 'cloudfront':
        return (
          <g stroke="#FFF" strokeWidth="1.7" fill="none">
            <circle cx="12" cy="12" r="6.8" />
            <ellipse cx="12" cy="12" rx="3.2" ry="6.8" />
            <line x1="5.2" y1="12" x2="18.8" y2="12" />
          </g>
        );
      case 'route53':
        return (
          <g stroke="#FFF" strokeWidth="1.6" fill="none">
            <path d="M6 5.5h12v7.5L12 19l-6-6V5.5z" />
            <text
              x="12"
              y="13.5"
              textAnchor="middle"
              fill="#FFF"
              stroke="none"
              fontSize="7.5"
              fontWeight="800"
              fontFamily="JetBrains Mono, monospace"
            >
              53
            </text>
          </g>
        );
      case 'waf':
      case 'iam':
      case 'kms':
        return (
          <g stroke="#FFF" strokeWidth="1.7" fill="none" strokeLinejoin="round">
            <path d="M12 4.8l6.2 2.8v5.2c0 3.5-2.6 5.6-6.2 6.8-3.6-1.2-6.2-3.3-6.2-6.8V7.6L12 4.8z" />
            {type === 'waf' ? (
              <path d="M7.5 10.5h9M8.5 13.8h7" />
            ) : (
              <circle cx="12" cy="11.2" r="1.8" fill="#FFF" />
            )}
          </g>
        );
      case 'lambda':
        return (
          <text
            x="12"
            y="16.5"
            textAnchor="middle"
            fill="#FFF"
            fontSize="14"
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            λ
          </text>
        );
      case 'apigw':
        return (
          <g stroke="#FFF" strokeWidth="1.7" fill="none" strokeLinecap="round">
            <path d="M6 7v10M18 7v10M9.5 9.5l2.5-2 2.5 2M9.5 14.5l2.5 2 2.5-2M9 12h6" />
          </g>
        );
      case 'sqs':
      case 'sns':
        return (
          <g stroke="#FFF" strokeWidth="1.7" fill="none">
            <rect x="5" y="8" width="4" height="8" rx="1" fill="rgba(255,255,255,0.25)" />
            <rect x="10" y="8" width="4" height="8" rx="1" fill="rgba(255,255,255,0.25)" />
            <rect x="15" y="8" width="4" height="8" rx="1" fill="rgba(255,255,255,0.25)" />
          </g>
        );
      default:
        return (
          <text
            x="12"
            y="14.5"
            textAnchor="middle"
            fill="#FFF"
            fontSize="6.8"
            fontWeight="800"
            fontFamily="JetBrains Mono, monospace"
          >
            {brand.badgeCode.slice(0, 4)}
          </text>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`shrink-0 rounded-md shadow-sm ${className}`}
      aria-label={brand.serviceLabel}
    >
      <rect
        x="1"
        y="1"
        width="22"
        height="22"
        rx="4"
        fill={brand.bgHex}
        stroke={brand.borderHex}
        strokeWidth="1.5"
      />
      {renderGlyph()}
    </svg>
  );
};
