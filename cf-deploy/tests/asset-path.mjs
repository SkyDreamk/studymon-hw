// 解析 hash 后的静态资源路径：有 asset-manifest.json 就按映射，无则回落基准名（hash 前也能跑）。
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'static');
let map = {};
try {
  const m = join(root, 'asset-manifest.json');
  if (existsSync(m)) map = JSON.parse(readFileSync(m, 'utf8')).files || {};
} catch (_) { /* 回落基准名 */ }
export function assetPath(rel) { // rel 如 'app.js' / 'style.css' / 'img'
  const hit = map['static/' + rel] || map[rel];
  return hit ? join(root, hit.replace(/^static\//, '')) : join(root, rel);
}
export function assetHash() {
  try {
    const m = join(root, 'asset-manifest.json');
    if (existsSync(m)) return JSON.parse(readFileSync(m, 'utf8')).hash || null;
  } catch (_) {}
  return null;
}
