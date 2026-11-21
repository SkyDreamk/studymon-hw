/* 养成小房间（PixiJS，任务 122）单测：
 *  node --test tests/care-room.test.mjs
 * 断言宿主接线（app.js / style.css）与模块 3 处小修（work/care-room-v3/care-room.js）：
 * ① 懒加载：app.js 里动态 import '/static/care-room.js' 恰 1 处，首页/打卡页无引用；
 * ② 容器：renderCarePage 含 #careRoom 与 #careCssFallback（降级回 CSS 版）；
 * ③ 定向刷新：喂食/洗澡/最近三张卡有稳定 id（careFeedCard/careBathCard/careRecentCard），
 *    careRefresh 在房间在跑时走 careRoomSyncAfterRefresh（不重写 #app）；
 * ④ 喂食归属：房间在跑时 doCareFeed 直接返回（喂食走模块拖拽，不重复提交）；
 * ⑤ 离开卸掉：goChild/goCheckinPage/goGym/goPokedex/goParent 开头调 careRoomUnmount；
 * ⑥ 房间尺寸：CSS 里 #careRoom 高 280px，矮屏（max-height:700px）200px；
 * ⑦ 3 处小修：飘字终点 hudBottom+8、矮屏投放环收小并钳制在 HUD 下 2px、
 *    矮屏 HUD 加 care-room-hud-compact 收紧；
 * ⑧ 打包产物：hash 后的 care-room bundle 存在且含模块标记（hud-compact 规则与 mount 入口）。
 * 返工两条（fix2，2026-11-15）：
 * ⑨ 飘字最小位移 8→0：664 下飘字离 HUD 不足 8px 是最小位移 8 把留白吃掉，改成 0 后
 *    终点恒 ≥ hudBottom+8；
 * ⑩ 降级原因可读：onFallback 接住 reason 记进宿主变量、import/挂载失败记 load-failed，
 *    并镜像到 window._careRoomFallbackReason；离开页面时清掉，防旧原因残留。
 * 真实 Azure 调用 0 次。 */
import { assetPath } from './asset-path.mjs';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = () => readFileSync(assetPath('app.js'), 'utf8');
const css = () => readFileSync(assetPath('style.css'), 'utf8');
const roomSrc = () => readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'work', 'care-room-v3', 'care-room.js'), 'utf8');
const roomBundle = () => readFileSync(assetPath('care-room.js'), 'utf8');

