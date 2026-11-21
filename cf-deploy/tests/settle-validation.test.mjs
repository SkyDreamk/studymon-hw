// tests/settle-validation.test.mjs — gym_settle / pvp_settle 服务端校验 + 旧道馆端点下线（对战修复批 1、2 项）
// Harness 与 tests/access.test.mjs 同款：node:sqlite 内存库 + 全量迁移 + D1 适配层驱动
// Worker 的真实 fetch 处理函数；env 另带假 PHOTOS 绑定（Map 实现 put/get/delete）。
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0015_care_logs.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql'];
const PNG_1X1_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function makeEnv(withSync = true) {
  const raw = new DatabaseSync(':memory:');
  for (const f of (withSync ? MIGRATIONS : MIGRATIONS.filter((x) => x !== '0020_sync.sql'))) {
    raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  }
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
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
  const store = new Map();
  const PHOTOS = {
    async put(key, bytes, opts) { store.set(key, { bytes, opts }); },
    async get(key) { const v = store.get(key); return v ? { arrayBuffer: async () => v.bytes } : null; },
    async delete(key) { store.delete(key); },
  };
  return {
    env: { DB: db, TEST_MODE: '1', PHOTOS, ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } },
    raw, store,
  };
}

let env, raw, store;
beforeEach(() => { M.resetEvoTableCache(); ({ env, raw, store } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const req = new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await M.default.fetch(req, env);
  const sc = res.headers.get('set-cookie');
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, cookie: sc ? sc.split(';')[0] : cookie };
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

async function setup() {
  const pc = await parentCookie();
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pc,
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '1111'), c2: await childCookie(2, '2222') };
}

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}

function shToday() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' }); }
function addDaysStr(ds, n) {
  const d = new Date(ds + 'T12:00:00+08:00');
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
}


/* 关闭测试站放行开关并把“今天”拨到 target（settings.debug_open_gates=0 + debug_day_offset），
 * 这样 settle 走正式站口径（周末 + 周打卡≥4）。 */
