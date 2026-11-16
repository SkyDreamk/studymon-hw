/* 打卡历史奖励（迁移 0012）：node --test tests/reward.test.mjs
 * 覆盖 /api/parent/balls/grant 的 checkinId 口径与 /api/parent/history 的 rewarded 标记：
 * 已通过记录可奖 1 次（球＋1、审计行含 checkin_id、kind='normal'）、重复奖 409、
 * 待审核/已驳回/孩子不匹配拒绝、无 checkinId 的通用发放已取消 → 400 CHECKIN_REQUIRED、
 * 0012 重建表保留已有审计行。脚手架与 balls.test.mjs 同一手法。 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));
const MIGS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql'];

function makeEnv(migs = MIGS) {
  const raw = new DatabaseSync(':memory:');
  for (const f of migs) raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
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
    async batch(stmts) { const out = []; for (const s of stmts) out.push(await s.run()); return out; },
  };
  return { env: { DB: db, TEST_MODE: '1', ASSETS: { fetch: async () => new Response('<html>app</html>', { headers: { 'Content-Type': 'text/html' } }) } }, raw };
}

let env, raw;
beforeEach(() => {
  ({ env, raw } = makeEnv());
  // 题组：1=大宝已通过（语文），2=大宝待审核（数学），3=大宝已驳回（英语），4=小宝已通过（语文）
  const ins = (child, subject, status) => raw.prepare(
    `INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
     VALUES(?, '2026-10-24', ?, ?, '10:00', 1, 0, ?, 15, '10:05')`).run(child, `["${subject}"]`, subject, status);
  ins(1, '语文', 'approved'); ins(1, '数学', 'pending'); ins(1, '英语', 'rejected'); ins(2, '语文', 'approved');
});

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
const ballsOf = (id) => raw.prepare('SELECT balls FROM children WHERE id=?').get(id).balls;

describe('打卡历史奖励（0012）', () => {
  test('已通过记录奖励：球＋1、审计行含 checkin_id、历史标已奖励', async () => {
    const pc = await parentCookie();
    const r = await call('/api/parent/balls/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: 1 } });
    assert.equal(r.status, 200, JSON.stringify(r.j));
    assert.equal(r.j.grant.checkinId, 1);
    assert.equal(r.j.grant.kind, 'normal');
    assert.equal(ballsOf(1), 4);
    const g = raw.prepare('SELECT * FROM ball_grants WHERE checkin_id=1').get();
    assert.ok(g, '审计行应写入');
    assert.equal(g.qty, 1);
    const h = await call('/api/parent/history', { cookie: pc });
    const row = h.j.history.find((x) => x.id === 1);
    assert.equal(row.rewarded, true);
  });

  test('同一记录重复奖励：409 且球数不动', async () => {
    const pc = await parentCookie();
    const r1 = await call('/api/parent/balls/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: 1 } });
    assert.equal(r1.status, 200);
    const r2 = await call('/api/parent/balls/grant', { method: 'POST', cookie: pc, body: { childId: 1, checkinId: 1 } });
    assert.equal(r2.status, 409);
    assert.equal(r2.j.error, 'ALREADY_REWARDED');
    assert.equal(ballsOf(1), 4);
  });

  test('待审核/已驳回/孩子不匹配/不存在的记录均拒绝且不发球', async () => {
    const pc = await parentCookie();
    const cases = [
      [{ childId: 1, checkinId: 2 }, 400, 'CHECKIN_NOT_APPROVED'],
      [{ childId: 1, checkinId: 3 }, 400, 'CHECKIN_NOT_APPROVED'],
      [{ childId: 2, checkinId: 1 }, 400, 'CHECKIN_CHILD_MISMATCH'],
      [{ childId: 1, checkinId: 999 }, 404, 'CHECKIN_NOT_FOUND'],
    ];
    for (const [body, status, err] of cases) {
      const r = await call('/api/parent/balls/grant', { method: 'POST', cookie: pc, body });
      assert.equal(r.status, status, JSON.stringify(r.j));
      assert.equal(r.j.error, err);
    }
    assert.equal(ballsOf(1), 3);
    assert.equal(ballsOf(2), 3);
  });

  test('无 checkinId 的通用发放已取消 → 400 CHECKIN_REQUIRED 且不发球', async () => {
    const pc = await parentCookie();
    const r = await call('/api/parent/balls/grant', { method: 'POST', cookie: pc, body: { childId: 2 } });
    assert.equal(r.status, 400);
    assert.equal(r.j.error, 'CHECKIN_REQUIRED');
    assert.equal(ballsOf(2), 3);
    assert.equal(raw.prepare('SELECT COUNT(*) n FROM ball_grants').get().n, 0);
  });

  test('0012 重建表：已有审计行保留、checkin_id 列与唯一索引就位', () => {
    const rawOld = new DatabaseSync(':memory:');
    for (const f of MIGS.slice(0, -1)) rawOld.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
    rawOld.exec("INSERT INTO ball_grants(child_id, kind, qty, created_epoch, date_shanghai) VALUES(1, 'normal', 1, 1760000000, '2026-10-24')");
    rawOld.exec(readFileSync(new URL('../migrations/0012_reward_checkin.sql', import.meta.url), 'utf8'));
    const row = rawOld.prepare('SELECT * FROM ball_grants WHERE child_id=1').get();
    assert.ok(row, '旧审计行应保留');
    assert.equal(row.qty, 1);
    const cols = rawOld.prepare("SELECT name FROM pragma_table_info('ball_grants')").all().map((c) => c.name);
    assert.ok(cols.includes('checkin_id'), '应有 checkin_id 列');
    const idx = rawOld.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='ball_grants' AND sql LIKE '%checkin_id%'").all();
    assert.ok(idx.length >= 1, '应有 checkin_id 唯一索引');
    // 唯一索引实效：同一 checkin_id 第二行插不进
    rawOld.exec("INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai) VALUES(1, 'normal', 1, 7, 1760000001, '2026-10-24')");
    assert.throws(() => rawOld.exec("INSERT INTO ball_grants(child_id, kind, qty, checkin_id, created_epoch, date_shanghai) VALUES(1, 'normal', 1, 7, 1760000002, '2026-10-24')"));
  });
});
