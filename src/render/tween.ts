/**
 * A tiny tween and timeline system driven by the render loop. Shared by in-world animation and
 * cutscenes so everything moves on one clock (and pauses together).
 */

export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
} satisfies Record<string, Ease>;

export interface TweenSpec {
  /** Milliseconds. */
  duration: number;
  delay?: number;
  ease?: Ease;
  /** Called every frame with eased progress 0..1. */
  update: (t: number) => void;
  complete?: () => void;
}

export interface TweenHandle {
  /** Resolves when the tween completes or is cancelled. */
  done: Promise<void>;
  cancel: () => void;
}

interface Running {
  spec: TweenSpec;
  elapsed: number;
  resolve: () => void;
  cancelled: boolean;
}

export class Tweens {
  private running: Running[] = [];

  add(spec: TweenSpec): TweenHandle {
    let resolve!: () => void;
    const done = new Promise<void>((r) => (resolve = r));
    const entry: Running = { spec, elapsed: -(spec.delay ?? 0), resolve, cancelled: false };
    this.running.push(entry);
    return {
      done,
      cancel: () => {
        if (entry.cancelled) return;
        entry.cancelled = true;
        resolve();
      },
    };
  }

  /** Resolve after `ms` on the render clock. */
  wait(ms: number): Promise<void> {
    return this.add({ duration: ms, update: () => {} }).done;
  }

  /** Advance every tween by `dtMs`. Tweens added during callbacks start on the next frame. */
  update(dtMs: number): void {
    if (this.running.length === 0) return;
    const snapshot = this.running.slice();
    const finished = new Set<Running>();
    for (const entry of snapshot) {
      if (entry.cancelled) {
        finished.add(entry);
        continue;
      }
      entry.elapsed += dtMs;
      if (entry.elapsed < 0) continue;
      const { spec } = entry;
      const raw = spec.duration <= 0 ? 1 : Math.min(1, entry.elapsed / spec.duration);
      spec.update((spec.ease ?? ease.outCubic)(raw));
      if (raw >= 1) {
        finished.add(entry);
        spec.complete?.();
        entry.resolve();
      }
    }
    this.running = this.running.filter((e) => !finished.has(e) && !e.cancelled);
  }

  get active(): boolean {
    return this.running.length > 0;
  }

  /** Cancel everything (level change, dispose). */
  clear(): void {
    for (const entry of this.running) {
      entry.cancelled = true;
      entry.resolve();
    }
    this.running = [];
  }
}
