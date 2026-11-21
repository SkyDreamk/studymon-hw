/* 精致化② 招式卡拖拽（2026-11-19）
 * node --test tests/drag-move.test.mjs
 * 读 app.js.orig 真实源码（BM_DRAG_PX ~ battleMoveClick），假 DOM + 假计时器跑真实函数。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'static');
const APP = readFileSync(join(root, 'app.js.orig'), 'utf8');
const CSS = readFileSync(join(root, 'style.css.orig'), 'utf8');

function load() {
  const a = APP.indexOf('const BM_DRAG_PX');
  const b = APP.indexOf('function battleMoveCtx(i)');
  const c = APP.indexOf('function battleMoveBusyUI');
  assert.ok(a > 0 && b > a && c > b, '找不到拖拽源码');
  const src = APP.slice(a, c); // 含 battleMoveCtx
  const win = { _battleMoves: [{ name: 'A' }, { name: 'B' }], _battleBusy: false, _battleAnimating: false };
  const log = { moves: [], details: [] };
  let now = 0; let seq = 0; const timers = new Map();
  const setT = (f, ms) => { timers.set(++seq, { f, at: now + ms }); return seq; };
  const clrT = (id) => timers.delete(id);
  const advance = (ms) => { now += ms; for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.f(); } };
  const fns = new Function('window', 'setTimeout', 'clearTimeout', 'battleMove', 'showBattleMoveDetail',
    src + '\nreturn { battleMoveDown, battleMoveMove, battleMoveUp, battleMoveCancel, battleMoveClick, battleMoveCtx, state: () => _bmPress };')(
    win, setT, clrT, (n) => log.moves.push(n), (i) => log.details.push(i));
  const btn = (disabled) => { const cl = new Set(); return { disabled: !!disabled, classList: { add: (x) => cl.add(x), remove: (x) => cl.delete(x), has: (x) => cl.has(x) },
    captured: null, setPointerCapture(id) { this.captured = id; }, releasePointerCapture() { this.captured = null; },
    getBoundingClientRect: () => ({ top: 500 }) }; };
  const ev = (el, y, id = 1) => ({ currentTarget: el, clientY: y, pointerId: id });
  return { win, log, fns, advance, btn, ev, timers };
}

describe('招式卡拖拽', () => {
  test('单击出招（无拖动）', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(0, t.ev(b, 520));
    t.fns.battleMoveUp(t.ev(b, 520));
    t.fns.battleMoveClick(0);
    assert.deepEqual(t.log.moves, ['A']);
  });
  test('长按 450ms 看详情，随后 click 被吞', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(1, t.ev(b, 520));
    t.advance(449); assert.deepEqual(t.log.details, []);
    t.advance(1); assert.deepEqual(t.log.details, [1]);
    t.fns.battleMoveUp(t.ev(b, 520));
    t.fns.battleMoveClick(1);
    assert.deepEqual(t.log.moves, []);
    t.fns.battleMoveDown(0, t.ev(b, 520)); t.fns.battleMoveClick(0); // 关弹窗后下一次点击正常
    assert.deepEqual(t.log.moves, ['A']);
  });
  test('拖出 24px 并在按钮顶部上方松手：出招一次，click 被吞', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(1, t.ev(b, 540));
    assert.equal(b.captured, 1);
    t.fns.battleMoveMove(t.ev(b, 530)); assert.equal(b.classList.has('is-dragging'), false); // 才 10px
    t.fns.battleMoveMove(t.ev(b, 516)); assert.equal(b.classList.has('is-dragging'), true);
    t.fns.battleMoveUp(t.ev(b, 480));
    assert.deepEqual(t.log.moves, ['B']);
    assert.equal(b.classList.has('is-dragging'), false); assert.equal(b.captured, null);
    t.fns.battleMoveClick(1);
    assert.deepEqual(t.log.moves, ['B']);
    t.advance(1000); assert.deepEqual(t.log.details, []);
  });
  test('拖出后回按钮内松手：取消，不出招、不看详情，click 也被吞', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(0, t.ev(b, 560));
    t.fns.battleMoveMove(t.ev(b, 520));
    t.fns.battleMoveUp(t.ev(b, 530));
    t.fns.battleMoveClick(0);
    t.advance(1000);
    assert.deepEqual(t.log.moves, []); assert.deepEqual(t.log.details, []);
    assert.equal(b.classList.has('is-dragging'), false);
  });
  test('拖快：进入 dragging 即撤 450ms 计时器，不弹详情', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(0, t.ev(b, 540));
    t.advance(100);
    t.fns.battleMoveMove(t.ev(b, 500));
    assert.equal(t.timers.size, 0);
    t.advance(2000); assert.deepEqual(t.log.details, []);
  });
  test('长按详情已弹出后拖动不再出招', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(0, t.ev(b, 540)); t.advance(450);
    t.fns.battleMoveMove(t.ev(b, 400)); t.fns.battleMoveUp(t.ev(b, 400)); t.fns.battleMoveClick(0);
    assert.deepEqual(t.log.moves, []); assert.deepEqual(t.log.details, [0]);
  });
  test('busy：不启动拖拽跟踪，不出招', () => {
    const t = load(); const b = t.btn(); t.win._battleBusy = true;
    t.fns.battleMoveDown(0, t.ev(b, 540));
    assert.equal(b.captured, null);
    t.fns.battleMoveMove(t.ev(b, 480)); t.fns.battleMoveUp(t.ev(b, 400)); t.fns.battleMoveClick(0);
    assert.deepEqual(t.log.moves, []);
    const u = load(); const c = u.btn(); u.win._battleAnimating = true;
    u.fns.battleMoveDown(0, u.ev(c, 540)); u.fns.battleMoveMove(u.ev(c, 480)); u.fns.battleMoveUp(u.ev(c, 400));
    assert.deepEqual(u.log.moves, []);
  });
  test('拖拽中途变 busy：松手不出招', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(0, t.ev(b, 540)); t.fns.battleMoveMove(t.ev(b, 500));
    t.win._battleBusy = true;
    t.fns.battleMoveUp(t.ev(b, 400));
    assert.deepEqual(t.log.moves, []);
  });
  test('disabled（定身）：不拖、不出招', () => {
    const t = load(); const b = t.btn(true);
    t.fns.battleMoveDown(0, t.ev(b, 540));
    assert.equal(b.captured, null);
    t.fns.battleMoveMove(t.ev(b, 480)); t.fns.battleMoveUp(t.ev(b, 400));
    assert.deepEqual(t.log.moves, []); assert.equal(b.classList.has('is-dragging'), false);
  });
  test('pointercancel：取消拖拽、清状态、不出招', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(0, t.ev(b, 540)); t.fns.battleMoveMove(t.ev(b, 500));
    t.fns.battleMoveCancel();
    assert.equal(b.classList.has('is-dragging'), false); assert.equal(b.captured, null); assert.equal(t.fns.state(), null);
    t.advance(1000); assert.deepEqual(t.log.moves, []); assert.deepEqual(t.log.details, []);
  });
  test('右键/系统长按看详情，不出招', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(1, t.ev(b, 540));
    assert.equal(t.fns.battleMoveCtx(1), false);
    t.fns.battleMoveUp(t.ev(b, 540)); t.fns.battleMoveClick(1);
    assert.deepEqual(t.log.details, [1]); assert.deepEqual(t.log.moves, []);
  });
  test('拖拽后 click 没来：50ms 后状态自清，下一次点击正常', () => {
    const t = load(); const b = t.btn();
    t.fns.battleMoveDown(0, t.ev(b, 540)); t.fns.battleMoveMove(t.ev(b, 500)); t.fns.battleMoveUp(t.ev(b, 400));
    t.advance(60);
    assert.equal(t.fns.state(), null);
    t.fns.battleMoveClick(1);
    assert.deepEqual(t.log.moves, ['A', 'B']);
  });
});

describe('接线与 CSS', () => {
  test('按钮挂了 move/up/cancel 事件，仍保留 click 与 contextmenu', () => {
    for (const s of ['onclick="battleMoveClick(${i})"', 'onpointerdown="battleMoveDown(${i}, event)"', 'onpointermove="battleMoveMove(event)"',
      'onpointerup="battleMoveUp(event)"', 'onpointercancel="battleMoveCancel()"', 'oncontextmenu="return battleMoveCtx(${i})"']) assert.ok(APP.includes(s), s);
  });
  test('CSS：touch-action:none 只在 .battle-moves .moveicon；抬起态只用 transform+阴影；body 不动', () => {
    assert.match(CSS, /\.battle-moves \.moveicon\{touch-action:none\}/);
    const m = CSS.match(/\.battle-moves \.moveicon\.is-dragging\{([^}]*)\}/);
    assert.ok(m); assert.match(m[1], /transform/); assert.match(m[1], /box-shadow/); assert.doesNotMatch(m[1], /width|height|padding|margin/);
    assert.match(CSS, /body\{[^}]*touch-action:manipulation/);
  });
});