function setToday(target) {
  const dayNum = (s) => Math.round(Date.parse(s + 'T00:00:00Z') / 86400000);
  const off = dayNum(target) - dayNum(shToday());
  raw.exec(`INSERT OR REPLACE INTO settings(key,value) VALUES('debug_open_gates','0'),('debug_day_offset','${off}')`);
}
function nextSunday() {
  let d = shToday();
  for (let i = 0; i < 14; i++) { if (new Date(d + 'T00:00:00Z').getUTCDay() === 0) return d; d = addDaysStr(d, 1); }
}
function seedDays(childId, weekStart, n) {
  for (let i = 0; i < n; i++) {
    raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
      VALUES(?,?, '["语文"]','语文','10:00',1,0,'approved',15,'10:05')`).run(childId, addDaysStr(weekStart, i));
  }
}
const settle = (cookie, id, body) => call('/api/gym/settle', { method: 'POST', cookie, body: { cmd_id: id, child_id: 1, stage: 1, won: true, ...body } });

describe('gym_settle 服务端开放条件（正式站口径）', () => {
  test('平日战斗日期被拒 NOT_WEEKEND', async () => {
    const { pc } = await setup();
    const sun = nextSunday(); const wed = addDaysStr(sun, -4);
    setToday(sun); raw.exec('UPDATE children SET total_xp=10000 WHERE id=1');
    seedDays(1, addDaysStr(sun, -6), 4);
    const r = await settle(pc, 'v1', { date: wed });
    assert.equal(r.status, 400); assert.equal(r.j.error, 'NOT_WEEKEND');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM gym_battles').get().n, 0);
  });
  test('周末日期 + 本周打卡≥4 通过', async () => {
    const { pc } = await setup();
    const sun = nextSunday();
    setToday(sun); raw.exec('UPDATE children SET total_xp=10000 WHERE id=1');
    seedDays(1, addDaysStr(sun, -6), 4);
    const r = await settle(pc, 'v2', { date: sun });
    assert.equal(r.j.ok, true); assert.equal(r.j.settled, true);
  });
  test('周六离线打赢、周日同步 仍通过（按战斗日期校验）', async () => {
    const { pc } = await setup();
    const sun = nextSunday(); const sat = addDaysStr(sun, -1);
    setToday(sun); raw.exec('UPDATE children SET total_xp=10000 WHERE id=1');
    seedDays(1, addDaysStr(sun, -6), 4);
    const r = await settle(pc, 'v3', { date: sat });
    assert.equal(r.j.ok, true); assert.equal(r.j.settled, true);
  });
  test('周末但本周打卡<4 被拒 CHECKINS_TOO_FEW', async () => {
    const { pc } = await setup();
    const sun = nextSunday();
    setToday(sun); raw.exec('UPDATE children SET total_xp=10000 WHERE id=1');
    seedDays(1, addDaysStr(sun, -6), 3);
    const r = await settle(pc, 'v4', { date: sun });
    assert.equal(r.status, 400); assert.equal(r.j.error, 'CHECKINS_TOO_FEW'); assert.equal(r.j.count, 3);
  });
  test('战斗日期晚于今天被拒 DATE_IN_FUTURE', async () => {
    const { pc } = await setup();
    const sun = nextSunday(); const sat = addDaysStr(sun, -1);
    setToday(sat); raw.exec('UPDATE children SET total_xp=10000 WHERE id=1');
    seedDays(1, addDaysStr(sun, -6), 4);
    const r = await settle(pc, 'v5', { date: sun });
    assert.equal(r.status, 400); assert.equal(r.j.error, 'DATE_IN_FUTURE');
  });
  test('走 /api/commands 的 gym_settle 同样校验', async () => {
    const { pc } = await setup();
    const sun = nextSunday(); const wed = addDaysStr(sun, -4);
    setToday(sun); raw.exec('UPDATE children SET total_xp=10000 WHERE id=1');
    const r = await call('/api/commands', { method: 'POST', cookie: pc, body: { cmd_id: 'v6', child_id: 1, type: 'gym_settle', payload: { stage: 1, won: true, date: wed } } });
    assert.equal(r.j.error, 'NOT_WEEKEND');
  });
});

describe('pvp_settle 提交者校验', () => {
  const pvp = (cookie, id, submitter, w, l) => call('/api/pvp/settle', { method: 'POST', cookie, body: { cmd_id: id, child_id: submitter, winner_child_id: w, loser_child_id: l } });
  test('非参战的第三个孩子提交被拒 FORBIDDEN', async () => {
    const { pc } = await setup();
    raw.exec("INSERT INTO children(id,name,grade_label,line) SELECT 3,'第三孩','二年级', line FROM children WHERE id=1");
    const r = await pvp(pc, 'p1', 3, 1, 2);
    assert.equal(r.status, 403); assert.equal(r.j.error, 'FORBIDDEN');
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM battles').get().n, 0);
  });
  test('参战方（胜者/败者）提交通过并落战报', async () => {
    const { pc } = await setup();
    const a = await pvp(pc, 'p2', 1, 1, 2);
    assert.equal(a.j.ok, true); assert.equal(a.j.counted, true);
    const b = await pvp(pc, 'p3', 2, 1, 2);
    assert.equal(b.j.ok, true); assert.equal(b.j.practice, true);
  });
  test('胜负同一人被拒 INVALID_PAIR', async () => {
    const { pc } = await setup();
    const r = await pvp(pc, 'p4', 1, 1, 1);
    assert.equal(r.status, 400); assert.equal(r.j.error, 'INVALID_PAIR');
  });
});

describe('旧道馆端点已下线', () => {
  test('POST /api/gym/start 与 /api/gym/round 不再解析到旧处理函数', async () => {
    const { pc } = await setup();
    for (const p of ['/api/gym/start', '/api/gym/round']) {
      const r = await call(p, { method: 'POST', cookie: pc, body: { childId: 1, battleId: 1, moveName: '撞击' } });
      assert.equal(r.status, 404, p + ' 应为 404');
      assert.equal(r.j.battleId, undefined);
    }
  });
});
