/* 发球入口收口（通用发球卡 2026-10-24 取消后）：node --test tests/balls.test.mjs
 * 覆盖：家长 PIN 门仍在；无 checkinId 的通用发放 → 400 CHECKIN_REQUIRED 且不落账；
 * GET /api/parent/balls 已随卡删除 → 404；不存在的孩子 → 404；
 * 带 checkinId 的历史奖励仍只发 1 颗普通球（客户端 qty/kind 忽略）。
 * 脚手架与 access.test.mjs 同一手法：node:sqlite 内存库＋真实 fetch 驱动。 */
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

async function childCookie(id, pw) {
  const r = await call('/api/child/login', { method: 'POST', body: { childId: id, password: pw } });
  assert.equal(r.status, 200);
  return r.cookie;
}

function approvedCheckin(childId) {
  raw.prepare(
    `INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
     VALUES(?, '2026-10-24', '["语文"]', '语文', '10:00', 1, 0, 'approved', 15, '10:05')`).run(childId);
  return raw.prepare('SELECT id FROM checkins ORDER BY id DESC LIMIT 1').get().id;
}

describe('发球入口收口（通用发球卡取消）', () => {
  test('未登录 → 401，孩子会话 → 403（家长 PIN 门仍在）', async () => {
    const r0 = await call('/api/parent/balls/grant', { method: 'POST', body: { childId: 1 } });
    assert.equal(r0.status, 401);
    const pc = await parentCookie();
    await call('/api/parent/settings/update', { method: 'POST', cookie: pc, body: { childPasswords: [{ id: 1, password: '0000' }] } });
    const cc = await childCookie(1, '0000');
    const r1 = await call('/api/parent/balls/grant', { method: 'POST', cookie: cc, body: { childId: 1 } });
    assert.equal(r1.status, 403);
  });

  test('无 checkinId 的通用发放 → 400 CHECKIN_REQUIRED，球数不动、不写审计行', async () => {
    const pc = await parentCookie();
    const before = raw.prepare('SELECT balls FROM children WHERE id=1').get().balls;
    const r = await call('/api/parent/balls/grant', { method: 'POST', cookie: pc, body: { childId: 1 } });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'CHECKIN_REQUIRED');
    assert.equal(raw.prepare('SELECT balls FROM children WHERE id=1').get().balls, before);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM ball_grants').get().n, 0);
  });

  test('不存在的孩子 → 404，不写审计行', async () => {
    const pc = await parentCookie();
    const r = await call('/api/parent/balls/grant', { method: 'POST', cookie: pc, body: { childId: 999, checkinId: 1 } });
    assert.equal(r.status, 404);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM ball_grants').get().n, 0);
  });

  test('列表接口已随卡删除 → 404', async () => {
    const pc = await parentCookie();
    const r = await call('/api/parent/balls', { cookie: pc });
    assert.equal(r.status, 404);
    assert.equal(r.j.error, 'NOT_FOUND');
  });

  test('带 checkinId 的历史奖励：客户端传 qty/超级球种也只发 1 颗普通球（服务端固定口径）', async () => {
    const pc = await parentCookie();
    const cid = approvedCheckin(1);
    const before = raw.prepare('SELECT balls, balls_super FROM children WHERE id=1').get();
    const r = await call('/api/parent/balls/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: cid, qty: 99, kind: 'super' } });
    assert.equal(r.j.ok, true);
    assert.equal(r.j.grant.qty, 1);
    assert.equal(r.j.grant.kind, 'normal');
    const after = raw.prepare('SELECT balls, balls_super FROM children WHERE id=1').get();
    assert.equal(after.balls, (before.balls ?? 0) + 1);
    assert.equal(after.balls_super, before.balls_super ?? 0);
  });
});
