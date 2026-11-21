import { assetPath } from './asset-path.mjs';
/* PIN 新鲜度单测：node --test tests/pin.test.mjs
 * 覆盖 pinFresh 纯函数口径（与 requirePin 同一判定）与 /api/overview 下发 session.pinOk：
 * 家长会话 PIN 在 2 小时内 → pinOk=true；拨老到 2 小时外 → pinOk=false 且家长接口 403 NEED_PIN。
 * 集成部分与 access.test.mjs 同一手法：node:sqlite 内存库＋真实 fetch 驱动。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { readBackendSource } from './backend-src.mjs';

const src = readBackendSource();
const M = await import(new URL('../src/index.js', import.meta.url));

const NOW = 1_800_000_000; // 固定基准时刻（秒）
const parent = (ageSecs) => ({ kind: 'parent', child_id: null, pin_verified_at: NOW - ageSecs });

describe('pinFresh 纯函数', () => {
  test('刚验证 → true', () => {
    assert.equal(M.pinFresh(parent(0), NOW), true);
  });
  test('1 小时前验证 → true', () => {
    assert.equal(M.pinFresh(parent(3600), NOW), true);
  });
  test('恰好 7200 秒（边界）→ true（与 requirePin 的 > 口径一致）', () => {
    assert.equal(M.pinFresh(parent(M.PIN_SESSION_SECS), NOW), true);
    assert.equal(M.PIN_SESSION_SECS, 7200);
  });
  test('7201 秒 → false', () => {
    assert.equal(M.pinFresh(parent(M.PIN_SESSION_SECS + 1), NOW), false);
  });
  test('pin_verified_at 为 null → false', () => {
    assert.equal(M.pinFresh({ kind: 'parent', child_id: null, pin_verified_at: null }, NOW), false);
  });
  test('孩子会话 → false', () => {
    assert.equal(M.pinFresh({ kind: 'child', child_id: 1, pin_verified_at: NOW }, NOW), false);
  });
  test('无会话 → false', () => {
    assert.equal(M.pinFresh(null, NOW), false);
    assert.equal(M.pinFresh(undefined, NOW), false);
  });
});

/* ---------------- 集成：overview 下发 pinOk ---------------- */

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0019_evo_items.sql', '0043_pet_instances_ability.sql']) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  const wrap = (sql) => ({
    _args: [],
    bind(...args) { this._args = args; return this; },
    async first() { const r = raw.prepare(sql).get(...this._args); return r ?? null; },
    async all() { return { results: raw.prepare(sql).all(...this._args) }; },
    async run() {
      const r = raw.prepare(sql).run(...this._args);
      return { meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
    },
  });
  const db = {
    prepare: (sql) => wrap(sql),
    async batch(stmts) { for (const s of stmts) await s.run(); return []; },
  };
  return {
    env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw,
  };
}

