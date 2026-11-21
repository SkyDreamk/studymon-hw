/* 热路径不再探 sqlite_master（Fable 优化 #4）：node --test tests/hot-path-no-master.test.mjs
 * 口径：总览 / 孩子详情的冷路径（resetEvoTableCache 后首请求）也不应再发任何
 * sqlite_master 查询——pet_instances / reward_eggs 由迁移 0019（v11 进化道具，
 * 2026-10-26，测试站与正式站早已应用）保证存在，守卫已移除。断言以 X-D1-Queries
 * 为准（TEST_MODE 才出）。另钉：守卫移除不是跳过查询——奖励蛋仍正常孵化、宠物实例仍正常建。
 * 保留的守卫不在此文件断言：gym_fail_streaks（道馆状态）、sync_versions（同步端）、
 * 删孩子 / 重置路径仍可探表。
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0009_quiz_topic.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0014_oak.sql', '0015_care_logs.sql', '0016_oak_audio_fix.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0021_skill_levels.sql', '0024_evo_reward.sql', '0032_oak_dialogue.sql', '0043_pet_instances_ability.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) raw.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  raw.exec("UPDATE children SET name='测试大宝' WHERE id=1; UPDATE children SET name='测试小宝' WHERE id=2;");
  raw.exec(`ALTER TABLE children ADD COLUMN family_id INTEGER;
    CREATE TABLE IF NOT EXISTS families(id INTEGER PRIMARY KEY, settings_json TEXT);
    INSERT OR REPLACE INTO families(id, settings_json) VALUES(1, '{}');
    UPDATE children SET family_id=1;`);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const yday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() - 86400000));
  for (const [k, v] of [
    ['english_mode', '1'], ['care_enabled', '1'], ['subject_xp', '15'], ['base_xp', '15'],
    ['cutoff_time', '21:30'], ['quiz_xp', '10'], ['quiz_repeat_days', '7'],
    ['grade_year_1', '2026'], ['grade_year_2', '2026'],
    ['math_progress_1', '{"chapter":2}'], ['chinese_progress_1', '{"unit":2}'], ['english_progress_1', '{"unit":2}'],
    ['math_progress_2', '{"chapter":2}'], ['chinese_progress_2', '{"unit":2}'], ['english_progress_2', '{"unit":2}'],
  ]) raw.prepare('INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)').run(k, v);
  for (const [cid, date, subject, status] of [[1, yday, '语文', 'approved'], [1, today, '语文', 'approved'], [1, today, '数学', 'pending'], [2, yday, '语文', 'approved'], [2, today, '语文', 'approved']]) {
    raw.prepare(`INSERT INTO checkins(child_id,date,subjects,subject,submitted_at,submitted_epoch,is_early,status,xp_awarded,reviewed_at)
      VALUES(?,?,?,?,'10:00',1,0,?,15,'10:05')`).run(cid, date, JSON.stringify([subject]), subject, status);
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
beforeEach(() => { M.resetEvoTableCache(); ({ env, raw } = makeEnv()); });

async function call(path, { method = 'GET', body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await M.default.fetch(new Request('https://test.local' + path, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined,
  }), env);
  const j = await res.json().catch(() => ({}));
  return { status: res.status, j, res, cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

function d1queries(res) {
  const h = res.headers.get('x-d1-queries') || '';
  if (!h) return [];
  return h.split(';').map((part) => {
    const mm = part.trim().match(/^(\d+):([\d.]+):(.*)$/);
    return mm ? { i: Number(mm[1]), wall: Number(mm[2]), sql: mm[3].trim() } : null;
  }).filter(Boolean);
}

function assertNoMaster(res, label) {
  const masters = d1queries(res).filter((q) => q.sql.includes('sqlite_master'));
  assert.equal(masters.length, 0, `${label} 不应再探 sqlite_master，实为 ${JSON.stringify(masters)}`);
}

async function parentCookie() {
  const r = await call('/api/parent/login', { method: 'POST', body: { pin: '0000' } });
  assert.equal(r.status, 200);
  return r.cookie;
}

describe('热路径不再探 sqlite_master（Fable #4）', () => {
  test('总览冷路径无 sqlite_master 查询', async () => {
    const pc = await parentCookie();
    M.resetEvoTableCache(); // 模拟新 isolate：表存在缓存为空
    const r = await call('/api/overview', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.children.length, 2);
    assertNoMaster(r.res, '总览冷路径');
  });

  test('孩子详情冷路径无 sqlite_master 查询', async () => {
    const pc = await parentCookie();
    for (const id of [1, 2]) {
      M.resetEvoTableCache();
      const r = await call(`/api/child?id=${id}`, { cookie: pc });
      assert.equal(r.status, 200);
      assert.equal(r.j.ok, true);
      assertNoMaster(r.res, `孩子 ${id} 详情冷路径`);
    }
  });

  test('暖路径同样无 sqlite_master 查询', async () => {
    const pc = await parentCookie();
    await call('/api/overview', { cookie: pc });
    const r = await call('/api/overview', { cookie: pc });
    assert.equal(r.status, 200);
    assertNoMaster(r.res, '总览暖路径');
  });

  test('守卫移除不是跳过查询：奖励蛋仍孵化、宠物实例仍建', async () => {
    const pc = await parentCookie();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    raw.prepare(`INSERT INTO reward_eggs(child_id, species_no, source, status, unlock_date, created_epoch, date_shanghai)
      VALUES(1, 143, 'wheel', 'pending', ?, ?, ?)`).run(today, Math.floor(Date.now() / 1000), today);
    M.resetEvoTableCache();
    const r = await call('/api/child?id=1', { cookie: pc });
    assert.equal(r.status, 200);
    assert.ok((r.j.child.hatchedEggs || []).some((h) => h.reward === true && h.pokemon.no === 143),
      `奖励蛋（#143 卡比兽）应孵化，实为 ${JSON.stringify(r.j.child.hatchedEggs)}`);
    const row = raw.prepare("SELECT status FROM reward_eggs WHERE child_id=1 AND species_no=143").get();
    assert.equal(row.status, 'hatched');
    // 宠物实例：总览触发 unlockForms 后两孩主线实例应已建
    await call('/api/overview', { cookie: pc });
    for (const id of [1, 2]) {
      const n = raw.prepare('SELECT COUNT(*) n FROM pet_instances WHERE child_id=?').get(id).n;
      assert.ok(n >= 1, `孩子 ${id} 应有宠物实例，实为 ${n}`);
    }
  });
});
