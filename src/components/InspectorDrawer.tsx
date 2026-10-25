import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Shield,
  Sliders,
  Code2,
  AlertTriangle,
  Unlink,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  VoxelBlock,
  SecurityGroupRule,
  Connection,
  CoachStep,
  ComponentConfig,
} from '../game/types';
import { COMPONENT_METAS } from '../game/levels';
import { AwsServiceIcon } from './AwsServiceIcon';

interface InspectorDrawerProps {
  component: VoxelBlock | null;
  connections: Connection[];
  allComponents: VoxelBlock[];
  inspectorMode: 'basic' | 'intermediate' | 'full';
  activeCoachStep?: CoachStep | null;
  onClose: () => void;
  onUpdateConfig: (componentId: string, updates: Partial<ComponentConfig>) => void;
  onDeleteComponent: (componentId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
  onConnectTo: (targetId: string) => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  component,
  connections,
  allComponents,
  inspectorMode,
  activeCoachStep,
  onClose,
  onUpdateConfig,
  onDeleteComponent,
  onDeleteConnection,
  onConnectTo,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'sg' | 'hcl'>('config');
  const [newPort, setNewPort] = useState<string>('80');
  const [newSource, setNewSource] = useState<string>('0.0.0.0/0');

  if (!component) return null;

  const meta = COMPONENT_METAS[component.type] || COMPONENT_METAS.ec2;
  const compConnections = connections.filter(
    (c) => c.fromId === component.id || c.toId === component.id
  );

  const inboundRules: SecurityGroupRule[] = component.config.securityGroupInbound || [];

  const hasPort80 = inboundRules.some(
    (r) => Number(r.port) === 80 || r.port === '80' || r.port === 'all'
  );

  const isPort80CoachHighlighted =
    activeCoachStep?.targetButton === 'inspector-port80' && !hasPort80;

  const handleAddRule = (port: number, protocol: 'tcp' | 'udp' | 'all', source: string, description: string) => {
    const newRule: SecurityGroupRule = {
      protocol,
      port,
      source,
      description,
    };
    onUpdateConfig(component.id, {
      port: component.config.port || port,
      securityGroupInbound: [...inboundRules, newRule],
    });
  };

  const handleRemoveRule = (index: number) => {
    onUpdateConfig(component.id, {
      securityGroupInbound: inboundRules.filter((_, idx) => idx !== index),
    });
  };

  const generateComponentHcl = (c: VoxelBlock): { code: string; explanation: string } => {
    const safeName = c.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    switch (c.type) {
      case 'ec2':
        return {
          explanation: `This Terraform block tells AWS to rent a virtual Linux computer (${c.config.instanceType || 't3.micro'}) in the ${c.subnet} zone with the firewall rules you configured.`,
          code: `resource "aws_instance" "${safeName}" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "${c.config.instanceType || 't3.micro'}"
  subnet_id     = aws_subnet.${c.subnet}.id

  # Firewall (Security Group) Ports Allowed:
  # ${inboundRules.map((r) => `Port ${r.port} (${r.protocol}) from ${r.source}`).join(', ') || 'None (All traffic blocked!)'}
}`,
        };
      case 'rds':
        return {
          explanation: `This Terraform block provisions a managed relational SQL database in the ${c.subnet} zone.`,
          code: `resource "aws_db_instance" "${safeName}" {
  engine              = "postgres"
  instance_class      = "db.t3.medium"
  multi_az            = ${c.config.multiAZ ? 'true' : 'false'}
  storage_encrypted   = ${c.config.encrypted ? 'true' : 'false'}
  publicly_accessible = ${c.subnet === 'public' ? 'true' : 'false'}
}`,
        };
      case 's3':
        return {
          explanation: `This Terraform block creates an S3 storage bucket for holding files, images, or backups.`,
          code: `resource "aws_s3_bucket" "${safeName}" {
  bucket = "${safeName}-bucket"
}

resource "aws_s3_bucket_public_access_block" "${safeName}_access" {
  bucket                  = aws_s3_bucket.${safeName}.id
  block_public_acls       = ${c.config.blockPublicAccess !== false ? 'true' : 'false'}
  block_public_policy     = ${c.config.blockPublicAccess !== false ? 'true' : 'false'}
}`,
        };
      default:
        return {
          explanation: `Terraform declaration for ${meta.name}. Instead of clicking menus manually, DevOps teams save this text file in Git so AWS builds it automatically.`,
          code: `resource "aws_${c.type}" "${safeName}" {
  name   = "${c.name}"
  subnet = "${c.subnet}"
}`,
        };
    }
  };

  const hclInfo = generateComponentHcl(component);

  return (
    <div className="fixed inset-x-2 bottom-28 max-h-[54dvh] sm:inset-x-auto sm:max-h-none sm:top-16 sm:right-4 sm:bottom-20 sm:w-88 z-30 bg-[#151B23] border border-[#263040] rounded-lg shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-150">
      {/* Header */}
      <div className="p-3.5 border-b border-[#263040] bg-[#1C2430] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <AwsServiceIcon type={component.type} size={32} />
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] leading-tight">
              {component.name}
            </h3>
            <p className="text-[11px] text-[#94A3B8]">
              {meta.name} · <span className="font-mono">{component.id}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#263040] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Plain-English Beginner Explanation Box */}
      <div className="px-3.5 py-2.5 bg-[#0F141A] border-b border-[#263040] flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
          {meta.plainEnglishTip}
        </p>
      </div>

      {/* Tabs (Progressive disclosure: hide HCL tab in basic mode) */}
      {inspectorMode !== 'basic' && (
        <div className="flex border-b border-[#263040] bg-[#0F141A] text-xs font-medium">
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'config'
                ? 'border-[#F59E0B] text-[#F8FAFC] bg-[#151B23]'
                : 'border-transparent text-[#94A3B8] hover:text-[#CBD5E1]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('sg')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sg'
                ? 'border-[#F59E0B] text-[#F8FAFC] bg-[#151B23]'
                : 'border-transparent text-[#94A3B8] hover:text-[#CBD5E1]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Firewall ({inboundRules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('hcl')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'hcl'
                ? 'border-[#F59E0B] text-[#F8FAFC] bg-[#151B23]'
                : 'border-transparent text-[#94A3B8] hover:text-[#CBD5E1]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Terraform</span>
          </button>
        </div>
      )}

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {(activeTab === 'config' || inspectorMode === 'basic') && (
          <>
            {/* Status & Zone */}
            <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Board Zone:</span>
                <span className="font-semibold text-[#F8FAFC] uppercase text-[11px]">
                  {component.subnet} Subnet
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Availability Zone:</span>
                <span className="font-mono text-[#CBD5E1]">{component.az}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Health Status:</span>
                <span
                  className={`font-semibold uppercase text-[11px] ${
                    component.status === 'healthy'
                      ? 'text-[#10B981]'
                      : component.status === 'error'
                      ? 'text-[#EF4444]'
                      : 'text-[#F59E0B]'
                  }`}
                >
                  {component.status}
                </span>
              </div>
              {component.statusMessage && (
                <div className="mt-2 pt-2 border-t border-[#263040] text-[#EF4444] flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{component.statusMessage}</span>
                </div>
              )}
            </div>

            {/* Firewall Rules (Always visible on main card for EC2/ALB/RDS/EKS so beginners don't hunt tabs) */}
            {(component.type === 'ec2' ||
              component.type === 'alb' ||
              component.type === 'rds' ||
              component.type === 'eks') && (
              <div className="space-y-2.5 p-3.5 rounded-md bg-[#0F141A] border border-[#263040]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Firewall Rules (Security Group)</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Choose which network ports are allowed to enter this server.
                </p>

                {/* Active Rules List */}
                <div className="space-y-1.5">
                  {inboundRules.length === 0 ? (
                    <div className="p-2.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#FCA5A5] text-[11px]">
                      No ports open — all incoming traffic is currently blocked.
                    </div>
                  ) : (
                    inboundRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#151B23] border border-[#263040]"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                          <span className="font-mono font-semibold text-[#F8FAFC]">
                            Port {rule.port}
                          </span>
                          <span className="text-[#94A3B8] font-mono text-[11px]">
                            from {rule.source}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveRule(idx)}
                          className="text-[#94A3B8] hover:text-[#EF4444] p-0.5 cursor-pointer"
                          title="Remove Firewall Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* One-Click Preset Buttons */}
                <div className="pt-1 space-y-1.5">
                  {!hasPort80 && (
                    <button
                      onClick={() =>
                        handleAddRule(80, 'tcp', '0.0.0.0/0', 'Allow HTTP Web Traffic')
                      }
                      className={`w-full py-2 px-3 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isPort80CoachHighlighted
                          ? 'bg-[#F59E0B] text-[#0F141A] ring-2 ring-[#F59E0B]/50 animate-pulse'
                          : 'bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border border-[#10B981]/40'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Allow Inbound Port 80 (HTTP)</span>
                    </button>
                  )}

                  {inspectorMode !== 'basic' && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() =>
                          handleAddRule(443, 'tcp', '0.0.0.0/0', 'Allow HTTPS')
                        }
                        className="py-1.5 px-2 rounded bg-[#151B23] hover:bg-[#1E2631] text-[#CBD5E1] border border-[#263040] text-[11px] font-mono cursor-pointer"
                      >
                        + Port 443 (HTTPS)
                      </button>
                      <button
                        onClick={() =>
                          handleAddRule(5432, 'tcp', '10.0.0.0/16', 'Allow Postgres VPC')
                        }
                        className="py-1.5 px-2 rounded bg-[#151B23] hover:bg-[#1E2631] text-[#CBD5E1] border border-[#263040] text-[11px] font-mono cursor-pointer"
                      >
                        + Port 5432 (DB)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Advanced Component Settings (Shown in intermediate/full mode or specific component types) */}
            {(component.type === 'ec2' || component.type === 'asg') &&
              inspectorMode !== 'basic' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[#94A3B8] mb-1 font-medium">
                      Instance Type
                    </label>
                    <select
                      value={component.config.instanceType || 't3.micro'}
                      onChange={(e) =>
                        onUpdateConfig(component.id, { instanceType: e.target.value })
                      }
                      className="w-full bg-[#0F141A] border border-[#263040] rounded-md px-2.5 py-2 text-[#F8FAFC] font-mono focus:outline-none focus:border-[#38BDF8]"
                    >
                      <option value="t3.micro">t3.micro (1 vCPU · 1GB)</option>
                      <option value="t3.medium">t3.medium (2 vCPU · 4GB)</option>
                      <option value="m5.large">m5.large (2 vCPU · 8GB)</option>
                      <option value="c6g.xlarge">c6g.xlarge (4 vCPU · 8GB)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#94A3B8] mb-1 font-medium">
                      Attached IAM Role
                    </label>
                    <select
                      value={component.config.iamRole || ''}
                      onChange={(e) =>
                        onUpdateConfig(component.id, { iamRole: e.target.value })
                      }
                      className="w-full bg-[#0F141A] border border-[#263040] rounded-md px-2.5 py-2 text-[#F8FAFC] font-mono focus:outline-none focus:border-[#38BDF8]"
                    >
                      <option value="">None</option>
                      <option value="s3:ReadOnly">s3:ReadOnly</option>
                      <option value="s3:ReadWrite">s3:ReadWrite</option>
                      <option value="dynamodb:FullAccess">dynamodb:FullAccess</option>
                      <option value="LeastPrivilegeRole">LeastPrivilegeRole</option>
                      <option value="AdministratorAccess">AdministratorAccess (Unsafe)</option>
                    </select>
                  </div>
                </div>
              )}

            {component.type === 'asg' && (
              <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] space-y-2.5">
                <div className="flex justify-between text-[11px] text-[#94A3B8]">
                  <span>Min Capacity: {component.config.minCapacity || 2}</span>
                  <span className="text-[#F59E0B] font-mono font-bold">
                    Max Capacity: {component.config.maxCapacity || 4}
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={10}
                  value={component.config.maxCapacity || 4}
                  onChange={(e) =>
                    onUpdateConfig(component.id, {
                      minCapacity: 2,
                      maxCapacity: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#F59E0B]"
                />
              </div>
            )}

            {component.type === 'rds' && (
              <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[#F8FAFC] font-medium">Multi-AZ Failover</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Standby replica in a second Availability Zone
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(component.config.multiAZ)}
                    onChange={(e) =>
                      onUpdateConfig(component.id, { multiAZ: e.target.checked })
                    }
                    className="accent-[#F59E0B] w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#263040]">
                  <div>
                    <div className="text-[#F8FAFC] font-medium">Read Replica</div>
                    <div className="text-[10px] text-[#94A3B8]">Offload heavy read queries</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(component.config.readReplica)}
                    onChange={(e) =>
                      onUpdateConfig(component.id, { readReplica: e.target.checked })
                    }
                    className="accent-[#38BDF8] w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#263040]">
                  <div>
                    <div className="text-[#F8FAFC] font-medium">Storage Encryption</div>
                    <div className="text-[10px] text-[#94A3B8]">KMS encryption at rest</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(component.config.encrypted)}
                    onChange={(e) =>
                      onUpdateConfig(component.id, { encrypted: e.target.checked })
                    }
                    className="accent-[#10B981] w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {component.type === 's3' && (
              <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[#F8FAFC] font-medium">Block Public Access</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Keep bucket private from the open internet
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={component.config.blockPublicAccess !== false}
                    onChange={(e) =>
                      onUpdateConfig(component.id, { blockPublicAccess: e.target.checked })
                    }
                    className="accent-[#10B981] w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#263040]">
                  <div>
                    <div className="text-[#F8FAFC] font-medium">Bucket Versioning</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Recover accidentally deleted objects
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(component.config.versioning)}
                    onChange={(e) =>
                      onUpdateConfig(component.id, { versioning: e.target.checked })
                    }
                    className="accent-[#10B981] w-4 h-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#263040]">
                  <div>
                    <div className="text-[#F8FAFC] font-medium">Enable CORS</div>
                    <div className="text-[10px] text-[#94A3B8]">
                      Allow cross-origin browser requests
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(component.config.corsEnabled)}
                    onChange={(e) =>
                      onUpdateConfig(component.id, { corsEnabled: e.target.checked })
                    }
                    className="accent-[#38BDF8] w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {component.type === 'redis' && (
              <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[#94A3B8]">Redis Port:</span>
                  <span className="font-mono text-[#10B981] font-semibold">TCP 6379</span>
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-medium">
                    Cache Eviction Policy
                  </label>
                  <select
                    value={component.config.evictionPolicy || 'allkeys-lru'}
                    onChange={(e) =>
                      onUpdateConfig(component.id, {
                        evictionPolicy: e.target.value as ComponentConfig['evictionPolicy'],
                      })
                    }
                    className="w-full bg-[#151B23] border border-[#263040] rounded-md px-2.5 py-1.5 text-[#F8FAFC] font-mono"
                  >
                    <option value="allkeys-lru">allkeys-lru (Keep Hot Keys)</option>
                    <option value="volatile-ttl">volatile-ttl (Expire by TTL)</option>
                    <option value="noeviction">noeviction</option>
                  </select>
                </div>
              </div>
            )}

            {component.type === 'apigw' && (
              <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] space-y-2.5">
                <div className="flex justify-between text-[11px] text-[#94A3B8]">
                  <span>HTTP 429 Rate Limit:</span>
                  <span className="text-[#A855F7] font-mono font-bold">
                    {component.config.rateLimitRps || 1000} req/s
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={5000}
                  step={200}
                  value={component.config.rateLimitRps || 1000}
                  onChange={(e) =>
                    onUpdateConfig(component.id, {
                      rateLimitRps: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#A855F7]"
                />
              </div>
            )}

            {/* Connected Network Wires */}
            <div className="space-y-2">
              <label className="block text-[#94A3B8] font-medium">
                Connected Wires ({compConnections.length})
              </label>
              {compConnections.length === 0 ? (
                <div className="text-[#64748B] p-2.5 rounded-md bg-[#0F141A] border border-[#263040]">
                  No network wires attached yet.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {compConnections.map((conn) => {
                    const otherId = conn.fromId === component.id ? conn.toId : conn.fromId;
                    const otherComp = allComponents.find((c) => c.id === otherId);
                    const dir = conn.fromId === component.id ? '→' : '←';
                    return (
                      <div
                        key={conn.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#0F141A] border border-[#263040]"
                      >
                        <span className="text-[#E2E8F0]">
                          <span className="text-[#38BDF8] font-mono mr-1.5">{dir}</span>
                          {otherComp?.name || otherId}
                        </span>
                        <button
                          onClick={() => onDeleteConnection(conn.id)}
                          className="text-[#94A3B8] hover:text-[#EF4444] p-1 cursor-pointer"
                          title="Unplug Wire"
                        >
                          <Unlink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Connect Dropdown */}
              <div className="pt-1">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      onConnectTo(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full bg-[#0F141A] border border-[#263040] rounded-md px-2.5 py-2 text-[#CBD5E1] focus:outline-none focus:border-[#38BDF8]"
                >
                  <option value="" disabled>
                    + Connect wire to another block...
                  </option>
                  {allComponents
                    .filter((c) => c.id !== component.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.subnet})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </>
        )}

        {/* Dedicated Firewall Tab (Intermediate / Full Mode) */}
        {activeTab === 'sg' && inspectorMode !== 'basic' && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] text-[#CBD5E1] leading-relaxed">
              Inbound rules control which ports and IP ranges are allowed to reach{' '}
              <strong className="text-[#F8FAFC]">{component.name}</strong>.
            </div>

            <div className="space-y-2">
              {inboundRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-md bg-[#0F141A] border border-[#263040] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#10B981] font-mono font-bold">ALLOW</span>
                      <span className="text-[#F8FAFC] font-mono">
                        {rule.protocol.toUpperCase()} Port {rule.port}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                      Source: {rule.source} {rule.description ? `· ${rule.description}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveRule(idx)}
                    className="p-1 text-[#94A3B8] hover:text-[#EF4444] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Custom Rule Builder */}
            <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] space-y-2.5">
              <div className="font-semibold text-[#F8FAFC]">Add Custom Rule</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[#94A3B8] mb-1">Port</label>
                  <input
                    type="number"
                    value={newPort}
                    onChange={(e) => setNewPort(e.target.value)}
                    className="w-full bg-[#151B23] border border-[#263040] rounded px-2 py-1.5 text-[#F8FAFC] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#94A3B8] mb-1">Source CIDR</label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full bg-[#151B23] border border-[#263040] rounded px-2 py-1.5 text-[#F8FAFC] font-mono"
                  >
                    <option value="0.0.0.0/0">0.0.0.0/0 (Public)</option>
                    <option value="10.0.0.0/16">10.0.0.0/16 (VPC Only)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() =>
                  handleAddRule(
                    Number(newPort) || 80,
                    'tcp',
                    newSource,
                    `Port ${newPort} Inbound`
                  )
                }
                className="w-full py-2 bg-[#38BDF8] hover:bg-[#0284C7] text-[#0F141A] font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Inbound Rule</span>
              </button>
            </div>
          </div>
        )}

        {/* Terraform Tab (Intermediate / Full Mode) */}
        {activeTab === 'hcl' && inspectorMode !== 'basic' && (
          <div className="space-y-3">
            <div className="p-3 rounded-md bg-[#0F141A] border border-[#263040] text-[#CBD5E1] leading-relaxed">
              <div className="text-[11px] font-semibold text-[#F59E0B] mb-1">
                What is this Terraform code?
              </div>
              {hclInfo.explanation}
            </div>
            <pre className="p-3 rounded-md bg-[#0F141A] border border-[#263040] text-[#38BDF8] font-mono text-[11px] overflow-x-auto leading-relaxed">
              {hclInfo.code}
            </pre>
          </div>
        )}
      </div>

      {/* Footer Delete Action (Protected if locked baseline component) */}
      {component.type !== 'client' && (
        <div className="p-3 border-t border-[#263040] bg-[#0F141A]">
          {component.locked ? (
            <div className="w-full py-2 px-3 rounded-md bg-[#151B23] border border-[#263040] text-[#94A3B8] text-[11px] flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
              <span>Protected Scenario Block (Required for Level)</span>
            </div>
          ) : (
            <button
              onClick={() => onDeleteComponent(component.id)}
              className="w-full py-2 rounded-md bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove Block from Board</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
