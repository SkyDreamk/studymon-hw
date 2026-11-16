// Builds the two esbuild ESM artifacts and prints raw / gzip / brotli sizes (report only, never fails on budget).
import { build } from 'esbuild';
import { readFileSync, mkdirSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'src/battle-scene.js');
const buildOnly = process.argv.includes('--build-only');
mkdirSync(join(root, 'dist'), { recursive: true });

const common = { entryPoints: [entry], bundle: true, format: 'esm', minify: true, treeShaking: true, target: 'es2020', legalComments: 'none', logLevel: 'error' };
const targets = [
  { label: 'bundled (Pixi inside)', out: 'dist/battle-scene.min.js', extra: {} },
  { label: 'external (pixi.js external)', out: 'dist/battle-scene.ext.min.js', extra: { external: ['pixi.js'] } },
];
const rows = [];
for (const t of targets) {
  await build({ ...common, ...t.extra, outfile: join(root, t.out) });
  const buf = readFileSync(join(root, t.out));
  rows.push({
    label: t.label,
    file: t.out,
    raw: buf.length,
    gzip: gzipSync(buf, { level: 9 }).length,
    brotli: brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  });
}
if (!buildOnly) {
  const kb = (n) => (n / 1024).toFixed(2);
  console.log('BATTLE-SCENE BUNDLE SIZES');
  for (const r of rows) {
    console.log(`${r.label.padEnd(30)} ${r.file}`);
    console.log(`  raw=${r.raw} bytes  gzip=${r.gzip} bytes (${kb(r.gzip)} KB)  brotli=${r.brotli} bytes (${kb(r.brotli)} KB)`);
  }
  const g = rows[0].gzip / 1024;
  console.log(`reference: care-room accepted 167.94 KB gzip; bundled battle-scene = ${g.toFixed(2)} KB gzip (${g > 168 ? 'over' : 'within'} the ~168 KB soft reference; report only)`);
}
