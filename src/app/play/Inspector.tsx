import { Cable, Lock, Move, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import {
  CATALOG,
  azAt,
  blockCost,
  isValidCidr,
  zoneAt,
  zoneSpec,
  type Block,
  type BlockConfig,
  type FirewallRule,
  type Health,
} from '../../engine';
import { useGame } from '../store/GameProvider';
import { AwsServiceIcon } from '../ServiceIcon';
import { coachTarget, useCoach } from '../hooks/useCoach';
import {
  PORT_PRESETS,
  SOURCE_PRESETS,
  fieldsFor,
  hasFirewall,
  hasRule,
  modeAllows,
  sourceLabel,
  type FieldSpec,
  type InspectorMode,
} from '../lib/inspectorFields';

const HEALTH: Record<Health, { label: string; className: string }> = {
  healthy: { label: 'Healthy', className: 'text-ok border-ok/40 bg-ok/10' },
  overloaded: { label: 'Overloaded', className: 'text-warn border-warn/40 bg-warn/10' },
  down: { label: 'Down', className: 'text-bad border-bad/40 bg-bad/10' },
  unreachable: { label: 'No traffic', className: 'text-muted border-line-strong' },
  idle: { label: 'Idle', className: 'text-muted border-line-strong' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="eyebrow">{title}</div>
      {children}
    </section>
  );
}

function Toggle({ checked, onChange, label, help, coach }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string; coach?: object }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 -mx-2 hover:bg-ink-700/50" {...coach}>
      <span className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block w-8 h-[18px] rounded-full bg-ink-500 peer-checked:bg-ok transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-signal" />
        <span className="absolute top-0.5 left-0.5 size-3.5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold">{label}</span>
        {help && <span className="block text-[11px] text-muted leading-snug">{help}</span>}
      </span>
    </label>
  );
}

function Field({ field, config, onChange }: { field: FieldSpec; config: BlockConfig; onChange: (patch: Partial<BlockConfig>) => void }) {
  const value = config[field.key];
  if (field.kind === 'toggle') {
    return <Toggle checked={value === true} onChange={(v) => onChange({ [field.key]: v })} label={field.label} help={field.help} />;
  }
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12.5px] font-semibold">{field.label}</span>
      {field.kind === 'select' ? (
        <select
          className="field"
          value={String(value ?? '')}
          onChange={(e) => {
            const opt = field.options.find((o) => String(o.value) === e.target.value);
            onChange({ [field.key]: opt?.value === '' ? undefined : opt?.value });
          }}
        >
          {field.options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="field"
            min={field.min}
            max={field.max}
            step={field.step}
            value={typeof value === 'number' ? value : ''}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) onChange({ [field.key]: Math.max(field.min, Math.min(field.max, n)) });
            }}
          />
          {field.unit && <span className="text-[11px] text-muted font-mono">{field.unit}</span>}
        </div>
      )}
      <span className="text-[11px] text-muted leading-snug">{field.help}</span>
    </label>
  );
}

const validPort = (p: string) => {
  if (p === 'all') return true;
  const [a, b] = p.split('-').map(Number);
  const ok = (n: number) => Number.isInteger(n) && n >= 1 && n <= 65535;
  return p.includes('-') ? ok(a) && ok(b) && a <= b : ok(a);
};

