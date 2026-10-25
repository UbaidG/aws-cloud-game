/**
 * Post-processing, by quality tier: bloom on medium and high, ground-contact ambient occlusion
 * (GTAO) on high. Loaded on demand (BoardRenderer imports it dynamically) so phones on the low tier never download it.
 *
 * Renders through a multisampled half-float target, so edges stay antialiased and emissive parts
 * (LEDs, packets, screens) keep values above 1 for the bloom threshold.
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export interface PostFxOptions {
  bloom: boolean;
  ao: boolean;
}

export class PostFx {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass | null = null;
  private readonly ao: GTAOPass | null = null;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, options: PostFxOptions) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    if (options.ao) {
      this.ao = new GTAOPass(scene, camera, size.x, size.y);
      this.ao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.5, thickness: 1, scale: 1, samples: 12 });
      this.ao.blendIntensity = 0.8;
      this.composer.addPass(this.ao);
    }
    if (options.bloom) {
      // Only emissive parts get past a threshold of 1 (lit surfaces stay under it).
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.45, 1);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
  }

  render(dt: number): void {
    this.composer.render(dt);
  }

  dispose(): void {
    this.ao?.dispose();
    this.bloom?.dispose();
    this.composer.dispose();
  }
}
