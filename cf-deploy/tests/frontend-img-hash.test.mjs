// 前端立绘 URL 必须走 hash（2026-11-08 照顾页报障同类审计）。
// 轮换只改写 hash-assets.mjs 锚点表里的模板；漏网的写法会原样进部署 bundle、
// 拼出无 hash 的 /static/img/p<no>.webp，而磁盘上只有带 hash 的文件 → 404。
// 已抓出的漏网（均已改走 frontImgFor，其模板在锚点表里）：
//   · 大师球捕获 celebrate 用 p${j.no}.webp（无锚点）
//   · 离线道馆馆主立绘 '/static/img/p' + cfg.bossNo + '.webp'（拼接）
//   · 离线备战宠立绘 '/static/img/p' + benchNo + '.webp'（拼接）
// 守卫：app.js.orig 里所有 p 立绘模板都须在锚点表里；禁止拼接写法。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');
const hashSrc = readFileSync(new URL('../scripts/hash-assets.mjs', import.meta.url), 'utf8');

function anchoredPTemplates() {
  // 只取 public/static/app.js 的锚点节，避免把 src/index.js 的 petImg（p${no}）混进来。
  const start = hashSrc.indexOf("'public/static/app.js': [");
  assert.ok(start > -1, 'hash-assets.mjs 里找不到 public/static/app.js 锚点节');
  // 该节是 rules 对象最后一节，以 "  ],\n};" 收尾；不能用首个 "]," 定位，
  // 每个锚点条目自身就以 "]," 结尾（首个条目后就会误切）。
  const end = hashSrc.indexOf('\n  ],\n};', start);
  assert.ok(end > -1, 'hash-assets.mjs 里找不到 public/static/app.js 锚点节结尾');
  const section = hashSrc.slice(start, end);
  const found = new Set();
  for (const m of section.matchAll(/\/static\/img\/p\$\{([^}]+)\}\.webp/g)) found.add(m[1]);
  return found;
}

test('前端 p 立绘模板全部在 hash-assets 锚点表里', () => {
  const allowed = anchoredPTemplates();
  assert.ok(allowed.size > 0, '锚点表里应有 p 立绘模板');
  const used = [...appSrc.matchAll(/\/static\/img\/p\$\{([^}]+)\}\.webp/g)].map((m) => m[1]);
  assert.ok(used.length > 0, 'app.js.orig 里应有 p 立绘模板引用');
  const uncovered = [...new Set(used)].filter((v) => !allowed.has(v));
  assert.deepEqual(uncovered, [], `以下 p 立绘模板不在 hash-assets 锚点表里，轮换后会 404：${uncovered.join(',')}`);
});

test('禁止拼接式 p 立绘 URL（轮换锚点匹配不到）', () => {
  assert.ok(!appSrc.includes("'/static/img/p' +"), '存在拼接式 /static/img/p 引用，须改走 frontImgFor 或加锚点');
  assert.ok(!appSrc.includes('"/static/img/p" +'), '存在拼接式 /static/img/p 引用，须改走 frontImgFor 或加锚点');
});

test('frontImgFor 是前端唯一的 p 立绘 URL 构造入口（除锚点模板外）', () => {
  // 除锚点模板与 frontImgFor 定义外，不应再有别的 /static/img/p 构造。
  const withoutAnchored = appSrc.replace(/\/static\/img\/p\$\{[a-z.]+\}\.webp/g, '');
  assert.ok(!withoutAnchored.includes('/static/img/p'), '仍有锚点模板/frontImgFor 之外的 /static/img/p 构造');
  assert.ok(appSrc.includes('const frontImgFor = (pet)'), 'frontImgFor 定义须在位');
});
