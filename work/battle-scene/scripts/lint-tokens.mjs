// Greps demo + module CSS / inline styles against the design-token whitelist.
// Documented exceptions: the court colour #E8D4B8 (the only non-token colour).
// The Pixi-only 0xRRGGBB constants must also be token colours (0x7A6552 silhouette, 0xFF9F43 flash/ball, ...).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['src/battle-scene.js', 'demo/index.html', 'demo/demo.js', 'demo/mock-api.js'];
const COLORS = new Set(['#FFF7E8', '#FF9F43', '#3D2C1E', '#7A6552', '#F0E2CC', '#FFF', '#FFFFFF', '#E8D4B8']);
const SIZES = new Set([14, 16, 18, 20, 22]);
const WEIGHTS = new Set([400, 500, 600]);
const SHADOW = '0 2px 8px rgba(120,80,30,.12)';
const problems = [];

for (const f of files) {
  const text = readFileSync(join(root, f), 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const at = `${f}:${i + 1}`;
    for (const m of line.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (!COLORS.has(m[0].toUpperCase())) problems.push(`${at} colour ${m[0]} not in whitelist`);
    }
    for (const m of line.matchAll(/0x([0-9a-fA-F]{6})\b/g)) {
      if (!COLORS.has(`#${m[1].toUpperCase()}`)) problems.push(`${at} colour 0x${m[1]} not in whitelist`);
    }
    for (const m of line.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) {
      if (!SIZES.has(Number(m[1]))) problems.push(`${at} font-size ${m[1]}px not in 14/16/18/20/22`);
    }
    for (const m of line.matchAll(/font-weight:\s*(\w+)/g)) {
      if (!WEIGHTS.has(Number(m[1]))) problems.push(`${at} font-weight ${m[1]} not in 400/500/600`);
    }
    for (const m of line.matchAll(/box-shadow:\s*([^;}'"`]+)/g)) {
      const v = m[1].trim();
      if (v !== 'none' && v !== SHADOW) problems.push(`${at} box-shadow "${v}" is not the single token shadow`);
    }
    if (/\bfilter:\s*drop-shadow|\btext-shadow:/.test(line)) problems.push(`${at} extra shadow style`);
  });
}

if (problems.length) {
  console.error(`lint-tokens: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`lint-tokens: OK (${files.length} files; colours/sizes/weights/shadow within the whitelist)`);
