/* 门槛放行总开关（任务 124）回归：node --test tests/gates-switch.test.mjs
 * 覆盖：开关（settings.debug_open_gates）控制 GATES_OPEN；开时喂食可重喂、道馆可进；
 * 关时恢复正式规则（重喂 ALREADY_DONE、道馆周末/打卡门槛生效）；debug-gates 接口拨动开关。
 * Harness 照 tests/test-mode-unlock.test.mjs（node:sqlite 内存库＋全量迁移；每用例先调
 * M.applyDebugTime(db, env) 再调 handler，与生产一致）。缺省（从未设置过）= 打开，与现行
 * 测试站行为一致，旧测试只设 TEST_MODE、不写该键时不受影响。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0013_bsn_math_chapters.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0021_skill_levels.sql', '0023_care_qa_and_friendship.sql', '0024_evo_reward.sql', '0025_oak_draw_item.sql', '0026_rare_wheel.sql', '0043_pet_instances_ability.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGS) raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
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
  return { env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } }, raw, db };
}

let env, raw, db;
beforeEach(() => { ({ env, raw, db } = makeEnv()); });

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
async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}
async function setup() {
  raw.exec("INSERT OR REPLACE INTO settings(key, value) VALUES('care_enabled', '1')");
  const pc = await parentCookie();
  const r = await call('/api/parent/settings/update', {
    method: 'POST', cookie: pc,
    body: { childPasswords: [{ id: 1, password: '1111' }, { id: 2, password: '2222' }] },
  });
  assert.equal(r.j.ok, true);
  return { pc, c1: await childCookie(1, '1111'), c2: await childCookie(2, '2222') };
}
/* 写开关后重调 applyDebugTime（与生产每请求先调一致），让 GATES_OPEN 生效 */
async function setGates(open) {
  raw.exec(`INSERT OR REPLACE INTO settings(key, value) VALUES('debug_open_gates', '${open ? '1' : '0'}')`);
  await M.applyDebugTime(db, env);
}
async function settingsGatesOpen(pc) {
  const r = await call('/api/parent/settings', { cookie: pc });
  assert.equal(r.j.ok, true);
  return !!(r.j.settings && r.j.settings.debug && r.j.settings.debug.gatesOpen);
}

describe('门槛放行总开关（任务 124）', () => {
  test('缺省（从未设置）：开关显示关（新门槛仍受限），旧门槛（道馆）仍按测试模式放开', async () => {
    const { pc, c1 } = await setup();
    await M.applyDebugTime(db, env);
    // 开关未显式打开：全放行（新门槛）未开
    assert.equal(await settingsGatesOpen(pc), false);
    // 但旧门槛（道馆）缺省即开，与 Task 124 之前一致
    const r = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.canChallenge, true);
  });

  test('开关拨到关：设置接口 gatesOpen 为 false', async () => {
    const { pc } = await setup();
    await setGates(false);
    assert.equal(await settingsGatesOpen(pc), false);
  });

  test('开关拨回开：设置接口 gatesOpen 为 true', async () => {
    const { pc } = await setup();
    await setGates(false);
    assert.equal(await settingsGatesOpen(pc), false);
    await setGates(true);
    assert.equal(await settingsGatesOpen(pc), true);
  });

  test('debug-gates 接口拨动开关（写 settings.debug_open_gates）', async () => {
    const { pc } = await setup();
    let r = await call('/api/parent/debug-gates', { method: 'POST', cookie: pc, body: { open: false } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.gatesOpen, false);
    assert.equal(raw.prepare("SELECT value FROM settings WHERE key='debug_open_gates'").get().value, '0');
    r = await call('/api/parent/debug-gates', { method: 'POST', cookie: pc, body: { open: true } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.gatesOpen, true);
    assert.equal(raw.prepare("SELECT value FROM settings WHERE key='debug_open_gates'").get().value, '1');
  });

  test('放行时喂食可重喂（不扣道具、两次都成功）', async () => {
    const { c1 } = await setup();
    await setGates(true);
    const today = M.shDateStr();
    // 不用预先给道具：放行时不扣道具
    let r = await call('/api/care/feed', { method: 'POST', cookie: c1, body: { childId: 1, food: 'apple' } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    r = await call('/api/care/feed', { method: 'POST', cookie: c1, body: { childId: 1, food: 'apple' } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    const n = raw.prepare("SELECT COUNT(*) n FROM care_logs WHERE child_id=1 AND date_shanghai=? AND kind='feed'").get(today).n;
    assert.equal(n, 1, '放行时每次重喂先删旧记录、只留最新一条');
  });

  test('关闭时重喂被挡（ALREADY_DONE）', async () => {
    const { c1 } = await setup();
    await setGates(false);
    // 先给一个苹果（关时要扣道具）
    raw.exec("INSERT INTO item_inventory(child_id, item_key, qty, updated_epoch) VALUES(1, 'care:apple', 3, 0)");
    let r = await call('/api/care/feed', { method: 'POST', cookie: c1, body: { childId: 1, food: 'apple' } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    r = await call('/api/care/feed', { method: 'POST', cookie: c1, body: { childId: 1, food: 'apple' } });
    assert.equal(r.j.ok, false);
    assert.equal(r.j.code, 'ALREADY_DONE');
  });

  test('放行时道馆可进（无视周末/打卡次数）', async () => {
    const { c1 } = await setup();
    await setGates(true);
    const r = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.canChallenge, true);
    assert.equal(r.j.gatesOpen, true);
  });

  test('关闭时道馆按正式规则（工作日且打卡不足则不可进）', async () => {
    const { c1 } = await setup();
    await setGates(false);
    const r = await call('/api/gym/status', { method: 'POST', cookie: c1, body: { childId: 1 } });
    assert.equal(r.j.ok, true, JSON.stringify(r.j));
    assert.equal(r.j.gatesOpen, false);
    // 工作日（今天非周末）或打卡不足时不可进；若今天恰逢周末且打卡满 4 次则可进——
    // 用虚拟时间强制工作日：把 debug_day_offset 拨到一个工作日再验
    const today = M.shDateStr();
    const isWeekend = M.isWeekendDate(today);
    if (!isWeekend) {
      assert.equal(r.j.canChallenge, false);
    } else {
      // 周末：打卡 0 次仍不可进（需满 4 次）
      assert.equal(r.j.canChallenge, false);
    }
  });
});
