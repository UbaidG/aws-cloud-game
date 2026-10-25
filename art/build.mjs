/**
 * Build CloudCraft's 3D models.
 *
 *   node art/build.mjs                # every model in art/models/
 *   node art/build.mjs ec2 alb        # just these
 *   node art/build.mjs --preview      # also render Blender previews (art/.out/<name>.png)
 *
 * Each model script runs in its own headless Blender (4 at a time). The raw .glb is then
 * compressed (meshopt + quantisation) into public/models/, and src/render/assets/models.json is
 * updated with every model's height, sockets, triangle count and size.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization, ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, weld, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLENDER = process.env.BLENDER ?? '/Applications/Blender.app/Contents/MacOS/Blender';
const RAW = join(ROOT, 'art/.out');
const PUBLIC = join(ROOT, 'public/models');
const MANIFEST = join(ROOT, 'src/render/assets/models.json');

const args = process.argv.slice(2);
const preview = args.includes('--preview');
const all = readdirSync(join(ROOT, 'art/models')).filter((f) => f.endsWith('.py')).map((f) => f.slice(0, -3));
const names = args.filter((a) => !a.startsWith('--'));
const todo = names.length ? names : all;
for (const n of todo) if (!all.includes(n)) throw new Error(`No model script art/models/${n}.py`);

mkdirSync(RAW, { recursive: true });
mkdirSync(PUBLIC, { recursive: true });

function blender(name) {
  return new Promise((resolve, reject) => {
    const argv = ['-b', '--factory-startup', '-P', join(ROOT, 'art/models', `${name}.py`), '--', RAW];
    if (preview) argv.push('--preview');
    const p = spawn(BLENDER, argv, { stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    p.stdout.on('data', (d) => (log += d));
    p.stderr.on('data', (d) => (log += d));
    p.on('close', (code) => {
      if (code === 0 && log.includes('CC_DONE')) resolve();
      else reject(new Error(`${name} failed (exit ${code}):\n${log.split('\n').filter((l) => /Error|Traceback|line \d+/.test(l)).join('\n') || log.slice(-2000)}`));
    });
  });
}

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

async function optimize(name) {
  const doc = await io.read(join(RAW, `${name}.glb`));
  await doc.transform(dedup(), weld(), prune({ keepLeaves: true }), reorder({ encoder: MeshoptEncoder }), quantize({ quantizeNormal: 10, quantizePosition: 14, quantizeTexcoord: 12 }));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  await io.write(join(PUBLIC, `${name}.glb`), doc);
}

const queue = [...todo];
const failures = [];
const t0 = Date.now();
await Promise.all(
  Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const name = queue.shift();
      try {
        await blender(name);
        await optimize(name);
        console.log(`✓ ${name}`);
      } catch (e) {
        failures.push(name);
        console.error(`✗ ${e.message}`);
      }
    }
  }),
);

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
for (const name of todo) {
  if (failures.includes(name)) continue;
  const meta = JSON.parse(readFileSync(join(RAW, `${name}.json`), 'utf8'));
  meta.bytes = statSync(join(PUBLIC, `${name}.glb`)).size;
  manifest[name] = meta;
}
const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
writeFileSync(MANIFEST, JSON.stringify(sorted, null, 1) + '\n');
for (const name of todo) if (!failures.includes(name)) {
  const m = manifest[name];
  console.log(`  ${name.padEnd(12)} ${String(m.triangles).padStart(6)} tris  ${(m.bytes / 1024).toFixed(1).padStart(6)} KB  h=${m.height}`);
}
console.log(`${todo.length - failures.length}/${todo.length} built in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (failures.length) process.exit(1);
