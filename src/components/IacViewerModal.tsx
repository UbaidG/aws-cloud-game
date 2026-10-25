import React, { useState } from 'react';
import { X, Copy, Check, FileCode2, Info } from 'lucide-react';
import { ArchitectureState, LevelDefinition } from '../game/types';

interface IacViewerModalProps {
  isOpen: boolean;
  level: LevelDefinition;
  state: ArchitectureState;
  onClose: () => void;
}

function buildTerraformBlueprint(level: LevelDefinition, state: ArchitectureState): string {
  if (level.iacSnippet) {
    return `# ============================================================================\n# CloudCraft Infrastructure Blueprint — Level ${level.id}: ${level.title}\n# Plain-English Summary: This file describes the 3D blocks on your board\n# so AWS can create the exact same servers and firewall rules automatically.\n# ============================================================================\n\n${level.iacSnippet}`;
  }

  const lines: string[] = [
    `# ============================================================================`,
    `# CloudCraft Infrastructure Blueprint — Level ${level.id}: ${level.title}`,
    `# Plain-English Summary: Every 3D block you place on the board is translated`,
    `# into a "resource" block below. DevOps engineers commit this file to Git.`,
    `# ============================================================================`,
    ``,
    `terraform {`,
    `  required_providers {`,
    `    aws = {`,
    `      source  = "hashicorp/aws"`,
    `      version = "~> 5.0"`,
    `    }`,
    `  }`,
    `}`,
    ``,
    `provider "aws" {`,
    `  region = "us-east-1"`,
    `}`,
    ``,
  ];

  for (const comp of state.components) {
    if (comp.type === 'client') continue;
    const safeId = comp.id.replace(/[^a-zA-Z0-9_]/g, '_');

    lines.push(`# 3D Block: ${comp.name} (${comp.subnet.toUpperCase()} ZONE)`);
    if (comp.type === 'ec2') {
      lines.push(`resource "aws_instance" "${safeId}" {`);
      lines.push(`  ami           = "ami-0c55b159cbfafe1f0"`);
      lines.push(`  instance_type = "${comp.config.instanceType || 't3.micro'}"`);
      lines.push(`  subnet_id     = aws_subnet.${comp.subnet}.id`);
      lines.push(`  tags          = { Name = "${comp.name}" }`);
      lines.push(`}`);
    } else if (comp.type === 'rds') {
      lines.push(`resource "aws_db_instance" "${safeId}" {`);
      lines.push(`  engine              = "postgres"`);
      lines.push(`  instance_class      = "db.t3.medium"`);
      lines.push(`  multi_az            = ${comp.config.multiAZ ? 'true' : 'false'}`);
      lines.push(`  storage_encrypted   = ${comp.config.encrypted ? 'true' : 'false'}`);
      lines.push(`  publicly_accessible = ${comp.subnet === 'public' ? 'true' : 'false'}`);
      lines.push(`}`);
    } else if (comp.type === 's3') {
      lines.push(`resource "aws_s3_bucket" "${safeId}" {`);
      lines.push(`  bucket = "cloudcraft-${safeId}"`);
      lines.push(`}`);
    } else {
      lines.push(`resource "aws_${comp.type}" "${safeId}" {`);
      lines.push(`  name   = "${comp.name}"`);
      lines.push(`  subnet = "${comp.subnet}"`);
      lines.push(`}`);
    }
    lines.push(``);
  }

  return lines.join('\n');
}

export const IacViewerModal: React.FC<IacViewerModalProps> = ({
  isOpen,
  level,
  state,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const hclCode = buildTerraformBlueprint(level, state);

  const handleCopy = () => {
    navigator.clipboard.writeText(hclCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0D1117]/80 flex items-center justify-center p-4">
      <div className="bg-[#151B23] border border-[#263040] rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1C2430] border-b border-[#263040] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-4 h-4 text-[#38BDF8]" />
            <div>
              <h2 className="text-sm font-bold text-[#F8FAFC]">
                Live Terraform Blueprint (main.tf)
              </h2>
              <p className="text-[11px] text-[#94A3B8]">
                Generated automatically from the 3D blocks on your board
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-md bg-[#0F141A] hover:bg-[#263040] text-[#CBD5E1] border border-[#263040] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[#10B981]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy main.tf</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#263040] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Plain-English Beginner Explanation */}
        <div className="px-6 py-3.5 bg-[#0F141A] border-b border-[#263040] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
          <div className="text-xs text-[#CBD5E1] leading-relaxed">
            <strong className="text-[#F8FAFC]">What is Terraform?</strong> Instead of clicking around the AWS website manually to create servers, DevOps engineers save a text blueprint like the one below. Every time you place a 3D block or open a firewall port on the board, this blueprint updates automatically.
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0B0E14]">
          <pre className="font-mono text-xs text-[#E2E8F0] leading-relaxed overflow-x-auto">
            {hclCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
