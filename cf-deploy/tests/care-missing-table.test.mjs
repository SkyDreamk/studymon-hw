/* 缺表降级守卫（2026-11-07 正式站事故加固）：care_logs 表不存在时，
 * 孩子主页 /api/child 与照顾页 /api/care/status 仍须正常返回默认值，
 * 而不是抛 `no such table: care_logs` 炸掉页面。
 * 建库故意跳过 migrations/0015_care_logs.sql，模拟正式库漏建表的状态。
 * 跑法：node --test tests/care-missing-table.test.mjs */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const M = await import(new URL('../src/index.js', import.meta.url));

/* 与 tests/care-api.test.mjs 同一套迁移，唯独去掉 0015_care_logs.sql */
const MIGRATIONS = ['0001_init.sql', '0002_quiz.sql', '0003_entry_roles.sql', '0004_subjects_photos.sql', '0005_battle.sql', '0006_borrow_pack.sql', '0010_pvp_rematch.sql', '0011_parent_grants.sql', '0012_reward_checkin.sql', '0017_diagnosis.sql', '0018_oak_draw.sql', '0019_evo_items.sql', '0020_sync.sql', '0043_pet_instances_ability.sql'];

function makeEnv() {
  const raw = new DatabaseSync(':memory:');
  for (const f of MIGRATIONS) {
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
const enableCareDirect = () => raw.prepare("INSERT INTO settings(key,value) VALUES('care_enabled','1') ON CONFLICT(key) DO UPDATE SET value=excluded.value").run();

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

function realTodayStr() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}

describe('care_logs 缺表降级', { concurrency: false }, () => {
  test('建库确认：care_logs 表确实不存在（否则本文件测不到缺表）', () => {
    const row = raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='care_logs'").get();
    assert.equal(row, undefined);
  });

  test('care 开启但表缺失：/api/child 两孩均 ok:true，care 为默认值', async () => {
    const pc = await parentCookie();
    enableCareDirect(); // 全站开关需 settings.global 权限，旧版会话没有；这里测缺表降级，直接写库
    const today = realTodayStr();
    const expectedScene = M.careSceneForDate(today).key;
    for (const id of [1, 2]) {
      const r = await call(`/api/child?id=${id}`, { cookie: pc });
      assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200));
      assert.equal(r.j.ok, true, JSON.stringify(r.j).slice(0, 200));
      assert.deepEqual(r.j.child.care, { fedToday: false, bathedToday: false, sceneKey: expectedScene });
      assert.equal(typeof r.j.child.totalXp, 'number', '主页其余内容不受影响');
      assert.equal(typeof r.j.child.pokedexCount, 'number', '主页其余内容不受影响');
      assert.ok(Array.isArray(r.j.child.todaySubjects), '主页其余内容不受影响');
      assert.ok(Array.isArray(r.j.child.sealedEggs), '主页其余内容不受影响');
    }
  });

  test('care 开启但表缺失：/api/care/status 正常返回，今日未喂/未洗、无历史、最爱未知', async () => {
    const pc = await parentCookie();
    enableCareDirect();
    const r = await call('/api/care/status?childId=1', { cookie: pc });
    assert.equal(r.status, 200, JSON.stringify(r.j).slice(0, 200));
    assert.equal(r.j.ok, true);
    assert.equal(r.j.fedToday, false);
    assert.equal(r.j.bathedToday, false);
    assert.deepEqual(r.j.recent, []);
    // 每天随机最爱（2026-11-20）：表缺失也不影响最爱标记，当天最爱照常标出，恰好一个食物、一个洗澡方式。
    const favFoods = r.j.foods.filter((f) => f.isFavoriteKnown);
    assert.equal(favFoods.length, 1);
    assert.equal(favFoods[0].key, r.j.dailyFavorite.food);
    const favBaths = r.j.baths.filter((b) => b.isFavoriteKnown);
    assert.equal(favBaths.length, 1);
    assert.equal(favBaths[0].key, r.j.dailyFavorite.bath);
    assert.equal(r.j.scene.key, M.careSceneForDate(realTodayStr()).key);
  });

  test('care 关闭且表缺失：/api/child 的 care 仍为 null（关闭路径一字未动）', async () => {
    const pc = await parentCookie();
    const r = await call('/api/child?id=1', { cookie: pc });
    assert.equal(r.status, 200);
    assert.equal(r.j.ok, true);
    assert.equal(r.j.child.care, null);
  });
});
