// 照顾页舞台图缓存守卫（2026-11-08 用户手机截图：小宝洗澡后舞台小火龙图案消失）。
// 根因：api() 成功 POST 后会调 clearAllCaches() 清掉 childCache；
// 而 goCarePage / careRefresh 只取 /api/care/status 就调 renderCarePage，
// renderCarePage 读 state.childCache[id].form，缓存已空 → heroImg 为空串 → 舞台空白。
// 守卫：进页与每次刷新都须同时重取 /api/child 并 storeChild 回填，再渲染。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSrc = readFileSync(new URL('../public/static/app.js.orig', import.meta.url), 'utf8');

function fnSlice(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  assert.ok(start > -1, `找不到 ${startMarker}`);
  const end = src.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > -1, `找不到 ${endMarker}`);
  return src.slice(start, end);
}

test('goCarePage：进页同时重取 /api/child 并回填，再渲染照顾页', () => {
  const body = fnSlice(appSrc, 'async function goCarePage(', '\nfunction careUpdateCache(');
  assert.ok(body.includes("api('/api/child?id=' + id)"), 'goCarePage 须重取 /api/child');
  assert.ok(body.includes('storeChild(id, cd)'), 'goCarePage 须把 /api/child 结果 storeChild 回填');
  assert.ok(
    body.indexOf("api('/api/child?id=' + id)") < body.indexOf('renderCarePage()'),
    '/api/child 重取须在 renderCarePage() 之前',
  );
  assert.ok(
    body.indexOf('storeChild(id, cd)') < body.indexOf('renderCarePage()'),
    'storeChild 回填须在 renderCarePage() 之前',
  );
});

test('careRefresh：喂食/洗澡后刷新同时重取 /api/child 并回填，再渲染', () => {
  const body = fnSlice(appSrc, 'async function careRefresh(', '\nasync function careSubmit(');
  assert.ok(body.includes("api('/api/child?id=' + id)"), 'careRefresh 须重取 /api/child');
  assert.ok(body.includes('storeChild(id, cd)'), 'careRefresh 须把 /api/child 结果 storeChild 回填');
  assert.ok(
    body.indexOf("api('/api/child?id=' + id)") < body.indexOf('renderCarePage()'),
    '/api/child 重取须在 renderCarePage() 之前',
  );
  assert.ok(
    body.indexOf('storeChild(id, cd)') < body.indexOf('renderCarePage()'),
    'storeChild 回填须在 renderCarePage() 之前',
  );
});

test('renderCarePage：舞台图只取 childCache.form.img（改动面确认）', () => {
  const body = fnSlice(appSrc, 'function renderCarePage()', '\nfunction clearCareFxNodes(');
  assert.ok(body.includes('k.form.img'), '舞台图仍取 k.form.img');
  assert.ok(body.includes("state.childCache[id]"), '仍从 childCache 取孩子对象');
});