let env, raw;
beforeEach(() => { ({ env, raw } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie, res };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

describe('overview session.pinOk 下发', () => {
  test('新鲜家长会话 → pinOk=true，家长接口可达', async () => {
    const pc = await parentCookie();
    const ov = await call('/api/overview', { cookie: pc });
    assert.equal(ov.j.session.kind, 'parent');
    assert.equal(ov.j.session.pinOk, true);
    const pend = await call('/api/parent/pending', { cookie: pc });
    assert.equal(pend.status, 200);
  });

  test('拨老到 2 小时外 → pinOk=false，家长接口 403 NEED_PIN', async () => {
    const pc = await parentCookie();
    raw.exec(`UPDATE sessions SET pin_verified_at = pin_verified_at - ${M.PIN_SESSION_SECS + 600}`);
    const ov = await call('/api/overview', { cookie: pc });
    assert.equal(ov.j.session.kind, 'parent');
    assert.equal(ov.j.session.pinOk, false);
    const pend = await call('/api/parent/pending', { cookie: pc });
    assert.equal(pend.status, 403);
    assert.equal(pend.j.error, 'NEED_PIN');
  });

  test('孩子会话 → pinOk=false', async () => {
    const pc = await parentCookie();
    const su = await call('/api/parent/settings/update', {
      method: 'POST', cookie: pc,
      body: { childPasswords: [{ id: 1, password: '1111' }] },
    });
    assert.equal(su.j.ok, true);
    const login = await call('/api/child/login', { method: 'POST', body: { childId: 1, password: '1111' } });
    assert.equal(login.status, 200);
    const ov = await call('/api/overview', { cookie: login.cookie });
    assert.equal(ov.j.session.kind, 'child');
    assert.equal(ov.j.session.pinOk, false);
  });
});

/* ---------------- 家长入口 PIN 盘输错不清值（2026-10-24 用户正式站真机报告） ----------------
 * 根因：应用内家长盘（app.js goParent）把 PIN 存在闭包变量 pin 里，submitPin 的失败分支
 * 只清圆点显示、且末尾 pin = '' 清的是 submitPin 自己的参数，闭包旧值还在；圆点看着是
 * ○○○○，下一次按键却被旧值吞掉（长度已满 4 → 又把错误 PIN 重提一次），须手动删 4 次
 * 才能重输。修复：goParent 暴露 pinReset（清闭包值＋圆点），submitPin 失败时调用。
 * 注意：本节只动前端输入状态，服务端校验口径（次数、锁定、会话规则）一律不动。 */
describe('家长入口 PIN 盘输错清除（2026-10-24）', () => {
  // 从 app.js 抽取真实 goParent/submitPin 源码，以最小 DOM stub 执行（非字符串断言）。
  function loadPad(apiImpl) {
    const appJs = readFileSync(assetPath('app.js'), 'utf8');
    const sliceFn = (startMarker) => {
      const start = appJs.indexOf(startMarker);
      if (start < 0) throw new Error('not found: ' + startMarker);
      let i = appJs.indexOf('{', start);
      let depth = 0;
      for (; i < appJs.length; i++) {
        if (appJs[i] === '{') depth++;
        else if (appJs[i] === '}') { depth--; if (depth === 0) return appJs.slice(start, i + 1); }
      }
      throw new Error('unbalanced braces');
    };
    const els = { pindots: { textContent: '' }, pinmsg: { textContent: '' } };
    const windowStub = {};
    const apiCalls = [];
    let renderParentCalled = false;
    const factory = new Function('window', 'document', 'app', 'state', 'api', 'renderParent', 'setArea', 'careRoomUnmount',
      sliceFn('function enterParentMode(j) {') + '\n' + sliceFn('function goParent() {') + '\n' + sliceFn('async function submitPin(pin) {') + '\nreturn { goParent };');
    const { goParent } = factory(windowStub,
      { getElementById: (id) => els[id] || null, querySelector: () => null },
      { innerHTML: '' },
      { pinOk: false, needPin: false, sessionKind: null, sessionChildId: null },
      async (path, body) => { apiCalls.push(body.pin); return apiImpl(body.pin); },
      () => { renderParentCalled = true; },
      () => {},
      () => {}); // careRoomUnmount：goParent 离开养成页时卸房间（任务 122），本节只测 PIN 盘，桩为空操作
    goParent();
    return { pinKey: windowStub.pinKey, els, apiCalls, isRenderParent: () => renderParentCalled };
  }
  const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

  test('输错后红点与报错可见；下一键从新一轮开始，不再重提旧 PIN', async () => {
    const pad = loadPad((pin) => (pin === '9876' ? { ok: true } : { ok: false, attemptsLeft: 2 }));
    pad.pinKey('1'); pad.pinKey('2'); pad.pinKey('3'); pad.pinKey('4');
    await tick();
    assert.deepEqual(pad.apiCalls, ['0000']);
    // P0：输错时 4 个圆点变红（750ms 后才恢复为空圆点），文案统一为“密码不对，再试一次”
    assert.equal(pad.els.pindots.className, 'pindots err');
    assert.equal((pad.els.pindots.innerHTML.match(/class="dot"/g) || []).length, 4);
    assert.match(pad.els.pinmsg.textContent, /密码不对，再试一次/);
    pad.pinKey('9');
    await tick();
    assert.equal((pad.els.pindots.innerHTML.match(/class="dot on"/g) || []).length, 1, '新一键应从 1 个点开始，而非被旧值吞掉');
    assert.deepEqual(pad.apiCalls, ['0000'], '新一键不应重提旧 PIN');
  });

  test('输错清空后重输正确 PIN 可进家长面板', async () => {
    const pad = loadPad((pin) => (pin === '9876' ? { ok: true } : { ok: false, attemptsLeft: 2 }));
    pad.pinKey('1'); pad.pinKey('2'); pad.pinKey('3'); pad.pinKey('4');
    await tick();
    pad.pinKey('9'); pad.pinKey('8'); pad.pinKey('7'); pad.pinKey('6');
    await tick();
    assert.deepEqual(pad.apiCalls, ['0000', '9876']);
    assert.equal(pad.isRenderParent(), true);
  });

  test('锁定文案分支同样清空（PIN_LOCKED 时也不留旧值）', async () => {
    const pad = loadPad(() => ({ ok: false, error: 'PIN_LOCKED', retryAfter: 300 }));
    pad.pinKey('1'); pad.pinKey('2'); pad.pinKey('3'); pad.pinKey('4');
    await tick();
    assert.match(pad.els.pinmsg.textContent, /试太多次啦/);
    pad.pinKey('5');
    await tick();
    assert.equal((pad.els.pindots.innerHTML.match(/class="dot on"/g) || []).length, 1);
    assert.equal(pad.apiCalls.length, 1, '锁定后新一键不应立即重提旧 PIN');
  });

  test('同类接线：其余 4 位密码输入位在服务端失败时清空输入框', () => {
    const appJs = readFileSync(assetPath('app.js'), 'utf8');
    // 房号模式：对战加入密码（pvp-pwd）已撤，改走 askPrompt 弹框输房号（弹框提交即关闭，无残留输入可清）；
    // 其余 4 位密码输入位（家长改 PIN、孩子密码重置）仍须在服务端失败时清空输入框
    assert.ok(!appJs.includes('pvp-pwd'), '旧对战加入密码输入框应已撤');
    assert.match(appJs, /getElementById\('newpin'\); if \(el\) el\.value = ''/);
    assert.match(appJs, /getElementById\('cpw-' \+ id\); if \(el\) el\.value = ''/);
    // 合作加入密码（coopJoinPw）：函数顶部已取 el，失败分支复用 el 清空
    const start = appJs.indexOf('async function coopJoin(battleId) {');
    assert.ok(start >= 0);
    const end = appJs.indexOf('\n}\n', start);
    assert.match(appJs.slice(start, end), /if \(el\) el\.value = '';/);
  });

  test('登录页已改用户名＋密码（2026-11-16 用户系统 v2）：选人页的 PIN 盘与孩子入口都已下线，PIN 只在应用内做家长管理二次确认', () => {
    // 旧选人页 PIN 盘（buf/draw 逻辑）随 rolePage 重写移除；应用内 goParent 的 PIN 盘仍由上面的用例覆盖
    assert.doesNotMatch(src, /buf='';draw\(\);/);
    assert.match(src, /\/api\/auth\/login/);
  });

  test('护栏：app.js 整文件可解析（防重复声明等语法错误导致整站白屏）', async () => {
    // 2026-10-24 教训：coopJoin 一处 const el 重复声明使 app.js 解析失败、测试站首页白屏，
    // 而既有套件只读 app.js 字符串不断言语法，未能拦截。本测试用 vm.Script 只解析不执行。
    const vm = await import('node:vm');
    const appJs = readFileSync(assetPath('app.js'), 'utf8');
    assert.doesNotThrow(() => new vm.Script(appJs));
  });
});
