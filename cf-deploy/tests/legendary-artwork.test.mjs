// 传说 4 种立绘覆盖（2026-11-07）：稀有转盘发蛋后 petImg(144/145/146/150) 须有图可指。
// 144/145/146/150 从不进野外池，前六批立绘都没取，nos 表里也没有——
// 轮换脚本只重命名 nos 表里的种，漏了它们就会拼出 404。
// 本测试钉住两点：RARE_WHEEL_LEGENDARIES 的每种都在 nos 里；每种在磁盘上都有当前 hash 的图。
// 解析 nos 时必须先去掉 // 注释再取数字——注释里的“2026-11-07”会被误认成数字
//（备战补漏批审校第一次算错成 18 种就是这么来的）；同时断言解析结果不含 2026，把去注释钉死。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const M = await import(new URL('../src/index.js', import.meta.url));
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseNos() {
  const src = readFileSync(join(root, 'scripts/hash-assets.mjs'), 'utf8');
  const m = src.match(/const nos = \[([\s\S]*?)\];/);
  assert.ok(m, 'hash-assets.mjs 里找不到 const nos = [...]');
  const stripped = m[1].replace(/\/\/.*$/gm, '');
  return stripped.match(/\d+/g).map(Number);
}

function manifest() {
  return JSON.parse(readFileSync(join(root, 'public/static/asset-manifest.json'), 'utf8'));
}

test('RARE_WHEEL_LEGENDARIES 四种都在 hash-assets.mjs 的 nos 表里', () => {
  const nos = parseNos();
  assert.ok(!nos.includes(2026), 'nos 解析混入注释里的 2026：去注释失效');
  assert.equal(new Set(nos).size, nos.length, 'nos 表有重复编号');
  assert.deepEqual(M.RARE_WHEEL_LEGENDARIES, [144, 145, 146, 150], 'RARE_WHEEL_LEGENDARIES 应为 144/145/146/150');
  const missing = M.RARE_WHEEL_LEGENDARIES.filter(no => !nos.includes(no));
  assert.deepEqual(missing, [], `以下传说种不在 nos 表里，轮换会漏掉它们的立绘：${missing.join(',')}`);
});

test('传说四种在磁盘上都有当前 hash 的立绘文件', () => {
  const m = manifest();
  const h = m.hash;
  assert.match(h, /^[0-9a-f]{8}$/, 'manifest hash 应为 8 位十六进制');
  const missing = [];
  for (const no of M.RARE_WHEEL_LEGENDARIES) {
    const mapped = m.files[`static/img/p${no}.webp`];
    if (!mapped || !existsSync(join(root, 'public', mapped))) missing.push(no);
  }
  assert.deepEqual(missing, [], `以下传说种缺当前 hash 立绘文件：${missing.join(',')}`);
});