describe('养成小房间宿主接线', () => {
  test('懒加载：动态 import 恰 1 处', () => {
    const a = app();
    const hits = a.match(/import\('\/static\/care-room(\.[0-9a-f]{8})?\.js'\)/g) || [];
    assert.equal(hits.length, 1, `动态 import 应出现 1 次，实际 ${hits.length}`);
    assert.ok(!a.includes("from '/static/care-room.js'"), '不得静态 import（首页/打卡页不加载 Pixi）');
  });

  test('容器：#careRoom 与 #careCssFallback 在位', () => {
    const a = app();
    assert.ok(a.includes('id="careRoom"'), '缺 #careRoom 容器');
    assert.ok(a.includes('id="careCssFallback"'), '缺 #careCssFallback（降级回 CSS 版）');
    assert.ok(a.includes('careRoomEnsure()'), '缺 careRoomEnsure 调用');
    assert.ok(a.includes('careRoomUnmount()'), '缺 careRoomUnmount');
  });

  test('三张卡有稳定 id，供定向刷新', () => {
    const a = app();
    for (const id of ['careFeedCard', 'careBathCard', 'careRecentCard']) {
      assert.ok(a.includes(`id="${id}"`), `缺 ${id}`);
    }
    assert.ok(a.includes('careRenderCards(j)'), '缺 careRenderCards');
    assert.ok(a.includes('careRoomSyncAfterRefresh'), '缺 careRoomSyncAfterRefresh');
  });

  test('careRefresh：房间在跑时定向刷新，不重写 #app', () => {
    const a = app();
    const idx = a.indexOf('careRoomSyncAfterRefresh(j, state.childCache[id] || {}, null)');
    assert.ok(idx > -1, 'careRefresh 里缺定向刷新分支');
    const before = a.slice(Math.max(0, idx - 500), idx);
    assert.match(before, /careRoomIsActive\(\)/, '定向刷新前无房间在跑判断');
  });

  test('喂食归属：房间在跑时 doCareFeed 直接返回', () => {
    const a = app();
    const m = a.match(/async function doCareFeed\(foodKey, btnEl\) \{[^}]*\}/);
    assert.ok(m, '缺 doCareFeed');
    assert.match(m[0], /careRoomIsActive\(\)/, 'doCareFeed 缺房间在跑守卫');
  });

  test('离开养成页：5 个导航入口开头卸掉房间', () => {
    const a = app();
    for (const fn of ['goChild(id)', 'goCheckinPage(id)', 'goGym(id, opts)', 'goPokedex(id)', 'goParent()']) {
      const idx = a.indexOf(`function ${fn} {`);
      assert.ok(idx > -1, `缺 ${fn}`);
      const head = a.slice(idx, idx + 220);
      assert.ok(head.includes('careRoomUnmount()'), `${fn} 开头缺 careRoomUnmount`);
    }
  });

  test('降级：onFallback 与加载失败都回到 CSS 版', () => {
    const a = app();
    assert.ok(a.includes('careRoomShowFallback()'), '缺 careRoomShowFallback');
    assert.ok(a.includes("onFallback:"), '缺 onFallback 回调');
  });

  test('挂载后重绑 feedSource：防 import 期间重渲染导致拖拽监听落在旧 grid', () => {
    const a = app();
    // careRoomEnsure 里挂好后，必须用当前 DOM 的 grid 再调一次 setFeedSource
    const idx = a.indexOf('careRoomHandle = handle;');
    assert.ok(idx > -1, '缺 careRoomHandle = handle');
    const after = a.slice(idx, idx + 600);
    assert.ok(after.includes("handle.setFeedSource"), '挂载后缺 setFeedSource 重绑');
    assert.ok(after.includes("document.querySelector('.care-grid-feed')"), '重绑应用当前 DOM 的 grid');
  });

  test('房间尺寸：280px，矮屏 200px', () => {
    const c = css();
    assert.match(c, /#careRoom\s*\{[^}]*height:\s*280px/, '#careRoom 应高 280px');
    assert.match(c, /@media\s*\(max-height:\s*700px\)\s*\{\s*#careRoom\s*\{\s*height:\s*200px/, '矮屏应 200px');
  });
});

describe('养成小房间模块 3 处小修', () => {
  test('飘字终点：hudBottom+8', () => {
    const s = roomSrc();
    assert.ok(s.includes('measureHudBottom() + 8'), '飘字终点应为 hudBottom+8');
    assert.ok(!s.includes('measureHudBottom() + 6'), '旧 +6 不应残留');
  });

  test('矮屏投放环：收小并钳制在 HUD 下 2px', () => {
    const s = roomSrc();
    assert.ok(s.includes('isCompactH ? 6 : 12'), '矮屏环横向外扩应收小到 6');
    assert.ok(s.includes('isCompactH ? 5 : 10'), '矮屏环纵向外扩应收小到 5');
    assert.ok(s.includes('hudBottomPx + 2'), '环顶应钳制在 HUD 下 2px');
  });

  test('矮屏 HUD：care-room-hud-compact 收紧', () => {
    const s = roomSrc();
    assert.ok(s.includes('care-room-hud-compact'), '缺 compact HUD 规则');
    assert.ok(s.includes("hudEl.classList.toggle('care-room-hud-compact', isCompactH)"), '缺 compact class 切换');
  });

  test('打包产物：hash 后的 bundle 存在且含模块标记', () => {
    const p = assetPath('care-room.js');
    assert.ok(existsSync(p), `缺打包产物 ${p}`);
    const b = roomBundle();
    // 2026-11-20 新版 Pixi：bundle 已拆分——入口只剩 37KB 左右，PixiJS 本体在
    // public/static/pixi/chunk.*.js（23 个共享 chunk）；旧的 >100KB 阈值是单文件
    // 旧打包的形状，拆分后不再适用。改断言新形状：入口非空 + chunk 齐全 + 总量合理。
    assert.ok(b.length > 20000, `bundle 过小（${b.length} 字节），疑似打包失败`);
    assert.ok(b.includes('care-room-hud-compact'), 'bundle 缺 compact HUD 规则');
    assert.ok(b.includes('care-room-fallback-name'), 'bundle 缺降级标记');
    const pixiDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'static', 'pixi');
    const chunks = readdirSync(pixiDir).filter((f) => /^chunk\.[0-9a-f]{8}\.js$/.test(f));
    assert.equal(chunks.length, 23, `pixi 共享 chunk 应为 23 个，实际 ${chunks.length}`);
    const total = chunks.reduce((n, f) => n + statSync(join(pixiDir, f)).size, 0);
    assert.ok(total > 500000, `pixi chunk 总量过小（${total} 字节），疑似打包失败`);
  });
});

describe('返工两条（fix2）', () => {
  test('飘字最小位移：8→0，终点恒 ≥ hudBottom+8', () => {
    const s = roomSrc();
    assert.ok(s.includes('Math.max(0, Math.min(28, startTop - (measureHudBottom() + 8)))'),
      '飘字位移下限应为 0（最小位移 8 会把 8px 留白吃掉）');
    assert.ok(!s.includes('Math.max(8, Math.min(28, startTop - (measureHudBottom() + 8)))'),
      '旧 Math.max(8, …) 不应残留');
  });

  test('降级原因：onFallback 接住 reason 记进宿主变量', () => {
    const a = app();
    assert.ok(a.includes('let careRoomFallbackReason = null'), '缺宿主降级原因变量');
    assert.ok(a.includes('onFallback: ({ reason } = {})'), 'onFallback 应接住 reason 参数');
    assert.ok(a.includes('careRoomNoteFallback(reason)'), 'onFallback 应把 reason 记下来');
  });

  test('降级原因：import/挂载失败记 load-failed', () => {
    const a = app();
    assert.ok(a.includes("careRoomNoteFallback('load-failed')"), 'catch 应记 load-failed');
  });

  test('降级原因：可读（window 镜像），离开页面清掉', () => {
    const a = app();
    assert.ok(a.includes('window._careRoomFallbackReason = careRoomFallbackReason'),
      '降级原因应镜像到 window，控制台/探针可直接读');
    assert.ok(a.includes('function careRoomNoteFallback(reason)'), '缺 careRoomNoteFallback');
    const idx = a.indexOf('function careRoomUnmount() {');
    assert.ok(idx > -1, '缺 careRoomUnmount');
    const head = a.slice(idx, idx + 500);
    assert.ok(head.includes('careRoomFallbackReason = null'), '离开页面应清掉降级原因');
  });
});
