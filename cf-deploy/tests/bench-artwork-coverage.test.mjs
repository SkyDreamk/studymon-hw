// 备战球立绘覆盖（2026-11-06 用户 23:34 正式站截图：备战全选后 20 只球破图“?”）：
// 轮换脚本只重命名 nos 表里的种；10,11,12,13,14,15,19,20,21,22,23,24,27,28,29,30,31,32,33,34
// 在 COLLECTION_MOVES 里、但从未进过野外池批次，所以从没进 nos，历次轮换都漏了它们——
// 磁盘上只有旧 hash 名（p10.d04af1ef.webp），petImg 拼当前 hash 拼出 404。
// 本测试钉住两点：COLLECTION_MOVES 的每个种都在 nos 里；每个收藏种在磁盘上都有当前 hash 的图。
// 解析 nos 时必须先去掉 // 注释再取数字——注释里的“2026-11-06”会被误认成数字
//（审校第一次算错成 18 种就是这么来的）；同时断言解析结果不含 2026，把去注释钉死。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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

test('COLLECTION_MOVES 每个种都在 hash-assets.mjs 的 nos 表里', () => {
  const nos = parseNos();
  assert.ok(!nos.includes(2026), 'nos 解析混入注释里的 2026：去注释失效');
  assert.equal(new Set(nos).size, nos.length, 'nos 表有重复编号');
  const coll = Object.keys(M.COLLECTION_MOVES).map(Number);
  assert.equal(coll.length, 164, 'COLLECTION_MOVES 应为 164 种');
  const missing = coll.filter(no => !nos.includes(no));
  assert.deepEqual(missing, [], `以下收藏种不在 nos 表里，轮换会漏掉它们的立绘：${missing.join(',')}`);
});

test('每个收藏种在磁盘上都有当前 hash 的立绘文件', () => {
  const m = manifest();
  const h = m.hash;
  assert.match(h, /^[0-9a-f]{8}$/, 'manifest hash 应为 8 位十六进制');
  const coll = Object.keys(M.COLLECTION_MOVES).map(Number);
  const missing = [];
  for (const no of coll) {
    const mapped = m.files[`static/img/p${no}.webp`];
    if (!mapped || !existsSync(join(root, 'public', mapped))) missing.push(no);
  }
  assert.deepEqual(missing, [], `以下收藏种缺当前 hash 立绘文件：${missing.join(',')}`);
});

test('磁盘上没有旧 hash 的 p 立绘残留（全部 p 文件与 manifest hash 一致）', () => {
  const h = manifest().hash;
  const bad = readdirSync(join(root, 'public/static/img'))
    .filter(f => /^p\d+\.[0-9a-f]{8}\.webp$/.test(f) && !f.endsWith(`.${h}.webp`));
  assert.deepEqual(bad, [], `以下立绘仍是旧 hash 名，petImg 会 404：${bad.join(',')}`);
});
