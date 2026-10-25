/**
 * Procedural sound effects (Web Audio, no files). Every cue the game makes is a named method here,
 * so sound design changes happen in one place. The context is created lazily on the first cue,
 * which always follows a user gesture.
 */

type Wave = OscillatorType;

interface Tone {
  freq: number;
  /** Optional glide target. */
  to?: number;
  wave?: Wave;
  /** Seconds after the cue starts. */
  at?: number;
  dur: number;
  gain: number;
}

class SoundSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private volume = 0.6;

  private context(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted && this.ctx?.state === 'running') this.ctx.suspend().catch(() => {});
  }

  get isMuted(): boolean {
    return this.muted;
  }

  private play(tones: Tone[]): void {
    const ctx = this.context();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    for (const tone of tones) {
      const t = now + (tone.at ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.wave ?? 'sine';
      osc.frequency.setValueAtTime(tone.freq, t);
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, t + tone.dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(tone.gain, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.dur);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + tone.dur + 0.02);
    }
  }

  click(): void {
    this.play([{ freq: 1200, to: 900, wave: 'square', dur: 0.03, gain: 0.04 }]);
  }

  pick(): void {
    this.play([{ freq: 660, to: 990, wave: 'triangle', dur: 0.07, gain: 0.08 }]);
  }

  place(): void {
    this.play([
      { freq: 180, to: 70, wave: 'triangle', dur: 0.16, gain: 0.3 },
      { freq: 1800, to: 1200, wave: 'square', at: 0.05, dur: 0.03, gain: 0.04 },
    ]);
  }

  connect(): void {
    this.play([
      { freq: 520, to: 1040, wave: 'sine', dur: 0.12, gain: 0.14 },
      { freq: 1560, wave: 'triangle', at: 0.1, dur: 0.06, gain: 0.06 },
    ]);
  }

  remove(): void {
    this.play([{ freq: 400, to: 120, wave: 'sawtooth', dur: 0.14, gain: 0.07 }]);
  }

  /** The engine refused an action. */
  deny(): void {
    this.play([
      { freq: 220, wave: 'square', dur: 0.07, gain: 0.07 },
      { freq: 180, wave: 'square', at: 0.08, dur: 0.09, gain: 0.07 },
    ]);
  }

  runStart(): void {
    this.play([{ freq: 200, to: 800, wave: 'sawtooth', dur: 0.35, gain: 0.05 }]);
  }

  packetDrop(): void {
    this.play([{ freq: 300, to: 90, wave: 'sawtooth', dur: 0.18, gain: 0.1 }]);
  }

  fail(): void {
    this.play([
      { freq: 200, to: 150, wave: 'sawtooth', dur: 0.22, gain: 0.12 },
      { freq: 150, to: 100, wave: 'sawtooth', at: 0.22, dur: 0.3, gain: 0.12 },
    ]);
  }

  stageClear(): void {
    this.play([523.25, 659.25, 783.99].map((freq, i) => ({ freq, wave: 'triangle' as Wave, at: i * 0.08, dur: 0.22, gain: 0.14 })));
  }

  victory(): void {
    this.play([
      ...[523.25, 659.25, 783.99, 1046.5].map((freq, i) => ({ freq, wave: 'triangle' as Wave, at: i * 0.1, dur: 0.3, gain: 0.16 })),
      { freq: 1318.5, wave: 'sine', at: 0.42, dur: 0.6, gain: 0.12 },
    ]);
  }

  /** One star landing in the debrief; pitch rises per star. */
  star(index: number): void {
    const base = [880, 1108.73, 1318.51][index] ?? 1318.51;
    this.play([
      { freq: base, wave: 'sine', dur: 0.25, gain: 0.14 },
      { freq: base * 2, wave: 'sine', at: 0.03, dur: 0.18, gain: 0.05 },
    ]);
  }

  levelUp(): void {
    this.play([392, 523.25, 659.25, 783.99, 1046.5].map((freq, i) => ({ freq, wave: 'square' as Wave, at: i * 0.06, dur: 0.16, gain: 0.05 })));
  }

  hint(): void {
    this.play([
      { freq: 988, wave: 'sine', dur: 0.12, gain: 0.08 },
      { freq: 1319, wave: 'sine', at: 0.1, dur: 0.18, gain: 0.08 },
    ]);
  }
}

export const sound = new SoundSystem();
