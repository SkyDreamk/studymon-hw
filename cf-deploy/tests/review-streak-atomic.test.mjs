/* Fable 优化 #5：apiReview 连击原子性——条件 UPDATE 防里程碑双发。
 * 竞态：两个同日审批并发时，双方读到的 prior COUNT(*) 都是 0、都算出 streak+1 与
 * 里程碑；无条件 UPDATE 会让第二份里程碑经验（120/500 XP）与称号/贴纸也落库。
 * 修法：children 更新加 `AND last_checkin_date IS ?`（绑旧值；IS ? 而不用 = ?，
 * 因首日打卡时 last_checkin_date 为 NULL）；changes=0 时退回只补本科经验。
 * 覆盖：顺序双审（验收口径）、并发双审（Promise.all 交错，输家走 fallback）、
 * 首日打卡 NULL、补审旧日期。 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0007_coop_tables.sql', '0008_battles_coop_cols.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql']) {
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
afterEach(() => raw.close());

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
function seedChild({ xp = 0, streak = 6, last = '2026-11-16' } = {}) {
  raw.exec(`UPDATE children SET total_xp=${xp}, streak=${streak}, last_checkin_date=${last === null ? 'NULL' : `'${last}'`}, titles='[]', stickers='[]' WHERE id=1`);
}
function pendingCheckin(subject, date = '2026-11-17') {
  raw.prepare(
    `INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status)
     VALUES(1, ?, ?, ?, '10:00', 1, 0, 'pending')`,
  ).run(date, JSON.stringify([subject]), subject);
  return raw.prepare('SELECT id FROM checkins ORDER BY id DESC LIMIT 1').get().id;
}
async function approve(cookie, checkinId) {
  return call('/api/parent/review', { method: 'POST', body: { checkinId, decision: 'approve' }, cookie });
}
const childRow = () => raw.prepare('SELECT * FROM children WHERE id=1').get();
const streakBoxCount = () => raw.prepare("SELECT COUNT(*) n FROM child_notices WHERE child_id=1 AND kind='streak_box'").get().n;

describe('review streak atomicity (Fable #5)', () => {
  test('顺序双审同日两科：连击只 +1，7 天里程碑只发一次', async () => {
    const cookie = await parentCookie();
    seedChild({ xp: 0, streak: 6, last: '2026-11-16' });
    const a = pendingCheckin('语文');
    const b = pendingCheckin('数学');
    const r1 = await approve(cookie, a);
    assert.equal(r1.status, 200);
    assert.equal(r1.j.ok, true);
    assert.equal(r1.j.approved, true);
    assert.equal(r1.j.isFirstOfDay, true);
    assert.equal(r1.j.streak, 7);
    assert.equal(r1.j.bonusXp, 120);
    assert.equal(r1.j.streakBox?.type, 'weekly7');
    assert.equal(r1.j.streakBox?.xp, 120);
    const r2 = await approve(cookie, b);
    assert.equal(r2.status, 200);
    assert.equal(r2.j.ok, true);
    assert.equal(r2.j.approved, true);
    assert.equal(r2.j.isFirstOfDay, false);
    assert.equal(r2.j.streak, 7);
    assert.equal(r2.j.bonusXp, 0);
    assert.equal(r2.j.streakBox, null);
    const c = childRow();
    assert.equal(c.streak, 7);
    assert.equal(c.total_xp, 15 + 120 + 15);
    assert.equal(c.last_checkin_date, '2026-11-17');
    assert.equal(JSON.parse(c.titles).length, 1);
    assert.equal(JSON.parse(c.stickers).length, 1);
    assert.equal(streakBoxCount(), 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM checkins WHERE child_id=1 AND status='approved'").get().n, 2);
    assert.deepEqual(raw.prepare("SELECT xp_awarded FROM checkins WHERE child_id=1 ORDER BY id").all().map((r) => r.xp_awarded), [15, 15]);
  });

  test('并发双审同日两科：输家走 fallback——打卡照常通过，只补本科经验，无 streak_box', async () => {
    const cookie = await parentCookie();
    seedChild({ xp: 0, streak: 6, last: '2026-11-16' });
    const a = pendingCheckin('语文');
    const b = pendingCheckin('数学');
    const [r1, r2] = await Promise.all([approve(cookie, a), approve(cookie, b)]);
    for (const r of [r1, r2]) {
      assert.equal(r.status, 200);
      assert.equal(r.j.ok, true);
      assert.equal(r.j.approved, true);
    }
    // 恰一份里程碑；输家读到的是旧 prior（isFirstOfDay 仍 true）但 streakBox 为 null、bonus 为 0——这就是 fallback 的指纹
    const withBox = [r1, r2].filter((r) => r.j.streakBox);
    assert.equal(withBox.length, 1);
    assert.equal(withBox[0].j.streakBox.type, 'weekly7');
    assert.equal(withBox[0].j.bonusXp, 120);
    const loser = [r1, r2].find((r) => !r.j.streakBox);
    assert.equal(loser.j.isFirstOfDay, true, '输家在赢家落库前已读到 prior=0，靠条件更新才没双发');
    assert.equal(loser.j.bonusXp, 0);
    assert.equal(loser.j.streak, 7);
    const c = childRow();
    assert.equal(c.streak, 7);
    assert.equal(c.total_xp, 15 + 120 + 15, '里程碑经验只发一次');
    assert.equal(JSON.parse(c.titles).length, 1);
    assert.equal(JSON.parse(c.stickers).length, 1);
    assert.equal(streakBoxCount(), 1);
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM checkins WHERE child_id=1 AND status='approved'").get().n, 2);
  });

  test('首日打卡（last_checkin_date 为 NULL）：条件更新须命中，连击 0→1', async () => {
    const cookie = await parentCookie();
    seedChild({ xp: 0, streak: 0, last: null });
    const a = pendingCheckin('语文');
    const r = await approve(cookie, a);
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.streak, 1);
    assert.equal(r.j.bonusXp, 0);
    assert.equal(r.j.streakBox, null);
    const c = childRow();
    assert.equal(c.streak, 1, '= NULL 恒不成立会让条件更新落空、库里连击 stays 0');
    assert.equal(c.last_checkin_date, '2026-11-17');
    assert.equal(c.total_xp, 15);
  });

  test('补审旧日期：只补本科经验，不推进连击、不动 last_checkin_date', async () => {
    const cookie = await parentCookie();
    seedChild({ xp: 100, streak: 5, last: '2026-11-20' });
    const a = pendingCheckin('语文', '2026-11-18');
    const r = await approve(cookie, a);
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.bonusXp, 0);
    assert.equal(r.j.streakBox, null);
    const c = childRow();
    assert.equal(c.streak, 5);
    assert.equal(c.last_checkin_date, '2026-11-20');
    assert.equal(c.total_xp, 115);
    assert.equal(streakBoxCount(), 0);
  });
});
