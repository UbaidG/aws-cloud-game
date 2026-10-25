import { Activity, DollarSign, Gauge, ShieldCheck } from 'lucide-react';
import { currentStage, levelBudget, objectivesUpTo } from '../../engine';
import { useGame } from '../store/GameProvider';

interface Readout {
  icon: typeof Gauge;
  label: string;
  value: string;
  target?: string;
  status: 'ok' | 'bad' | 'neutral';
}

const STATUS = { ok: 'text-ok', bad: 'text-bad', neutral: 'text-text' };

/** Live gauges. Targets come from the stage's SLA objectives, so what you see is what the referee checks. */
export function TelemetryHud() {
  const { state, level, live } = useGame();
  if (!level || !state.session || !live) return null;
  const t = live.analysis.telemetry;
  const stage = currentStage(level, state.session.stageIdx);
  const sla = objectivesUpTo(level, state.session.stageIdx).filter((o) => o.kind === 'sla');
  const pick = <K extends 'maxLatencyMs' | 'minCapacityRps' | 'maxCostUsd' | 'minSecurityScore'>(k: K) => {
    for (const o of sla) if (o.kind === 'sla' && o[k] !== undefined) return o[k] as number;
    return undefined;
  };
  const maxLatency = pick('maxLatencyMs');
  const minCapacity = pick('minCapacityRps');
  const maxCost = pick('maxCostUsd');
  const minSecurity = pick('minSecurityScore');
  const budget = levelBudget(level);
  const served = live.analysis.trace.served;

  const readouts: Readout[] = [
    {
      icon: Activity,
      label: 'Latency',
      value: served ? `${t.latencyMs}ms` : '—',
      target: maxLatency !== undefined ? `≤ ${maxLatency}ms` : undefined,
      status: maxLatency === undefined || !served ? 'neutral' : t.latencyMs <= maxLatency ? 'ok' : 'bad',
    },
    {
      icon: Gauge,
      label: 'Capacity',
      value: `${t.capacityRps.toLocaleString()} rps`,
      target: `${(minCapacity ?? stage.load?.rps ?? t.demandRps).toLocaleString()} needed`,
      status: t.capacityRps >= (minCapacity ?? t.demandRps) ? 'ok' : 'bad',
    },
    {
      icon: DollarSign,
      label: 'Cost',
      value: `$${t.monthlyCostUsd}/mo`,
      target: maxCost !== undefined ? `≤ $${maxCost}` : `★ ≤ $${budget}`,
      status: t.monthlyCostUsd <= (maxCost ?? budget) ? 'ok' : maxCost !== undefined ? 'bad' : 'neutral',
    },
    {
      icon: ShieldCheck,
      label: 'Security',
      value: `${t.securityScore}`,
      target: minSecurity !== undefined ? `≥ ${minSecurity}` : undefined,
      status: minSecurity === undefined ? (t.securityScore >= 80 ? 'ok' : 'neutral') : t.securityScore >= minSecurity ? 'ok' : 'bad',
    },
  ];

  return (
    <div className="pointer-events-auto panel grid grid-cols-4 gap-x-2 sm:gap-x-4 px-2.5 py-1.5 sm:px-3 sm:py-2" aria-label="Live telemetry">
      {readouts.map(({ icon: Icon, label, value, target, status }) => (
        <div key={label} className="min-w-0 sm:min-w-[78px]" title={label}>
          <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-muted font-bold">
            <Icon className="size-3 shrink-0" /> <span className="hidden sm:inline">{label}</span>
          </div>
          <div className={`font-mono font-bold text-[12px] sm:text-[13px] truncate ${STATUS[status]}`}>{value}</div>
          {target && <div className="font-mono text-[9.5px] text-faint truncate">{target}</div>}
        </div>
      ))}
    </div>
  );
}
