// 对战修复批 #3 单击出招 + #4 engine-local 懒加载（前端静态断言 + 长按/单击逻辑的 vm 行为测试）
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { assetPath } from './asset-path.mjs';

const APP = readFileSync(assetPath('app.js'), 'utf8');
const HTML = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

describe('单击出招', () => {
  test('技能按钮单击走 battleMoveClick，不再直接开详情弹框；详情弹框保留', () => {
    const picker = APP.slice(APP.indexOf('function battleMovePickerHtml(moves) {'), APP.indexOf('function showBattleMoveDetail(i) {'));
    const btn = picker.match(/<button class="moveicon"[^`]*?>/)[0];
    assert.match(btn, /onclick="battleMoveClick\(\$\{i\}\)"/);
    assert.ok(!/onclick="showBattleMoveDetail/.test(btn));
    assert.match(btn, /onpointerdown="battleMoveDown/);
    assert.match(btn, /oncontextmenu="return battleMoveCtx/);
    assert.ok(APP.includes('function showBattleMoveDetail(i) {'));
    assert.ok(APP.includes('confirmBattleMove'));
  });
  test('出招期间置灰＋“出招中…”，且 battleMove 在线/本地两条路径都开关', () => {
    const body = APP.slice(APP.indexOf('async function battleMove(moveName) {'), APP.indexOf('window.battleMove = battleMove;'));
    assert.equal(body.split('battleMoveBusyUI(true)').length - 1, 2);
    assert.equal(body.split('battleMoveBusyUI(false)').length - 1, 2);
    assert.ok(body.includes("api('/api/battle/move', body, undefined, 15000)"), '15s 超时不变');
    assert.ok(APP.includes('出招中…'));
  });
  test('长按≥450ms 开详情且松手不出招；短按直接出招；忙时不出招', () => {
    const src = APP.slice(APP.indexOf('let _bmPress = null;'), APP.indexOf('window.battleMoveDown = battleMoveDown;'));
    const timers = []; const calls = { moves: [], detail: [] };
    const ctx = {
      window: { _battleMoves: [{ name: '撞击' }, { name: '电光一闪' }] },
      document: { querySelectorAll: () => [] },
      setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
      clearTimeout: (id) => { timers[id - 1] = null; },
      battleMove: (n) => calls.moves.push(n),
      showBattleMoveDetail: (i) => calls.detail.push(i),
    };
    vm.createContext(ctx);
    vm.runInContext(src + '\nthis.f={down:battleMoveDown,up:battleMoveUp,click:battleMoveClick,ctx:battleMoveCtx};', ctx);
    const f = ctx.f;
    f.down(1); f.up(); f.click(1); // 短按
    assert.deepEqual(calls.moves, ['电光一闪']); assert.deepEqual(calls.detail, []);
    f.down(0); assert.equal(timers.at(-1).ms, 450); timers.at(-1).fn(); // 长按触发
    f.up(); f.click(0); // 松手后的 click 要被吞掉
    assert.deepEqual(calls.detail, [0]); assert.deepEqual(calls.moves, ['电光一闪']);
    f.down(0); f.up(); f.click(0); // 下一次短按恢复正常
    assert.deepEqual(calls.moves, ['电光一闪', '撞击']);
    ctx.window._battleBusy = true; f.down(0); f.up(); f.click(0);
    assert.equal(calls.moves.length, 2, '忙时不出招');
  });
});

describe('engine-local 懒加载', () => {
  test('index.html 不再同步加载引擎，但仍加载 local-cache 与 app', () => {
    assert.ok(!HTML.includes('engine-local'));
    assert.ok(HTML.includes('/static/local-cache.js') && HTML.includes('/static/app.'));
  });
  test('app.js 恰 1 处动态 import，且指向 manifest 里的哈希文件（磁盘存在）', () => {
    const m = [...APP.matchAll(/import\('(\/static\/engine-local[^']*)'\)/g)];
    assert.equal(m.length, 1);
    const files = JSON.parse(readFileSync(new URL('../public/static/asset-manifest.json', import.meta.url), 'utf8')).files;
    assert.equal('/' + files['static/engine-local.js'], m[0][1]);
    assert.ok(existsSync(assetPath('engine-local.js')));
  });
  test('离线对战入口先 await lcLoadEngine，不再同步判 window.BattleLocal', () => {
    assert.ok(!APP.includes('!(window.BattleLocal)'));
    assert.equal(APP.split('await lcLoadEngine()').length - 1, 2, '离线道馆与离线 PvP 各一处');
  });
  test('在线对战路径（enterBattleView/refreshBattleState/api 出招）不依赖 BattleLocal', () => {
    const online = APP.slice(APP.indexOf('async function startStage(stage)'), APP.indexOf('window.startStage = startStage;'));
    assert.ok(!online.includes('BattleLocal'));
    const mv = APP.slice(APP.indexOf('async function battleMove(moveName) {'), APP.indexOf('window.battleMove = battleMove;'));
    const onlinePart = mv.slice(mv.indexOf("const body = { battleId"));
    assert.ok(!onlinePart.includes('BattleLocal'));
  });
  test('引擎按需加载后挂出 window.BattleLocal（模拟浏览器 window）', async () => {
    globalThis.window = {};
    try {
      const { pathToFileURL } = await import('node:url');
      await import(pathToFileURL(assetPath('engine-local.js')).href);
      assert.equal(typeof window.BattleLocal.resolveGymRound, 'function');
    } finally { delete globalThis.window; }
  });
});
