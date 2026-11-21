/* 精致化① 彩带（2026-11-19）
 * node --test tests/confetti.test.mjs
 * 读 app.js.orig / style.css.orig 源（改动只在 .orig，哈希轮换前 hashed 包还没带上）。
 * 覆盖：confettiBurst 真实源码在假 DOM 下运行（纸片数、挂 body、1.25s 自清、减弱动效不撒）；
 * celebrateWin 先弹窗再撒；赢的调用点用 celebrateWin、日常/输的调用点仍是 celebrate；CSS 兜底。 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'static');
const APP = readFileSync(join(root, 'app.js.orig'), 'utf8');
const CSS = readFileSync(join(root, 'style.css.orig'), 'utf8');

function load(reduced) {
  const m = APP.match(/function confettiBurst\([\s\S]*?\n}\n/);
  const w = APP.match(/function celebrateWin\([\s\S]*?\n}\n/);
  assert.ok(m && w, '找不到 confettiBurst / celebrateWin 源码');
  const body = [];
  const timers = [];
  const mk = () => ({ style: { setProperty(k, v) { this[k] = v; } }, children: [], attrs: {},
    appendChild(c) { this.children.push(c); }, setAttribute(k, v) { this.attrs[k] = v; },
    remove() { const i = body.indexOf(this); if (i >= 0) body.splice(i, 1); } });
  const document = { createElement: () => mk(), body: { appendChild(c) { body.push(c); } } };
  const calls = [];
  const celebrate = (...a) => calls.push(['celebrate', ...a]);
  const fn = new Function('document', 'REDUCED_MOTION', 'setTimeout', 'celebrate',
    m[0] + w[0] + '\nreturn { confettiBurst, celebrateWin };')(
    document, () => reduced, (f, ms) => timers.push({ f, ms }), (...a) => { celebrate(...a); });
  return { ...fn, body, timers, calls };
}

describe('confettiBurst 渲染', () => {
  test('挂 body、默认 28 片、只用现有 palette、1.25s 内自清', () => {
    const t = load(false);
    t.confettiBurst();
    assert.equal(t.body.length, 1);
    const box = t.body[0];
    assert.equal(box.className, 'fx-confetti');
    assert.equal(box.children.length, 28);
    const allowed = new Set(['#FFB340', '#FF8C42', '#FFC93C', '#58b368']);
    for (const c of box.children) assert.ok(allowed.has(c.style.background), c.style.background);
    // 最长 delay 0.2 + 最长 duration 1.0 ≤ 1.2s，清理定时器 1250ms
    for (const c of box.children) assert.ok(parseFloat(c.style.animationDelay) + parseFloat(c.style.animationDuration) <= 1.2 + 1e-9);
    assert.equal(t.timers.length, 1);
    assert.equal(t.timers[0].ms, 1250);
    t.timers[0].f();
    assert.equal(t.body.length, 0);
  });
  test('REDUCED_MOTION 时不撒（不建节点、不起定时器）', () => {
    const t = load(true);
    t.confettiBurst();
    assert.equal(t.body.length, 0);
    assert.equal(t.timers.length, 0);
  });
  test('celebrateWin：原样转给 celebrate（含 extra）再撒；减弱动效时弹窗照出', () => {
    const t = load(false);
    t.celebrateWin('T', 'img', 'txt', 'X');
    assert.deepEqual(t.calls[0], ['celebrate', 'T', 'img', 'txt', 'X']);
    assert.equal(t.body.length, 1);
    const r = load(true);
    r.celebrateWin('T', null, 'txt');
    assert.equal(r.calls.length, 1);
    assert.equal(r.body.length, 0);
  });
});

describe('调用点分类', () => {
  const lines = APP.split('\n');
  const find = (re) => { const h = lines.filter((l) => re.test(l)); assert.equal(h.length, 1, String(re) + ' 命中 ' + h.length); return h[0]; };
  const win = (re) => assert.match(find(re), /celebrateWin\(/, String(re));
  const plain = (re) => { const l = find(re); assert.match(l, /celebrate\(/); assert.doesNotMatch(l, /celebrateWin/, String(re)); };

  test('赢的调用点撒花', () => {
    for (const re of [/'连击大奖！'/, /celebrate\w*\('封印解开了！'/, /LANG\.childSlice2Hatched/, /'抓到啦！', frontImgFor\(j\)/,
      /'Caught!'/, /'打卡完成', 'Checked in!'/, /LANG\.oakSlice4Complete\)/, /'技能升级！'/, /'获胜！'/,
      /celebrateWin\(tr\('封印解开了！', 'Sealed egg hatched!'\)/, /j\.reward === 'wheel'/, /else if \(j\.move\)/, /else if \(j\.name\) celebrate/, /celebrate\w*\(sessionResultTitle/,
      /对战结束！', null, esc\(\(B\.view/]) win(re);
  });
  test('有输赢分支的调用点：按条件选 celebrateWin / celebrate', () => {
    assert.match(find(/j\.status === 'caught' \? '抓到啦！' : '跑掉啦…'/), /\(j\.status === 'caught' \? celebrateWin : celebrate\)\(/);
    assert.match(find(/\('单元测试完成', null, text\)/), /\(j\.won && j\.prize \? celebrateWin : celebrate\)\(/);
    const l = find(/\('对战结束！', null, text\)/);
    assert.match(l, /winnerSide === \(postView\.mode === 'pvp' \? pvpMySide\(postView\) : 'A'\) \? celebrateWin : celebrate\)\(/);
  });
  test('日常/输的调用点不撒', () => {
    for (const re of [/'已记下啦！'/, /celebrate\('保存好啦！', null, '修改已存在手机里/, /celebrate\('保存好啦！', null, '备注和照片/, /^\s+celebrate\(title, null, msg\)/,
      /'交卷啦（待同步）'/, /'成绩已提交'/, /'差一点就赢啦！', null, '回去练练级/]) plain(re);
  });
  test('不留裸 celebrate 之外的意外调用（总数核对）', () => {
    const raw = lines.filter((l) => /(^|[^\w.])celebrate\(/.test(l) && !/function celebrate/.test(l));
    assert.equal(raw.length, 8, '裸 celebrate( 应只剩 7 个日常/输调用点 + celebrateWin 内转发 1 处');
  });
});

describe('CSS', () => {
  test('.fx-confetti 盖过弹窗遮罩且不挡点击；减弱动效兜底', () => {
    assert.match(CSS, /\.fx-confetti\{[^}]*position:fixed[^}]*pointer-events:none[^}]*z-index:60/);
    assert.match(CSS, /@keyframes confettiFall/);
    const mq = CSS.match(/@media \(prefers-reduced-motion: reduce\)\{[\s\S]*?\n\}/)[0];
    assert.match(mq, /\.fx-confetti\{display:none !important\}/);
  });
  test('旧 .confetti 弹窗顶部图标保持不动（不改弹窗结构）', () => {
    assert.match(CSS, /\.confetti\{font-size:2rem;animation:shake 1s ease-in-out infinite\}/);
    assert.match(APP, /showModal\(`<div class="confetti">\$\{ic\('sparkles'\)\}<\/div><h2>\$\{title\}<\/h2>/);
  });
});
