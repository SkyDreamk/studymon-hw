/* 打卡历史奖励下拉菜单（2026-11-03；2026-11-21 改为三种转盘）：node --test tests/history-reward.test.mjs
 * 覆盖：新口 /api/parent/history/grant 的家长 PIN 门；kind 白名单（只认 wheel:advanced/oak/care，旧 6 种与稀有都 400）；
 * 未通过/不存在/孩子不匹配；三种转盘各发 1 次机会并统一标记；每条记录限奖 1 次（换奖品也 409）；
 * 旧发球记录仍算已奖励；history 接口 rewarded/rewardedName；迁移 0046 后 care 源 'history' 可写入；旧发球口回归。
 * 脚手架与 balls.test.mjs 同一手法：node:sqlite 内存库＋真实 fetch 驱动。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0026_rare_wheel.sql', '0028_care_wheel.sql', '0030_daily_chinese.sql', '0040_oak_wheel_chances.sql', '0043_pet_instances_ability.sql', '0046_care_wheel_history_source.sql']) {
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

function mkCheckin(childId, status) {
  raw.prepare(
    `INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
     VALUES(?, '2026-11-03', '["语文"]', '语文', '10:00', 1, 0, ?, 15, '10:05')`).run(childId, status);
  return raw.prepare('SELECT id FROM checkins ORDER BY id DESC LIMIT 1').get().id;
}

async function historyRow(pc, checkinId) {
  const h = await call('/api/parent/history', { cookie: pc });
  assert.equal(h.j.ok, true);
  return h.j.history.find((r) => r.id === checkinId);
}

const G = '/api/parent/history/grant';
const post = (pc, cid, kind, childId = 1) => call(G, { method: 'POST', cookie: pc, body: { childId, checkinId: cid, kind } });
const n = (sql, ...a) => raw.prepare(sql).get(...a).n;

describe('打卡历史奖励下拉菜单（三种转盘）', () => {
  test('未登录 → 401', async () => {
    const r = await call(G, { method: 'POST', body: { childId: 1, checkinId: 1, kind: 'wheel:oak' } });
    assert.equal(r.status, 401);
  });

  test('旧 6 种 kind / 稀有 / 不存在的 kind → 400 BAD_REWARD_KIND，不落账', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    for (const kind of ['ball', 'xp', 'medicine:potion', 'medicine:super-potion', 'medicine:berry-juice', 'medicine:water', 'wheel:rare', 'super', '', 'toString', '__proto__']) {
      const r = await post(pc, cid, kind);
      assert.equal(r.status, 400, kind);
      assert.equal(r.j.error, 'BAD_REWARD_KIND', kind);
    }
    assert.equal(n("SELECT COUNT(*) n FROM item_ledger WHERE ref_type='history_reward'"), 0);
    assert.equal(n('SELECT COUNT(*) n FROM rare_wheel_chances'), 0);
  });

  test('待审核记录 → 400 CHECKIN_NOT_APPROVED，不落账', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'pending');
    const r = await post(pc, cid, 'wheel:oak');
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'CHECKIN_NOT_APPROVED');
    assert.equal(n("SELECT COUNT(*) n FROM item_ledger WHERE ref_type='history_reward'"), 0);
  });

  test('记录不存在 → 404；孩子不匹配 → 400', async () => {
    const pc = await parentCookie();
    assert.equal((await post(pc, 99999, 'wheel:oak')).status, 404);
    const cid = mkCheckin(1, 'approved');
    const r = await post(pc, cid, 'wheel:oak', 2);
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'CHECKIN_CHILD_MISMATCH');
  });

  test('普通转盘：oak_wheel_chances +1（source oak, ref history-<id>），流水 1 行，history 显示已奖励 普通转盘', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const r = await post(pc, cid, 'wheel:oak');
    assert.equal(r.j.ok, true);
    assert.equal(r.j.grant.name, '普通转盘');
    const row = raw.prepare('SELECT child_id, source, ref_id, used_epoch FROM oak_wheel_chances').all();
    assert.deepEqual(row.map((x) => ({ ...x })), [{ child_id: 1, source: 'oak', ref_id: 'history-' + cid, used_epoch: null }]);
    const led = raw.prepare("SELECT item_key, delta FROM item_ledger WHERE ref_type='history_reward' AND ref_id=?").all(cid);
    assert.deepEqual(led.map((x) => ({ ...x })), [{ item_key: 'wheel:oak', delta: 1 }]);
    const h = await historyRow(pc, cid);
    assert.equal(h.rewarded, true);
    assert.equal(h.rewardedName, '普通转盘');
  });

  test('养成转盘：care_wheel_chances +1（source history, ref history-<id>），history 显示已奖励 养成转盘', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const r = await post(pc, cid, 'wheel:care');
    assert.equal(r.j.ok, true);
    assert.equal(r.j.grant.name, '养成转盘');
    const row = raw.prepare('SELECT child_id, source, ref_id, used_epoch FROM care_wheel_chances').all();
    assert.deepEqual(row.map((x) => ({ ...x })), [{ child_id: 1, source: 'history', ref_id: 'history-' + cid, used_epoch: null }]);
    assert.equal((await historyRow(pc, cid)).rewardedName, '养成转盘');
  });

  test('高级转盘：wheel_chances +1（school_test_id=-checkinId 哨兵），不占周上限，history 显示已奖励 高级转盘', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const r = await post(pc, cid, 'wheel:advanced');
    assert.equal(r.j.ok, true);
    assert.equal(r.j.grant.name, '高级转盘');
    const row = raw.prepare('SELECT child_id, school_test_id, used_epoch FROM wheel_chances').all();
    assert.deepEqual(row.map((x) => ({ ...x })), [{ child_id: 1, school_test_id: -cid, used_epoch: null }]);
    assert.equal(n('SELECT COUNT(*) n FROM wheel_week_quotas'), 0);
    assert.equal((await historyRow(pc, cid)).rewardedName, '高级转盘');
  });

  test('同一记录换奖品再奖 / 重复奖 → 409，机会数不变', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    assert.equal((await post(pc, cid, 'wheel:oak')).j.ok, true);
    for (const kind of ['wheel:oak', 'wheel:care', 'wheel:advanced']) {
      const r = await post(pc, cid, kind);
      assert.equal(r.status, 409, kind);
      assert.equal(r.j.error, 'ALREADY_REWARDED', kind);
    }
    assert.equal(n('SELECT COUNT(*) n FROM oak_wheel_chances'), 1);
    assert.equal(n('SELECT COUNT(*) n FROM care_wheel_chances'), 0);
    assert.equal(n('SELECT COUNT(*) n FROM wheel_chances'), 0);
  });

  test('不同记录各自可奖（高级哨兵互不冲突）', async () => {
    const pc = await parentCookie();
    const c1 = mkCheckin(1, 'approved');
    const c2 = mkCheckin(2, 'approved');
    assert.equal((await post(pc, c1, 'wheel:advanced')).j.ok, true);
    assert.equal((await post(pc, c2, 'wheel:advanced', 2)).j.ok, true);
    assert.equal(n('SELECT COUNT(*) n FROM wheel_chances'), 2);
  });

  test('旧发球记录仍算已奖励：新口 409，history rewarded=true', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    raw.prepare('INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai) VALUES(1, ?, 1, ?, 1, ?)')
      .run('normal', cid, '2026-11-03');
    const r = await post(pc, cid, 'wheel:oak');
    assert.equal(r.status, 409);
    assert.equal(r.j.error, 'ALREADY_REWARDED');
    assert.equal(n('SELECT COUNT(*) n FROM oak_wheel_chances'), 0);
    const row = await historyRow(pc, cid);
    assert.equal(row.rewarded, true);
    assert.equal(row.rewardedName, null);
  });

  test('迁移 0046：care_wheel_chances 接受 history 源，旧三源仍可写，未知源仍被 CHECK 拒绝', () => {
    const ins = (src) => raw.prepare("INSERT INTO care_wheel_chances(child_id, source, ref_id, created_epoch, date_shanghai) VALUES(1,?,?,1,'2026-11-21')").run(src, 'r-' + src);
    for (const src of ['daily-english', 'daily-chinese', 'daily-math', 'history']) ins(src);
    assert.equal(n('SELECT COUNT(*) n FROM care_wheel_chances'), 4);
    assert.throws(() => ins('bogus'));
  });

  test('旧发球口回归：未奖记录仍可发 1 颗普通球', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const before = raw.prepare('SELECT balls FROM children WHERE id=1').get().balls;
    const r = await call('/api/parent/balls/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid } });
    assert.equal(r.j.ok, true);
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, (before ?? 0) + 1);
  });
});
