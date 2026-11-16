// tests/webp-lazy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { assetPath, assetHash } from './asset-path.mjs';

const H = assetHash();
assert.match(H || '', /^[0-9a-f]{8}$/, '先跑 node scripts/hash-assets.mjs');
const server = readFileSync(new URL('../src/index.js', import.meta.url), 'utf8');
const app = readFileSync(assetPath('app.js'), 'utf8');
const images = readdirSync(assetPath('img'));

test('pet URLs use WebP exclusively', () => {
  // 宝可梦立绘一律走 petImg (.webp)；残留的 .png 只是 PWA 图标（icon-180/192、apple-touch-icon），不在本次范围
  assert.ok(!/\/static\/img\/p\$\{[^}]*\}\.png/.test(server));
  assert.ok(!/\/static\/img\/p\$\{[^}]*\}\.png/.test(app));
  assert.ok(!app.includes('.png'));
  const pngRefs = [...new Set([...server.matchAll(/[\w./-]+\.png/g)].map((m) => m[0]))].sort();
  const expected = [
    '/apple-touch-icon-precomposed.png',
    '/apple-touch-icon.png',
    `/static/icon-180.${H}.png`,
    `/static/icon-192.${H}.png`,
  ];
  assert.deepEqual(pngRefs, expected);
  assert.ok(server.includes('const petImg = (no) => `/static/img/p${no}.' + H + '.webp`;'));
});

test('all numbered pet WebP assets exist without PNG remnants', () => {
  const nos = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 16, 25, 26, 37, 39, 43, 45, 50,
    54, 58, 74, 95, 98, 111, 121, 123, 125, 131, 133, 143, 147,
    151, 172, 179,
  ];
  assert.equal(nos.length, 33);
  for (const no of nos) assert.ok(images.includes(`p${no}.${H}.webp`));
  assert.ok(!images.some((name) => /^p\d+\.png$/.test(name)));
});

test('noncritical images use lazy loading', () => {
  const snippets = [
    '<img loading="lazy" src="${img}">',
    '<img loading="lazy" class="evo-img" src="${p.img}">',
    '<img loading="lazy" class="${cls}" src="${form.img}" alt="">',
    '<img loading="lazy" src="${moveIconSrc(m)}" alt="" onerror="this.remove()">', // 2026-11-13 任务 106：两处 moveicons 改走 moveIconSrc（专属图标优先、其余仍用属性图标）
    '<img loading="lazy" class="bigimg" src="${src}">',
    '<img loading="lazy" src="${srcOf(p)}" onclick="viewPhoto(\'${srcOf(p)}\')">',
    '<img loading="lazy" src="/static/img/types/${en}.' + H + '.webp" alt="" onerror="this.remove()">',
    '<img loading="lazy" src="${e.img}">',
    '<img loading="lazy" src="${e.img}" alt="${esc(e.name)}">',
  ];
  for (const snippet of snippets) assert.ok(app.includes(snippet), snippet);
  const photo = '<img loading="lazy" src="/api/photos/${p.id}" onclick="viewPhoto(\'/api/photos/${p.id}\')">';
  assert.equal(app.split(photo).length - 1, 2);
});

test('first-screen heroes and battle portraits remain eager', () => {
  const snippets = [
    '<img class="avatar" src="${k.avatar}" alt="">',
    '${form.img ? `<img src="${form.img}" alt="">`', // 任务 111：伙伴小卡立绘（仍 eager，无 loading=）
    '<div class="hero"><img src="/static/img/p${e.no}.' + H + '.webp">',
    '<img src="${p.img}" style="width:${size}px;height:${size}px;object-fit:contain">',
    '<img src="${s.bossImg}" style="width:64px;height:64px;object-fit:contain">',
    '<img src="${esc(k.form.img)}" alt="${tr(\'伙伴\', \'Companion\')}">',
  ];
  const lines = app.split('\n');
  for (const snippet of snippets) {
    const line = lines.find((value) => value.includes(snippet));
    assert.ok(line, snippet);
    assert.ok(!line.includes('loading='), snippet);
  }
});

test('dex151 stays empty until the guarded expansion render', () => {
  const start = app.indexOf('async function goPokedex(id) {');
  const toggleStart = app.indexOf('window.toggleDex151 = function()', start);
  const end = app.indexOf('async function goEggs(id) {', toggleStart);
  assert.ok(start >= 0 && toggleStart > start && end > toggleStart);
  const template = app.slice(start, toggleStart);
  const toggle = app.slice(toggleStart, end);
  assert.ok(template.includes('<div id="dex151-grid" hidden><div class="dex"></div></div>'));
  assert.ok(!template.includes('j.dex151.map'));
  assert.ok(toggle.includes('hasChildNodes'));
  assert.ok(toggle.includes('.map(dex151SlotHtml)'), 'toggle 经 dex151SlotHtml 渲染（任务 74 抽出，与筛选重填同源）');
  const helper = app.slice(app.indexOf('function dex151SlotHtml(e) {'));
  assert.ok(helper.includes('dexSlot(e, `dex151:${e.no}`)'));
});
