/**
 * Quality tiers. Phones and software renderers get `low`; everything visual that costs GPU time
 * is gated on the tier so the board stays smooth everywhere.
 */

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualitySettings {
  tier: QualityTier;
  pixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  shadowMapSize: number;
  /** Environment reflections from a PMREM room. */
  environment: boolean;
  /** Glow around LEDs, packets and screens (post-processing). */
  bloom: boolean;
  /** Screen-space ambient occlusion (post-processing). */
  ao: boolean;
  /** Max packets animated at once. */
  maxPackets: number;
}

const PRESETS: Record<QualityTier, Omit<QualitySettings, 'tier' | 'pixelRatio'> & { maxPixelRatio: number }> = {
  low: { maxPixelRatio: 1.25, antialias: false, shadows: false, shadowMapSize: 512, environment: true, bloom: false, ao: false, maxPackets: 48 },
  medium: { maxPixelRatio: 1.75, antialias: true, shadows: true, shadowMapSize: 1024, environment: true, bloom: true, ao: false, maxPackets: 96 },
  high: { maxPixelRatio: 2, antialias: true, shadows: true, shadowMapSize: 2048, environment: true, bloom: true, ao: true, maxPackets: 160 },
};

export function settingsFor(tier: QualityTier, devicePixelRatio = 1): QualitySettings {
  const { maxPixelRatio, ...rest } = PRESETS[tier];
  return { tier, pixelRatio: Math.min(devicePixelRatio, maxPixelRatio), ...rest };
}

let probed: { webgl2: boolean; software: boolean } | null = null;

/** Probe the GPU once, releasing the probe context so it doesn't count against the browser limit. */
function probeGpu(): { webgl2: boolean; software: boolean } {
  if (probed) return probed;
  probed = { webgl2: false, software: false };
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      probed.webgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
      probed.software = /swiftshader|llvmpipe|software|basic render/i.test(name);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // Probing is best effort; fall through to the defaults.
  }
  return probed;
}

/** Pick a tier for this device. A stored user override always wins. */
export function detectQuality(override?: QualityTier | null): QualitySettings {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  if (override) return settingsFor(override, dpr);
  const gpu = probeGpu();
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  let tier: QualityTier = 'high';
  if (gpu.software) tier = 'low';
  else if (coarse || cores <= 4 || !gpu.webgl2) tier = 'medium';
  return settingsFor(tier, dpr);
}