function Firewall({ block, mode }: { block: Block; mode: InspectorMode }) {
  const { dispatch } = useGame();
  const coach = useCoach();
  const rules = block.config.securityGroupInbound ?? [];
  const [port, setPort] = useState('443');
  const [source, setSource] = useState('0.0.0.0/0');
  const [error, setError] = useState<string | null>(null);
  const setRules = (next: FirewallRule[]) => dispatch({ type: 'updateConfig', id: block.id, patch: { securityGroupInbound: next } });

  const quick = (p: number, on: boolean) =>
    setRules(on ? [...rules, { protocol: 'tcp', port: p, source: '0.0.0.0/0' }] : rules.filter((r) => !(String(r.port) === String(p) && r.source === '0.0.0.0/0')));

  const add = () => {
    const portValue = port.trim();
    const src = source.trim();
    if (!validPort(portValue)) return setError('Use a port from 1 to 65535, a range like 8000-8080, or "all".');
    if (src !== 'vpc' && !isValidCidr(src)) return setError('Use a CIDR like 10.0.0.0/16.');
    if (rules.some((r) => String(r.port) === portValue && r.source === src)) return setError('That rule already exists.');
    setError(null);
    setRules([...rules, { protocol: 'tcp', port: /^\d+$/.test(portValue) ? Number(portValue) : portValue, source: src }]);
  };

  return (
    <Section title="Firewall (security group)">
      <p className="text-[11px] text-muted -mt-1">Inbound traffic is blocked unless a rule allows its port and where it comes from.</p>
      {!modeAllows(mode, 'intermediate') ? (
        <div className="flex flex-col">
          <Toggle
            checked={hasRule(rules, 80)}
            onChange={(on) => quick(80, on)}
            label="Allow HTTP (port 80) from anyone"
            help="Web browsers connect on port 80."
            coach={coachTarget(coach, 'inspector-port80')}
          />
          <Toggle checked={hasRule(rules, 443)} onChange={(on) => quick(443, on)} label="Allow HTTPS (port 443) from anyone" help="Encrypted web traffic uses port 443." />
        </div>
      ) : (
        <>
          {rules.length === 0 ? (
            <div className="text-[12px] rounded-lg border border-bad/30 bg-bad/5 px-2.5 py-2 text-red-200">No inbound rules: nothing can reach this.</div>
          ) : (
            <ul className="flex flex-col gap-1" {...coachTarget(coach, 'inspector-port80')}>
              {rules.map((rule, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border border-line bg-ink-900/50 px-2 py-1.5">
                  <span className="font-mono text-[11.5px] text-signal w-14 shrink-0">{String(rule.port)}</span>
                  <select
                    className="field !py-1 !text-[11.5px]"
                    value={rule.source}
                    onChange={(e) => setRules(rules.map((r, k) => (k === i ? { ...r, source: e.target.value } : r)))}
                    aria-label={`Source for port ${rule.port}`}
                  >
                    {!SOURCE_PRESETS.some((p) => p.source === rule.source) && <option value={rule.source}>{rule.source}</option>}
                    {SOURCE_PRESETS.map((p) => (
                      <option key={p.source} value={p.source}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-ghost !p-1" onClick={() => setRules(rules.filter((_, k) => k !== i))} aria-label={`Remove rule for port ${rule.port} from ${sourceLabel(rule.source)}`}>
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-line-strong p-2">
            <div className="flex gap-1.5">
              {modeAllows(mode, 'full') ? (
                <input className="field !w-24 font-mono" value={port} onChange={(e) => setPort(e.target.value)} aria-label="Port" list="cc-port-presets" />
              ) : (
                <select className="field !w-36" value={port} onChange={(e) => setPort(e.target.value)} aria-label="Port">
                  {PORT_PRESETS.map((p) => (
                    <option key={p.port} value={String(p.port)}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
              {modeAllows(mode, 'full') ? (
                <input className="field font-mono" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source CIDR" list="cc-source-presets" />
              ) : (
                <select className="field" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source">
                  {SOURCE_PRESETS.map((p) => (
                    <option key={p.source} value={p.source}>
                      {p.label}
                    </option>
                  ))}
                </select>
              )}
              <button className="btn btn-primary !px-2 shrink-0" onClick={add} aria-label="Add rule">
                <Plus className="size-4" />
              </button>
            </div>
            {error && <div className="text-[11px] text-bad">{error}</div>}
            <datalist id="cc-port-presets">
              {PORT_PRESETS.map((p) => (
                <option key={p.port} value={p.port}>
                  {p.label}
                </option>
              ))}
            </datalist>
            <datalist id="cc-source-presets">
              {SOURCE_PRESETS.map((p) => (
                <option key={p.source} value={p.source}>
                  {p.label}
                </option>
              ))}
            </datalist>
          </div>
        </>
      )}
    </Section>
  );
}

export function BlockInspector({ block }: { block: Block }) {
  const { state, dispatch, level, live } = useGame();
  const [name, setName] = useState(block.name);
  const [nameFor, setNameFor] = useState(block.id);
  if (nameFor !== block.id) {
    setNameFor(block.id);
    setName(block.name);
  }
  if (!level || !live || !state.session) return null;
  const spec = CATALOG[block.type];
  const mode = level.inspectorMode;
  const zone = zoneSpec(zoneAt(block.gridX));
  const az = azAt(block.gridX, block.gridZ);
  const health: Health = block.fault === 'crashed' ? 'down' : (live.analysis.health[block.id] ?? 'idle');
  const fields = block.type === 'client' ? [] : fieldsFor(block.type, mode);
  const violations = live.analysis.violations.filter((v) => v.blockId === block.id && !v.wireId);
  const links = live.analysis.links.filter((l) => l.fromId === block.id || l.toId === block.id);
  const names = new Map(state.session.board.blocks.map((b) => [b.id, b.name]));
  const patch = (p: Partial<BlockConfig>) => dispatch({ type: 'updateConfig', id: block.id, patch: p });
  const locked = !!block.locked;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <AwsServiceIcon type={block.type} size={40} />
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent font-bold text-[15px] rounded px-1 -mx-1 hover:bg-ink-700/60 focus:bg-ink-900 focus:outline-none focus:ring-1 focus:ring-signal"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== block.name && dispatch({ type: 'rename', id: block.id, name })}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            aria-label="Block name"
            disabled={block.type === 'client'}
          />
          <div className="text-[11.5px] text-muted">{spec.name}</div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className={`chip ${HEALTH[health].className}`}>{HEALTH[health].label}</span>
            <span className="chip" style={{ color: zone.color, borderColor: `${zone.color}66` }}>
              {zone.label}
            </span>
            {az !== 'global' && <span className="chip font-mono">{az}</span>}
            {block.type !== 'client' && <span className="chip font-mono">${blockCost(block.type, block.config)}/mo</span>}
            {locked && (
              <span className="chip">
                <Lock className="size-3" /> Scenario
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-[12.5px] text-text/85 leading-relaxed -mt-1">{spec.plainEnglishTip}</p>

      <div className="grid grid-cols-3 gap-1.5">
        <button className="btn !text-[11.5px]" onClick={() => dispatch({ type: 'beginWire', id: block.id })} disabled={state.running}>
          <Cable className="size-3.5" /> Wire
        </button>
        <button className="btn !text-[11.5px]" onClick={() => dispatch({ type: 'beginMove', id: block.id })} disabled={locked || state.running}>
          <Move className="size-3.5" /> Move
        </button>
        <button className="btn btn-danger !text-[11.5px]" onClick={() => dispatch({ type: 'remove', id: block.id })} disabled={locked || state.running}>
          <Trash2 className="size-3.5" /> Delete
        </button>
      </div>

      {violations.length > 0 && (
        <Section title="Problems">
          {violations.map((v) => (
            <div key={v.id} className={`rounded-lg border px-2.5 py-2 text-[12px] ${v.severity === 'error' ? 'border-bad/40 bg-bad/5' : 'border-warn/40 bg-warn/5'}`}>
              <div className="font-semibold">{v.title}</div>
              <div className="text-muted">{v.reason}</div>
              <div className="mt-1 text-signal">Fix: {v.fix}</div>
            </div>
          ))}
        </Section>
      )}

      {links.length > 0 && (
        <Section title={`Connections (${links.length})`}>
          <ul className="flex flex-col gap-1">
            {links.map((l) => {
              const other = l.fromId === block.id ? l.toId : l.fromId;
              const dir = l.fromId === block.id ? '→' : '←';
              const wire = state.session!.board.wires.find((w) => w.id === l.wireId);
              return (
                <li key={l.wireId} className="flex items-center gap-2 rounded-lg border border-line bg-ink-900/50 px-2 py-1.5 text-[12px]">
                  <span className={`size-2 rounded-full shrink-0 ${l.allowed ? 'bg-ok' : 'bg-bad'}`} />
                  <span className="text-muted font-mono">{dir}</span>
                  <span className="flex-1 truncate">{names.get(other)}</span>
                  <span className="font-mono text-[10.5px] text-faint">{l.kind === 'request' ? `:${l.port}` : l.kind}</span>
                  {!wire?.locked && (
                    <button className="btn btn-ghost !p-1" onClick={() => dispatch({ type: 'disconnect', wireId: l.wireId })} aria-label={`Disconnect from ${names.get(other)}`} disabled={state.running}>
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {fields.length > 0 && (
        <Section title="Settings">
          <div className="flex flex-col gap-3">
            {fields.map((f) => (
              <Field key={f.key} field={f} config={block.config} onChange={patch} />
            ))}
          </div>
        </Section>
      )}

      {hasFirewall(block.config) && <Firewall block={block} mode={mode} />}
    </div>
  );
}

export function WireInspector({ wireId }: { wireId: string }) {
  const { state, dispatch, live } = useGame();
  const wire = state.session?.board.wires.find((w) => w.id === wireId);
  const link = live?.analysis.links.find((l) => l.wireId === wireId);
  if (!wire || !state.session) return null;
  const names = new Map(state.session.board.blocks.map((b) => [b.id, b.name]));
  const violation = live?.analysis.violations.find((v) => v.wireId === wireId);
  const kindLabel = { request: 'Request path', egress: 'Outbound (egress) path', governance: 'Governance link', attachment: 'Disk attachment' };
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="eyebrow">Wire</div>
        <div className="font-bold text-[15px] mt-0.5">
          {names.get(link?.fromId ?? wire.a)} <span className="text-muted">→</span> {names.get(link?.toId ?? wire.b)}
        </div>
        {link && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className={`chip ${link.allowed ? 'text-ok border-ok/40' : 'text-bad border-bad/40'}`}>{link.allowed ? 'Allowed' : 'Blocked'}</span>
            <span className="chip">{kindLabel[link.kind]}</span>
            {link.kind === 'request' && <span className="chip font-mono">port {link.port}</span>}
          </div>
        )}
      </div>
      {violation && (
        <div className="rounded-lg border border-bad/40 bg-bad/5 px-2.5 py-2 text-[12px]">
          <div className="font-semibold">{violation.title}</div>
          <div className="text-muted">{violation.reason}</div>
          <div className="mt-1 text-signal">Fix: {violation.fix}</div>
        </div>
      )}
      <button className="btn btn-danger" disabled={wire.locked || state.running} onClick={() => dispatch({ type: 'disconnect', wireId })}>
        <Trash2 className="size-3.5" /> {wire.locked ? 'Scenario wire' : 'Remove wire'}
      </button>
    </div>
  );
}
