import { CheckCircle2, Crosshair, XCircle } from 'lucide-react';
import type { TestReport } from '../../engine';
import { useGame } from '../store/GameProvider';
import { useRenderer } from './RendererContext';

/** The result of a failed test: what's still wrong, why, and where on the board. */
export function ReportPanel({ report }: { report: TestReport }) {
  const { dispatch } = useGame();
  const renderer = useRenderer();
  const failed = report.objectives.filter((o) => !o.passed);
  const passed = report.objectives.filter((o) => o.passed);
  const t = report.analysis.telemetry;

  const show = (blockId?: string) => {
    if (!blockId) return;
    renderer?.focusBlock(blockId);
    dispatch({ type: 'select', id: blockId });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="eyebrow !text-bad">Test failed</div>
        <div className="display font-bold text-[16px] mt-0.5">
          {report.analysis.trace.served ? 'Traffic got through, but not every goal is met' : 'No request made it end to end'}
        </div>
        <div className="mt-1 text-[11.5px] text-muted font-mono">
          {t.errorRatePercent}% errors · {t.latencyMs}ms · {t.capacityRps}/{t.demandRps} rps
        </div>
      </div>

      {report.blockingViolations.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <div className="eyebrow">Rule violations</div>
          {report.blockingViolations.map((v) => (
            <div key={v.id} className="rounded-lg border border-bad/40 bg-bad/5 px-2.5 py-2 text-[12px]">
              <div className="flex items-start gap-2">
                <XCircle className="size-4 text-bad shrink-0 mt-px" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{v.title}</div>
                  <div className="text-muted">{v.reason}</div>
                  <div className="mt-1 text-signal">Fix: {v.fix}</div>
                </div>
                {v.blockId && (
                  <button className="btn btn-ghost !p-1" onClick={() => show(v.blockId)} aria-label="Show on board" title="Show on board">
                    <Crosshair className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {failed.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <div className="eyebrow">Goals not met</div>
          {failed.map((o) => (
            <div key={o.id} className="rounded-lg border border-line bg-ink-900/50 px-2.5 py-2 text-[12px]">
              <div className="font-semibold">{o.label}</div>
              <div className="text-muted">{o.detail}</div>
            </div>
          ))}
        </section>
      )}

      {passed.length > 0 && (
        <section className="flex flex-col gap-1">
          <div className="eyebrow">Working</div>
          {passed.map((o) => (
            <div key={o.id} className="flex items-center gap-2 text-[12px] text-text/80">
              <CheckCircle2 className="size-3.5 text-ok shrink-0" />
              {o.label}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
