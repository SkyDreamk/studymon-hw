/* 打卡历史奖励下拉菜单（2026-11-03）：node --test tests/history-reward.test.mjs
 * 覆盖：新口 /api/parent/history/grant 的家长 PIN 门；kind 白名单；未通过/不存在/孩子不匹配；
 * 经验＋20、道具、发球三路落账与统一标记；每条记录限奖 1 次（换奖品也 409）；
 * 旧发球记录仍算已奖励；history 接口 rewarded/rewardedName；旧发球口回归。
 * 脚手架与 balls.test.mjs 同一手法：node:sqlite 内存库＋真实 fetch 驱动。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql']) {
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

describe('打卡历史奖励下拉菜单', () => {
  test('未登录 → 401', async () => {
    const r = await call('/api/parent/history/grant', { method: 'POST', body: { childId: 1, checkinId: 1, kind: 'xp' } });
    assert.equal(r.status, 401);
  });

  test('非法 kind → 400，不落账', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const before = raw.prepare('SELECT balls, total_xp FROM children WHERE id=1').get();
    const r = await call('/api/parent/history/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid, kind: 'super' } });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'BAD_REWARD_KIND');
    const after = raw.prepare('SELECT balls, total_xp FROM children WHERE id=1').get();
    assert.deepEqual(after, before);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM item_ledger WHERE ref_type='history_reward'").get().n, 0);
  });

  test('待审核记录 → 400 CHECKIN_NOT_APPROVED，不落账', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'pending');
    const r = await call('/api/parent/history/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid, kind: 'xp' } });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'CHECKIN_NOT_APPROVED');
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM item_ledger WHERE ref_type='history_reward'").get().n, 0);
  });

  test('孩子不匹配 → 400', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const r = await call('/api/parent/history/grant', { method: 'POST', cookie: pc, body: { childId: 2, checkinId: cid, kind: 'xp' } });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'CHECKIN_CHILD_MISMATCH');
  });

  test('经验奖励：total_xp +20，标记行 1 行，history 显示已奖励 经验+20', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const before = raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp;
    const r = await call('/api/parent/history/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid, kind: 'xp' } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.grant.name, '经验+20');
    assert.equal(raw.prepare('SELECT total_xp FROM children WHERE id=1').get().total_xp - before, 20);
    const led = raw.prepare("SELECT item_key, delta FROM item_ledger WHERE ref_type='history_reward' AND ref_id=?").all(cid);
    assert.equal(led.length, 1);
    assert.equal(led[0].item_key, 'xp:20');
    assert.equal(led[0].delta, 20);
    const row = await historyRow(pc, cid);
    assert.equal(row.rewarded, true);
    assert.equal(row.rewardedName, '经验+20');
  });

  test('道具奖励：库存 +1，流水恰 1 行（占位即流水），history 显示已奖励 伤药', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const r = await call('/api/parent/history/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid, kind: 'medicine:potion' } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.grant.name, '伤药');
    assert.equal(raw.prepare("SELECT qty FROM item_inventory WHERE child_id=1 AND item_key='medicine:potion'").get().qty, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM item_ledger WHERE ref_type='history_reward' AND ref_id=?").get(cid).n, 1);
    const row = await historyRow(pc, cid);
    assert.equal(row.rewarded, true);
    assert.equal(row.rewardedName, '伤药');
  });

  test('发球奖励：balls +1，发球审计＋标记行，history 显示已奖励 普通球', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const before = raw.prepare('SELECT balls FROM children WHERE id=1').get().balls;
    const r = await call('/api/parent/history/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid, kind: 'ball' } });
    assert.equal(r.j.ok, true);
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, (before ?? 0) + 1);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM ball_grants WHERE checkin_id=?').all(cid).length, 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM item_ledger WHERE ref_type='history_reward' AND ref_id=?").get(cid).n, 1);
    const row = await historyRow(pc, cid);
    assert.equal(row.rewarded, true);
    assert.equal(row.rewardedName, '普通球');
  });

  test('同一记录换奖品再奖 → 409，数量不变', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    const b0 = raw.prepare('SELECT balls, total_xp FROM children WHERE id=1').get();
    const r1 = await call('/api/parent/history/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid, kind: 'xp' } });
    assert.equal(r1.j.ok, true);
    const r2 = await call('/api/parent/history/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid, kind: 'ball' } });
    assert.equal(r2.status, 409);
    assert.equal(r2.j.error, 'ALREADY_REWARDED');
    const b1 = raw.prepare('SELECT balls, total_xp FROM children WHERE id=1').get();
    assert.equal(b1.balls, b0.balls);
    assert.equal(b1.total_xp, (b0.total_xp ?? 0) + 20);
  });

  test('旧发球记录仍算已奖励：新口 409，history rewarded=true', async () => {
    const pc = await parentCookie();
    const cid = mkCheckin(1, 'approved');
    raw.prepare('INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai) VALUES(1, ?, 1, ?, 1, ?)')
      .run('normal', cid, '2026-11-03');
    const r = await call('/api/parent/history/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid, kind: 'xp' } });
    assert.equal(r.status, 409);
    assert.equal(r.j.error, 'ALREADY_REWARDED');
    const row = await historyRow(pc, cid);
    assert.equal(row.rewarded, true);
    assert.equal(row.rewardedName, null);
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
